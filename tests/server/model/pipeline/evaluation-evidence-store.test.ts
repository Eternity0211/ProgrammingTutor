jest.mock("@/lib/prisma", () => ({
  prisma: { evaluationRun: { findFirst: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { PrismaEvaluationEvidenceStore } from "@/server/model/pipeline/evaluation-evidence-store";

describe("PrismaEvaluationEvidenceStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns only completed evidence owned by the requesting student", async () => {
    (prisma.evaluationRun.findFirst as jest.Mock).mockResolvedValue({
      id: "run-1",
      codeSubmissionId: "code-1",
      status: "COMPLETED",
      payload: {
        symbolic: { errors: [], warnings: [], metadata: {} },
        testSummary: { total: 2, passed: 2, failed: 0 },
        aiFeedback: {
          reviewSummary: "通过",
          causalAnalysis: "没有阻断问题",
          suggestions: [],
          confidence: 0.9,
        },
      },
      codeSubmission: { code: "int main(){}", language: "C++" },
    });

    const evidence = await new PrismaEvaluationEvidenceStore().getByReference(
      "user-1",
      { evaluationRunId: "run-1" },
    );

    expect(prisma.evaluationRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "run-1",
          codeSubmission: {
            is: { submission: { is: { studentId: "user-1" } } },
          },
        }),
      }),
    );
    expect(evidence).toMatchObject({
      evaluationRunId: "run-1",
      testSummary: { total: 2, passed: 2, failed: 0 },
      agentResults: { codeReview: { reviewSummary: "通过" } },
    });
  });

  it("does not query without an explicit run or submission reference", async () => {
    const evidence = await new PrismaEvaluationEvidenceStore().getByReference(
      "user-1",
      {},
    );

    expect(evidence).toBeNull();
    expect(prisma.evaluationRun.findFirst).not.toHaveBeenCalled();
  });
});
