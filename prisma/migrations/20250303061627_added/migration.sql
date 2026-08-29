/*
  Warnings:

  - A unique constraint covering the columns `[inviteLink]` on the table `Classroom` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inviteLink` to the `Classroom` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "inviteLink" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_inviteLink_key" ON "Classroom"("inviteLink");
