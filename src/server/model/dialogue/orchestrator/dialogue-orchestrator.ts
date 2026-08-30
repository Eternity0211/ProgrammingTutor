import { randomUUID } from "crypto";
import { runCodeReviewAgent } from "@/server/model/neural/codeAgent";
import type { CodeReviewAgentInput } from "@/server/model/neural/codeAgent";
import { generateEmotionalSupport } from "@/server/model/neural/emotionAgent";
import type { EmotionInputs } from "@/server/model/neural/emotionAgent";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";
import type { NavigatorInputs } from "@/server/model/neural/navigationAgent";
import { IntentRecognizer } from "../intent";
import { RagEngine } from "../rag";
import { ProfileUpdater } from "../profile";
import type { ProfileStore } from "../profile";
import { InMemoryProfileStore } from "../profile";
import { ContextTrimmer } from "../memory";
import type { TrimmedContext } from "../memory/context-trimmer";
import { InMemorySessionStore } from "../memory";
import { createChatMessage } from "../memory";
import type { SessionStore } from "../memory";
import { DialogueLlmClient } from "../shared/llm-client";
import { TraceLogger } from "../shared/trace-logger";
import type {
  AgentResultSnapshot,
  ChatMessage,
  DialogueAgentResults,
  DialogueIntent,
  DialogueRequest,
  DialogueResponse,
  IntentRecognitionResult,
  SessionState,
  StudentProfile,
} from "../types";

interface OrchestratorOptions {
  sessionStore?: SessionStore;
  profileStore?: ProfileStore;
  intentRecognizer?: IntentRecognizer;
  ragEngine?: RagEngine;
  profileUpdater?: ProfileUpdater;
  contextTrimmer?: ContextTrimmer;
  llm?: DialogueLlmClient;
  traceLogger?: TraceLogger;
}

interface HandlerContext {
  request: DialogueRequest;
  sessionId: string;
  messages: ChatMessage[];
  trimmed: TrimmedContext;
  profileSummary: string;
  profile: StudentProfile | null;
  intent: IntentRecognitionResult;
  traceLogger: TraceLogger;
}

interface HandlerResult {
  reply: string;
  agentResults?: DialogueAgentResults;
  sessionStateUpdate?: Partial<SessionState>;
}

export class DialogueOrchestrator {
  private sessionStore: SessionStore;
  private profileStore: ProfileStore;
  private intentRecognizer: IntentRecognizer;
  private ragEngine: RagEngine;
  private profileUpdater: ProfileUpdater;
  private contextTrimmer: ContextTrimmer;
  private llm: DialogueLlmClient;

  constructor(options?: OrchestratorOptions) {
    this.llm = options?.llm ?? DialogueLlmClient.getInstance();
    this.sessionStore = options?.sessionStore ?? new InMemorySessionStore();
    this.profileStore = options?.profileStore ?? new InMemoryProfileStore();
    this.intentRecognizer = options?.intentRecognizer ?? new IntentRecognizer();
    this.ragEngine = options?.ragEngine ?? new RagEngine();
    this.profileUpdater = options?.profileUpdater ?? new ProfileUpdater();
    this.contextTrimmer = options?.contextTrimmer ?? new ContextTrimmer();
  }

  async chat(request: DialogueRequest): Promise<DialogueResponse> {
    const traceLogger = new TraceLogger(
      undefined,
      request.sessionId,
      request.userId,
    );

    try {
      const session = request.sessionId
        ? await this.sessionStore.getSession(request.sessionId)
        : null;
      const activeSession = session ?? (await this.sessionStore.createSession(request.userId));
      const sessionId = activeSession.sessionId;

      const userMessage = createChatMessage("user", request.message);
      await this.sessionStore.addMessage(sessionId, userMessage);

      const messages = await this.sessionStore.getMessages(sessionId);
      const trimmed = await this.contextTrimmer.trimForAgent(messages);

      const profile = await this.profileStore.getProfile(request.userId);
      const profileSummary = this.profileUpdater.summarizeForContext(profile);

      let intent: IntentRecognitionResult;
      try {
        intent = await this.intentRecognizer.recognize(
          request.message,
          trimmed.recentMessages,
        );
      } catch (error) {
        console.warn(
          "[DialogueOrchestrator] Intent recognition failed, routing to THOUGHT_FOLLOWUP:",
          error,
        );
        intent = {
          intent: "THOUGHT_FOLLOWUP" as DialogueIntent,
          confidence: 0,
          entities: {},
          rawText: request.message,
        };
      }

      const ctx: HandlerContext = {
        request,
        sessionId,
        messages,
        trimmed,
        profileSummary,
        profile,
        intent,
        traceLogger,
      };

      let result: HandlerResult;
      switch (intent.intent) {
        case "CODE_SUBMISSION":
          result = await this.handleCodeSubmission(ctx);
          break;
        case "EMOTIONAL_VENTING":
          result = await this.handleEmotionalVenting(ctx);
          break;
        case "LEARNING_PATH_INQUIRY":
          result = await this.handleLearningPath(ctx);
          break;
        case "KNOWLEDGE_QUESTION":
          result = await this.handleKnowledgeQuestion(ctx);
          break;
        case "THOUGHT_FOLLOWUP":
        default:
          result = await this.handleThoughtFollowup(ctx);
          break;
      }

      const assistantMessage = createChatMessage("assistant", result.reply);
      await this.sessionStore.addMessage(sessionId, assistantMessage);

      const currentState = activeSession.sessionState ?? {};
      const newState: SessionState = {
        ...currentState,
        lastIntent: intent.intent,
        ...result.sessionStateUpdate,
      };
      await this.sessionStore.updateSessionState(sessionId, newState);

      if (result.agentResults) {
        const snapshot: AgentResultSnapshot = {
          codeReview: result.agentResults.codeReview,
          emotion: result.agentResults.emotion,
          navigation: result.agentResults.navigation,
        };
        try {
          await this.profileUpdater.updateFromAgentResults(
            request.userId,
            snapshot,
            {
              questionId: request.context?.questionId,
              score: undefined,
            },
          );
        } catch (error) {
          console.warn(
            "[DialogueOrchestrator] Profile update failed:",
            error,
          );
        }
      }

      return {
        reply: result.reply,
        intent: intent.intent,
        sessionId,
        traceId: traceLogger.traceId,
        agentResults: result.agentResults,
      };
    } catch (error) {
      console.error("[DialogueOrchestrator] chat() fatal error:", error);
      return {
        reply: "抱歉，我暂时无法回答。请稍后再试。",
        intent: "THOUGHT_FOLLOWUP",
        sessionId: request.sessionId ?? "",
        traceId: traceLogger.traceId,
      };
    }
  }

  private async handleCodeSubmission(ctx: HandlerContext): Promise<HandlerResult> {
    const { request, trimmed, profileSummary, intent } = ctx;
    const code =
      intent.entities.codeSnippet ?? request.context?.code ?? "";
    const language =
      intent.entities.language ?? request.context?.language ?? "";
    const symbolic = request.context?.symbolic;
    const testSummary = request.context?.testSummary;

    if (symbolic && testSummary && code) {
      try {
        const codeReview = await runCodeReviewAgent({
          code,
          language,
          symbolic,
          testSummary,
          studentProfileSummary: profileSummary,
          sessionContext: trimmed.recentMessages,
        } as CodeReviewAgentInput);

        let emotion: AgentResultSnapshot["emotion"] | undefined;
        try {
          const emotionResult = await generateEmotionalSupport({
            codeReviewResult: codeReview.reviewSummary,
            studentProfileSummary: profileSummary,
            sessionContext: trimmed.recentMessages,
          } as EmotionInputs);
          if (emotionResult?.emotion_analysis) {
            emotion = emotionResult.emotion_analysis;
          }
        } catch (error) {
          console.warn(
            "[DialogueOrchestrator] emotionAgent failed, skipping:",
            error,
          );
        }

        const agentResults: DialogueAgentResults = {
          codeReview,
          ...(emotion ? { emotion } : {}),
        };

        const reply = await this.generateReply(
          request.message,
          profileSummary,
          trimmed.summary,
          agentResults,
        );

        return {
          reply,
          agentResults,
          sessionStateUpdate: {
            lastCodeReview: { reviewSummary: codeReview.reviewSummary },
          },
        };
      } catch (error) {
        console.warn(
          "[DialogueOrchestrator] codeAgent failed, using LLM fallback:",
          error,
        );
      }
    }

    const reply = await this.generateReply(
      request.message,
      profileSummary,
      trimmed.summary,
    );
    return { reply };
  }

  private async handleEmotionalVenting(
    ctx: HandlerContext,
  ): Promise<HandlerResult> {
    const { request, trimmed, profileSummary } = ctx;
    const sessionState = await this.getSessionState(ctx.sessionId);
    const codeReviewResult =
      sessionState?.lastCodeReview?.reviewSummary ??
      request.context?.codeReviewResult;

    let emotion: AgentResultSnapshot["emotion"] | undefined;
    if (codeReviewResult) {
      try {
        const emotionResult = await generateEmotionalSupport({
          codeReviewResult,
          studentProfileSummary: profileSummary,
          sessionContext: trimmed.recentMessages,
        } as EmotionInputs);
        if (emotionResult?.emotion_analysis) {
          emotion = emotionResult.emotion_analysis;
        }
      } catch (error) {
        console.warn(
          "[DialogueOrchestrator] emotionAgent failed, using LLM fallback:",
          error,
        );
      }
    }

    const agentResults: DialogueAgentResults | undefined = emotion
      ? { emotion }
      : undefined;

    const reply = await this.generateReply(
      request.message,
      profileSummary,
      trimmed.summary,
      agentResults,
    );

    return { reply, agentResults };
  }

  private async handleLearningPath(
    ctx: HandlerContext,
  ): Promise<HandlerResult> {
    const { request, trimmed, profileSummary } = ctx;
    const sessionState = await this.getSessionState(ctx.sessionId);
    const codeReviewResult =
      sessionState?.lastCodeReview?.reviewSummary ??
      request.context?.codeReviewResult;

    let navigation: AgentResultSnapshot["navigation"] | undefined;
    if (codeReviewResult) {
      try {
        const navResult = await generateLearningNavigation({
          codeReviewResult,
          knowledgeGraph: "",
          studentHistory: profileSummary,
          studentProfileSummary: profileSummary,
          sessionContext: trimmed.recentMessages,
        } as NavigatorInputs);
        if (navResult?.learning_navigation) {
          navigation = navResult.learning_navigation;
        }
      } catch (error) {
        console.warn(
          "[DialogueOrchestrator] navigationAgent failed, using LLM fallback:",
          error,
        );
      }
    }

    const agentResults: DialogueAgentResults | undefined = navigation
      ? { navigation }
      : undefined;

    const reply = await this.generateReply(
      request.message,
      profileSummary,
      trimmed.summary,
      agentResults,
    );

    return { reply, agentResults };
  }

  private async handleKnowledgeQuestion(
    ctx: HandlerContext,
  ): Promise<HandlerResult> {
    const { request } = ctx;
    const ragResponse = await this.ragEngine.answer(request.message);

    return {
      reply: ragResponse.answer,
      agentResults: {
        rag: {
          answer: ragResponse.answer,
          sources: ragResponse.sources,
          degraded: ragResponse.degraded,
        },
      },
    };
  }

  private async handleThoughtFollowup(
    ctx: HandlerContext,
  ): Promise<HandlerResult> {
    const { request, trimmed, profileSummary } = ctx;
    const reply = await this.generateReply(
      request.message,
      profileSummary,
      trimmed.summary,
    );
    return { reply };
  }

  private async generateReply(
    message: string,
    profileSummary: string,
    contextSummary: string | undefined,
    agentResults?: DialogueAgentResults,
  ): Promise<string> {
    const contextParts: string[] = [];
    if (profileSummary && profileSummary !== "暂无学生画像数据") {
      contextParts.push(`学生画像：${profileSummary}`);
    }
    if (contextSummary) {
      contextParts.push(`近期对话摘要：${contextSummary}`);
    }
    if (agentResults) {
      const parts: string[] = [];
      if (agentResults.codeReview) {
        parts.push(`代码审查：${agentResults.codeReview.reviewSummary}`);
      }
      if (agentResults.emotion) {
        parts.push(
          `情绪分析：${agentResults.emotion.detected_emotion}(${agentResults.emotion.intensity})`,
        );
      }
      if (agentResults.navigation) {
        parts.push(
          `学习建议：${agentResults.navigation.weaknesses.join("、")}`,
        );
      }
      if (agentResults.rag) {
        parts.push(`知识库回答：${agentResults.rag.answer}`);
      }
      if (parts.length > 0) {
        contextParts.push(`Agent 分析结果：\n${parts.join("\n")}`);
      }
    }

    const systemPrompt =
      `你是编程教学助手。请根据以下信息回答学生的问题，语气亲切、鼓励。\n` +
      (contextParts.length > 0
        ? contextParts.join("\n")
        : "暂无额外上下文。");

    try {
      return await this.llm.chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      });
    } catch (error) {
      console.warn(
        "[DialogueOrchestrator] LLM reply generation failed:",
        error,
      );
      return "抱歉，我暂时无法回答。请稍后再试。";
    }
  }

  private async getSessionState(
    sessionId: string,
  ): Promise<SessionState | undefined> {
    const session = await this.sessionStore.getSession(sessionId);
    return session?.sessionState;
  }
}
