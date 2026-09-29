jest.mock("@/lib/auth", () => ({
  getAuthenticatedUser: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    knowledgeDocument: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/server/model/dialogue/rag/rag‑parser", () => ({
  scanMdDirectory: jest.fn(),
}));
jest.mock("@/server/model/dialogue/shared/llm-client", () => ({
  DialogueLlmClient: {
    getInstance: jest.fn(),
  },
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importKnowledgeDocsAction } from "@/server/actions/knowledge‑import‑actions";
import { scanMdDirectory } from "@/server/model/dialogue/rag/rag‑parser";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";

const mockedUser = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;
const mockedScan = scanMdDirectory as jest.MockedFunction<
  typeof scanMdDirectory
>;
const createDocument = prisma.knowledgeDocument.create as jest.Mock;
const getLlm = DialogueLlmClient.getInstance as jest.Mock;

describe("importKnowledgeDocsAction", () => {
  const originalFlag = process.env.KNOWLEDGE_IMPORT_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.KNOWLEDGE_IMPORT_ENABLED;
  });

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env.KNOWLEDGE_IMPORT_ENABLED;
    } else {
      process.env.KNOWLEDGE_IMPORT_ENABLED = originalFlag;
    }
  });

  it("默认关闭，且不查询用户或写入数据", async () => {
    await expect(importKnowledgeDocsAction()).resolves.toEqual({
      ok: false,
      error: "知识库导入功能未启用",
    });
    expect(mockedUser).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("拒绝未登录用户和学生", async () => {
    process.env.KNOWLEDGE_IMPORT_ENABLED = "1";
    mockedUser.mockResolvedValueOnce(null);
    await expect(importKnowledgeDocsAction()).resolves.toMatchObject({
      ok: false,
      error: "无权执行知识库导入",
    });

    mockedUser.mockResolvedValueOnce({ role: "STUDENT" } as never);
    await expect(importKnowledgeDocsAction()).resolves.toMatchObject({
      ok: false,
      error: "无权执行知识库导入",
    });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("允许显式开启后的教师导入文档", async () => {
    process.env.KNOWLEDGE_IMPORT_ENABLED = "1";
    mockedUser.mockResolvedValue({ role: "FACULTY" } as never);
    mockedScan.mockResolvedValue([
      {
        title: "Pointers",
        content: "Use RAII for ownership.",
        headingPath: ["C++", "Pointers"],
        filePath: "knowledge-docs/pointers.md",
      },
    ]);
    getLlm.mockReturnValue({
      createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
    });
    createDocument.mockResolvedValue({ id: "doc-1" });

    await expect(importKnowledgeDocsAction()).resolves.toEqual({
      ok: true,
      count: 1,
    });
    expect(createDocument).toHaveBeenCalledWith({
      data: {
        title: "Pointers",
        content: "Use RAII for ownership.",
        embedding: [0.1, 0.2],
        metadata: {
          headingPath: ["C++", "Pointers"],
          filePath: "knowledge-docs/pointers.md",
        },
      },
    });
  });
});
