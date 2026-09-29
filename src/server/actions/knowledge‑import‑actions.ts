"use server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scanMdDirectory } from "@/server/model/dialogue/rag/rag‑parser";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";

export async function importKnowledgeDocsAction() {
  if (process.env.KNOWLEDGE_IMPORT_ENABLED !== "1") {
    return { ok: false, error: "知识库导入功能未启用" };
  }

  const user = await getAuthenticatedUser();
  if (!user || user.role !== "FACULTY") {
    return { ok: false, error: "无权执行知识库导入" };
  }

  try {
    const chunks = await scanMdDirectory("./knowledge‑docs");
    const llm = DialogueLlmClient.getInstance();

    for (const ck of chunks) {
      const embedding = await llm.createEmbedding(ck.content);
      await prisma.knowledgeDocument.create({
        data: {
          title: ck.title,
          content: ck.content,
          embedding: embedding,
          metadata: {
            headingPath: ck.headingPath,
            filePath: ck.filePath,
          },
        },
      });
    }
    return { ok: true, count: chunks.length };
  } catch (e) {
    console.error(e);
    return { ok: false, error: String(e) };
  }
}
