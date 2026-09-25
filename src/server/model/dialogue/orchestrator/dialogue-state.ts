import type { TraceLogger } from "../shared/trace-logger";
import type {
  ChatMessage,
  DialogueIntent,
  DialogueRequest,
  DialogueResponse,
  DialogueAgentResults,
  IntentRecognitionResult,
  SessionState,
  StudentProfile,
} from "../types";
import type { TrimmedContext } from "../memory/context-trimmer";

export interface DialogueNodeResult {
  reply: string;
  agentResults?: DialogueAgentResults;
  sessionStateUpdate?: Partial<SessionState>;
}

export type DialoguePhase = "session" | "context" | "intent" | "handler" | "persist" | "completed" | "failed";

export interface DialogueState {
  phase: DialoguePhase;
  request: DialogueRequest;
  traceLogger: TraceLogger;
  sessionId?: string;
  messages?: ChatMessage[];
  trimmed?: TrimmedContext;
  profile?: StudentProfile | null;
  profileSummary?: string;
  intent?: IntentRecognitionResult;
  result?: DialogueNodeResult;
  sessionState?: SessionState;
  response?: DialogueResponse;
  error?: string;
}

export type DialogueNode = (state: DialogueState) => Promise<DialogueState>;

export function transition(state: DialogueState, phase: DialoguePhase): DialogueState {
  return { ...state, phase };
}

export function intentOrFallback(intent?: IntentRecognitionResult): DialogueIntent {
  return intent?.intent ?? "THOUGHT_FOLLOWUP";
}
