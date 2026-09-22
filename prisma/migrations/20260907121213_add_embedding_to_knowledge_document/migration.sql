/*
  Warnings:

  - You are about to drop the `chat_knowledge` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "knowledge_documents" ADD COLUMN     "embedding" DOUBLE PRECISION[];

-- DropTable
DROP TABLE "chat_knowledge";
