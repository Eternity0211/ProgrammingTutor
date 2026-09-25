import { describe, expect, it, jest } from "@jest/globals";
import { OtlpTraceSink } from "@/server/model/dialogue/shared/trace-logger";

describe("OtlpTraceSink", () => {
  it("exports spans over OTLP HTTP", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const sink = new OtlpTraceSink("http://localhost:4318/v1/traces");
    await sink.write({ traceId: "trace-1", spans: [{ name: "test", spanId: "span-1", startTime: 1, endTime: 2, durationMs: 1 }], events: [] });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4318/v1/traces", expect.objectContaining({ method: "POST" }));
    fetchMock.mockRestore();
  });
});
