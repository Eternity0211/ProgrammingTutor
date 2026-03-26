import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapStatus } from "@/lib/utils";

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
        testCaseResults: {
          orderBy: {
            createdAt: "asc",
          },
        },
        question: {
          include: {
            testCases: true,
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

    const results = submission.testCaseResults.map((result) => {
      const testCase = testCaseMap.get(result.testCaseId);

      return {
        status: mapStatus(result.status),
        runtime: result.executionTime ? `${result.executionTime}ms` : "N/A",
        memory: "N/A",
        output: result.actualOutput,
        error: result.errorMessage,
        input: testCase?.hidden ? null : testCase?.input,
        expectedOutput: testCase?.hidden ? null : testCase?.expectedOutput,
        hidden: testCase?.hidden || false,
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

    return NextResponse.json({
      id: submission.id,
      status: submission.codeEvaluationStatus,
      results,
      code: submission.code,
      language: submission.language,
      createdAt: submission.createdAt,
      questionId: submission.questionId,
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
