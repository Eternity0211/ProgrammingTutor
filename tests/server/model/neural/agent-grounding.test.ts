import {
  groundNavigationOutput,
  hasAllowedEvidenceTag,
  TRUSTED_LEARNING_RESOURCES,
  validateNavigationGrounding,
  validateGroundedStatements,
} from "@/server/model/neural/agent-grounding";

describe("agent grounding", () => {
  it("requires every statement to reference available evidence", () => {
    const allowed = new Set([
      "CODE:L1",
      "CODE:L2",
      "CODE:L3",
      "TEST",
      "SYM:CPP_BOUNDS@L3",
    ]);

    expect(
      validateGroundedStatements(
        ["[CODE:L3] 循环边界使用 <=", "[SYM:CPP_BOUNDS@L3] 已报告越界"],
        allowed,
      ),
    ).toEqual([]);
    expect(
      validateGroundedStatements(["[CODE:L99] 不存在的代码行"], allowed),
    ).toEqual(["statement 1 references unavailable evidence CODE:L99"]);
    expect(
      validateGroundedStatements(["隐藏测试一定包含空数组"], allowed),
    ).toEqual(["statement 1 has no evidence tag"]);
    expect(
      hasAllowedEvidenceTag("[PROFILE] 指针基础薄弱", allowed),
    ).toBe(false);
  });

  it("removes invented resources, exercises, and unsupported weaknesses", () => {
    const unsafeResult = {
      learning_navigation: {
        weaknesses: ["[CODE:L2] 循环边界", "想当然的隐藏弱点"],
        learning_path: [
          {
            step: 8,
            topic: "[CODE:L2] 半开区间",
            duration: "1 小时",
            resources: [
              TRUSTED_LEARNING_RESOURCES[0],
              "并不存在的教材章节",
            ],
          },
        ],
        recommended_exercises: [
          {
            id: "lc20",
            title: "被模型改写的标题",
            difficulty: "高级" as const,
            purpose: "[CODE:L2] 练习边界判断",
            url: "https://example.invalid",
          },
          {
            id: "invented",
            title: "编造题目",
            difficulty: "入门" as const,
            purpose: "[CODE:L2] 无依据推荐",
            url: "https://example.invalid",
          },
        ],
      },
    };
    const catalog = [
      {
        id: "lc20",
        title: "有效的括号",
        difficulty: "入门" as const,
        url: "https://leetcode.cn/problems/valid-parentheses",
      },
    ];
    expect(
      validateNavigationGrounding(
        unsafeResult,
        new Set(["CODE:L2"]),
        catalog,
      ),
    ).toEqual(
      expect.arrayContaining([
        "statement 2 has no evidence tag",
        "learning resource is not in the trusted catalog: 并不存在的教材章节",
        "exercise is not in the supplied catalog: invented",
      ]),
    );

    const result = groundNavigationOutput(
      unsafeResult,
      new Set(["CODE:L2"]),
      catalog,
    );

    expect(result.learning_navigation.weaknesses).toEqual([
      "[CODE:L2] 循环边界",
    ]);
    expect(result.learning_navigation.learning_path[0]).toMatchObject({
      step: 1,
      resources: [TRUSTED_LEARNING_RESOURCES[0]],
    });
    expect(result.learning_navigation.recommended_exercises).toEqual([
      {
        id: "lc20",
        title: "有效的括号",
        difficulty: "入门",
        purpose: "[CODE:L2] 练习边界判断",
        url: "https://leetcode.cn/problems/valid-parentheses",
      },
    ]);
  });

  it("does not turn optional improvements into weaknesses for correct code", () => {
    const allowed = new Set(["REVIEW", "REVIEW:NO_CONFIRMED_ISSUES"]);
    const result = {
      learning_navigation: {
        weaknesses: ["[REVIEW] 可以考虑进一步优化"],
        learning_path: [
          {
            step: 1,
            topic: "[REVIEW] 进阶学习（非缺陷修复）",
            duration: "30 分钟",
            resources: [TRUSTED_LEARNING_RESOURCES[0]],
          },
        ],
        recommended_exercises: [],
      },
    };

    expect(validateNavigationGrounding(result, allowed, [])).toContain(
      "weaknesses are not allowed when review confirms no defect",
    );
    expect(
      groundNavigationOutput(result, allowed, []).learning_navigation
        .weaknesses,
    ).toEqual([]);
  });
});
