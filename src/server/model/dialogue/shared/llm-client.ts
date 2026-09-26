import OpenAI from "openai";
import {
  createEmbeddingClient,
  getEmbeddingModel,
  getLlmModel,
} from "@/server/model/shared/llm-provider";
import { recordLlmUsage } from "@/server/model/shared/llm-usage-recorder";

export class DialogueLlmClient {
  private static instance: DialogueLlmClient | null = null;
  private client: OpenAI;

  private constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing DEEPSEEK_API_KEY. Please set the environment variable.",
      );
    }
    this.client = new OpenAI({
      apiKey: apiKey.trim().replace(/^['"]|['"]$/g, ""),
      baseURL: "https://api.deepseek.com/v1",
    });
  }

  static getInstance(): DialogueLlmClient {
    if (!DialogueLlmClient.instance) {
      DialogueLlmClient.instance = new DialogueLlmClient();
    }
    return DialogueLlmClient.instance;
  }

  static resetInstance(): void {
    DialogueLlmClient.instance = null;
  }

  async chatCompletion(params: {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    model?: string;
    temperature?: number;
    jsonMode?: boolean;
  }): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: params.model ?? getLlmModel(),
      messages: params.messages,
      temperature: params.temperature ?? 0.3,
      ...(params.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });
    recordLlmUsage(completion.usage, {
      agent: "dialogue",
      model: params.model ?? getLlmModel(),
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("LLM returned empty content");
    return content;
  }

  async createEmbedding(text: string, model?: string): Promise<number[]> {
    const response = await createEmbeddingClient().embeddings.create({
      model: model ?? getEmbeddingModel(),
      input: text,
    });
    return response.data[0]?.embedding ?? [];
  }
}
