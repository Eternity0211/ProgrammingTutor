import { prisma } from "@/lib/prisma";
import type { KnowledgeDocument, RetrievalResult } from "../types";

type PgVectorRow = KnowledgeDocument & { score: number };

/** Optional pgvector retrieval backend. It is only used when PGVECTOR_ENABLED=true. */
export class PgVectorStore {
  static isEnabled(): boolean {
    return process.env.PGVECTOR_ENABLED === "true";
  }

  async search(queryEmbedding: number[], topK = 3): Promise<RetrievalResult[]> {
    if (!PgVectorStore.isEnabled()) return [];
    if (queryEmbedding.length === 0) return [];
    const literal = `[${queryEmbedding.join(",")}]`;
    const rows = await prisma.$queryRawUnsafe<PgVectorRow[]>(
      `SELECT id, content, title, metadata, embedding, "createdAt", "updatedAt",
              1 - (embedding_vector <=> $1::vector) AS score
         FROM knowledge_documents
        WHERE embedding_vector IS NOT NULL
        ORDER BY embedding_vector <=> $1::vector
        LIMIT $2`,
      literal,
      topK,
    );
    return rows.map(({ score, ...document }) => ({ document, score }));
  }
}
