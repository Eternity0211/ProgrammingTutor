import {
  InMemoryTraceSink,
  JsonlTraceSink,
  TraceLogger,
} from "@/server/model/dialogue/shared/trace-logger";
import { mkdtemp, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

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

  it("creates a missing parent directory for JSONL traces", async () => {
    const root = await mkdtemp(join(tmpdir(), "programming-tutor-trace-"));
    const filePath = join(root, "nested", "traces.jsonl");
    try {
      const logger = new TraceLogger(
        "trace-jsonl",
        undefined,
        undefined,
        new JsonlTraceSink(filePath),
      );
      logger.endSpan(logger.startSpan("root"));
      await logger.persist();

      const persisted = JSON.parse((await readFile(filePath, "utf8")).trim());
      expect(persisted.traceId).toBe("trace-jsonl");
      expect(persisted.spans[0].status).toBe("ok");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
