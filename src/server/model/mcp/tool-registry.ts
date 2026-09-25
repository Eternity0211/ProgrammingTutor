import { z } from "zod";
import { RagEngine } from "@/server/model/dialogue/rag";
import { defineTutorTool, type TutorTool, type TutorToolResult } from "./tool";
import type { RuntimeHarness } from "@/server/model/pipeline/runtime-harness";
import type { EvalRunner } from "@/server/model/dialogue/eval/eval-runner";
import type { EvalTestCase } from "@/server/model/dialogue/eval/eval-types";
import type { KnowledgeTrace } from "@/lib/services/graph-service";

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

const searchInput = z.object({
  query: z.string().trim().min(1).max(4000),
  limit: z.number().int().min(1).max(20).optional(),
});

const runtimeInput = z.object({
  code: z.string().min(1).max(200_000),
  languageId: z.number().int().positive(),
  input: z.string().max(50_000).optional(),
  expectedOutput: z.string().max(50_000).optional(),
});

const graphInput = z.object({ conceptIds: z.array(z.string().trim().min(1)).min(1).max(50) });
const evalInput = z.object({ cases: z.array(z.unknown()).min(1).max(100) });

export function createCoreTutorTools(deps: {
  rag: RagEngine;
  runtime?: RuntimeHarness;
  getKnowledgeContext?: (conceptIds: string[]) => Promise<KnowledgeTrace[]>;
  evalRunner?: EvalRunner;
}): TutorTool[] {
  const tools: TutorTool[] = [defineTutorTool({
    definition: {
      name: "knowledge_search",
      description: "Retrieve matching tutor knowledge documents without generating an answer.",
      inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer" } }, required: ["query"] },
      readOnly: true,
    },
    input: searchInput,
    async execute({ query, limit }) {
      const results = await deps.rag.getStore().search(query, limit ?? 5);
      return { content: [{ type: "text", text: JSON.stringify(results) }], structuredContent: { results } };
    },
  })];

  if (deps.runtime) tools.push(defineTutorTool({
    definition: {
      name: "code_execute",
      description: "Execute source code through the configured runtime harness.",
      inputSchema: { type: "object", properties: { code: { type: "string" }, languageId: { type: "integer" }, input: { type: "string" }, expectedOutput: { type: "string" } }, required: ["code", "languageId"] },
      readOnly: false,
    },
    input: runtimeInput,
    async execute(input) {
      const result = await deps.runtime!.execute(input);
      return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result as unknown as Record<string, unknown> };
    },
  }));

  if (deps.getKnowledgeContext) tools.push(defineTutorTool({
    definition: {
      name: "knowledge_graph_context",
      description: "Resolve prerequisite context for knowledge concept IDs.",
      inputSchema: { type: "object", properties: { conceptIds: { type: "array", items: { type: "string" } } }, required: ["conceptIds"] },
      readOnly: true,
    },
    input: graphInput,
    async execute({ conceptIds }) {
      const context = await deps.getKnowledgeContext!(conceptIds);
      return { content: [{ type: "text", text: JSON.stringify(context) }], structuredContent: { context } };
    },
  }));

  if (deps.evalRunner) tools.push(defineTutorTool({
    definition: {
      name: "evaluate_dialogue",
      description: "Run dialogue evaluation cases through the configured EvalRunner.",
      inputSchema: { type: "object", properties: { cases: { type: "array" } }, required: ["cases"] },
      readOnly: true,
    },
    input: evalInput,
    async execute({ cases }) {
      const report = await deps.evalRunner!.runAll(cases as EvalTestCase[]);
      return { content: [{ type: "text", text: JSON.stringify(report) }], structuredContent: report as unknown as Record<string, unknown> };
    },
  }));

  return tools;
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
}) } as unknown as RagEngine).listTools();
