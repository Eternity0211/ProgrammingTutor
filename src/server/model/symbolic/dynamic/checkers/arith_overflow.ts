/**
 * @file arith_overflow.ts
 * @description 动态分析规则 - 算术溢出检查器 (Arithmetic Overflow Checker)。
 *
 * 规则目标：拦截加减乘操作，判断 32-bit int 语义下的上溢/下溢风险。
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

export const ArithOverflowChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    if (node.type !== "binary_expression") return null;

    const op = node.childForFieldName("operator")?.text || "";
    if (op !== "+" && op !== "-" && op !== "*") return null;

    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    if (!leftNode || !rightNode) return null;

    const left = evaluateExpression(leftNode, env);
    const right = evaluateExpression(rightNode, env);

    let result: Interval;
    if (op === "+") result = left.add(right);
    else if (op === "-") result = left.sub(right);
    else result = left.mul(right);

    const overflowsLow = result.min < INT32_MIN;
    const overflowsHigh = result.max > INT32_MAX;
    if (!overflowsLow && !overflowsHigh) return null;

    const isDefinite = result.max < INT32_MIN || result.min > INT32_MAX;

    const location = {
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
    };

    const meta = {
      operator: op,
      leftInterval: left.toString(),
      rightInterval: right.toString(),
      resultInterval: result.toString(),
      intMin: INT32_MIN,
      intMax: INT32_MAX,
    };

    return {
      ruleId: isDefinite
        ? "CPP_DYNAMIC_ARITH_OVERFLOW_DEFINITE"
        : "CPP_DYNAMIC_ARITH_OVERFLOW_SUSPECTED",
      location,
      meta,
    };
  },
};

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
    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    const op = node.childForFieldName("operator")?.text || "";
    if (leftNode && rightNode) {
      const left = evaluateExpression(leftNode, env);
      const right = evaluateExpression(rightNode, env);
      if (op === "+") return left.add(right);
      if (op === "-") return left.sub(right);
      if (op === "*") return left.mul(right);
    }
  }

  if (/^[a-zA-Z_]\w*$/.test(text)) {
    return env.getInterval(text);
  }

  return new Interval(-Infinity, Infinity);
}
