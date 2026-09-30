import {
  getTrustedExerciseDestination,
  isTrustedClassroomExerciseUrl,
} from "@/lib/exercise-url";

describe("exercise URL validation", () => {
  it("accepts scoped classroom exercise links", () => {
    const url = "/classes/DEMOCPP/assignment-1?question=question-1";

    expect(isTrustedClassroomExerciseUrl(url)).toBe(true);
    expect(getTrustedExerciseDestination(url)).toEqual({
      kind: "classroom",
      url,
    });
  });

  it.each([
    "//evil.example/classes/a/b",
    "https://evil.example/classes/a/b",
    "/classes/a",
    "/classes/a/b?redirect=https://evil.example",
    "/classes/a/b?question=q&redirect=evil",
  ])("rejects unsafe or malformed classroom links: %s", (url) => {
    expect(isTrustedClassroomExerciseUrl(url)).toBe(false);
    expect(getTrustedExerciseDestination(url)).toBeNull();
  });

  it("keeps trusted LeetCode links as external destinations", () => {
    const url = "https://leetcode.cn/problems/two-sum/";

    expect(getTrustedExerciseDestination(url)).toEqual({
      kind: "leetcode",
      url,
    });
  });

  it("rejects lookalike and unsupported LeetCode hosts", () => {
    expect(
      getTrustedExerciseDestination(
        "https://leetcode.cn.evil.example/problems/two-sum/",
      ),
    ).toBeNull();
    expect(
      getTrustedExerciseDestination("https://leetcode.com/problems/two-sum/"),
    ).toBeNull();
  });
});
