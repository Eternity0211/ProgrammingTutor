/**
 * @file param_taint.ts
 * @description 动态分析规则 - 传参污点检查器 (Parameter Taint Checker)。
 *
 * 约束：不改引擎，通过 checker 内影子状态追踪变量污点。
 * 影子区间：
 * - [0,0] clean
 * - [1,1] tainted
 * - [0,1] maybe tainted
 */

import { SyntaxNode } from "../../parser";
import { Environment, InitState, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

const SHADOW_PREFIX = "__param_taint__";

const SOURCE_FUNCTIONS = new Set(["scanf", "fscanf", "sscanf", "gets", "fgets", "read", "recv"]);

export const ParamTaintChecker: Checker = {
  check(node: SyntaxNode, env: Environment): RawIssue | RawIssue[] | null {
    trackTaintState(node, env);

    if (node.type !== "call_expression") return null;

    const functionNode = node.childForFieldName("function") || node.namedChildren[0];
    const argsNode = node.childForFieldName("arguments") || node.namedChildren.find((c) => c.type === "argument_list");
    if (!functionNode || !argsNode) return null;

    const fnName = functionNode.text.trim();
    if (SOURCE_FUNCTIONS.has(fnName)) {
      return null;
    }

    const issues: RawIssue[] = [];
    const args = argsNode.namedChildren;

    for (let i = 0; i < args.length; i++) {
      const argName = extractIdentifierName(args[i]);
      if (!argName) continue;

      const taint = getTaint(argName, env);
      const containsTaint = taint.max >= 1;
      const isDefiniteTaint = taint.min === 1 && taint.max === 1;

      const varState = env.get(argName);
      const isUninitialized = varState?.init === InitState.UNINITIALIZED;

      if (!containsTaint && !isUninitialized) continue;

      const location = {
        line: args[i].startPosition.row + 1,
        column: args[i].startPosition.column,
      };

      issues.push({
        ruleId: isDefiniteTaint
          ? "CPP_DYNAMIC_PARAM_TAINT_DEFINITE"
          : "CPP_DYNAMIC_PARAM_TAINT_SUSPECTED",
        location,
        meta: {
          functionName: fnName,
          paramName: argName,
          argumentIndex: i,
          taintState: taint.toString(),
          source: isUninitialized ? "uninitialized" : "taint_flow",
        },
      });
    }

    return issues.length > 0 ? issues : null;
  },
};

function trackTaintState(node: SyntaxNode, env: Environment): void {
  // 变量声明：初始化清洁状态，保证分支合并可形成 [0,1]
  if (node.type === "declaration" || node.type === "local_variable_declaration") {
    for (const child of node.namedChildren) {
      if (child.type === "identifier") {
        setTaint(child.text.trim(), new Interval(0, 0), env);
      }
      if (child.type === "init_declarator") {
        const declNode = child.childForFieldName("declarator") || child.namedChildren[0];
        const name = extractIdentifierName(declNode);
        if (!name) continue;

        const valueNode = child.childForFieldName("value") || child.namedChildren[1];
        if (!valueNode) {
          setTaint(name, new Interval(0, 0), env);
          continue;
        }

        setTaint(name, evalRhsTaint(valueNode, env), env);
      }
    }
    return;
  }

  // 普通赋值 taint 传播
  if (node.type === "assignment_expression" || node.type === "assignment") {
    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    const leftName = extractIdentifierName(leftNode);
    if (!leftName || !rightNode) return;

    // 仅在已有 taint 轨道或 RHS 明显涉及输入源时更新
    const hasTrack = !!env.get(taintVarName(leftName));
    const rhsName = extractIdentifierName(rightNode);
    const rhsHasTrack = rhsName ? !!env.get(taintVarName(rhsName)) : false;
    const rhsIsSourceCall = rightNode.type === "call_expression" && isSourceCall(rightNode);

    if (!hasTrack && !rhsHasTrack && !rhsIsSourceCall) return;

    setTaint(leftName, evalRhsTaint(rightNode, env), env);
    return;
  }

  // 输入源函数调用 taint 注入
  if (node.type === "call_expression") {
    const functionNode = node.childForFieldName("function") || node.namedChildren[0];
    const argsNode = node.childForFieldName("arguments") || node.namedChildren.find((c) => c.type === "argument_list");
    if (!functionNode || !argsNode) return;

    const fnName = functionNode.text.trim();
    if (!SOURCE_FUNCTIONS.has(fnName)) return;

    const args = argsNode.namedChildren;

    if (fnName === "scanf") {
      markFromArgs(args, 1, env);
      return;
    }

    if (fnName === "fscanf" || fnName === "sscanf") {
      markFromArgs(args, 2, env);
      return;
    }

    if (fnName === "gets" || fnName === "fgets") {
      markFromArgs(args, 0, env, 1);
      return;
    }

    if (fnName === "read" || fnName === "recv") {
      markFromArgs(args, 1, env, 1);
    }
  }
}

function markFromArgs(args: SyntaxNode[], startIndex: number, env: Environment, count: number = Number.MAX_SAFE_INTEGER): void {
  const end = Math.min(args.length, startIndex + count);
  for (let i = startIndex; i < end; i++) {
    const name = extractIdentifierName(args[i]);
    if (name) setTaint(name, new Interval(1, 1), env);
  }
}

function evalRhsTaint(rhs: SyntaxNode, env: Environment): Interval {
  if (rhs.type === "call_expression") {
    return isSourceCall(rhs) ? new Interval(1, 1) : new Interval(0, 1);
  }

  const rhsName = extractIdentifierName(rhs);
  if (rhsName) {
    return getTaint(rhsName, env);
  }

  if (rhs.type === "number_literal" || rhs.type === "char_literal" || rhs.type === "string_literal") {
    return new Interval(0, 0);
  }

  return new Interval(0, 1);
}

function isSourceCall(callNode: SyntaxNode): boolean {
  const functionNode = callNode.childForFieldName("function") || callNode.namedChildren[0];
  const fnName = functionNode?.text.trim() || "";
  return SOURCE_FUNCTIONS.has(fnName);
}

function taintVarName(name: string): string {
  return `${SHADOW_PREFIX}${name}`;
}

function getTaint(name: string, env: Environment): Interval {
  const state = env.get(taintVarName(name));
  return state?.interval || new Interval(0, 1);
}

function setTaint(name: string, taint: Interval, env: Environment): void {
  const shadowName = taintVarName(name);
  if (!env.get(shadowName)) {
    env.declareVar(shadowName, "param_taint");
  }
  env.updateInterval(shadowName, taint.min, taint.max);
}

function extractIdentifierName(node: SyntaxNode | null): string | null {
  if (!node) return null;
  if (node.type === "identifier" || node.type === "field_identifier") {
    return node.text.trim();
  }

  if (node.type === "pointer_expression" || node.type === "reference_expression") {
    const arg = node.childForFieldName("argument") || node.namedChildren[0];
    return extractIdentifierName(arg);
  }

  if (node.type === "parenthesized_expression") {
    return extractIdentifierName(node.namedChildren[0] || null);
  }

  const text = node.text.trim();
  return /^[a-zA-Z_]\w*$/.test(text) ? text : null;
}
