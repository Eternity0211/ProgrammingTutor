import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Null Dereference", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 常量非零地址 解除引用应放行", async () => {
    const code = `
      int *p = (int*)4;
      *p = 1;
    `;
    const issues = await runEngine(code);
    const nissues = issues.filter((i) => i.ruleId.includes("NULL_DEREF"));
    expect(nissues.length).toBe(0);
  });

  it("2. [Must-Issue] 常量 nullptr 解除引用应报 Definite", async () => {
    const code = `
      int *p = 0;
      *p = 2;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_NULL_DEREF_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0]!.meta?.pointerInterval).toBe("[0, 0]");
  });

  it("3. [May-Issue] 未初始化指针或未知地址 => Suspected", async () => {
    const code = `
      int *p;
      *p = 7;
    `;
    const issues = await runEngine(code);
    const suspect = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_NULL_DEREF_SUSPECTED",
    );
    expect(suspect.length).toBeGreaterThan(0);
    expect(suspect[0]!.meta?.pointerInterval).toContain("Infinity");
  });

  it("4. [May-Issue] 箭头访问也应被检测", async () => {
    const code = `
      struct S { int x; };
      S *q;
      q->x = 3;
    `;
    const issues = await runEngine(code);
    const suspect = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_NULL_DEREF_SUSPECTED",
    );
    expect(suspect.length).toBeGreaterThan(0);
  });
});
