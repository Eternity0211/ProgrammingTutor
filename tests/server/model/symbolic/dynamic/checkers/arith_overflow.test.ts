import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Arithmetic Overflow", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 普通加减乘在 int 范围内应放行", async () => {
    const code = `
      int a = 100;
      int b = 200;
      int c = a + b;
      int d = b - a;
      int e = a * 10;
    `;
    const issues = await runEngine(code);
    const overflow = issues.filter((i) => i.ruleId.includes("ARITH_OVERFLOW"));
    expect(overflow.length).toBe(0);
  });

  it("2. [Must-Issue] INT_MAX + 1 应报 Definite", async () => {
    const code = `
      int a = 2147483647;
      int b = 1;
      int c = a + b;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter((i) => i.ruleId === "CPP_DYNAMIC_ARITH_OVERFLOW_DEFINITE");
    expect(definite.length).toBeGreaterThan(0);
  });

  it("3. [Must-Issue] INT_MIN - 1 应报 Definite", async () => {
    const code = `
      int a = -2147483648;
      int b = 1;
      int c = a - b;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter((i) => i.ruleId === "CPP_DYNAMIC_ARITH_OVERFLOW_DEFINITE");
    expect(definite.length).toBeGreaterThan(0);
  });

  it("4. [May-Issue] 未知变量参与运算应报 Suspected", async () => {
    const code = `
      int x;
      int y = x + 2147483647;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter((i) => i.ruleId === "CPP_DYNAMIC_ARITH_OVERFLOW_SUSPECTED");
    expect(suspected.length).toBeGreaterThan(0);
  });
});
