/**
 * @file cast_overflow.ts
 * @description 动态分析规则 - 类型转换溢出检查器 (Cast Overflow Checker)。
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const TYPE_BOUNDS: Record<string, Interval> = {
  "char": new Interval(-128, 127),
  "signed char": new Interval(-128, 127),
  "unsigned char": new Interval(0, 255),
  "short": new Interval(-32768, 32767),
  "short int": new Interval(-32768, 32767),
  "unsigned short": new Interval(0, 65535),
  "unsigned short int": new Interval(0, 65535),
  "int": new Interval(-2147483648, 2147483647),
  "unsigned": new Interval(0, 4294967295),
  "unsigned int": new Interval(0, 4294967295),
};

export const CastOverflowChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    if (node.type !== "cast_expression") return null;

    const typeNode = node.childForFieldName("type") || node.namedChildren.find((c) => c.type === "type_descriptor");
    const valueNode = node.childForFieldName("value") || node.namedChildren.find((c) => c.type !== "type_descriptor");
    if (!typeNode || !valueNode) return null;

    const targetType = normalizeType(typeNode.text);
    const bounds = TYPE_BOUNDS[targetType];
    if (!bounds) return null;

    const source = evaluateExpression(valueNode, env);
    const isDefinite = source.min > bounds.max || source.max < bounds.min;
    const isSuspected = (source.min < bounds.min || source.max > bounds.max) && !isDefinite;

    if (!isDefinite && !isSuspected) return null;

    return {
      ruleId: isDefinite
        ? "CPP_DYNAMIC_CAST_OVERFLOW_DEFINITE"
        : "CPP_DYNAMIC_CAST_OVERFLOW_SUSPECTED",
      location: {
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      meta: {
        targetType,
        sourceInterval: source.toString(),
        targetRange: bounds.toString(),
      },
    };
  },
};

function normalizeType(raw: string): string {
  return raw
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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
