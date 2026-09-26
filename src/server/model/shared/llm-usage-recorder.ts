import fs from "node:fs";
import path from "node:path";
import { recordLlmTokenMetrics } from "@/server/observability/metrics";

type CompletionUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

/**
 * Opt-in evaluator instrumentation. Nothing is written unless
 * EVAL_USAGE_LOG=1 is set, so normal application runs remain unchanged.
 */
export function recordLlmUsage(
  usage: CompletionUsage | null | undefined,
  metadata: { agent: string; model: string },
): void {
  if (!usage) return;

  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const inputPrice = Number(process.env.EVAL_INPUT_PRICE_PER_1M ?? 0);
  const outputPrice = Number(process.env.EVAL_OUTPUT_PRICE_PER_1M ?? 0);
  const estimatedCost =
    (promptTokens * inputPrice + completionTokens * outputPrice) / 1_000_000;
  recordLlmTokenMetrics(
    metadata.agent,
    metadata.model,
    promptTokens,
    completionTokens,
    estimatedCost,
  );
  if (process.env.EVAL_USAGE_LOG !== "1") return;
  const runId = process.env.EVAL_RUN_ID?.trim() || "local";
  const outputDir = path.resolve(process.cwd(), "data/evaluation/results");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.appendFileSync(
    path.join(outputDir, `llm-usage-${runId}.jsonl`),
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      ...metadata,
      promptTokens,
      completionTokens,
      totalTokens: usage.total_tokens ?? promptTokens + completionTokens,
      estimatedCost,
      pricing: { inputPer1M: inputPrice, outputPer1M: outputPrice },
    })}\n`,
    "utf8",
  );
}
