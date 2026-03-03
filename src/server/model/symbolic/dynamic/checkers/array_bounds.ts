/**
 * @file array_bounds.ts
 * @description 动态分析规则 - 数组边界检查器 (Array Bounds Checker)。
 * 核心诊断原理：
 * 拦截 AST 中的数组下标访问 (subscript_expression)，支持多维数组解包提取。
 * 将推导出的下标区间与数组声明 (含 Heap 动态分配) 的合法边界对比。
 * * 判定模型：
 * 1. 必然越界 (Definite OOB / Must-Issue): 访问区间的最小值大于最大索引，或最大值小于 0。
 * 2. 疑似越界 (Suspected OOB / May-Issue): 访问区间与合法范围有交集，但也覆盖了非法区域。
 * @module Symbolic/Dynamic/Checkers/ArrayBounds
 */

import { SyntaxNode } from "../../parser";
import { Environment, Interval } from "../state";
import { RawIssue } from "../../../../../lib/types/symbolic-types";
import { Checker } from "./index";

/**
 * 数组边界检查器实例
 * 挂载于动态分析引擎中，在语句级别进行运行时越界探测。
 */
export const ArrayBoundsChecker: Checker = {
  
  /**
   * 执行边界诊断逻辑
   * @param node - 当前遍历的 AST 节点
   * @param env - 当前执行流到达该节点时的符号状态环境
   * @returns 若发现越界风险返回 RawIssue，否则返回 null
   */
  check(node: SyntaxNode, env: Environment): RawIssue | null {
    // 1. 类型过滤：仅拦截数组的下标访问节点
    if (node.type !== "subscript_expression") {
      return null;
    }

    // 2. 多维数组 (Multi-dimensional Array) 的降维解包
    let currentArrayNode: SyntaxNode | null = node;
    const indices: SyntaxNode[] = [];

    // 递归向内层剥离 subscript_expression，以寻找到根标识符，同时收集所有维度的索引表达式
    while (currentArrayNode && currentArrayNode.type === "subscript_expression") {
      let idx = currentArrayNode.childForFieldName("index") || currentArrayNode.namedChildren[1];
      
      // 兼容 Tree-sitter 不同版本的语法包装差异 (如 subscript_argument_list)
      if (idx && idx.type === "subscript_argument_list" && idx.namedChildren.length > 0) {
        idx = idx.namedChildren[0];
      }
      
      if (idx) {
        // 头插法，确保收集的索引顺序为 [最高维度, ..., 最低维度]
        indices.unshift(idx); 
      }
      currentArrayNode = currentArrayNode.childForFieldName("argument") || currentArrayNode.namedChildren[0];
    }

    if (!currentArrayNode || indices.length === 0) {
      return null;
    }

    // 提取纯粹的数组变量名
    const arrayName = currentArrayNode.text.trim();

    // 3. 状态查询：向环境账本索要该数组的元数据 (支持静态声明与 new 关键字分配的堆内存)
    const arrayState = env.get(arrayName);
    if (!arrayState || !arrayState.collection) {
      return null;
    }

    // 4. 边界演算：目前优先对第一维度 (最高维) 实施安全校验
    const sizeInterval = arrayState.collection.size;
    const maxValidIndex = sizeInterval.max - 1; 

    // 5. 符号推导：利用引擎内置计算能力，求解当前访问下标的极值边界区间
    const targetIndexNode = indices[0];
    const idxInterval = evaluateIndexExpression(targetIndexNode, env);

    // =========================================================================
    // 缺陷判定逻辑 (Must-Issue vs May-Issue)
    // =========================================================================

    // 判定 1: 必然越界 (Must-Issue) - 访问区间完全脱离合法范围
    const isDefiniteOOB = idxInterval.min > maxValidIndex || idxInterval.max < 0;
    
    // 判定 2: 疑似越界 (May-Issue) - 访问区间包含了合法部分，但也触及了非法区域 (多见于发散的循环)
    const isSuspectedOOB = (idxInterval.max > maxValidIndex || idxInterval.min < 0) && !isDefiniteOOB;

    // 组装用于富文本映射的插值元数据
    const meta = {
      arrayName: arrayName,
      maxValidIndex: maxValidIndex,
      indexInterval: idxInterval.toString(), 
    };

    const location = {
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
    };

    // 6. 抛出相应的缺陷报告
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
 * 局部表达式求值器 (防弹级解析)
 * 能够无视复杂的 AST 节点包装，通过模式匹配和递归下降，还原数学区间。
 * @param node - 需要评估的表达式节点
 * @param env - 当前的符号环境账本
 * @returns 求解出的数值区间 (Interval)
 */
function evaluateIndexExpression(node: SyntaxNode, env: Environment): Interval {
  if (!node) return new Interval(-Infinity, Infinity);
  
  const text = node.text.trim();

  // 1. 字面量处理 (精准匹配正数与负数)
  if (/^-?\d+$/.test(text)) {
    const v = parseInt(text, 10);
    return new Interval(v, v);
  }

  // 2. 剥离冗余括号层级
  if (node.type === "parenthesized_expression") {
     const inner = node.childForFieldName("value") || node.namedChildren[0];
     if (inner) return evaluateIndexExpression(inner, env);
  }

  // 3. 算术运算递归推演 (支持加、减、乘)
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

  // 4. 标识符映射 (向环境账本请求已知变量的区间状态)
  if (/^[a-zA-Z_]\w*$/.test(text)) {
     return env.getInterval(text);
  }

  // 若遇到函数调用等未知复杂节点，采取最保守策略，返回无约束区间
  return new Interval(-Infinity, Infinity);
}