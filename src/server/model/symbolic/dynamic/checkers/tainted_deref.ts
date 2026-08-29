/**
 * @file tainted_deref.ts
 * @description 动态分析规则 - 污点指针解引用检查器 (Tainted Dereference Checker)。
 *
 * 核心诊断原理：
 * 检测对来自污染源的指针进行解引用操作（如 *ptr 或 ptr->member）。
 * - 确认为污染指针的解引用 → 必然污点 (Definite)
 * - 可能为污染指针的解引用 → 疑似污点 (Suspected)
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const TAINT_SHADOW_PREFIX = "__taint_ptr__";
const FUNC_TAINT_PREFIX = "__taint_ret__";

const SOURCE_FUNCTIONS = new Set([
  "scanf",
  "fscanf",
  "sscanf",
  "gets",
  "fgets",
  "read",
  "recv",
  "getchar",
  "getc",
]);

export const TaintedDerefChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    // 追踪污染的指针变量
    trackTaintedPointers(node, env);

    // 处理指针解引用：*ptr
    if (node.type === "pointer_expression") {
      const arg = node.childForFieldName("argument") || node.namedChildren[0];
      if (arg) {
        return checkTaintedDereference(arg, "*", env, node);
      }
    }

    // 处理成员访问：ptr->member
    if (node.type === "field_expression") {
      const op = node.childForFieldName("operator")?.text;
      if (op === "->") {
        const arg = node.childForFieldName("argument") || node.namedChildren[0];
        if (arg) {
          return checkTaintedDereference(arg, "->", env, node);
        }
      }
    }

    return null;
  },
};

/**
 * 追踪污染的指针变量
 */
function trackTaintedPointers(node: SyntaxNode, env: Environment): void {
  // 跟踪 return 污点，用于函数返回传播
  if (node.type === "return_statement") {
    const value = node.namedChildren[0] || null;
    const fnName = getEnclosingFunctionName(node);
    if (!value || !fnName) return;

    const retTaint = evalTaint(value, env);
    const current = getFunctionReturnTaint(fnName, env);
    setFunctionReturnTaint(fnName, current.union(retTaint), env);
    return;
  }

  // 输入源调用，直接污染对应输出参数
  if (node.type === "call_expression") {
    markTaintFromSourceCall(node, env);
  }

  // 处理带初始化的声明
  if (node.type === "init_declarator") {
    const declaratorNode =
      node.childForFieldName("declarator") || node.namedChildren[0];
    const valueNode = node.childForFieldName("value") || node.namedChildren[1];

    const varName = extractIdentifierName(declaratorNode);
    if (!varName || !valueNode) return;

    setTaint(varName, evalTaint(valueNode, env), env);
    return;
  }

  // 处理赋值语句
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const lhs = node.childForFieldName("left") || node.namedChildren[0];
    const rhs = node.childForFieldName("right") || node.namedChildren[1];

    const varName = extractIdentifierName(lhs);
    if (!varName || !rhs) return;

    const hasTrack = !!env.get(taintVarName(varName));
    const rhsName = extractIdentifierName(rhs);
    const rhsHasTrack = rhsName ? !!env.get(taintVarName(rhsName)) : false;
    const rhsIsSource = rhs.type === "call_expression" && isSourceCall(rhs);

    if (!hasTrack && !rhsHasTrack && !rhsIsSource) {
      return;
    }

    const rhsTaint = evalTaint(rhs, env);
    if (isConditionalContext(node)) {
      setTaint(varName, getTaint(varName, env).union(rhsTaint), env);
    } else {
      setTaint(varName, rhsTaint, env);
    }
  }
}

/**
 * 检查解引用的指针是否被污染
 */
function checkTaintedDereference(
  pointerExpr: SyntaxNode,
  opType: string,
  env: Environment,
  node: SyntaxNode,
): RawIssue | null {
  const ptrName = extractIdentifierName(pointerExpr);
  if (!ptrName) return null;

  const taint = getTaint(ptrName, env);
  if (taint.max < 1) return null;

  const location = {
    line: node.startPosition.row + 1,
    column: node.startPosition.column,
  };

  return {
    ruleId: "CPP_DYNAMIC_TAINTED_DEREF_SUSPECTED",
    location,
    meta: {
      pointerName: ptrName,
      operationType: opType,
      taintState: taint.toString(),
      source: "tainted_pointer_dereference",
    },
  };
}

/**
 * 检查是否为污染源：如 scanf、gets等污点函数返回值
 */
function isTaintedSource(node: SyntaxNode): boolean {
  if (!node) return false;

  // 检查是否为污点函数调用
  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    const taintedFunctions = new Set([
      "scanf",
      "fscanf",
      "sscanf",
      "gets",
      "fgets",
      "read",
      "recv",
      "getchar",
      "getc",
    ]);
    return taintedFunctions.has(fnName);
  }

  return false;
}

function evalTaint(node: SyntaxNode, env: Environment): Interval {
  if (!node) return new Interval(0, 1);

  if (
    node.type === "parenthesized_expression" ||
    node.type === "cast_expression"
  ) {
    const inner =
      node.childForFieldName("value") ||
      node.childForFieldName("argument") ||
      node.namedChildren[node.namedChildren.length - 1];
    if (inner) return evalTaint(inner, env);
  }

  if (node.type === "call_expression") {
    if (isSourceCall(node)) return new Interval(1, 1);

    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    return getFunctionReturnTaint(fnName, env);
  }

  const name = extractIdentifierName(node);
  if (name) return getTaint(name, env);

  if (
    node.type === "number_literal" ||
    node.type === "char_literal" ||
    node.type === "string_literal"
  ) {
    return new Interval(0, 0);
  }

  return new Interval(0, 1);
}

function markTaintFromSourceCall(node: SyntaxNode, env: Environment): void {
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

function markArgsTainted(
  args: SyntaxNode[],
  startIndex: number,
  env: Environment,
  count: number = Number.MAX_SAFE_INTEGER,
): void {
  const end = Math.min(args.length, startIndex + count);
  for (let i = startIndex; i < end; i++) {
    const name = extractIdentifierName(args[i]);
    if (name) setTaint(name, new Interval(1, 1), env);
  }
}

function isSourceCall(callNode: SyntaxNode): boolean {
  const fnNode =
    callNode.childForFieldName("function") || callNode.namedChildren[0];
  const fnName = fnNode?.text?.trim() || "";
  return SOURCE_FUNCTIONS.has(fnName);
}

/**
 * 标记指针为被污染
 */
function markAsTaintedPtr(varName: string, env: Environment): void {
  setTaint(varName, new Interval(1, 1), env);
}

/**
 * 检查指针是否已被标记为污染
 */
function isTaintedPtr(varName: string, env: Environment): boolean {
  return getTaint(varName, env).max >= 1;
}

function taintVarName(name: string): string {
  return `${TAINT_SHADOW_PREFIX}${name}`;
}

function getTaint(name: string, env: Environment): Interval {
  const state = env.get(taintVarName(name));
  return state?.interval || new Interval(0, 0);
}

function setTaint(name: string, taint: Interval, env: Environment): void {
  const shadowName = taintVarName(name);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "tainted_ptr_marker");
  }
  env.updateInterval(shadowName, taint.min, taint.max);
}

function functionTaintVar(fnName: string): string {
  return `${FUNC_TAINT_PREFIX}${fnName}`;
}

function getFunctionReturnTaint(fnName: string, env: Environment): Interval {
  const state = env.get(functionTaintVar(fnName));
  return state?.interval || new Interval(0, 1);
}

function setFunctionReturnTaint(
  fnName: string,
  taint: Interval,
  env: Environment,
): void {
  const shadowName = functionTaintVar(fnName);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "tainted_return_marker");
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
    node.type === "pointer_expression" ||
    node.type === "reference_expression" ||
    node.type === "argument" ||
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
