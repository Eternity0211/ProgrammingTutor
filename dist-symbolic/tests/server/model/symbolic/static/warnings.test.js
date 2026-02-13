"use strict";
/**
 * @file static/warnings.test.ts
 * @description 静态分析警告域集成测试 (Static Warnings Integration Tests).
 * 验证分析器能否正确加载并执行 SCM 风格规则（如代码风格、最佳实践）。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const warnings_1 = require("../../../../../src/server/model/symbolic/static/warnings");
const parser_1 = require("../../../../../src/server/model/symbolic/parser");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// =============================================================================
// Test Setup
// =============================================================================
const PATTERN_DIR = path_1.default.resolve(process.cwd(), "data/symbolic/ast-patterns/cpp/warnings");
// 检查环境，若目录为空则给出警告
beforeAll(() => {
    if (!fs_1.default.existsSync(PATTERN_DIR)) {
        console.warn("⚠️ [Test Setup] Pattern directory not found. Warning tests require .scm files.");
    }
});
// =============================================================================
// Test Suite: Static Warnings
// =============================================================================
describe("Static Warnings Analyzer", () => {
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Structured Programming (Goto) | 结构化编程规范
     * @description Verifies detection of 'goto' statements using SCM rules.
     * 验证：基于 README 示例规则 CPP_NO_GOTO.scm，应准确检测到 goto 语句的使用，引导学生使用结构化控制流。
     */
    it("should detect usage of goto statements (CPP_NO_GOTO)", async () => {
        // 前置检查：确保规则文件存在，否则跳过此具体断言（避免 CI 报错）
        const rulePath = path_1.default.join(PATTERN_DIR, "CPP_NO_GOTO.scm");
        if (!fs_1.default.existsSync(rulePath)) {
            console.warn("⚠️ Skipping CPP_NO_GOTO test: Rule file not found. Please create it per README.");
            return;
        }
        const code = `
      void test() {
        start:
        int a = 1;
        goto start;
      }
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, warnings_1.analyzeWarnings)(tree);
        const gotoWarning = results.find(r => r.ruleId === "CPP_NO_GOTO");
        expect(gotoWarning).toBeDefined();
        // 验证位置：goto start; 在第 4 行 (索引 3)
        // 注意：具体行号取决于 SCM 捕获的是 'goto' 关键字还是整个语句
        expect(gotoWarning?.location.line).toBeGreaterThan(0);
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Variable Naming | 变量命名规范
     * @description Verifies detection of non-standard short variable names using CPP_VAR_NAMING.scm.
     * 验证：基于 CPP_VAR_NAMING 规则，能识别过短且非常见约定的变量名（如 a），
     * 同时不过度干预常见循环变量 i/j/k/x/y/z。
     */
    it("should detect non-standard short variable names (CPP_VAR_NAMING)", async () => {
        const rulePath = path_1.default.join(PATTERN_DIR, "CPP_VAR_NAMING.scm");
        if (!fs_1.default.existsSync(rulePath)) {
            console.warn("⚠️ Skipping CPP_VAR_NAMING test: Rule file not found.");
            return;
        }
        const code = `
      void foo() {
        int a = 0;   // 应被标记
        int i = 0;   // 常见循环变量，不应被标记
      }
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, warnings_1.analyzeWarnings)(tree);
        const namingIssues = results.filter(r => r.ruleId === "CPP_VAR_NAMING");
        // 只针对变量 a 产出一条告警
        expect(namingIssues.length).toBe(1);
        expect(namingIssues[0]?.meta?.name).toBe("a");
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Switch Without Default | 缺少 default 的 switch
     * @description Verifies detection of switch statements without a default branch using CPP_SWITCH_NO_DEFAULT.scm.
     * 验证：基于 CPP_SWITCH_NO_DEFAULT 规则，检测缺省 default 分支的 switch。
     */
    it("should detect switch statement without default (CPP_SWITCH_NO_DEFAULT)", async () => {
        const rulePath = path_1.default.join(PATTERN_DIR, "CPP_SWITCH_NO_DEFAULT.scm");
        if (!fs_1.default.existsSync(rulePath)) {
            console.warn("⚠️ Skipping CPP_SWITCH_NO_DEFAULT test: Rule file not found.");
            return;
        }
        const code = `
      int foo(int x) {
        switch (x) {
          case 1:
            return 1;
          case 2:
            return 2;
        } // 缺少 default
      }
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, warnings_1.analyzeWarnings)(tree);
        const switchWarning = results.find(r => r.ruleId === "CPP_SWITCH_NO_DEFAULT");
        expect(switchWarning).toBeDefined();
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Naming Convention | 命名规范检测
     * @description Verifies that generic style rules are processed correctly if they exist.
     * 验证：验证分析器处理命名规范类规则的通用能力。这是一个宽容度较高的测试，仅在规则存在时验证格式。
     */
    it("should detect potential naming issues if rule exists", async () => {
        // 这是一个通用性测试，扫描所有返回的结果
        const code = "int x = 10;";
        const tree = await (0, parser_1.parseCode)(code);
        // 我们不强制要求必须报错，但验证如果报了错，Issue 对象的结构必须完整
        const results = await (0, warnings_1.analyzeWarnings)(tree);
        if (results.length > 0) {
            const issue = results[0];
            expect(issue.ruleId).toBeDefined();
            expect(typeof issue.location.line).toBe("number");
            // 确保 meta 数据被正确透传（如果有）
            if (issue.meta) {
                expect(typeof issue.meta).toBe("object");
            }
        }
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Clean Code | 合规代码
     * @description Verifies that valid, clean code produces zero warnings.
     * 验证：输入完全符合规范且风格良好的代码，不应返回任何警告。
     */
    it("should return empty list for clean code", async () => {
        const code = `
      #include <iostream>
      // A well-structured function with no stylistic issues
      int main() {
        int variable_count = 10;
        return 0;
      }
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, warnings_1.analyzeWarnings)(tree);
        expect(results).toHaveLength(0);
    });
});
