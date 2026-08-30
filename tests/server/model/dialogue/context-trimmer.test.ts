import { ContextTrimmer } from "@/server/model/dialogue/memory/context-trimmer";
import { createChatMessage } from "@/server/model/dialogue/memory/session-store";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";
import type { ChatMessage } from "@/server/model/dialogue/types";

function makeMessages(count: number, withCode = false): ChatMessage[] {
  return Array.from({ length: count }, (_, i) =>
    createChatMessage(
      "user",
      withCode
        ? `Question ${i}\n\`\`\`cpp\nint main() { return ${i}; }\n\`\`\``
        : `关于指针和内存管理的问题 ${i}`,
    ),
  );
}

function makeMockLlm() {
  return {
    chatCompletion: jest.fn(),
  } as unknown as DialogueLlmClient & {
    chatCompletion: jest.Mock;
  };
}

describe("ContextTrimmer", () => {
  it("should return at most maxMessages recent messages", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const messages = makeMessages(8);
    const result = await trimmer.trimForAgent(messages, { maxMessages: 3 });
    expect(result.recentMessages).toHaveLength(3);
    expect(result.recentMessages[0].content).toContain("5");
    expect(result.recentMessages[2].content).toContain("7");
  });

  it("should truncate long messages to maxCharsPerMessage", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const longContent = "A".repeat(2000);
    const messages = [createChatMessage("user", longContent)];
    const result = await trimmer.trimForAgent(messages, {
      maxMessages: 5,
      maxCharsPerMessage: 100,
    });
    expect(result.recentMessages[0].content.length).toBeLessThan(120);
    expect(result.recentMessages[0].content).toContain("[truncated]");
  });

  it("should filter by codeAgent (keep only messages with code blocks)", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const messages = [
      createChatMessage("user", "I have a question about pointers"),
      createChatMessage("user", "Here is my code:\n```cpp\nint main() {}\n```"),
      createChatMessage("assistant", "Let me check your code"),
      createChatMessage("user", "Another code:\n```python\nprint('hi')\n```"),
    ];
    const result = await trimmer.trimForAgent(messages, {
      maxMessages: 10,
      agentType: "codeAgent",
    });
    expect(result.recentMessages).toHaveLength(2);
    expect(
      result.recentMessages.every((m) => m.content.includes("```")),
    ).toBe(true);
  });

  it("should filter by emotionAgent (keep only user messages)", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const messages = [
      createChatMessage("user", "I feel frustrated"),
      createChatMessage("assistant", "I understand"),
      createChatMessage("user", "It is too hard"),
    ];
    const result = await trimmer.trimForAgent(messages, {
      maxMessages: 10,
      agentType: "emotionAgent",
    });
    expect(result.recentMessages).toHaveLength(2);
    expect(
      result.recentMessages.every((m) => m.role === "user"),
    ).toBe(true);
  });

  it("should not filter for navigationAgent", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const messages = [
      createChatMessage("user", "question 1"),
      createChatMessage("assistant", "answer 1"),
      createChatMessage("user", "question 2"),
    ];
    const result = await trimmer.trimForAgent(messages, {
      maxMessages: 10,
      agentType: "navigationAgent",
    });
    expect(result.recentMessages).toHaveLength(3);
  });

  it("should summarize older messages when threshold exceeded", async () => {
    const mockLlm = makeMockLlm();
    mockLlm.chatCompletion.mockResolvedValue("这是摘要");
    const trimmer = new ContextTrimmer(mockLlm);
    const messages = makeMessages(15);
    const result = await trimmer.trimForAgent(messages, {
      maxMessages: 3,
      summarizeThreshold: 10,
    });
    expect(result.summary).toBe("这是摘要");
    expect(result.recentMessages).toHaveLength(3);
    expect(mockLlm.chatCompletion).toHaveBeenCalledTimes(1);
  });

  it("should fall back when LLM summarization fails", async () => {
    const mockLlm = makeMockLlm();
    mockLlm.chatCompletion.mockRejectedValue(new Error("LLM unavailable"));
    const trimmer = new ContextTrimmer(mockLlm);
    const messages = makeMessages(15);
    const result = await trimmer.trimForAgent(messages, {
      maxMessages: 3,
      summarizeThreshold: 10,
    });
    expect(result.summary).toContain("降级模式");
    expect(result.recentMessages).toHaveLength(3);
  });

  it("should summarize session via summarizeSession", async () => {
    const mockLlm = makeMockLlm();
    mockLlm.chatCompletion.mockResolvedValue("整段摘要");
    const trimmer = new ContextTrimmer(mockLlm);
    const messages = makeMessages(5);
    const summary = await trimmer.summarizeSession(messages);
    expect(summary).toBe("整段摘要");
    expect(mockLlm.chatCompletion).toHaveBeenCalledTimes(1);
  });

  it("should fall back when summarizeSession LLM fails", async () => {
    const mockLlm = makeMockLlm();
    mockLlm.chatCompletion.mockRejectedValue(new Error("LLM down"));
    const trimmer = new ContextTrimmer(mockLlm);
    const messages = makeMessages(5);
    const summary = await trimmer.summarizeSession(messages);
    expect(summary).toContain("降级模式");
    expect(summary).toContain("5");
  });

  it("should extract code blocks from messages", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const messages = [
      createChatMessage(
        "user",
        "Here:\n```cpp\nint main() { return 0; }\n```",
      ),
    ];
    const result = await trimmer.trimForAgent(messages, { maxMessages: 5 });
    expect(result.extractedFields.codeBlocks).toBeDefined();
    expect(result.extractedFields.codeBlocks!.length).toBeGreaterThan(0);
    expect(result.extractedFields.codeBlocks![0]).toContain("int main");
  });

  it("should extract keywords from messages", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const messages = [
      createChatMessage(
        "user",
        "I have a question about pointers and memory management",
      ),
    ];
    const result = await trimmer.trimForAgent(messages, { maxMessages: 5 });
    expect(result.extractedFields.keywords).toBeDefined();
    expect(result.extractedFields.keywords!).toContain("pointers");
    expect(result.extractedFields.keywords!).toContain("memory");
    expect(result.extractedFields.keywords!).toContain("management");
  });

  it("should return undefined extractedFields when no code or keywords", async () => {
    const trimmer = new ContextTrimmer(makeMockLlm());
    const messages = [createChatMessage("user", "hi")];
    const result = await trimmer.trimForAgent(messages, { maxMessages: 5 });
    expect(result.extractedFields.codeBlocks).toBeUndefined();
    expect(result.extractedFields.keywords).toBeUndefined();
  });

  it("should not summarize when below threshold", async () => {
    const mockLlm = makeMockLlm();
    const trimmer = new ContextTrimmer(mockLlm);
    const messages = makeMessages(5);
    const result = await trimmer.trimForAgent(messages, {
      maxMessages: 3,
      summarizeThreshold: 10,
    });
    expect(result.summary).toBeUndefined();
    expect(mockLlm.chatCompletion).not.toHaveBeenCalled();
  });
});
