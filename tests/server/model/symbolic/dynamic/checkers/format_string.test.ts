import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Format String", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] printf 使用字面量格式串应放行", async () => {
    const code = `
      int x = 1;
      printf("%d", x);
    `;
    const issues = await runEngine(code);
    const fs = issues.filter((i) => i.ruleId.includes("FORMAT_STRING"));
    expect(fs.length).toBe(0);
  });

  it("2. [Must-Issue] 未初始化格式串应报 Definite", async () => {
    const code = `
      char fmt[16];
      printf(fmt);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter((i) => i.ruleId === "CPP_DYNAMIC_FORMAT_STRING_DEFINITE");
    expect(definite.length).toBeGreaterThan(0);
  });

  it("3. [May-Issue] 非字面量格式串应报 Suspected", async () => {
    const code = `
      char *input;
      char *fmt = input;
      printf(fmt);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter((i) => i.ruleId === "CPP_DYNAMIC_FORMAT_STRING_SUSPECTED");
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("4. [True Negative] fprintf 第二参数为字面量应放行", async () => {
    const code = `
      int x = 2;
      fprintf(stdout, "value=%d", x);
    `;
    const issues = await runEngine(code);
    const fs = issues.filter((i) => i.ruleId.includes("FORMAT_STRING"));
    expect(fs.length).toBe(0);
  });
});
