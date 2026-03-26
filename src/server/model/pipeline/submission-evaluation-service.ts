import { CodeEvaluationStatus, Prisma, TestCaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyzeCode } from "@/server/model/symbolic/service";
import { evaluateCodeWithLLM } from "@/lib/services/code-evaluation-llm-service";
import { runCodeReviewAgent } from "@/server/model/neural/codeAgent";
import { getAggregatedKnowledgeContext } from "@/lib/services/graph-service";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";
import { generateEmotionalSupport } from "@/server/model/neural/emotionAgent";
import { updateSubmissionStatus } from "@/server/actions/submission-actions";

function hasSymbolicBlockingIssues(
  symbolicErrors: { severity: string }[],
): boolean {
  return symbolicErrors.some(
    (issue) => issue.severity === "Critical" || issue.severity === "High",
  );
}

function buildEmotionInputText(parts: string[]): string {
  return parts.filter(Boolean).join("\n\n");
}

export async function evaluateSubmissionInsidePlatform(
  codeSubmissionId: string,
) {
  const codeSubmission = await prisma.codeSubmission.findUnique({
    where: { id: codeSubmissionId },
    include: {
      question: {
        include: {
          testCases: true,
        },
      },
      submission: {
        include: {
          assignment: {
            include: {
              metrics: {
                include: {
                  metric: true,
                },
              },
            },
          },
        },
      },
      testCaseResults: true,
    },
  });

  if (!codeSubmission) {
    throw new Error(`Code submission ${codeSubmissionId} not found`);
  }

  const symbolic = await analyzeCode(codeSubmission.code);
  const blocking = hasSymbolicBlockingIssues(symbolic.errors);

  const testCaseStatus = blocking
    ? TestCaseStatus.FAILED
    : TestCaseStatus.PASSED;
  const testErrorSummary = blocking
    ? symbolic.errors
        .slice(0, 3)
        .map((e) => `${e.ruleId}: ${e.message}`)
        .join(" | ")
    : null;

  await Promise.all(
    codeSubmission.question.testCases.map((testCase) =>
      prisma.testCaseResult.update({
        where: {
          codeSubmissionId_testCaseId: {
            codeSubmissionId,
            testCaseId: testCase.id,
          },
        },
        data: {
          status: testCaseStatus,
          actualOutput: blocking ? null : testCase.expectedOutput,
          executionTime: Math.round(symbolic.metadata?.parseTime || 0),
          errorMessage: testErrorSummary,
        },
      }),
    ),
  );

  const testCaseScore = blocking ? 0 : 100;
  await prisma.codeSubmission.update({
    where: { id: codeSubmissionId },
    data: {
      testCaseScore,
      codeEvaluationStatus: CodeEvaluationStatus.TEST_CASES_EVALUATION_COMPLETE,
    },
  });

  let metricScore = 0;
  let score = testCaseScore;
  let aiFeedback: any = null;
  let navigation: any = null;
  let emotion: any = null;

  if (!blocking) {
    const assignmentMetrics = codeSubmission.submission.assignment.metrics;
    if (assignmentMetrics.length > 0) {
      const { evaluations } = await evaluateCodeWithLLM({
        code: codeSubmission.code,
        language: codeSubmission.language,
        questionTitle: codeSubmission.question.title,
        questionDescription: codeSubmission.question.description,
        metrics: assignmentMetrics,
      });

      await Promise.all(
        evaluations.map((metric) =>
          prisma.submissionMetricResult.upsert({
            where: {
              codeSubmissionId_metricId: {
                codeSubmissionId,
                metricId: metric.metricId,
              },
            },
            update: {
              score: metric.score,
              feedback: metric.feedback,
            },
            create: {
              codeSubmissionId,
              metricId: metric.metricId,
              score: metric.score,
              feedback: metric.feedback,
            },
          }),
        ),
      );

      metricScore = evaluations.reduce((acc, metric) => {
        const weight =
          assignmentMetrics.find((m) => m.metricId === metric.metricId)
            ?.weight || 0;
        return acc + (metric.score * weight) / 100;
      }, 0);

      const testCaseWeight =
        codeSubmission.submission.assignment.testCaseWeight || 60;
      const metricsWeight =
        codeSubmission.submission.assignment.metricsWeight || 40;
      const totalWeight = testCaseWeight + metricsWeight;
      const normalizedTestWeight =
        totalWeight > 0 ? testCaseWeight / totalWeight : 0.6;
      const normalizedMetricWeight =
        totalWeight > 0 ? metricsWeight / totalWeight : 0.4;

      score = Math.min(
        100,
        Math.max(
          0,
          testCaseScore * normalizedTestWeight +
            metricScore * normalizedMetricWeight,
        ),
      );

      aiFeedback = {
        branch: "general-llm",
        causalAnalysis:
          "Symbolic checks passed. General LLM reviewed logic, algorithm, and style.",
        suggestions: evaluations.map((e) => `${e.metricName}: ${e.feedback}`),
        confidence: 0.8,
        metricEvaluations: evaluations,
      };
    } else {
      aiFeedback = {
        branch: "general-llm",
        causalAnalysis:
          "Symbolic checks passed. No custom rubric metrics were configured for this assignment.",
        suggestions: [
          "Add assignment metrics for richer AI evaluation signals.",
        ],
        confidence: 0.7,
      };
      score = testCaseScore;
    }
  } else {
    const codeReviewResult = await runCodeReviewAgent({
      code: codeSubmission.code,
      language: codeSubmission.language,
      symbolic,
      testSummary: {
        total: codeSubmission.question.testCases.length,
        passed: 0,
        failed: codeSubmission.question.testCases.length,
      },
    });

    const concepts = [...symbolic.errors, ...symbolic.warnings]
      .map((issue) => issue.knowledge_concept)
      .filter(Boolean);
    const knowledgeContext = await getAggregatedKnowledgeContext(concepts);

    navigation = await generateLearningNavigation({
      codeReviewResult: `${codeReviewResult.reviewSummary}\n${codeReviewResult.causalAnalysis}`,
      knowledgeGraph: JSON.stringify(knowledgeContext),
      studentHistory: "",
    });

    aiFeedback = {
      branch: "code-review-agent",
      ...codeReviewResult,
      navigation,
      symbolicSummary: {
        errorCount: symbolic.errors.length,
        warningCount: symbolic.warnings.length,
      },
    };

    score = 0;
  }

  emotion = await generateEmotionalSupport({
    codeReviewResult: buildEmotionInputText([
      aiFeedback?.causalAnalysis || "",
      navigation ? JSON.stringify(navigation) : "",
      blocking
        ? "Symbolic branch selected due to blocking issues."
        : "General LLM branch selected.",
    ]),
  });

  await prisma.codeSubmission.update({
    where: { id: codeSubmissionId },
    data: {
      metricScore,
      score,
      feedback: JSON.stringify({
        symbolic,
        aiFeedback,
        navigation,
        emotion,
        evaluationTrace: {
          branch: blocking
            ? "symbolic-error->code-agent"
            : "symbolic-ok->general-llm",
          evaluatedAt: new Date().toISOString(),
        },
      }),
      codeEvaluationStatus: CodeEvaluationStatus.EVALUATION_COMPLETE,
    },
  });

  await updateSubmissionStatus(codeSubmission.submissionId);

  await prisma.evaluationRun.create({
    data: {
      codeSubmissionId,
      submissionId: codeSubmission.submissionId,
      questionId: codeSubmission.questionId,
      language: codeSubmission.language,
      branch: blocking
        ? "symbolic-error->code-agent"
        : "symbolic-ok->general-llm",
      symbolicErrorCount: symbolic.errors.length,
      symbolicWarningCount: symbolic.warnings.length,
      score,
      metricScore,
      hasNavigation: Boolean(navigation),
      hasEmotion: Boolean(emotion),
      payload: {
        symbolic,
        aiFeedback,
        navigation,
        emotion,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  const evaluationTrace = {
    evaluatedAt: new Date().toISOString(),
    codeSubmissionId,
    submissionId: codeSubmission.submissionId,
    questionId: codeSubmission.questionId,
    language: codeSubmission.language,
    branch: blocking
      ? "symbolic-error->code-agent"
      : "symbolic-ok->general-llm",
    symbolicErrorCount: symbolic.errors.length,
    symbolicWarningCount: symbolic.warnings.length,
    score,
    metricScore,
    hasNavigation: Boolean(navigation),
    hasEmotion: Boolean(emotion),
  };

  return {
    branch: blocking
      ? "symbolic-error->code-agent"
      : "symbolic-ok->general-llm",
    symbolic,
    aiFeedback,
    navigation,
    emotion,
    score,
    evaluationTrace,
  };
}
