import { z } from "zod";
import { defineTutorTool, TutorToolRegistry } from "@/server/model/mcp";

describe("TutorToolRegistry", () => {
  it("lists the knowledge tool", () => {
    expect(new TutorToolRegistry({} as never).listTools().map((tool) => tool.name)).toEqual([
      "knowledge_answer",
    ]);
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
});
