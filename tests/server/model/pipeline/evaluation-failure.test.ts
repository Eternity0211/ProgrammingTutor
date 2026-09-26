import {
  EvaluationPlatformError,
  classifyEvaluationError,
} from "@/server/model/pipeline/evaluation-failure";

describe("evaluation failure taxonomy", () => {
  it("preserves retryable external dependency failures", () => {
    const failure = classifyEvaluationError(
      new EvaluationPlatformError("Judge0 is unavailable", "judge0_unavailable"),
    );

    expect(failure).toEqual({
      scope: "platform",
      kind: "judge0_unavailable",
      retryable: true,
      message: "Judge0 is unavailable",
    });
  });

  it("marks unknown programming errors as non-retryable internal failures", () => {
    const failure = classifyEvaluationError(new Error("broken invariant"));

    expect(failure).toMatchObject({
      scope: "platform",
      kind: "internal",
      retryable: false,
    });
  });
});
