import { randomUUID } from "crypto";
import type { ChatMessage, ChatRole, ChatSession, SessionState } from "../types";

export interface SessionStore {
  createSession(userId: string): Promise<ChatSession>;
  getSession(sessionId: string): Promise<ChatSession | null>;
  addMessage(sessionId: string, message: ChatMessage): Promise<void>;
  getMessages(sessionId: string): Promise<ChatMessage[]>;
  updateSessionState(sessionId: string, state: SessionState): Promise<void>;
  getSessionsByUserId(userId: string): Promise<ChatSession[]>;
}

export function createChatMessage(
  role: ChatRole,
  content: string,
  metadata?: Record<string, unknown>,
): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    timestamp: Date.now(),
    metadata,
  };
}

export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, ChatSession>();

  async createSession(userId: string): Promise<ChatSession> {
    const sessionId = randomUUID();
    const now = Date.now();
    const session: ChatSession = {
      sessionId,
      userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.messages.push(message);
    session.updatedAt = Date.now();
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const session = this.sessions.get(sessionId);
    return session?.messages ?? [];
  }

  async updateSessionState(
    sessionId: string,
    state: SessionState,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.sessionState = state;
    session.updatedAt = Date.now();
  }

  async getSessionsByUserId(userId: string): Promise<ChatSession[]> {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId,
    );
  }

  setSession(session: ChatSession): void {
    this.sessions.set(session.sessionId, {
      ...session,
      messages: [...session.messages],
    });
  }
}
