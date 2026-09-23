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
