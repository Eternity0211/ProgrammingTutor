-- Ensure Submission has JSON fields used by current Prisma schema and API responses
ALTER TABLE "Submission"
ADD COLUMN IF NOT EXISTS "symbolicOutput" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "aiFeedback" JSONB,
ADD COLUMN IF NOT EXISTS "emotion" JSONB,
ADD COLUMN IF NOT EXISTS "recommendedQuestions" JSONB;
