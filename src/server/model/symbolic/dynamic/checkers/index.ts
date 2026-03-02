/**
 * @file index.ts
 * @description 动态分析规则注册中心 (Checkers Registry)。
 * 职责：
 * 1. 定义统一的检查器接口契约 (Checker Interface)。
 * 2. 集中管理并导出所有已实现的动态分析规则。
 * 3. 作为引擎 (AnalysisEngine) 调用规则的唯一入口。
 * @module Symbolic/Dynamic/Checkers
 */

import { SyntaxNode } from "../../parser";
import { Environment } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";

import { ArrayBoundsChecker } from "./array_bounds";

/**
 * 动态分析检查器接口
 */
export interface Checker {
  /**
   * 诊断逻辑核心方法
   * @param node - 当前正在遍历的 AST 节点
   * @param env - 当前执行路径下的符号环境状态
   * @returns 返回单个缺陷、缺陷数组或 null (代表验证通过)
   */
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null;
}

/**
 * 全局规则挂载点
 * 引擎在每条语句执行后，会自动遍历此数组并触发内部所有规则的 check 方法。
 */
export const ALL_CHECKERS: Checker[] = [
  ArrayBoundsChecker // 注册数组越界检查器
];