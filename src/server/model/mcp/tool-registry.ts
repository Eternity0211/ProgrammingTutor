import { z } from "zod";
import { RagEngine } from "@/server/model/dialogue/rag";
import { defineTutorTool, type TutorTool, type TutorToolResult } from "./tool";

const knowledgeInput = z.object({ question: z.string().trim().min(1).max(4000) });

function createKnowledgeTool(rag: RagEngine): TutorTool<z.infer<typeof knowledgeInput>> {
  return defineTutorTool({
    definition: {
    name: "knowledge_answer",
    description: "Answer a programming question using the tutor knowledge base.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", minLength: 1 } },
      required: ["question"],
    },
      readOnly: true,
    },
    input: knowledgeInput,
    async execute({ question }) {
      const result = await rag.answer(question);
      return {
        content: [{ type: "text", text: result.answer }],
        structuredContent: {
          sources: result.sources,
          degraded: result.degraded,
        },
      };
    },
  });
}

export class TutorToolRegistry {
  private readonly tools = new Map<string, TutorTool>();

  constructor(
    rag: RagEngine = new RagEngine({ autoLoad: true }),
    additionalTools: TutorTool[] = [],
  ) {
    this.register(createKnowledgeTool(rag));
    additionalTools.forEach((tool) => this.register(tool));
  }

  register(tool: TutorTool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Duplicate tutor tool: ${tool.definition.name}`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  listTools() {
    return [...this.tools.values()].map((tool) => tool.definition);
  }

  async callTool(name: string, input: unknown): Promise<TutorToolResult> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown MCP tool: ${name}`);
    return tool.execute(tool.input.parse(input));
  }
}

export const mcpToolDefinitions = new TutorToolRegistry({ answer: async () => ({
  answer: "",
  sources: [],
  degraded: false,
}) } as RagEngine).listTools();
