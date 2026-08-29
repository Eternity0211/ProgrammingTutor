import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Tainted Pointer Dereference", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] 初始化的非污染指针解引用应放行", async () => {
    const code = `
      int *ptr = (int*)0x1000;
      int x = *ptr;
    `;
    const issues = await runEngine(code);
    const derefIssues = issues.filter((i) =>
      i.ruleId.includes("TAINTED_DEREF"),
    );
    expect(derefIssues.length).toBe(0);
  });

  it("2. [Must-Issue] 来自污点源的指针解引用应报 Suspected", async () => {
    const code = `
      int *ptr;
      scanf("%p", &ptr);
      int x = *ptr;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_TAINTED_DEREF_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
    expect(suspected[0]!.meta?.operationType).toBe("*");
  });

  it("3. [May-Issue] 污染指针的成员访问应报 Suspected", async () => {
    const code = `
      struct Node { int value; };
      Node *node;
      scanf("%p", &node);
      int v = node->value;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_TAINTED_DEREF_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("4. [True Negative] 经过验证的指针解引用应放行", async () => {
    const code = `
      int *ptr;
      if (ptr != NULL) {
        int x = *ptr;
      }
    `;
    const issues = await runEngine(code);
    const derefIssues = issues.filter((i) =>
      i.ruleId.includes("TAINTED_DEREF"),
    );
    expect(derefIssues.length).toBe(0);
  });

  it("5. [May-Issue] 来自函数返回值的指针解引用", async () => {
    const code = `
      int *getPtrFromUser() {
        int *p;
        scanf("%p", &p);
        return p;
      }
      int x = -1;
      int *result = getPtrFromUser();
      int v = *result;
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_TAINTED_DEREF_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });
});
