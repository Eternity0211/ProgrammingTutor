-- Optional acceleration for KnowledgeStore. Apply only when the pgvector extension
-- is installed on the target PostgreSQL instance and PGVECTOR_ENABLED=true.
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "knowledge_documents"
  ADD COLUMN IF NOT EXISTS "embedding_vector" vector(1536);

-- Backfill is intentionally omitted because embedding dimensions vary by provider.
-- New ingestion code should populate embedding_vector with the same model dimensions.
