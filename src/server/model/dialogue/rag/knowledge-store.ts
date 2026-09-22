import type { KnowledgeDocument } from "@prisma/client";
import type { RetrievalResult } from "../types";
import { DialogueLlmClient } from "../shared/llm-client";
import { prisma } from "@/lib/prisma";

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

  constructor(llm?: DialogueLlmClient) {
    this.llm = llm ?? DialogueLlmClient.getInstance();
  }

  async addDocument(document: KnowledgeDocument): Promise<void> {
    const embedding = await this.llm.createEmbedding(document.content);
    this.documents.push(document);
    this.embeddings.set(document.id, embedding);
  }

  async loadFromDatabase(): Promise<void> {
  const dbDocs = await prisma.knowledgeDocument.findMany();
  let loadedCount = 0;
  for (const doc of dbDocs) {
    if (this.embeddings.has(doc.id)) continue;
    try {
      this.documents.push({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
      const emb = (doc as any).embedding;
      this.embeddings.set(doc.id, emb);
      loadedCount += 1;
    } catch (err) {
      console.warn(`[KnowledgeStore] 加载文档失败 id=${doc.id}`, err);
    }
  }
  console.log(`[KnowledgeStore] 完成从数据库加载，本次载入 ${loadedCount}，内存总文档数 ${this.size()}`);
}


  async search(query: string, topK: number = 3): Promise<RetrievalResult[]> {
    if (this.documents.length === 0) return [];

    const queryEmbedding = await this.llm.createEmbedding(query);

    const scores = this.documents.map((doc) => {
      const docEmbedding = this.embeddings.get(doc.id)!;
      const score = cosineSimilarity(queryEmbedding, docEmbedding);
      return { document: doc, score };
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

  getDocuments(): KnowledgeDocument[] {
    return [...this.documents];
  }
}
