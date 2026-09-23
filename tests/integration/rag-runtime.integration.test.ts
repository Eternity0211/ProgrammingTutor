import { KnowledgeStore } from "@/server/model/dialogue/rag/knowledge-store";
import { Judge0RuntimeHarness } from "@/server/model/pipeline/runtime-harness";

describe("RAG and runtime integration", () => {
  it("filters persisted-style knowledge metadata before retrieval", async () => {
    const llm = {
      createEmbedding: jest.fn().mockResolvedValue([1, 0]),
    };
    const store = new KnowledgeStore(llm as never);
    await store.addDocument({
      id: "cpp-1",
      title: "Arrays",
      content: "C++ array bounds",
      metadata: { language: "cpp", topic: "arrays" },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    await store.addDocument({
      id: "python-1",
      title: "Lists",
      content: "Python list bounds",
      metadata: { language: "python", topic: "lists" },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    expect((await store.search("bounds", 3, { language: "cpp" })).map((r) => r.document.id)).toEqual(["cpp-1"]);
  });

  it("normalizes a Judge0 response through the shared harness boundary", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      stdout: Buffer.from("ok").toString("base64"),
      status: { id: 3, description: "Accepted" },
      time: "0.01",
    }), { status: 200 }));
    const result = await new Judge0RuntimeHarness().execute({ code: "int main(){}", languageId: 54 });
    expect(result).toMatchObject({ status: "passed", output: "ok", runtimeMs: 10 });
    fetchMock.mockRestore();
  });
});
