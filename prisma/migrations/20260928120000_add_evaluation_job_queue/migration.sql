-- CreateEnum
CREATE TYPE "EvaluationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "EvaluationJob" (
    "id" TEXT NOT NULL,
    "codeSubmissionId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "EvaluationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "traceId" TEXT,
    "retryOfRunId" TEXT,
    "evaluationRunId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationJob_dedupeKey_key" ON "EvaluationJob"("dedupeKey");
CREATE INDEX "EvaluationJob_status_availableAt_priority_idx" ON "EvaluationJob"("status", "availableAt", "priority");
CREATE INDEX "EvaluationJob_leaseExpiresAt_idx" ON "EvaluationJob"("leaseExpiresAt");
CREATE INDEX "EvaluationJob_codeSubmissionId_idx" ON "EvaluationJob"("codeSubmissionId");

-- AddForeignKey
ALTER TABLE "EvaluationJob" ADD CONSTRAINT "EvaluationJob_codeSubmissionId_fkey" FOREIGN KEY ("codeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
