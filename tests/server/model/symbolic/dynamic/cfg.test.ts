/**
 * @file cfg.test.ts
 * @description 动态分析引擎 - 控制流图 (CFG) 拓扑构建单元测试。
 * * @test_suite 本组件验证 AST 到有向图的结构转换，防范以下静态分析痛点：
 * 1. 死代码识别：验证 Return 引发的提早退出 (Early Exit) 与图断连机制。
 * 2. 逻辑分支爆炸：验证 &&、|| 短路求值 (Short-circuit Evaluation) 生成的嵌套拓扑。
 * 3. 跨层级跳转：验证 break 及 continue 指令回溯目标块的精准度。
 * 4. 状态机异常：验证 Switch-Case 中的贯穿效应 (Fall-through) 连线逻辑。
 */

import { parseCode } from "../../../../../src/server/model/symbolic/parser";
import {
  buildCFG,
  CFGNode,
} from "../../../../../src/server/model/symbolic/dynamic/cfg";

// =============================================================================
// Helper Functions | 拓扑图定位工具
// =============================================================================

/**
 * 提取所有匹配特定前缀的基本块 (Basic Block)。
 * @param nodes - CFG 节点合集
 * @param prefix - 块标识前缀 (如 "cond_eval", "case")
 */
function findBlocks(nodes: CFGNode[], prefix: string): CFGNode[] {
  return nodes.filter((n) => n.id.startsWith(prefix));
}

/**
 * 提取首个匹配前缀的基本块。
 * @throws 当未找到时抛出异常，防止测试出现假阳性 (False Positive)
 */
function findBlock(nodes: CFGNode[], prefix: string): CFGNode {
  const blocks = findBlocks(nodes, prefix);
  if (blocks.length === 0)
    throw new Error(`[Topology Error] Block prefix '${prefix}' not found.`);
  return blocks[0];
}

/**
 * 精准检索内部 statements 包含特定 AST 节点类型的基本块。
 */
function findBlockWithNodeType(nodes: CFGNode[], nodeType: string): CFGNode {
  const block = nodes.find((n) =>
    n.statements.some((s) => s.type === nodeType),
  );
  if (!block)
    throw new Error(
      `[Topology Error] Block with AST node '${nodeType}' not found.`,
    );
  return block;
}

// =============================================================================
// Test Suites | 测试用例集
// =============================================================================

describe("Dynamic Analysis - Advanced CFG Builder", () => {
  it("1. 应该正确处理 Return 引起的控制流提早截断 (Early Exit & Dead Code)", async () => {
    const code = `
      int a = 10;
      return a;
      a = a + 1; // 无法到达的死代码
    `;
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);

    const returnBlock = findBlockWithNodeType(cfg.nodes, "return_statement");

    // 拓扑验证：执行 return 的代码块必须无视后续流转，将出口直接接管至整个 CFG 的 Exit 节点
    expect(returnBlock.successors.map((n) => n.id)).toContain(cfg.exit.id);
  });

  it("2. 应该正确将 && 逻辑展开为多级短路求值图 (Short-circuit AND Topology)", async () => {
    const code = `
      if (p != nullptr && p->value > 0) {
        int a = 1;
      } else {
        int b = 2;
      }
    `;
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);

    // 验证点 1: 复杂复合条件必须被拆解为独立的连续评估块
    const condEvals = findBlocks(cfg.nodes, "cond_eval");
    expect(condEvals.length).toBe(2);

    const falseBlock = findBlock(cfg.nodes, "if_false");
    const trueBlock = findBlock(cfg.nodes, "if_true");

    const firstCond = condEvals[0]; // 评估: p != nullptr
    const secondCond = condEvals[1]; // 评估: p->value > 0
    const firstSuccessors = firstCond.successors.map((n) => n.id);

    // 验证点 2: 顺延路径 (左侧成立时才进入右侧评估)
    expect(firstSuccessors).toContain(secondCond.id);

    // 验证点 3: 短路路径 (左侧一旦失效，直接跃过右侧，跌入 False 分支)
    expect(firstSuccessors).toContain(falseBlock.id);

    // 验证点 4: 终极通路 (仅当右侧条件也满足时，才允许流向 True 分支)
    expect(secondCond.successors.map((n) => n.id)).toContain(trueBlock.id);
  });

  it("3. 应该穿透作用域，精准连接 For 循环中的 Break 和 Continue 目标块", async () => {
    const code = `
      for (int i = 0; i < 10; i++) {
        if (i == 5) continue;
        if (i == 8) break;
      }
    `;
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);

    const updateBlock = findBlock(cfg.nodes, "for_update"); // 指向 i++ 的增量执行块
    const afterBlock = findBlock(cfg.nodes, "for_after"); // 指向循环体退出后的着陆块

    const continueBlock = findBlockWithNodeType(
      cfg.nodes,
      "continue_statement",
    );
    const breakBlock = findBlockWithNodeType(cfg.nodes, "break_statement");

    // 上下文验证 1: continue 必须绕过循环体残余语句，直接上跳连向 for_update
    expect(continueBlock.successors.map((n) => n.id)).toContain(updateBlock.id);

    // 上下文验证 2: break 必须销毁当前迭代栈，下跳直接连向循环的出口 for_after
    expect(breakBlock.successors.map((n) => n.id)).toContain(afterBlock.id);
  });

  it("4. 应该支持 Switch-Case 状态机模型中的贯穿效应 (Fall-through) 与安全拦截", async () => {
    const code = `
      int x = 0;
      switch (x) {
        case 1: 
          x += 1; // 危险: 缺少 break，控制流将发生物理贯穿
        case 2: 
          x += 2;
          break;  // 安全: 执行跳出
        default:
          x = 10;
      }
    `;
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);

    // 验证点 1: 即使部分分支因 break 被截断，幽灵块机制仍应确保所有 case 完整构建
    const cases = findBlocks(cfg.nodes, "case");
    expect(cases.length).toBe(3);

    const case1 = cases[0];
    const case2 = cases[1];

    const mergeBlock = findBlock(cfg.nodes, "switch_merge");
    const breakBlock = findBlockWithNodeType(cfg.nodes, "break_statement");

    // 验证点 2: 物理贯穿现象 (Fall-through)。Case 1 无 break，它的后继必须包含 Case 2 的入口
    expect(case1.successors.map((n) => n.id)).toContain(case2.id);

    // 验证点 3: 状态机阻断。Case 2 触发 break，控制流必须飞出 switch 状态机，接入汇聚块
    expect(breakBlock.successors.map((n) => n.id)).toContain(mergeBlock.id);
  });
});
