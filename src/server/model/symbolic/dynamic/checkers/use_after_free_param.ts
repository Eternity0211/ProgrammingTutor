/**
 * @file use_after_free_param.ts
 * @description 动态分析规则 - 释放后使用参数检查器 (Use-After-Free Parameter Checker)。
 *
 * 核心诊断原理：
 * 检测将已经释放的内存指针作为函数参数传递。
 * - 确认为已释放指针的参数传递 → 必然缺陷 (Definite)
 * - 可能为已释放指针的参数传递 → 疑似缺陷 (Suspected)
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const FREE_STATE_PREFIX = "__uaf_param_status__";

export const UseAfterFreeParamChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    // 追踪对象释放状态
    trackFreeState(node, env);

    // 只关注函数调用表达式
    if (node.type !== "call_expression") return null;

    const argsNode =
      node.childForFieldName("arguments") ||
      node.namedChildren.find((c) => c.type === "argument_list");
    if (!argsNode) return null;

    const functionNode =
      node.childForFieldName("function") || node.namedChildren[0];
    const fnName = functionNode?.text?.trim() || "unknown";

    // 跳过内存操作本身（free, delete等）
    if (shouldSkipFunction(fnName)) return null;

    const args = argsNode.namedChildren.filter(
      (c) => c.type !== "," && c.type !== ";",
    );
    const issues: RawIssue[] = [];

    for (let i = 0; i < args.length; i++) {
      const argName = extractIdentifierName(args[i]);
      if (!argName) continue;

      const freeState = getFreeState(argName, env);

      // 检查是否为已释放指针
      const isDefiniteFreed = freeState.min === 1 && freeState.max === 1;
      const isSuspectedFreed =
        freeState.min <= 0 && freeState.max >= 1 && !isDefiniteFreed;

      if (!isDefiniteFreed && !isSuspectedFreed) continue;

      const location = {
        line: args[i].startPosition.row + 1,
        column: args[i].startPosition.column,
      };

      if (isDefiniteFreed) {
        issues.push({
          ruleId: "CPP_DYNAMIC_USE_AFTER_FREE_PARAM_DEFINITE",
          location,
          meta: {
            functionName: fnName,
            paramName: argName,
            argumentIndex: i,
            freeState: freeState.toString(),
          },
        });
      } else {
        issues.push({
          ruleId: "CPP_DYNAMIC_USE_AFTER_FREE_PARAM_SUSPECTED",
          location,
          meta: {
            functionName: fnName,
            paramName: argName,
            argumentIndex: i,
            freeState: freeState.toString(),
          },
        });
      }
    }

    return issues.length > 0 ? issues : null;
  },
};

/**
 * 追踪对象的释放状态
 * [0,0] = 活跃 (alive)
 * [1,1] = 已释放 (freed)
 * [0,1] = 可能已释放 (maybe freed)
 */
function trackFreeState(node: SyntaxNode, env: Environment): void {
  // 指针声明（无初始化）
  if (node.type === "pointer_declarator") {
    if (node.parent?.type !== "init_declarator") {
      const name = extractIdentifierName(node);
      if (name) {
        setFreeState(name, new Interval(0, 0), env);
      }
    }
    return;
  }

  // 指针声明（有初始化）
  if (node.type === "init_declarator") {
    const declaratorNode =
      node.childForFieldName("declarator") || node.namedChildren[0];
    if (!containsPointerDeclarator(declaratorNode)) return;

    const varName = extractIdentifierName(declaratorNode);
    const valueNode = node.childForFieldName("value") || node.namedChildren[1];
    if (!varName) return;

    if (!valueNode) {
      setFreeState(varName, new Interval(0, 0), env);
      return;
    }

    if (isAllocationExpression(valueNode)) {
      setFreeState(varName, new Interval(0, 0), env);
      return;
    }

    const rhsName = extractIdentifierName(valueNode);
    if (rhsName) {
      setFreeState(varName, getFreeState(rhsName, env), env);
      return;
    }

    setFreeState(varName, new Interval(0, 0), env);
    return;
  }

  // delete p;
  if (node.type === "delete_expression") {
    const arg = node.childForFieldName("argument") || node.namedChildren[0];
    const varName = extractIdentifierName(arg);
    if (varName) {
      const freed = new Interval(1, 1);
      if (isConditionalContext(node)) {
        setFreeState(varName, getFreeState(varName, env).union(freed), env);
      } else {
        setFreeState(varName, freed, env);
      }
    }
    return;
  }

  // 处理 free() 函数调用
  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";

    if (fnName === "free") {
      const argsNode =
        node.childForFieldName("arguments") ||
        node.namedChildren.find((c) => c.type === "argument_list");
      if (argsNode) {
        const args = argsNode.namedChildren.filter((c) => c.text !== ",");
        if (args.length > 0) {
          const varName = extractIdentifierName(args[0]);
          if (varName) {
            const freed = new Interval(1, 1);
            if (isConditionalContext(node)) {
              setFreeState(
                varName,
                getFreeState(varName, env).union(freed),
                env,
              );
            } else {
              setFreeState(varName, freed, env);
            }
          }
        }
      }
    }
    return;
  }

  // 处理赋值：传播释放状态
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const lhs = node.childForFieldName("left") || node.namedChildren[0];
    const rhs = node.childForFieldName("right") || node.namedChildren[1];

    if (!lhs || !rhs || lhs.type !== "identifier") return;

    const lhsName = lhs.text.trim();
    const hasTrack = !!env.get(freeStateVar(lhsName));
    const rhsName = extractIdentifierName(rhs);
    const rhsHasTrack = rhsName ? !!env.get(freeStateVar(rhsName)) : false;

    if (!hasTrack && !rhsHasTrack && !isAllocationExpression(rhs)) {
      return;
    }

    let next = new Interval(0, 0);
    if (isAllocationExpression(rhs)) {
      next = new Interval(0, 0);
    } else if (rhsName) {
      next = getFreeState(rhsName, env);
    }

    if (isConditionalContext(node)) {
      setFreeState(lhsName, getFreeState(lhsName, env).union(next), env);
    } else {
      setFreeState(lhsName, next, env);
    }
  }
}

/**
 * 获取变量的释放状态
 */
function getFreeState(varName: string, env: Environment): Interval {
  const shadowName = freeStateVar(varName);
  const state = env.get(shadowName);
  if (state && state.interval) {
    return state.interval;
  }
  return new Interval(0, 0); // 默认为活跃
}

/**
 * 设置变量的释放状态
 */
function setFreeState(
  varName: string,
  state: Interval,
  env: Environment,
): void {
  const shadowName = freeStateVar(varName);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "free_state");
  }
  env.updateInterval(shadowName, state.min, state.max);
}

function freeStateVar(varName: string): string {
  return `${FREE_STATE_PREFIX}${varName}`;
}

function containsPointerDeclarator(node: SyntaxNode | null): boolean {
  if (!node) return false;
  if (node.type === "pointer_declarator") return true;
  return node.namedChildren.some((child) => containsPointerDeclarator(child));
}

function isAllocationExpression(node: SyntaxNode): boolean {
  if (!node) return false;
  if (node.type === "new_expression") return true;
  if (node.type === "call_expression") {
    const fnNode = node.childForFieldName("function") || node.namedChildren[0];
    const fnName = fnNode?.text?.trim() || "";
    return fnName === "malloc" || fnName === "calloc" || fnName === "realloc";
  }
  if (
    node.type === "cast_expression" ||
    node.type === "parenthesized_expression"
  ) {
    const inner =
      node.childForFieldName("value") ||
      node.childForFieldName("argument") ||
      node.namedChildren[node.namedChildren.length - 1];
    return !!inner && isAllocationExpression(inner);
  }
  return false;
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
  if (node.type === "argument" || node.type === "expression_statement") {
    const child = node.namedChildren[0];
    if (child) return extractIdentifierName(child);
  }
  if (node.type === "parenthesized_expression") {
    const child = node.namedChildren[0];
    if (child) return extractIdentifierName(child);
  }

  if (node.type === "pointer_expression" || node.type === "unary_expression") {
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

function shouldSkipFunction(fnName: string): boolean {
  const skipFuncs = new Set(["free", "delete"]);
  return skipFuncs.has(fnName);
}
