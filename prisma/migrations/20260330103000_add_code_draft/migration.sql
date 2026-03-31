CREATE TABLE IF NOT EXISTS "CodeDraft" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CodeDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CodeDraft_studentId_assignmentId_questionId_key"
ON "CodeDraft"("studentId", "assignmentId", "questionId");

CREATE INDEX IF NOT EXISTS "CodeDraft_studentId_assignmentId_idx"
ON "CodeDraft"("studentId", "assignmentId");

CREATE INDEX IF NOT EXISTS "CodeDraft_questionId_idx"
ON "CodeDraft"("questionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CodeDraft_studentId_fkey'
  ) THEN
    ALTER TABLE "CodeDraft"
      ADD CONSTRAINT "CodeDraft_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CodeDraft_assignmentId_fkey'
  ) THEN
    ALTER TABLE "CodeDraft"
      ADD CONSTRAINT "CodeDraft_assignmentId_fkey"
      FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CodeDraft_questionId_fkey'
  ) THEN
    ALTER TABLE "CodeDraft"
      ADD CONSTRAINT "CodeDraft_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
