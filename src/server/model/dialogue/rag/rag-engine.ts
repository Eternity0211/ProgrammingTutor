import { randomUUID } from "crypto";
import type { KnowledgeDocument, RagResponse, RetrievalResult } from "../types";
import { DialogueLlmClient } from "../shared/llm-client";
import { incrementCounter } from "@/server/observability/metrics";
import {
  KnowledgeStore,
  type KnowledgeFilters,
  type RagRetrievalMode,
} from "./knowledge-store";
import { scanMdDirectory } from "./rag‑parser";
import { buildGroundedContext, validateGroundedAnswer } from "./grounding";
import {
  getPromptDefinition,
  promptContractHeader,
} from "@/server/model/prompts/registry";
import { recordPromptInvocation } from "@/server/observability/metrics";

const INSUFFICIENT_EVIDENCE_ANSWER =
  "现有知识库中没有足够证据回答这个问题。请补充相关资料或换一种问法。";

function recordGrounding(outcome: string): void {
  incrementCounter(
    "programming_tutor_rag_answers_total",
    "Total RAG answers by grounding outcome.",
    { outcome },
  );
}

export class RagEngine {
  private store: KnowledgeStore;
  private llm: DialogueLlmClient;
  private scoreThreshold: number;
  private loadPromise?: Promise<void>;

  constructor(options?: {
    store?: KnowledgeStore;
    llm?: DialogueLlmClient;
    scoreThreshold?: number;
    retrievalMode?: RagRetrievalMode;
    autoLoad?: boolean;
    persistDocuments?: boolean;
  }) {
    this.llm = options?.llm ?? DialogueLlmClient.getInstance();
    this.store =
      options?.store ??
      new KnowledgeStore(this.llm, {
        persistDocuments: options?.persistDocuments,
        retrievalMode: options?.retrievalMode,
      });
    this.scoreThreshold = options?.scoreThreshold ?? 0.3;
    if (options?.autoLoad) {
      this.loadPromise = this.store.loadFromDatabase().catch((error) => {
        console.warn("[RagEngine] Knowledge database unavailable:", error);
      });
    }
  }

  async answer(question: string, filters?: KnowledgeFilters): Promise<RagResponse> {
    try {
      await this.loadPromise;
      const results = await this.store.search(question, 3, filters);

      if (results.length === 0 || results[0].score < this.scoreThreshold) {
        recordGrounding("insufficient_evidence");
        return this.safeResponse("insufficient_evidence");
      }

      return await this.answerWithEvidence(question, results);
    } catch (error) {
      console.warn("[RagEngine] Retrieval failed:", error);
      recordGrounding("retrieval_unavailable");
      return this.safeResponse("retrieval_unavailable");
    }
  }

  private safeResponse(
    groundingReason: "insufficient_evidence" | "retrieval_unavailable",
  ): RagResponse {
    return {
      answer: INSUFFICIENT_EVIDENCE_ANSWER,
      sources: [],
      citations: [],
      grounded: false,
      groundingReason,
      degraded: true,
    };
  }

  private async answerWithEvidence(
    question: string,
    results: RetrievalResult[],
  ): Promise<RagResponse> {
    const { context, sourceIds } = buildGroundedContext(results);
    const prompt = getPromptDefinition("rag.grounded-answer");
    const systemPrompt = [
      promptContractHeader(prompt.id),
      "你是编程知识答疑助手。只能根据提供的知识库证据回答，禁止使用未提供的知识补充事实。",
      "返回严格 JSON：{\"answer\":\"回答正文，每个事实后标注[S1]形式的来源\",\"citations\":[\"S1\"]}。",
      "citations 只能包含实际支持回答的来源编号，且每个编号必须出现在 answer 中。",
      "如果证据不足，不要猜测；返回简短说明，并引用最相关的证据。",
    ].join("\n");
    const userPrompt = `知识库证据：\n${context}\n\n学生问题：${question}`;

    try {
      recordPromptInvocation(prompt.id, prompt.version);
      const rawAnswer = await this.llm.chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        jsonMode: true,
      });
      const validated = validateGroundedAnswer(rawAnswer, sourceIds);
      if (!validated) {
        recordGrounding("invalid_model_output");
        return {
          answer: "知识库已检索到相关资料，但模型未能生成可验证的引用回答。请稍后再试。",
          sources: [],
          citations: [],
          grounded: false,
          groundingReason: "invalid_model_output",
          degraded: true,
        };
      }

      recordGrounding("supported");
      return {
        answer: validated.answer,
        sources: validated.citedResults.map((result) => result.document),
        citations: validated.citations,
        grounded: true,
        groundingReason: "supported",
        degraded: false,
      };
    } catch (error) {
      console.warn("[RagEngine] LLM answer generation failed:", error);
      recordGrounding("llm_unavailable");
      return {
        answer: "抱歉，我暂时无法回答这个问题。请稍后再试。",
        sources: [],
        citations: [],
        grounded: false,
        groundingReason: "llm_unavailable",
        degraded: true,
      };
    }
  }

  async addKnowledge(
    title: string | null,
    content: string,
  ): Promise<void> {
    const now = new Date();
    const doc: KnowledgeDocument = {
      id: randomUUID(),
      title,
      content,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.addDocument(doc);
  }

  async loadKnowledgeDirectory(dirPath: string) {
    const chunks = await scanMdDirectory(dirPath);
    for (const ck of chunks) {
      const now = new Date();
      const doc: KnowledgeDocument = {
        id: randomUUID(),
        title: ck.title,
        content: ck.content,
        metadata: {
          headingPath: ck.headingPath,
          filePath: ck.filePath,
        } as any,
        createdAt: now,
        updatedAt: now,
      };
      await this.store.addDocument(doc);
    }
    console.log(`[RagEngine] 导入完成，共${chunks.length}个文档块`);
  }

  getStore(): KnowledgeStore {
    return this.store;
  }
}
