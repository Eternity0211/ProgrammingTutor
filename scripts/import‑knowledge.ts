import { PrismaClient } from "@prisma/client";
import { scanMdDirectory } from "@/server/model/dialogue/rag/rag‑parser";
import { DialogueLlmClient } from "@/server/model/dialogue/shared/llm-client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("开始导入知识库 md ...");
  const chunks = await scanMdDirectory("./knowledge‑docs");
  console.log(`解析得到 ${chunks.length} 个文档块`);

  const llm = DialogueLlmClient.getInstance();

  for (const ck of chunks) {
    const embedding: number[] = await llm.createEmbedding(ck.content);
    await prisma.knowledgeDocument.create({
      data: {
        id: randomUUID(),
        title: ck.title,
        content: ck.content,
        embedding: embedding,
        metadata: {
          headingPath: ck.headingPath,
          filePath: ck.filePath,
        },
      } as any,
    });
  }
  console.log("✅全部导入完成，写入 knowledge_documents");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
