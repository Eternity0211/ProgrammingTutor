import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { renderPrometheusMetrics } from "@/server/observability/metrics";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const configured = process.env.METRICS_TOKEN?.trim();
  if (!configured) return process.env.NODE_ENV !== "production";
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return new NextResponse(renderPrometheusMetrics(), {
    status: 200,
    headers: {
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
