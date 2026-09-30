import { isTrustedLeetCodeExerciseUrl } from "@/lib/leetcode";

describe("trusted LeetCode exercise URLs", () => {
  it.each([
    "https://leetcode.cn/problems/two-sum",
    "https://www.leetcode.cn/problems/reverse-linked-list/",
    "https://leetcode.cn/problems/valid-parentheses?envType=study-plan",
  ])("accepts a trusted problem URL: %s", (url) => {
    expect(isTrustedLeetCodeExerciseUrl(url)).toBe(true);
  });

  it.each([
    undefined,
    "",
    "/exercise/lc1",
    "http://leetcode.cn/problems/two-sum",
    "https://leetcode.cn/explore/learn/",
    "https://example.com/problems/two-sum",
    "https://leetcode.cn.example.com/problems/two-sum",
  ])("rejects an untrusted exercise URL: %s", (url) => {
    expect(isTrustedLeetCodeExerciseUrl(url)).toBe(false);
  });
});
