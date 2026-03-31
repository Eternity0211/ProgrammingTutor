import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapStatus } from "@/lib/utils";

function buildBlockingErrorSummary(
  symbolicErrors: { ruleId: string; message: string }[],
) {
  return symbolicErrors
    .slice(0, 3)
    .map((e) => `${e.ruleId}: ${e.message}`)
    .join(" | ");
}

export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const submissionId = id;
    const userId = session.user.id;

    const submission = await prisma.codeSubmission.findUnique({
      where: {
        id: submissionId,
        submission: {
          studentId: userId,
        },
      },
      include: {
        submission: true,
        testCaseResults: true,
        question: {
          include: {
            testCases: {
              orderBy: {
                id: "asc",
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    const testCaseMap = new Map();
    submission.question.testCases.forEach((testCase) => {
      testCaseMap.set(testCase.id, testCase);
    });

    const testCaseOrderIndex = new Map<string, number>();
    submission.question.testCases.forEach((testCase, index) => {
      testCaseOrderIndex.set(testCase.id, index);
    });

    const orderedResults = [...submission.testCaseResults].sort((a, b) => {
      const aIndex =
        testCaseOrderIndex.get(a.testCaseId) ?? Number.MAX_SAFE_INTEGER;
      const bIndex =
        testCaseOrderIndex.get(b.testCaseId) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });

    let visibleCaseCounter = 0;
    const results = orderedResults.map((result) => {
      const testCase = testCaseMap.get(result.testCaseId);
      const hidden = testCase?.hidden || false;
      const caseLabel = hidden
        ? "Hidden Test Case"
        : `Test Case ${++visibleCaseCounter}`;

      return {
        status: mapStatus(result.status),
        runtime: result.executionTime ? `${result.executionTime}ms` : "N/A",
        memory: "N/A",
        output: result.actualOutput,
        error: result.errorMessage,
        input: testCase?.hidden ? null : testCase?.input,
        expectedOutput: testCase?.hidden ? null : testCase?.expectedOutput,
        hidden,
        caseLabel,
        isCustom: false,
      };
    });

    let parsedFeedback: any = null;
    try {
      parsedFeedback = submission.feedback
        ? JSON.parse(submission.feedback)
        : null;
    } catch {
      parsedFeedback = null;
    }

    const isSymbolicBlockingBranch =
      parsedFeedback?.evaluationTrace?.branch === "symbolic-error->code-agent";

    const symbolicResults = isSymbolicBlockingBranch
      ? [
          {
            caseLabel: "Symbolic Check",
            isCustom: false,
            input: "",
            expectedOutput: null,
            output: "",
            error: buildBlockingErrorSummary(
              parsedFeedback?.symbolic?.errors || [],
            ),
            status: "failed",
            runtime: `${Math.round(parsedFeedback?.symbolic?.metadata?.parseTime || 0)}ms`,
            memory: "N/A",
            hidden: false,
          },
        ]
      : results;

    return NextResponse.json({
      id: submission.id,
      status: submission.codeEvaluationStatus,
      results: symbolicResults,
      code: submission.code,
      language: submission.language,
      createdAt: submission.createdAt,
      questionId: submission.questionId,
      score: submission.score,
      testCaseScore: submission.testCaseScore,
      metricScore: submission.metricScore,
      aiFeedback: parsedFeedback?.aiFeedback || null,
      navigation: parsedFeedback?.navigation || null,
      emotion: parsedFeedback?.emotion || null,
      symbolicOutput: parsedFeedback?.symbolic || null,
    });
  } catch (error: any) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
