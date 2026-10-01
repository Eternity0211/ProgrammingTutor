import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { observeRoute } from "@/server/observability/http";
import { recordExerciseRecommendationEvent } from "@/server/observability/metrics";
import {
  consumeRateLimit,
  rateLimitRejected,
  rejectOversizedRequest,
} from "@/server/resilience/rate-limiter";

const eventSchema = z.object({
  action: z.enum(["impression", "click"]),
  source: z.enum(["classroom", "leetcode"]),
  surface: z.enum(["assignment_feedback", "profile"]),
});

export async function POST(request: NextRequest) {
  return observeRoute("/api/recommendations/events", "POST", async () => {
    const oversized = rejectOversizedRequest(request, 1_024);
    if (oversized) return oversized;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = consumeRateLimit(
      "recommendation-event",
      session.user.id,
      120,
    );
    if (!limit.allowed) return rateLimitRejected(limit);

    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    recordExerciseRecommendationEvent(
      parsed.data.action,
      parsed.data.source,
      parsed.data.surface,
    );
    return new NextResponse(null, { status: 204 });
  });
}
