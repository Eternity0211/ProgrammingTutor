/*
  Warnings:

  - Added the required column `facultyName` to the `Classroom` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "facultyName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
