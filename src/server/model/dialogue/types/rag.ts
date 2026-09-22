import type { JsonValue } from "@prisma/client/runtime/library";

export interface KnowledgeDocument {
  id: string;
  title: string | null;
  content: string;
  metadata: JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;
}

export interface RagResponse {
  answer: string;
  sources: KnowledgeDocument[];
  degraded: boolean;
}
