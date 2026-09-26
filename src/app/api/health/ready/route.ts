import { NextResponse } from "next/server";
import { checkReadiness } from "@/server/observability/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await checkReadiness();
  return NextResponse.json(report, {
    status: report.status === "not_ready" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
