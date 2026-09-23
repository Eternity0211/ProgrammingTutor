import { z } from "zod";
import { RagEngine } from "@/server/model/dialogue/rag";

export const mcpToolDefinitions = [
  {
    name: "knowledge_answer",
    description: "Answer a programming question using the tutor knowledge base.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", minLength: 1 } },
      required: ["question"],
    },
  },
] as const;

const knowledgeInput = z.object({ question: z.string().trim().min(1).max(4000) });

export class TutorToolRegistry {
  constructor(private readonly rag: RagEngine = new RagEngine({ autoLoad: true })) {}

  listTools() {
    return mcpToolDefinitions;
  }

  async callTool(name: string, input: unknown) {
    if (name !== "knowledge_answer") {
      throw new Error(`Unknown MCP tool: ${name}`);
    }
    const { question } = knowledgeInput.parse(input);
    const result = await this.rag.answer(question);
    return {
      content: [{ type: "text" as const, text: result.answer }],
      structuredContent: {
        sources: result.sources,
        degraded: result.degraded,
      },
    };
  }
}
