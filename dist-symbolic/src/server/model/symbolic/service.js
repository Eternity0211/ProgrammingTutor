"use strict";
/**
 * @file service.ts
 * @description 符号分析引擎总入口 (Orchestrator Service)。
 * 职责：
 * 1. 协调 Parser 生成 AST。
 * 2. 并行调度 Errors 和 Warnings 的静态分析任务。
 * 3. 调用 Mapper 将原始分析结果聚合为富文本教学 Issue。
 * @module Symbolic/Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCode = analyzeCode;
const parser_1 = require("./parser");
const errors_1 = require("./static/errors");
const warnings_1 = require("./static/warnings");
const mapper_1 = require("./mapper");
// =============================================================================
// Core Service Logic | 核心业务逻辑
// =============================================================================
/**
 * 对 C++ 源代码执行全量符号分析。
 * * 该函数是无状态的 (Stateless)，可安全地并发调用。
 * * 采用 "Fail-Safe" 策略：即使某个子模块分析失败，也会尽量返回其他模块的结果。
 * * @param sourceCode - 待分析的 C++ 源代码字符串
 * @returns {Promise<SymbolicResult>} 包含错误和警告的分析报告
 */
async function analyzeCode(sourceCode) {
    const startTime = performance.now();
    try {
        // 1. [Infrastructure] 生成抽象语法树 (AST)
        // 这是一个高成本操作，必须在分析开始前完成
        const tree = await (0, parser_1.parseCode)(sourceCode);
        // 2. [Analysis] 并行执行静态扫描
        // 利用 Promise.all 实现 Errors 和 Warnings 的并发处理，最大化 I/O 效率
        const [rawErrors, rawWarnings] = await Promise.all([
            (0, errors_1.analyzeErrors)(tree),
            (0, warnings_1.analyzeWarnings)(tree)
            // Future: analyzeDataFlow(tree) -> 可以在此处扩展动态分析
        ]);
        // 3. [Transformation] 结果聚合与映射
        // 将原始的 RawIssue (ruleId + location) 转换为富文本 Issue
        const result = (0, mapper_1.mapIssues)(rawErrors, rawWarnings);
        // 4. [Metadata] 附加性能指标 (可选)
        const endTime = performance.now();
        return {
            ...result,
            metadata: {
                parseTime: endTime - startTime,
                nodeCount: tree.rootNode.descendantCount,
                analyzedAt: new Date().toISOString()
            }
        };
    }
    catch (error) {
        // 顶层异常捕获：防止引擎内部崩溃导致整个 HTTP 请求失败
        console.error("[Symbolic Service] Analysis failed criticaly:", error);
        // 在发生灾难性错误时，返回空的降级结果，并附带系统级错误提示
        // 注意：这里手动构造一个特殊的 System Error
        return {
            errors: [{
                    ruleId: "SYS_INTERNAL_ERROR",
                    severity: "Critical",
                    display_name: "Analysis Engine Error",
                    message: "An internal error occurred during code analysis. Please try again.",
                    pedagogical_label: "System",
                    knowledge_concept: "none",
                    location: { line: 0, column: 0 },
                    remediation: "Check server logs for details."
                }],
            warnings: []
        };
    }
}
