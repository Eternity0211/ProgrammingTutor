/**
 * @file tainted_return.ts
 * @description 动态分析规则 - 污点返回值检查器 (Tainted Return Checker)。
 *
 * 核心诊断原理：
 * 追踪函数的返回值是否来自污点源（如用户输入）。
 * 当返回值被直接使用而不做验证时，标记为疑似危险。
 * - 已知为污点返回值直接使用 → 必然污点 (Definite)
 * - 可能为污点返回值直接使用 → 疑似污点 (Suspected)
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const SHADOW_PREFIX = "__return_taint__";
const FUNCTION_RET_PREFIX = "__return_taint_fn__";
const TAINTED_FUNCTIONS = new Set([
  "getc",
  "getchar",
  "gets",
  "fgets",
  "scanf",
  "fscanf",
  "sscanf",
  "read",
  "recv",
]);

const SOURCE_ARG_FUNCTIONS = new Set([
  "scanf",
  "fscanf",
  "sscanf",
  "gets",
  "fgets",
  "read",
  "recv",
]);

export const TaintedReturnChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    trackReturnTaint(node, env);

    // 检查返回值的直接使用（赋值、函数参数、二元运算等）
    if (node.type === "assignment_expression" || node.type === "assignment") {
      return checkAssignmentUsingTaintedReturn(node, env);
    }

    if (node.type === "call_expression") {
      return checkCallWithTaintedReturn(node, env);
    }

    if (node.type === "binary_expression") {
      return checkBinaryWithTaintedReturn(node, env);
    }

    if (node.type === "subscript_expression") {
      return checkSubscriptWithTaintedReturn(node, env);
    }

    return null;
  },
};

function trackReturnTaint(node: SyntaxNode, env: Environment): void {
  if (node.type === "return_statement") {
    const value = node.namedChildren[0] || null;
    const fnName = getEnclosingFunctionName(node);
    if (!value || !fnName) return;

    const retTaint = evalExprTaint(value, env);
    const current = getFunctionReturnTaint(fnName, env);
    setFunctionReturnTaint(fnName, current.union(retTaint), env);
    return;
  }

  if (
    node.type === "declaration" ||
    node.type === "local_variable_declaration"
  ) {
    for (const child of node.namedChildren) {
      if (child.type === "identifier") {
        setReturnTaint(child.text.trim(), new Interval(0, 0), env);
      }

      if (child.type === "init_declarator") {
        const lhs = child.childForFieldName("declarator") || child.namedChildren[0];
        const rhs = child.childForFieldName("value") || child.namedChildren[1];
        const lhsName = extractIdentifierName(lhs);
        if (!lhsName) continue;

        if (!rhs) {
          setReturnTaint(lhsName, new Interval(0, 0), env);
          continue;
        }

        let taint = evalExprTaint(rhs, env);
        const rhsName = extractIdentifierName(rhs);
        if (rhsName && taint.min === 1 && taint.max === 1) {
          taint = new Interval(0, 1);
        }
        setReturnTaint(lhsName, taint, env);
      }
    }
    return;
  }

  if (node.type === "call_expression") {
    markSourceArgs(node, env);
  }

  // 普通赋值 - 从函数调用获得返回值
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const lhs = node.childForFieldName("left") || node.namedChildren[0];
    const rhs = node.childForFieldName("right") || node.namedChildren[1];

    const lhsName = extractIdentifierName(lhs);
    if (!lhsName || !rhs) return;

    const hasTrack = !!env.get(taintVar(lhsName));
    const rhsName = extractIdentifierName(rhs);
    const rhsHasTrack = rhsName ? !!env.get(taintVar(rhsName)) : false;
    const rhsIsSource = rhs.type === "call_expression" && isTaintedReturnCall(rhs);
    if (!hasTrack && !rhsHasTrack && !rhsIsSource) return;

    let rhsTaint = evalExprTaint(rhs, env);
    if (rhsName && rhsTaint.min === 1 && rhsTaint.max === 1) {
      rhsTaint = new Interval(0, 1);
    }

    if (isConditionalContext(node)) {
      setReturnTaint(lhsName, getReturnTaint(lhsName, env).union(rhsTaint), env);
    } else {
      setReturnTaint(lhsName, rhsTaint, env);
    }
  }
}

function evalExprTaint(node: SyntaxNode, env: Environment): Interval {
  if (!node) return new Interval(0, 1);

  if (
    node.type === "parenthesized_expression" ||
    node.type === "cast_expression"
  ) {
    const inner =
      node.childForFieldName("value") ||
      node.childForFieldName("argument") ||
      node.namedChildren[node.namedChildren.length - 1];
    if (inner) return evalExprTaint(inner, env);
  }

  if (node.type === "call_expression") {
    if (isTaintedReturnCall(node)) return new Interval(1, 1);

    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    return getFunctionReturnTaint(fnName, env);
  }

  if (node.type === "binary_expression") {
    const left = node.childForFieldName("left") || node.namedChildren[0];
    const right = node.childForFieldName("right") || node.namedChildren[1];
    const leftTaint = left ? evalExprTaint(left, env) : new Interval(0, 0);
    const rightTaint = right ? evalExprTaint(right, env) : new Interval(0, 0);
    return leftTaint.union(rightTaint);
  }

  const name = extractIdentifierName(node);
  if (name) return getReturnTaint(name, env);

  if (
    node.type === "number_literal" ||
    node.type === "char_literal" ||
    node.type === "string_literal"
  ) {
    return new Interval(0, 0);
  }

  return new Interval(0, 1);
}

function markSourceArgs(node: SyntaxNode, env: Environment): void {
  const fnNode = node.childForFieldName("function") || node.namedChildren[0];
  const fnName = fnNode?.text?.trim() || "";
  if (!SOURCE_ARG_FUNCTIONS.has(fnName)) return;

  const argsNode =
    node.childForFieldName("arguments") ||
    node.namedChildren.find((c) => c.type === "argument_list");
  if (!argsNode) return;

  const args = argsNode.namedChildren.filter((c) => c.text !== ",");
  if (fnName === "scanf") {
    markArgs(args, 1, env);
    return;
  }
  if (fnName === "fscanf" || fnName === "sscanf") {
    markArgs(args, 2, env);
    return;
  }
  if (fnName === "gets" || fnName === "fgets") {
    markArgs(args, 0, env, 1);
    return;
  }
  if (fnName === "read" || fnName === "recv") {
    markArgs(args, 1, env, 1);
  }
}

function markArgs(
  args: SyntaxNode[],
  startIndex: number,
  env: Environment,
  count: number = Number.MAX_SAFE_INTEGER,
): void {
  const end = Math.min(args.length, startIndex + count);
  for (let i = startIndex; i < end; i++) {
    const name = extractIdentifierName(args[i]);
    if (name) setReturnTaint(name, new Interval(1, 1), env);
  }
}

function isTaintedReturnCall(node: SyntaxNode): boolean {
  const fnNode = node.childForFieldName("function") || node.namedChildren[0];
  const fnName = fnNode?.text?.trim() || "";
  return TAINTED_FUNCTIONS.has(fnName);
}

function checkAssignmentUsingTaintedReturn(
  node: SyntaxNode,
  env: Environment,
): RawIssue | null {
  const rhs = node.childForFieldName("right") || node.namedChildren[1];
  if (!rhs) return null;

  const rhsName = extractIdentifierName(rhs);
  if (!rhsName) return null;

  const taint = getReturnTaint(rhsName, env);
  const isDefiniteTaint = taint.min === 1 && taint.max === 1;
  const isSuspectedTaint =
    taint.min <= 0 && taint.max >= 1 && !isDefiniteTaint;

  if (!isDefiniteTaint && !isSuspectedTaint) return null;

  const location = {
    line: rhs.startPosition.row + 1,
    column: rhs.startPosition.column,
  };

  return {
    ruleId: isDefiniteTaint
      ? "CPP_DYNAMIC_TAINTED_RETURN_DEFINITE"
      : "CPP_DYNAMIC_TAINTED_RETURN_SUSPECTED",
    location,
    meta: {
      variableName: rhsName,
      taintLevel: taint.toString(),
      source: "tainted_function_return",
    },
  };
}

function checkCallWithTaintedReturn(
  node: SyntaxNode,
  env: Environment,
): RawIssue | RawIssue[] | null {
  const functionNode =
    node.childForFieldName("function") || node.namedChildren[0];
  const fnName = functionNode?.text?.trim() || "";
  if (SOURCE_ARG_FUNCTIONS.has(fnName)) return null;

  const argsNode =
    node.childForFieldName("arguments") ||
    node.namedChildren.find((c) => c.type === "argument_list");
  if (!argsNode) return null;

  const args = argsNode.namedChildren.filter((c) => c.text !== ",");
  const issues: RawIssue[] = [];

  for (let i = 0; i < args.length; i++) {
    const argName = extractIdentifierName(args[i]);
    if (!argName) continue;

    const taint = getReturnTaint(argName, env);
    const isDefiniteTaint = taint.min === 1 && taint.max === 1;
    const isSuspectedTaint =
      taint.min <= 0 && taint.max >= 1 && !isDefiniteTaint;

    if (!isDefiniteTaint && !isSuspectedTaint) continue;

    const location = {
      line: args[i].startPosition.row + 1,
      column: args[i].startPosition.column,
    };

    issues.push({
      ruleId: isDefiniteTaint
        ? "CPP_DYNAMIC_TAINTED_RETURN_DEFINITE"
        : "CPP_DYNAMIC_TAINTED_RETURN_SUSPECTED",
      location,
      meta: {
        variableName: argName,
        taintLevel: taint.toString(),
        argumentIndex: i,
        source: "tainted_function_return",
      },
    });
  }

  return issues.length > 0 ? issues : null;
}

function checkBinaryWithTaintedReturn(
  node: SyntaxNode,
  env: Environment,
): RawIssue | RawIssue[] | null {
  if (isValidationBinary(node)) return null;

  const leftNode = node.childForFieldName("left") || node.namedChildren[0];
  const rightNode = node.childForFieldName("right") || node.namedChildren[1];
  if (!leftNode || !rightNode) return null;

  const issues: RawIssue[] = [];

  // 检查左侧操作数
  const leftName = extractIdentifierName(leftNode);
  if (leftName) {
    const leftTaint = getReturnTaint(leftName, env);
    if (leftTaint.max >= 1) {
      issues.push(createTaintedReturnIssue(leftNode, leftName, leftTaint, 0));
    }
  }

  // 检查右侧操作数
  const rightName = extractIdentifierName(rightNode);
  if (rightName) {
    const rightTaint = getReturnTaint(rightName, env);
    if (rightTaint.max >= 1) {
      issues.push(createTaintedReturnIssue(rightNode, rightName, rightTaint, 1));
    }
  }

  return issues.length > 0 ? issues : null;
}

function isValidationBinary(node: SyntaxNode): boolean {
  if (hasAncestor(node, "condition_clause")) return true;

  const op =
    node.childForFieldName("operator")?.text ||
    node.children.find((c) =>
      ["<", ">", "<=", ">=", "==", "!=", "&&", "||"].includes(c.type),
    )?.text ||
    "";

  return ["<", ">", "<=", ">=", "==", "!=", "&&", "||"].includes(op);
}

function hasAncestor(node: SyntaxNode, type: string): boolean {
  let current: SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === type) return true;
    if (current.type === "function_definition") return false;
    current = current.parent;
  }
  return false;
}

function checkSubscriptWithTaintedReturn(
  node: SyntaxNode,
  env: Environment,
): RawIssue | null {
  const indicesNode =
    node.childForFieldName("index") ||
    node.childForFieldName("indices") ||
    node.namedChildren[1] ||
    null;
  const indexNode =
    indicesNode?.type === "subscript_argument_list"
      ? indicesNode.namedChildren[0] || null
      : indicesNode;
  if (!indexNode) return null;

  const indexName = extractIdentifierName(indexNode);
  if (!indexName) return null;

  const taint = getReturnTaint(indexName, env);
  if (taint.max < 1) return null;

  const location = {
    line: indexNode.startPosition.row + 1,
    column: indexNode.startPosition.column,
  };

  return {
    ruleId:
      taint.min === 1 && taint.max === 1
        ? "CPP_DYNAMIC_TAINTED_RETURN_DEFINITE"
        : "CPP_DYNAMIC_TAINTED_RETURN_SUSPECTED",
    location,
    meta: {
      variableName: indexName,
      taintLevel: taint.toString(),
      context: "array_index",
      source: "tainted_function_return",
    },
  };
}

function createTaintedReturnIssue(
  node: SyntaxNode,
  name: string,
  taint: Interval,
  operandIndex: number,
): RawIssue {
  const location = {
    line: node.startPosition.row + 1,
    column: node.startPosition.column,
  };
  return {
    ruleId:
      taint.min === 1 && taint.max === 1
        ? "CPP_DYNAMIC_TAINTED_RETURN_DEFINITE"
        : "CPP_DYNAMIC_TAINTED_RETURN_SUSPECTED",
    location,
    meta: {
      variableName: name,
      taintLevel: taint.toString(),
      operandIndex,
      source: "tainted_function_return",
    },
  };
}

function getReturnTaint(varName: string, env: Environment): Interval {
  const shadowName = taintVar(varName);
  const state = env.get(shadowName);
  if (state && state.interval) {
    return state.interval;
  }
  return new Interval(0, 0);
}

function setReturnTaint(
  varName: string,
  taint: Interval,
  env: Environment,
): void {
  const shadowName = taintVar(varName);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "return_taint");
  }
  env.updateInterval(shadowName, taint.min, taint.max);
}

function taintVar(name: string): string {
  return `${SHADOW_PREFIX}${name}`;
}

function getFunctionReturnTaint(fnName: string, env: Environment): Interval {
  const state = env.get(`${FUNCTION_RET_PREFIX}${fnName}`);
  return state?.interval || new Interval(0, 0);
}

function setFunctionReturnTaint(
  fnName: string,
  taint: Interval,
  env: Environment,
): void {
  const shadowName = `${FUNCTION_RET_PREFIX}${fnName}`;
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "return_taint_fn");
  }
  env.updateInterval(shadowName, taint.min, taint.max);
}

function getEnclosingFunctionName(node: SyntaxNode): string | null {
  let current: SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === "function_definition") {
      const declarator =
        current.childForFieldName("declarator") ||
        current.namedChildren.find((c) => c.type.includes("declarator"));
      return extractIdentifierName(declarator || null);
    }
    current = current.parent;
  }
  return null;
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
    node.type === "reference_expression" ||
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
