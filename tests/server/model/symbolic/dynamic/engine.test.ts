/**
 * @file engine.test.ts
 * @description 动态分析引擎 (DFA Solver) 高级求解器极限测试。
 * * @test_suite 本组件全方位验证抽象解释框架下的分析精度：
 * 1. 线性推演：算术操作符及变量自增减的绝对区间精度。
 * 2. 分支感知：真假条件下的 Must-Analysis 区间物理约束 (Branch Refinement)。
 * 3. 固定点收敛：面对无限/高频迭代时，加宽算子 (Widening) 的防死循环机制。
 * 4. 元数据透传：AST 跨层级解析对数组规模边界的提取能力。
 */

import { parseCode } from "../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../src/server/model/symbolic/dynamic/engine";
import { Environment } from "../../../../../src/server/model/symbolic/dynamic/state";

describe("Dynamic Analysis - DFA Engine (Competition Level)", () => {
  /**
   * 工具函数：越过封装屏障，提取引擎结束推导后的最终全景内存快照。
   * @param engine - 分析引擎实例
   * @returns 汇聚在执行终点 (Exit Block) 的符号环境账本
   */
  function getExitEnvironment(engine: AnalysisEngine): Environment {
    const states = (engine as any).blockInStates as Map<string, Environment>;
    const cfg = (engine as any).cfg;
    const exitState = states.get(cfg.exit.id);
    if (!exitState)
      throw new Error(
        "Critical: Exit block state unresolved. DFA might have diverged or stalled.",
      );
    return exitState;
  }

  it("1. 应该确保顺序语句流中的符号算术推导具有绝对精度 (乘法、自增及负偏移)", async () => {
    const code = `
      int a = 10;
      int b = 2;
      int c = a * b; // -> [20, 20]
      c++;           // -> [21, 21]
      int d = c - 5; // -> [16, 16]
    `;
    const tree = await parseCode(code);
    const engine = new AnalysisEngine(buildCFG(tree));
    engine.run();

    const env = getExitEnvironment(engine);

    // 逻辑验证：引擎必须能正确追踪所有计算操作带来的边界偏移
    expect(env.getInterval("c").min).toBe(21);
    expect(env.getInterval("d").max).toBe(16);
  });

  it("2. 应该在 If-Else 汇聚处实施严谨的逻辑推导 (条件物理裁剪与状态并集)", async () => {
    const code = `
      int x; // 初始为 [-Infinity, Infinity]
      int y = 0; 
      
      if (x < 10) {
         // DFA 理应识别此处的 x 取值上限为 9
         y = 1;
      } else {
         // DFA 理应识别此处的 x 取值下限为 10
         y = 2;
      }
    `;
    const tree = await parseCode(code);
    const engine = new AnalysisEngine(buildCFG(tree));
    engine.run();

    const env = getExitEnvironment(engine);

    // 验证 1: 变量 y 在两个分支经过不同的显式赋值，汇聚后区间必然是外包络 [1, 2]
    expect(env.getInterval("y").min).toBe(1);
    expect(env.getInterval("y").max).toBe(2);

    // 验证 2: 变量 x 虽然在各自分支中受到了裁剪 (<=9 和 >=10)，
    // 但在汇聚点，这两个子集合的并集应该重新还原回无约束状态 ([-Infinity, Infinity])
    expect(env.getInterval("x").min).toBe(-Infinity);
    expect(env.getInterval("x").max).toBe(Infinity);
  });

  it("3. 应该强力拦截死循环风险，在发散前利用 Widening (加宽算子) 锁定不动点", async () => {
    const code = `
      int i = 0;
      while (i < 5) {
        i++;
      }
    `;
    // 理论推导链模型 (Abstract Interpretation Model)：
    // [迭代 1] i=[0, 0] 进入循环，更新为 [0, 1]
    // [迭代 2] 侦测到 i 的上边界呈现单调递增规律
    // [防御 1] 引擎介入，对 i 触发加宽运算 (widen)，直接将其上限假定为 Infinity，即 i=[0, Infinity]
    // [分析 1] 携带 i=[0, Infinity] 再次遭遇条件 (i < 5)。
    //         - 真分支被裁剪为 i=[0, 4] (重返循环体)
    //         - 假分支被推断为 i=[5, Infinity] (脱离循环流)
    // [结论] 最终能在系统出口存活的只有假分支的状态，因此 i 的下限被完美确定为 5。

    const tree = await parseCode(code);
    const engine = new AnalysisEngine(buildCFG(tree));

    // 注意：若 Widening 机制失效，引擎将尝试将 i 执行到 5 才停止；
    // 甚至如果条件是 i < 1e9，没有 Widening 的系统会导致 Node.js 服务器直接内存溢出。
    engine.run();

    const env = getExitEnvironment(engine);
    const iInterval = env.getInterval("i");

    // 安全断言：引擎必须能在跳出循环时保留其逆向条件约束
    expect(iInterval.min).toBe(5);
    expect(iInterval.max).toBe(Infinity);
  });

  it("4. 应该从复杂 AST 声明中敏锐捕获用作竞赛核心防御的 Collection Size", async () => {
    const code = `
      int arr[100];
      int n = 50;
    `;
    const tree = await parseCode(code);
    const engine = new AnalysisEngine(buildCFG(tree));
    engine.run();

    const env = getExitEnvironment(engine);
    const arrState = env.get("arr");

    // 验证前置准备：确保引擎为后续挂载的 OOB Checker (越界检查器) 提供准确的数组界限
    expect(arrState?.collection).toBeDefined();
    expect(arrState?.collection?.size.min).toBe(100);
    expect(arrState?.collection?.size.max).toBe(100);
    expect(env.getInterval("n").min).toBe(50);
  });
});
