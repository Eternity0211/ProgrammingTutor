import { prisma } from "@/lib/prisma";
import type { ChatMessage, ChatSession, SessionState } from "../types";
import type { SessionStore } from "./session-store";

export class DbSessionStore implements SessionStore {
  async createSession(userId: string): Promise<ChatSession> {
    try {
      const dbSession = await prisma.chatSession.create({
        data: { userId },
      });
      return this.mapSession(dbSession, []);
    } catch (error) {
      console.warn("[DbSessionStore] createSession failed:", error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const dbSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { timestamp: "asc" } } },
      });
      if (!dbSession) return null;
      return this.mapSession(dbSession, dbSession.messages);
    } catch (error) {
      console.warn("[DbSessionStore] getSession failed:", error);
      return null;
    }
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: message.role,
          content: message.content,
          timestamp: new Date(message.timestamp),
          metadata: (message.metadata ?? null) as never,
        },
      });
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      console.warn("[DbSessionStore] addMessage failed:", error);
    }
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const dbMessages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: "asc" },
      });
      return dbMessages.map((m) => this.mapMessage(m));
    } catch (error) {
      console.warn("[DbSessionStore] getMessages failed:", error);
      return [];
    }
  }

  async updateSessionState(
    sessionId: string,
    state: SessionState,
  ): Promise<void> {
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { sessionState: state as never, updatedAt: new Date() },
      });
    } catch (error) {
      console.warn("[DbSessionStore] updateSessionState failed:", error);
    }
  }

  async updateTitle(sessionId: string, title: string): Promise<void> {
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title, updatedAt: new Date() },
      });
    } catch (error) {
      console.warn("[DbSessionStore] updateTitle failed:", error);
    }
  }

  async getSessionsByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const dbSessions = await prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      return dbSessions.map((s) => this.mapSession(s, []));
    } catch (error) {
      console.warn("[DbSessionStore] getSessionsByUserId failed:", error);
      return [];
    }
  }

  private mapSession(db: any, dbMessages: any[]): ChatSession {
    return {
      sessionId: db.id,
      userId: db.userId,
      title: db.title ?? undefined,
      messages: dbMessages.map((m: any) => this.mapMessage(m)),
      createdAt:
        db.createdAt instanceof Date
          ? db.createdAt.getTime()
          : Number(db.createdAt),
      updatedAt:
        db.updatedAt instanceof Date
          ? db.updatedAt.getTime()
          : Number(db.updatedAt),
      sessionState: (db.sessionState ?? undefined) as SessionState | undefined,
    };
  }

  private mapMessage(db: any): ChatMessage {
    return {
      id: db.id,
      role: db.role as ChatMessage["role"],
      content: db.content,
      timestamp:
        db.timestamp instanceof Date
          ? db.timestamp.getTime()
          : Number(db.timestamp),
      metadata: (db.metadata ?? undefined) as Record<string, unknown> | undefined,
    };
  }
}
