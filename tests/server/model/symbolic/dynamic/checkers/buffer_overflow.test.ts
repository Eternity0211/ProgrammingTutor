import { parseCode } from "../../../../../../src/server/model/symbolic/parser";
import { buildCFG } from "../../../../../../src/server/model/symbolic/dynamic/cfg";
import { AnalysisEngine } from "../../../../../../src/server/model/symbolic/dynamic/engine";
import { RawIssue } from "../../../../../../src/lib/types/symbolic-types";

describe("Dynamic Analysis Checker - Buffer Overflow", () => {
  async function runEngine(code: string): Promise<RawIssue[]> {
    const tree = await parseCode(code);
    const cfg = buildCFG(tree);
    const engine = new AnalysisEngine(cfg);
    return engine.run();
  }

  it("1. [True Negative] memcpy 长度在目标缓冲区内应放行", async () => {
    const code = `
      char dst[8];
      char src[8];
      memcpy(dst, src, 4);
    `;
    const issues = await runEngine(code);
    const bo = issues.filter((i) => i.ruleId.includes("BUFFER_OVERFLOW"));
    expect(bo.length).toBe(0);
  });

  it("2. [Must-Issue] memcpy 写入长度超过缓冲区应报 Definite", async () => {
    const code = `
      char dst[8];
      char src[16];
      memcpy(dst, src, 16);
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_BUFFER_OVERFLOW_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
    expect(definite[0].meta?.bufferName).toBe("dst");
  });

  it("3. [May-Issue] memcpy 写入长度未知时应报 Suspected", async () => {
    const code = `
      char dst[8];
      char src[16];
      int n;
      memcpy(dst, src, n);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_BUFFER_OVERFLOW_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("4. [May-Issue] strcpy 对变量源拷贝应报 Suspected", async () => {
    const code = `
      char dst[4];
      char src[10];
      strcpy(dst, src);
    `;
    const issues = await runEngine(code);
    const suspected = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_BUFFER_OVERFLOW_SUSPECTED",
    );
    expect(suspected.length).toBeGreaterThan(0);
  });

  it("5. [Must-Issue] strcpy 字面量超长应报 Definite", async () => {
    const code = `
      char dst[4];
      strcpy(dst, "abcdef");
    `;
    const issues = await runEngine(code);
    const definite = issues.filter(
      (i) => i.ruleId === "CPP_DYNAMIC_BUFFER_OVERFLOW_DEFINITE",
    );
    expect(definite.length).toBeGreaterThan(0);
  });
});
