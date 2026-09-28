import { randomUUID } from "node:crypto";
import type { EvaluationJob } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EvaluationRunPlatformError,
  classifyEvaluationError,
} from "./evaluation-failure";
import { evaluateSubmissionInsidePlatform } from "./submission-evaluation-service";
import { recordEvaluationJobTransition } from "@/server/observability/metrics";

const DEFAULT_LEASE_MS = 120_000;
const DEFAULT_POLL_MS = 1_000;

export function evaluationQueueEnabled(): boolean {
  return process.env.EVALUATION_EXECUTION_MODE?.toLowerCase() === "queue";
}

export async function enqueueEvaluationJob(input: {
  codeSubmissionId: string;
  traceId?: string;
  retryOfRunId?: string;
  attempt?: number;
  priority?: number;
  maxAttempts?: number;
}): Promise<EvaluationJob> {
  const dedupeKey = input.retryOfRunId
    ? `retry:${input.retryOfRunId}`
    : `initial:${input.codeSubmissionId}`;
  const job = await prisma.evaluationJob.upsert({
    where: { dedupeKey },
    create: {
      codeSubmissionId: input.codeSubmissionId,
      dedupeKey,
      traceId: input.traceId,
      retryOfRunId: input.retryOfRunId,
      attempts: Math.max(0, (input.attempt ?? 1) - 1),
      priority: input.priority ?? 0,
      maxAttempts: input.maxAttempts ?? 3,
    },
    update: {},
  });
  recordEvaluationJobTransition("queued");
  return job;
}

export async function claimNextEvaluationJob(
  workerId: string,
  leaseMs = DEFAULT_LEASE_MS,
): Promise<EvaluationJob | null> {
  const jobs = await prisma.$queryRaw<EvaluationJob[]>(Prisma.sql`
    WITH candidate AS (
      SELECT "id"
      FROM "EvaluationJob"
      WHERE (
        ("status" = 'QUEUED' AND "availableAt" <= NOW())
        OR ("status" = 'RUNNING' AND "leaseExpiresAt" < NOW())
      )
      ORDER BY "priority" DESC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "EvaluationJob" AS job
    SET
      "status" = 'RUNNING',
      "lockedBy" = ${workerId},
      "lockedAt" = NOW(),
      "leaseExpiresAt" = NOW() + (${leaseMs} * INTERVAL '1 millisecond'),
      "attempts" = job."attempts" + 1,
      "updatedAt" = NOW()
    FROM candidate
    WHERE job."id" = candidate."id"
    RETURNING job.*
  `);
  const job = jobs[0] ?? null;
  if (job) recordEvaluationJobTransition("claimed");
  return job;
}

async function extendLease(jobId: string, workerId: string, leaseMs: number) {
  await prisma.evaluationJob.updateMany({
    where: { id: jobId, status: "RUNNING", lockedBy: workerId },
    data: { leaseExpiresAt: new Date(Date.now() + leaseMs) },
  });
}

async function reconcilePreviousAttempt(job: EvaluationJob) {
  if (!job.evaluationRunId)
    return { terminal: false, retryOfRunId: job.retryOfRunId };
  const run = await prisma.evaluationRun.findUnique({
    where: { id: job.evaluationRunId },
    select: { id: true, status: true, attempt: true },
  });
  if (!run) return { terminal: false, retryOfRunId: job.retryOfRunId };
  if (run.status === "COMPLETED" || run.status === "BLOCKED") {
    return { terminal: true, retryOfRunId: run.id };
  }
  if (run.status === "FAILED_TERMINAL") {
    throw new Error(`Evaluation run ${run.id} failed terminally`);
  }
  if (run.status === "RUNNING") {
    await prisma.evaluationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED_RETRYABLE",
        failureScope: "platform",
        failureKind: "worker_lease_expired",
        errorMessage: "Worker lease expired before the run was acknowledged",
        retryable: true,
        completedAt: new Date(),
      },
    });
  }
  return { terminal: false, retryOfRunId: run.id };
}

export async function processEvaluationJob(
  job: EvaluationJob,
  workerId: string,
  leaseMs = DEFAULT_LEASE_MS,
): Promise<void> {
  const heartbeat = setInterval(
    () => {
      void extendLease(job.id, workerId, leaseMs).catch((error) => {
        console.error("Failed to extend evaluation job lease", error);
      });
    },
    Math.max(5_000, Math.floor(leaseMs / 3)),
  );
  heartbeat.unref();

  try {
    const previous = await reconcilePreviousAttempt(job);
    if (previous.terminal) {
      await completeEvaluationJob(job.id, workerId, job.evaluationRunId);
      return;
    }
    const result = await evaluateSubmissionInsidePlatform(
      job.codeSubmissionId,
      {
        traceId: job.traceId ?? undefined,
        retryOfRunId: previous.retryOfRunId ?? undefined,
        attempt: job.attempts,
        evaluationJobId: job.id,
      },
    );
    await completeEvaluationJob(job.id, workerId, result.evaluationRunId);
  } catch (error) {
    const failure = classifyEvaluationError(error);
    const evaluationRunId =
      error instanceof EvaluationRunPlatformError
        ? error.evaluationRunId
        : job.evaluationRunId;
    await failEvaluationJob(job, workerId, {
      retryable: failure.retryable,
      message: failure.message,
      evaluationRunId,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

async function completeEvaluationJob(
  jobId: string,
  workerId: string,
  evaluationRunId?: string | null,
) {
  await prisma.evaluationJob.updateMany({
    where: { id: jobId, status: "RUNNING", lockedBy: workerId },
    data: {
      status: "COMPLETED",
      evaluationRunId: evaluationRunId ?? undefined,
      completedAt: new Date(),
      leaseExpiresAt: null,
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
  recordEvaluationJobTransition("completed");
}

function waitForPoll(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function failEvaluationJob(
  job: EvaluationJob,
  workerId: string,
  failure: {
    retryable: boolean;
    message: string;
    evaluationRunId?: string | null;
  },
) {
  const retryable = failure.retryable && job.attempts < job.maxAttempts;
  const delayMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attempts - 1));
  await prisma.evaluationJob.updateMany({
    where: { id: job.id, status: "RUNNING", lockedBy: workerId },
    data: {
      status: retryable ? "QUEUED" : "FAILED",
      evaluationRunId: failure.evaluationRunId ?? undefined,
      retryOfRunId: failure.evaluationRunId ?? job.retryOfRunId,
      availableAt: retryable ? new Date(Date.now() + delayMs) : job.availableAt,
      completedAt: retryable ? null : new Date(),
      leaseExpiresAt: null,
      lockedAt: null,
      lockedBy: null,
      lastError: failure.message.slice(0, 2_000),
    },
  });
  recordEvaluationJobTransition(retryable ? "requeued" : "failed");
}

export async function runEvaluationWorker(
  options: {
    workerId?: string;
    pollMs?: number;
    leaseMs?: number;
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  const workerId = options.workerId ?? `evaluation-worker:${randomUUID()}`;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
  console.log(`Evaluation worker started: ${workerId}`);

  while (!options.signal?.aborted) {
    try {
      const job = await claimNextEvaluationJob(workerId, leaseMs);
      if (job) {
        await processEvaluationJob(job, workerId, leaseMs);
        continue;
      }
    } catch (error) {
      console.error("Evaluation worker iteration failed", error);
    }
    await waitForPoll(pollMs, options.signal);
  }
}
