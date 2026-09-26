import {
  LATEST_EVALUATION_REFERENCE_KEY,
  readEvaluationReference,
  saveEvaluationReference,
} from "@/lib/evaluation-reference";

describe("evaluation reference browser handoff", () => {
  it("stores and restores the latest persisted evaluation", () => {
    const values = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
    };

    saveEvaluationReference(storage, {
      evaluationRunId: "run-1",
      codeSubmissionId: "code-1",
    });

    expect(values.has(LATEST_EVALUATION_REFERENCE_KEY)).toBe(true);
    expect(readEvaluationReference(storage)).toEqual({
      evaluationRunId: "run-1",
      codeSubmissionId: "code-1",
    });
  });

  it("ignores malformed or stale browser data", () => {
    expect(
      readEvaluationReference({ getItem: () => "not-json" }),
    ).toBeNull();
    expect(
      readEvaluationReference({ getItem: () => '{"evaluationRunId":1}' }),
    ).toBeNull();
  });
});
