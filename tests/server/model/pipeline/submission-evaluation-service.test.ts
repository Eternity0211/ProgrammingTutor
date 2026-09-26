jest.mock("@/lib/prisma", () => ({
  prisma: {
    codeSubmission: { findUnique: jest.fn(), update: jest.fn() },
    evaluationRun: { create: jest.fn(), update: jest.fn() },
    testCaseResult: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/server/model/symbolic/service", () => ({ analyzeCode: jest.fn() }));
jest.mock("@/lib/services/code-evaluation-llm-service", () => ({
  evaluateCodeWithLLM: jest.fn(),
}));
jest.mock("@/server/model/neural/codeAgent", () => ({ runCodeReviewAgent: jest.fn() }));
jest.mock("@/lib/services/graph-service", () => ({
  getAggregatedKnowledgeContext: jest.fn(),
}));
jest.mock("@/server/model/neural/navigationAgent", () => ({
  generateLearningNavigation: jest.fn(),
}));
jest.mock("@/server/model/neural/emotionAgent", () => ({
  generateEmotionalSupport: jest.fn(),
}));
jest.mock("@/server/actions/submission-actions", () => ({
  updateSubmissionStatus: jest.fn(),
}));

jest.mock("@/server/model/pipeline/runtime-harness", () => ({
  Judge0RuntimeHarness: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

import { prisma } from "@/lib/prisma";
import { analyzeCode } from "@/server/model/symbolic/service";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";
import { generateEmotionalSupport } from "@/server/model/neural/emotionAgent";
import { runCodeReviewAgent } from "@/server/model/neural/codeAgent";
import { Judge0RuntimeHarness } from "@/server/model/pipeline/runtime-harness";
import { evaluateSubmissionInsidePlatform } from "@/server/model/pipeline/submission-evaluation-service";

const execute = (Judge0RuntimeHarness as jest.Mock).mock.results[0].value
  .execute as jest.Mock;

const submission = {
  id: "code-1",
  submissionId: "submission-1",
  questionId: "question-1",
  language: "C++",
  code: "int main(){return 0;}",
  score: 72,
  metricScore: 20,
  testCaseScore: 80,
  question: {
    title: "hello",
    description: "print hello",
    testCases: [{ id: "case-1", input: "", expectedOutput: "" }],
  },
  submission: { assignment: { metrics: [] } },
};

describe("submission evaluation fact pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.codeSubmission.findUnique as jest.Mock).mockResolvedValue(submission);
    (prisma.evaluationRun.create as jest.Mock).mockResolvedValue({ id: "run-1" });
    (prisma.evaluationRun.update as jest.Mock).mockResolvedValue({});
    (prisma.codeSubmission.update as jest.Mock).mockResolvedValue({});
    (prisma.testCaseResult.update as jest.Mock).mockResolvedValue({});
    (prisma.$transaction as jest.Mock).mockImplementation((operations) =>
      Promise.all(operations),
    );
    (analyzeCode as jest.Mock).mockResolvedValue({
      errors: [],
      warnings: [],
      metadata: { parseTime: 1 },
    });
    execute.mockResolvedValue({
      status: "passed",
      output: "",
      error: "",
      runtimeMs: 2,
      memoryKb: 10,
      judgeStatusId: 3,
      judgeStatus: "Accepted",
    });
    (generateLearningNavigation as jest.Mock).mockResolvedValue({
      learning_navigation: { weaknesses: [], learning_path: [], recommended_exercises: [] },
    });
    (runCodeReviewAgent as jest.Mock).mockResolvedValue({
      reviewSummary: "发现高风险问题",
      causalAnalysis: "指针使用错误",
      suggestions: ["修复指针"],
      confidence: 0.9,
    });
    (generateEmotionalSupport as jest.Mock).mockResolvedValue({
      emotion_analysis: {
        detected_emotion: "平静",
        intensity: "弱",
        reason: "测试通过",
        supportive_guidance: "继续保持",
      },
    });
  });

  it("commits a completed run and the final score atomically", async () => {
    const result = await evaluateSubmissionInsidePlatform("code-1", {
      traceId: "trace-1",
    });

    expect(result).toMatchObject({
      evaluationRunId: "run-1",
      status: "COMPLETED",
      score: 100,
    });
    expect(prisma.evaluationRun.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ traceId: "trace-1" }) }),
    );
    expect(prisma.evaluationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", failureScope: null }),
      }),
    );
    expect(prisma.codeSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ score: 100 }) }),
    );
  });

  it("records symbolic blocking as a student issue without calling Judge0", async () => {
    (analyzeCode as jest.Mock).mockResolvedValue({
      errors: [{ severity: "High", knowledge_concept: "pointer" }],
      warnings: [],
      metadata: { parseTime: 1 },
    });

    const result = await evaluateSubmissionInsidePlatform("code-1");

    expect(result.status).toBe("BLOCKED");
    expect(execute).not.toHaveBeenCalled();
    expect(prisma.evaluationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "BLOCKED",
          failureScope: "student",
          failureKind: "symbolic",
        }),
      }),
    );
  });

  it("keeps the previous score when Judge0 is unavailable", async () => {
    execute.mockRejectedValue(new Error("connection refused"));

    await expect(evaluateSubmissionInsidePlatform("code-1")).rejects.toMatchObject({
      message: "Judge0 execution service is unavailable",
      evaluationRunId: "run-1",
      codeSubmissionId: "code-1",
      retryable: true,
    });

    expect(prisma.evaluationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED_RETRYABLE",
          failureScope: "platform",
          failureKind: "judge0_unavailable",
          retryable: true,
        }),
      }),
    );
    expect(prisma.codeSubmission.update).toHaveBeenCalledTimes(1);
    expect(prisma.codeSubmission.update).toHaveBeenCalledWith({
      where: { id: "code-1" },
      data: { codeEvaluationStatus: "PENDING" },
    });
  });
});
