import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  TestCaseStatus,
  SubmissionStatus,
  CodeEvaluationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LANGUAGE_ID_MAP } from "@/config/constants";
// import { pollJudge0Submissions } from "@/server/actions/submission-actions";
import { WebhookPayload } from "@/lib/types/config-types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { code, questionId, language } = await req.json();
    if (!code || !questionId || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
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

    const judgeHost = process.env.JUDGE0_API_HOST;
    const judgeKey = process.env.JUDGE0_API_KEY;
    if (!judgeHost) {
      throw new Error("Judge0 is not configured. Please set JUDGE0_API_HOST.");
    }

    const isRapidApiHost = judgeHost.includes("rapidapi.com");
    if (isRapidApiHost && !judgeKey) {
      throw new Error(
        "Judge0 RapidAPI key is missing. Please set JUDGE0_API_KEY.",
      );
    }

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isRapidApiHost) {
      requestHeaders["x-rapidapi-key"] = judgeKey as string;
      requestHeaders["x-rapidapi-host"] = judgeHost;
    }

    const testCasePromises = question.testCases.map(async (testCase) => {
      const webhookPayload: WebhookPayload = {
        codeSubmissionId: codeSubmission.id,
        testCaseId: testCase.id,
        questionId,
      };

      const encodedPayload = Buffer.from(
        JSON.stringify(webhookPayload),
      ).toString("base64");
      const webhookUrl = `${process.env.APP_URL}/api/webhook/judge0?payload=${encodedPayload}`;

      const response = await fetch(
        `https://${judgeHost}/submissions?base64_encoded=true&fields=*&callback_url=${encodeURIComponent(
          webhookUrl,
        )}`,
        {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            language_id:
              LANGUAGE_ID_MAP[language as keyof typeof LANGUAGE_ID_MAP],
            source_code: Buffer.from(code).toString("base64"),
            stdin: Buffer.from(testCase.input).toString("base64"),
            expected_output: Buffer.from(testCase.expectedOutput).toString(
              "base64",
            ),
            cpu_time_limit: 2, // 2 seconds
            memory_limit: 128000, // 128MB
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        if (
          response.status === 403 &&
          /not subscribed to this api/i.test(errorText)
        ) {
          throw new Error(
            "Judge0 RapidAPI subscription is missing for this API key. Subscribe to Judge0 CE on RapidAPI or switch JUDGE0_API_HOST to your self-hosted Judge0 endpoint.",
          );
        }

        throw new Error(
          `Judge0 submit failed for test case ${testCase.id} (${response.status}): ${errorText || "No response body"}`,
        );
      }

      const judgeData = await response.json();
      if (!judgeData.token) {
        throw new Error(
          `Failed to submit test case ${testCase.id}: ${
            judgeData.error ||
            judgeData.message ||
            "Judge0 did not return token"
          }`,
        );
      }

      await prisma.testCaseResult.update({
        where: {
          codeSubmissionId_testCaseId: {
            codeSubmissionId: codeSubmission.id,
            testCaseId: testCase.id,
          },
        },
        data: {
          judge0Token: judgeData.token,
        },
      });

      return judgeData.token;
    });

    try {
      await Promise.all(testCasePromises);
      //await pollJudge0Submissions(codeSubmission.id);

      return NextResponse.json({
        submissionId: codeSubmission.id,
        message: "Submission created and test cases queued",
      });
    } catch (error) {
      await prisma.codeSubmission.update({
        where: { id: codeSubmission.id },
        data: {
          codeEvaluationStatus:
            CodeEvaluationStatus.TEST_CASES_EVALUATION_FAILED,
        },
      });

      throw error;
    }
  } catch (error: any) {
    console.error("Error in submission:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
