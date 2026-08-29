-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "feedback" TEXT,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isBonus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "TestCaseResult" ADD CONSTRAINT "TestCaseResult_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
