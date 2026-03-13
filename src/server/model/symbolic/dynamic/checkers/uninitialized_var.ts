/**
 * @file uninitialized_var.ts
 * @description 动态分析规则 - 未初始化变量检查器 (Uninitialized Variable Checker)。
 *
 * 核心诊断原理：
 * 1. 拦截标识符节点（变量使用）
 * 2. 检查环境中该变量的初始化状态
 * 3. 根据初始化状态判定：
 *    - 状态为 UNINITIALIZED → 必然未初始化 (Definite)
 *    - 状态跨越未初始化和已初始化 → 疑似未初始化 (Suspected)
 *    - 状态为 NULL_PTR 或 TAINTED → 疑似有问题 (Suspected)
 */

import { SyntaxNode } from "../../parser";
import { Environment, InitState } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

export const UninitializedVarChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    // 只关注标识符节点
    if (node.type !== "identifier") return null;

    const varName = node.text.trim();

    // 跳过关键字和内置函数
    if (isKeywordOrBuiltin(varName)) return null;

    // 查询环境中该变量的初始化状态
    const state = env.get(varName);
    if (!state) return null; // 未知变量，跳过（可能是函数名或宏）

    // 创建位置信息
    const location = {
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
    };
    const meta = { varName, initState: state.init };

    // 判定逻辑 - 注意：属性名是 'init' 而不是 'initState'
    const isDefiniteUninit = state.init === InitState.UNINITIALIZED;
    const isSuspectedUninit =
      state.init === InitState.NULL_PTR ||
      state.init === InitState.TAINTED;

    // DEFINITE：确定未初始化
    if (isDefiniteUninit) {
      return {
        ruleId: "CPP_DYNAMIC_UNINITIALIZED_VAR_DEFINITE",
        location,
        meta,
      };
    }

    // SUSPECTED：疑似未初始化（NULL_PTR 或 TAINTED）
    if (isSuspectedUninit) {
      return {
        ruleId: "CPP_DYNAMIC_UNINITIALIZED_VAR_SUSPECTED",
        location,
        meta,
      };
    }

    return null;
  }
};

function isKeywordOrBuiltin(name: string): boolean {
  const keywords = new Set([
    "int", "float", "double", "char", "bool", "void", "long", "short",
    "unsigned", "signed", "const", "static", "return", "if", "else",
    "while", "for", "break", "continue", "switch", "case", "default",
    "nullptr", "true", "false", "new", "delete", "this", "NULL",
    "printf", "scanf", "cout", "cin", "std", "main", "size", "capacity",
    "push_back", "pop_back", "empty", "begin", "end", "nullptr"
  ]);
  return keywords.has(name);
}
