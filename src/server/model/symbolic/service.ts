/**
 * @file service.ts
 * @description 符号分析引擎统筹总控层 (Orchestrator Service)。
 * 核心职责：
 * 1. 协调底层 Parser 构建抽象语法树 (AST)。
 * 2. 并行调度静态模式匹配 (Errors/Warnings) 与动态数据流分析 (DFA) 任务。
 * 3. 驱动 Mapper 转换层，将散列的原始缺陷数据聚合为标准化的富文本教学诊断报告。
 * @module Symbolic/Service
 */

import { parseCode } from "./parser";
import { analyzeErrors } from "./static/errors";
import { analyzeWarnings } from "./static/warnings";
// 优雅地通过 dynamic 模块的统一门面 (Facade) 接入动态引擎，隔离底层复杂性
import { analyzeDataFlow } from "./dynamic"; 
import { mapIssues } from "./mapper";
import { SymbolicResult } from "../../../lib/types/symbolic-types";

// =============================================================================
// Core Service Logic | 核心业务调度逻辑
// =============================================================================

/**
 * 对目标 C++ 源代码执行全链路符号分析。
 * * 架构特性：
 * - 无状态设计 (Stateless)：函数调用之间彼此隔离，绝对协程安全，支持高并发请求。
 * - 容错降级 (Fail-Safe)：任意子模块（如动态分析器陷入复杂死循环被强杀）的局部崩溃，
 * 均不会阻断整体响应流，最大限度保障核心静态诊断产出的可用性。
 * * @param sourceCode - 待分析的原始 C++ 代码字符串
 * @returns {Promise<SymbolicResult>} 包含标准化错误、警告列表及性能元数据的综合分析报告
 */
export async function analyzeCode(sourceCode: string): Promise<SymbolicResult> {
  const startTime = performance.now();

  try {
    // 1. [基础设施层] 构建抽象语法树 (AST)
    // 语法树是所有后续静态/动态分析的公共基建，必须在此优先等待其构建完成
    const tree = await parseCode(sourceCode);
    
    // 2. [分析层] 静态规则扫描与动态流推演并行调度
    // 充分利用 Node.js 异步非阻塞特性与 Promise.all，实现分析任务的完美并发，榨干 CPU 效能
    const [rawErrors, rawWarnings, dynamicIssues] = await Promise.all([
      analyzeErrors(tree),   // 静态层：严重错误模式匹配
      analyzeWarnings(tree), // 静态层：代码风格与隐患模式匹配
      analyzeDataFlow(tree)  // 动态层：数据流分析与符号推演
    ]);

    // 3. [转换与聚合层] 缺陷数据统一充血映射
    // 将静态引擎与动态引擎查出的原始数据 (仅包含 ruleId 与位置) 聚合，
    // 统一交由 Mapper 注入教学指引、知识点解析及修复建议等富文本内容
    const result = mapIssues([...rawErrors, ...dynamicIssues], rawWarnings);

    // 4. [遥测与元数据] 附加系统执行指标
    // 记录分析耗时与节点规模，为服务监控大盘和后续性能调优提供数据支撑
    const endTime = performance.now();
    return {
      ...result,
      metadata: {
        parseTime: endTime - startTime,
        nodeCount: tree.rootNode.descendantCount,
        analyzedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    // 顶层灾难性异常兜底拦截 (Catch-all Fallback)
    // 确保即使在极端输入导致内部模块彻底崩溃时，依然能向网关或客户端返回合法、友好的 JSON 响应
    console.error("[Symbolic Service] Analysis failed criticaly:", error);
    
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