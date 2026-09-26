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
    engine = new RagEngine({ llm: mockLlm, scoreThreshold: 0.3, retrievalMode: "vector" });
  });

  it("should answer with knowledge base when retrieval is good", async () => {
    mockLlm.chatCompletion.mockResolvedValue(
      JSON.stringify({ answer: "指针是变量的内存地址 [S1]", citations: ["S1"] }),
    );
    await engine.addKnowledge("指针", "指针是变量的内存地址");

    const response = await engine.answer("什么是指针");

    expect(response.degraded).toBe(false);
    expect(response.answer).toBe("指针是变量的内存地址 [S1]");
    expect(response.grounded).toBe(true);
    expect(response.citations).toEqual([
      expect.objectContaining({ sourceId: "S1", title: "指针" }),
    ]);
    expect(response.sources).toHaveLength(1);
    expect(response.sources[0].title).toBe("指针");
  });

  it("should include knowledge base content in prompt when not degraded", async () => {
    mockLlm.chatCompletion.mockResolvedValue(
      JSON.stringify({ answer: "answer [S1]", citations: ["S1"] }),
    );
    await engine.addKnowledge("指针", "指针是变量的内存地址");

    await engine.answer("什么是指针");

    const callArg = mockLlm.chatCompletion.mock.calls[0][0];
    expect(callArg.messages[1].content).toContain("知识库证据");
    expect(callArg.messages[1].content).toContain("指针是变量的内存地址");
    expect(callArg.messages[1].content).toContain("什么是指针");
  });

  it("should degrade when retrieval score is below threshold", async () => {
    await engine.addKnowledge("指针", "指针是变量的内存地址");

    const response = await engine.answer("什么是递归");

    expect(response.degraded).toBe(true);
    expect(response.grounded).toBe(false);
    expect(response.groundingReason).toBe("insufficient_evidence");
    expect(response.sources).toEqual([]);
    expect(response.answer).toContain("没有足够证据");
    expect(mockLlm.chatCompletion).not.toHaveBeenCalled();
  });

  it("should not call the LLM when evidence is insufficient", async () => {
    await engine.addKnowledge("指针", "指针是变量的内存地址");

    await engine.answer("什么是递归");

    expect(mockLlm.chatCompletion).not.toHaveBeenCalled();
  });

  it("should degrade when store is empty", async () => {
    const response = await engine.answer("什么是递归");

    expect(response.degraded).toBe(true);
    expect(response.sources).toEqual([]);
    expect(response.answer).toContain("没有足够证据");
    expect(mockLlm.chatCompletion).not.toHaveBeenCalled();
  });

  it("should degrade when embedding API fails", async () => {
    await engine.addKnowledge("指针", "指针是变量的内存地址");
    mockLlm.createEmbedding.mockRejectedValue(new Error("Embedding API down"));

    const response = await engine.answer("什么是指针");

    expect(response.degraded).toBe(true);
    expect(response.sources).toEqual([]);
    expect(response.groundingReason).toBe("retrieval_unavailable");
    expect(response.answer).toContain("没有足够证据");
  });

  it("should return fallback message when LLM answer generation fails", async () => {
    await engine.addKnowledge("递归", "递归是函数调用自身");
    mockLlm.chatCompletion.mockRejectedValue(new Error("LLM down"));

    const response = await engine.answer("什么是递归");

    expect(response.degraded).toBe(true);
    expect(response.sources).toEqual([]);
    expect(response.groundingReason).toBe("llm_unavailable");
    expect(response.answer).toContain("暂时无法");
  });

  it("should reject an answer with an unknown citation", async () => {
    await engine.addKnowledge("指针", "指针是变量的内存地址");
    mockLlm.chatCompletion.mockResolvedValue(
      JSON.stringify({ answer: "虚构答案 [S9]", citations: ["S9"] }),
    );

    const response = await engine.answer("什么是指针");

    expect(response.grounded).toBe(false);
    expect(response.degraded).toBe(true);
    expect(response.groundingReason).toBe("invalid_model_output");
    expect(response.sources).toEqual([]);
  });

  it("should reject an answer whose citation is missing from its text", async () => {
    await engine.addKnowledge("指针", "指针是变量的内存地址");
    mockLlm.chatCompletion.mockResolvedValue(
      JSON.stringify({ answer: "指针是变量的内存地址", citations: ["S1"] }),
    );

    const response = await engine.answer("什么是指针");

    expect(response.groundingReason).toBe("invalid_model_output");
    expect(response.grounded).toBe(false);
  });

  it("should add knowledge via addKnowledge", async () => {
    mockLlm.chatCompletion.mockResolvedValue(
      JSON.stringify({ answer: "answer [S1]", citations: ["S1"] }),
    );
    await engine.addKnowledge("指针", "指针是变量的内存地址");

    expect(engine.getStore().size()).toBe(1);
  });

  it("should respect custom scoreThreshold", async () => {
    const strictEngine = new RagEngine({
      llm: mockLlm,
      scoreThreshold: 1.01,
      retrievalMode: "vector",
    });
    await strictEngine.addKnowledge("指针", "指针是变量的内存地址");
    const response = await strictEngine.answer("什么是指针");

    expect(response.degraded).toBe(true);
  });

  it("should never throw from answer()", async () => {
    mockLlm.createEmbedding.mockRejectedValue(new Error("embedding fail"));
    mockLlm.chatCompletion.mockRejectedValue(new Error("llm fail"));

    const response = await engine.answer("test");

    expect(response).toBeDefined();
    expect(response.degraded).toBe(true);
    expect(response.answer).toContain("没有足够证据");
  });

  it("should expose internal store via getStore", () => {
    const store = engine.getStore();
    expect(store).toBeDefined();
    expect(store.size()).toBe(0);
  });
});
