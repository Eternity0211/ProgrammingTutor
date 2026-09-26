import { CodeEvaluationStatus, Prisma, TestCaseStatus } from "@prisma/client";
import { LANGUAGE_ID_MAP } from "@/config/constants";
import { getAggregatedKnowledgeContext } from "@/lib/services/graph-service";
import { evaluateCodeWithLLM } from "@/lib/services/code-evaluation-llm-service";
import { prisma } from "@/lib/prisma";
import { updateSubmissionStatus } from "@/server/actions/submission-actions";
import { runCodeReviewAgent } from "@/server/model/neural/codeAgent";
import { generateEmotionalSupport } from "@/server/model/neural/emotionAgent";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";
import { analyzeCode } from "@/server/model/symbolic/service";
import {
  EvaluationPlatformError,
  EvaluationRunPlatformError,
  classifyEvaluationError,
} from "./evaluation-failure";
import { Judge0RuntimeHarness } from "./runtime-harness";
import {
  createConfiguredTraceSink,
  TraceLogger,
} from "@/server/model/dialogue/shared/trace-logger";
import { recordEvaluationOutcome } from "@/server/observability/metrics";

const runtimeHarness = new Judge0RuntimeHarness();

function hasSymbolicBlockingIssues(
  symbolicErrors: { severity: string }[],
): boolean {
  return symbolicErrors.some(
    (issue) => issue.severity === "Critical" || issue.severity === "High",
  );
}

export async function evaluateSubmissionInsidePlatform(
  codeSubmissionId: string,
  options: {
    traceId?: string;
    retryOfRunId?: string;
    attempt?: number;
  } = {},
) {
  const codeSubmission = await prisma.codeSubmission.findUnique({
    where: { id: codeSubmissionId },
    include: {
      question: { include: { testCases: true } },
      submission: {
        include: {
          assignment: { include: { metrics: { include: { metric: true } } } },
        },
      },
    },
  });

  if (!codeSubmission) {
    throw new Error(`Code submission ${codeSubmissionId} not found`);
  }

  const evaluationRun = await prisma.evaluationRun.create({
    data: {
      codeSubmissionId,
      submissionId: codeSubmission.submissionId,
      questionId: codeSubmission.questionId,
      language: codeSubmission.language,
      branch: "pending",
      traceId: options.traceId,
      status: "RUNNING",
      retryOfRunId: options.retryOfRunId,
      attempt: options.attempt ?? 1,
    },
  });
  const traceLogger = new TraceLogger(
    options.traceId ?? evaluationRun.traceId ?? undefined,
    undefined,
    codeSubmission.submission.studentId,
    createConfiguredTraceSink(),
  );
  const evaluationSpan = traceLogger.startSpan("evaluation.run");
  let finalStatus = "RUNNING";
  let finalFailureKind: string | undefined;
  let finalError: string | undefined;
  traceLogger.logEvent("info", "evaluation.started", {
    evaluationRunId: evaluationRun.id,
    codeSubmissionId,
  });

  try {
    const symbolicSpan = traceLogger.startSpan("evaluation.symbolic", evaluationSpan);
    const symbolic = await analyzeCode(codeSubmission.code);
    traceLogger.endSpan(symbolicSpan, {
      errors: symbolic.errors.length,
      warnings: symbolic.warnings.length,
    });
    const blocking = hasSymbolicBlockingIssues(symbolic.errors);
    let testCaseScore = 0;
    let passedCount = 0;
    const totalCount = codeSubmission.question.testCases.length;

    if (!blocking) {
      const mappedLanguageId =
        LANGUAGE_ID_MAP[
          codeSubmission.language as keyof typeof LANGUAGE_ID_MAP
        ];
      const cppLanguageOverride = Number(process.env.JUDGE0_CPP_LANGUAGE_ID);
      const languageId =
        codeSubmission.language === "C++" &&
        Number.isFinite(cppLanguageOverride) &&
        cppLanguageOverride > 0
          ? cppLanguageOverride
          : mappedLanguageId;

      if (languageId) {
        const runtimeSpan = traceLogger.startSpan("evaluation.runtime", evaluationSpan);
        const results = await Promise.all(
          codeSubmission.question.testCases.map(async (testCase) => {
            try {
              const execution = await runtimeHarness.execute({
                code: codeSubmission.code,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                languageId,
                traceLogger,
                parentSpanId: runtimeSpan,
              });
              const status =
                execution.status.toUpperCase() as TestCaseStatus;

              await prisma.testCaseResult.update({
                where: {
                  codeSubmissionId_testCaseId: {
                    codeSubmissionId,
                    testCaseId: testCase.id,
                  },
                },
                data: {
                  status,
                  actualOutput: execution.output,
                  errorMessage: execution.error,
                  executionTime: execution.runtimeMs,
                },
              });

              return status === TestCaseStatus.PASSED ? 1 : 0;
            } catch (error) {
              throw new EvaluationPlatformError(
                "Judge0 execution service is unavailable",
                "judge0_unavailable",
                true,
                { cause: error },
              );
            }
          }),
        );

        passedCount = results.reduce<number>((sum, passed) => sum + passed, 0);
        testCaseScore =
          totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
        traceLogger.endSpan(runtimeSpan, {
          total: totalCount,
          passed: passedCount,
        });
      }
    }

    const isAllTestsPassed =
      !blocking && totalCount > 0 && passedCount === totalCount;
    let metricScore = 0;
    let score = 0;
    let aiFeedback: Record<string, unknown> | null = null;
    let navigation: unknown = null;
    let emotion: unknown = null;
    let knowledgeContext: unknown = {};

    try {
      const graphSpan = traceLogger.startSpan("evaluation.knowledgeGraph", evaluationSpan);
      const concepts = [...symbolic.errors, ...symbolic.warnings]
        .map((issue) => issue.knowledge_concept)
        .filter(Boolean);
      if (concepts.length > 0) {
        knowledgeContext = await getAggregatedKnowledgeContext(concepts);
      }
      traceLogger.endSpan(graphSpan, { concepts: concepts.length });
    } catch (error) {
      const graphSpan = traceLogger
        .getContext()
        .spans.find((span) => span.name === "evaluation.knowledgeGraph" && !span.endTime);
      if (graphSpan) traceLogger.recordException(graphSpan.spanId, error, { degraded: true });
      console.warn("Neo4j 服务不可用，跳过图谱关联分析");
    }

    if (!blocking) {
      const assignmentMetrics = codeSubmission.submission.assignment.metrics;
      let evaluations: Array<{
        metricId: string;
        metricName: string;
        score: number;
        feedback: string;
      }> = [];

      if (assignmentMetrics.length > 0) {
        try {
          const metricSpan = traceLogger.startSpan("evaluation.llmMetrics", evaluationSpan);
          const llmResult = await evaluateCodeWithLLM({
            code: codeSubmission.code,
            language: codeSubmission.language,
            questionTitle: codeSubmission.question.title,
            questionDescription: codeSubmission.question.description,
            metrics: assignmentMetrics,
          });
          evaluations = llmResult.evaluations;
          traceLogger.endSpan(metricSpan, { evaluations: evaluations.length });
        } catch (error) {
          throw new EvaluationPlatformError(
            "LLM metric evaluation is unavailable",
            "llm_unavailable",
            true,
            { cause: error },
          );
        }

        metricScore = evaluations.reduce((sum, evaluation) => {
          const weight =
            assignmentMetrics.find(
              (metric) => metric.metricId === evaluation.metricId,
            )?.weight ?? 0;
          return sum + (evaluation.score * weight) / 100;
        }, 0);
        score = isAllTestsPassed
          ? 100
          : testCaseScore * 0.6 + metricScore * 0.4;
      } else {
        score = testCaseScore;
      }

      aiFeedback = {
        branch: "general-llm",
        causalAnalysis: isAllTestsPassed
          ? "逻辑验证通过。"
          : "部分测试用例未通过，需检查边界条件。",
        suggestions: evaluations.map(
          (evaluation) => `${evaluation.metricName}: ${evaluation.feedback}`,
        ),
      };
      const navigationSpan = traceLogger.startSpan("agent.navigation", evaluationSpan);
      navigation = await generateLearningNavigation({
        codeReviewResult: JSON.stringify(aiFeedback),
        knowledgeGraph: JSON.stringify(knowledgeContext),
        studentHistory: "",
      });
      traceLogger.endSpan(navigationSpan, { available: Boolean(navigation) });
    } else {
      const codeReviewSpan = traceLogger.startSpan("agent.codeReview", evaluationSpan);
      const codeReviewResult = await runCodeReviewAgent({
        code: codeSubmission.code,
        language: codeSubmission.language,
        symbolic,
        testSummary: { total: totalCount, passed: 0, failed: totalCount },
      });
      traceLogger.endSpan(codeReviewSpan, { blocking: true });

      aiFeedback = { branch: "code-review-agent", ...codeReviewResult };
      const navigationSpan = traceLogger.startSpan("agent.navigation", evaluationSpan);
      navigation = await generateLearningNavigation({
        codeReviewResult: codeReviewResult.causalAnalysis,
        knowledgeGraph: JSON.stringify(knowledgeContext),
        studentHistory: "",
      });
      traceLogger.endSpan(navigationSpan, { available: Boolean(navigation) });
      score = 0;
    }

    const emotionSpan = traceLogger.startSpan("agent.emotion", evaluationSpan);
    emotion = await generateEmotionalSupport({
      codeReviewResult: isAllTestsPassed ? "表现优异" : "再接再厉",
    });
    traceLogger.endSpan(emotionSpan, { available: Boolean(emotion) });

    const branch = blocking ? "code-review-agent" : "general-llm";
    const feedback = {
      symbolic,
      testSummary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
      },
      aiFeedback,
      navigation,
      emotion,
    };
    const persistSpan = traceLogger.startSpan("database.evaluation.commit", evaluationSpan);
    await prisma.$transaction([
      prisma.codeSubmission.update({
        where: { id: codeSubmissionId },
        data: {
          metricScore,
          score,
          testCaseScore,
          feedback: JSON.stringify(feedback),
          codeEvaluationStatus: CodeEvaluationStatus.EVALUATION_COMPLETE,
        },
      }),
      prisma.evaluationRun.update({
        where: { id: evaluationRun.id },
        data: {
          branch,
          symbolicErrorCount: symbolic.errors.length,
          symbolicWarningCount: symbolic.warnings.length,
          score,
          metricScore,
          hasNavigation: Boolean(navigation),
          hasEmotion: Boolean(emotion),
          payload: feedback as unknown as Prisma.InputJsonValue,
          status: blocking ? "BLOCKED" : "COMPLETED",
          failureScope: blocking ? "student" : null,
          failureKind: blocking ? "symbolic" : null,
          retryable: false,
          completedAt: new Date(),
        },
      }),
    ]);
    traceLogger.endSpan(persistSpan, { status: blocking ? "BLOCKED" : "COMPLETED" });

    await updateSubmissionStatus(codeSubmission.submissionId);
    finalStatus = blocking ? "BLOCKED" : "COMPLETED";
    recordEvaluationOutcome(finalStatus, branch);

    return {
      success: true,
      score,
      evaluationRunId: evaluationRun.id,
      status: blocking ? ("BLOCKED" as const) : ("COMPLETED" as const),
    };
  } catch (error) {
    const failure = classifyEvaluationError(error);
    finalStatus = failure.retryable ? "FAILED_RETRYABLE" : "FAILED_TERMINAL";
    finalFailureKind = failure.kind;
    finalError = failure.message;
    recordEvaluationOutcome(finalStatus, "failed", failure.kind);
    traceLogger.logEvent("error", "evaluation.failed", {
      evaluationRunId: evaluationRun.id,
      failureKind: failure.kind,
      failureScope: failure.scope,
      retryable: failure.retryable,
    });
    const codeEvaluationStatus =
      failure.kind === "llm_unavailable"
        ? CodeEvaluationStatus.LLM_EVALUATION_FAILED
        : CodeEvaluationStatus.PENDING;

    await prisma.$transaction([
      prisma.evaluationRun.update({
        where: { id: evaluationRun.id },
        data: {
          status: failure.retryable ? "FAILED_RETRYABLE" : "FAILED_TERMINAL",
          failureScope: failure.scope,
          failureKind: failure.kind,
          errorMessage: failure.message,
          retryable: failure.retryable,
          completedAt: new Date(),
        },
      }),
      prisma.codeSubmission.update({
        where: { id: codeSubmissionId },
        data: { codeEvaluationStatus },
      }),
    ]);

    if (error instanceof EvaluationPlatformError) {
      throw new EvaluationRunPlatformError(
        error,
        evaluationRun.id,
        codeSubmissionId,
      );
    }
    throw error;
  } finally {
    traceLogger.endSpan(evaluationSpan, {
      evaluationRunId: evaluationRun.id,
      status: finalStatus,
      ...(finalFailureKind ? { failureKind: finalFailureKind } : {}),
      ...(finalError ? { error: finalError } : {}),
    });
    await traceLogger.persist().catch((error) => {
      console.warn("评测 Trace 持久化失败:", error);
    });
  }
}
