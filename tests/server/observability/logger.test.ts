import { log } from "@/server/observability/logger";

describe("structured logger", () => {
  it("emits JSON and redacts secrets without losing correlation fields", () => {
    const output = jest.spyOn(console, "log").mockImplementation(() => undefined);
    log("info", "evaluation.completed", {
      traceId: "trace-1",
      codeSubmissionId: "submission-1",
      apiKey: "secret-value",
      nested: { password: "hidden" },
    });

    const payload = JSON.parse(output.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: "info",
      message: "evaluation.completed",
      traceId: "trace-1",
      codeSubmissionId: "submission-1",
      apiKey: "[REDACTED]",
      nested: { password: "[REDACTED]" },
    });
    output.mockRestore();
  });

  it("serializes errors without exposing stack traces", () => {
    const output = jest.spyOn(console, "error").mockImplementation(() => undefined);
    log("error", "failed", { error: new Error("boom") });
    const payload = JSON.parse(output.mock.calls[0][0] as string);
    expect(payload.error).toEqual({ name: "Error", message: "boom" });
    output.mockRestore();
  });
});
