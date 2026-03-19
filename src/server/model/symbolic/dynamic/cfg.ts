/**
 * @file cfg.ts
 * @description 动态分析引擎 - 控制流图 (Control Flow Graph, CFG) 构建器。
 * 核心职责是将 AST 转换为适合数据流分析的有向图拓扑结构。包含对条件分支、循环跳转、
 * Switch 状态机及死代码截断的处理机制。
 */

import { Tree, SyntaxNode } from "../parser";

/** * 基本块 (Basic Block)
 * 代表无内部跳转的线性执行指令序列。
 */
export interface CFGNode {
  id: string;
  statements: SyntaxNode[];
  successors: CFGNode[];
  predecessors: CFGNode[];
}

/** 控制流图整体结构 */
export interface CFG {
  entry: CFGNode;
  exit: CFGNode;
  nodes: CFGNode[];
}

/** 作用域控制上下文，用于追踪 Break 和 Continue 的合法跳出目标 */
interface ControlContext {
  breakTarget: CFGNode;
  continueTarget?: CFGNode;
}

/**
 * 控制流图构建器类
 */
class CFGBuilder {
  private nodes: CFGNode[] = [];
  private blockCounter: number = 0;

  /** 存放所有触发了 return 的悬空基本块 */
  public returnBlocks: CFGNode[] = [];

  /** 核心控制流追踪堆栈 (处理循环与 Switch) */
  private ctrlStack: ControlContext[] = [];
  /** 记录当前活跃的 Switch 条件块，用于 case 节点的直接跃迁 */
  private switchStack: CFGNode[] = [];

  /**
   * 实例化并注册一个新的基本块
   * @param prefix - 块标识前缀 (例如 "cond_eval", "for_body")
   */
  public createBlock(prefix: string = "block"): CFGNode {
    const block: CFGNode = {
      id: `${prefix}_${this.blockCounter++}`,
      statements: [],
      successors: [],
      predecessors: [],
    };
    this.nodes.push(block);
    return block;
  }

  /**
   * 建立两个基本块之间的有向控制流连接
   */
  public connect(from: CFGNode, to: CFGNode) {
    if (!from.successors.includes(to)) from.successors.push(to);
    if (!to.predecessors.includes(from)) to.predecessors.push(from);
  }

  public getAllNodes(): CFGNode[] {
    return this.nodes;
  }

  /**
   * 递归解析组合逻辑条件，生成短路求值 (Short-circuit Evaluation) 拓扑。
   * 将 && 和 || 拆解为多个独立的 cond_eval 基本块。
   */
  private evaluateCondition(
    condNode: SyntaxNode,
    incomingBlocks: CFGNode[],
  ): { trueExits: CFGNode[]; falseExits: CFGNode[] } {
    // 穿透括号与子句封装
    if (
      condNode.type === "parenthesized_expression" ||
      condNode.type === "condition_clause"
    ) {
      const inner =
        condNode.childForFieldName("value") || condNode.namedChildren[0];
      if (inner) return this.evaluateCondition(inner, incomingBlocks);
    }

    // 解析二元逻辑运算符
    if (
      condNode.type === "binary_expression" ||
      condNode.type === "logical_expression"
    ) {
      let operator = condNode.childForFieldName("operator")?.text;
      if (!operator) {
        const opNode = condNode.children.find(
          (c) => c.type === "&&" || c.type === "||",
        );
        operator = opNode?.type;
      }

      const left =
        condNode.childForFieldName("left") || condNode.namedChildren[0];
      const right =
        condNode.childForFieldName("right") || condNode.namedChildren[1];

      // && 逻辑：左侧为真时才计算右侧；左侧为假时直接短路至 falseExits
      if (operator === "&&" && left && right) {
        const leftRes = this.evaluateCondition(left, incomingBlocks);
        const rightRes = this.evaluateCondition(right, leftRes.trueExits);
        return {
          trueExits: rightRes.trueExits,
          falseExits: [...leftRes.falseExits, ...rightRes.falseExits],
        };
      }

      // || 逻辑：左侧为假时才计算右侧；左侧为真时直接短路至 trueExits
      if (operator === "||" && left && right) {
        const leftRes = this.evaluateCondition(left, incomingBlocks);
        const rightRes = this.evaluateCondition(right, leftRes.falseExits);
        return {
          trueExits: [...leftRes.trueExits, ...rightRes.trueExits],
          falseExits: rightRes.falseExits,
        };
      }
    }

    // 基础条件评估块
    const evalBlock = this.createBlock("cond_eval");
    evalBlock.statements.push(condNode);
    incomingBlocks.forEach((b) => this.connect(b, evalBlock));
    return { trueExits: [evalBlock], falseExits: [evalBlock] };
  }

  /**
   * 递归遍历 AST 节点并构建图拓扑。
   * @param astNode - 当前解析的 AST 节点
   * @param currentBlock - 当前所在的控制流基本块
   * @returns 生成的当前层级退出块 (Exit Blocks) 集合
   */
  public buildNode(astNode: SyntaxNode, currentBlock: CFGNode): CFGNode[] {
    const type = astNode.type;

    // --- 1. 复合语句与翻译单元 ---
    if (type === "translation_unit" || type === "compound_statement") {
      let activeBlocks = [currentBlock];
      for (const child of astNode.namedChildren) {
        // 容错机制：当控制流被 break/return 截断导致 activeBlocks 为空时，
        // 注入一个不可达 (unreachable) 的幽灵块垫底。确保 AST 遍历能继续执行，
        // 避免 Switch-Case 中的后续分支被错误丢弃。
        if (activeBlocks.length === 0) {
          activeBlocks = [this.createBlock("unreachable")];
        }

        const nextBlocks: CFGNode[] = [];
        for (const block of activeBlocks) {
          nextBlocks.push(...this.buildNode(child, block));
        }
        activeBlocks = nextBlocks;
      }
      // 过滤幽灵块，防止其污染最终的图流向
      return activeBlocks.filter((b) => !b.id.startsWith("unreachable"));
    }

    // --- 2. 条件分支 (If-Else) ---
    if (type === "if_statement") {
      // 兼容不同版本的 Tree-sitter AST 结构
      const conditionNode =
        astNode.childForFieldName("condition") || astNode.namedChildren[0];
      const consequenceNode =
        astNode.childForFieldName("consequence") ||
        (astNode.namedChildren.length > 1
          ? astNode.namedChildren[1]
          : undefined);
      const alternativeNode =
        astNode.childForFieldName("alternative") ||
        (astNode.namedChildren.length > 2
          ? astNode.namedChildren[2]
          : undefined);

      const ifCondBase = this.createBlock("if_cond");
      this.connect(currentBlock, ifCondBase);

      const condRes = conditionNode
        ? this.evaluateCondition(conditionNode, [ifCondBase])
        : { trueExits: [ifCondBase], falseExits: [ifCondBase] };
      const mergeBlock = this.createBlock("if_merge");

      // 约定规范: Index 0 恒为 True 分支
      const trueBlock = this.createBlock("if_true");
      condRes.trueExits.forEach((exit) => this.connect(exit, trueBlock));
      const tExits = consequenceNode
        ? this.buildNode(consequenceNode, trueBlock)
        : [trueBlock];
      tExits.forEach((exit) => this.connect(exit, mergeBlock));

      // 约定规范: Index 1 恒为 False 分支
      const falseBlock = this.createBlock("if_false");
      condRes.falseExits.forEach((exit) => this.connect(exit, falseBlock));
      const fExits = alternativeNode
        ? this.buildNode(alternativeNode, falseBlock)
        : [falseBlock];
      fExits.forEach((exit) => this.connect(exit, mergeBlock));

      return [mergeBlock];
    }

    // --- 3. 循环结构 (For) ---
    if (type === "for_statement") {
      const initNode =
        astNode.childForFieldName("initializer") ||
        astNode.children.find(
          (c) => c.type === "declaration" || c.type === "assignment_expression",
        );
      const condNode =
        astNode.childForFieldName("condition") ||
        astNode.children.find(
          (c) =>
            c.type === "binary_expression" || c.type === "condition_clause",
        );
      const updateNode =
        astNode.childForFieldName("update") ||
        astNode.children.find(
          (c) =>
            c.type === "update_expression" ||
            c.type === "assignment_expression",
        );
      const bodyNode =
        astNode.childForFieldName("body") ||
        astNode.namedChildren[astNode.namedChildren.length - 1];

      let preLoopBlocks = [currentBlock];
      if (initNode) {
        const initBlock = this.createBlock("for_init");
        this.connect(currentBlock, initBlock);
        preLoopBlocks = this.buildNode(initNode, initBlock);
      }

      const condStartBlock = this.createBlock("for_cond");
      preLoopBlocks.forEach((b) => this.connect(b, condStartBlock));
      if (condNode) condStartBlock.statements.push(condNode);

      const updateBlock = this.createBlock("for_update");
      if (updateNode) updateBlock.statements.push(updateNode);
      this.connect(updateBlock, condStartBlock);

      const afterBlock = this.createBlock("for_after");

      // 注册 break 与 continue 的上下文寻址目标
      this.ctrlStack.push({
        breakTarget: afterBlock,
        continueTarget: updateBlock,
      });

      if (bodyNode) {
        const bodyBlock = this.createBlock("for_body");
        this.connect(condStartBlock, bodyBlock); // Index 0: True
        const bodyExits = this.buildNode(bodyNode, bodyBlock);
        bodyExits.forEach((exit) => this.connect(exit, updateBlock));
      } else {
        this.connect(condStartBlock, updateBlock);
      }
      this.connect(condStartBlock, afterBlock); // Index 1: False

      this.ctrlStack.pop();
      return [afterBlock];
    }

    // --- 4. 循环结构 (While) ---
    if (type === "while_statement") {
      const conditionNode =
        astNode.childForFieldName("condition") || astNode.namedChildren[0];
      const bodyNode =
        astNode.childForFieldName("body") ||
        (astNode.namedChildren.length > 1
          ? astNode.namedChildren[astNode.namedChildren.length - 1]
          : undefined);

      const condStartBlock = this.createBlock("while_cond");
      this.connect(currentBlock, condStartBlock);
      if (conditionNode) condStartBlock.statements.push(conditionNode);

      const afterBlock = this.createBlock("while_after");
      this.ctrlStack.push({
        breakTarget: afterBlock,
        continueTarget: condStartBlock,
      });

      if (bodyNode) {
        const bodyBlock = this.createBlock("while_body");
        this.connect(condStartBlock, bodyBlock); // Index 0: True
        const bodyExits = this.buildNode(bodyNode, bodyBlock);
        bodyExits.forEach((exit) => this.connect(exit, condStartBlock));
      } else {
        this.connect(condStartBlock, condStartBlock);
      }
      this.connect(condStartBlock, afterBlock); // Index 1: False

      this.ctrlStack.pop();
      return [afterBlock];
    }

    // --- 5. 状态机结构 (Switch-Case) ---
    if (type === "switch_statement") {
      const condNode =
        astNode.childForFieldName("condition") || astNode.namedChildren[0];
      const bodyNode =
        astNode.childForFieldName("body") || astNode.namedChildren[1];

      const condBlock = this.createBlock("switch_cond");
      this.connect(currentBlock, condBlock);
      if (condNode) condBlock.statements.push(condNode);

      const mergeBlock = this.createBlock("switch_merge");

      this.ctrlStack.push({ breakTarget: mergeBlock });
      this.switchStack.push(condBlock);

      const exits = bodyNode
        ? this.buildNode(bodyNode, condBlock)
        : [condBlock];

      this.switchStack.pop();
      this.ctrlStack.pop();

      exits.forEach((exit) => this.connect(exit, mergeBlock));
      return [mergeBlock];
    }

    if (type === "case_statement" || type === "default_statement") {
      const caseBlock = this.createBlock("case");

      // 控制流贯穿 (Fall-through) 保障：仅当上一节点未发生跳转截断时，才允许物理贯穿连接
      if (!currentBlock.id.startsWith("unreachable")) {
        this.connect(currentBlock, caseBlock);
      }

      // 接收来自 switch 根节点的条件直达跳转
      if (this.switchStack.length > 0) {
        this.connect(this.switchStack[this.switchStack.length - 1], caseBlock);
      }

      let activeBlocks = [caseBlock];
      for (const child of astNode.namedChildren) {
        // 防止 case 内部的截断阻止后续子语句的继续扫描
        if (activeBlocks.length === 0) {
          activeBlocks = [this.createBlock("unreachable")];
        }
        const nextBlocks: CFGNode[] = [];
        for (const block of activeBlocks) {
          nextBlocks.push(...this.buildNode(child, block));
        }
        activeBlocks = nextBlocks;
      }
      return activeBlocks.filter((b) => !b.id.startsWith("unreachable"));
    }

    // --- 6. 截断与跳转指令 (Break / Continue / Return) ---
    if (type === "break_statement") {
      currentBlock.statements.push(astNode);
      if (this.ctrlStack.length > 0) {
        this.connect(
          currentBlock,
          this.ctrlStack[this.ctrlStack.length - 1].breakTarget,
        );
      }
      return []; // 返回空数组以截断当前路径的线性流
    }

    if (type === "continue_statement") {
      currentBlock.statements.push(astNode);
      // 倒序寻找最近的一个合法 continue 上下文 (跳过 switch 层)
      for (let i = this.ctrlStack.length - 1; i >= 0; i--) {
        if (this.ctrlStack[i].continueTarget) {
          this.connect(currentBlock, this.ctrlStack[i].continueTarget!);
          break;
        }
      }
      return [];
    }

    if (type === "return_statement") {
      currentBlock.statements.push(astNode);
      this.returnBlocks.push(currentBlock);
      return [];
    }

    // --- 7. 基础语句收集 ---
    currentBlock.statements.push(astNode);
    return [currentBlock];
  }
}

/**
 * 构建代码的控制流图。
 * @param tree - Tree-sitter 解析完成的语法树
 * @returns 包含完整拓扑信息的控制流图实例
 */
export function buildCFG(tree: Tree): CFG {
  const builder = new CFGBuilder();
  const entryBlock = builder.createBlock("entry");
  const exitBlock = builder.createBlock("exit");
  const finalBlocks = builder.buildNode(tree.rootNode, entryBlock);
  finalBlocks.forEach((block) => builder.connect(block, exitBlock));
  builder.returnBlocks.forEach((block) => builder.connect(block, exitBlock));
  return { entry: entryBlock, exit: exitBlock, nodes: builder.getAllNodes() };
}
