import { prisma } from "@/lib/prisma";
import type { SymbolicResult } from "@/lib/types/symbolic-types";
import type { DialogueAgentResults } from "@/server/model/dialogue/types";
import {
  codeReviewAgentResultSchema,
  emotionAgentResultSchema,
  navigationAgentResultSchema,
} from "@/server/model/dialogue/types/agent-results";

export interface EvaluationEvidence {
  evaluationRunId: string;
  codeSubmissionId: string;
  status: "COMPLETED" | "BLOCKED";
  code: string;
  language: string;
  symbolic?: SymbolicResult;
  testSummary?: { total: number; passed: number; failed: number };
  agentResults?: DialogueAgentResults;
}

export interface EvaluationEvidenceStore {
  getByReference(
    userId: string,
    reference: { evaluationRunId?: string; codeSubmissionId?: string },
  ): Promise<EvaluationEvidence | null>;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export class PrismaEvaluationEvidenceStore implements EvaluationEvidenceStore {
  async getByReference(
    userId: string,
    reference: { evaluationRunId?: string; codeSubmissionId?: string },
  ): Promise<EvaluationEvidence | null> {
    if (!reference.evaluationRunId && !reference.codeSubmissionId) return null;

    const run = await prisma.evaluationRun.findFirst({
      where: {
        ...(reference.evaluationRunId
          ? { id: reference.evaluationRunId }
          : { codeSubmissionId: reference.codeSubmissionId }),
        codeSubmission: {
          is: { submission: { is: { studentId: userId } } },
        },
        status: { in: ["COMPLETED", "BLOCKED"] },
      },
      orderBy: { createdAt: "desc" },
      include: { codeSubmission: true },
    });
    if (!run) return null;
    if (run.status !== "COMPLETED" && run.status !== "BLOCKED") return null;

    const payload = record(run.payload);
    const codeReviewCandidate = payload ? record(payload.aiFeedback) : null;
    const navigationEnvelope = payload ? record(payload.navigation) : null;
    const emotionEnvelope = payload ? record(payload.emotion) : null;
    const codeReview = codeReviewAgentResultSchema.safeParse(
      codeReviewCandidate,
    );
    const navigation = navigationAgentResultSchema.safeParse(
      navigationEnvelope?.learning_navigation,
    );
    const emotion = emotionAgentResultSchema.safeParse(
      emotionEnvelope?.emotion_analysis,
    );
    const agentResults: DialogueAgentResults = {
      ...(codeReview.success ? { codeReview: codeReview.data } : {}),
      ...(navigation.success ? { navigation: navigation.data } : {}),
      ...(emotion.success ? { emotion: emotion.data } : {}),
    };
    const testSummary = payload ? record(payload.testSummary) : null;

    return {
      evaluationRunId: run.id,
      codeSubmissionId: run.codeSubmissionId,
      status: run.status,
      code: run.codeSubmission.code,
      language: run.codeSubmission.language,
      ...(payload?.symbolic
        ? { symbolic: payload.symbolic as unknown as SymbolicResult }
        : {}),
      ...(testSummary &&
      typeof testSummary.total === "number" &&
      typeof testSummary.passed === "number" &&
      typeof testSummary.failed === "number"
        ? {
            testSummary: {
              total: testSummary.total,
              passed: testSummary.passed,
              failed: testSummary.failed,
            },
          }
        : {}),
      ...(Object.keys(agentResults).length > 0 ? { agentResults } : {}),
    };
  }
}
