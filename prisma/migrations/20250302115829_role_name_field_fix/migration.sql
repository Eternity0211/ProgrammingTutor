/*
  Warnings:

  - You are about to drop the column `Role` on the `users` table. All the data in the column will be lost.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "DueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "Role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STUDENT',
ALTER COLUMN "name" SET NOT NULL;
