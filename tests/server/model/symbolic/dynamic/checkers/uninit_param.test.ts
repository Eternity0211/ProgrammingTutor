import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Uninitialized Parameter", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 已初始化参数传递应放行", async () => {
    const code = `
      int process(int x) { return x * 2; }
      int a = 5;
      int b = process(a);
    `;
    const issues = await runEngine(code);
    const uninitParamIssues = issues.filter((i) =>
      i.ruleId.includes("UNINIT_PARAM"),
    );
    expect(uninitParamIssues.length).toBe(0);
  });

  it("2. [Must-Issue] 直接传递未初始化变量应报 Definite", async () => {
    const code = `
      int process(int x) { return x; }
      int a;
      int b = process(a);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_UNINIT_PARAM_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0]!.meta?.paramName).toBe("a");
  });

  it("3. [Must-Issue] 多个未初始化参数应逐一报告", async () => {
    const code = `
      int add(int x, int y) { return x + y; }
      int a;
      int b;
      int c = add(a, b);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_UNINIT_PARAM_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
  });

  it("4. [May-Issue] NULL_PTR 参数传递应报 Suspected", async () => {
    const code = `
      void process(int *p) { }
      int *ptr = nullptr;
      process(ptr);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_UNINIT_PARAM_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("5. [True Negative] 字面量参数应放行", async () => {
    const code = `
      int process(int x) { return x; }
      int b = process(42);
    `;
    const issues = await runEngine(code);
    const uninitParamIssues = issues.filter((i) =>
      i.ruleId.includes("UNINIT_PARAM"),
    );
    expect(uninitParamIssues.length).toBe(0);
  });
});
