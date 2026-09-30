import {
  buildAssignmentQuestionUrl,
  resolveAssignmentQuestionIndex,
} from "@/lib/assignment-question";

describe("assignment question deep links", () => {
  it("selects the requested question when it belongs to the assignment", () => {
    expect(resolveAssignmentQuestionIndex(["q1", "q2", "q3"], "q2")).toBe(1);
  });

  it("falls back to the first question for missing or unknown ids", () => {
    expect(resolveAssignmentQuestionIndex(["q1", "q2"], undefined)).toBe(0);
    expect(resolveAssignmentQuestionIndex(["q1", "q2"], "other")).toBe(0);
  });

  it("updates the question while preserving unrelated query state", () => {
    expect(
      buildAssignmentQuestionUrl(
        "/classes/CPP101/a1",
        "?mode=review&question=old",
        "q2",
      ),
    ).toBe("/classes/CPP101/a1?mode=review&question=q2");
  });
});
