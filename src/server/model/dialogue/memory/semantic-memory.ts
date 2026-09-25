import { cosineSimilarity } from "../rag/knowledge-store";

export interface SemanticMemory {
  id: string;
  userId: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SemanticMemoryStore {
  remember(memory: SemanticMemory): Promise<void>;
  recall(userId: string, embedding: number[], limit?: number): Promise<SemanticMemory[]>;
}

export class InMemorySemanticMemoryStore implements SemanticMemoryStore {
  private readonly memories: SemanticMemory[] = [];

  async remember(memory: SemanticMemory): Promise<void> {
    const index = this.memories.findIndex((item) => item.id === memory.id);
    if (index >= 0) this.memories[index] = memory;
    else this.memories.push(memory);
  }

  async recall(userId: string, embedding: number[], limit = 5): Promise<SemanticMemory[]> {
    return this.memories
      .filter((memory) => memory.userId === userId)
      .map((memory) => ({ memory, score: cosineSimilarity(embedding, memory.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ memory }) => memory);
  }
}
