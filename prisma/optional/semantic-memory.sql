-- Optional durable semantic memory table. Use with the SemanticMemoryStore adapter
-- when long-term memory is enabled for a deployment.
CREATE TABLE IF NOT EXISTS "semantic_memories" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "text" text NOT NULL,
  "embedding" double precision[] NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "semantic_memories_user_id_idx" ON "semantic_memories" ("user_id");
