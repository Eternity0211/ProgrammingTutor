import type { KnowledgeDocument, RetrievalResult } from "../types";
import { DialogueLlmClient } from "../shared/llm-client";

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

  async search(query: string, topK: number = 3): Promise<RetrievalResult[]> {
    if (this.documents.length === 0) return [];

    const queryEmbedding = await this.llm.createEmbedding(query);

    const scores = this.documents.map((doc) => {
      const docEmbedding = this.embeddings.get(doc.id)!;
      const score = cosineSimilarity(queryEmbedding, docEmbedding);
      return { document: doc, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
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
