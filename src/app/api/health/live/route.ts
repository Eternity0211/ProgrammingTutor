import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "alive",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
