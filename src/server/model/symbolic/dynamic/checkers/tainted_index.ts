/**
 * @file tainted_index.ts
 * @description 动态分析规则 - 污点数组下标检查器 (Tainted Index Checker)。
 *
 * 核心诊断原理：
 * 在数组下标访问处（如 arr[i]），检查下标变量是否被污染（来自用户输入）。
 * 通过影子状态追踪污点传播，判断下标是否来自不可信来源。
 * - 完全污染 [1,1] → 必然污染 (Definite)
 * - 部分污染 [0,1] → 疑似污染 (Suspected)
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const SHADOW_PREFIX = "__taint__";
const SOURCE_FUNCTIONS = new Set([
  "scanf",
  "fscanf",
  "sscanf",
  "gets",
  "fgets",
  "read",
  "recv",
  "getchar",
  "getline",
]);

export const TaintedIndexChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    // 追踪污点状态
    trackTaintForNode(node, env);

    // 只关注数组下标访问
    if (!isArraySubscript(node)) return null;

    const arrayNode = getArrayFromSubscript(node);
    const indexNode = getIndexFromSubscript(node);
    if (!arrayNode || !indexNode) return null;

    const indexName = extractIdentifierName(indexNode);
    const arrayName = extractIdentifierName(arrayNode);

    if (!indexName) return null;

    const indexTaint = getTaintLevel(indexName, env);
    const isDefiniteTaint = indexTaint.min === 1 && indexTaint.max === 1;
    const isSuspectedTaint =
      indexTaint.min <= 0 && indexTaint.max >= 1 && !isDefiniteTaint;

    if (!isDefiniteTaint && !isSuspectedTaint) return null;

    const location = {
      line: indexNode.startPosition.row + 1,
      column: indexNode.startPosition.column,
    };

    return {
      ruleId: isDefiniteTaint
        ? "CPP_DYNAMIC_TAINTED_INDEX_DEFINITE"
        : "CPP_DYNAMIC_TAINTED_INDEX_SUSPECTED",
      location,
      meta: {
        arrayName: arrayName || "unknown",
        indexName,
        taintLevel: indexTaint.toString(),
        source: "user_input_or_network",
      },
    };
  },
};

function trackTaintForNode(node: SyntaxNode, env: Environment): void {
  // 声明初始化轨道
  if (
    node.type === "declaration" ||
    node.type === "local_variable_declaration"
  ) {
    for (const child of node.namedChildren) {
      if (child.type === "identifier") {
        setTaintLevel(child.text.trim(), new Interval(0, 0), env);
      }

      if (child.type === "init_declarator") {
        const declNode =
          child.childForFieldName("declarator") || child.namedChildren[0];
        const valueNode =
          child.childForFieldName("value") || child.namedChildren[1];
        const name = extractIdentifierName(declNode);
        if (!name) continue;

        if (!valueNode) {
          setTaintLevel(name, new Interval(0, 0), env);
          continue;
        }

        let taint = evalRhsTaint(valueNode, env);
        const rhsName = extractIdentifierName(valueNode);
        if (rhsName && taint.min === 1 && taint.max === 1) {
          taint = new Interval(0, 1);
        }
        setTaintLevel(name, taint, env);
      }
    }
    return;
  }

  // 赋值传播
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const lhs = node.childForFieldName("left") || node.namedChildren[0];
    const rhs = node.childForFieldName("right") || node.namedChildren[1];

    const lhsName = extractIdentifierName(lhs);
    if (!lhsName || !rhs) return;

    const hasTrack = !!env.get(taintVar(lhsName));
    const rhsName = extractIdentifierName(rhs);
    const rhsHasTrack = rhsName ? !!env.get(taintVar(rhsName)) : false;
    const rhsIsSource =
      rhs.type === "call_expression" && isSourceFunctionCall(rhs);
    if (!hasTrack && !rhsHasTrack && !rhsIsSource) return;

    let rhsTaint = evalRhsTaint(rhs, env);

    // 直接复制污点时降级为可能污染（更贴合教学场景）
    if (rhsName && rhsTaint.min === 1 && rhsTaint.max === 1) {
      rhsTaint = new Interval(0, 1);
    }

    if (isConditionalContext(node)) {
      setTaintLevel(lhsName, getTaintLevel(lhsName, env).union(rhsTaint), env);
    } else {
      setTaintLevel(lhsName, rhsTaint, env);
    }
    return;
  }

  // 输入源函数参数注入
  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    if (!SOURCE_FUNCTIONS.has(fnName)) return;

    const argsNode =
      node.childForFieldName("arguments") ||
      node.namedChildren.find((c) => c.type === "argument_list");
    if (!argsNode) return;

    const args = argsNode.namedChildren.filter((c) => c.text !== ",");

    if (fnName === "scanf") {
      markArgsTainted(args, 1, env);
      return;
    }
    if (fnName === "fscanf" || fnName === "sscanf") {
      markArgsTainted(args, 2, env);
      return;
    }
    if (fnName === "gets" || fnName === "fgets") {
      markArgsTainted(args, 0, env, 1);
      return;
    }
    if (fnName === "read" || fnName === "recv") {
      markArgsTainted(args, 1, env, 1);
    }
  }
}

function isArraySubscript(node: SyntaxNode): boolean {
  return node.type === "subscript_expression";
}

function getArrayFromSubscript(node: SyntaxNode): SyntaxNode | null {
  // subscript_expression: array [index]
  return (
    node.childForFieldName("argument") ||
    node.childForFieldName("array") ||
    node.namedChildren[0] ||
    null
  );
}

function getIndexFromSubscript(node: SyntaxNode): SyntaxNode | null {
  const indicesNode =
    node.childForFieldName("index") ||
    node.childForFieldName("indices") ||
    node.namedChildren[1] ||
    null;

  if (!indicesNode) return null;

  if (indicesNode.type === "subscript_argument_list") {
    return indicesNode.namedChildren[0] || null;
  }

  return indicesNode;
}

function isSourceFunctionCall(node: SyntaxNode): boolean {
  if (node.type !== "call_expression") return false;
  const fnNode = node.childForFieldName("function") || node.namedChildren[0];
  const fnName = fnNode?.text?.trim() || "";
  return SOURCE_FUNCTIONS.has(fnName);
}

function evalRhsTaint(node: SyntaxNode, env: Environment): Interval {
  if (!node) return new Interval(0, 1);

  if (node.type === "call_expression") {
    return isSourceFunctionCall(node) ? new Interval(1, 1) : new Interval(0, 1);
  }

  const name = extractIdentifierName(node);
  if (name) return getTaintLevel(name, env);

  if (
    node.type === "number_literal" ||
    node.type === "char_literal" ||
    node.type === "string_literal"
  ) {
    return new Interval(0, 0);
  }

  return new Interval(0, 1);
}

function markArgsTainted(
  args: SyntaxNode[],
  startIndex: number,
  env: Environment,
  count: number = Number.MAX_SAFE_INTEGER,
): void {
  const end = Math.min(args.length, startIndex + count);
  for (let i = startIndex; i < end; i++) {
    const name = extractIdentifierName(args[i]);
    if (name) setTaintLevel(name, new Interval(1, 1), env);
  }
}

function taintVar(name: string): string {
  return `${SHADOW_PREFIX}${name}`;
}

function getTaintLevel(varName: string, env: Environment): Interval {
  const shadowName = taintVar(varName);
  const state = env.get(shadowName);
  if (state && state.interval) {
    return state.interval;
  }
  return new Interval(0, 0);
}

function setTaintLevel(
  varName: string,
  level: Interval,
  env: Environment,
): void {
  const shadowName = taintVar(varName);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "tainted_index");
  }
  env.updateInterval(shadowName, level.min, level.max);
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
    node.type === "pointer_expression" ||
    node.type === "reference_expression" ||
    node.type === "unary_expression"
  ) {
    const child =
      node.childForFieldName("argument") ||
      node.childForFieldName("operand") ||
      node.namedChildren[0];
    if (child) return extractIdentifierName(child);
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
    node.type === "expression_statement"
  ) {
    const child = node.namedChildren[0];
    if (child) return extractIdentifierName(child);
  }

  const text = node.text.trim();
  return /^[a-zA-Z_]\w*$/.test(text) ? text : null;

  return null;
}
