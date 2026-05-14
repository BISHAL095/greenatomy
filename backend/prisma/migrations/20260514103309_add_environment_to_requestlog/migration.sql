-- DropIndex
DROP INDEX "RequestLog_projectId_createdAt_idx";

-- AlterTable
ALTER TABLE "RequestLog" ADD COLUMN     "environment" TEXT DEFAULT 'production';

-- CreateIndex
CREATE INDEX "RequestLog_projectId_environment_createdAt_idx" ON "RequestLog"("projectId", "environment", "createdAt");
