/*
  Warnings:

  - You are about to drop the column `code` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `plagiarismScore` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `Submission` table. All the data in the column will be lost.
  - The `status` column on the `Submission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `isBonus` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `submissionId` on the `TestCaseResult` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,assignmentId]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[codeSubmissionId,testCaseId]` on the table `TestCaseResult` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assignmentId` to the `Submission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Submission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeSubmissionId` to the `TestCaseResult` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'LATE_SUBMISSION', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "CodeEvaluationStatus" AS ENUM ('PENDING', 'TEST_CASES_EVALUATION_FAILED', 'TEST_CASES_EVALUATION_COMPLETE', 'LLM_EVALUATION_IN_PROGRESS', 'LLM_EVALUATION_FAILED', 'EVALUATION_COMPLETE');

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_questionId_fkey";

-- DropForeignKey
ALTER TABLE "TestCaseResult" DROP CONSTRAINT "TestCaseResult_submissionId_fkey";

-- DropIndex
DROP INDEX "TestCaseResult_submissionId_testCaseId_key";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "allowAutoEvaluation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowLateSubmission" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "code",
DROP COLUMN "feedback",
DROP COLUMN "language",
DROP COLUMN "plagiarismScore",
DROP COLUMN "questionId",
DROP COLUMN "score",
ADD COLUMN     "assignmentId" TEXT NOT NULL,
ADD COLUMN     "finalScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "TestCase" DROP COLUMN "isBonus",
DROP COLUMN "weight";

-- AlterTable
ALTER TABLE "TestCaseResult" DROP COLUMN "submissionId",
ADD COLUMN     "codeSubmissionId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Status";

-- CreateTable
CREATE TABLE "AssignmentMetric" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationMetric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSubmission" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "testCaseScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metricScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "codeEvaluationStatus" "CodeEvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionMetricResult" (
    "id" TEXT NOT NULL,
    "codeSubmissionId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionMetricResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionMetricResult_codeSubmissionId_metricId_key" ON "SubmissionMetricResult"("codeSubmissionId", "metricId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_studentId_assignmentId_key" ON "Submission"("studentId", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCaseResult_codeSubmissionId_testCaseId_key" ON "TestCaseResult"("codeSubmissionId", "testCaseId");

-- AddForeignKey
ALTER TABLE "AssignmentMetric" ADD CONSTRAINT "AssignmentMetric_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentMetric" ADD CONSTRAINT "AssignmentMetric_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "EvaluationMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationMetric" ADD CONSTRAINT "EvaluationMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionMetricResult" ADD CONSTRAINT "SubmissionMetricResult_codeSubmissionId_fkey" FOREIGN KEY ("codeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionMetricResult" ADD CONSTRAINT "SubmissionMetricResult_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "EvaluationMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseResult" ADD CONSTRAINT "TestCaseResult_codeSubmissionId_fkey" FOREIGN KEY ("codeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
