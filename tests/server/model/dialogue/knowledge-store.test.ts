import {
  KnowledgeStore,
  cosineSimilarity,
} from "@/server/model/dialogue/rag/knowledge-store";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";
import type { KnowledgeDocument } from "@/server/model/dialogue/types";

function makeMockLlm() {
  return {
    chatCompletion: jest.fn(),
    createEmbedding: jest.fn(),
  } as unknown as DialogueLlmClient & {
    chatCompletion: jest.Mock;
    createEmbedding: jest.Mock;
  };
}

describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
  });

  it("should return 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it("should return -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBe(-1);
  });

  it("should return 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("should return 0 for different length vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

describe("KnowledgeStore", () => {
  let mockLlm: ReturnType<typeof makeMockLlm>;
  let store: KnowledgeStore;

  beforeEach(() => {
    mockLlm = makeMockLlm();
    mockLlm.createEmbedding.mockImplementation(async (text: string) => {
      if (text.includes("指针")) return [1, 0, 0];
      if (text.includes("递归")) return [0, 1, 0];
      return [0, 0, 1];
    });
    store = new KnowledgeStore(mockLlm);
  });

  it("should add document and generate embedding", async () => {
    const doc: KnowledgeDocument = {
      id: "doc-1",
      title: "指针",
      content: "指针是变量的内存地址",
      source: "textbook",
    };
    await store.addDocument(doc);
    expect(store.size()).toBe(1);
    expect(mockLlm.createEmbedding).toHaveBeenCalledWith(
      "指针是变量的内存地址",
    );
  });

  it("should search and return ranked results", async () => {
    await store.addDocument({
      id: "doc-1",
      title: "指针",
      content: "指针是变量的内存地址",
      source: "textbook",
    });
    await store.addDocument({
      id: "doc-2",
      title: "递归",
      content: "递归是函数调用自身",
      source: "textbook",
    });

    const results = await store.search("什么是指针", 2);
    expect(results).toHaveLength(2);
    expect(results[0].document.id).toBe("doc-1");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("should return empty array for empty store", async () => {
    const results = await store.search("什么是指针");
    expect(results).toEqual([]);
    expect(mockLlm.createEmbedding).not.toHaveBeenCalled();
  });

  it("should return topK results", async () => {
    await store.addDocument({
      id: "doc-1",
      title: "指针",
      content: "指针是变量的内存地址",
      source: "textbook",
    });
    await store.addDocument({
      id: "doc-2",
      title: "递归",
      content: "递归是函数调用自身",
      source: "textbook",
    });

    const results = await store.search("什么是指针", 1);
    expect(results).toHaveLength(1);
    expect(results[0].document.id).toBe("doc-1");
  });

  it("should clear all documents", async () => {
    await store.addDocument({
      id: "doc-1",
      title: "指针",
      content: "指针是变量的内存地址",
      source: "textbook",
    });
    expect(store.size()).toBe(1);
    store.clear();
    expect(store.size()).toBe(0);
    const results = await store.search("什么是指针");
    expect(results).toEqual([]);
  });

  it("should return all documents via getDocuments", async () => {
    await store.addDocument({
      id: "doc-1",
      title: "指针",
      content: "指针是变量的内存地址",
      source: "textbook",
    });
    await store.addDocument({
      id: "doc-2",
      title: "递归",
      content: "递归是函数调用自身",
      source: "textbook",
    });
    const docs = store.getDocuments();
    expect(docs).toHaveLength(2);
    expect(docs[0].id).toBe("doc-1");
    expect(docs[1].id).toBe("doc-2");
  });

  it("should return a copy from getDocuments (immutability)", async () => {
    await store.addDocument({
      id: "doc-1",
      title: "指针",
      content: "指针是变量的内存地址",
      source: "textbook",
    });
    const docs1 = store.getDocuments();
    docs1.push({
      id: "doc-2",
      title: "test",
      content: "test",
      source: "test",
    });
    const docs2 = store.getDocuments();
    expect(docs2).toHaveLength(1);
  });
});
