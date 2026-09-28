import fs from "node:fs";

import { recordLlmUsage } from "@/server/model/shared/llm-usage-recorder";
import { resetMetricsForTests } from "@/server/observability/metrics";

describe("recordLlmUsage", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      EVAL_USAGE_LOG: "1",
      EVAL_RUN_ID: "usage-test",
      EVAL_PRICING_LABEL: "test-pricing",
      EVAL_INPUT_PRICE_PER_1M: "0.3",
      EVAL_INPUT_CACHE_HIT_PRICE_PER_1M: "0.006",
      EVAL_OUTPUT_PRICE_PER_1M: "1.2",
    };
    resetMetricsForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it("records provider tokens and prices cached input separately", () => {
    const append = jest
      .spyOn(fs, "appendFileSync")
      .mockImplementation(() => undefined);
    jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);

    recordLlmUsage(
      {
        prompt_tokens: 1_000,
        completion_tokens: 200,
        total_tokens: 1_200,
        prompt_cache_hit_tokens: 400,
        prompt_cache_miss_tokens: 600,
      },
      { agent: "code-review", model: "deepseek-flash" },
    );

    expect(append).toHaveBeenCalledTimes(1);
    const record = JSON.parse(String(append.mock.calls[0][1]));
    expect(record).toMatchObject({
      promptTokens: 1_000,
      cachedPromptTokens: 400,
      uncachedPromptTokens: 600,
      completionTokens: 200,
      totalTokens: 1_200,
      pricing: {
        label: "test-pricing",
        uncachedInputPer1M: 0.3,
        cachedInputPer1M: 0.006,
        outputPer1M: 1.2,
      },
    });
    expect(record.estimatedCost).toBeCloseTo(0.0004224, 10);
  });
});
