-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "codeSubmissionId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "symbolicErrorCount" INTEGER NOT NULL DEFAULT 0,
    "symbolicWarningCount" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metricScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasNavigation" BOOLEAN NOT NULL DEFAULT false,
    "hasEmotion" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationRun_codeSubmissionId_idx" ON "EvaluationRun"("codeSubmissionId");

-- CreateIndex
CREATE INDEX "EvaluationRun_submissionId_idx" ON "EvaluationRun"("submissionId");

-- CreateIndex
CREATE INDEX "EvaluationRun_questionId_idx" ON "EvaluationRun"("questionId");

-- AddForeignKey
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_codeSubmissionId_fkey" FOREIGN KEY ("codeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
