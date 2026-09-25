import type { z } from "zod";

export interface TutorToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
}

export interface TutorToolResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
}

export interface TutorTool<TInput = unknown> {
  definition: TutorToolDefinition;
  input: z.ZodType<TInput>;
  execute(input: TInput): Promise<TutorToolResult>;
}

export function defineTutorTool<TInput>(tool: TutorTool<TInput>): TutorTool<TInput> {
  return tool;
}
