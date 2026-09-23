import type { DialogueIntent } from "../types";
import type { DialogueRequest } from "../types";

export interface EvalTestCase {
  id: string;
  name: string;
  input: DialogueRequest;
  expected: {
    intent?: DialogueIntent;
    replyContains?: string;
    replyNotContains?: string;
    replyKeywords?: string[];
    minQualityScore?: number;
    minSourceCount?: number;
    degraded?: boolean;
    hasAgentResults?: boolean;
    traceIdPresent?: boolean;
    sessionIdPresent?: boolean;
    maxDurationMs?: number;
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
  qualityScore: number;
  ragSourceCount: number;
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
  averageQualityScore: number;
  ragHitRate: number;
  citationCoverageRate: number;
  results: EvalResult[];
  totalDurationMs: number;
}
