import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDialogueOrchestrator } from "@/server/model/dialogue";
import { observeRoute } from "@/server/observability/http";
import {
  rateLimitForUser,
  rateLimitRejected,
  rejectOversizedRequest,
} from "@/server/resilience/rate-limiter";

async function handlePost(req: NextRequest) {
  try {
    const oversized = rejectOversizedRequest(req, 64 * 1024);
    if (oversized) return oversized;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rateLimit = rateLimitForUser("dialogue", user.id);
    if (!rateLimit.allowed) return rateLimitRejected(rateLimit);

    const body = await req.json();
    const { message, sessionId, context, traceId } = body as {
      message?: string;
      sessionId?: string;
      traceId?: string;
      context?: Record<string, unknown>;
    };

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }
    if (message.length > 20_000 || JSON.stringify(context ?? {}).length > 40_000) {
      return NextResponse.json(
        { error: "message or context is too large" },
        { status: 413 },
      );
    }

    const orchestrator = getDialogueOrchestrator();
    const response = await orchestrator.chat({
      userId: user.id,
      message: message.trim(),
      sessionId,
      traceId: req.headers.get("x-trace-id") ?? traceId,
      context,
    });

    return NextResponse.json(response, {
      headers: { "x-trace-id": response.traceId },
    });
  } catch (error: any) {
    console.error("[API /dialogue] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return observeRoute("/api/dialogue", "POST", () => handlePost(req));
}
