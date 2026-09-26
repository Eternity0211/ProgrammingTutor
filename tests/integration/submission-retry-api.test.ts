jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    codeSubmission: { findFirst: jest.fn() },
    evaluationRun: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/server/model/pipeline/submission-evaluation-service", () => ({
  evaluateSubmissionInsidePlatform: jest.fn(),
}));

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateSubmissionInsidePlatform } from "@/server/model/pipeline/submission-evaluation-service";
import { POST } from "@/app/api/submissions/[id]/retry/route";
import { resetRateLimitsForTests } from "@/server/resilience/rate-limiter";

describe("submission evaluation retry API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitsForTests();
    (auth as jest.Mock).mockResolvedValue({ user: { id: "student-1" } });
    (prisma.codeSubmission.findFirst as jest.Mock).mockResolvedValue({
      id: "code-1",
      evaluationRuns: [
        {
          id: "run-1",
          status: "FAILED_RETRYABLE",
          retryable: true,
          attempt: 1,
        },
      ],
    });
    (prisma.evaluationRun.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (evaluateSubmissionInsidePlatform as jest.Mock).mockResolvedValue({
      evaluationRunId: "run-2",
      status: "COMPLETED",
      score: 88,
    });
  });

  it("claims and retries the latest platform failure once", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/submissions/code-1/retry", {
        method: "POST",
        headers: { "x-trace-id": "trace-retry" },
      }),
      { params: Promise.resolve({ id: "code-1" }) },
    );
    expect(response.status).toBe(200);
    expect(prisma.evaluationRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "run-1", retryable: true }),
      }),
    );
    expect(evaluateSubmissionInsidePlatform).toHaveBeenCalledWith("code-1", {
      traceId: "trace-retry",
      retryOfRunId: "run-1",
      attempt: 2,
    });
    expect(await response.json()).toMatchObject({
      evaluationRunId: "run-2",
      retryOfRunId: "run-1",
    });
  });

  it("rejects a retry that another request already claimed", async () => {
    (prisma.evaluationRun.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const response = await POST(
      new NextRequest("http://localhost/api/submissions/code-1/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "code-1" }) },
    );
    expect(response.status).toBe(409);
    expect(evaluateSubmissionInsidePlatform).not.toHaveBeenCalled();
  });

  it("does not expose another student's submission", async () => {
    (prisma.codeSubmission.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await POST(
      new NextRequest("http://localhost/api/submissions/code-1/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "code-1" }) },
    );
    expect(response.status).toBe(404);
  });
});
