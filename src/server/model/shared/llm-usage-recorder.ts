import fs from "node:fs";
import path from "node:path";
import { recordLlmTokenMetrics } from "@/server/observability/metrics";

type CompletionUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
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
  const cachedPromptTokens = Math.min(
    promptTokens,
    Math.max(
      0,
      usage.prompt_cache_hit_tokens ??
        usage.prompt_tokens_details?.cached_tokens ??
        0,
    ),
  );
  const uncachedPromptTokens = Math.max(
    0,
    usage.prompt_cache_miss_tokens ?? promptTokens - cachedPromptTokens,
  );
  const inputPrice = Number(process.env.EVAL_INPUT_PRICE_PER_1M ?? 0);
  const cachedInputPrice = Number(
    process.env.EVAL_INPUT_CACHE_HIT_PRICE_PER_1M ?? inputPrice,
  );
  const outputPrice = Number(process.env.EVAL_OUTPUT_PRICE_PER_1M ?? 0);
  const estimatedCost =
    (uncachedPromptTokens * inputPrice +
      cachedPromptTokens * cachedInputPrice +
      completionTokens * outputPrice) /
    1_000_000;
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
      cachedPromptTokens,
      uncachedPromptTokens,
      completionTokens,
      totalTokens: usage.total_tokens ?? promptTokens + completionTokens,
      estimatedCost,
      pricing: {
        label: process.env.EVAL_PRICING_LABEL ?? "unspecified",
        uncachedInputPer1M: inputPrice,
        cachedInputPer1M: cachedInputPrice,
        outputPer1M: outputPrice,
      },
    })}\n`,
    "utf8",
  );
}
