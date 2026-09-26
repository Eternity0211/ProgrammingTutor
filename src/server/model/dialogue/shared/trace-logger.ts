import { randomUUID } from "crypto";
import { appendFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { observeTraceSpan } from "@/server/observability/metrics";
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
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(context)}\n`, "utf8");
  }
}

/** Minimal OTLP/HTTP exporter without forcing an observability SDK dependency. */
export class OtlpTraceSink implements TraceSink {
  constructor(
    private readonly endpoint: string,
    private readonly headers: Record<string, string> = {},
    private readonly timeoutMs = Number(process.env.OTEL_EXPORTER_TIMEOUT_MS ?? 5_000),
  ) {}

  async write(context: TraceContext): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.headers },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({ resourceSpans: [{ resource: { attributes: [
        { key: "service.name", value: { stringValue: process.env.OTEL_SERVICE_NAME ?? "programming-tutor" } },
        { key: "service.version", value: { stringValue: process.env.OTEL_SERVICE_VERSION ?? "unknown" } },
        { key: "deployment.environment", value: { stringValue: process.env.NODE_ENV ?? "development" } },
      ] }, scopeSpans: [{ spans: context.spans.map((span) => ({
        traceId: context.traceId.replaceAll("-", ""),
        spanId: span.spanId.replaceAll("-", "").slice(0, 16),
        ...(span.parentSpanId
          ? { parentSpanId: span.parentSpanId.replaceAll("-", "").slice(0, 16) }
          : {}),
        name: span.name,
        startTimeUnixNano: String(span.startTime * 1_000_000),
        endTimeUnixNano: String((span.endTime ?? span.startTime) * 1_000_000),
        status: { code: span.status === "error" ? 2 : 1 },
        attributes: Object.entries(span.attributes ?? {}).map(([key, value]) => ({ key, value: { stringValue: String(value) } })),
      })) }] }] }),
    });
    if (!response.ok) throw new Error(`OTLP exporter returned HTTP ${response.status}`);
  }
}

function parseOtlpHeaders(value: string | undefined): Record<string, string> {
  if (!value) return {};
  return Object.fromEntries(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf("=");
        return separator < 0
          ? [entry, ""]
          : [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
      }),
  );
}

export function createConfiguredTraceSink(): TraceSink | undefined {
  if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return new OtlpTraceSink(
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    );
  }
  return process.env.TRACE_LOG_PATH
    ? new JsonlTraceSink(process.env.TRACE_LOG_PATH)
    : undefined;
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
    span.status =
      span.status === "error" || (attributes && "error" in attributes)
        ? "error"
        : "ok";
  }

  recordException(spanId: string, error: unknown, attributes?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : String(error);
    this.endSpan(spanId, {
      ...attributes,
      error: message,
      ...(error instanceof Error && error.name ? { errorType: error.name } : {}),
    });
    this.logEvent("error", "exception", { spanId, error: message });
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
    const context = this.getContext();
    for (const span of context.spans) {
      if (span.endTime) observeTraceSpan(span.name, span.status, span.durationMs);
    }
    if (this.sink) await this.sink.write(context);
  }
}
