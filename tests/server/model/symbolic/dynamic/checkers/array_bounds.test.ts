/**
 * @file array_bounds.test.ts
 * @description 动态分析规则单元测试 - 数组边界检查器 (Array Bounds Checker)。
 * 验证场景：
 * 1. 正常路径：合法范围内的数组读写。
 * 2. 必然越界：静态可确定的常数/偏移量越界 (Definite)。
 * 3. 疑似越界：循环/不确定控制流导致的部分区间溢出 (Suspected)。
 * 4. 复杂运算：包含加法、乘法计算后的下标探测。
 */

import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Array Bounds (OOB)", () => {

  /**
   * 集成测试辅助工具：运行全量 DFA 引擎并提取缺陷
   * @param code C++ 源代码
   */
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. 应该放行完全合法的安全数组访问 (无缺陷)", async () => {
    const code = `
      int arr[10];
      int i = 5;
      arr[i] = 1;
      arr[0] = 2;
      arr[9] = 3;
    `;
    const issues = await runEngine(code);
    
    // 过滤出 OOB 相关的缺陷，预期结果应为空
    const oobIssues = issues.filter(issue => issue.ruleId.includes("ARRAY_OOB"));
    expect(oobIssues.length).toBe(0);
  });

  it("2. 应该精准拦截必然越界 (Definite OOB) - 上界溢出", async () => {
    const code = `
      int scores[5];
      // 数组合法范围 [0, 4]，访问索引 5 必然崩溃
      scores[5] = 100; 
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBeGreaterThan(0);
    
    // 验证 Meta 元数据插值的准确性
    expect(definiteIssues[0].meta).toMatchObject({
      arrayName: "scores",
      maxValidIndex: 4,
      indexInterval: "[5, 5]"
    });
  });

  it("3. 应该精准拦截必然越界 (Definite OOB) - 负数索引异常", async () => {
    const code = `
      int buffer[100];
      int offset = -2;
      buffer[offset] = 0; 
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBeGreaterThan(0);
    expect(definiteIssues[0].meta?.indexInterval).toBe("[-2, -2]");
  });

  it("4. 应该通过表达式推演，发现经过复杂运算后的必然越界", async () => {
    const code = `
      int data[10];
      int base = 20;
      int multiplier = -1;
      // 符号演算：20 * -1 + 5 = -15，判定为必然越界
      data[base * multiplier + 5] = 99; 
    `;
    const issues = await runEngine(code);
    
    const definiteIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_DEFINITE");
    expect(definiteIssues.length).toBe(1);
    expect(definiteIssues[0].meta?.indexInterval).toBe("[-15, -15]");
  });

  it("5. 应该识别循环导致的发散风险，报出疑似越界 (Suspected OOB / May-Issue)", async () => {
    const code = `
      int arr[5];
      int i = 0;
      // 经典的“差一错误” (Off-by-one)：i 最大可达 5
      while (i <= 5) {
        arr[i] = 1;
        i++;
      }
    `;
    // 引擎推演结果：i 在进入循环体时区间为 [0, 5]。
    // 0-4 为合法，5 为非法，故判定为疑似 (Suspected)。
    
    const issues = await runEngine(code);
    
    const suspectedIssues = issues.filter(issue => issue.ruleId === "CPP_DYNAMIC_ARRAY_OOB_SUSPECTED");
    expect(suspectedIssues.length).toBeGreaterThan(0);
    
    // 验证区间汇聚结果
    expect(suspectedIssues[0].meta).toMatchObject({
      arrayName: "arr",
      maxValidIndex: 4,
      indexInterval: "[0, 5]"
    });
  });

});