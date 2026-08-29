-- AlterTable
ALTER TABLE "CodeDraft" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "_StudentClasses" ADD CONSTRAINT "_StudentClasses_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_StudentClasses_AB_unique";
