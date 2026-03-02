/**
 * @file array_bounds.ts
 * @description 动态分析规则 - 数组边界检查器 (Array Bounds Checker)。
 * 核心诊断原理：
 * 拦截 AST 中的数组下标访问 (subscript_expression)，将推导出的下标区间与数组声明的合法边界对比。
 * * 判定模型：
 * 1. 必然越界 (Definite OOB): 访问区间的最小值大于最大索引，或最大值小于 0。
 * 2. 疑似越界 (Suspected OOB): 访问区间与合法范围有交集，但也覆盖了非法区域 (多见于循环发散)。
 * @module Symbolic/Dynamic/Checkers/ArrayBounds
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

export const ArrayBoundsChecker: Checker = {
  
  /**
   * 执行数组边界检查
   */
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    // 1. 类型过滤：仅处理下标访问节点
    if (node.type !== "subscript_expression") {
      return null;
    }

    // 2. 提取数组对象与索引表达式
    const arrayNode = node.childForFieldName("argument") || node.namedChildren[0];
    let indexNode = node.childForFieldName("index") || node.namedChildren[1];

    if (!arrayNode || !indexNode) {
      return null;
    }

    const arrayName = arrayNode.text.trim();

    // 处理某些 Tree-sitter 版本中下标带有的包装层级 (如 subscript_argument_list)
    if (indexNode.type === "subscript_argument_list" && indexNode.namedChildren.length > 0) {
      indexNode = indexNode.namedChildren[0];
    }

    // 3. 状态查询：获取数组元数据 (Size)
    const arrayState = env.get(arrayName);
    if (!arrayState || !arrayState.collection) {
      return null;
    }

    // 4. 边界演算：合法索引范围为 [0, Size - 1]
    const sizeInterval = arrayState.collection.size;
    const maxValidIndex = sizeInterval.max - 1; 

    // 5. 符号推导：计算下标的可能取值区间
    let idxInterval = evaluateIndexExpression(indexNode, env);

    // [精度补强]：通过溯源祖先节点的条件约束 (if/while/for) 来二次裁剪区间。
    // 这能有效解决由于加宽算子 (Widening) 导致的 i=[0, ∞] 误报问题。
    idxInterval = refineIntervalWithAncestorConditions(idxInterval, indexNode, env);

    // =========================================================================
    // 缺陷判定逻辑 (Must-Issue vs May-Issue)
    // =========================================================================

    // 判定 1: 必然越界 (Must) - 区间完全落在合法范围外
    const isDefiniteOOB = idxInterval.min > maxValidIndex || idxInterval.max < 0;

    // 判定 2: 疑似越界 (May) - 区间部分落在合法范围外
    const isSuspectedOOB = (idxInterval.max > maxValidIndex || idxInterval.min < 0) && !isDefiniteOOB;

    // 组装用于模板插值的元数据
    const meta = {
      arrayName: arrayName,
      maxValidIndex: maxValidIndex,
      indexInterval: idxInterval.toString(), 
    };

    const location = {
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
    };

    // 6. 返回匹配的原始缺陷报告
    if (isDefiniteOOB) {
      return { ruleId: "CPP_DYNAMIC_ARRAY_OOB_DEFINITE", location, meta };
    } else if (isSuspectedOOB) {
      return { ruleId: "CPP_DYNAMIC_ARRAY_OOB_SUSPECTED", location, meta };
    }

    return null;
  }
};

// =============================================================================
// Helper Utilities | 符号推演辅助工具
// =============================================================================

/**
 * 局部表达式求值器：将 AST 节点递归还原为数学区间。
 * 能够处理常数、变量以及二元算术运算 (如 arr[i + 1])。
 */
function evaluateIndexExpression(node: SyntaxNode, env: Environment): Interval {
  if (!node) return new Interval(-Infinity, Infinity);
  
  const text = node.text.trim();

  // 1. 字面量处理 (支持负数正则)
  if (/^-?\d+$/.test(text)) {
    const v = parseInt(text, 10);
    return new Interval(v, v);
  }

  // 2. 剥离冗余括号
  if (node.type === "parenthesized_expression") {
     const inner = node.childForFieldName("value") || node.namedChildren[0];
     if (inner) return evaluateIndexExpression(inner, env);
  }

  // 3. 算术运算递归推导
  if (node.type === "binary_expression" || node.children.some(c => ["+", "-", "*", "/"].includes(c.type))) {
    const leftNode = node.childForFieldName("left") || node.namedChildren[0];
    const rightNode = node.childForFieldName("right") || node.namedChildren[1];
    const op = node.childForFieldName("operator")?.text || node.children.find(c => !c.isNamed)?.text;
    
    if (leftNode && rightNode) {
      const left = evaluateIndexExpression(leftNode, env);
      const right = evaluateIndexExpression(rightNode, env);
      if (op === "+") return left.add(right);
      if (op === "-") return left.sub(right);
      if (op === "*") return left.mul(right);
    }
  }

  // 4. 标识符查询 (直接向环境账本索要区间)
  if (/^[a-zA-Z_]\w*$/.test(text)) {
     return env.getInterval(text);
  }

  // 兜底：无法识别的复杂节点返回全集 [负无穷, 正无穷]
  return new Interval(-Infinity, Infinity);
}

/**
 * 约束收敛器：根据当前节点的上下文（祖先控制流节点）收敛变量区间。
 * 在动态分析中，Widening 会让循环变量变成 [0, ∞]，
 * 通过检查 while(i < 5) 这样的祖先节点，我们可以将区间强制修正为合法的约束范围。
 */
function refineIntervalWithAncestorConditions(
  interval: Interval,
  node: SyntaxNode,
  env: Environment
): Interval {
  let refined = interval;
  let cur: SyntaxNode | null = node;
  const varName = node.text.trim();

  // 向上溯源祖先节点
  while (cur) {
    if (
      (cur.type === "while_statement" || cur.type === "if_statement" || cur.type === "for_statement")
    ) {
      // 提取控制流的条件表达式
      const cond = cur.childForFieldName("condition") || cur.namedChildren.find(c => c.type === "binary_expression");
      if (cond) {
        const bin = cond.type === "binary_expression" ? cond : findBinaryIn(cond);
        if (bin) {
          const left = bin.childForFieldName("left") || bin.namedChildren[0];
          const right = bin.childForFieldName("right") || bin.namedChildren[1];
          const op =
            bin.childForFieldName("operator")?.text ||
            bin.children.find(c => ["<", ">", "<=", ">=", "==", "!="].includes(c.type))?.text;

          if (op && left && right) {
            let constraint: Interval | null = null;
            let literalNode: SyntaxNode | null = null;
            let varOnLeft = false;

            // 识别形如 i < 10 或 10 > i 的模式
            if (left.text.trim() === varName && /^-?\d+$/.test(right.text.trim())) {
              varOnLeft = true;
              literalNode = right;
            } else if (right.text.trim() === varName && /^-?\d+$/.test(left.text.trim())) {
              varOnLeft = false;
              literalNode = left;
            }

            if (literalNode) {
              const val = parseInt(literalNode.text, 10);
              // 执行数学约束裁剪
              if (op === "<")
                constraint = varOnLeft ? new Interval(-Infinity, val - 1) : new Interval(val + 1, Infinity);
              else if (op === "<=")
                constraint = varOnLeft ? new Interval(-Infinity, val) : new Interval(val, Infinity);
              else if (op === ">")
                constraint = varOnLeft ? new Interval(val + 1, Infinity) : new Interval(-Infinity, val);
              else if (op === ">=")
                constraint = varOnLeft ? new Interval(val, Infinity) : new Interval(-Infinity, val - 1);
              else if (op === "==") constraint = new Interval(val, val);
            }

            if (constraint) {
              refined = refined.intersect(constraint);
            }
          }
        }
      }
    }
    cur = cur.parent;
  }
  return refined;
}

/** 递归搜寻节点内的首个二元表达式 */
function findBinaryIn(node: SyntaxNode): SyntaxNode | null {
  if (node.type === "binary_expression") return node;
  for (const c of node.namedChildren) {
    const f = findBinaryIn(c);
    if (f) return f;
  }
  return null;
}