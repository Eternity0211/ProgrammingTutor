/**
 * @file uninit_param.ts
 * @description 动态分析规则 - 未初始化参数检查器 (Uninitialized Parameter Checker)。
 *
 * 核心诊断原理：
 * 在函数调用处，检查每个实参是否未初始化或被初始化为null。
 * - UNINITIALIZED 状态 → 必然未初始化 (Definite)
 * - NULL_PTR, TAINTED, 或指针值为NULL[0,0] → 疑似未初始化 (Suspected)
 */

import { SyntaxNode } from "../../parser";
import { Environment, InitState, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const NULL_SHADOW_PREFIX = "__uninit_param_null__";

export const UninitParamChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    trackNullLikeState(node, env);

    // 只关注函数调用表达式
    if (node.type !== "call_expression") return null;

    const argsNode =
      node.childForFieldName("arguments") ||
      node.namedChildren.find((c) => c.type === "argument_list");
    if (!argsNode) return null;

    const functionNode =
      node.childForFieldName("function") || node.namedChildren[0];
    const fnName = functionNode?.text?.trim() || "unknown";

    // 跳过一些系统函数
    if (shouldSkipFunction(fnName)) return null;

    const args = argsNode.namedChildren.filter(
      (c) => c.type !== "," && c.type !== ";",
    );
    const issues: RawIssue[] = [];

    for (let i = 0; i < args.length; i++) {
      const argName = extractIdentifierName(args[i]);
      if (!argName) continue;

      const state = env.get(argName);
      if (!state) continue;

      const location = {
        line: args[i].startPosition.row + 1,
        column: args[i].startPosition.column,
      };

      // 检查是否为确定未初始化
      const isDefiniteUninit = state.init === InitState.UNINITIALIZED;

      // 检查是否为可疑状态
      // 1. NULL_PTR或TAINTED初始化状态
      // 2. 区间为[0,0]的指针（表示nullptr/NULL）
      // 3. checker 影子状态判定为 null-like
      const hasNullInterval =
        state.interval && state.interval.min === 0 && state.interval.max === 0;
      const isTrackedNull = getNullLikeState(argName, env).max >= 1;
      const isSuspectedUninit =
        state.init === InitState.NULL_PTR ||
        state.init === InitState.TAINTED ||
        hasNullInterval ||
        isTrackedNull;

      if (isDefiniteUninit) {
        issues.push({
          ruleId: "CPP_DYNAMIC_UNINIT_PARAM_DEFINITE",
          location,
          meta: {
            functionName: fnName,
            paramName: argName,
            argumentIndex: i,
            initState: state.init,
          },
        });
      } else if (isSuspectedUninit) {
        issues.push({
          ruleId: "CPP_DYNAMIC_UNINIT_PARAM_SUSPECTED",
          location,
          meta: {
            functionName: fnName,
            paramName: argName,
            argumentIndex: i,
            initState: state.init,
          },
        });
      }
    }

    return issues.length > 0 ? issues : null;
  },
};

function trackNullLikeState(node: SyntaxNode, env: Environment): void {
  if (node.type === "init_declarator") {
    const declaratorNode =
      node.childForFieldName("declarator") || node.namedChildren[0];
    const valueNode = node.childForFieldName("value") || node.namedChildren[1];
    if (!containsPointerDeclarator(declaratorNode)) return;

    const name = extractIdentifierName(declaratorNode);
    if (!name) return;

    if (!valueNode) {
      setNullLikeState(name, new Interval(0, 0), env);
      return;
    }

    setNullLikeState(
      name,
      isNullLikeExpression(valueNode, env)
        ? new Interval(1, 1)
        : new Interval(0, 0),
      env,
    );
    return;
  }

  if (node.type === "assignment_expression" || node.type === "assignment") {
    const left = node.childForFieldName("left") || node.namedChildren[0];
    const right = node.childForFieldName("right") || node.namedChildren[1];
    if (!left || !right || left.type !== "identifier") return;

    const lhsName = left.text.trim();
    const hasTrack = !!env.get(nullStateVar(lhsName));
    const rhsName = extractIdentifierName(right);
    const rhsHasTrack = rhsName ? !!env.get(nullStateVar(rhsName)) : false;
    if (!hasTrack && !rhsHasTrack && !isNullLiteral(right)) return;

    if (rhsName && rhsHasTrack) {
      setNullLikeState(lhsName, getNullLikeState(rhsName, env), env);
      return;
    }

    setNullLikeState(
      lhsName,
      isNullLikeExpression(right, env)
        ? new Interval(1, 1)
        : new Interval(0, 0),
      env,
    );
  }
}

function nullStateVar(name: string): string {
  return `${NULL_SHADOW_PREFIX}${name}`;
}

function getNullLikeState(name: string, env: Environment): Interval {
  const st = env.get(nullStateVar(name));
  return st?.interval || new Interval(0, 0);
}

function setNullLikeState(
  name: string,
  state: Interval,
  env: Environment,
): void {
  const shadow = nullStateVar(name);
  if (!env.get(shadow)) {
    env.declareVar(shadow, "uninit_param_null");
  }
  env.updateInterval(shadow, state.min, state.max);
}

function containsPointerDeclarator(node: SyntaxNode | null): boolean {
  if (!node) return false;
  if (node.type === "pointer_declarator") return true;
  return node.namedChildren.some((child) => containsPointerDeclarator(child));
}

function isNullLikeExpression(node: SyntaxNode, env: Environment): boolean {
  if (isNullLiteral(node)) return true;

  if (
    node.type === "parenthesized_expression" ||
    node.type === "cast_expression"
  ) {
    const inner =
      node.childForFieldName("value") ||
      node.childForFieldName("argument") ||
      node.namedChildren[node.namedChildren.length - 1];
    return !!inner && isNullLikeExpression(inner, env);
  }

  const name = extractIdentifierName(node);
  if (name) {
    const iv = env.getInterval(name);
    return (
      (iv.min === 0 && iv.max === 0) || getNullLikeState(name, env).max >= 1
    );
  }

  return false;
}

function isNullLiteral(node: SyntaxNode): boolean {
  const text = node.text.trim();
  return text === "nullptr" || text === "NULL" || text === "0";
}

function extractIdentifierName(node: SyntaxNode | null): string | null {
  if (!node) return null;
  if (node.type === "identifier") return node.text.trim();
  if (
    node.type === "pointer_declarator" ||
    node.type === "reference_declarator" ||
    node.type === "array_declarator"
  ) {
    const inner = node.childForFieldName("declarator") || node.namedChildren[0];
    return extractIdentifierName(inner);
  }
  if (node.type === "argument" || node.type === "expression_statement") {
    const child = node.namedChildren[0];
    if (child?.type === "identifier") return child.text.trim();
  }
  return null;
}

function shouldSkipFunction(fnName: string): boolean {
  const skipFuncs = new Set([
    "printf",
    "fprintf",
    "sprintf",
    "strcpy",
    "strlen",
    "strcat",
    "memcpy",
    "memset",
    "free",
    "delete",
  ]);
  return skipFuncs.has(fnName);
}
