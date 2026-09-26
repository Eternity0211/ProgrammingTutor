import { z } from "zod";
import { createCoreTutorTools, defineTutorTool, TutorToolRegistry } from "@/server/model/mcp";
import { McpToolTimeoutError } from "@/server/model/mcp/tool-registry";

describe("TutorToolRegistry", () => {
  it("lists the knowledge tool", () => {
    expect(new TutorToolRegistry({} as never).listTools().map((tool) => tool.name)).toEqual([
      "knowledge_answer",
    ]);
  });

  it("keeps the public MCP contract explicit and read-only", () => {
    const definitions = new TutorToolRegistry({} as never).listTools();
    expect(definitions).toEqual([
      expect.objectContaining({
        name: "knowledge_answer",
        readOnly: true,
        inputSchema: expect.objectContaining({
          type: "object",
          required: ["question"],
        }),
      }),
    ]);
  });

  it("returns grounding evidence in the knowledge tool result", async () => {
    const answer = jest.fn().mockResolvedValue({
      answer: "指针保存地址 [S1]",
      sources: [{ id: "doc-1" }],
      degraded: false,
      grounded: true,
      citations: [{ sourceId: "S1", documentId: "doc-1", title: "指针" }],
      groundingReason: "supported",
    });
    const registry = new TutorToolRegistry({ answer } as never);

    await expect(
      registry.callTool("knowledge_answer", { question: "什么是指针" }),
    ).resolves.toMatchObject({
      structuredContent: {
        grounded: true,
        groundingReason: "supported",
        citations: [{ sourceId: "S1" }],
      },
    });
  });

  it("validates tool names and arguments", async () => {
    const registry = new TutorToolRegistry({ answer: jest.fn() } as never);
    await expect(registry.callTool("missing", {})).rejects.toThrow("Unknown MCP tool");
    await expect(registry.callTool("knowledge_answer", { question: " " })).rejects.toThrow();
  });

  it("registers and invokes a typed internal tool", async () => {
    const registry = new TutorToolRegistry({} as never, [
      defineTutorTool({
        definition: {
          name: "echo",
          description: "Echo input",
          inputSchema: { type: "object" },
          readOnly: true,
        },
        input: z.object({ value: z.string() }),
        execute: async ({ value }) => ({ content: [{ type: "text", text: value }] }),
      }),
    ]);
    await expect(registry.callTool("echo", { value: "ok" })).resolves.toMatchObject({
      content: [{ text: "ok" }],
    });
  });

  it("builds runtime, graph and evaluation tools from injected services", async () => {
    const runtime = { execute: jest.fn().mockResolvedValue({ status: "passed" }) };
    const graph = jest.fn().mockResolvedValue([{ target: { id: "arrays" }, prerequisites: [] }]);
    const evalRunner = { runAll: jest.fn().mockResolvedValue({ passed: 1 }) };
    const rag = { getStore: () => ({ search: jest.fn().mockResolvedValue([]) }) } as never;
    const registry = new TutorToolRegistry(rag, createCoreTutorTools({ rag, runtime, getKnowledgeContext: graph, evalRunner: evalRunner as never }));
    expect(registry.listTools().map((tool) => tool.name)).toEqual([
      "knowledge_answer", "knowledge_search", "code_execute", "knowledge_graph_context", "evaluate_dialogue",
    ]);
    await registry.callTool("code_execute", { code: "", languageId: 54 }).catch(() => undefined);
    expect(runtime.execute).not.toHaveBeenCalled();
    await registry.callTool("knowledge_graph_context", { conceptIds: ["arrays"] });
    expect(graph).toHaveBeenCalledWith(["arrays"]);
  });
});

describe("MCP tool timeout", () => {
  const originalTimeout = process.env.MCP_TOOL_TIMEOUT_MS;

  afterAll(() => {
    if (originalTimeout === undefined) delete process.env.MCP_TOOL_TIMEOUT_MS;
    else process.env.MCP_TOOL_TIMEOUT_MS = originalTimeout;
  });

  it("stops waiting for a stalled tool", async () => {
    process.env.MCP_TOOL_TIMEOUT_MS = "100";
    const registry = new TutorToolRegistry({
      answer: () => new Promise(() => undefined),
    } as never);
    await expect(
      registry.callTool("knowledge_answer", { question: "pointer" }),
    ).rejects.toBeInstanceOf(McpToolTimeoutError);
  });
});
