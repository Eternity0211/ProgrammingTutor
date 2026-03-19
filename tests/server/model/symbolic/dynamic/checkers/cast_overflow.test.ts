import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Cast Overflow", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 在目标类型范围内的转换应放行", async () => {
    const code = `
      int x = 100;
      char c = (char)x;
    `;
    const issues = await runEngine(code);
    const co = issues.filter((i) => i.ruleId.includes("CAST_OVERFLOW"));
    expect(co.length).toBe(0);
  });

  it("2. [Must-Issue] 超出 char 范围的转换应报 Definite", async () => {
    const code = `
      int x = 300;
      char c = (char)x;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_CAST_OVERFLOW_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
  });

  it("3. [Must-Issue] 负数转 unsigned char 应报 Definite", async () => {
    const code = `
      int x = -1;
      unsigned char c = (unsigned char)x;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_CAST_OVERFLOW_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
  });

  it("4. [May-Issue] 未知变量转换应报 Suspected", async () => {
    const code = `
      int x;
      char c = (char)x;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_CAST_OVERFLOW_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });
});
