import {
  InMemorySessionStore,
  createChatMessage,
} from "@/server/model/dialogue/memory/session-store";
import type { SessionState } from "@/server/model/dialogue/types";

describe("InMemorySessionStore", () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it("should create a session with unique id and correct userId", async () => {
    const s1 = await store.createSession("user-1");
    const s2 = await store.createSession("user-1");
    expect(s1.sessionId).toBeTruthy();
    expect(s2.sessionId).toBeTruthy();
    expect(s1.sessionId).not.toBe(s2.sessionId);
    expect(s1.userId).toBe("user-1");
    expect(s1.messages).toEqual([]);
  });

  it("should get session by id", async () => {
    const created = await store.createSession("user-1");
    const found = await store.getSession(created.sessionId);
    expect(found).not.toBeNull();
    expect(found!.sessionId).toBe(created.sessionId);
  });

  it("should return null for unknown session id", async () => {
    const found = await store.getSession("nonexistent");
    expect(found).toBeNull();
  });

  it("should add message to session", async () => {
    const session = await store.createSession("user-1");
    const msg = createChatMessage("user", "hello");
    await store.addMessage(session.sessionId, msg);
    const messages = await store.getMessages(session.sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("hello");
  });

  it("should not throw when adding message to unknown session", async () => {
    const msg = createChatMessage("user", "hello");
    await expect(
      store.addMessage("nonexistent", msg),
    ).resolves.toBeUndefined();
  });

  it("should return empty array for unknown session getMessages", async () => {
    const messages = await store.getMessages("nonexistent");
    expect(messages).toEqual([]);
  });

  it("should update session state", async () => {
    const session = await store.createSession("user-1");
    const state: SessionState = {
      lastIntent: "KNOWLEDGE_QUESTION",
      contextSummary: "讨论指针",
    };
    await store.updateSessionState(session.sessionId, state);
    const found = await store.getSession(session.sessionId);
    expect(found!.sessionState).toEqual(state);
  });

  it("should not throw when updating state of unknown session", async () => {
    await expect(
      store.updateSessionState("nonexistent", { lastIntent: "KNOWLEDGE_QUESTION" }),
    ).resolves.toBeUndefined();
  });

  it("should get sessions by user id", async () => {
    await store.createSession("user-1");
    await store.createSession("user-1");
    await store.createSession("user-2");
    const user1Sessions = await store.getSessionsByUserId("user-1");
    expect(user1Sessions).toHaveLength(2);
    expect(user1Sessions.every((s) => s.userId === "user-1")).toBe(true);
  });

  it("should return empty array for unknown user", async () => {
    const sessions = await store.getSessionsByUserId("nobody");
    expect(sessions).toEqual([]);
  });

  it("should cache a session via setSession", async () => {
    const session = await store.createSession("user-1");
    const store2 = new InMemorySessionStore();
    store2.setSession(session);
    const found = await store2.getSession(session.sessionId);
    expect(found).not.toBeNull();
    expect(found!.sessionId).toBe(session.sessionId);
  });

  it("should setSession with a copy (immutability)", async () => {
    const session = await store.createSession("user-1");
    const msg = createChatMessage("user", "hello");
    session.messages.push(msg);
    store.setSession(session);
    const found = await store.getSession(session.sessionId);
    expect(found!.messages).toHaveLength(1);
    session.messages.push(createChatMessage("user", "second"));
    const found2 = await store.getSession(session.sessionId);
    expect(found2!.messages).toHaveLength(1);
  });
});
