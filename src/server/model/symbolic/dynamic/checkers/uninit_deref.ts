/**
 * @file uninit_deref.ts
 * @description 动态分析规则 - 未初始化指针解引用检查器 (Uninitialized Dereference Checker)。
 *
 * 核心诊断原理：
 * 检测对未初始化的指针进行解引用操作（如 *ptr 或 ptr->member）。
 * - 确认为未初始化指针的解引用 → 必然错误 (Definite)
 * - 可能为未初始化指针的解引用 → 疑似错误 (Suspected)
 */

import { SyntaxNode } from "../../parser";
import { Environment, InitState, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const SHADOW_PREFIX = "__uninit_deref_state__";

const PTR_SAFE = 0;
const PTR_NULL = 1;
const PTR_UNINIT = 2;
const PTR_MAYBE = 3;

export const UninitDerefChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    trackPointerState(node, env);

    // 处理指针解引用：*ptr
    if (node.type === "pointer_expression") {
      const arg = node.childForFieldName("argument") || node.namedChildren[0];
      if (arg) {
        return checkUninitDereference(arg, "*", env, node);
      }
    }

    // 处理成员访问：ptr->member
    if (node.type === "field_expression") {
      const op = node.childForFieldName("operator")?.text;
      if (op === "->") {
        const arg = node.childForFieldName("argument") || node.namedChildren[0];
        if (arg) {
          return checkUninitDereference(arg, "->", env, node);
        }
      }
    }

    return null;
  },
};

/**
 * 检查解引用的指针是否未初始化
 */
function checkUninitDereference(
  pointerExpr: SyntaxNode,
  opType: string,
  env: Environment,
  node: SyntaxNode,
): RawIssue | null {
  const ptrName = extractIdentifierName(pointerExpr);
  if (!ptrName) return null;

  if (isGuardedByNonNullCheck(ptrName, node)) {
    return null;
  }

  const ptrState = getPointerState(ptrName, env);
  if (ptrState === PTR_SAFE) return null;

  const location = {
    line: node.startPosition.row + 1,
    column: node.startPosition.column,
  };

  // `*ptr` + 确定未初始化 => Definite
  if (opType === "*" && ptrState === PTR_UNINIT) {
    return {
      ruleId: "CPP_DYNAMIC_UNINIT_DEREF_DEFINITE",
      location,
      meta: {
        pointerName: ptrName,
        operationType: opType,
        initState: stateLabel(ptrState),
        source: "uninitialized_pointer_dereference",
      },
    };
  }

  // 其他风险（NULL/路径不确定/成员访问）按 Suspected
  return {
    ruleId: "CPP_DYNAMIC_UNINIT_DEREF_SUSPECTED",
    location,
    meta: {
      pointerName: ptrName,
      operationType: opType,
      initState: stateLabel(ptrState),
      source: "possibly_uninitialized_pointer_dereference",
    },
  };
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
    node.type === "argument"
  ) {
    const child = node.namedChildren[0];
    if (child) return extractIdentifierName(child);
  }

  const text = node.text.trim();
  return /^[a-zA-Z_]\w*$/.test(text) ? text : null;
}

function trackPointerState(node: SyntaxNode, env: Environment): void {
  if (node.type === "pointer_declarator") {
    if (node.parent?.type !== "init_declarator") {
      const name = extractIdentifierName(node);
      if (name) setPointerState(name, PTR_UNINIT, env);
    }
    return;
  }

  if (node.type === "init_declarator") {
    const declaratorNode =
      node.childForFieldName("declarator") || node.namedChildren[0];
    if (!containsPointerDeclarator(declaratorNode)) return;

    const valueNode = node.childForFieldName("value") || node.namedChildren[1];
    const name = extractIdentifierName(declaratorNode);
    if (!name) return;

    if (!valueNode) {
      setPointerState(name, PTR_UNINIT, env);
      return;
    }

    setPointerState(name, evalPointerState(valueNode, env), env);
    return;
  }

  if (node.type === "assignment_expression" || node.type === "assignment") {
    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    if (!leftNode || !rightNode || leftNode.type !== "identifier") return;

    const leftName = leftNode.text.trim();
    const hasTrack = !!env.get(pointerStateVar(leftName));
    const rhsName = extractIdentifierName(rightNode);
    const rhsHasTrack = rhsName ? !!env.get(pointerStateVar(rhsName)) : false;
    const rhsLooksPointer = looksLikePointerValue(rightNode);

    if (!hasTrack && !rhsHasTrack && !rhsLooksPointer) return;

    const next = evalPointerState(rightNode, env);
    if (isConditionalContext(node)) {
      const merged = mergeState(getPointerState(leftName, env), next);
      setPointerState(leftName, merged, env);
    } else {
      setPointerState(leftName, next, env);
    }
  }
}

function evalPointerState(node: SyntaxNode, env: Environment): number {
  if (!node) return PTR_MAYBE;

  if (isNullLiteral(node)) return PTR_NULL;

  if (node.type === "new_expression") return PTR_SAFE;

  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    if (fnName === "malloc" || fnName === "calloc" || fnName === "realloc") {
      return PTR_SAFE;
    }
    return PTR_MAYBE;
  }

  if (
    node.type === "parenthesized_expression" ||
    node.type === "cast_expression"
  ) {
    const inner =
      node.childForFieldName("value") ||
      node.childForFieldName("argument") ||
      node.namedChildren[node.namedChildren.length - 1];
    if (inner) return evalPointerState(inner, env);
  }

  if (node.type === "unary_expression" && node.text.trim().startsWith("&")) {
    return PTR_SAFE;
  }

  if (
    node.type === "number_literal" ||
    node.type === "char_literal" ||
    node.type === "string_literal"
  ) {
    return PTR_SAFE;
  }

  const name = extractIdentifierName(node);
  if (name) {
    return getPointerState(name, env);
  }

  return PTR_MAYBE;
}

function isNullLiteral(node: SyntaxNode): boolean {
  const text = node.text.trim();
  return text === "nullptr" || text === "NULL" || text === "0";
}

function looksLikePointerValue(node: SyntaxNode): boolean {
  if (!node) return false;
  if (node.type === "new_expression") return true;
  if (node.type === "cast_expression") return true;
  if (isNullLiteral(node)) return true;

  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    return fnName === "malloc" || fnName === "calloc" || fnName === "realloc";
  }

  return false;
}

function mergeState(a: number, b: number): number {
  if (a === b) return a;
  return PTR_MAYBE;
}

function pointerStateVar(name: string): string {
  return `${SHADOW_PREFIX}${name}`;
}

function getPointerState(name: string, env: Environment): number {
  const shadow = env.get(pointerStateVar(name));
  if (shadow?.interval) {
    if (shadow.interval.min !== shadow.interval.max) {
      return PTR_MAYBE;
    }
    return clampState(shadow.interval.min);
  }

  const state = env.get(name);
  if (!state) return PTR_MAYBE;

  if (state.init === InitState.UNINITIALIZED) return PTR_UNINIT;
  if (
    state.init === InitState.NULL_PTR ||
    (state.interval.min === 0 && state.interval.max === 0)
  ) {
    return PTR_NULL;
  }
  if (state.init === InitState.TAINTED) return PTR_MAYBE;
  if (state.interval.containsZero()) return PTR_MAYBE;
  return PTR_SAFE;
}

function clampState(v: number): number {
  if (v <= PTR_SAFE) return PTR_SAFE;
  if (v === PTR_NULL) return PTR_NULL;
  if (v === PTR_UNINIT) return PTR_UNINIT;
  return PTR_MAYBE;
}

function setPointerState(name: string, state: number, env: Environment): void {
  const shadowName = pointerStateVar(name);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "uninit_deref_state");
  }
  env.updateInterval(shadowName, state, state);
}

function containsPointerDeclarator(node: SyntaxNode | null): boolean {
  if (!node) return false;
  if (node.type === "pointer_declarator") return true;
  return node.namedChildren.some((child) => containsPointerDeclarator(child));
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

function isGuardedByNonNullCheck(
  pointerName: string,
  node: SyntaxNode,
): boolean {
  let current: SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === "if_statement" || current.type === "while_statement") {
      const condition =
        current.childForFieldName("condition") || current.namedChildren[0];
      const consequence =
        current.childForFieldName("consequence") ||
        current.namedChildren[1] ||
        null;

      if (
        condition &&
        consequence &&
        isInside(node, consequence) &&
        isPositiveNonNullGuard(condition, pointerName)
      ) {
        return true;
      }
    }

    current = current.parent;
  }

  return false;
}

function isInside(node: SyntaxNode, ancestor: SyntaxNode): boolean {
  let current: SyntaxNode | null = node;
  while (current) {
    if (current.id === ancestor.id) return true;
    current = current.parent;
  }
  return false;
}

function isPositiveNonNullGuard(
  condition: SyntaxNode,
  pointerName: string,
): boolean {
  let text = condition.text.replace(/\s+/g, "");
  if (condition.type === "condition_clause") {
    text = text.replace(/^\(/, "").replace(/\)$/, "");
  }

  const escaped = pointerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (new RegExp(`^${escaped}$`).test(text)) return true;
  if (new RegExp(`^${escaped}!=nullptr$`).test(text)) return true;
  if (new RegExp(`^${escaped}!=NULL$`).test(text)) return true;
  if (new RegExp(`^${escaped}!=0$`).test(text)) return true;
  if (new RegExp(`^nullptr!=${escaped}$`).test(text)) return true;
  if (new RegExp(`^NULL!=${escaped}$`).test(text)) return true;
  if (new RegExp(`^0!=${escaped}$`).test(text)) return true;

  return false;
}

function stateLabel(state: number): string {
  if (state === PTR_SAFE) return "INITIALIZED";
  if (state === PTR_NULL) return "NULL_PTR";
  if (state === PTR_UNINIT) return "UNINITIALIZED";
  return "MAYBE_UNINIT";
}
