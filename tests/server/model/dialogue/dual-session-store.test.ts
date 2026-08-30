import { DualSessionStore } from "@/server/model/dialogue/memory/dual-session-store";
import { createChatMessage } from "@/server/model/dialogue/memory/session-store";
import type { SessionStore } from "@/server/model/dialogue/memory/session-store";
import type { ChatMessage, ChatSession, SessionState } from "@/server/model/dialogue/types";

function makeSession(userId = "user-1"): ChatSession {
  return {
    sessionId: `session-${Math.random().toString(36).slice(2)}`,
    userId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function makeMockStore(): jest.Mocked<SessionStore> {
  return {
    createSession: jest.fn(),
    getSession: jest.fn(),
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    updateSessionState: jest.fn(),
    getSessionsByUserId: jest.fn(),
  } as unknown as jest.Mocked<SessionStore>;
}

describe("DualSessionStore", () => {
  it("should write to both DB and memory on createSession", async () => {
    const mockDb = makeMockStore();
    const dbSession = makeSession("user-1");
    mockDb.createSession.mockResolvedValue(dbSession);
    const dual = new DualSessionStore(mockDb);

    const session = await dual.createSession("user-1");

    expect(mockDb.createSession).toHaveBeenCalledWith("user-1");
    expect(session.sessionId).toBe(dbSession.sessionId);
    const cached = await dual.getSession(session.sessionId);
    expect(cached).not.toBeNull();
  });

  it("should fall back to memory when DB createSession fails", async () => {
    const mockDb = makeMockStore();
    mockDb.createSession.mockRejectedValue(new Error("DB down"));
    const dual = new DualSessionStore(mockDb);

    const session = await dual.createSession("user-1");

    expect(session.userId).toBe("user-1");
    expect(session.sessionId).toBeTruthy();
    const cached = await dual.getSession(session.sessionId);
    expect(cached).not.toBeNull();
  });

  it("should return cached session from memory without DB call", async () => {
    const mockDb = makeMockStore();
    const dbSession = makeSession("user-1");
    mockDb.createSession.mockResolvedValue(dbSession);
    const dual = new DualSessionStore(mockDb);

    await dual.createSession("user-1");
    mockDb.getSession.mockClear();

    const found = await dual.getSession(dbSession.sessionId);
    expect(found).not.toBeNull();
    expect(mockDb.getSession).not.toHaveBeenCalled();
  });

  it("should read from DB on memory miss and cache result", async () => {
    const mockDb = makeMockStore();
    const dbSession = makeSession("user-1");
    dbSession.messages = [createChatMessage("user", "from db")];
    mockDb.getSession.mockResolvedValue(dbSession);
    const dual = new DualSessionStore(mockDb);

    const found = await dual.getSession(dbSession.sessionId);
    expect(mockDb.getSession).toHaveBeenCalledWith(dbSession.sessionId);
    expect(found).not.toBeNull();
    expect(found!.messages).toHaveLength(1);

    mockDb.getSession.mockClear();
    const cached = await dual.getSession(dbSession.sessionId);
    expect(mockDb.getSession).not.toHaveBeenCalled();
  });

  it("should write to both memory and DB on addMessage", async () => {
    const mockDb = makeMockStore();
    const dbSession = makeSession("user-1");
    mockDb.createSession.mockResolvedValue(dbSession);
    const dual = new DualSessionStore(mockDb);

    const session = await dual.createSession("user-1");
    const msg = createChatMessage("user", "hello");
    await dual.addMessage(session.sessionId, msg);

    expect(mockDb.addMessage).toHaveBeenCalledWith(session.sessionId, msg);
    const messages = await dual.getMessages(session.sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("hello");
  });

  it("should not block memory write when DB addMessage fails", async () => {
    const mockDb = makeMockStore();
    const dbSession = makeSession("user-1");
    mockDb.createSession.mockResolvedValue(dbSession);
    mockDb.addMessage.mockRejectedValue(new Error("DB write failed"));
    const dual = new DualSessionStore(mockDb);

    const session = await dual.createSession("user-1");
    const msg = createChatMessage("user", "hello");
    await dual.addMessage(session.sessionId, msg);

    const messages = await dual.getMessages(session.sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("hello");
  });

  it("should load session from DB when addMessage targets uncached session", async () => {
    const mockDb = makeMockStore();
    const dbSession = makeSession("user-1");
    mockDb.getSession.mockResolvedValue(dbSession);
    const dual = new DualSessionStore(mockDb);

    const msg = createChatMessage("user", "hello");
    await dual.addMessage(dbSession.sessionId, msg);

    expect(mockDb.getSession).toHaveBeenCalledWith(dbSession.sessionId);
    expect(mockDb.addMessage).toHaveBeenCalledWith(dbSession.sessionId, msg);
    const messages = await dual.getMessages(dbSession.sessionId);
    expect(messages).toHaveLength(1);
  });

  it("should skip addMessage when session not found anywhere", async () => {
    const mockDb = makeMockStore();
    mockDb.getSession.mockResolvedValue(null);
    const dual = new DualSessionStore(mockDb);

    const msg = createChatMessage("user", "hello");
    await dual.addMessage("nonexistent", msg);

    expect(mockDb.addMessage).not.toHaveBeenCalled();
  });

  it("should read messages from DB on memory miss", async () => {
    const mockDb = makeMockStore();
    const dbMessages = [createChatMessage("user", "db msg")];
    mockDb.getMessages.mockResolvedValue(dbMessages);
    const dual = new DualSessionStore(mockDb);

    const messages = await dual.getMessages("session-1");
    expect(mockDb.getMessages).toHaveBeenCalledWith("session-1");
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("db msg");
  });

  it("should write to both on updateSessionState", async () => {
    const mockDb = makeMockStore();
    const dbSession = makeSession("user-1");
    mockDb.createSession.mockResolvedValue(dbSession);
    const dual = new DualSessionStore(mockDb);

    const session = await dual.createSession("user-1");
    const state: SessionState = { lastIntent: "EMOTIONAL_VENTING" };
    await dual.updateSessionState(session.sessionId, state);

    expect(mockDb.updateSessionState).toHaveBeenCalledWith(
      session.sessionId,
      state,
    );
    const found = await dual.getSession(session.sessionId);
    expect(found!.sessionState).toEqual(state);
  });

  it("should get sessions by userId from DB on memory miss", async () => {
    const mockDb = makeMockStore();
    const dbSessions = [makeSession("user-1"), makeSession("user-1")];
    mockDb.getSessionsByUserId.mockResolvedValue(dbSessions);
    const dual = new DualSessionStore(mockDb);

    const sessions = await dual.getSessionsByUserId("user-1");
    expect(mockDb.getSessionsByUserId).toHaveBeenCalledWith("user-1");
    expect(sessions).toHaveLength(2);

    mockDb.getSessionsByUserId.mockClear();
    const cached = await dual.getSessionsByUserId("user-1");
    expect(mockDb.getSessionsByUserId).not.toHaveBeenCalled();
    expect(cached).toHaveLength(2);
  });

  it("should return empty array when DB fails on getSessionsByUserId", async () => {
    const mockDb = makeMockStore();
    mockDb.getSessionsByUserId.mockRejectedValue(new Error("DB down"));
    const dual = new DualSessionStore(mockDb);

    const sessions = await dual.getSessionsByUserId("user-1");
    expect(sessions).toEqual([]);
  });
});
