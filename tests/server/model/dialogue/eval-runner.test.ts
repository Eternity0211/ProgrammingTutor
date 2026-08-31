import { EvalRunner } from "@/server/model/dialogue/eval/eval-runner";
import type { EvalTestCase } from "@/server/model/dialogue/eval/eval-types";
import type { DialogueOrchestrator } from "@/server/model/dialogue/orchestrator/dialogue-orchestrator";
import type { DialogueResponse } from "@/server/model/dialogue/types";

function makeMockOrchestrator(
  response: Partial<DialogueResponse>,
): DialogueOrchestrator {
  return {
    chat: jest.fn().mockResolvedValue({
      reply: "mock reply",
      intent: "THOUGHT_FOLLOWUP",
      sessionId: "test-session",
      traceId: "test-trace",
      ...response,
    } as DialogueResponse),
  } as unknown as DialogueOrchestrator;
}

function makeThrowingOrchestrator(error: Error): DialogueOrchestrator {
  return {
    chat: jest.fn().mockRejectedValue(error),
  } as unknown as DialogueOrchestrator;
}

function makeTestCase(
  id: string,
  message: string,
  expected: EvalTestCase["expected"],
): EvalTestCase {
  return {
    id,
    name: id,
    input: { userId: "eval-user", message },
    expected,
  };
}

describe("EvalRunner.runSingle", () => {
  it("should pass when actual matches expected", async () => {
    const orchestrator = makeMockOrchestrator({
      reply: "指针是变量的内存地址",
      intent: "KNOWLEDGE_QUESTION",
      agentResults: {
        rag: {
          answer: "指针是变量的内存地址",
          sources: [],
          degraded: false,
        },
      },
    });
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("t1", "什么是指针？", {
        intent: "KNOWLEDGE_QUESTION",
        replyContains: "指针",
        degraded: false,
        hasAgentResults: true,
      }),
    );

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("should fail when intent does not match", async () => {
    const orchestrator = makeMockOrchestrator({
      intent: "KNOWLEDGE_QUESTION",
    });
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("t2", "什么是指针？", {
        intent: "CODE_SUBMISSION",
      }),
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("intent");
  });

  it("should fail when replyContains not found in reply", async () => {
    const orchestrator = makeMockOrchestrator({
      reply: "递归是函数调用自身",
      intent: "KNOWLEDGE_QUESTION",
    });
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("t3", "什么是递归？", {
        replyContains: "指针",
      }),
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("replyContains");
  });

  it("should fail when degraded does not match", async () => {
    const orchestrator = makeMockOrchestrator({
      intent: "KNOWLEDGE_QUESTION",
      agentResults: {
        rag: {
          answer: "answer",
          sources: [],
          degraded: false,
        },
      },
    });
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("t4", "什么是递归？", {
        degraded: true,
      }),
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("degraded");
  });

  it("should fail when hasAgentResults does not match", async () => {
    const orchestrator = makeMockOrchestrator({
      intent: "THOUGHT_FOLLOWUP",
    });
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("t5", "继续说说", {
        hasAgentResults: true,
      }),
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("hasAgentResults");
  });

  it("should fill actual with defaults when orchestrator throws", async () => {
    const orchestrator = makeThrowingOrchestrator(
      new Error("orchestrator down"),
    );
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("t6", "什么是指针？", {
        intent: "KNOWLEDGE_QUESTION",
      }),
    );

    expect(result.passed).toBe(false);
    expect(result.actual.reply).toBe("");
    expect(result.actual.intent).toBe("THOUGHT_FOLLOWUP");
    expect(result.actual.sessionId).toBe("");
    expect(result.actual.traceId).toBe("");
    expect(result.actual.hasAgentResults).toBe(false);
    expect(result.actual.degraded).toBe(false);
    expect(result.actual.error).toBe("orchestrator down");
  });

  it("should skip undefined expected fields", async () => {
    const orchestrator = makeMockOrchestrator({
      reply: "some reply",
      intent: "KNOWLEDGE_QUESTION",
    });
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("t7", "什么是指针？", {
        intent: "KNOWLEDGE_QUESTION",
      }),
    );

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });
});

describe("EvalRunner.runAll", () => {
  it("should generate report with correct totals", async () => {
    const orchestrator = makeMockOrchestrator({
      intent: "KNOWLEDGE_QUESTION",
      reply: "answer",
    });
    const runner = new EvalRunner(orchestrator);

    const cases = [
      makeTestCase("c1", "msg1", { intent: "KNOWLEDGE_QUESTION" }),
      makeTestCase("c2", "msg2", { intent: "KNOWLEDGE_QUESTION" }),
      makeTestCase("c3", "msg3", { intent: "CODE_SUBMISSION" }),
    ];

    const report = await runner.runAll(cases);

    expect(report.totalCases).toBe(3);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.results).toHaveLength(3);
  });

  it("should calculate passRate correctly", async () => {
    const orchestrator = makeMockOrchestrator({
      intent: "KNOWLEDGE_QUESTION",
      reply: "answer",
    });
    const runner = new EvalRunner(orchestrator);

    const cases = [
      makeTestCase("p1", "msg1", { intent: "KNOWLEDGE_QUESTION" }),
      makeTestCase("p2", "msg2", { intent: "KNOWLEDGE_QUESTION" }),
      makeTestCase("p3", "msg3", { intent: "KNOWLEDGE_QUESTION" }),
      makeTestCase("p4", "msg4", { intent: "CODE_SUBMISSION" }),
      makeTestCase("p5", "msg5", { intent: "CODE_SUBMISSION" }),
    ];

    const report = await runner.runAll(cases);

    expect(report.passRate).toBe(3 / 5);
  });

  it("should calculate degradationRate as degraded/total", async () => {
    const orchestrator = makeMockOrchestrator({
      intent: "KNOWLEDGE_QUESTION",
      reply: "answer",
      agentResults: {
        rag: {
          answer: "answer",
          sources: [],
          degraded: true,
        },
      },
    });
    const runner = new EvalRunner(orchestrator);

    const cases = [
      makeTestCase("d1", "msg1", {}),
      makeTestCase("d2", "msg2", {}),
      makeTestCase("d3", "msg3", {}),
      makeTestCase("d4", "msg4", {}),
      makeTestCase("d5", "msg5", {}),
    ];

    const report = await runner.runAll(cases);

    expect(report.degradationRate).toBe(5 / 5);
  });

  it("should collect multiple failures for one case", async () => {
    const orchestrator = makeMockOrchestrator({
      reply: "hello",
      intent: "KNOWLEDGE_QUESTION",
    });
    const runner = new EvalRunner(orchestrator);

    const result = await runner.runSingle(
      makeTestCase("m1", "msg", {
        intent: "CODE_SUBMISSION",
        replyContains: "指针",
        hasAgentResults: true,
        degraded: true,
      }),
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(4);
  });

  it("should record durationMs in report", async () => {
    const orchestrator = makeMockOrchestrator({
      intent: "KNOWLEDGE_QUESTION",
      reply: "answer",
    });
    const runner = new EvalRunner(orchestrator);

    const cases = [
      makeTestCase("dur1", "msg1", { intent: "KNOWLEDGE_QUESTION" }),
      makeTestCase("dur2", "msg2", { intent: "KNOWLEDGE_QUESTION" }),
    ];

    const report = await runner.runAll(cases);

    expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.results[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(report.results[1].durationMs).toBeGreaterThanOrEqual(0);
  });
});
