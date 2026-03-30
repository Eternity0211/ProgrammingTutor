import { CodeEvaluationStatus, Prisma, TestCaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LANGUAGE_ID_MAP } from "@/config/constants";
import { EXTERNAL_JUDGE0_API } from "@/config/route";
import { analyzeCode } from "@/server/model/symbolic/service";
import { evaluateCodeWithLLM } from "@/lib/services/code-evaluation-llm-service";
import { runCodeReviewAgent } from "@/server/model/neural/codeAgent";
import { getAggregatedKnowledgeContext } from "@/lib/services/graph-service";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";
import { generateEmotionalSupport } from "@/server/model/neural/emotionAgent";
import { updateSubmissionStatus } from "@/server/actions/submission-actions";

type Judge0Execution = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status?: {
    id: number;
    description: string;
  };
  time?: string | null;
};

function encodeBase64(value: string) {
  return Buffer.from(value, "utf-8").toString("base64");
}

function decodeBase64(value: string | null | undefined) {
  if (!value) return "";
  return Buffer.from(value, "base64").toString("utf-8");
}

async function executeWithJudge0(params: {
  code: string;
  input: string;
  expectedOutput?: string;
  languageId: number;
}): Promise<Judge0Execution> {
  const payload: Record<string, unknown> = {
    source_code: encodeBase64(params.code),
    stdin: encodeBase64(params.input || ""),
    language_id: params.languageId,
    expected_output: encodeBase64(params.expectedOutput || ""),
  };

  const judge0Url = `${EXTERNAL_JUDGE0_API}/submissions?base64_encoded=true&wait=true`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.JUDGE0_API_KEY?.trim();
  const apiHost = process.env.JUDGE0_API_HOST?.trim();
  if (apiKey && apiHost) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  }

  const response = await fetch(judge0Url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge0 request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as Judge0Execution;
}

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

  const testErrorSummary = blocking
    ? symbolic.errors
        .slice(0, 3)
        .map((e) => `${e.ruleId}: ${e.message}`)
        .join(" | ")
    : null;

  let testCaseScore = 0;
  if (blocking) {
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
            status: TestCaseStatus.FAILED,
            actualOutput: null,
            executionTime: Math.round(symbolic.metadata?.parseTime || 0),
            errorMessage: testErrorSummary,
          },
        }),
      ),
    );
  } else {
    const mappedLanguageId =
      LANGUAGE_ID_MAP[codeSubmission.language as keyof typeof LANGUAGE_ID_MAP];
    const cppLanguageOverride = Number(process.env.JUDGE0_CPP_LANGUAGE_ID);
    const languageId =
      codeSubmission.language === "C++" &&
      Number.isFinite(cppLanguageOverride) &&
      cppLanguageOverride > 0
        ? cppLanguageOverride
        : mappedLanguageId;

    if (!languageId) {
      throw new Error(`Unsupported language: ${codeSubmission.language}`);
    }

    let passedCount = 0;
    const totalCount = codeSubmission.question.testCases.length;

    await Promise.all(
      codeSubmission.question.testCases.map(async (testCase) => {
        let status: TestCaseStatus = TestCaseStatus.ERROR;
        let actualOutput: string | null = null;
        let errorMessage: string | null = null;
        let executionTime: number | null = null;

        try {
          const execution = await executeWithJudge0({
            code: codeSubmission.code,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            languageId,
          });

          const output = decodeBase64(execution.stdout);
          const compileError = decodeBase64(execution.compile_output);
          const runtimeError = decodeBase64(execution.stderr);
          const statusId = execution.status?.id;

          actualOutput = output || null;
          executionTime = execution.time
            ? Math.round(parseFloat(execution.time) * 1000)
            : null;

          if (statusId === 3) {
            status = TestCaseStatus.PASSED;
            passedCount += 1;
          } else if (statusId === 4) {
            status = TestCaseStatus.FAILED;
            errorMessage = "Wrong answer";
          } else if (statusId === 5) {
            status = TestCaseStatus.TIMEOUT;
            errorMessage = "Time limit exceeded";
          } else if (compileError || runtimeError) {
            status = TestCaseStatus.ERROR;
            errorMessage = compileError || runtimeError;
          } else {
            status = TestCaseStatus.ERROR;
            errorMessage =
              execution.message ||
              execution.status?.description ||
              "Execution failed";
          }
        } catch (error: any) {
          status = TestCaseStatus.ERROR;
          errorMessage =
            error?.message || "Failed to evaluate test case with Judge0";
        }

        await prisma.testCaseResult.update({
          where: {
            codeSubmissionId_testCaseId: {
              codeSubmissionId,
              testCaseId: testCase.id,
            },
          },
          data: {
            status,
            actualOutput,
            executionTime,
            errorMessage,
          },
        });
      }),
    );

    testCaseScore =
      totalCount > 0 ? Math.round((passedCount / totalCount) * 10000) / 100 : 0;
  }

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
