/**
 * @file double_free.ts
 * @description 动态分析规则 - 双重释放检查器 (Double Free Checker)。
 *
 * 核心诊断原理：
 * 通过影子状态追踪每个指针的生命周期：
 * - [0,0] 未释放 (alive)
 * - [1,1] 已释放 (freed)
 * - [0,1] 可能释放 (maybe freed)
 *
 * 当遇到 delete/free 操作时，检查指针是否已经被释放过。
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const SHADOW_PREFIX = "__free_state__";

export const DoubleFreeChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    trackFreeState(node, env);

    // 只关注 delete/free 操作
    if (!isDeleteOrFree(node)) return null;

    const ptrNode = getPointerFromDelete(node);
    if (!ptrNode) return null;

    const ptrName = extractIdentifierName(ptrNode);
    if (!ptrName) return null;

    const freeState = getFreeState(ptrName, env);
    const isDefiniteFreed = freeState.min === 1 && freeState.max === 1;
    const isSuspectedFreed =
      freeState.min <= 0 && freeState.max >= 1 && !isDefiniteFreed;
    const inConditional = isConditionalContext(node);

    const freedNow = new Interval(1, 1);
    const nextState = isConditionalContext(node)
      ? freeState.union(freedNow)
      : freedNow;

    if (!isDefiniteFreed && !isSuspectedFreed) {
      // 第一次释放，标记为已释放
      setFreeState(ptrName, nextState, env);
      return null;
    }

    const location = {
      line: ptrNode.startPosition.row + 1,
      column: ptrNode.startPosition.column,
    };

    if (isDefiniteFreed && !inConditional) {
      setFreeState(ptrName, nextState, env);
      return {
        ruleId: "CPP_DYNAMIC_DOUBLE_FREE_DEFINITE",
        location,
        meta: {
          pointerName: ptrName,
          freeState: freeState.toString(),
        },
      };
    } else {
      setFreeState(ptrName, nextState, env);
      return {
        ruleId: "CPP_DYNAMIC_DOUBLE_FREE_SUSPECTED",
        location,
        meta: {
          pointerName: ptrName,
          freeState: freeState.toString(),
        },
      };
    }
  },
};

function trackFreeState(node: SyntaxNode, env: Environment): void {
  // 未知函数调用：参数可能在被调函数内释放
  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    if (fnName && fnName !== "free") {
      const argsNode =
        node.childForFieldName("arguments") ||
        node.namedChildren.find((c) => c.type === "argument_list");
      if (argsNode) {
        const args = argsNode.namedChildren.filter((c) => c.text !== ",");
        for (const arg of args) {
          const argName = extractIdentifierName(arg);
          if (!argName) continue;
          const hasTrack = !!env.get(freeVar(argName));
          if (!hasTrack) continue;
          setFreeState(argName, getFreeState(argName, env).union(new Interval(1, 1)), env);
        }
      }
    }
  }

  // 指针声明（无初始化）
  if (node.type === "pointer_declarator") {
    if (node.parent?.type !== "init_declarator") {
      const name = extractIdentifierName(node);
      if (name) setFreeState(name, new Interval(0, 0), env);
    }
    return;
  }

  // 指针声明（有初始化）
  if (node.type === "init_declarator") {
    const declaratorNode =
      node.childForFieldName("declarator") || node.namedChildren[0];
    if (!containsPointerDeclarator(declaratorNode)) return;

    const name = extractIdentifierName(declaratorNode);
    const valueNode = node.childForFieldName("value") || node.namedChildren[1];
    if (!name) return;

    if (!valueNode) {
      setFreeState(name, new Interval(0, 0), env);
      return;
    }

    if (isAllocationExpression(valueNode)) {
      setFreeState(name, new Interval(0, 0), env);
      return;
    }

    const rhsName = extractIdentifierName(valueNode);
    if (rhsName) {
      setFreeState(name, getFreeState(rhsName, env), env);
      return;
    }

    setFreeState(name, new Interval(0, 0), env);
    return;
  }

  // 赋值时传播释放状态
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const lhs = node.childForFieldName("left") || node.namedChildren[0];
    const rhs = node.childForFieldName("right") || node.namedChildren[1];

    if (!lhs || !rhs || lhs.type !== "identifier") return;

    const lhsName = lhs.text.trim();
    const hasTrack = !!env.get(freeVar(lhsName));
    const rhsName = extractIdentifierName(rhs);
    const rhsHasTrack = rhsName ? !!env.get(freeVar(rhsName)) : false;

    if (!hasTrack && !rhsHasTrack && !isAllocationExpression(rhs)) {
      return;
    }

    let next = new Interval(0, 0);
    if (isAllocationExpression(rhs)) {
      next = new Interval(0, 0);
    } else if (rhsName) {
      next = getFreeState(rhsName, env);
    }

    if (isConditionalContext(node)) {
      setFreeState(lhsName, getFreeState(lhsName, env).union(next), env);
    } else {
      setFreeState(lhsName, next, env);
    }
    return;
  }

  // delete/free 操作已经在主check方法中处理
}

function isDeleteOrFree(node: SyntaxNode): boolean {
  if (node.type === "delete_expression") return true;
  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    return fnName === "free";
  }
  return false;
}

function getPointerFromDelete(node: SyntaxNode): SyntaxNode | null {
  if (node.type === "delete_expression") {
    return node.childForFieldName("argument") || node.namedChildren[0] || null;
  }
  if (node.type === "call_expression") {
    const argsNode =
      node.childForFieldName("arguments") ||
      node.namedChildren.find((c) => c.type === "argument_list");
    if (!argsNode) return null;
    const args = argsNode.namedChildren.filter((c) => c.text !== ",");
    return args.length > 0 ? args[0] : null;
  }
  return null;
}

function getFreeState(ptrName: string, env: Environment): Interval {
  const shadowName = freeVar(ptrName);
  const state = env.get(shadowName);
  if (state && state.interval) {
    return state.interval;
  }
  return new Interval(0, 0);
}

function setFreeState(
  ptrName: string,
  state: Interval,
  env: Environment,
): void {
  const shadowName = freeVar(ptrName);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "free_state");
  }
  env.updateInterval(shadowName, state.min, state.max);
}

function freeVar(name: string): string {
  return `${SHADOW_PREFIX}${name}`;
}

function containsPointerDeclarator(node: SyntaxNode | null): boolean {
  if (!node) return false;
  if (node.type === "pointer_declarator") return true;
  return node.namedChildren.some((child) => containsPointerDeclarator(child));
}

function isAllocationExpression(node: SyntaxNode): boolean {
  if (!node) return false;
  if (node.type === "new_expression") return true;
  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    return fnName === "malloc" || fnName === "calloc" || fnName === "realloc";
  }
  if (node.type === "cast_expression" || node.type === "parenthesized_expression") {
    const inner =
      node.childForFieldName("value") ||
      node.childForFieldName("argument") ||
      node.namedChildren[node.namedChildren.length - 1];
    return !!inner && isAllocationExpression(inner);
  }
  return false;
}

function isConditionalContext(node: SyntaxNode): boolean {
  let current: SyntaxNode | null = node.parent;
  while (current) {
    if (
      current.type === "if_statement" ||
      current.type === "while_statement" ||
      current.type === "for_statement" ||
      current.type === "conditional_expression" ||
      current.type === "switch_statement"
    ) {
      return true;
    }
    if (current.type === "function_definition") return false;
    current = current.parent;
  }
  return false;
}

function extractIdentifierName(node: SyntaxNode | null): string | null {
  if (!node) return null;
  if (node.type === "identifier" || node.type === "field_identifier") {
    return node.text.trim();
  }

  if (
    node.type === "pointer_declarator" ||
    node.type === "reference_declarator" ||
    node.type === "array_declarator"
  ) {
    const inner = node.childForFieldName("declarator") || node.namedChildren[0];
    return extractIdentifierName(inner);
  }

  if (
    node.type === "parenthesized_expression" ||
    node.type === "argument" ||
    node.type === "expression_statement" ||
    node.type === "pointer_expression" ||
    node.type === "unary_expression"
  ) {
    const child =
      node.childForFieldName("argument") ||
      node.childForFieldName("operand") ||
      node.namedChildren[0];
    if (child) return extractIdentifierName(child);
  }

  const text = node.text.trim();
  return /^[a-zA-Z_]\w*$/.test(text) ? text : null;

  return null;
}
