import { DialogueLlmClient } from "../shared/llm-client";
import type { ChatMessage } from "../types";

export interface TrimOptions {
  maxMessages: number;
  maxCharsPerMessage: number;
  summarizeThreshold: number;
  agentType?: "codeAgent" | "emotionAgent" | "navigationAgent";
}

export interface TrimmedContext {
  summary?: string;
  recentMessages: ChatMessage[];
  extractedFields: {
    codeBlocks?: string[];
    keywords?: string[];
  };
}

const DEFAULT_OPTIONS: TrimOptions = {
  maxMessages: 6,
  maxCharsPerMessage: 1500,
  summarizeThreshold: 10,
};

export class ContextTrimmer {
  private llm: DialogueLlmClient;

  constructor(llm?: DialogueLlmClient) {
    this.llm = llm ?? DialogueLlmClient.getInstance();
  }

  async trimForAgent(
    messages: ChatMessage[],
    options?: Partial<TrimOptions>,
  ): Promise<TrimmedContext> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const filtered = this.filterMessages(messages, opts.agentType);

    let summary: string | undefined;
    let recentMessages = filtered;

    if (filtered.length > opts.summarizeThreshold) {
      const olderMessages = filtered.slice(0, -opts.maxMessages);
      recentMessages = filtered.slice(-opts.maxMessages);
      summary = await this.summarizeMessagesSafe(olderMessages);
    } else if (filtered.length > opts.maxMessages) {
      recentMessages = filtered.slice(-opts.maxMessages);
    }

    recentMessages = recentMessages.map((m) =>
      this.trimMessage(m, opts.maxCharsPerMessage),
    );

    const extractedFields = this.extractFields(recentMessages);

    return { summary, recentMessages, extractedFields };
  }

  async summarizeSession(messages: ChatMessage[]): Promise<string> {
    return this.summarizeMessagesSafe(messages);
  }

  private filterMessages(
    messages: ChatMessage[],
    agentType?: TrimOptions["agentType"],
  ): ChatMessage[] {
    if (!agentType) return [...messages];

    switch (agentType) {
      case "codeAgent":
        return messages.filter(
          (m) => m.role === "user" && this.hasCodeBlock(m.content),
        );
      case "emotionAgent":
        return messages.filter((m) => m.role === "user");
      case "navigationAgent":
        return [...messages];
      default:
        return [...messages];
    }
  }

  private hasCodeBlock(content: string): boolean {
    return /```[\s\S]*?```/.test(content);
  }

  private trimMessage(message: ChatMessage, maxChars: number): ChatMessage {
    if (message.content.length <= maxChars) return message;
    return {
      ...message,
      content: message.content.slice(0, maxChars) + "...[truncated]",
    };
  }

  private extractFields(
    messages: ChatMessage[],
  ): TrimmedContext["extractedFields"] {
    const codeBlocks: string[] = [];
    const keywords: Set<string> = new Set();

    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
    const keywordRegex = /[\u4e00-\u9fa5]{2,}|[a-zA-Z_]{3,}/g;

    for (const msg of messages) {
      codeBlockRegex.lastIndex = 0;
      keywordRegex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = codeBlockRegex.exec(msg.content)) !== null) {
        codeBlocks.push(match[1].trim());
      }
      while ((match = keywordRegex.exec(msg.content)) !== null) {
        keywords.add(match[0]);
      }
    }

    return {
      codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
      keywords:
        keywords.size > 0 ? Array.from(keywords).slice(0, 20) : undefined,
    };
  }

  private async summarizeMessagesSafe(
    messages: ChatMessage[],
  ): Promise<string> {
    if (messages.length === 0) return "";
    try {
      return await this.summarizeMessages(messages);
    } catch (error) {
      console.warn(
        "[ContextTrimmer] LLM summarization failed, using fallback:",
        error,
      );
      return this.fallbackSummary(messages);
    }
  }

  private async summarizeMessages(messages: ChatMessage[]): Promise<string> {
    const conversation = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const result = await this.llm.chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "你是对话摘要助手。请将以下对话摘要为不超过200字的中文，保留关键信息（代码问题、情绪状态、知识点、学习路径需求）。",
        },
        {
          role: "user",
          content: `请摘要以下对话：\n${conversation}`,
        },
      ],
      temperature: 0.3,
    });

    return result;
  }

  private fallbackSummary(messages: ChatMessage[]): string {
    const userMessages = messages.filter((m) => m.role === "user");
    const topics = userMessages
      .map((m) => m.content.slice(0, 50))
      .join("；");
    return `会话摘要（降级模式）：共${messages.length}条消息，学生主要讨论：${topics}`;
  }
}
