import type { KnowledgeDocument } from "@prisma/client";
import type { RetrievalResult } from "../types";
import { DialogueLlmClient } from "../shared/llm-client";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export type KnowledgeDocumentInput = Omit<KnowledgeDocument, "embedding"> & {
  embedding?: number[];
};
export type KnowledgeFilters = Partial<{
  language: string;
  course: string;
  classId: string;
  topic: string;
}>;

export type RagRetrievalMode = "keyword" | "vector" | "hybrid";

function tokenize(text: string): Set<string> {
  const normalized = text.toLocaleLowerCase();
  const terms = normalized.match(/[a-z0-9_]+|[\u3400-\u9fff]/gi) ?? [];
  return new Set(terms);
}

function keywordScore(query: string, document: KnowledgeDocument): number {
  const queryTerms = tokenize(query);
  if (queryTerms.size === 0) return 0;
  const contentTerms = tokenize(`${document.title ?? ""} ${document.content}`);
  let overlap = 0;
  for (const term of queryTerms) {
    if (contentTerms.has(term)) overlap += 1;
  }
  const titleTerms = tokenize(document.title ?? "");
  const titleBoost = [...queryTerms].some((term) => titleTerms.has(term)) ? 0.15 : 0;
  return Math.min(1, overlap / queryTerms.size + titleBoost);
}

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
  private retrievalMode: RagRetrievalMode;

  constructor(
    llm?: DialogueLlmClient,
    options?: { persistDocuments?: boolean; retrievalMode?: RagRetrievalMode },
  ) {
    this.llm = llm ?? DialogueLlmClient.getInstance();
    this.persistDocuments = options?.persistDocuments ?? false;
    this.retrievalMode =
      options?.retrievalMode ??
      (process.env.RAG_RETRIEVAL_MODE as RagRetrievalMode | undefined) ??
      "keyword";
  }

  async addDocument(document: KnowledgeDocumentInput): Promise<void> {
    let embedding: number[] = [];
    if (this.retrievalMode !== "keyword") {
      try {
        embedding = await this.llm.createEmbedding(document.content);
      } catch (error) {
        if (this.retrievalMode === "vector") throw error;
        console.warn("[KnowledgeStore] Embedding unavailable, using keyword retrieval:", error);
      }
    }
    const contentHash = createHash("sha256").update(document.content).digest("hex");
    const metadata = {
      ...(document.metadata && typeof document.metadata === "object" ? document.metadata : {}),
      contentHash,
      embeddingModel:
        embedding.length > 0
          ? process.env.EMBEDDING_MODEL ?? "default"
          : "keyword",
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
      if (embedding.length === 0 && this.retrievalMode === "vector") {
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


  async search(
    query: string,
    topK: number = 3,
    filters?: KnowledgeFilters,
  ): Promise<RetrievalResult[]> {
    if (this.documents.length === 0) return [];

    const filteredDocuments = this.documents.filter((doc) => {
      if (!filters || Object.keys(filters).length === 0) return true;
      const metadata = doc.metadata;
      if (!metadata || typeof metadata !== "object") return false;
      return Object.entries(filters).every(([key, value]) =>
        value === undefined || (metadata as Record<string, unknown>)[key] === value,
      );
    });
    if (filteredDocuments.length === 0) return [];

    let scores: Array<{ document: RetrievalResult["document"]; score: number }>;
    if (this.retrievalMode === "keyword") {
      scores = filteredDocuments.map((doc) => ({
        document: this.toPublicDocument(doc),
        score: keywordScore(query, doc),
      }));
    } else {
      try {
        const queryEmbedding = await this.llm.createEmbedding(query);
        scores = filteredDocuments.map((doc) => ({
          document: this.toPublicDocument(doc),
          score: cosineSimilarity(queryEmbedding, this.embeddings.get(doc.id) ?? []),
        }));
      } catch (error) {
        if (this.retrievalMode === "vector") throw error;
        console.warn("[KnowledgeStore] Vector retrieval unavailable, using keyword retrieval:", error);
        scores = filteredDocuments.map((doc) => ({
          document: this.toPublicDocument(doc),
          score: keywordScore(query, doc),
        }));
      }
    }

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
