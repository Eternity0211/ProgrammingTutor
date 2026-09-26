-- Preserve historical EvaluationRun rows while adding an explicit lifecycle.
CREATE TYPE "EvaluationRunStatus" AS ENUM (
  'RUNNING',
  'COMPLETED',
  'BLOCKED',
  'FAILED_RETRYABLE',
  'FAILED_TERMINAL'
);

ALTER TABLE "EvaluationRun"
ADD COLUMN "status" "EvaluationRunStatus" NOT NULL DEFAULT 'RUNNING',
ADD COLUMN "failureScope" TEXT,
ADD COLUMN "failureKind" TEXT,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "retryable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "traceId" TEXT,
ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE INDEX "EvaluationRun_status_retryable_idx"
ON "EvaluationRun"("status", "retryable");
