import { DialogueIntent } from "./intent";
import { AgentResultSnapshot } from "./session";

export interface DialogueRequestContext {
  questionId?: string;
  assignmentId?: string;
  language?: string;
}

export interface DialogueRequest {
  userId: string;
  message: string;
  sessionId?: string;
  context?: DialogueRequestContext;
}

export interface DialogueAgentResults {
  codeReview?: AgentResultSnapshot["codeReview"];
  emotion?: AgentResultSnapshot["emotion"];
  navigation?: AgentResultSnapshot["navigation"];
  rag?: {
    answer: string;
    sources: string[];
    degraded: boolean;
  };
}

export interface DialogueResponse {
  reply: string;
  intent: DialogueIntent;
  sessionId: string;
  traceId: string;
  agentResults?: DialogueAgentResults;
}
