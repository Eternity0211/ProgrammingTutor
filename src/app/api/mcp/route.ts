import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { TutorToolRegistry } from "@/server/model/mcp";
import { createCoreTutorTools } from "@/server/model/mcp";
import { RagEngine } from "@/server/model/dialogue/rag";
import { Judge0RuntimeHarness } from "@/server/model/pipeline/runtime-harness";
import { getAggregatedKnowledgeContext } from "@/lib/services/graph-service";
import { jsonRpcError, jsonRpcResult, type McpJsonRpcRequest } from "@/server/model/mcp/protocol";

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
    const body = (await req.json()) as { name?: string; arguments?: unknown } & Partial<McpJsonRpcRequest>;

    if (body.jsonrpc === "2.0" && typeof body.method === "string") {
      if (body.method === "notifications/initialized") return new NextResponse(null, { status: 202 });
      if (body.method === "initialize") {
        return NextResponse.json(jsonRpcResult(body.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "programming-tutor", version: "1.0.0" },
        }));
      }
      if (body.method === "tools/list") {
        return NextResponse.json(jsonRpcResult(body.id, { tools: registry.listTools() }));
      }
      if (body.method === "tools/call") {
        const params = body.params ?? {};
        const name = typeof params.name === "string" ? params.name : "";
        const result = await registry.callTool(name, params.arguments);
        return NextResponse.json(jsonRpcResult(body.id, result));
      }
      return NextResponse.json(jsonRpcError(body.id, -32601, `Method not found: ${body.method}`), { status: 200 });
    }

    if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    return NextResponse.json(await registry.callTool(body.name, body.arguments));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid tool request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
