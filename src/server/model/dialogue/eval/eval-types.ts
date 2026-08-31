import type { DialogueIntent } from "../types";
import type { DialogueRequest } from "../types";

export interface EvalTestCase {
  id: string;
  name: string;
  input: DialogueRequest;
  expected: {
    intent?: DialogueIntent;
    replyContains?: string;
    degraded?: boolean;
    hasAgentResults?: boolean;
  };
}

export interface EvalActual {
  reply: string;
  intent: DialogueIntent;
  sessionId: string;
  traceId: string;
  hasAgentResults: boolean;
  degraded: boolean;
  error?: string;
}

export interface EvalResult {
  testCaseId: string;
  testCaseName: string;
  passed: boolean;
  actual: EvalActual;
  failures: string[];
  durationMs: number;
}

export interface EvalReport {
  totalCases: number;
  passed: number;
  failed: number;
  passRate: number;
  degradationRate: number;
  results: EvalResult[];
  totalDurationMs: number;
}
