/**
 * @file engine.ts
 * @description 动态分析引擎核心 - 符号执行与数据流分析求解器 (DFA Solver)。
 * 核心架构特性：
 * 1. 深度优先遍历 (DFS)：无视 AST 包装层级差异，全量提取关键语句执行分析。
 * 2. 降级容错机制 (Auto-Declare)：防止因语法树异常导致变量丢失，确保执行流稳定。
 * 3. 智能分支约束收敛 (Branch Refinement)：支持双向运算符剪枝，提升区间推导的绝对精度。
 * 4. 复杂类型提取：原生支持多维数组、动态内存 (Heap) 指针的内存界限追踪。
 * 5. 插件化架构：统一调度 checkers 目录下注册的所有缺陷诊断规则。
 * @module Symbolic/Dynamic/Engine
 */

import { CFG, CFGNode } from "./cfg";
import { Environment, Interval, InitState } from "./state";
import { SyntaxNode } from "../parser";
import { RawIssue } from "../../../../lib/types/symbolic-types";

// 引入统一规则注册中心
import { ALL_CHECKERS } from "./checkers";

/**
 * 动态数据流分析引擎 (DFA Solver)
 * 负责在控制流图 (CFG) 上进行固定点迭代计算。
 */
export class AnalysisEngine {
  private issues: RawIssue[] = [];
  /** 块级入口状态快照映射表，用于判定分析是否达到不动点 */
  private blockInStates: Map<string, Environment> = new Map();
  /** 记录各个代码块的访问频次，作为触发 Widening (加宽算子) 的依据 */
  private visitCounts: Map<string, number> = new Map();
  /** 触发区间加宽的固定迭代阈值 */
  private readonly WIDENING_THRESHOLD = 2;

  constructor(private cfg: CFG) {}

  /**
   * 启动数据流分析分析流
   * @returns 引擎及下属 Checker 检测到的原始缺陷列表
   */
  public run(): RawIssue[] {
    const worklist: CFGNode[] = [this.cfg.entry];
    this.blockInStates.set(this.cfg.entry.id, new Environment());

    while (worklist.length > 0) {
      const currentBlock = worklist.shift()!;
      const inEnv = this.blockInStates.get(currentBlock.id)!;
      
      const count = (this.visitCounts.get(currentBlock.id) || 0) + 1;
      this.visitCounts.set(currentBlock.id, count);

      // 执行块内的状态转换逻辑 (Transfer Function)
      const outEnv = this.transferBlock(currentBlock, inEnv.clone());

      // 遍历所有后继节点进行状态传递与合并
      for (let i = 0; i < currentBlock.successors.length; i++) {
        const successor = currentBlock.successors[i];
        let branchEnv = outEnv.clone();

        // 针对条件控制块，按真假路径对环境进行物理约束裁剪 (约定 index 0 为 True 分支)
        if (currentBlock.successors.length > 1 && currentBlock.id.includes("cond") && currentBlock.statements.length > 0) {
          const condition = currentBlock.statements[currentBlock.statements.length - 1];
          branchEnv = this.refineBranchState(condition, branchEnv, i === 0);
        }

        const existingIn = this.blockInStates.get(successor.id);
        if (!existingIn) {
          this.blockInStates.set(successor.id, branchEnv);
          worklist.push(successor);
        } else {
          // 对多条汇聚的执行路径进行保守的状态合并 (Lattice Join)
          const merged = existingIn.clone().merge(branchEnv);
          
          // 【核心防御】：循环控制流的强制收敛机制 (Widening Operator)
          // 仅在循环头部 (cond块) 触发，避免污染分支内有效的物理约束
          if (count > this.WIDENING_THRESHOLD && successor.id.includes("cond")) {
            const store = (merged as any).store;
            for (const varName of store.keys()) {
              const oldIntv = existingIn.getInterval(varName);
              const newIntv = merged.getInterval(varName);
              // 若边界呈现单调扩张趋势，则直接推向无穷
              merged.updateInterval(varName, 
                newIntv.min < oldIntv.min ? -Infinity : oldIntv.min,
                newIntv.max > oldIntv.max ? Infinity : oldIntv.max
              );
            }
          }

          // 不动点判定：如果合并后的状态较原先有变化，说明还需继续迭代，重新推入队列
          if (!merged.equals(existingIn)) {
            this.blockInStates.set(successor.id, merged);
            if (!worklist.includes(successor)) worklist.push(successor);
          }
        }
      }
    }
    return this.issues;
  }

  // =========================================================================
  // AST Navigation Utilities | 抽象语法树导航辅助工具
  // =========================================================================

  /**
   * 在当前节点及子节点中搜索指定类型的首个节点
   */
  private findNode(root: SyntaxNode, types: string[]): SyntaxNode | null {
    if (types.includes(root.type)) return root;
    for (const child of root.namedChildren) {
      const found = this.findNode(child, types);
      if (found) return found;
    }
    return null;
  }

  /**
   * 递归提取当前树结构下所有匹配类型的节点
   */
  private findAllNodes(root: SyntaxNode, types: string[]): SyntaxNode[] {
    let results: SyntaxNode[] = [];
    if (types.includes(root.type)) results.push(root);
    for (const child of root.namedChildren) {
      results.push(...this.findAllNodes(child, types));
    }
    return results;
  }

  /**
   * 递归剥离指针、引用或数组的声明外壳，提炼出最纯粹的变量标识符名。
   * @description 解决 C++ 中 `*ptr`、`&ref` 或 `matrix[10]` 造成的账本名称污染。
   */
  private extractIdentifierName(node: SyntaxNode | null): string | null {
    if (!node) return null;
    if (node.type === "identifier" || node.type === "field_identifier") return node.text;
    
    if (node.type === "pointer_declarator" || node.type === "reference_declarator" || node.type === "array_declarator") {
      const inner = node.childForFieldName("declarator") || node.namedChildren[0];
      return this.extractIdentifierName(inner);
    }
    // 终极兜底方案：强行用正则抹除符号特征
    return node.text.replace(/[\*&\[\]0-9]/g, '').trim();
  }

  /**
   * 解析多维数组声明，精准提取出变量名与最高维度的大小。
   */
  private extractArrayDeclaration(node: SyntaxNode): { name: string, sizeNode: SyntaxNode | null } | null {
    let current: SyntaxNode | null = node;
    let sizeNode: SyntaxNode | null = null;

    // 向内层不断剥离 array_declarator，直到抵达核心标识符
    while (current && current.type === "array_declarator") {
      // 显式声明类型为 SyntaxNode | null，切断 TypeScript 的循环推导判定
      const decl: SyntaxNode | null = current.childForFieldName("declarator") || current.namedChildren[0];
      const sz: SyntaxNode | null = current.childForFieldName("size") || current.namedChildren[1];
      
      // 在 C/C++ 的 AST 模型中，最内层的 array_declarator 通常对应数组的最高维度
      if (sz) sizeNode = sz; 
      current = decl;
    }

    if (current && current.type === "identifier") {
      return { name: current.text, sizeNode };
    }
    return null;
  }

  /**
   * 提取动态内存分配 (Heap Allocation) 的请求大小。
   * @description 支持识别 `new int[n]` 等格式，并通过内部解析出数组尺寸区间。
   */
  private extractDynamicArraySize(valNode: SyntaxNode, env: Environment): Interval | null {
    if (valNode.type === "new_expression") {
      const newDeclarator = this.findNode(valNode, ["new_declarator"]);
      if (newDeclarator) {
        // 兼容不同版本的 tree-sitter-cpp 解析器 (字段法或类型遍历法)
        const lengthNode = newDeclarator.childForFieldName("length") || 
                           newDeclarator.children.find(c => c.isNamed && c.type !== "type_identifier" && c.type !== "primitive_type");
        if (lengthNode) {
          return this.evaluateExpression(lengthNode, env);
        }
      }
    }
    return null;
  }

  // =========================================================================
  // Core Execution Logic | 核心状态推导与执行流逻辑
  // =========================================================================

  /**
   * 基于控制流条件表达式，对环境中的变量区间实施反向裁剪。
   * @description 通过智能化推演 (例如自动适应 `i < 10` 与 `10 > i`)，实现 Must-Analysis 的绝对精度。
   */
  private refineBranchState(cond: SyntaxNode, env: Environment, isTrueBranch: boolean): Environment {
    const binExpr = this.findNode(cond, ["binary_expression"]);
    if (!binExpr) return env;

    const left = binExpr.childForFieldName("left") || binExpr.namedChildren[0];
    const right = binExpr.childForFieldName("right") || binExpr.namedChildren[1];
    const op = binExpr.childForFieldName("operator")?.text || binExpr.children.find(c => ["<", ">", "<=", ">=", "==", "!="].includes(c.type))?.text;

    if (left && right) {
      let varName = "";
      let rightInterval: Interval;
      let isVarOnLeft = true;

      // 智能识别参与比较的变量位于左侧还是右侧
      if (left.type === "identifier") {
        varName = left.text;
        rightInterval = this.evaluateExpression(right, env);
        isVarOnLeft = true;
      } else if (right.type === "identifier") {
        varName = right.text;
        rightInterval = this.evaluateExpression(left, env);
        isVarOnLeft = false;
      } else {
        return env;
      }

      if (!env.get(varName)) env.declareVar(varName, "auto");
      
      const current = env.getInterval(varName);
      let constraint: Interval;
      const valMax = rightInterval.max;
      const valMin = rightInterval.min;

      let actualOp = op;
      if (!isVarOnLeft) {
        // 若变量位于右侧 (如 5 >= i)，则反转操作符以复用基准裁剪逻辑
        if (op === "<") actualOp = ">";
        else if (op === "<=") actualOp = ">=";
        else if (op === ">") actualOp = "<";
        else if (op === ">=") actualOp = "<=";
      }

      // 根据操作符及真假分支实施区间交集裁剪
      if (actualOp === "<") constraint = isTrueBranch ? new Interval(-Infinity, valMax - 1) : new Interval(valMin, Infinity);
      else if (actualOp === "<=") constraint = isTrueBranch ? new Interval(-Infinity, valMax) : new Interval(valMin + 1, Infinity);
      else if (actualOp === ">") constraint = isTrueBranch ? new Interval(valMin + 1, Infinity) : new Interval(-Infinity, valMax);
      else if (actualOp === ">=") constraint = isTrueBranch ? new Interval(valMin, Infinity) : new Interval(-Infinity, valMax - 1);
      else if (actualOp === "==") constraint = isTrueBranch ? new Interval(rightInterval.min, rightInterval.max) : new Interval(-Infinity, Infinity);
      else return env;

      env.updateInterval(varName, Math.max(current.min, constraint.min), Math.min(current.max, constraint.max));
    }
    return env;
  }

  /**
   * 处理基本块层级的状态转移
   */
  private transferBlock(block: CFGNode, env: Environment): Environment {
    for (const stmt of block.statements) {
      this.transferStatement(stmt, env);
      this.runCheckers(stmt, env);
    }
    return env;
  }

  /**
   * 处理语句级别的状态转移：捕获声明、赋值与变量更新对环境造成的影响。
   */
  private transferStatement(node: SyntaxNode, env: Environment): Environment {
    if (!node) return env;

    // 1. 解析局部与全局变量声明
    const decls = this.findAllNodes(node, ["declaration", "local_variable_declaration"]);
    for (const decl of decls) {
      const typeStr = decl.childForFieldName("type")?.text || "int";
      for (const child of decl.namedChildren) {
        
        // 场景 A: 带初始化的常规声明 (包括涉及 new 关键字的指针分配)
        if (child.type === "init_declarator") {
          const nameNode = child.childForFieldName("declarator") || child.namedChildren[0];
          const valNode = child.childForFieldName("value") || child.namedChildren[1];
          const actualName = this.extractIdentifierName(nameNode);
          
          if (actualName) {
            env.declareVar(actualName, typeStr);
            if (valNode) {
              const res = this.evaluateExpression(valNode, env);
              env.updateInterval(actualName, res.min, res.max);
              env.setVal(actualName, res.min);

              // 拦截并追踪基于 Heap 分配的动态数组大小
              const dynamicSize = this.extractDynamicArraySize(valNode, env);
              if (dynamicSize) {
                env.get(actualName)!.collection = { size: dynamicSize, elementInit: false };
              }
            }
          }
        } 
        // 场景 B: 静态数组声明 (支持多维)
        else if (child.type === "array_declarator") {
          const arrInfo = this.extractArrayDeclaration(child);
          if (arrInfo && arrInfo.name) {
            const sizeVal = arrInfo.sizeNode ? this.evaluateExpression(arrInfo.sizeNode, env).max : 0;
            env.declareVar(arrInfo.name, typeStr, true, isNaN(sizeVal) ? 0 : sizeVal);
          }
        } 
        // 场景 C: 仅声明，不含初始值
        else if (child.type === "identifier") {
          if (!env.get(child.text)) env.declareVar(child.text, typeStr);
        }
      }
    }

    // 2. 解析后续的变量赋值操作
    const assignments = this.findAllNodes(node, ["assignment_expression", "assignment"]);
    for (const a of assignments) {
      const leftNode = a.childForFieldName("left") || a.namedChildren[0];
      const valNode = a.childForFieldName("right") || a.namedChildren[1];
      const actualName = this.extractIdentifierName(leftNode);
      
      if (actualName && valNode) {
        if (!env.get(actualName)) env.declareVar(actualName, "auto");
        const res = this.evaluateExpression(valNode, env);
        env.updateInterval(actualName, res.min, res.max);
        env.setVal(actualName, res.min);

        // 如果给指针重新分配了堆内存，则重置其追踪边界
        const dynamicSize = this.extractDynamicArraySize(valNode, env);
        if (dynamicSize) {
           env.get(actualName)!.collection = { size: dynamicSize, elementInit: false };
        }
      }
    }

    // 3. 处理单目增量/减量更新表达式 (如 i++ 或 --j)
    const updates = this.findAllNodes(node, ["update_expression", "postfix_expression", "prefix_expression"]);
    for (const u of updates) {
      const argNode = u.childForFieldName("argument") || u.namedChildren[0];
      const op = u.childForFieldName("operator")?.text || u.children.find(c => ["++", "--"].includes(c.type))?.type;
      const actualName = this.extractIdentifierName(argNode);
      if (actualName && op) {
        if (!env.get(actualName)) env.declareVar(actualName, "auto");
        const cur = env.getInterval(actualName);
        if (op === "++") env.updateInterval(actualName, cur.min + 1, cur.max + 1);
        else if (op === "--") env.updateInterval(actualName, cur.min - 1, cur.max - 1);
      }
    }

    return env;
  }

  /**
   * 符号推演计算器：求解任意表达式可能的取值范围。
   */
  private evaluateExpression(node: SyntaxNode, env: Environment): Interval {
    if (!node) return new Interval(-Infinity, Infinity);
    if (node.type === "parenthesized_expression") return this.evaluateExpression(node.namedChildren[0], env);
    
    if (node.type === "number_literal") {
      const v = parseInt(node.text);
      return isNaN(v) ? new Interval(-Infinity, Infinity) : new Interval(v, v);
    }
    
    if (node.type === "identifier") return env.getInterval(node.text);
    
    const binExpr = node.type === "binary_expression" ? node : this.findNode(node, ["binary_expression"]);
    if (binExpr) {
      const leftNode = binExpr.childForFieldName("left") || binExpr.namedChildren[0];
      const rightNode = binExpr.childForFieldName("right") || binExpr.namedChildren[1];
      const op = binExpr.childForFieldName("operator")?.text || binExpr.children.find(c => !c.isNamed)?.text;
      
      if (leftNode && rightNode) {
        const left = this.evaluateExpression(leftNode, env);
        const right = this.evaluateExpression(rightNode, env);
        if (op === "+") return left.add(right);
        if (op === "-") return left.sub(right);
        if (op === "*") return left.mul(right);
      }
    }

    // 终极降级容错机制：通过正则表达式识别独立数字
    if (/^-?\d+$/.test(node.text.trim())) {
      return new Interval(parseInt(node.text), parseInt(node.text));
    }

    return new Interval(-Infinity, Infinity);
  }

  /**
   * [挂载点] 插件式诊断调度中心
   * 在每条语句评估结束后，触发全局注册的 Checkers 扫描各类安全风险。
   */
  private runCheckers(node: SyntaxNode, env: Environment) {
    if (!node) return;

    for (const checker of ALL_CHECKERS) {
      const issue = checker.check(node, env);
      if (issue) {
        if (Array.isArray(issue)) {
          this.issues.push(...issue);
        } else {
          this.issues.push(issue);
        }
      }
    }

    // 递归下探，确保隐藏在复杂表达式中的缺陷点也能被捕获
    for (const child of node.namedChildren) {
      this.runCheckers(child, env);
    }
  }
}