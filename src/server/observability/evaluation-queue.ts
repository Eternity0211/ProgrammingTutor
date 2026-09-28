import { prisma } from "@/lib/prisma";
import { setGauge } from "./metrics";

const JOB_STATUSES = ["QUEUED", "RUNNING", "COMPLETED", "FAILED"] as const;

export async function collectEvaluationQueueMetrics(
  now = new Date(),
): Promise<void> {
  try {
    const [groups, oldestQueued, staleRunning] = await Promise.all([
      prisma.evaluationJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.evaluationJob.findFirst({
        where: { status: "QUEUED" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.evaluationJob.count({
        where: { status: "RUNNING", leaseExpiresAt: { lt: now } },
      }),
    ]);
    const counts = new Map(
      groups.map((group) => [group.status, group._count._all]),
    );
    for (const status of JOB_STATUSES) {
      setGauge(
        "programming_tutor_evaluation_queue_jobs",
        "Current durable evaluation jobs by status.",
        { status },
        counts.get(status) ?? 0,
      );
    }
    setGauge(
      "programming_tutor_evaluation_queue_oldest_queued_age_seconds",
      "Age in seconds of the oldest queued evaluation job.",
      {},
      oldestQueued
        ? Math.max(
            0,
            (now.getTime() - oldestQueued.createdAt.getTime()) / 1_000,
          )
        : 0,
    );
    setGauge(
      "programming_tutor_evaluation_queue_stale_running_jobs",
      "Running evaluation jobs whose worker lease has expired.",
      {},
      staleRunning,
    );
    setGauge(
      "programming_tutor_evaluation_queue_collection_success",
      "Whether PostgreSQL evaluation queue metrics were collected successfully.",
      {},
      1,
    );
  } catch {
    setGauge(
      "programming_tutor_evaluation_queue_collection_success",
      "Whether PostgreSQL evaluation queue metrics were collected successfully.",
      {},
      0,
    );
  }
}
