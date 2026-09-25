import { describe, expect, it } from "@jest/globals";
import { ContextTrimmer } from "@/server/model/dialogue/memory/context-trimmer";

describe("ContextTrimmer token budget", () => {
  it("accepts a model-specific token counter", async () => {
    const trimmer = new ContextTrimmer({ chatCompletion: jest.fn() } as never);
    const result = await trimmer.trimForAgent(
      [{ id: "m1", role: "user", content: "abcdefghij", timestamp: Date.now() }],
      { maxMessages: 6, maxCharsPerMessage: 100, maxTokens: 2, summarizeThreshold: 10, tokenCounter: () => 10 },
    );
    expect(result.recentMessages[0]?.content).toContain("truncated");
  });
});
