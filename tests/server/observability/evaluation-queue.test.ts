jest.mock("@/lib/prisma", () => ({
  prisma: {
    evaluationJob: {
      groupBy: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { collectEvaluationQueueMetrics } from "@/server/observability/evaluation-queue";
import {
  renderPrometheusMetrics,
  resetMetricsForTests,
} from "@/server/observability/metrics";

describe("evaluation queue metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMetricsForTests();
  });

  it("publishes queue depth, age, stale leases and collection health", async () => {
    (prisma.evaluationJob.groupBy as jest.Mock).mockResolvedValue([
      { status: "QUEUED", _count: { _all: 3 } },
      { status: "RUNNING", _count: { _all: 2 } },
    ]);
    (prisma.evaluationJob.findFirst as jest.Mock).mockResolvedValue({
      createdAt: new Date("2026-09-28T11:59:00.000Z"),
    });
    (prisma.evaluationJob.count as jest.Mock).mockResolvedValue(1);

    await collectEvaluationQueueMetrics(new Date("2026-09-28T12:00:00.000Z"));

    const output = renderPrometheusMetrics();
    expect(output).toContain(
      'programming_tutor_evaluation_queue_jobs{status="QUEUED"} 3',
    );
    expect(output).toContain(
      'programming_tutor_evaluation_queue_jobs{status="FAILED"} 0',
    );
    expect(output).toContain(
      "programming_tutor_evaluation_queue_oldest_queued_age_seconds 60",
    );
    expect(output).toContain(
      "programming_tutor_evaluation_queue_stale_running_jobs 1",
    );
    expect(output).toContain(
      "programming_tutor_evaluation_queue_collection_success 1",
    );
  });

  it("keeps the metrics endpoint available when PostgreSQL is down", async () => {
    (prisma.evaluationJob.groupBy as jest.Mock).mockRejectedValue(
      new Error("database unavailable"),
    );
    (prisma.evaluationJob.findFirst as jest.Mock).mockRejectedValue(
      new Error("database unavailable"),
    );
    (prisma.evaluationJob.count as jest.Mock).mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(collectEvaluationQueueMetrics()).resolves.toBeUndefined();
    expect(renderPrometheusMetrics()).toContain(
      "programming_tutor_evaluation_queue_collection_success 0",
    );
  });
});
