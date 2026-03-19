/**
 * @file format_string.ts
 * @description 动态分析规则 - 格式化字符串检查器 (Format String Checker)。
 */

import { SyntaxNode } from "../../parser";
import { Environment, InitState } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const FORMAT_FUNCTIONS: Record<string, number> = {
  printf: 0,
  fprintf: 1,
  sprintf: 1,
  snprintf: 2,
  vprintf: 0,
  vfprintf: 1,
  vsprintf: 1,
  vsnprintf: 2,
};

export const FormatStringChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    if (node.type !== "call_expression") return null;

    const functionNode =
      node.childForFieldName("function") || node.namedChildren[0];
    const argsNode =
      node.childForFieldName("arguments") ||
      node.namedChildren.find((c) => c.type === "argument_list");
    if (!functionNode || !argsNode) return null;

    const fnName = functionNode.text.trim();
    const fmtIndex = FORMAT_FUNCTIONS[fnName];
    if (fmtIndex === undefined) return null;

    const args = argsNode.namedChildren;
    if (fmtIndex >= args.length) return null;

    const fmtNode = args[fmtIndex];
    if (fmtNode.type === "string_literal") return null;

    const fmtExpr = fmtNode.text.trim();
    const fmtVarState = extractIdentifierName(fmtNode)
      ? env.get(extractIdentifierName(fmtNode)!)
      : undefined;

    const location = {
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
    };

    const meta = {
      functionName: fnName,
      formatExpr: fmtExpr,
      formatNodeType: fmtNode.type,
    };

    if (fmtVarState?.init === InitState.UNINITIALIZED) {
      return {
        ruleId: "CPP_DYNAMIC_FORMAT_STRING_DEFINITE",
        location,
        meta: {
          ...meta,
          reason: "uninitialized_format_string",
        },
      };
    }

    return {
      ruleId: "CPP_DYNAMIC_FORMAT_STRING_SUSPECTED",
      location,
      meta: {
        ...meta,
        reason:
          fmtVarState?.init === InitState.TAINTED
            ? "tainted_format_string"
            : "non_literal_format_string",
      },
    };
  },
};

function extractIdentifierName(node: SyntaxNode | null): string | null {
  if (!node) return null;
  if (node.type === "identifier" || node.type === "field_identifier") {
    return node.text.trim();
  }

  const text = node.text.trim();
  return /^[a-zA-Z_]\w*$/.test(text) ? text : null;
}
