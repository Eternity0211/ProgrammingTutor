import { randomUUID } from "crypto";
import type {
  TraceContext,
  TraceEvent,
  TraceLevel,
  TraceSpan,
} from "../types";

export class TraceLogger {
  private readonly context: TraceContext;

  constructor(traceId?: string, sessionId?: string, userId?: string) {
    this.context = {
      traceId: traceId ?? randomUUID(),
      sessionId,
      userId,
      spans: [],
      events: [],
    };
  }

  get traceId(): string {
    return this.context.traceId;
  }

  startSpan(name: string, parentSpanId?: string): string {
    const spanId = randomUUID();
    const span: TraceSpan = {
      name,
      spanId,
      parentSpanId,
      startTime: Date.now(),
    };
    this.context.spans.push(span);
    return spanId;
  }

  endSpan(spanId: string, attributes?: Record<string, unknown>): void {
    const span = this.context.spans.find((s) => s.spanId === spanId);
    if (!span) return;
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes };
    }
  }

  logEvent(
    level: TraceLevel,
    message: string,
    attributes?: Record<string, unknown>,
  ): void {
    const event: TraceEvent = {
      timestamp: Date.now(),
      level,
      message,
      attributes,
    };
    this.context.events.push(event);
  }

  getContext(): TraceContext {
    return {
      ...this.context,
      spans: this.context.spans.map((s) => ({ ...s })),
      events: this.context.events.map((e) => ({ ...e })),
    };
  }

  flush(): void {
    console.log(JSON.stringify(this.context, null, 2));
  }
}
