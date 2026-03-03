/**
 * @file array_bounds.test.ts
 * @description 动态流分析引擎单元测试 - 数组内存边界检查器 (Array Bounds Checker)。
 * * @test_suite 核心验证矩阵 (Verification Matrix)：
 * =========================================================================================
 * | 测试维度 (Dimension) | 缺陷定性 (Severity) | 核心覆盖场景 (Scenarios)                     |
 * |----------------------|---------------------|----------------------------------------------|
 * | 1. 基础安全防御      | True Negative       | 静态数组极值安全、多维解包安全、堆内存安全   |
 * | 2. 绝对内存违规      | Must-Issue (Error)  | 常量上界溢出、负数下界击穿、算术推演越界     |
 * | 3. 潜在溢出风险      | May-Issue (Warning) | 循环控制流发散 (Off-by-one)、外部未知变量越界|
 * | 4. V2 架构进阶       | Infrastructure      | 多维 AST 深层解包、Heap 动态大小追踪、逆向剪枝|
 * =========================================================================================
 * * @module Tests/Symbolic/Dynamic/Checkers/ArrayBounds
 */

import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Array Bounds (OOB)", () => {

  /**
   * [测试基建] 运行全链路数据流分析引擎并提取缺陷报告
   * @param code - 待扫描的 C++ 源代码片段
   * @returns {Promise<RawIssue[]>} 引擎抛出的所有底层缺陷记录
   */
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  // =======================================================================
  // 🛡️ Phase 1: 基础越界与安全验证 (Basic Bounds & Safety)
  // =======================================================================

  /**
   * @purpose 验证引擎在处理合法的常量索引访问时，能够正确识别安全边界，绝不产生误报（False Positive）。
   */
  it("1. [True Negative] 应该精准放行合法区间内的静态数组访问 (确保零误报)", async () => {
    const code = `
      int arr[10];
      int i = 5;
      arr[i] = 1; // 常规内部区间: [5, 5]
      arr[0] = 2; // 贴地飞行: 极小值安全
      arr[9] = 3; // 擦边飞行: 极大值安全
    `;
    const issues = await runEngine(code);
    
    // 【断言】：引擎不应在合法边界内产生任何扰民的 OOB 报警
    const oobIssues = issues.filter(issue => issue.ruleId.includes("ARRAY_OOB"));
    expect(oobIssues.length).toBe(0);
  });

  /**
   * @purpose 验证引擎能够准确捕获最基础的常量数组越界，并确认为必然发生的致命错误（Must-Issue）。
   */
  it("2. [Must-Issue] 应该精准拦截静态可确定的上界溢出 (Definite OOB)", async () => {
    const code = `
      int scores[5];
      scores[5] = 100; // 物理越界：合法索引上限为 4
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBeGreaterThan(0);
    
    // 【断言】：验证模板插值的上下文元数据 (Meta) 是否完美生成，以便前端渲染精准的错误提示
    expect(definiteIssues[0].meta).toMatchObject({
      arrayName: "scores",
      maxValidIndex: 4,
      indexInterval: "[5, 5]"
    });
  });

  /**
   * @purpose 验证引擎对负数索引等非法内存下界击穿场景的识别能力，防止指针向前越界。
   */
  it("3. [Must-Issue] 应该精准拦截下界击穿引发的负数索引内存违规", async () => {
    const code = `
      int buffer[100];
      int offset = -2;
      buffer[offset] = 0; // 物理越界：访问了数组头部之前的脏内存
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBeGreaterThan(0);
    expect(definiteIssues[0].meta?.indexInterval).toBe("[-2, -2]");
  });

  /**
   * @purpose 测试符号执行引擎在跨语句的多元算术推演下，是否依然保持精确的数学区间折叠计算能力。
   */
  it("4. [Must-Issue] 应该通过算术推演，揪出隐藏在复杂表达式背后的必然越界", async () => {
    const code = `
      int data[10];
      int base = 20;
      int multiplier = -1;
      // DFA 引擎推导：20 * -1 + 5 = -15，确凿的负数越界
      data[base * multiplier + 5] = 99; 
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBe(1);
    expect(definiteIssues[0].meta?.indexInterval).toBe("[-15, -15]");
  });

  /**
   * @purpose 验证基于控制流加宽（Widening）特性的潜在风险捕获能力，即区分“必定越界”与“可能越界”。
   */
  it("5. [May-Issue] 应该识别循环导致的发散风险，报出疑似越界 (Off-by-one 差一错误)", async () => {
    const code = `
      int arr[5];
      int i = 0;
      // 控制流边界：因使用 '<='，i 最终将被引擎加宽且约束收敛于 [0, 5]
      while (i <= 5) {
        arr[i] = 1;
        i++;
      }
    `;
    const issues = await runEngine(code);
    
    const suspectedIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_SUSPECTED");
    expect(suspectedIssues.length).toBeGreaterThan(0);
    
    // 【断言】：区间 [0, 5] 中 '5' 已越界但 '0-4' 安全，符合保守警告特征，不应误报为 Must-Issue
    expect(suspectedIssues[0].meta).toMatchObject({
      arrayName: "arr",
      maxValidIndex: 4,
      indexInterval: "[0, 5]"
    });
  });

  // =======================================================================
  // 🚀 Phase 2: V2 架构进阶能力极限测试 (Advanced Architecture)
  // =======================================================================

  /**
   * @purpose 测试引擎解析器对 C++ 嵌套 AST 结构（如 `arr[i][j]` 对应嵌套的 subscript_expression）的纵深解包能力。
   */
  it("6. [Must-Issue] 应该支持多维数组 (Multi-dimensional) 的深层解包与拦截", async () => {
    const code = `
      int matrix[10][5];
      int i = 12;
      // 降维打击：在最高维 (第 0 维) 发生 12 > 9 的越界
      matrix[i][0] = 1;
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBeGreaterThan(0);
    
    // 【断言】：确保引擎能穿透 'matrix[i][0]' 的两层 AST 壳，精准提取根标识符 'matrix'
    expect(definiteIssues[0].meta).toMatchObject({
      arrayName: "matrix",
      maxValidIndex: 9,
      indexInterval: "[12, 12]"
    });
  });

  /**
   * @purpose 验证引擎不仅支持静态声明，也能动态解析 `new` 操作符产生的堆内存边界，实现高级指针追踪。
   */
  it("7. [Must-Issue] 应该支持基于 new 关键字分配的堆内存 (Heap Allocation) 越界追踪", async () => {
    const code = `
      int n = 10;
      int* ptr = new int[n]; // 动态堆内存分配
      ptr[10] = 99;          // 越界：最大合法索引应为 9
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBeGreaterThan(0);
    
    // 【断言】：验证引擎能从 new_expression 树节点中反向抽取 size 并挂载于 ptr 账本
    expect(definiteIssues[0].meta).toMatchObject({
      arrayName: "ptr",
      maxValidIndex: 9,
      indexInterval: "[10, 10]"
    });
  });

  /**
   * @purpose 验证底层分支裁剪器（Branch Refiner）在面对左右操作数颠倒时的物理剪枝鲁棒性。
   */
  it("8. [May-Issue] 应该智能识别反向条件约束 (如 5 >= i) 并精准实施物理剪枝", async () => {
    const code = `
      int arr[5];
      int i = 0;
      // 变量倒置：操作符右侧存在变量，等价于 i <= 5
      while (5 >= i) {
        arr[i] = 1; 
        i++;
      }
    `;
    const issues = await runEngine(code);
    
    const suspectedIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_SUSPECTED");
    expect(suspectedIssues.length).toBeGreaterThan(0);
    
    // 【断言】：验证引擎底层 refineBranchState 已完全具备运算符反转计算能力
    expect(suspectedIssues[0].meta).toMatchObject({
      arrayName: "arr",
      maxValidIndex: 4,
      indexInterval: "[0, 5]"
    });
  });

  /**
   * @purpose 证明 V2 进阶架构在处理指针、多维数组等高阶特性时，底盘依然稳固，未引入额外的误报率。
   */
  it("9. [True Negative] 应该精准放行高级结构 (多维数组/堆内存) 的极限安全访问", async () => {
    const code = `
      int matrix[10][5];
      matrix[9][0] = 1; // 压线安全访问

      int n = 5;
      int* ptr = new int[n];
      ptr[4] = 99;      // 压线安全访问
    `;
    const issues = await runEngine(code);
    
    // 【断言】：确保 V2 引擎在解包复杂 AST 和追踪堆内存时，不存在错误计算导致的误报
    const oobIssues = issues.filter(issue => issue.ruleId.includes("ARRAY_OOB"));
    expect(oobIssues.length).toBe(0);
  });

  /**
   * @purpose 验证引擎面对未知输入源或未初始化污点数据（Tainted Data）时的降级防御机制。
   */
  it("10. [May-Issue] 应该在面临未知变量（外部输入或未初始化）作为索引时，实施保守安全预警", async () => {
    const code = `
      int arr[10];
      int k; 
      // 污点/未知变量 k 无法确定极值，引擎推导其区间为 [-Infinity, Infinity]
      arr[k] = 99;
    `;
    const issues = await runEngine(code);
    
    const suspectedIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_SUSPECTED");
    expect(suspectedIssues.length).toBeGreaterThan(0);
    
    // 【断言】：当区间发散到极致时，不应当错报 Must-Issue，而必须退化为 May-Issue 保守预警，将判断权交还给用户
    expect(suspectedIssues[0].meta).toMatchObject({
      arrayName: "arr",
      maxValidIndex: 9,
      indexInterval: "[-Infinity, Infinity]"
    });
  });

});