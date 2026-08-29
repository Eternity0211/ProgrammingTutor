/*
  Warnings:

  - The primary key for the `_StudentClasses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_StudentClasses` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_StudentClasses" DROP CONSTRAINT "_StudentClasses_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_StudentClasses_AB_unique" ON "_StudentClasses"("A", "B");
