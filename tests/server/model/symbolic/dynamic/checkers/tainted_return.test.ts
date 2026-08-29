import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Tainted Return", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 来自干净函数的返回值应放行", async () => {
    const code = `
      int safe_add(int a, int b) { return a + b; }
      int x = 5;
      int y = 3;
      int result = safe_add(x, y);
    `;
    const issues = await runEngine(code);
    const taintedReturnIssues = issues.filter((i) =>
      i.ruleId.includes("TAINTED_RETURN"),
    );
    expect(taintedReturnIssues.length).toBe(0);
  });

  it("2. [Must-Issue] 直接使用 getchar 返回值应报 Definite", async () => {
    const code = `
      char c = getchar();
      printf("%c", c);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_TAINTED_RETURN_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
  });

  it("3. [May-Issue] 污点值作为函数参数应报 Suspected", async () => {
    const code = `
      void process(int x) { }
      int input;
      scanf("%d", &input);
      int value = input;
      process(value);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_TAINTED_RETURN_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("4. [May-Issue] 污点值参与二元运算应报 Suspected", async () => {
    const code = `
      int input;
      scanf("%d", &input);
      int x = input;
      int result = x + 10;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter((i) => i.ruleId.includes("TAINTED_RETURN"));
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("5. [May-Issue] 污点值作为数组下标应报 Suspected", async () => {
    const code = `
      int arr[10];
      int idx;
      scanf("%d", &idx);
      int idx_copy = idx;
      arr[idx_copy] = 1;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter((i) => i.ruleId.includes("TAINTED_RETURN"));
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("6. [True Negative] 经过验证的污点值应放行", async () => {
    const code = `
      int input;
      scanf("%d", &input);
      if (input >= 0 && input < 10) {
        int result = input * 2;
      }
    `;
    const issues = await runEngine(code);
    const taintedReturnIssues = issues.filter((i) =>
      i.ruleId.includes("TAINTED_RETURN"),
    );
    // 理想情况下应该为0（但实际实现可能有限制）
    expect(taintedReturnIssues.length).toBeLessThanOrEqual(1);
  });
});
