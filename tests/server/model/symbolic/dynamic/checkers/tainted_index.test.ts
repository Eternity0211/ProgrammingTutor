import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Tainted Index", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 整数常量下标应放行", async () => {
    const code = `
      int arr[10];
      arr[5] = 1;
    `;
    const issues = await runEngine(code);
    const taintedIssues = issues.filter((i) =>
      i.ruleId.includes("TAINTED_INDEX"),
    );
    expect(taintedIssues.length).toBe(0);
  });

  it("2. [True Negative] 初始化变量下标应放行", async () => {
    const code = `
      int arr[10];
      int i = 3;
      arr[i] = 1;
    `;
    const issues = await runEngine(code);
    const taintedIssues = issues.filter((i) =>
      i.ruleId.includes("TAINTED_INDEX"),
    );
    expect(taintedIssues.length).toBe(0);
  });

  it("3. [Must-Issue] 来自输入源的下标应报 Definite", async () => {
    const code = `
      int arr[10];
      int idx;
      scanf("%d", &idx);
      arr[idx] = 1;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_TAINTED_INDEX_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0]!.meta?.indexName).toBe("idx");
  });

  it("4. [May-Issue] 由污点变量赋值的下标应报 Suspected", async () => {
    const code = `
      int arr[10];
      int idx;
      scanf("%d", &idx);
      int i = idx;
      arr[i] = 1;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_TAINTED_INDEX_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("5. [May-Issue] 条件分支中可能污染的下标应报 Suspected", async () => {
    const code = `
      int arr[10];
      int flag;
      int idx = 0;
      if (flag > 0) {
        scanf("%d", &idx);
      }
      arr[idx] = 1;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter((i) => i.ruleId.includes("TAINTED_INDEX"));
    expect(suspected.length).toBeGreaterThan(0);
  });
});
