import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Division By Zero", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 非零除数应该不会报错", async () => {
    const code = `
      int a = 10;
      int b = 2;
      int c = a / b;    // 5
      int d = a % 3;    // 1
      int x = 5;
      int y = x / 1;    // 5
    `;
    const issues = await runEngine(code);
    const divIssues = issues.filter((i) => i.ruleId.includes("DIV_ZERO"));
    expect(divIssues.length).toBe(0);
  });

  it("2. [Must-Issue] 常量零除法应被标记为 Definite", async () => {
    const code = `
      int a = 5;
      int b = 0;
      int c = a / b;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_DIV_ZERO_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0]!.meta?.divisorInterval).toBe("[0, 0]");
  });

  it("3. [May-Issue] 未初始化或未知变量作为除数时应发出保守预警", async () => {
    const code = `
      int a = 5;
      int i;              // 未初始化，环境推导为 [-Infinity, Infinity]
      int c = a / i;
    `;
    const issues = await runEngine(code);
    const suspect = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_DIV_ZERO_SUSPECTED",
    );
    expect(suspect.length).toBeGreaterThan(0);
    // 未初始化变量的区间通常为 [-Infinity, Infinity]
    expect(suspect[0]!.meta?.divisorInterval).toContain("Infinity");
  });
});
