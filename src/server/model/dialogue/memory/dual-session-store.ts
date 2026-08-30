import type { ChatMessage, ChatSession, SessionState } from "../types";
import type { SessionStore } from "./session-store";
import { InMemorySessionStore } from "./session-store";

export class DualSessionStore implements SessionStore {
  private memory: InMemorySessionStore;
  private db: SessionStore;

  constructor(db: SessionStore) {
    this.memory = new InMemorySessionStore();
    this.db = db;
  }

  async createSession(userId: string): Promise<ChatSession> {
    let session: ChatSession;
    try {
      session = await this.db.createSession(userId);
    } catch (error) {
      console.warn(
        "[DualSessionStore] DB createSession failed, using memory only:",
        error,
      );
      session = await this.memory.createSession(userId);
    }
    this.memory.setSession(session);
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    const cached = await this.memory.getSession(sessionId);
    if (cached) return cached;

    try {
      const dbSession = await this.db.getSession(sessionId);
      if (dbSession) {
        this.memory.setSession(dbSession);
      }
      return dbSession;
    } catch (error) {
      console.warn("[DualSessionStore] DB getSession failed:", error);
      return null;
    }
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    let session = await this.memory.getSession(sessionId);
    if (!session) {
      try {
        const dbSession = await this.db.getSession(sessionId);
        if (dbSession) {
          this.memory.setSession(dbSession);
          session = dbSession;
        } else {
          return;
        }
      } catch (error) {
        console.warn("[DualSessionStore] DB getSession for addMessage failed:", error);
        return;
      }
    }
    await this.memory.addMessage(sessionId, message);
    try {
      await this.db.addMessage(sessionId, message);
    } catch (error) {
      console.warn("[DualSessionStore] DB addMessage failed:", error);
    }
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const session = await this.memory.getSession(sessionId);
    if (session && session.messages.length > 0) {
      return session.messages;
    }

    try {
      const messages = await this.db.getMessages(sessionId);
      if (session && messages.length > 0) {
        session.messages = messages;
      }
      return messages;
    } catch (error) {
      console.warn("[DualSessionStore] DB getMessages failed:", error);
      return session?.messages ?? [];
    }
  }

  async updateSessionState(
    sessionId: string,
    state: SessionState,
  ): Promise<void> {
    await this.memory.updateSessionState(sessionId, state);
    try {
      await this.db.updateSessionState(sessionId, state);
    } catch (error) {
      console.warn("[DualSessionStore] DB updateSessionState failed:", error);
    }
  }

  async getSessionsByUserId(userId: string): Promise<ChatSession[]> {
    const cached = await this.memory.getSessionsByUserId(userId);
    if (cached.length > 0) return cached;

    try {
      const dbSessions = await this.db.getSessionsByUserId(userId);
      for (const s of dbSessions) {
        this.memory.setSession(s);
      }
      return dbSessions;
    } catch (error) {
      console.warn("[DualSessionStore] DB getSessionsByUserId failed:", error);
      return [];
    }
  }
}
