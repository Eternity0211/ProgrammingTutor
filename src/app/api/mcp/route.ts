import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { TutorToolRegistry } from "@/server/model/mcp";
import { createCoreTutorTools } from "@/server/model/mcp";
import { RagEngine } from "@/server/model/dialogue/rag";
import { Judge0RuntimeHarness } from "@/server/model/pipeline/runtime-harness";
import { getAggregatedKnowledgeContext } from "@/lib/services/graph-service";

const rag = new RagEngine({ autoLoad: true, persistDocuments: true });
const registry = new TutorToolRegistry(rag, createCoreTutorTools({
  rag,
  runtime: new Judge0RuntimeHarness(),
  getKnowledgeContext: getAggregatedKnowledgeContext,
}));

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
