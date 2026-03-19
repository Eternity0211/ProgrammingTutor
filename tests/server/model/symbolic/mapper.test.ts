/**
 * @file mapper.test.ts
 * @description 符号分析转换层集成测试 (Symbolic Mapper Integration Tests).
 * 验证原始分析数据（RawIssue）是否能根据注册表中的真实定义正确转换为带有教学信息的富文本格式。
 */

import { mapIssues } from "../../../../src/server/model/symbolic/mapper";
import { RawIssue } from "../../../../src/lib/types/symbolic-types";

// =============================================================================
// Test Suite: Symbolic Mapper
// =============================================================================

describe("Symbolic Mapper (Transformation Layer)", () => {
  // ---------------------------------------------------------------------------
  /**
   * @test Case: Error Enrichment | 错误信息富化
   * @description Verifies that raw C++ error issues are correctly mapped to pedagogical definitions.
   * 验证原始 C++ 错误数据是否能正确映射到对应的教学定义（如显示名称、严重程度）。
   */
  it("should map a cpp error correctly", () => {
    const raw: RawIssue[] = [
      {
        ruleId: "CPP_ASSIGNMENT_IN_IF",
        location: { line: 2, column: 5 },
      },
    ];

    const result = mapIssues(raw, []);

    expect(result.errors.length).toBe(1);
    expect(result.errors[0].display_name).toBe("Assignment in If Condition");
    expect(result.errors[0].severity).toBe("High");
  });

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Template Interpolation | 模板变量插值
   * @description Verifies that dynamic arguments are correctly injected into message placeholders.
   * 验证 meta 字段中的动态参数是否正确注入到消息模板占位符中（例如 {index}, {name}）。
   */
  it("should interpolate template variables", () => {
    const raw: RawIssue[] = [
      {
        ruleId: "CPP_ARRAY_OOB_LITERAL",
        location: { line: 4, column: 3 },
        meta: {
          use_index: 10,
          def_name: "arr",
          def_size: 5,
        },
      },
    ];

    const result = mapIssues(raw, []);

    // Strategy: 确保最终生成的 message 包含了 meta 中提供的字面量值
    expect(result.errors[0].message).toContain("10");
    expect(result.errors[0].message).toContain("arr");
    expect(result.errors[0].message).toContain("5");
  });

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Warning Mapping | 警告信息映射
   * @description Verifies that raw warnings are enriched with correct pedagogical information.
   * 验证原始警告数据是否能正确富化，并保留其特定的教学标签。
   */
  it("should map warnings correctly", () => {
    const rawWarnings: RawIssue[] = [
      {
        ruleId: "CPP_VAR_NAMING",
        location: { line: 1, column: 1 },
      },
    ];

    const result = mapIssues([], rawWarnings);

    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].display_name).toBe(
      "Non-Standard Variable Naming",
    );
  });

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Minimal Definition Handling | 最小化定义处理
   * @description Verifies that rules with missing optional fields in JSON are handled gracefully.
   * 验证注册表中缺失可选字段（如 message）的规则是否能正常处理而不引发崩溃。
   */
  it("should handle minimal warning definition (CPP_NO_GOTO)", () => {
    const rawWarnings: RawIssue[] = [
      {
        ruleId: "CPP_NO_GOTO",
        location: { line: 5, column: 2 },
      },
    ];

    const result = mapIssues([], rawWarnings);

    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].display_name).toBe("Avoid Goto");
    expect(result.warnings[0].remediation_code).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Unknown Rule Filtering | 未知规则过滤
   * @description Verifies that issues with IDs not in the registry are ignored.
   * 验证当遇到注册表中未定义的 ruleId 时，Mapper 是否能自动过滤掉无效条目。
   */
  it("should ignore unknown ruleId", () => {
    const raw: RawIssue[] = [
      {
        ruleId: "UNKNOWN_RULE",
        location: { line: 1, column: 1 },
      },
    ];

    const result = mapIssues(raw, []);

    // Strategy: 为了保证数据一致性，未定义的规则不应出现在输出结果中
    expect(result.errors.length).toBe(0);
  });
});
