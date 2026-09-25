import { describe, expect, it } from "@jest/globals";
import { PgVectorStore } from "@/server/model/dialogue/rag/pgvector-store";

describe("PgVectorStore", () => {
  it("is disabled by default", async () => {
    const previous = process.env.PGVECTOR_ENABLED;
    delete process.env.PGVECTOR_ENABLED;
    await expect(new PgVectorStore().search([0.1])).resolves.toEqual([]);
    if (previous === undefined) delete process.env.PGVECTOR_ENABLED;
    else process.env.PGVECTOR_ENABLED = previous;
  });
});
