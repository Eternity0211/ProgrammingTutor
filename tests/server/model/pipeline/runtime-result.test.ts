import {
  normalizeJudge0Result,
  normalizeJudge0Status,
} from "@/server/model/pipeline/runtime-result";

describe("runtime-result", () => {
  it("normalizes passed Judge0 output and metrics", () => {
    const result = normalizeJudge0Result({
      stdout: Buffer.from("ok").toString("base64"),
      status: { id: 3, description: "Accepted" },
      time: "0.125",
      memory: 512,
    });

    expect(result).toMatchObject({
      status: "passed",
      output: "ok",
      runtimeMs: 125,
      memoryKb: 512,
    });
    expect(normalizeJudge0Status({ status: { id: 3, description: "Accepted" } })).toBe(
      "PASSED",
    );
  });

  it("normalizes timeout and compile errors consistently", () => {
    expect(normalizeJudge0Status({ status: { id: 5, description: "Time Limit Exceeded" } })).toBe(
      "TIMEOUT",
    );
    const result = normalizeJudge0Result({
      compile_output: Buffer.from("compile failed").toString("base64"),
      status: { id: 6, description: "Compilation Error" },
    });
    expect(result.status).toBe("error");
    expect(result.error).toBe("compile failed");
  });
});
