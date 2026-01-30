"use server";

import { prisma } from "@/lib/prisma";
import { TestResults } from "@/lib/types/code-types";
import {
  TestCaseStatus,
  CodeEvaluationStatus,
  SubmissionStatus,
} from "@prisma/client";
import { evaluateCodeWithLLM } from "@/lib/services/code-evaluation-llm-service";
import { updateSubmissionStatus } from "./submission-actions";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/config/route";

//code submission grading - Test case evaluation
export async function evaluateSubmissionTestCases(codeSubmissionId: string) {
  try {
    const codeSubmission = await prisma.codeSubmission.findUnique({
      where: { id: codeSubmissionId },
      include: {
        testCaseResults: {
          include: {
            testCase: true,
          },
        },
        question: true,
        submission: true,
      },
    });

    if (!codeSubmission) {
      throw new Error(`Code submission ${codeSubmissionId} not found`);
    }

    const pendingTestCases = codeSubmission.testCaseResults.filter(
      (result) => result.status === TestCaseStatus.PENDING,
    );

    if (pendingTestCases.length > 0) {
      return;
    }

    let totalPoints = 0;
    let earnedPoints = 0;

    const testResults: TestResults[] = [];

    codeSubmission.testCaseResults.forEach((result) => {
      testResults.push({
        description:
          result.testCase.description || `Test Case ${result.testCase.id}`,
        passed: result.status === TestCaseStatus.PASSED,
        isBonus: false,
        executionTime: result.executionTime,
        error: result.errorMessage,
      });

      totalPoints += 1;
      if (result.status === TestCaseStatus.PASSED) {
        earnedPoints += 1;
      }
    });

    const baseScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    const totalScore = Math.min(100, baseScore);

    // Update the code submission with test case score
    await prisma.codeSubmission.update({
      where: { id: codeSubmissionId },
      data: {
        testCaseScore: totalScore,
        codeEvaluationStatus:
          CodeEvaluationStatus.TEST_CASES_EVALUATION_COMPLETE,
      },
    });

    return {
      codeSubmissionId,
      score: totalScore,
    };
  } catch (error) {
    console.error(`Error grading code submission ${codeSubmissionId}:`, error);
    throw error;
  }
}

export async function evaluateSubmissionMetrics(codeSubmissionId: string) {
  try {
    const codeSubmission = await prisma.codeSubmission.findUnique({
      where: { id: codeSubmissionId },
      include: {
        question: true,
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
      },
    });

    if (!codeSubmission) {
      throw new Error(`Code submission ${codeSubmissionId} not found`);
    }

    const { code, language, question, submission } = codeSubmission;

    // if no metrics, skip LLM evaluation and use only testcase score
    if (submission.assignment.metrics.length === 0) {
      // When no metrics exist, final score is just the testcase score
      const finalScore = calculateFinalScore(
        codeSubmission.testCaseScore || 0,
        0, // No metrics score
        submission.assignment.testCaseWeight || 100, // Use full weight for test cases
        0, // No metrics weight
      );

      await prisma.codeSubmission.update({
        where: { id: codeSubmissionId },
        data: {
          codeEvaluationStatus: CodeEvaluationStatus.EVALUATION_COMPLETE,
          metricScore: 0,
          score: finalScore,
        },
      });
      await updateSubmissionStatus(codeSubmission.submissionId);
      console.log("No metrics found, skipping LLM evaluation");
      return;
    }

    try {
      const { evaluations } = await evaluateCodeWithLLM({
        code,
        language,
        questionTitle: question.title,
        questionDescription: question.description,
        metrics: submission.assignment.metrics,
      });

      const validMetricIds = new Set(
        submission.assignment.metrics.map((m) => m.metricId),
      );
      const invalidMetrics = evaluations.filter(
        (e) => !validMetricIds.has(e.metricId),
      );

      if (invalidMetrics.length > 0) {
        throw new Error(
          `Invalid metric IDs returned by LLM: ${invalidMetrics.map((m) => m.metricId).join(", ")}`,
        );
      }

      await Promise.all(
        evaluations.map((metric) =>
          prisma.submissionMetricResult.upsert({
            where: {
              codeSubmissionId_metricId: {
                codeSubmissionId: codeSubmissionId,
                metricId: metric.metricId,
              },
            },
            update: {
              score: metric.score,
              feedback: metric.feedback,
            },
            create: {
              codeSubmissionId: codeSubmissionId,
              metricId: metric.metricId,
              score: metric.score,
              feedback: metric.feedback,
            },
          }),
        ),
      );

      const MetricWeightage = await prisma.assignmentMetric.findMany({
        where: {
          assignmentId: submission.assignmentId,
        },
      });

      const totalMetricScore = evaluations.reduce((acc, metric) => {
        const weight =
          MetricWeightage?.find((m) => m.metricId === metric.metricId)
            ?.weight || 0;
        return acc + (metric.score * weight) / 100; // Convert weight percentage to decimal
      }, 0);

      // Calculate final score combining testcase and metrics scores
      const finalScore = calculateFinalScore(
        codeSubmission.testCaseScore || 0,
        totalMetricScore,
        submission.assignment.testCaseWeight || 60,
        submission.assignment.metricsWeight || 40,
      );

      await prisma.codeSubmission.update({
        where: { id: codeSubmissionId },
        data: {
          codeEvaluationStatus: CodeEvaluationStatus.EVALUATION_COMPLETE,
          metricScore: totalMetricScore,
          score: finalScore,
        },
      });

      console.log("LLM evaluation complete");

      await updateSubmissionStatus(codeSubmission.submissionId);
    } catch (error) {
      console.error(
        `Error evaluating code with LLM for code submission ${codeSubmissionId}:`,
        error,
      );
      await prisma.codeSubmission.update({
        where: { id: codeSubmissionId },
        data: {
          codeEvaluationStatus: CodeEvaluationStatus.LLM_EVALUATION_FAILED,
        },
      });
      await updateSubmissionStatus(codeSubmission.submissionId);
      throw error;
    }
  } catch (error) {
    console.error(
      `Error triggering LLM evaluation for code submission ${codeSubmissionId}:`,
      error,
    );
    throw error;
  }
}

// helper function to calculate the final score
function calculateFinalScore(
  testCaseScore: number,
  metricsScore: number,
  testCaseWeight: number,
  metricsWeight: number,
): number {
  // Normalize weights to ensure they add up to 100
  const totalWeight = testCaseWeight + metricsWeight;
  const normalizedTestCaseWeight =
    totalWeight > 0 ? testCaseWeight / totalWeight : 0.6;
  const normalizedMetricsWeight =
    totalWeight > 0 ? metricsWeight / totalWeight : 0.4;

  const finalScore =
    testCaseScore * normalizedTestCaseWeight +
    metricsScore * normalizedMetricsWeight;
  return Math.min(100, Math.max(0, finalScore)); // Ensure score is between 0 and 100
}

// Grading Table Actions
export const updateStudentScore = async (
  codeSubmissionId: string,
  metricId: string,
  newScore: number,
) => {
  try {
    console.log(
      "Updating student score for submission:",
      codeSubmissionId,
      metricId,
      newScore,
    );
    // Find the code submission for this student and assignment
    const codeSubmission = await prisma.codeSubmission.findFirst({
      where: {
        id: codeSubmissionId,
      },
    });

    if (!codeSubmission) {
      return { success: false, error: "No completed code submission found" };
    }

    // Update the metric result
    await prisma.submissionMetricResult.upsert({
      where: {
        codeSubmissionId_metricId: {
          codeSubmissionId: codeSubmission.id,
          metricId: metricId,
        },
      },
      update: {
        score: newScore,
      },
      create: {
        codeSubmissionId: codeSubmission.id,
        metricId: metricId,
        score: newScore,
      },
    });

    // Recalculate the final score for the code submission
    const assignment = await prisma.assignment.findFirst({
      where: {
        submissions: {
          some: {
            id: codeSubmission.submissionId,
          },
        },
      },
      include: {
        metrics: true,
      },
    });

    if (assignment) {
      // Get all metric results for this code submission
      const metricResults = await prisma.submissionMetricResult.findMany({
        where: {
          codeSubmissionId: codeSubmission.id,
        },
      });

      // Calculate new metric score
      const totalMetricScore = metricResults.reduce((acc, result) => {
        const assignmentMetric = assignment.metrics.find(
          (m) => m.metricId === result.metricId,
        );
        const weight = assignmentMetric?.weight || 0;
        return acc + (result.score * weight) / 100;
      }, 0);

      // Calculate final score
      const finalScore = calculateFinalScore(
        codeSubmission.testCaseScore || 0,
        totalMetricScore,
        assignment.testCaseWeight || 60,
        assignment.metricsWeight || 40,
      );

      // Update code submission score
      await prisma.codeSubmission.update({
        where: { id: codeSubmission.id },
        data: {
          metricScore: totalMetricScore,
          score: finalScore,
        },
      });

      // Update submission final score
      await updateSubmissionStatus(codeSubmission.submissionId);

      revalidatePath(ROUTES.ASSIGNMENT_GRADING(assignment.id));
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update score:", error);
    return { success: false, error: "Failed to update score" };
  }
};

export const performBulkAction = async (
  action: string,
  studentIds: string[],
  assignmentId: string,
) => {
  try {
    switch (action) {
      case "export":
        // Handle export action
        console.log("Exporting students:", studentIds);
        break;
      // case "comment":
      //   // Handle adding comments
      //   console.log("Adding comments to students:", studentIds);
      //   break;
      // case "grade":
      //   // Handle bulk grading
      //   console.log("Bulk grading students:", studentIds);
      //   break;
      default:
        console.log("Unknown bulk action:", action);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to perform bulk action:", error);
    return { success: false, error: "Failed to perform bulk action" };
  }
};
