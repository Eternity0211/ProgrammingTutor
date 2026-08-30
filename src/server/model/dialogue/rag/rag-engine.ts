import { randomUUID } from "crypto";
import type { KnowledgeDocument, RagResponse, RetrievalResult } from "../types";
import { DialogueLlmClient } from "../shared/llm-client";
import { KnowledgeStore } from "./knowledge-store";

export class RagEngine {
  private store: KnowledgeStore;
  private llm: DialogueLlmClient;
  private scoreThreshold: number;

  constructor(options?: {
    store?: KnowledgeStore;
    llm?: DialogueLlmClient;
    scoreThreshold?: number;
  }) {
    this.llm = options?.llm ?? DialogueLlmClient.getInstance();
    this.store = options?.store ?? new KnowledgeStore(this.llm);
    this.scoreThreshold = options?.scoreThreshold ?? 0.3;
  }

  async answer(question: string): Promise<RagResponse> {
    try {
      const results = await this.store.search(question, 3);

      if (results.length === 0 || results[0].score < this.scoreThreshold) {
        return await this.answerWithLlm(question, [], true);
      }

      return await this.answerWithLlm(question, results, false);
    } catch (error) {
      console.warn(
        "[RagEngine] Retrieval failed, using LLM native knowledge:",
        error,
      );
      return await this.answerWithLlm(question, [], true);
    }
  }

  private async answerWithLlm(
    question: string,
    results: RetrievalResult[],
    degraded: boolean,
  ): Promise<RagResponse> {
    let systemPrompt: string;
    let userPrompt: string;

    if (degraded || results.length === 0) {
      systemPrompt =
        "你是编程知识答疑助手。请用你的原生知识回答学生的编程问题，简洁、准确、易懂。";
      userPrompt = `请回答以下问题：\n${question}`;
    } else {
      const context = results
        .map((r) => `【${r.document.title}】\n${r.document.content}`)
        .join("\n\n");
      systemPrompt =
        "你是编程知识答疑助手。请基于以下知识库内容回答学生的问题。如果知识库内容不足以完整回答，可以补充你自己的知识。";
      userPrompt = `知识库内容：\n${context}\n\n学生问题：${question}`;
    }

    try {
      const answer = await this.llm.chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      });

      return {
        answer,
        sources: degraded ? [] : results.map((r) => r.document),
        degraded,
      };
    } catch (error) {
      console.warn("[RagEngine] LLM answer generation failed:", error);
      return {
        answer: "抱歉，我暂时无法回答这个问题。请稍后再试。",
        sources: [],
        degraded: true,
      };
    }
  }

  async addKnowledge(
    title: string,
    content: string,
    source: string,
  ): Promise<void> {
    const doc: KnowledgeDocument = {
      id: randomUUID(),
      title,
      content,
      source,
    };
    await this.store.addDocument(doc);
  }

  getStore(): KnowledgeStore {
    return this.store;
  }
}
