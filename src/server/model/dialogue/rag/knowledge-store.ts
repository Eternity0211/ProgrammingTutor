import type { KnowledgeDocument } from "@prisma/client";
import type { RetrievalResult } from "../types";
import { DialogueLlmClient } from "../shared/llm-client";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export type KnowledgeDocumentInput = Omit<KnowledgeDocument, "embedding"> & {
  embedding?: number[];
};

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export class KnowledgeStore {
  private documents: KnowledgeDocument[] = [];
  private embeddings: Map<string, number[]> = new Map();
  private llm: DialogueLlmClient;
  private persistDocuments: boolean;

  constructor(llm?: DialogueLlmClient, options?: { persistDocuments?: boolean }) {
    this.llm = llm ?? DialogueLlmClient.getInstance();
    this.persistDocuments = options?.persistDocuments ?? false;
  }

  async addDocument(document: KnowledgeDocumentInput): Promise<void> {
    const embedding = await this.llm.createEmbedding(document.content);
    const contentHash = createHash("sha256").update(document.content).digest("hex");
    const metadata = {
      ...(document.metadata && typeof document.metadata === "object" ? document.metadata : {}),
      contentHash,
      embeddingModel: process.env.EMBEDDING_MODEL ?? "default",
      version: 1,
    };
    const storedDocument = { ...document, metadata, embedding };
    if (this.persistDocuments) {
      await prisma.knowledgeDocument.upsert({
        where: { id: document.id },
        create: {
          id: document.id,
          title: document.title,
          content: document.content,
          metadata,
          embedding,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
        update: {
          title: document.title,
          content: document.content,
          metadata,
          embedding,
          updatedAt: document.updatedAt,
        },
      });
    }
    this.documents = this.documents.filter((doc) => {
      const existingMetadata = doc.metadata;
      return doc.id !== document.id &&
        !(existingMetadata && typeof existingMetadata === "object" &&
          "contentHash" in existingMetadata && existingMetadata.contentHash === contentHash);
    });
    this.documents.push(storedDocument);
    this.embeddings.set(document.id, embedding);
  }

  async loadFromDatabase(): Promise<void> {
    const dbDocs = await prisma.knowledgeDocument.findMany();
    let loadedCount = 0;
    for (const doc of dbDocs) {
      if (this.embeddings.has(doc.id)) continue;
      const embedding = Array.isArray(doc.embedding) ? doc.embedding : [];
      if (embedding.length === 0) {
        console.warn(`[KnowledgeStore] 跳过没有 embedding 的文档 id=${doc.id}`);
        continue;
      }
      this.documents.push({ ...doc, embedding });
      this.embeddings.set(doc.id, embedding);
      loadedCount += 1;
    }
    console.log(
      `[KnowledgeStore] 完成从数据库加载，本次载入 ${loadedCount}，内存总文档数 ${this.size()}`,
    );
  }


  async search(query: string, topK: number = 3): Promise<RetrievalResult[]> {
    if (this.documents.length === 0) return [];

    const queryEmbedding = await this.llm.createEmbedding(query);

    const scores = this.documents.map((doc) => {
      const docEmbedding = this.embeddings.get(doc.id)!;
      const score = cosineSimilarity(queryEmbedding, docEmbedding);
      return { document: this.toPublicDocument(doc), score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK) as RetrievalResult[];
  }

  size(): number {
    return this.documents.length;
  }

  clear(): void {
    this.documents = [];
    this.embeddings.clear();
  }

  getDocuments(): KnowledgeDocumentInput[] {
    return this.documents.map((document) => this.toPublicDocument(document));
  }

  private toPublicDocument(document: KnowledgeDocument): KnowledgeDocumentInput {
    const { embedding: _embedding, ...publicDocument } = document;
    return publicDocument;
  }
}
