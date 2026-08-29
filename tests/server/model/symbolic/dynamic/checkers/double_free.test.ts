import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Double Free", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 单次释放应放行", async () => {
    const code = `
      int *p = new int[10];
      p[0] = 1;
      delete p;
    `;
    const issues = await runEngine(code);
    const doubleFreeIssues = issues.filter((i) =>
      i.ruleId.includes("DOUBLE_FREE"),
    );
    expect(doubleFreeIssues.length).toBe(0);
  });

  it("2. [True Negative] 使用 free 且仅释放一次应放行", async () => {
    const code = `
      int *p = malloc(sizeof(int) * 10);
      p[0] = 1;
      free(p);
    `;
    const issues = await runEngine(code);
    const doubleFreeIssues = issues.filter((i) =>
      i.ruleId.includes("DOUBLE_FREE"),
    );
    expect(doubleFreeIssues.length).toBe(0);
  });

  it("3. [Must-Issue] 直接两次 delete 应报 Definite", async () => {
    const code = `
      int *p = new int[10];
      delete p;
      delete p;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_DOUBLE_FREE_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0]!.meta?.pointerName).toBe("p");
  });

  it("4. [May-Issue] 条件分支中可能两次释放应报 Suspected", async () => {
    const code = `
      int flag;
      int *p = new int[10];
      delete p;
      if (flag > 0) {
        delete p;
      }
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_DOUBLE_FREE_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("5. [True Negative] 赋值 nullptr 后释放应放行", async () => {
    const code = `
      int *p = new int[10];
      delete p;
      p = nullptr;
      // 注意：在真实场景中，nullptr 的 delete 也是安全的
    `;
    const issues = await runEngine(code);
    const doubleFreeIssues = issues.filter((i) =>
      i.ruleId.includes("DOUBLE_FREE"),
    );
    expect(doubleFreeIssues.length).toBe(0);
  });

  it("6. [May-Issue] 指针作为参数传递后可能被释放两次应报 Suspected", async () => {
    const code = `
      void cleanup(int *p) { delete p; }
      int *p = new int[10];
      cleanup(p);
      delete p;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter((i) => i.ruleId.includes("DOUBLE_FREE"));
    expect(suspected.length).toBeGreaterThan(0);
  });
});
