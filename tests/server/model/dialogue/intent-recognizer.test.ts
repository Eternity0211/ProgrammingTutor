import { IntentRecognizer } from "@/server/model/dialogue/intent/intent-recognizer";
import { createChatMessage } from "@/server/model/dialogue/memory/session-store";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";

function makeMockLlm() {
  return {
    chatCompletion: jest.fn(),
  } as unknown as DialogueLlmClient & {
    chatCompletion: jest.Mock;
  };
}

describe("IntentRecognizer", () => {
  let mockLlm: ReturnType<typeof makeMockLlm>;
  let recognizer: IntentRecognizer;

  beforeEach(() => {
    mockLlm = makeMockLlm();
    recognizer = new IntentRecognizer(mockLlm);
  });

  describe("LLM path", () => {
    it("should return correct intent from LLM", async () => {
      mockLlm.chatCompletion.mockResolvedValue(
        JSON.stringify({
          intent: "CODE_SUBMISSION",
          confidence: 0.9,
          entities: {
            codeSnippet: "int main() {}",
            language: "cpp",
            knowledgeKeywords: ["指针"],
            emotionKeywords: [],
            referencedTopic: "",
          },
        }),
      );

      const result = await recognizer.recognize("这是我的代码\n```cpp\nint main() {}\n```");

      expect(result.intent).toBe("CODE_SUBMISSION");
      expect(result.confidence).toBe(0.9);
      expect(result.entities.codeSnippet).toBe("int main() {}");
      expect(result.entities.language).toBe("cpp");
      expect(result.entities.knowledgeKeywords).toEqual(["指针"]);
    });

    it("should identify THOUGHT_FOLLOWUP with context via LLM", async () => {
      mockLlm.chatCompletion.mockResolvedValue(
        JSON.stringify({
          intent: "THOUGHT_FOLLOWUP",
          confidence: 0.85,
          entities: { referencedTopic: "递归" },
        }),
      );

      const context = [
        createChatMessage("assistant", "递归是一种函数调用自身的算法"),
      ];
      const result = await recognizer.recognize("能再详细说说吗", context);

      expect(result.intent).toBe("THOUGHT_FOLLOWUP");
      expect(result.entities.referencedTopic).toBe("递归");
    });

    it("should pass context to LLM prompt", async () => {
      mockLlm.chatCompletion.mockResolvedValue(
        JSON.stringify({ intent: "KNOWLEDGE_QUESTION", confidence: 0.8, entities: {} }),
      );

      const context = [
        createChatMessage("user", "什么是递归"),
        createChatMessage("assistant", "递归是函数调用自身"),
      ];
      await recognizer.recognize("那它和循环有什么区别", context);

      const callArg = mockLlm.chatCompletion.mock.calls[0][0];
      expect(callArg.messages[1].content).toContain("递归是函数调用自身");
      expect(callArg.messages[1].content).toContain("那它和循环有什么区别");
    });

    it("should clamp confidence above 1", async () => {
      mockLlm.chatCompletion.mockResolvedValue(
        JSON.stringify({ intent: "KNOWLEDGE_QUESTION", confidence: 1.5, entities: {} }),
      );
      const result = await recognizer.recognize("什么是递归");
      expect(result.confidence).toBe(1);
    });

    it("should clamp confidence below 0", async () => {
      mockLlm.chatCompletion.mockResolvedValue(
        JSON.stringify({ intent: "KNOWLEDGE_QUESTION", confidence: -0.5, entities: {} }),
      );
      const result = await recognizer.recognize("什么是递归");
      expect(result.confidence).toBe(0);
    });

    it("should default confidence to 0.5 when not a number", async () => {
      mockLlm.chatCompletion.mockResolvedValue(
        JSON.stringify({ intent: "KNOWLEDGE_QUESTION", confidence: "high", entities: {} }),
      );
      const result = await recognizer.recognize("什么是递归");
      expect(result.confidence).toBe(0.5);
    });

    it("should default to KNOWLEDGE_QUESTION for invalid intent", async () => {
      mockLlm.chatCompletion.mockResolvedValue(
        JSON.stringify({ intent: "INVALID_TYPE", confidence: 0.8, entities: {} }),
      );
      const result = await recognizer.recognize("什么是递归");
      expect(result.intent).toBe("KNOWLEDGE_QUESTION");
    });

    it("should degrade to fallback on invalid JSON", async () => {
      mockLlm.chatCompletion.mockResolvedValue("not a json string");
      const result = await recognizer.recognize("什么是递归");
      expect(result.intent).toBe("KNOWLEDGE_QUESTION");
      expect(result.confidence).toBe(0.5);
    });
  });

  describe("Fallback path (LLM failure)", () => {
    beforeEach(() => {
      mockLlm.chatCompletion.mockRejectedValue(new Error("LLM unavailable"));
    });

    it("should not throw on LLM failure", async () => {
      await expect(
        recognizer.recognize("hello"),
      ).resolves.toBeDefined();
    });

    it("should detect CODE_SUBMISSION from code block", async () => {
      const result = await recognizer.recognize(
        "这是我的代码\n```cpp\nint main() { return 0; }\n```",
      );
      expect(result.intent).toBe("CODE_SUBMISSION");
      expect(result.confidence).toBe(0.5);
    });

    it("should detect EMOTIONAL_VENTING from emotion keywords", async () => {
      const result = await recognizer.recognize("我太挫败了，怎么都搞不定");
      expect(result.intent).toBe("EMOTIONAL_VENTING");
    });

    it("should detect LEARNING_PATH_INQUIRY from path keywords", async () => {
      const result = await recognizer.recognize("我下一步应该学什么");
      expect(result.intent).toBe("LEARNING_PATH_INQUIRY");
    });

    it("should detect THOUGHT_FOLLOWUP with context and follow-up keywords", async () => {
      const context = [
        createChatMessage("assistant", "递归是一种算法"),
      ];
      const result = await recognizer.recognize("继续说说刚才那个", context);
      expect(result.intent).toBe("THOUGHT_FOLLOWUP");
    });

    it("should NOT detect THOUGHT_FOLLOWUP without context", async () => {
      const result = await recognizer.recognize("继续说说刚才那个");
      expect(result.intent).toBe("KNOWLEDGE_QUESTION");
    });

    it("should default to KNOWLEDGE_QUESTION when no pattern matches", async () => {
      const result = await recognizer.recognize("什么是面向对象");
      expect(result.intent).toBe("KNOWLEDGE_QUESTION");
    });

    it("should prioritize CODE_SUBMISSION over emotion when both present", async () => {
      const result = await recognizer.recognize(
        "我太挫败了\n```cpp\nint* p = nullptr;\n```",
      );
      expect(result.intent).toBe("CODE_SUBMISSION");
    });

    it("should extract entities in fallback mode", async () => {
      const result = await recognizer.recognize(
        "我太挫败了，这个指针问题怎么都搞不定\n```cpp\nint* p = nullptr;\n```",
      );
      expect(result.entities.codeSnippet).toBe("int* p = nullptr;");
      expect(result.entities.language).toBe("cpp");
      expect(result.entities.emotionKeywords).toContain("挫败");
      expect(result.entities.knowledgeKeywords).toContain("指针");
    });

    it("should extract emotion and knowledge keywords without code", async () => {
      const result = await recognizer.recognize(
        "我对指针和内存管理感到很焦虑",
      );
      expect(result.entities.emotionKeywords).toContain("焦虑");
      expect(result.entities.knowledgeKeywords).toContain("指针");
      expect(result.entities.knowledgeKeywords).toContain("内存");
    });

    it("should set rawText to the original message", async () => {
      const msg = "什么是递归";
      const result = await recognizer.recognize(msg);
      expect(result.rawText).toBe(msg);
    });
  });
});
