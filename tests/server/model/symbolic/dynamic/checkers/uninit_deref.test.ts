import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Uninitialized Pointer Dereference", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 初始化的指针解引用应放行", async () => {
    const code = `
      int x = 42;
      int *ptr = &x;
      int y = *ptr;
    `;
    const issues = await runEngine(code);
    const derefIssues = issues.filter((i) =>
      i.ruleId.includes("UNINIT_DEREF"),
    );
    expect(derefIssues.length).toBe(0);
  });

  it("2. [Must-Issue] 未初始化指针解引用应报 Definite", async () => {
    const code = `
      int *ptr;
      int x = *ptr;
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_UNINIT_DEREF_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0].meta.operationType).toBe("*");
  });

  it("3. [May-Issue] 未初始化指针的成员访问应报 Suspected", async () => {
    const code = `
      struct Node { int value; };
      Node *node;
      int v = node->value;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_UNINIT_DEREF_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("4. [May-Issue] NULL初始化指针的解引用应报 Suspected", async () => {
    const code = `
      int *ptr = nullptr;
      int x = *ptr;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_UNINIT_DEREF_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("5. [True Negative] 条件检查后的安全解引用应放行", async () => {
    const code = `
      int *ptr;
      if (ptr != nullptr) {
        int x = *ptr;
      }
    `;
    const issues = await runEngine(code);
    const derefIssues = issues.filter((i) =>
      i.ruleId.includes("UNINIT_DEREF"),
    );
    expect(derefIssues.length).toBe(0);
  });

  it("6. [May-Issue] 循环中的未初始化指针解引用", async () => {
    const code = `
      int *ptr;
      for (int i = 0; i < 10; i++) {
        if (i == 5) {
          ptr = (int*)malloc(sizeof(int));
        }
        int x = *ptr;
      }
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_UNINIT_DEREF_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });
});
