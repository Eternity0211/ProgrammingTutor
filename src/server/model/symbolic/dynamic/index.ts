/**
 * @file index.ts
 * @description 动态数据流分析服务的高级接口 (Facade Pattern)。
 * 提供从 AST 载入、CFG 生成到 DFA 固定点求解的统一访问屏障，
 * 并内置异常隔离机制，防止核心分析器的崩溃影响整个请求链路。
 * @module Symbolic/Dynamic
 */

import { Tree } from "../parser";
import { buildCFG } from "./cfg";
import { AnalysisEngine } from "./engine";
import { RawIssue } from "../../../../lib/types/symbolic-types";

/**
 * 执行动态数据流缺陷分析。
 * @param tree - 已完成语法解析的 Tree-sitter 抽象语法树
 * @returns 包含潜在安全/逻辑缺陷信息的原始数据数组
 */
export async function analyzeDataFlow(tree: Tree): Promise<RawIssue[]> {
  try {
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  } catch (error) {
    // Fail-Safe 容错机制：隔离内部崩溃抛出
    console.error("[Dynamic Engine] Failed to execute data flow analysis:", error);
    return []; 
  }
}