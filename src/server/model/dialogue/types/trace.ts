export type TraceLevel = "debug" | "info" | "warn" | "error";

export interface TraceEvent {
  timestamp: number;
  level: TraceLevel;
  message: string;
  attributes?: Record<string, unknown>;
}

export interface TraceSpan {
  name: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes?: Record<string, unknown>;
}

export interface TraceContext {
  traceId: string;
  sessionId?: string;
  userId?: string;
  spans: TraceSpan[];
  events: TraceEvent[];
}
