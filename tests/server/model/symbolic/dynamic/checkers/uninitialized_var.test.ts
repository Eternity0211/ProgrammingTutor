import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Uninitialized Variable", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 已初始化变量的使用应该放行", async () => {
    const code = `
      int x = 5;
      int y = x + 1;
      printf("%d", y);
    `;
    const issues = await runEngine(code);
    const uninitIssues = issues.filter(i => i.ruleId.includes("UNINITIALIZED_VAR"));
    expect(uninitIssues.length).toBe(0);
  });

  it("2. [Must-Issue] 声明后直接使用未初始化变量应报 Definite", async () => {
    const code = `
      int z;
      int result = z * 2;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(i => i.ruleId === "CPP_DYNAMIC_UNINITIALIZED_VAR_DEFINITE");
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0].meta.varName).toBe("z");
  });

  it("3. [True Negative] 声明且初始化后使用应放行，即使值为 0", async () => {
    const code = `
      int count = 0;
      if (count < 10) {
        count++;
      }
    `;
    const issues = await runEngine(code);
    const uninitIssues = issues.filter(i => i.ruleId.includes("UNINITIALIZED_VAR"));
    expect(uninitIssues.length).toBe(0);
  });

  it("4. [Must-Issue] 函数参数未初始化使用应报 Definite", async () => {
    const code = `
      int a;
      int b;
      int sum = a + b;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(i => i.ruleId === "CPP_DYNAMIC_UNINITIALIZED_VAR_DEFINITE");
    expect(definite.length).toBeGreaterThan(0);
  });
});