import { randomUUID } from "crypto";
import { appendFile } from "fs/promises";
import type {
  TraceContext,
  TraceEvent,
  TraceLevel,
  TraceSpan,
} from "../types";

export interface TraceSink {
  write(context: TraceContext): Promise<void>;
}

export class InMemoryTraceSink implements TraceSink {
  readonly traces: TraceContext[] = [];

  async write(context: TraceContext): Promise<void> {
    this.traces.push(context);
  }
}

export class JsonlTraceSink implements TraceSink {
  constructor(private readonly filePath: string) {}

  async write(context: TraceContext): Promise<void> {
    await appendFile(this.filePath, `${JSON.stringify(context)}\n`, "utf8");
  }
}

/** Minimal OTLP/HTTP exporter without forcing an observability SDK dependency. */
export class OtlpTraceSink implements TraceSink {
  constructor(private readonly endpoint: string, private readonly headers: Record<string, string> = {}) {}

  async write(context: TraceContext): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.headers },
      body: JSON.stringify({ resourceSpans: [{ resource: { attributes: [{ key: "service.name", value: { stringValue: "programming-tutor" } }] }, scopeSpans: [{ spans: context.spans.map((span) => ({ traceId: context.traceId.replaceAll("-", ""), spanId: span.spanId.replaceAll("-", "").slice(0, 16), name: span.name, startTimeUnixNano: String(span.startTime * 1_000_000), endTimeUnixNano: String((span.endTime ?? span.startTime) * 1_000_000), attributes: Object.entries(span.attributes ?? {}).map(([key, value]) => ({ key, value: { stringValue: String(value) } })) })) }] }] }),
    });
    if (!response.ok) throw new Error(`OTLP exporter returned HTTP ${response.status}`);
  }
}

export class TraceLogger {
  private readonly context: TraceContext;

  constructor(
    traceId?: string,
    sessionId?: string,
    userId?: string,
    private readonly sink?: TraceSink,
  ) {
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

  async persist(): Promise<void> {
    if (this.sink) await this.sink.write(this.getContext());
  }
}
