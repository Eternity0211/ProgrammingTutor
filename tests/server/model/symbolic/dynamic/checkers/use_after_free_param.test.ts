import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Use-After-Free Parameter", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 有效指针参数应放行", async () => {
    const code = `
      void process(int *ptr) { *ptr = 42; }
      int *p = (int*)malloc(sizeof(int));
      process(p);
    `;
    const issues = await runEngine(code);
    const uafIssues = issues.filter((i) =>
      i.ruleId.includes("USE_AFTER_FREE_PARAM"),
    );
    expect(uafIssues.length).toBe(0);
  });

  it("2. [Must-Issue] 释放后传递应报 Definite", async () => {
    const code = `
      void process(int *ptr) { }
      int *p = (int*)malloc(sizeof(int));
      free(p);
      process(p);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_PARAM_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0].meta.paramName).toBe("p");
  });

  it("3. [True Negative] 释放前传递应放行", async () => {
    const code = `
      void process(int *ptr) { *ptr = 42; }
      int *p = (int*)malloc(sizeof(int));
      process(p);
      free(p);
    `;
    const issues = await runEngine(code);
    const uafIssues = issues.filter((i) =>
      i.ruleId.includes("USE_AFTER_FREE_PARAM"),
    );
    expect(uafIssues.length).toBe(0);
  });

  it("4. [May-Issue] 条件释放后的可能释放申传递应报 Suspected", async () => {
    const code = `
      void process(int *ptr) { }
      int *p = (int*)malloc(sizeof(int));
      if (someCondition) {
        free(p);
      }
      process(p);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_PARAM_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("5. [Must-Issue] delete后传递应报 Definite", async () => {
    const code = `
      void process(int *ptr) { }
      int *p = new int(42);
      delete p;
      process(p);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_PARAM_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
  });

  it("6. [May-Issue] 多参数函数中的释放后使用", async () => {
    const code = `
      void combine(int *a, int *b) { }
      int *p1 = (int*)malloc(sizeof(int));
      int *p2 = (int*)malloc(sizeof(int));
      free(p1);
      combine(p1, p2);
    `;
    const issues = await runEngine(code);
    const uaf = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_PARAM_DEFINITE",
    );
    expect(uaf.length).toBeGreaterThan(0);
    expect(uaf[0].meta.paramName).toBe("p1");
  });
});
