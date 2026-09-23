import {
  InMemoryTraceSink,
  TraceLogger,
} from "@/server/model/dialogue/shared/trace-logger";

describe("trace persistence", () => {
  it("writes an immutable structured context to the configured sink", async () => {
    const sink = new InMemoryTraceSink();
    const logger = new TraceLogger("trace-1", "session-1", "user-1", sink);
    logger.logEvent("info", "dialogue.completed", { degraded: false });
    await logger.persist();

    expect(sink.traces).toHaveLength(1);
    expect(sink.traces[0]).toMatchObject({
      traceId: "trace-1",
      sessionId: "session-1",
      userId: "user-1",
    });
    expect(sink.traces[0].events[0].attributes).toEqual({ degraded: false });
  });
});
