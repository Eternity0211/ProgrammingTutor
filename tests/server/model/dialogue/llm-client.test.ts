import OpenAI from "openai";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";

jest.mock("openai");

describe("DialogueLlmClient", () => {
  const originalKey = process.env.DASHSCOPE_API_KEY;

  beforeEach(() => {
    DialogueLlmClient.resetInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.DASHSCOPE_API_KEY = originalKey;
  });

  it("should throw when DASHSCOPE_API_KEY is missing", () => {
    delete process.env.DASHSCOPE_API_KEY;
    expect(() => DialogueLlmClient.getInstance()).toThrow(
      /Missing DASHSCOPE_API_KEY/,
    );
  });

  it("should return the same singleton instance", () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    const instance1 = DialogueLlmClient.getInstance();
    const instance2 = DialogueLlmClient.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should configure OpenAI with DashScope auth and baseURL", () => {
    process.env.DASHSCOPE_API_KEY = '"test-key-with-quotes"';
    DialogueLlmClient.getInstance();
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: "test-key-with-quotes",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
  });

  it("should call chat completions with correct params", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    const mockChatCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "test response" } }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockChatCreate } },
      embeddings: { create: jest.fn() },
    }));

    const client = DialogueLlmClient.getInstance();
    const result = await client.chatCompletion({
      messages: [{ role: "user", content: "hello" }],
      jsonMode: true,
    });

    expect(result).toBe("test response");
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-v3.2",
        response_format: { type: "json_object" },
      }),
    );
  });

  it("should call embeddings using the same client instance", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    const mockEmbeddingsCreate = jest.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: jest.fn() } },
      embeddings: { create: mockEmbeddingsCreate },
    }));

    const client = DialogueLlmClient.getInstance();
    const result = await client.createEmbedding("test text");

    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "text-embedding-v3",
        input: "test text",
      }),
    );
  });

  it("should throw when chat completion returns empty content", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    const mockChatCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockChatCreate } },
      embeddings: { create: jest.fn() },
    }));

    const client = DialogueLlmClient.getInstance();
    await expect(
      client.chatCompletion({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/empty content/);
  });

  it("should return empty array when embedding response is missing", async () => {
    process.env.DASHSCOPE_API_KEY = "test-key";
    const mockEmbeddingsCreate = jest.fn().mockResolvedValue({
      data: [],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: jest.fn() } },
      embeddings: { create: mockEmbeddingsCreate },
    }));

    const client = DialogueLlmClient.getInstance();
    const result = await client.createEmbedding("test text");
    expect(result).toEqual([]);
  });
});
