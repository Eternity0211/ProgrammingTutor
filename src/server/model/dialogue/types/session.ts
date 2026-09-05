import { DialogueIntent } from "./intent";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AgentResultSnapshot {
  codeReview?: {
    reviewSummary: string;
    causalAnalysis: string;
    suggestions: string[];
    confidence: number;
  };
  emotion?: {
    detected_emotion: string;
    intensity: "弱" | "中" | "强";
    reason: string;
    supportive_guidance: string;
  };
  navigation?: {
    weaknesses: string[];
    learning_path: Array<{
      step: number;
      topic: string;
      duration: string;
      resources: string[];
    }>;
    recommended_exercises: Array<{
      id: string;
      title: string;
      difficulty: "入门" | "初级" | "中级" | "高级";
      purpose: string;
      url: string;
    }>;
  };
}

export interface SessionState {
  lastIntent?: DialogueIntent;
  lastCodeReview?: {
    reviewSummary: string;
  };
  contextSummary?: string;
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  sessionState?: SessionState;
}
