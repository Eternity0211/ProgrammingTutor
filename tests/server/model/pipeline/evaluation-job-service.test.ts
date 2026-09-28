jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    evaluationJob: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    evaluationRun: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/server/model/pipeline/submission-evaluation-service", () => ({
  evaluateSubmissionInsidePlatform: jest.fn(),
}));

import type { EvaluationJob } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EvaluationPlatformError } from "@/server/model/pipeline/evaluation-failure";
import { evaluateSubmissionInsidePlatform } from "@/server/model/pipeline/submission-evaluation-service";
import {
  claimNextEvaluationJob,
  enqueueEvaluationJob,
  processEvaluationJob,
} from "@/server/model/pipeline/evaluation-job-service";

function job(overrides: Partial<EvaluationJob> = {}): EvaluationJob {
  const now = new Date("2026-09-28T00:00:00.000Z");
  return {
    id: "job-1",
    codeSubmissionId: "code-1",
    dedupeKey: "initial:code-1",
    status: "RUNNING",
    traceId: "trace-1",
    retryOfRunId: null,
    evaluationRunId: null,
    priority: 0,
    attempts: 1,
    maxAttempts: 3,
    availableAt: now,
    lockedAt: now,
    leaseExpiresAt: new Date(now.getTime() + 120_000),
    lockedBy: "worker-1",
    lastError: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("evaluation job service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.evaluationJob.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (prisma.evaluationRun.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it("enqueues initial submissions idempotently", async () => {
    (prisma.evaluationJob.upsert as jest.Mock).mockResolvedValue(
      job({ status: "QUEUED" }),
    );

    await enqueueEvaluationJob({
      codeSubmissionId: "code-1",
      traceId: "trace-1",
    });

    expect(prisma.evaluationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: "initial:code-1" },
        create: expect.objectContaining({ codeSubmissionId: "code-1" }),
      }),
    );
  });

  it("claims the row returned by the PostgreSQL skip-locked query", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([job()]);
    await expect(claimNextEvaluationJob("worker-1")).resolves.toMatchObject({
      id: "job-1",
      lockedBy: "worker-1",
    });
  });

  it("completes a successfully evaluated job", async () => {
    (evaluateSubmissionInsidePlatform as jest.Mock).mockResolvedValue({
      evaluationRunId: "run-1",
      status: "COMPLETED",
      score: 90,
    });

    await processEvaluationJob(job(), "worker-1", 30_000);

    expect(evaluateSubmissionInsidePlatform).toHaveBeenCalledWith(
      "code-1",
      expect.objectContaining({ evaluationJobId: "job-1", attempt: 1 }),
    );
    expect(prisma.evaluationJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          evaluationRunId: "run-1",
        }),
      }),
    );
  });

  it("requeues retryable dependency failures with backoff", async () => {
    (evaluateSubmissionInsidePlatform as jest.Mock).mockRejectedValue(
      new EvaluationPlatformError("LLM down", "llm_unavailable", true),
    );

    await processEvaluationJob(job(), "worker-1", 30_000);

    expect(prisma.evaluationJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "QUEUED",
          lastError: "LLM down",
        }),
      }),
    );
  });

  it("acknowledges a terminal run left behind after a worker crash", async () => {
    (prisma.evaluationRun.findUnique as jest.Mock).mockResolvedValue({
      id: "run-1",
      status: "COMPLETED",
      attempt: 1,
    });

    await processEvaluationJob(
      job({ evaluationRunId: "run-1", attempts: 2 }),
      "worker-1",
      30_000,
    );

    expect(evaluateSubmissionInsidePlatform).not.toHaveBeenCalled();
    expect(prisma.evaluationJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });
});
