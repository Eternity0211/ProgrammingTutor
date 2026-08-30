export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  metadata?: Record<string, unknown>;
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
