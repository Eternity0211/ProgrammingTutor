/**
 * @file null_deref.ts
 * @description 动态分析规则 - 空指针解引用检查器 (Null Dereference Checker)。
 *
 * 核心诊断原理：
 * 1. 拦截指针解引用操作，包括 `*ptr` 和 `ptr->member`。
 * 2. 向环境账本请求被解引用指针表达式的数值区间。
 * 3. 根据区间判断：
 *    - 区间完全为 [0,0] → 必然空指针 (Definite)
 *    - 区间跨过 0 但不完全为 0 → 疑似空指针 (Suspected)
 *
 * 实现采用与其他 Checker 类似的 eval 递归计算器，不处理取地址等复杂运算，
 * 对无法解析的情况返回寛泛区间 [-Inf,Inf]，使指针未初始化或污点
 * 时退化为 Suspected。
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const SHADOW_PREFIX = "__null_deref_shadow__";

export const NullDerefChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    // 不改引擎时，用 checker 内部的影子状态追踪指针值，规避 `*p = v` 造成的后态污染。
    trackPointerShadow(node, env);

    // 处理 `*ptr` 形式。(AST 上表现为 pointer_expression)
    if (node.type === "pointer_expression") {
      const arg = node.childForFieldName("argument") || node.namedChildren[0];
      if (arg) {
        const iv = getPointerInterval(arg, env);
        return classify(iv, node);
      }
    }

    // 处理 `ptr->field` 形式
    if (node.type === "field_expression") {
      const op = node.childForFieldName("operator")?.text;
      if (op === "->") {
        const arg = node.childForFieldName("argument");
        if (arg) {
          const iv = getPointerInterval(arg, env);
          return classify(iv, node);
        }
      }
    }

    return null;
  },
};

function trackPointerShadow(node: SyntaxNode, env: Environment): void {
  // 1) 指针声明（含不初始化）：同步环境中的当前区间到影子状态
  if (node.type === "pointer_declarator") {
    const name = extractIdentifierName(node);
    if (name) {
      setShadowInterval(name, env.getInterval(name), env);
    }
    return;
  }

  // 2) 指针声明且初始化：优先使用右值区间更新影子状态
  if (node.type === "init_declarator") {
    const declaratorNode =
      node.childForFieldName("declarator") || node.namedChildren[0];
    const valueNode = node.childForFieldName("value") || node.namedChildren[1];
    const name = extractIdentifierName(declaratorNode);
    if (!name) return;

    if (valueNode) {
      setShadowInterval(name, evaluateExpression(valueNode, env), env);
    } else {
      setShadowInterval(name, env.getInterval(name), env);
    }
    return;
  }

  // 3) 普通赋值（p = expr）：更新影子状态；解引用左值（*p = v / p->x = v）不覆盖影子状态
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    if (!leftNode || !rightNode) return;

    if (leftNode.type === "identifier") {
      setShadowInterval(
        leftNode.text.trim(),
        evaluateExpression(rightNode, env),
        env,
      );
    }
  }
}

function getPointerInterval(
  pointerExpr: SyntaxNode,
  env: Environment,
): Interval {
  if (pointerExpr.type === "identifier") {
    const shadowName = shadowVarName(pointerExpr.text.trim());
    const shadow = env.get(shadowName);
    if (shadow) return shadow.interval;
  }
  return evaluateExpression(pointerExpr, env);
}

function setShadowInterval(
  name: string,
  interval: Interval,
  env: Environment,
): void {
  const shadowName = shadowVarName(name);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "shadow_ptr");
  }
  env.updateInterval(shadowName, interval.min, interval.max);
}

function shadowVarName(name: string): string {
  return `${SHADOW_PREFIX}${name}`;
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

function classify(iv: Interval, node: SyntaxNode): RawIssue | null {
  const isDefinite = iv.min === 0 && iv.max === 0;
  const isSuspected = iv.min <= 0 && iv.max >= 0 && !isDefinite;
  if (!isDefinite && !isSuspected) return null;

  const meta = { pointerInterval: iv.toString() };
  const location = {
    line: node.startPosition.row + 1,
    column: node.startPosition.column,
  };
  if (isDefinite) {
    return { ruleId: "CPP_DYNAMIC_NULL_DEREF_DEFINITE", location, meta };
  } else {
    return { ruleId: "CPP_DYNAMIC_NULL_DEREF_SUSPECTED", location, meta };
  }
}

// 重新利用之前的简单表达式求值器
function evaluateExpression(node: SyntaxNode, env: Environment): Interval {
  if (!node) return new Interval(-Infinity, Infinity);
  const text = node.text.trim();
  if (/^-?\d+$/.test(text)) {
    const v = parseInt(text, 10);
    return new Interval(v, v);
  }
  if (node.type === "parenthesized_expression") {
    const inner = node.childForFieldName("value") || node.namedChildren[0];
    if (inner) return evaluateExpression(inner, env);
  }
  if (node.type === "binary_expression") {
    const left = node.childForFieldName("left") || node.namedChildren[0];
    const right = node.childForFieldName("right") || node.namedChildren[1];
    const op = node.childForFieldName("operator")?.text || "";
    if (left && right) {
      const li = evaluateExpression(left, env);
      const ri = evaluateExpression(right, env);
      switch (op) {
        case "+":
          return li.add(ri);
        case "-":
          return li.sub(ri);
        case "*":
          return li.mul(ri);
        case "/":
          return new Interval(
            ri.min < 0 && ri.max > 0
              ? -Infinity
              : ri.min === 0
                ? Infinity
                : Math.floor(li.min / ri.min),
            ri.min < 0 && ri.max > 0
              ? Infinity
              : ri.max === 0
                ? Infinity
                : Math.ceil(li.max / ri.max),
          );
      }
    }
  }
  if (/^[a-zA-Z_]\w*$/.test(text)) {
    return env.getInterval(text);
  }
  // 未知表达式退化为无限区间
  return new Interval(-Infinity, Infinity);
}
