/**
 * @file state.test.ts
 * @description 动态分析引擎 - 符号状态环境 (Symbolic State & Environment) 核心单元测试。
 * * @test_suite 重点验证领域：
 * 1. 区间半格 (Interval Lattice)：交并集计算边界、加宽算子 (Widening) 的无穷大收敛推导。
 * 2. 符号算术引擎极限测试：包含正负数边界交叉的乘法推演，及除零风险的探测。
 * 3. 复杂环境账本合并 (State Join)：May-Analysis 保守降级策略、多维元数据 (如集合、指针) 的深拷贝与防污染机制。
 */

import {
  Environment,
  Interval,
  InitState,
} from "../../../../../src/server/model/symbolic/dynamic/state";

describe("Dynamic Analysis - Symbolic State (Competition Level)", () => {
  describe("1. Interval Lattice & Arithmetic (区间格运算与符号推导)", () => {
    it("1.1 应该正确处理包含正负边界交叉的复杂区间乘法", () => {
      // 场景描述: 变量 a 存在于 [-2, 3], 变量 b 存在于 [-5, 4]
      // 边界极值演算：-2*-5=10, -2*4=-8, 3*-5=-15, 3*4=12
      // 理论最值包络: [-15, 12]
      const a = new Interval(-2, 3);
      const b = new Interval(-5, 4);
      const res = a.mul(b);

      expect(res.min).toBe(-15);
      expect(res.max).toBe(12);
    });

    it("1.2 应该正确处理非对称边界的区间减法及除零风险", () => {
      // 减法推演：[10, 20] - [2, 5] => 最小可能值为 10-5=5，最大可能值为 20-2=18
      const a = new Interval(10, 20);
      const b = new Interval(2, 5);
      const res = a.sub(b);

      expect(res.min).toBe(5);
      expect(res.max).toBe(18);

      // 除零风险探测 (Zero-Division Detection)
      const safeInterval = new Interval(1, 5);
      const unsafeInterval = new Interval(-2, 2); // 穿过 0 点
      expect(safeInterval.containsZero()).toBe(false);
      expect(unsafeInterval.containsZero()).toBe(true);
    });

    it("1.3 应该精准触发 Widening (加宽算子) 以强制循环收敛", () => {
      const oldState = new Interval(0, 5);

      // 场景 A: 探测到上界被突破，安全策略要求直接将上界推向 Infinity (正无穷)
      const rightGrow = new Interval(0, 6);
      const resA = rightGrow.widen(oldState);
      expect(resA.min).toBe(0);
      expect(resA.max).toBe(Infinity);

      // 场景 B: 探测到下界被突破，将下界推向 -Infinity (负无穷)
      const leftGrow = new Interval(-1, 5);
      const resB = leftGrow.widen(oldState);
      expect(resB.min).toBe(-Infinity);
      expect(resB.max).toBe(5);

      // 场景 C: 双向发散，直接退化为无约束全集 [-Infinity, Infinity]
      const bothGrow = new Interval(-1, 6);
      const resC = bothGrow.widen(oldState);
      expect(resC.min).toBe(-Infinity);
      expect(resC.max).toBe(Infinity);
    });

    it("1.4 应该正确执行区间交集 (Must-Analysis 条件物理裁剪)", () => {
      // 场景模拟：变量原属于 [0, 20]，在经过 if (x < 10) 的 True 分支时，
      // 应当与约束条件 [-Infinity, 9] 求交集。
      const original = new Interval(0, 20);
      const constraint = new Interval(-Infinity, 9);
      const res = original.intersect(constraint);

      expect(res.min).toBe(0);
      expect(res.max).toBe(9);
    });
  });

  describe("2. Environment & State Merging (执行环境与状态汇聚)", () => {
    it("2.1 分支合并必须严格遵循 '最危险原则' (May-Analysis 保守降级)", () => {
      const envMain = new Environment();
      envMain.declareVar("x", "int");

      // 分支 A: 变量 x 已安全初始化
      const envA = envMain.clone();
      envA.setVal("x", 100);

      // 分支 B: 变量 x 处于高危的未初始化状态
      const envB = envMain.clone();

      // 分支 C: 变量 x 被外部输入标记为污点 (Tainted)
      const envC = envMain.clone();
      envC.get("x")!.init = InitState.TAINTED;

      // 验证降级逻辑：汇聚 A 和 B 时，只要有一条路径是 UNINITIALIZED，就必须报 UNINITIALIZED
      envMain.merge(envA).merge(envB);
      expect(envMain.get("x")?.init).toBe(InitState.UNINITIALIZED);

      // 验证区间并集：应当包含 [100, 100] 和 [-Infinity, Infinity] 的最大外包络
      expect(envMain.getInterval("x").max).toBe(Infinity);

      // 验证污点传播 (Taint Propagation)：TAINTED 级别在有初始值的情况下依然拥有最高优先级
      const envSafe = new Environment();
      envSafe.declareVar("y", "int");
      envSafe.setVal("y", 1);

      const envPolluted = envSafe.clone();
      envPolluted.get("y")!.init = InitState.TAINTED;

      envSafe.merge(envPolluted);
      expect(envSafe.get("y")?.init).toBe(InitState.TAINTED);
    });

    it("2.2 深拷贝 (Deep Clone) 必须彻底隔离多维元数据，杜绝指针/对象污染", () => {
      const env1 = new Environment();
      env1.declareVar("arr", "int", true, 10); // 模拟 int arr[10];

      const env2 = env1.clone();
      // 在衍生分支 2 中模拟对数组发生扩容或偏移推断
      env2.get("arr")!.collection!.size = new Interval(20, 20);

      // 安全断言：原始环境 env1 绝不能受到 env2 内存修改的影响
      expect(env1.get("arr")?.collection?.size.max).toBe(10);
      expect(env2.get("arr")?.collection?.size.max).toBe(20);
    });

    it("2.3 不动点检测 (Equality Check) 应当具备像素级的扰动敏感度", () => {
      const env1 = new Environment();
      env1.declareVar("i", "int");
      env1.setVal("i", 0);

      const env2 = env1.clone();
      expect(env1.equals(env2)).toBe(true);

      // 测试区间扰动敏感度：上限增加 1 必须打破等价性
      env2.updateInterval("i", 0, 1);
      expect(env1.equals(env2)).toBe(false);

      // 测试状态扰动敏感度：安全评级发生变更必须打破等价性
      const env3 = env1.clone();
      env3.get("i")!.init = InitState.TAINTED;
      expect(env1.equals(env3)).toBe(false);
    });
  });
});
