import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDialogueOrchestrator } from "@/server/model/dialogue";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, sessionId, context } = body as {
      message?: string;
      sessionId?: string;
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
      userId: session.user.id,
      message: message.trim(),
      sessionId,
      context,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[API /dialogue] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
