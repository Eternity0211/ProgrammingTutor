import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  TestCaseStatus,
  SubmissionStatus,
  CodeEvaluationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateSubmissionInsidePlatform } from "@/server/model/pipeline/submission-evaluation-service";
import {
  EvaluationPlatformError,
  classifyEvaluationError,
} from "@/server/model/pipeline/evaluation-failure";
import { observeRoute } from "@/server/observability/http";
import {
  rateLimitForUser,
  rateLimitRejected,
  rejectOversizedRequest,
} from "@/server/resilience/rate-limiter";

async function handlePost(req: NextRequest) {
  try {
    const oversized = rejectOversizedRequest(req, 256 * 1024);
    if (oversized) return oversized;
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rateLimit = rateLimitForUser("submission", userId);
    if (!rateLimit.allowed) return rateLimitRejected(rateLimit);
    const { code, questionId, language } = await req.json();
    if (!code || !questionId || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (
      typeof code !== "string" ||
      typeof questionId !== "string" ||
      typeof language !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid submission payload" },
        { status: 400 },
      );
    }
    if (code.length > 200_000) {
      return NextResponse.json(
        { error: "Submission code is too large" },
        { status: 413 },
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        testCases: true,
        assignment: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    // Get or create submission for this student and assignment
    let submission = await prisma.submission.findUnique({
      where: {
        studentId_assignmentId: {
          studentId: userId,
          assignmentId: question.assignmentId,
        },
      },
    });

    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          studentId: userId,
          assignmentId: question.assignmentId,
          status: SubmissionStatus.IN_PROGRESS,
        },
      });
    }

    // Check if code submission already exists for this question
    // let codeSubmission = await prisma.codeSubmission.findFirst({
    //   where: {
    //     submissionId: submission.id,
    //     questionId: questionId,
    //   },
    // });

    // if (codeSubmission) {
    //   // Update existing code submission
    //   codeSubmission = await prisma.codeSubmission.update({
    //     where: { id: codeSubmission.id },
    //     data: {
    //       code,
    //       language,
    //       codeEvaluationStatus: CodeEvaluationStatus.PENDING,
    //     },
    //   });
    // } else {
    //   // Create new code submission
    const codeSubmission = await prisma.codeSubmission.create({
      data: {
        submissionId: submission.id,
        questionId,
        code,
        language,
        codeEvaluationStatus: CodeEvaluationStatus.PENDING,
      },
    });

    const assignment = await prisma.assignment.findUnique({
      where: { id: question.assignmentId },
      include: {
        metrics: {
          include: {
            metric: true,
          },
        },
      },
    });

    if (assignment?.metrics.length) {
      await prisma.submissionMetricResult.createMany({
        data: assignment.metrics.map((assignmentMetric) => ({
          codeSubmissionId: codeSubmission.id,
          metricId: assignmentMetric.metricId,
          score: 0,
          feedback: "Evaluation pending...",
        })),
        skipDuplicates: true,
      });
    }

    // Delete existing test case results for this code submission
    await prisma.testCaseResult.deleteMany({
      where: {
        codeSubmissionId: codeSubmission.id,
      },
    });

    // Create new test case results
    await prisma.testCaseResult.createMany({
      data: question.testCases.map((testCase) => ({
        codeSubmissionId: codeSubmission.id,
        testCaseId: testCase.id,
        status: TestCaseStatus.PENDING,
      })),
    });

    try {
      const result = await evaluateSubmissionInsidePlatform(codeSubmission.id, {
        traceId: req.headers.get("x-trace-id") ?? undefined,
      });

      return NextResponse.json({
        submissionId: codeSubmission.id,
        evaluationRunId: result.evaluationRunId,
        evaluationStatus: result.status,
        message: "Submission created and evaluated by internal pipeline",
      });
    } catch (error) {
      throw error;
    }
  } catch (error: any) {
    console.error("Error in submission:", error);
    const failure = classifyEvaluationError(error);
    return NextResponse.json(
      {
        error:
          error instanceof EvaluationPlatformError
            ? "Evaluation service is temporarily unavailable"
            : error.message || "Internal server error",
        failureKind: failure.kind,
        retryable: failure.retryable,
      },
      { status: failure.retryable ? 503 : 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return observeRoute("/api/submissions", "POST", () => handlePost(req));
}
