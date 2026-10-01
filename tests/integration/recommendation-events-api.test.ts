jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { POST } from "@/app/api/recommendations/events/route";
import {
  renderPrometheusMetrics,
  resetMetricsForTests,
} from "@/server/observability/metrics";
import { resetRateLimitsForTests } from "@/server/resilience/rate-limiter";

const mockedAuth = auth as jest.Mock;

function request(body: unknown) {
  return new NextRequest("http://localhost/api/recommendations/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("recommendation events API", () => {
  beforeEach(() => {
    resetMetricsForTests();
    resetRateLimitsForTests();
    mockedAuth.mockReset();
  });

  it("requires an authenticated user", async () => {
    mockedAuth.mockResolvedValue(null);
    expect(
      (
        await POST(
          request({ action: "click", source: "classroom", surface: "profile" }),
        )
      ).status,
    ).toBe(401);
  });

  it("rejects unsupported labels without creating metrics", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "student-1" } });
    const response = await POST(
      request({ action: "click", source: "evil", surface: "profile" }),
    );

    expect(response.status).toBe(400);
    expect(renderPrometheusMetrics()).not.toContain(
      "programming_tutor_exercise_recommendation_events_total",
    );
  });

  it("records a valid recommendation click", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "student-1" } });
    const response = await POST(
      request({
        action: "click",
        source: "leetcode",
        surface: "assignment_feedback",
      }),
    );

    expect(response.status).toBe(204);
    expect(renderPrometheusMetrics()).toContain(
      'programming_tutor_exercise_recommendation_events_total{action="click",source="leetcode",surface="assignment_feedback"} 1',
    );
  });
});
