"use strict";
/**
 * @file static/errors.test.ts
 * @description 静态分析错误域集成测试 (Static Errors Integration Tests).
 * 验证分析器能否正确利用 Parser 识别语法错误，并正确加载/执行现有的 SCM 逻辑规则。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../../../../../src/server/model/symbolic/static/errors");
const parser_1 = require("../../../../../src/server/model/symbolic/parser");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// =============================================================================
// Test Setup
// =============================================================================
const PATTERN_DIR = path_1.default.resolve(process.cwd(), "data/symbolic/ast-patterns/cpp/errors");
// 仅做检查，不再写入文件，保护开发环境
beforeAll(() => {
    if (!fs_1.default.existsSync(PATTERN_DIR)) {
        console.warn("⚠️ [Test Setup] Pattern directory not found. Tests relying on SCM files may fail.");
    }
});
// =============================================================================
// Test Suite: Static Errors
// =============================================================================
describe("Static Errors Analyzer", () => {
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Native Syntax Error | 原生语法错误
     * @description Verifies that the analyzer detects syntax errors using Tree-sitter's built-in heuristics.
     * 验证：输入一段语法错误的代码（如缺少分号），应返回 CPP_SYNTAX_ERROR。
     */
    it("should detect native syntax errors (missing semicolon)", async () => {
        const code = "int main() { int a = 10 return 0; }";
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        const syntaxError = results.find(r => r.ruleId === "CPP_SYNTAX_ERROR");
        expect(syntaxError).toBeDefined();
        expect(syntaxError?.location.line).toBe(0);
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Severe Syntax Error | 严重语法错误处理
     * @description Verifies detection of severe syntax errors (e.g., unexpected tokens) without crashing.
     * 验证：输入完全非法的代码，分析器不应崩溃，且应报出错误。
     */
    it("should handle severe syntax errors gracefully", async () => {
        const code = "int main() { <<< invalid code >>> }";
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].ruleId).toBe("CPP_SYNTAX_ERROR");
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Logic Error - Invalid Array Size | 逻辑规则：非法数组大小
     * @description Verifies detection of negative array sizes using the existing SCM rule.
     * 验证：基于现有的 CPP_INVALID_ARRAY_SIZE.scm 规则，检测数组大小为负的情况。
     */
    it("should detect invalid array size (CPP_INVALID_ARRAY_SIZE)", async () => {
        const code = "void func() { int buffer[-5]; }";
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        // 查找是否命中了现有的规则
        const logicError = results.find(r => r.ruleId === "CPP_INVALID_ARRAY_SIZE");
        expect(logicError).toBeDefined();
        // 验证位置准确性（Tree-sitter 行号从 0 开始）
        expect(logicError?.location.line).toBe(0);
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Logic Error - Reserved Identifier | 逻辑规则：保留标识符命名
     * @description Verifies detection of reserved identifier naming patterns using CPP_RESERVED_IDENTIFIER.scm.
     * 验证：基于 CPP_RESERVED_IDENTIFIER 规则，检测以单下划线+大写字母或双下划线开头的变量名。
     */
    it("should detect reserved identifier naming patterns (CPP_RESERVED_IDENTIFIER)", async () => {
        const rulePath = path_1.default.join(PATTERN_DIR, "CPP_RESERVED_IDENTIFIER.scm");
        if (!fs_1.default.existsSync(rulePath)) {
            console.warn("⚠️ Skipping CPP_RESERVED_IDENTIFIER test: Rule file not found.");
            return;
        }
        const code = `
      int _X = 0;        // 保留标识符：单下划线+大写
      int __system = 1;  // 保留标识符：双下划线
      int normal = 2;    // 合法标识符
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        const reservedIssues = results.filter(r => r.ruleId === "CPP_RESERVED_IDENTIFIER");
        expect(reservedIssues.length).toBeGreaterThanOrEqual(2);
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Logic Error - Assignment in If | 逻辑规则：条件内赋值
     * @description Verifies detection of assignment inside if-conditions using the existing SCM rule.
     * 验证：基于现有的 CPP_ASSIGNMENT_IN_IF.scm 规则，检测 if 条件中的赋值操作。
     */
    it("should detect assignment inside if condition (CPP_ASSIGNMENT_IN_IF)", async () => {
        const code = "void func() { int a; if (a = 1) {} }";
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        const assignmentError = results.find(r => r.ruleId === "CPP_ASSIGNMENT_IN_IF");
        expect(assignmentError).toBeDefined();
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Logic Error - Division by Zero Literal | 逻辑规则：字面量除零
     * @description Verifies detection of division/modulo by literal zero using CPP_DIVISION_BY_ZERO_LITERAL.scm.
     * 验证：基于 CPP_DIVISION_BY_ZERO_LITERAL 规则，检测 a / 0 或 a % 0 等明显错误。
     */
    it("should detect division by zero with literal divisor (CPP_DIVISION_BY_ZERO_LITERAL)", async () => {
        const rulePath = path_1.default.join(PATTERN_DIR, "CPP_DIVISION_BY_ZERO_LITERAL.scm");
        if (!fs_1.default.existsSync(rulePath)) {
            console.warn("⚠️ Skipping CPP_DIVISION_BY_ZERO_LITERAL test: Rule file not found.");
            return;
        }
        const code = "int foo(int x) { int a = x / 0; int b = x % 0; return a + b; }";
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        const divZeroIssues = results.filter(r => r.ruleId === "CPP_DIVISION_BY_ZERO_LITERAL");
        expect(divZeroIssues.length).toBeGreaterThanOrEqual(1);
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Logic Error - Missing Break in Switch | 逻辑规则：case 缺少 break
     * @description Verifies detection of case statements without a break using CPP_MISSING_BREAK.scm.
     */
    it("should detect missing break in switch case (CPP_MISSING_BREAK)", async () => {
        const rulePath = path_1.default.join(PATTERN_DIR, "CPP_MISSING_BREAK.scm");
        if (!fs_1.default.existsSync(rulePath)) {
            console.warn("⚠️ Skipping CPP_MISSING_BREAK test: Rule file not found.");
            return;
        }
        const code = `
      int foo(int x) {
        switch (x) {
          case 1:
            x++;
          case 2:
            break;
        }
        return x;
      }
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        const missingBreakIssues = results.filter(r => r.ruleId === "CPP_MISSING_BREAK");
        expect(missingBreakIssues.length).toBeGreaterThanOrEqual(1);
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Logic Error - Non-void Function Without Return | 逻辑规则：非 void 函数无返回
     * @description Verifies detection of non-void functions lacking any return statement using CPP_NON_VOID_NO_RETURN.scm.
     */
    it("should detect non-void function without return (CPP_NON_VOID_NO_RETURN)", async () => {
        const rulePath = path_1.default.join(PATTERN_DIR, "CPP_NON_VOID_NO_RETURN.scm");
        if (!fs_1.default.existsSync(rulePath)) {
            console.warn("⚠️ Skipping CPP_NON_VOID_NO_RETURN test: Rule file not found.");
            return;
        }
        const code = `
      int foo(int x) {
        if (x > 0) {
          x++;
        }
        // 无 return 语句
      }
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        const noReturnIssue = results.find(r => r.ruleId === "CPP_NON_VOID_NO_RETURN");
        expect(noReturnIssue).toBeDefined();
    });
    // ---------------------------------------------------------------------------
    /**
     * @test Case: Clean Code | 合规代码
     * @description Verifies that valid C++ code produces zero issues.
     * 验证：输入完全正确的代码，不应触发上述任何逻辑规则或语法错误。
     */
    it("should return empty list for valid code", async () => {
        const code = `
      #include <iostream>
      int main() {
        int arr[10];
        int b = 5;
        if (b == 5) {
            return 0;
        }
        return 0;
      }
    `;
        const tree = await (0, parser_1.parseCode)(code);
        const results = await (0, errors_1.analyzeErrors)(tree);
        // 如果这里失败，请检查 data/symbolic/ast-patterns/cpp/errors 下
        // 是否还有其他宽泛匹配的测试文件残留（如 CPP_TEST_LITERAL.scm）
        expect(results).toHaveLength(0);
    });
});
