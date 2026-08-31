import type { DialogueOrchestrator } from "../orchestrator";
import type {
  EvalActual,
  EvalReport,
  EvalResult,
  EvalTestCase,
} from "./eval-types";

export class EvalRunner {
  constructor(private orchestrator: DialogueOrchestrator) {}

  async runSingle(testCase: EvalTestCase): Promise<EvalResult> {
    const startTime = Date.now();
    let actual: EvalActual;

    try {
      const response = await this.orchestrator.chat(testCase.input);
      actual = {
        reply: response.reply,
        intent: response.intent,
        sessionId: response.sessionId,
        traceId: response.traceId,
        hasAgentResults: response.agentResults !== undefined,
        degraded: response.agentResults?.rag?.degraded === true,
      };
    } catch (error) {
      actual = {
        reply: "",
        intent: "THOUGHT_FOLLOWUP",
        sessionId: "",
        traceId: "",
        hasAgentResults: false,
        degraded: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const failures = this.assert(testCase.expected, actual);
    const durationMs = Date.now() - startTime;

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      passed: failures.length === 0,
      actual,
      failures,
      durationMs,
    };
  }

  async runAll(testCases: EvalTestCase[]): Promise<EvalReport> {
    const results: EvalResult[] = [];
    const startTime = Date.now();

    for (const tc of testCases) {
      results.push(await this.runSingle(tc));
    }

    const totalCases = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = totalCases - passed;
    const degradedCount = results.filter((r) => r.actual.degraded).length;

    return {
      totalCases,
      passed,
      failed,
      passRate: totalCases > 0 ? passed / totalCases : 0,
      degradationRate: totalCases > 0 ? degradedCount / totalCases : 0,
      results,
      totalDurationMs: Date.now() - startTime,
    };
  }

  private assert(
    expected: EvalTestCase["expected"],
    actual: EvalActual,
  ): string[] {
    const failures: string[] = [];

    if (expected.intent !== undefined && actual.intent !== expected.intent) {
      failures.push(
        `intent: expected "${expected.intent}", got "${actual.intent}"`,
      );
    }
    if (
      expected.replyContains !== undefined &&
      !actual.reply.includes(expected.replyContains)
    ) {
      failures.push(
        `replyContains: expected reply to contain "${expected.replyContains}"`,
      );
    }
    if (
      expected.degraded !== undefined &&
      actual.degraded !== expected.degraded
    ) {
      failures.push(
        `degraded: expected ${expected.degraded}, got ${actual.degraded}`,
      );
    }
    if (
      expected.hasAgentResults !== undefined &&
      actual.hasAgentResults !== expected.hasAgentResults
    ) {
      failures.push(
        `hasAgentResults: expected ${expected.hasAgentResults}, got ${actual.hasAgentResults}`,
      );
    }

    return failures;
  }
}
