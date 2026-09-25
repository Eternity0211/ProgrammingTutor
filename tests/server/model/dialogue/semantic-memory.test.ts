import { describe, expect, it } from "@jest/globals";
import { InMemorySemanticMemoryStore } from "@/server/model/dialogue/memory";

describe("semantic memory", () => {
  it("recalls the most similar memory for the same user", async () => {
    const store = new InMemorySemanticMemoryStore();
    await store.remember({ id: "a", userId: "u1", text: "arrays", embedding: [1, 0], createdAt: new Date() });
    await store.remember({ id: "b", userId: "u1", text: "graphs", embedding: [0, 1], createdAt: new Date() });
    await store.remember({ id: "c", userId: "u2", text: "arrays", embedding: [1, 0], createdAt: new Date() });
    const memories = await store.recall("u1", [0.9, 0.1], 1);
    expect(memories.map((memory) => memory.text)).toEqual(["arrays"]);
  });
});
