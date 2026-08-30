import { TraceLogger } from "@/server/model/dialogue/shared/trace-logger";
import type { TraceLevel } from "@/server/model/dialogue/types";

describe("TraceLogger", () => {
  it("should generate a traceId if none provided", () => {
    const logger = new TraceLogger();
    expect(logger.traceId).toBeTruthy();
    expect(typeof logger.traceId).toBe("string");
  });

  it("should use provided traceId", () => {
    const logger = new TraceLogger("custom-trace-id", "session-1", "user-1");
    expect(logger.traceId).toBe("custom-trace-id");

    const ctx = logger.getContext();
    expect(ctx.sessionId).toBe("session-1");
    expect(ctx.userId).toBe("user-1");
  });

  it("should record spans with timing", () => {
    const logger = new TraceLogger();
    const spanId = logger.startSpan("test-span");
    expect(spanId).toBeTruthy();

    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy wait ~5ms
    }

    logger.endSpan(spanId, { result: "ok" });

    const ctx = logger.getContext();
    expect(ctx.spans).toHaveLength(1);
    expect(ctx.spans[0].name).toBe("test-span");
    expect(ctx.spans[0].spanId).toBe(spanId);
    expect(ctx.spans[0].endTime).toBeDefined();
    expect(ctx.spans[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(ctx.spans[0].attributes).toEqual({ result: "ok" });
  });

  it("should record events", () => {
    const logger = new TraceLogger();
    logger.logEvent("info" as TraceLevel, "test event", { key: "value" });

    const ctx = logger.getContext();
    expect(ctx.events).toHaveLength(1);
    expect(ctx.events[0].message).toBe("test event");
    expect(ctx.events[0].level).toBe("info");
    expect(ctx.events[0].timestamp).toBeGreaterThan(0);
    expect(ctx.events[0].attributes).toEqual({ key: "value" });
  });

  it("should isolate contexts between instances", () => {
    const logger1 = new TraceLogger("trace-1");
    const logger2 = new TraceLogger("trace-2");

    logger1.logEvent("info" as TraceLevel, "event from logger1");
    logger2.logEvent("warn" as TraceLevel, "event from logger2");

    const ctx1 = logger1.getContext();
    const ctx2 = logger2.getContext();

    expect(ctx1.traceId).toBe("trace-1");
    expect(ctx2.traceId).toBe("trace-2");
    expect(ctx1.events).toHaveLength(1);
    expect(ctx2.events).toHaveLength(1);
    expect(ctx1.events[0].message).toBe("event from logger1");
    expect(ctx2.events[0].message).toBe("event from logger2");
  });

  it("should not throw on flush", () => {
    const logger = new TraceLogger();
    logger.logEvent("info" as TraceLevel, "flush test");
    expect(() => logger.flush()).not.toThrow();
  });

  it("should support nested spans via parentSpanId", () => {
    const logger = new TraceLogger();
    const parentSpanId = logger.startSpan("parent");
    const childSpanId = logger.startSpan("child", parentSpanId);

    logger.endSpan(childSpanId);
    logger.endSpan(parentSpanId);

    const ctx = logger.getContext();
    expect(ctx.spans).toHaveLength(2);
    expect(ctx.spans[0].spanId).toBe(parentSpanId);
    expect(ctx.spans[0].parentSpanId).toBeUndefined();
    expect(ctx.spans[1].spanId).toBe(childSpanId);
    expect(ctx.spans[1].parentSpanId).toBe(parentSpanId);
  });

  it("should not crash when ending unknown span", () => {
    const logger = new TraceLogger();
    expect(() => logger.endSpan("nonexistent-id")).not.toThrow();
  });

  it("should return a copy of context (immutability)", () => {
    const logger = new TraceLogger();
    logger.logEvent("info" as TraceLevel, "original");

    const ctx1 = logger.getContext();
    logger.logEvent("info" as TraceLevel, "added after copy");

    const ctx2 = logger.getContext();
    expect(ctx1.events).toHaveLength(1);
    expect(ctx2.events).toHaveLength(2);
  });

  it("should merge attributes on endSpan without losing existing ones", () => {
    const logger = new TraceLogger();
    const spanId = logger.startSpan("attr-test");
    logger.endSpan(spanId, { first: 1 });
    logger.endSpan(spanId, { second: 2 });

    const ctx = logger.getContext();
    expect(ctx.spans[0].attributes).toEqual({ first: 1, second: 2 });
  });
});
