import { RagEngine } from "@/server/model/dialogue/rag/rag-engine";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";

function makeMockLlm() {
  return {
    chatCompletion: jest.fn(),
    createEmbedding: jest.fn(),
  } as unknown as DialogueLlmClient & {
    chatCompletion: jest.Mock;
    createEmbedding: jest.Mock;
  };
}

describe("RagEngine", () => {
  let mockLlm: ReturnType<typeof makeMockLlm>;
  let engine: RagEngine;

  beforeEach(() => {
    mockLlm = makeMockLlm();
    mockLlm.createEmbedding.mockImplementation(async (text: string) => {
      if (text.includes("指针")) return [1, 0, 0];
      if (text.includes("递归")) return [0, 1, 0];
      return [0, 0, 1];
    });
    engine = new RagEngine({ llm: mockLlm, scoreThreshold: 0.3 });
  });

  it("should answer with knowledge base when retrieval is good", async () => {
    mockLlm.chatCompletion.mockResolvedValue("指针是变量的内存地址");
    await engine.addKnowledge("指针", "指针是变量的内存地址", "textbook");

    const response = await engine.answer("什么是指针");

    expect(response.degraded).toBe(false);
    expect(response.answer).toBe("指针是变量的内存地址");
    expect(response.sources).toHaveLength(1);
    expect(response.sources[0].title).toBe("指针");
  });

  it("should include knowledge base content in prompt when not degraded", async () => {
    mockLlm.chatCompletion.mockResolvedValue("answer");
    await engine.addKnowledge("指针", "指针是变量的内存地址", "textbook");

    await engine.answer("什么是指针");

    const callArg = mockLlm.chatCompletion.mock.calls[0][0];
    expect(callArg.messages[1].content).toContain("知识库内容");
    expect(callArg.messages[1].content).toContain("指针是变量的内存地址");
    expect(callArg.messages[1].content).toContain("什么是指针");
  });

  it("should degrade when retrieval score is below threshold", async () => {
    mockLlm.chatCompletion.mockResolvedValue("递归是函数调用自身");
    await engine.addKnowledge("指针", "指针是变量的内存地址", "textbook");

    const response = await engine.answer("什么是递归");

    expect(response.degraded).toBe(true);
    expect(response.sources).toEqual([]);
    expect(response.answer).toBe("递归是函数调用自身");
  });

  it("should not include knowledge base content in prompt when degraded", async () => {
    mockLlm.chatCompletion.mockResolvedValue("递归是函数调用自身");
    await engine.addKnowledge("指针", "指针是变量的内存地址", "textbook");

    await engine.answer("什么是递归");

    const callArg = mockLlm.chatCompletion.mock.calls[0][0];
    expect(callArg.messages[1].content).not.toContain("知识库内容");
    expect(callArg.messages[1].content).toContain("什么是递归");
  });

  it("should degrade when store is empty", async () => {
    mockLlm.chatCompletion.mockResolvedValue("递归是函数调用自身");

    const response = await engine.answer("什么是递归");

    expect(response.degraded).toBe(true);
    expect(response.sources).toEqual([]);
    expect(response.answer).toBe("递归是函数调用自身");
  });

  it("should degrade when embedding API fails", async () => {
    await engine.addKnowledge("指针", "指针是变量的内存地址", "textbook");
    mockLlm.createEmbedding.mockRejectedValue(new Error("Embedding API down"));
    mockLlm.chatCompletion.mockResolvedValue("递归是函数调用自身");

    const response = await engine.answer("什么是指针");

    expect(response.degraded).toBe(true);
    expect(response.sources).toEqual([]);
    expect(response.answer).toBe("递归是函数调用自身");
  });

  it("should return fallback message when LLM answer generation fails", async () => {
    mockLlm.chatCompletion.mockRejectedValue(new Error("LLM down"));

    const response = await engine.answer("什么是递归");

    expect(response.degraded).toBe(true);
    expect(response.sources).toEqual([]);
    expect(response.answer).toContain("暂时无法");
  });

  it("should add knowledge via addKnowledge", async () => {
    mockLlm.chatCompletion.mockResolvedValue("answer");
    await engine.addKnowledge("指针", "指针是变量的内存地址", "textbook");

    expect(engine.getStore().size()).toBe(1);
  });

  it("should respect custom scoreThreshold", async () => {
    const strictEngine = new RagEngine({
      llm: mockLlm,
      scoreThreshold: 1.01,
    });
    await strictEngine.addKnowledge("指针", "指针是变量的内存地址", "textbook");
    mockLlm.chatCompletion.mockResolvedValue("degraded answer");

    const response = await strictEngine.answer("什么是指针");

    expect(response.degraded).toBe(true);
  });

  it("should never throw from answer()", async () => {
    mockLlm.createEmbedding.mockRejectedValue(new Error("embedding fail"));
    mockLlm.chatCompletion.mockRejectedValue(new Error("llm fail"));

    const response = await engine.answer("test");

    expect(response).toBeDefined();
    expect(response.degraded).toBe(true);
    expect(response.answer).toContain("暂时无法");
  });

  it("should expose internal store via getStore", () => {
    const store = engine.getStore();
    expect(store).toBeDefined();
    expect(store.size()).toBe(0);
  });
});
