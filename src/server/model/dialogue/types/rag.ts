import type { JsonValue } from "@prisma/client/runtime/library";

export interface KnowledgeDocument {
  id: string;
  title: string | null;
  content: string;
  metadata: JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  /** Metadata may include contentHash, embeddingModel and version. */
}

export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;
}

export type RagGroundingReason =
  | "supported"
  | "insufficient_evidence"
  | "invalid_model_output"
  | "llm_unavailable"
  | "retrieval_unavailable";

export interface RagCitation {
  /** Stable identifier used in the generated answer, for example `S1`. */
  sourceId: string;
  documentId: string;
  title: string | null;
}

export interface RagResponse {
  answer: string;
  sources: KnowledgeDocument[];
  degraded: boolean;
  /** True only when every model citation points to retrieved evidence. */
  grounded: boolean;
  citations: RagCitation[];
  groundingReason: RagGroundingReason;
}
