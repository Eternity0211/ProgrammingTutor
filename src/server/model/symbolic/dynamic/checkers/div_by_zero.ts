/**
 * @file div_by_zero.ts
 * @description 动态分析规则 - 除零检查器 (Division By Zero Checker)。
 * 核心诊断原理：
 * 拦截 AST 中的二元运算表达式，针对除法 `/` 和取模 `%` 运算。
 * 向环境账本请求右侧操作数的数值区间，并判断是否包含 0。
 * * 判定模型：
 *   1. 必然除零 (Definite / Must-Issue): 右侧区间完全等于 [0,0]。
 *   2. 疑似除零 (Suspected / May-Issue): 右侧区间跨越 0 但不全为 0。
 *
 * 注：左侧操作数仅用于元数据提示，实际诊断只关注除数。
 * @module Symbolic/Dynamic/Checkers/DivByZero
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

export const DivByZeroChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    // 只关注二元表达式
    if (node.type !== "binary_expression") return null;

    const opNode =
      node.childForFieldName("operator") ||
      node.namedChildren.find((c) => c.text === "/" || c.text === "%");
    if (!opNode) return null;
    const op = opNode.text;
    if (op !== "/" && op !== "%") return null;

    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    if (!rightNode) return null;

    const divisorInterval = evaluateExpression(rightNode, env);

    const isDefinite = divisorInterval.min === 0 && divisorInterval.max === 0;
    const isSuspected =
      divisorInterval.min <= 0 && divisorInterval.max >= 0 && !isDefinite;

    if (!isDefinite && !isSuspected) return null;

    const meta = {
      operator: op,
      divisorInterval: divisorInterval.toString(),
      numeratorInterval: leftNode
        ? evaluateExpression(leftNode, env).toString()
        : "?",
    };
    const location = {
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
    };

    if (isDefinite) {
      return { ruleId: "CPP_DYNAMIC_DIV_ZERO_DEFINITE", location, meta };
    } else {
      return { ruleId: "CPP_DYNAMIC_DIV_ZERO_SUSPECTED", location, meta };
    }
  },
};

// 简化表达式求值器，与 array_bounds 中的类似，但足够支持本检查器的常见情形
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
        case "/": // interval division conservatively
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

  return new Interval(-Infinity, Infinity);
}
