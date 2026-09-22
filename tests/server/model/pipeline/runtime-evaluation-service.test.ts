import { evaluateRuntimeExecution } from "@/server/model/pipeline/runtime-evaluation-service";

describe("evaluateRuntimeExecution", () => {
  it("does not claim successful execution when no runtime executor is configured", async () => {
    const result = await evaluateRuntimeExecution("int main() { return 0; }");

    expect(result.executed).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.error).toContain("Runtime executor is not configured");
    expect(result.symbolic).toBeDefined();
  });
});
