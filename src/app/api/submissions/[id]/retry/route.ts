import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
} from "@/server/resilience/rate-limiter";

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimit = rateLimitForUser("submission", session.user.id);
  if (!rateLimit.allowed) return rateLimitRejected(rateLimit);

  const { id } = await context.params;
  const codeSubmission = await prisma.codeSubmission.findFirst({
    where: { id, submission: { studentId: session.user.id } },
    select: {
      id: true,
      evaluationRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          retryable: true,
          attempt: true,
        },
      },
    },
  });
  if (!codeSubmission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const previous = codeSubmission.evaluationRuns[0];
  if (
    !previous ||
    previous.status !== "FAILED_RETRYABLE" ||
    !previous.retryable
  ) {
    return NextResponse.json(
      { error: "The latest evaluation is not retryable" },
      { status: 409 },
    );
  }

  const claimed = await prisma.evaluationRun.updateMany({
    where: {
      id: previous.id,
      status: "FAILED_RETRYABLE",
      retryable: true,
    },
    data: { retryable: false },
  });
  if (claimed.count !== 1) {
    return NextResponse.json(
      { error: "An evaluation retry is already in progress", retryable: true },
      { status: 409 },
    );
  }

  try {
    const result = await evaluateSubmissionInsidePlatform(codeSubmission.id, {
      traceId: req.headers.get("x-trace-id") ?? undefined,
      retryOfRunId: previous.id,
      attempt: previous.attempt + 1,
    });
    return NextResponse.json({
      evaluationRunId: result.evaluationRunId,
      evaluationStatus: result.status,
      score: result.score,
      retryOfRunId: previous.id,
    });
  } catch (error) {
    const newerRun = await prisma.evaluationRun
      .findFirst({ where: { retryOfRunId: previous.id }, select: { id: true } })
      .catch(() => null);
    if (!newerRun) {
      await prisma.evaluationRun
        .update({ where: { id: previous.id }, data: { retryable: true } })
        .catch(() => undefined);
    }
    const failure = classifyEvaluationError(error);
    return NextResponse.json(
      {
        error:
          error instanceof EvaluationPlatformError
            ? "Evaluation service is temporarily unavailable"
            : "Evaluation retry failed",
        failureKind: failure.kind,
        retryable: failure.retryable,
      },
      { status: failure.retryable ? 503 : 500 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  return observeRoute(`/api/submissions/:id/retry`, "POST", () =>
    handlePost(req, context),
  );
}
