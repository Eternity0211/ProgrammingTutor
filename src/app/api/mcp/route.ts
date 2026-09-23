import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { TutorToolRegistry } from "@/server/model/mcp";

const registry = new TutorToolRegistry();

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ tools: registry.listTools() });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as { name?: string; arguments?: unknown };
    if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    return NextResponse.json(await registry.callTool(body.name, body.arguments));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid tool request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
