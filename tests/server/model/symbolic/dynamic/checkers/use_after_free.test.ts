import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Use After Free", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 释放前使用，释放后不再访问，应放行", async () => {
    const code = `
      int *p = new int[2];
      p[0] = 1;
      delete p;
    `;
    const issues = await runEngine(code);
    const uafIssues = issues.filter((i) => i.ruleId.includes("USE_AFTER_FREE"));
    expect(uafIssues.length).toBe(0);
  });

  it("2. [Must-Issue] delete 后解引用 *p 应报 Definite", async () => {
    const code = `
      int *p = new int[2];
      delete p;
      *p = 7;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0].meta?.pointerName).toBe("p");
  });

  it("3. [May-Issue] 条件分支中可能 delete，后续访问应报 Suspected", async () => {
    const code = `
      int flag;
      int *p = new int[1];
      if (flag > 0) {
        delete p;
      }
      *p = 1;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
    expect(String(suspected[0].meta?.freeState)).toContain("1");
  });

  it("4. [Must-Issue] delete 后箭头访问 p->x 应报 Definite", async () => {
    const code = `
      struct S { int x; };
      S *p = new S[1];
      delete p;
      p->x = 3;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
  });

  it("5. [May-Issue] delete 后作为参数传递，应报 Suspected", async () => {
    const code = `
      void foo(int *x) { }
      int *p = new int[1];
      delete p;
      foo(p);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_USE_AFTER_FREE_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });
});
