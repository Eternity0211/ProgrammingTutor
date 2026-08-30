jest.mock("../../../../src/server/model/neural/codeAgent", () => ({
  runCodeReviewAgent: jest.fn(),
}));
jest.mock("../../../../src/server/model/neural/emotionAgent", () => ({
  generateEmotionalSupport: jest.fn(),
}));
jest.mock("../../../../src/server/model/neural/navigationAgent", () => ({
  generateLearningNavigation: jest.fn(),
}));

import { runCodeReviewAgent } from "@/server/model/neural/codeAgent";
import { generateEmotionalSupport } from "@/server/model/neural/emotionAgent";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";

import { DialogueOrchestrator } from "@/server/model/dialogue/orchestrator/dialogue-orchestrator";
import { InMemorySessionStore } from "@/server/model/dialogue/memory/session-store";
import { InMemoryProfileStore } from "@/server/model/dialogue/profile/profile-store";
import { IntentRecognizer } from "@/server/model/dialogue/intent/intent-recognizer";
import { RagEngine } from "@/server/model/dialogue/rag/rag-engine";
import { ProfileUpdater } from "@/server/model/dialogue/profile/profile-updater";
import { ContextTrimmer } from "@/server/model/dialogue/memory/context-trimmer";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";
import type { IntentRecognitionResult } from "@/server/model/dialogue/types";

const mockedRunCodeReviewAgent = runCodeReviewAgent as jest.MockedFunction<typeof runCodeReviewAgent>;
const mockedGenerateEmotionalSupport = generateEmotionalSupport as jest.MockedFunction<typeof generateEmotionalSupport>;
const mockedGenerateLearningNavigation = generateLearningNavigation as jest.MockedFunction<typeof generateLearningNavigation>;

function makeMockLlm() {
  return {
    chatCompletion: jest.fn(),
    createEmbedding: jest.fn(),
  } as unknown as DialogueLlmClient & {
    chatCompletion: jest.Mock;
    createEmbedding: jest.Mock;
  };
}

function makeMockRecognizer(intent: string, entities: Record<string, unknown> = {}): IntentRecognizer {
  const result: IntentRecognitionResult = {
    intent: intent as IntentRecognitionResult["intent"],
    confidence: 0.9,
    entities,
    rawText: "",
  };
  return {
    recognize: jest.fn().mockResolvedValue(result),
  } as unknown as IntentRecognizer;
}

function makeMockRagEngine(answer: string, degraded = false): RagEngine {
  return {
    answer: jest.fn().mockResolvedValue({ answer, sources: [], degraded }),
    addKnowledge: jest.fn(),
    getStore: jest.fn().mockReturnValue({ size: jest.fn().mockReturnValue(0) }),
  } as unknown as RagEngine;
}

function makeMockProfileUpdater(): ProfileUpdater {
  return {
    updateFromAgentResults: jest.fn().mockResolvedValue({
      userId: "",
      codeSubmissionRecords: [],
      weakKnowledgePoints: [],
      emotionStats: [],
      updatedAt: 0,
    }),
    summarizeForContext: jest.fn().mockReturnValue("暂无学生画像数据"),
  } as unknown as ProfileUpdater;
}

function makeMockContextTrimmer(): ContextTrimmer {
  return {
    trimForAgent: jest.fn().mockResolvedValue({
      summary: undefined,
      recentMessages: [],
      extractedFields: {},
    }),
  } as unknown as ContextTrimmer;
}

describe("DialogueOrchestrator", () => {
  let mockLlm: ReturnType<typeof makeMockLlm>;
  let sessionStore: InMemorySessionStore;
  let profileStore: InMemoryProfileStore;
  let profileUpdater: ReturnType<typeof makeMockProfileUpdater>;
  let contextTrimmer: ReturnType<typeof makeMockContextTrimmer>;

  beforeEach(() => {
    mockLlm = makeMockLlm();
    mockLlm.chatCompletion.mockResolvedValue("LLM reply");
    sessionStore = new InMemorySessionStore();
    profileStore = new InMemoryProfileStore();
    profileUpdater = makeMockProfileUpdater();
    contextTrimmer = makeMockContextTrimmer();

    mockedRunCodeReviewAgent.mockReset();
    mockedGenerateEmotionalSupport.mockReset();
    mockedGenerateLearningNavigation.mockReset();
  });

  function makeOrchestrator(opts: {
    recognizer: IntentRecognizer;
    ragEngine?: RagEngine;
  }) {
    return new DialogueOrchestrator({
      sessionStore,
      profileStore,
      intentRecognizer: opts.recognizer,
      ragEngine: opts.ragEngine ?? makeMockRagEngine("RAG answer"),
      profileUpdater,
      contextTrimmer,
      llm: mockLlm,
    });
  }

  describe("CODE_SUBMISSION", () => {
    it("should call codeAgent+emotionAgent when symbolic+testSummary provided", async () => {
      const recognizer = makeMockRecognizer("CODE_SUBMISSION", {
        codeSnippet: "int *p = null;",
        language: "cpp",
      });
      const orchestrator = makeOrchestrator({ recognizer });

      mockedRunCodeReviewAgent.mockResolvedValue({
        reviewSummary: "指针问题",
        causalAnalysis: "空指针",
        suggestions: ["检查指针"],
        confidence: 0.8,
      });
      mockedGenerateEmotionalSupport.mockResolvedValue({
        emotion_analysis: {
          detected_emotion: "挫败",
          intensity: "中",
          reason: "代码有错",
          supportive_guidance: "加油",
        },
      });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "帮我看看代码",
        context: {
          code: "int *p = null;",
          language: "cpp",
          symbolic: { errors: [], warnings: [] },
          testSummary: { total: 3, passed: 1, failed: 2 },
        },
      });

      expect(response.intent).toBe("CODE_SUBMISSION");
      expect(mockedRunCodeReviewAgent).toHaveBeenCalled();
      expect(mockedGenerateEmotionalSupport).toHaveBeenCalled();
      expect(response.agentResults?.codeReview).toBeDefined();
      expect(response.agentResults?.emotion).toBeDefined();
      expect(response.reply).toBe("LLM reply");
    });

    it("should use LLM fallback when no symbolic+testSummary", async () => {
      const recognizer = makeMockRecognizer("CODE_SUBMISSION", {
        codeSnippet: "int main() {}",
      });
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "帮我看看代码",
      });

      expect(mockedRunCodeReviewAgent).not.toHaveBeenCalled();
      expect(mockLlm.chatCompletion).toHaveBeenCalled();
      expect(response.agentResults).toBeUndefined();
    });

    it("should fallback to LLM when codeAgent throws", async () => {
      const recognizer = makeMockRecognizer("CODE_SUBMISSION", {
        codeSnippet: "int *p = null;",
        language: "cpp",
      });
      const orchestrator = makeOrchestrator({ recognizer });

      mockedRunCodeReviewAgent.mockRejectedValue(new Error("Agent down"));

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "帮我看看代码",
        context: {
          code: "int *p = null;",
          language: "cpp",
          symbolic: { errors: [], warnings: [] },
          testSummary: { total: 1, passed: 0, failed: 1 },
        },
      });

      expect(mockLlm.chatCompletion).toHaveBeenCalled();
      expect(response.reply).toBe("LLM reply");
    });
  });

  describe("EMOTIONAL_VENTING", () => {
    it("should call emotionAgent when sessionState has lastCodeReview", async () => {
      const recognizer = makeMockRecognizer("EMOTIONAL_VENTING");
      const orchestrator = makeOrchestrator({ recognizer });

      const session = await sessionStore.createSession("user-1");
      await sessionStore.updateSessionState(session.sessionId, {
        lastIntent: "CODE_SUBMISSION",
        lastCodeReview: { reviewSummary: "代码有指针问题" },
      });

      mockedGenerateEmotionalSupport.mockResolvedValue({
        emotion_analysis: {
          detected_emotion: "焦虑",
          intensity: "强",
          reason: "多次失败",
          supportive_guidance: "不要灰心",
        },
      });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "我太难了",
        sessionId: session.sessionId,
      });

      expect(mockedGenerateEmotionalSupport).toHaveBeenCalled();
      expect(response.agentResults?.emotion).toBeDefined();
    });

    it("should use LLM fallback when no codeReviewResult available", async () => {
      const recognizer = makeMockRecognizer("EMOTIONAL_VENTING");
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "我太难了",
      });

      expect(mockedGenerateEmotionalSupport).not.toHaveBeenCalled();
      expect(mockLlm.chatCompletion).toHaveBeenCalled();
    });
  });

  describe("LEARNING_PATH_INQUIRY", () => {
    it("should call navigationAgent when sessionState has lastCodeReview", async () => {
      const recognizer = makeMockRecognizer("LEARNING_PATH_INQUIRY");
      const orchestrator = makeOrchestrator({ recognizer });

      const session = await sessionStore.createSession("user-1");
      await sessionStore.updateSessionState(session.sessionId, {
        lastIntent: "CODE_SUBMISSION",
        lastCodeReview: { reviewSummary: "代码有指针问题" },
      });

      mockedGenerateLearningNavigation.mockResolvedValue({
        learning_navigation: {
          weaknesses: ["指针", "内存"],
          learning_path: [],
          recommended_exercises: [],
        },
      });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "下一步学什么",
        sessionId: session.sessionId,
      });

      expect(mockedGenerateLearningNavigation).toHaveBeenCalled();
      expect(response.agentResults?.navigation).toBeDefined();
    });

    it("should use LLM fallback when no codeReviewResult", async () => {
      const recognizer = makeMockRecognizer("LEARNING_PATH_INQUIRY");
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "下一步学什么",
      });

      expect(mockedGenerateLearningNavigation).not.toHaveBeenCalled();
      expect(mockLlm.chatCompletion).toHaveBeenCalled();
    });
  });

  describe("KNOWLEDGE_QUESTION", () => {
    it("should call ragEngine.answer", async () => {
      const ragEngine = makeMockRagEngine("指针是变量的内存地址", false);
      const recognizer = makeMockRecognizer("KNOWLEDGE_QUESTION");
      const orchestrator = makeOrchestrator({ recognizer, ragEngine });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "什么是指针",
      });

      expect(ragEngine.answer).toHaveBeenCalledWith("什么是指针");
      expect(response.reply).toBe("指针是变量的内存地址");
      expect(response.agentResults?.rag).toBeDefined();
      expect(response.agentResults?.rag?.degraded).toBe(false);
    });
  });

  describe("THOUGHT_FOLLOWUP", () => {
    it("should use LLM with context", async () => {
      const recognizer = makeMockRecognizer("THOUGHT_FOLLOWUP");
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "继续说说刚才那个",
      });

      expect(mockLlm.chatCompletion).toHaveBeenCalled();
      expect(response.reply).toBe("LLM reply");
      expect(response.agentResults).toBeUndefined();
    });
  });

  describe("session management", () => {
    it("should create new session when no sessionId provided", async () => {
      const recognizer = makeMockRecognizer("KNOWLEDGE_QUESTION");
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "什么是递归",
      });

      expect(response.sessionId).toBeTruthy();
      expect(response.sessionId.length).toBeGreaterThan(0);
    });

    it("should reuse existing session when sessionId provided", async () => {
      const session = await sessionStore.createSession("user-1");
      const recognizer = makeMockRecognizer("KNOWLEDGE_QUESTION");
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "什么是递归",
        sessionId: session.sessionId,
      });

      expect(response.sessionId).toBe(session.sessionId);
    });
  });

  describe("error handling", () => {
    it("should never throw from chat()", async () => {
      const recognizer = {
        recognize: jest.fn().mockRejectedValue(new Error("Recognizer down")),
      } as unknown as IntentRecognizer;
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "test",
      });

      expect(response).toBeDefined();
      expect(response.intent).toBe("THOUGHT_FOLLOWUP");
    });

    it("should return fallback when LLM fails", async () => {
      mockLlm.chatCompletion.mockRejectedValue(new Error("LLM down"));
      const recognizer = makeMockRecognizer("THOUGHT_FOLLOWUP");
      const orchestrator = makeOrchestrator({ recognizer });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "继续说说",
      });

      expect(response.reply).toContain("暂时无法");
    });

    it("should return fallback when everything fails", async () => {
      mockLlm.chatCompletion.mockRejectedValue(new Error("LLM down"));
      const ragEngine = {
        answer: jest.fn().mockRejectedValue(new Error("RAG down")),
      } as unknown as RagEngine;
      const recognizer = makeMockRecognizer("KNOWLEDGE_QUESTION");
      const orchestrator = makeOrchestrator({ recognizer, ragEngine });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "什么是递归",
      });

      expect(response).toBeDefined();
      expect(response.reply).toContain("暂时无法");
    });
  });

  describe("sessionState update", () => {
    it("should store lastCodeReview after codeAgent call", async () => {
      const recognizer = makeMockRecognizer("CODE_SUBMISSION", {
        codeSnippet: "int *p = null;",
        language: "cpp",
      });
      const orchestrator = makeOrchestrator({ recognizer });

      mockedRunCodeReviewAgent.mockResolvedValue({
        reviewSummary: "指针问题",
        causalAnalysis: "空指针",
        suggestions: ["修复"],
        confidence: 0.8,
      });
      mockedGenerateEmotionalSupport.mockResolvedValue({
        emotion_analysis: {
          detected_emotion: "挫败",
          intensity: "中",
          reason: "失败",
          supportive_guidance: "加油",
        },
      });

      const response = await orchestrator.chat({
        userId: "user-1",
        message: "帮我看看代码",
        context: {
          code: "int *p = null;",
          language: "cpp",
          symbolic: { errors: [], warnings: [] },
          testSummary: { total: 1, passed: 0, failed: 1 },
        },
      });

      const session = await sessionStore.getSession(response.sessionId);
      expect(session?.sessionState?.lastCodeReview?.reviewSummary).toBe("指针问题");
      expect(session?.sessionState?.lastIntent).toBe("CODE_SUBMISSION");
    });
  });

  describe("profile update", () => {
    it("should call profileUpdater when agentResults available", async () => {
      const recognizer = makeMockRecognizer("CODE_SUBMISSION", {
        codeSnippet: "int *p = null;",
        language: "cpp",
      });
      const orchestrator = makeOrchestrator({ recognizer });

      mockedRunCodeReviewAgent.mockResolvedValue({
        reviewSummary: "指针问题",
        causalAnalysis: "空指针",
        suggestions: ["修复"],
        confidence: 0.8,
      });
      mockedGenerateEmotionalSupport.mockResolvedValue({
        emotion_analysis: {
          detected_emotion: "挫败",
          intensity: "中",
          reason: "失败",
          supportive_guidance: "加油",
        },
      });

      await orchestrator.chat({
        userId: "user-1",
        message: "帮我看看代码",
        context: {
          code: "int *p = null;",
          language: "cpp",
          symbolic: { errors: [], warnings: [] },
          testSummary: { total: 1, passed: 0, failed: 1 },
          questionId: "q1",
        },
      });

      expect(profileUpdater.updateFromAgentResults).toHaveBeenCalled();
    });

    it("should not call profileUpdater when no agentResults", async () => {
      const recognizer = makeMockRecognizer("THOUGHT_FOLLOWUP");
      const orchestrator = makeOrchestrator({ recognizer });

      await orchestrator.chat({
        userId: "user-1",
        message: "继续说说",
      });

      expect(profileUpdater.updateFromAgentResults).not.toHaveBeenCalled();
    });
  });
});
