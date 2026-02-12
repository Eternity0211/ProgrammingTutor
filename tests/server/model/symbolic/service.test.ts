/**
 * @file service.test.ts
 * @description 符号分析引擎集成测试 (End-to-End Integration Tests).
 * 验证从源码输入到 Issue 输出的完整流水线逻辑，确保各子模块协作正常。
 */

import { analyzeCode } from "../../../../src/server/model/symbolic/service";
import fs from "fs";
import path from "path";

// =============================================================================
// Test Setup
// =============================================================================

const ERRORS_DIR = path.resolve(process.cwd(), "data/symbolic/ast-patterns/cpp/errors");
const WARNINGS_DIR = path.resolve(process.cwd(), "data/symbolic/ast-patterns/cpp/warnings");

// 确保环境基本就绪（仅警告，不阻断，因为 Service 应具备容错性）
beforeAll(() => {
  if (!fs.existsSync(ERRORS_DIR) || !fs.existsSync(WARNINGS_DIR)) {
    console.warn("⚠️ [Service Test] Pattern directories missing. Integration tests might return empty results.");
  }
});

// =============================================================================
// Test Suite: Symbolic Service
// =============================================================================

describe("Symbolic Analysis Service (Orchestrator)", () => {

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Full Pipeline (Mixed Issues) | 混合问题流
   * @description Verifies that the service can detect both errors and warnings in a single pass.
   * 验证：输入包含语法错误（缺分号）和风格问题（Goto）的代码，应能同时返回 errors 和 warnings。
   */
  it("should aggregate both errors and warnings", async () => {
    // 构造一段"五毒俱全"的代码：
    // 1. Error: int a = 10 return 0 (缺分号 -> CPP_SYNTAX_ERROR)
    // 2. Warning: goto start (使用 goto -> CPP_NO_GOTO，需确保该规则已存在)
    const mixedCode = `
      void test() {
        start:
        int a = 10 return 0; 
        goto start;
      }
    `;

    const result = await analyzeCode(mixedCode);

    // 验证 Errors 模块工作正常
    // 注意：语法错误可能导致部分逻辑规则失效，但原生语法检测必须生效
    const hasSyntaxError = result.errors.some(e => e.ruleId === "CPP_SYNTAX_ERROR");
    expect(hasSyntaxError).toBe(true);

    // 验证 Warnings 模块工作正常 (如果环境中有 CPP_NO_GOTO 规则)
    const rulePath = path.join(WARNINGS_DIR, "CPP_NO_GOTO.scm");
    if (fs.existsSync(rulePath)) {
      const hasGotoWarning = result.warnings.some(e => e.ruleId === "CPP_NO_GOTO");
      expect(hasGotoWarning).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Mapper Integration | 映射层集成
   * @description Verifies that raw results are correctly transformed into enriched Issues.
   * 验证：输出的对象不应是 RawIssue，而应该是包含 display_name 等字段的完整 Issue。
   */
  it("should return enriched issue objects (not raw)", async () => {
    const code = "int main() { int a = ; }"; // Syntax Error
    const result = await analyzeCode(code);

    expect(result.errors.length).toBeGreaterThan(0);
    
    // 检查字段是否存在，证明 mapper.ts 被正确调用了
    const firstError = result.errors[0];
    expect(firstError.display_name).toBeDefined(); 
    expect(firstError.severity).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Metadata Generation | 元数据生成
   * @description Verifies that performance metrics are attached to the result.
   * 验证：返回结果中应包含解析耗时和节点数统计。
   */
  it("should provide analysis metadata", async () => {
    const code = "int main() {}";
    const result = await analyzeCode(code);

    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata?.parseTime).toBe("number");
    expect(typeof result.metadata?.nodeCount).toBe("number");
    expect(result.metadata?.nodeCount).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  /**
   * @test Case: Resilience / Error Handling | 容错性
   * @description Verifies that the service handles critical infrastructure failures gracefully.
   * 验证：模拟底层崩溃（例如传入极其巨大的字符串或特殊字符），服务不应抛出异常，而应返回错误对象。
   */
  it("should handle unexpected failures gracefully", async () => {
    // 既然我们不能轻易 Mock 内部模块导致崩溃，
    // 我们至少验证服务对于极端输入的响应是正常的（不 Throw）
    const emptyCode = ""; 
    
    // 该操作不应抛出异常
    const result = await analyzeCode(emptyCode);
    
    // 即使是空字符串，parser 也会生成一个空的 translation_unit，这是合法的
    expect(result.errors).toBeInstanceOf(Array);
    expect(result.warnings).toBeInstanceOf(Array);
  });

});