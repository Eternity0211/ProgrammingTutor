import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDialogueOrchestrator } from "@/server/model/dialogue";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
