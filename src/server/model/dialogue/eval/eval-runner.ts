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
        qualityScore: 0,
        ragSourceCount: response.agentResults?.rag?.sources.length ?? 0,
        ragAttempted: response.agentResults?.rag !== undefined,
        ragGrounded: response.agentResults?.rag?.grounded === true,
        ragCitationCount: response.agentResults?.rag?.citations.length ?? 0,
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
        qualityScore: 0,
        ragSourceCount: 0,
        ragAttempted: false,
        ragGrounded: false,
        ragCitationCount: 0,
      };
    }

    actual.qualityScore = this.qualityScore(testCase.expected, actual.reply);
    const failures = this.assert(testCase.expected, actual);
    const durationMs = Date.now() - startTime;
    if (
      testCase.expected.maxDurationMs !== undefined &&
      durationMs > testCase.expected.maxDurationMs
    ) {
      failures.push(
        `maxDurationMs: expected <= ${testCase.expected.maxDurationMs}, got ${durationMs}`,
      );
    }

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
    const averageQualityScore = totalCases > 0
      ? results.reduce((sum, result) => sum + result.actual.qualityScore, 0) / totalCases
      : 0;
    const ragCases = results.filter((result) => result.actual.ragAttempted);
    const ragHitCases = results.filter((result) => result.actual.ragSourceCount > 0);
    const groundedCases = ragCases.filter((result) => result.actual.ragGrounded);
    const unsupportedCases = ragCases.filter(
      (result) => !result.actual.ragGrounded && !result.actual.degraded,
    );
    const averageDurationMs = totalCases > 0
      ? results.reduce((sum, result) => sum + result.durationMs, 0) / totalCases
      : 0;

    return {
      totalCases,
      passed,
      failed,
      passRate: totalCases > 0 ? passed / totalCases : 0,
      degradationRate: totalCases > 0 ? degradedCount / totalCases : 0,
      averageQualityScore,
      ragHitRate: totalCases > 0 ? ragHitCases.length / totalCases : 0,
      citationCoverageRate: ragCases.length > 0
        ? groundedCases.filter((result) => result.actual.ragCitationCount > 0).length /
          ragCases.length
        : 0,
      groundedAnswerRate:
        ragCases.length > 0 ? groundedCases.length / ragCases.length : 0,
      unsupportedAnswerRate:
        ragCases.length > 0 ? unsupportedCases.length / ragCases.length : 0,
      averageDurationMs,
      failureRate: totalCases > 0
        ? results.filter((result) => Boolean(result.actual.error)).length / totalCases
        : 0,
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
    if (expected.minQualityScore !== undefined && this.qualityScore(expected, actual.reply) < expected.minQualityScore) {
      failures.push(`minQualityScore: expected >= ${expected.minQualityScore}`);
    }
    if (expected.minSourceCount !== undefined && actual.ragSourceCount < expected.minSourceCount) {
      failures.push(`minSourceCount: expected >= ${expected.minSourceCount}, got ${actual.ragSourceCount}`);
    }
    if (
      expected.minCitationCount !== undefined &&
      actual.ragCitationCount < expected.minCitationCount
    ) {
      failures.push(
        `minCitationCount: expected >= ${expected.minCitationCount}, got ${actual.ragCitationCount}`,
      );
    }
    if (expected.grounded !== undefined && actual.ragGrounded !== expected.grounded) {
      failures.push(`grounded: expected ${expected.grounded}, got ${actual.ragGrounded}`);
    }
    if (
      expected.replyNotContains !== undefined &&
      actual.reply.includes(expected.replyNotContains)
    ) {
      failures.push(
        `replyNotContains: expected reply not to contain "${expected.replyNotContains}"`,
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
    if (
      expected.traceIdPresent !== undefined &&
      (actual.traceId.length > 0) !== expected.traceIdPresent
    ) {
      failures.push(
        `traceIdPresent: expected ${expected.traceIdPresent}, got ${actual.traceId.length > 0}`,
      );
    }
    if (
      expected.sessionIdPresent !== undefined &&
      (actual.sessionId.length > 0) !== expected.sessionIdPresent
    ) {
      failures.push(
        `sessionIdPresent: expected ${expected.sessionIdPresent}, got ${actual.sessionId.length > 0}`,
      );
    }

    return failures;
  }

  private qualityScore(expected: EvalTestCase["expected"], reply: string): number {
    const keywords = expected.replyKeywords ?? [];
    if (keywords.length === 0) return expected.replyContains && reply.includes(expected.replyContains) ? 1 : 0;
    return keywords.filter((keyword) => reply.toLowerCase().includes(keyword.toLowerCase())).length / keywords.length;
  }
}
