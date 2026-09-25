import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ id: "user-1" }),
}));
jest.mock("@/lib/services/graph-service", () => ({
  getAggregatedKnowledgeContext: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/server/model/dialogue/rag", () => ({
  RagEngine: jest.fn().mockImplementation(() => ({
    answer: jest.fn().mockResolvedValue({ answer: "ok", sources: [], degraded: false }),
    getStore: () => ({ search: jest.fn().mockResolvedValue([]) }),
  })),
}));
jest.mock("@/server/model/pipeline/runtime-harness", () => ({
  Judge0RuntimeHarness: jest.fn().mockImplementation(() => ({ execute: jest.fn() })),
}));

import { GET, POST } from "@/app/api/mcp/route";

describe("MCP JSON-RPC API", () => {
  it("returns MCP initialization metadata", async () => {
    const response = await POST(new NextRequest("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: { capabilities: { tools: {} } } });
  });

  it("lists tools using the MCP protocol", async () => {
    const response = await POST(new NextRequest("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    }));
    expect((await response.json()).result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "knowledge_answer", "knowledge_search", "code_execute", "knowledge_graph_context",
    ]);
  });

  it("keeps the legacy authenticated tool listing endpoint", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).tools[0].name).toBe("knowledge_answer");
  });
});
