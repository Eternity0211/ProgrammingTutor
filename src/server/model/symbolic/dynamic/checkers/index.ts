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

// ============================================================================
// 规则导入区 (Import Area)
// ============================================================================
import { ArrayBoundsChecker } from "./array_bounds";
import { DivByZeroChecker } from "./div_by_zero";
import { NullDerefChecker } from "./null_deref";
import { UninitializedVarChecker } from "./uninitialized_var";
import { UseAfterFreeChecker } from "./use_after_free";
import { ArithOverflowChecker } from "./arith_overflow";
import { BufferOverflowChecker } from "./buffer_overflow";
import { FormatStringChecker } from "./format_string";
import { ParamTaintChecker } from "./param_taint";
import { CastOverflowChecker } from "./cast_overflow";
// TODO: [扩充规则 1] 组员在新增规则文件后，请在此处导入。
// 示例: import { NullDerefChecker } from "./null_deref";


// ============================================================================
// 接口定义区 (Interface Definition)
// ============================================================================

/**
 * 动态分析检查器接口
 * 所有新增的检查器 (Checkers) 都必须实现此接口。
 */
export interface Checker {
  /**
   * 诊断逻辑核心方法
   * @param node - 当前正在遍历的 AST (抽象语法树) 节点
   * @param env - 当前执行路径下的符号环境状态 (包含区间、初始化状态等)
   * @returns 返回单个缺陷 (RawIssue)、缺陷数组 (RawIssue[]) 或 null (代表未发现问题)
   */
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null;
}

// ============================================================================
// 全局规则挂载点 (Registry)
// ============================================================================

/**
 * 核心挂载数组
 * 引擎 (AnalysisEngine) 在每条语句执行后，会自动遍历此数组并触发所有规则的 check 方法。
 */
export const ALL_CHECKERS: Checker[] = [
  ArrayBoundsChecker,         // 数组越界检查器
  DivByZeroChecker,           // 除零检查器
  NullDerefChecker,           // 空指针解引用检查器
  UninitializedVarChecker,    // 未初始化变量检查器
  UseAfterFreeChecker,        // 释放后使用检查器
  ArithOverflowChecker,       // 算术溢出检查器
  BufferOverflowChecker,      // 缓冲区溢出检查器
  FormatStringChecker,        // 格式化字符串检查器
  ParamTaintChecker,          // 参数污点检查器
  CastOverflowChecker,        // 类型转换溢出检查器
  
  // TODO: [扩充规则 2] 请将上面导入的检查器实例追加到此数组中。
];