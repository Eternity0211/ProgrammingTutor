import { z } from "zod";
import type { RagCitation, RetrievalResult } from "../types";

const groundedAnswerSchema = z.object({
  answer: z.string().trim().min(1),
  citations: z.array(z.string().regex(/^S[1-9]\d*$/)).min(1),
});

export interface GroundedContext {
  context: string;
  sourceIds: Map<string, RetrievalResult>;
}

export interface ValidatedGroundedAnswer {
  answer: string;
  citations: RagCitation[];
  citedResults: RetrievalResult[];
}

export function buildGroundedContext(results: RetrievalResult[]): GroundedContext {
  const sourceIds = new Map<string, RetrievalResult>();
  const context = results
    .map((result, index) => {
      const sourceId = `S${index + 1}`;
      sourceIds.set(sourceId, result);
      return `[${sourceId}] ${result.document.title ?? "未命名资料"}\n${result.document.content}`;
    })
    .join("\n\n");
  return { context, sourceIds };
}

export function validateGroundedAnswer(
  raw: string,
  sourceIds: Map<string, RetrievalResult>,
): ValidatedGroundedAnswer | null {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = groundedAnswerSchema.safeParse(parsedJson);
  if (!parsed.success) return null;

  const uniqueIds = [...new Set(parsed.data.citations)];
  if (uniqueIds.some((sourceId) => !sourceIds.has(sourceId))) return null;
  if (uniqueIds.some((sourceId) => !parsed.data.answer.includes(`[${sourceId}]`))) return null;

  const citedResults = uniqueIds.map((sourceId) => sourceIds.get(sourceId)!);
  return {
    answer: parsed.data.answer,
    citations: uniqueIds.map((sourceId, index) => ({
      sourceId,
      documentId: citedResults[index].document.id,
      title: citedResults[index].document.title,
    })),
    citedResults,
  };
}
