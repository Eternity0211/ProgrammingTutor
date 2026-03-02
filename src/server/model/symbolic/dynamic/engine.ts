/**
 * @file engine.ts
 * @description 动态分析引擎核心 - 符号执行与数据流分析求解器 (DFA Solver)。
 * 核心架构特性：
 * 1. 深度优先遍历 (DFS)：无视 AST 包装层级差异，全量提取所有关键语句进行评估。
 * 2. 降级容错机制 (Auto-Declare)：防止因语法树解析异常导致变量遗失，确保上下文完整性。
 * 3. 分支约束收敛 (Branch Refinement)：物理裁剪条件控制流下的取值区间，提升分析精度。
 * 4. 插件化诊断：无缝对接外部注册的各类型缺陷检查器 (Checkers)。
 */

import { CFG, CFGNode } from "./cfg";
import { Environment, Interval, InitState } from "./state";
import { SyntaxNode } from "../parser";
import { RawIssue } from "../../../../lib/types/symbolic-types";

// 引入统一规则注册中心
import { ALL_CHECKERS } from "./checkers";

/**
 * 数据流分析求解器
 */
export class AnalysisEngine {
  private issues: RawIssue[] = [];
  /** 用于不动点检测的块级状态快照映射表 */
  private blockInStates: Map<string, Environment> = new Map();
  /** 记录代码块的访问频次，用于触发循环加宽控制 */
  private visitCounts: Map<string, number> = new Map();
  /** 触发区间加宽的迭代阈值 */
  private readonly WIDENING_THRESHOLD = 2;

  constructor(private cfg: CFG) {}

  /**
   * 启动数据流固定点迭代分析。
   * @returns 分析产出的缺陷数据列表
   */
  public run(): RawIssue[] {
    const worklist: CFGNode[] = [this.cfg.entry];
    this.blockInStates.set(this.cfg.entry.id, new Environment());

    while (worklist.length > 0) {
      const currentBlock = worklist.shift()!;
      const inEnv = this.blockInStates.get(currentBlock.id)!;
      
      const count = (this.visitCounts.get(currentBlock.id) || 0) + 1;
      this.visitCounts.set(currentBlock.id, count);

      // 执行块内状态转移 (Transfer Function)
      const outEnv = this.transferBlock(currentBlock, inEnv.clone());

      for (let i = 0; i < currentBlock.successors.length; i++) {
        const successor = currentBlock.successors[i];
        let branchEnv = outEnv.clone();

        // 依据约定，后继索引 0 代表条件为真的分支，此处实施区间裁剪
        if (currentBlock.successors.length > 1 && currentBlock.id.includes("cond") && currentBlock.statements.length > 0) {
          const condition = currentBlock.statements[currentBlock.statements.length - 1];
          branchEnv = this.refineBranchState(condition, branchEnv, i === 0);
        }

        const existingIn = this.blockInStates.get(successor.id);
        if (!existingIn) {
          this.blockInStates.set(successor.id, branchEnv);
          worklist.push(successor);
        } else {
          // 执行状态合并 (Lattice Join)
          const merged = existingIn.clone().merge(branchEnv);
          
          // 循环控制流强制收敛机制 (Widening Operator)
          if (count > this.WIDENING_THRESHOLD && (successor.id.includes("cond") || successor.id.includes("body"))) {
            const store = (merged as any).store;
            for (const varName of store.keys()) {
              const oldIntv = existingIn.getInterval(varName);
              const newIntv = merged.getInterval(varName);
              merged.updateInterval(varName, 
                newIntv.min < oldIntv.min ? -Infinity : oldIntv.min,
                newIntv.max > oldIntv.max ? Infinity : oldIntv.max
              );
            }
          }

          // 不动点判定：若合并后状态发生变更，则继续将其投入队列迭代
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
  // AST Navigation Utilities | 抽象语法树导航工具
  // =========================================================================

  private findNode(root: SyntaxNode, types: string[]): SyntaxNode | null {
    if (types.includes(root.type)) return root;
    for (const child of root.namedChildren) {
      const found = this.findNode(child, types);
      if (found) return found;
    }
    return null;
  }

  private findAllNodes(root: SyntaxNode, types: string[]): SyntaxNode[] {
    let results: SyntaxNode[] = [];
    if (types.includes(root.type)) results.push(root);
    for (const child of root.namedChildren) {
      results.push(...this.findAllNodes(child, types));
    }
    return results;
  }

  // =========================================================================
  // Core Execution Logic | 核心执行推导逻辑
  // =========================================================================

  /**
   * 基于分支条件的比较操作符对变量区间进行物理约束限制。
   */
  private refineBranchState(cond: SyntaxNode, env: Environment, isTrueBranch: boolean): Environment {
    const binExpr = this.findNode(cond, ["binary_expression"]);
    if (!binExpr) return env;

    const left = binExpr.childForFieldName("left") || binExpr.namedChildren[0];
    const right = binExpr.childForFieldName("right") || binExpr.namedChildren[1];
    const op = binExpr.childForFieldName("operator")?.text || binExpr.children.find(c => ["<", ">", "<=", ">=", "==", "!="].includes(c.type))?.type;

    // 容错验证：提取标识符与数字字面量，执行区间推断
    if (left?.text && right?.text && !isNaN(parseInt(right.text))) {
      const val = parseInt(right.text);
      const name = left.text;
      
      // 容错降级：若标识符未被记录，则自动生成注册账本
      if (!env.get(name)) env.declareVar(name, "auto");
      
      const current = env.getInterval(name);
      let constraint: Interval;

      if (op === "<") constraint = isTrueBranch ? new Interval(-Infinity, val - 1) : new Interval(val, Infinity);
      else if (op === "<=") constraint = isTrueBranch ? new Interval(-Infinity, val) : new Interval(val + 1, Infinity);
      else if (op === ">") constraint = isTrueBranch ? new Interval(val + 1, Infinity) : new Interval(-Infinity, val);
      else if (op === ">=") constraint = isTrueBranch ? new Interval(val, Infinity) : new Interval(-Infinity, val - 1);
      else if (op === "==") constraint = isTrueBranch ? new Interval(val, val) : new Interval(-Infinity, Infinity);
      else return env;

      // 实施约束交叉逻辑
      env.updateInterval(name, Math.max(current.min, constraint.min), Math.min(current.max, constraint.max));
    }
    return env;
  }

  private transferBlock(block: CFGNode, env: Environment): Environment {
    for (const stmt of block.statements) {
      this.transferStatement(stmt, env);
      this.runCheckers(stmt, env);
    }
    return env;
  }

  /**
   * 语义推导核心：解析单条语句或表达式对环境变量产生的影响。
   */
  private transferStatement(node: SyntaxNode, env: Environment): Environment {
    if (!node) return env;

    // 1. 全量搜寻处理变量声明节点
    const decls = this.findAllNodes(node, ["declaration", "local_variable_declaration"]);
    for (const decl of decls) {
      const typeStr = decl.childForFieldName("type")?.text || "int";
      for (const child of decl.namedChildren) {
        if (child.type === "init_declarator") {
          const nameNode = child.childForFieldName("declarator") || child.namedChildren[0];
          const valNode = child.childForFieldName("value") || child.namedChildren[1];
          if (nameNode?.text) {
            env.declareVar(nameNode.text, typeStr);
            if (valNode) {
              const res = this.evaluateExpression(valNode, env);
              env.updateInterval(nameNode.text, res.min, res.max);
              env.setVal(nameNode.text, res.min);
            }
          }
        } else if (child.type === "array_declarator") {
          const nameNode = child.childForFieldName("declarator") || child.namedChildren[0];
          const sizeNode = child.childForFieldName("size") || child.namedChildren[1];
          if (nameNode?.text) env.declareVar(nameNode.text, typeStr, true, parseInt(sizeNode?.text || "0"));
        } else if (child.type === "identifier") {
          if (!env.get(child.text)) env.declareVar(child.text, typeStr);
        }
      }
    }

    // 2. 处理所有潜在的赋值行为
    const assignments = this.findAllNodes(node, ["assignment_expression", "assignment"]);
    for (const a of assignments) {
      const leftNode = a.childForFieldName("left") || a.namedChildren[0];
      const valNode = a.childForFieldName("right") || a.namedChildren[1];
      if (leftNode?.text && valNode) {
        const name = leftNode.text;
        if (!env.get(name)) env.declareVar(name, "auto");
        const res = this.evaluateExpression(valNode, env);
        env.updateInterval(name, res.min, res.max);
        env.setVal(name, res.min);
      }
    }

    // 3. 处理更新表达式 (如 i++)
    const updates = this.findAllNodes(node, ["update_expression", "postfix_expression", "prefix_expression"]);
    for (const u of updates) {
      const argNode = u.childForFieldName("argument") || u.namedChildren[0];
      const op = u.childForFieldName("operator")?.text || u.children.find(c => ["++", "--"].includes(c.type))?.type;
      if (argNode?.text && op) {
        const name = argNode.text;
        if (!env.get(name)) env.declareVar(name, "auto");
        const cur = env.getInterval(name);
        if (op === "++") env.updateInterval(name, cur.min + 1, cur.max + 1);
        else if (op === "--") env.updateInterval(name, cur.min - 1, cur.max - 1);
      }
    }

    return env;
  }

  /**
   * 递归进行符号算术计算，评估表达式可能的返回值区间。
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

    // 终极容错：文本直接降级转义
    if (/^-?\d+$/.test(node.text.trim())) {
      return new Interval(parseInt(node.text), parseInt(node.text));
    }

    return new Interval(-Infinity, Infinity);
  }

  /**
   * [插件诊断中心] 在每条语句执行后，挂载并触发外部所有的验证规则
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

    // 针对深层嵌套语法节点的递归探测保障
    for (const child of node.namedChildren) {
      this.runCheckers(child, env);
    }
  }
}