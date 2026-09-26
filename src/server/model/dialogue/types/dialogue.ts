import type { SymbolicResult } from "@/lib/types/symbolic-types";
import { DialogueIntent } from "./intent";
import { AgentResultSnapshot } from "./session";
import type { RagResponse } from "./rag";

export interface DialogueRequestContext {
  evaluationRunId?: string;
  codeSubmissionId?: string;
  knowledgeConcepts?: string[];
  questionId?: string;
  assignmentId?: string;
  language?: string;
  code?: string;
  symbolic?: SymbolicResult;
  testSummary?: { total: number; passed: number; failed: number };
  codeReviewResult?: string;
  ragFilters?: {
    language?: string;
    course?: string;
    classId?: string;
    topic?: string;
  };
}

export interface DialogueRequest {
  userId: string;
  message: string;
  sessionId?: string;
  traceId?: string;
  context?: DialogueRequestContext;
}

export interface DialogueAgentResults {
  codeReview?: AgentResultSnapshot["codeReview"];
  emotion?: AgentResultSnapshot["emotion"];
  navigation?: AgentResultSnapshot["navigation"];
  rag?: RagResponse;
}

export interface DialogueResponse {
  reply: string;
  intent: DialogueIntent;
  sessionId: string;
  traceId: string;
  agentResults?: DialogueAgentResults;
}
