/**
 * @file use_after_free.ts
 * @description 动态分析规则 - 释放后使用检查器 (Use-After-Free Checker)。
 *
 * 约束：不修改引擎，使用 checker 内部影子状态追踪指针是否已释放。
 * 影子状态区间定义：
 * - [0,0] => 未释放
 * - [1,1] => 已释放
 * - [0,1] => 路径合并后的不确定状态（May-Issue）
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const SHADOW_PREFIX = "__uaf_status__";

export const UseAfterFreeChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    trackFreeState(node, env);

    if (node.type === "pointer_expression") {
      const arg = node.childForFieldName("argument") || node.namedChildren[0];
      const pointerName = extractIdentifierName(arg);
      if (!pointerName) return null;
      return classifyUse(pointerName, env, node, "dereference");
    }

    if (node.type === "field_expression") {
      const op = node.childForFieldName("operator")?.text;
      if (op === "->") {
        const arg = node.childForFieldName("argument");
        const pointerName = extractIdentifierName(arg);
        if (!pointerName) return null;
        return classifyUse(pointerName, env, node, "member_access");
      }
    }

    if (node.type === "subscript_expression") {
      const arg = node.childForFieldName("argument") || node.namedChildren[0];
      const pointerName = extractIdentifierName(arg);
      if (!pointerName) return null;
      return classifyUse(pointerName, env, node, "index_access");
    }

    if (node.type === "call_expression") {
      const args =
        node.childForFieldName("arguments") ||
        node.namedChildren.find((c) => c.type === "argument_list");
      if (!args) return null;

      const issues: RawIssue[] = [];
      for (const argNode of args.namedChildren) {
        const pointerName = extractIdentifierName(argNode);
        if (!pointerName) continue;
        const issue = classifyUse(pointerName, env, argNode, "call_argument");
        if (issue) {
          if (Array.isArray(issue)) {
            issues.push(...issue);
          } else {
            issues.push(issue);
          }
        }
      }
      return issues.length > 0 ? issues : null;
    }

    return null;
  },
};

function trackFreeState(node: SyntaxNode, env: Environment): void {
  // 指针声明（无初始化）
  if (node.type === "pointer_declarator") {
    const name = extractIdentifierName(node);
    if (name) {
      setStatus(name, new Interval(0, 0), env);
    }
    return;
  }

  // 指针声明（有初始化）
  if (node.type === "init_declarator") {
    const declaratorNode =
      node.childForFieldName("declarator") || node.namedChildren[0];
    if (!containsPointerDeclarator(declaratorNode)) return;

    const pointerName = extractIdentifierName(declaratorNode);
    const valueNode = node.childForFieldName("value") || node.namedChildren[1];
    if (!pointerName) return;

    if (!valueNode) {
      setStatus(pointerName, new Interval(0, 0), env);
      return;
    }

    if (valueNode.type === "new_expression") {
      setStatus(pointerName, new Interval(0, 0), env);
      return;
    }

    const rhsName = extractIdentifierName(valueNode);
    if (rhsName) {
      setStatus(pointerName, getStatus(rhsName, env), env);
      return;
    }

    // 复杂右值来源保守处理为未知
    setStatus(pointerName, new Interval(0, 1), env);
    return;
  }

  // delete p;
  if (node.type === "delete_expression") {
    const target =
      node.namedChildren[0] || node.childForFieldName("value") || null;
    const pointerName = extractIdentifierName(target);
    if (!pointerName) return;
    setStatus(pointerName, new Interval(1, 1), env);
    return;
  }

  // p = ... ; 仅处理左值是标识符的普通赋值
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    if (!leftNode || !rightNode || leftNode.type !== "identifier") return;

    const leftName = leftNode.text.trim();
    const hasTrackedStatus = !!env.get(statusVarName(leftName));
    const rhsName = extractIdentifierName(rightNode);
    const rhsHasTrackedStatus = rhsName
      ? !!env.get(statusVarName(rhsName))
      : false;

    // 仅在明显涉及指针语义时更新状态，避免污染普通整数变量
    if (
      !hasTrackedStatus &&
      rightNode.type !== "new_expression" &&
      !rhsHasTrackedStatus
    ) {
      return;
    }

    if (rightNode.type === "new_expression") {
      setStatus(leftName, new Interval(0, 0), env);
      return;
    }

    if (rhsName) {
      setStatus(leftName, getStatus(rhsName, env), env);
      return;
    }

    setStatus(leftName, new Interval(0, 1), env);
  }
}

function classifyUse(
  pointerName: string,
  env: Environment,
  node: SyntaxNode,
  accessKind: string,
): RawIssue | null {
  const freeState = getStatus(pointerName, env);
  const containsFreed = freeState.max >= 1;
  const isDefinitelyFreed = freeState.min === 1 && freeState.max === 1;

  if (!containsFreed) return null;

  const location = {
    line: node.startPosition.row + 1,
    column: node.startPosition.column,
  };

  const meta = {
    pointerName,
    freeState: freeState.toString(),
    accessKind,
  };

  // 跨函数参数传递是否真正触发解引用不可见，按保守策略固定为 Suspected。
  if (accessKind === "call_argument") {
    return {
      ruleId: "CPP_DYNAMIC_USE_AFTER_FREE_SUSPECTED",
      location,
      meta,
    };
  }

  if (isDefinitelyFreed) {
    return {
      ruleId: "CPP_DYNAMIC_USE_AFTER_FREE_DEFINITE",
      location,
      meta,
    };
  }

  return {
    ruleId: "CPP_DYNAMIC_USE_AFTER_FREE_SUSPECTED",
    location,
    meta,
  };
}

function containsPointerDeclarator(node: SyntaxNode | null): boolean {
  if (!node) return false;
  if (node.type === "pointer_declarator") return true;
  return node.namedChildren.some((child) => containsPointerDeclarator(child));
}

function statusVarName(pointerName: string): string {
  return `${SHADOW_PREFIX}${pointerName}`;
}

function getStatus(pointerName: string, env: Environment): Interval {
  const state = env.get(statusVarName(pointerName));
  return state?.interval || new Interval(0, 1);
}

function setStatus(
  pointerName: string,
  interval: Interval,
  env: Environment,
): void {
  const name = statusVarName(pointerName);
  if (!env.get(name)) {
    env.declareVar(name, "uaf_status");
  }
  env.updateInterval(name, interval.min, interval.max);
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

  const text = node.text.trim();
  return /^[a-zA-Z_]\w*$/.test(text) ? text : null;
}
