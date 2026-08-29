import { NextRequest, NextResponse } from "next/server";
import { WebhookPayload } from "@/lib/types/config-types";
import {
  processJudgeResultWebhook,
  updateCodeSubmissionStatus,
} from "@/server/actions/submission-actions";
import { judgeResult } from "@/lib/types/code-types";

export async function PUT(req: NextRequest) {
  try {
    console.log("Judge0 webhook received");
    const url = new URL(req.url);
    const payloadParam = url.searchParams.get("payload");

    if (!payloadParam) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Decode payload
    const payload: WebhookPayload = JSON.parse(
      Buffer.from(payloadParam, "base64").toString(),
    );

    const judgeResult: judgeResult = await req.json();

    await processJudgeResultWebhook(
      payload.testCaseId,
      payload.codeSubmissionId,
      judgeResult,
    );

    await updateCodeSubmissionStatus(payload.codeSubmissionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
