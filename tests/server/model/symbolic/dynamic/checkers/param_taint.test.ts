import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Parameter Taint", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 干净参数传递应放行", async () => {
    const code = `
      void sink(int x) { }
      int a = 1;
      sink(a);
    `;
    const issues = await runEngine(code);
    const pt = issues.filter((i) => i.ruleId.includes("PARAM_TAINT"));
    expect(pt.length).toBe(0);
  });

  it("2. [Must-Issue] 来自 scanf 的参数应报 Definite", async () => {
    const code = `
      void sink(int x) { }
      int a;
      scanf("%d", &a);
      sink(a);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_PARAM_TAINT_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0].meta?.paramName).toBe("a");
  });

  it("3. [May-Issue] 分支中可能被污染，传参应报 Suspected", async () => {
    const code = `
      void sink(int x) { }
      int flag;
      int a;
      if (flag > 0) {
        scanf("%d", &a);
      }
      sink(a);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_PARAM_TAINT_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("4. [May-Issue] 未初始化变量直接传参应报 Suspected", async () => {
    const code = `
      void sink(int x) { }
      int a;
      sink(a);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_PARAM_TAINT_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });
});
