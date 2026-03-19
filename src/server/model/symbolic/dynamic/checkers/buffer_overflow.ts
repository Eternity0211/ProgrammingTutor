/**
 * @file buffer_overflow.ts
 * @description 动态分析规则 - 缓冲区溢出检查器 (Buffer Overflow Checker)。
 *
 * 覆盖场景：
 * 1) 容量 + 长度参数型 API：memcpy/memmove/memset
 * 2) 无边界 API：strcpy/sprintf/gets
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const BOUNDED_COPY_APIS = new Set(["memcpy", "memmove", "memset"]);
const UNBOUNDED_APIS = new Set(["strcpy", "sprintf", "gets"]);

export const BufferOverflowChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    if (node.type !== "call_expression") return null;

    const functionNode =
      node.childForFieldName("function") || node.namedChildren[0];
    const argsNode =
      node.childForFieldName("arguments") ||
      node.namedChildren.find((c) => c.type === "argument_list");
    if (!functionNode || !argsNode) return null;

    const fnName = functionNode.text.trim();
    const args = argsNode.namedChildren;
    if (args.length === 0) return null;

    if (BOUNDED_COPY_APIS.has(fnName)) {
      // memcpy(dst, src, n), memmove(dst, src, n), memset(dst, v, n)
      if (args.length < 3) return null;
      const dstName = extractIdentifierName(args[0]);
      if (!dstName) return null;

      const bufSize = getBufferSize(dstName, env);
      const writeSize = evaluateExpression(args[2], env);

      return classifyOverflow(node, fnName, dstName, bufSize, writeSize);
    }

    if (UNBOUNDED_APIS.has(fnName)) {
      const dstName = extractIdentifierName(args[0]);
      if (!dstName) return null;

      const bufSize = getBufferSize(dstName, env);
      if (fnName === "strcpy" && args.length >= 2) {
        const srcLiteralLength = getStringLiteralLength(args[1]);
        if (bufSize !== null && srcLiteralLength !== null) {
          // 需要包含 '\0'
          const required = srcLiteralLength + 1;
          if (required > bufSize) {
            return buildIssue(node, "CPP_DYNAMIC_BUFFER_OVERFLOW_DEFINITE", {
              functionName: fnName,
              bufferName: dstName,
              bufferSize: bufSize,
              requiredSize: required,
            });
          }
          return null;
        }
      }

      // gets/sprintf/strcpy 一般都是无边界拷贝，统一给 Suspected
      return buildIssue(node, "CPP_DYNAMIC_BUFFER_OVERFLOW_SUSPECTED", {
        functionName: fnName,
        bufferName: dstName,
        bufferSize: bufSize ?? "unknown",
        reason: "unbounded_write",
      });
    }

    return null;
  },
};

function classifyOverflow(
  node: SyntaxNode,
  functionName: string,
  bufferName: string,
  bufferSize: number | null,
  writeSize: Interval,
): RawIssue | null {
  if (bufferSize === null) {
    return buildIssue(node, "CPP_DYNAMIC_BUFFER_OVERFLOW_SUSPECTED", {
      functionName,
      bufferName,
      bufferSize: "unknown",
      writeSize: writeSize.toString(),
      reason: "unknown_buffer_size",
    });
  }

  const isDefinite = writeSize.min > bufferSize;
  const isSuspected = writeSize.max > bufferSize && !isDefinite;

  if (!isDefinite && !isSuspected) return null;

  return buildIssue(
    node,
    isDefinite
      ? "CPP_DYNAMIC_BUFFER_OVERFLOW_DEFINITE"
      : "CPP_DYNAMIC_BUFFER_OVERFLOW_SUSPECTED",
    {
      functionName,
      bufferName,
      bufferSize,
      writeSize: writeSize.toString(),
    },
  );
}

function buildIssue(
  node: SyntaxNode,
  ruleId: string,
  meta: Record<string, string | number>,
): RawIssue {
  return {
    ruleId,
    location: {
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
    },
    meta,
  };
}

function getBufferSize(name: string, env: Environment): number | null {
  const state = env.get(name);
  if (!state?.collection) return null;
  return state.collection.size.max;
}

function extractIdentifierName(node: SyntaxNode | null): string | null {
  if (!node) return null;
  if (node.type === "identifier" || node.type === "field_identifier") {
    return node.text.trim();
  }

  if (
    node.type === "pointer_expression" ||
    node.type === "reference_expression"
  ) {
    return extractIdentifierName(node.namedChildren[0] || null);
  }

  const text = node.text.trim();
  return /^[a-zA-Z_]\w*$/.test(text) ? text : null;
}

function getStringLiteralLength(node: SyntaxNode | null): number | null {
  if (!node || node.type !== "string_literal") return null;

  const text = node.text;
  if (text.length < 2) return 0;

  // 粗略处理转义：先去掉首尾引号，再将转义字符折叠
  const inner = text.slice(1, -1);
  const normalized = inner.replace(/\\./g, "x");
  return normalized.length;
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
