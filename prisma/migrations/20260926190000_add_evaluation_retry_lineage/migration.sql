ALTER TABLE "EvaluationRun"
ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "retryOfRunId" TEXT;

CREATE INDEX "EvaluationRun_retryOfRunId_idx"
ON "EvaluationRun"("retryOfRunId");
