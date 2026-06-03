-- AlterTable
ALTER TABLE "RequestLog" ADD COLUMN     "totalExternalCostUsd" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ExternalCost" (
    "id" TEXT NOT NULL,
    "requestLogId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "operation" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "latencyMs" INTEGER,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalCost_requestLogId_idx" ON "ExternalCost"("requestLogId");

-- CreateIndex
CREATE INDEX "ExternalCost_provider_createdAt_idx" ON "ExternalCost"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalCost_label_idx" ON "ExternalCost"("label");

-- AddForeignKey
ALTER TABLE "ExternalCost" ADD CONSTRAINT "ExternalCost_requestLogId_fkey" FOREIGN KEY ("requestLogId") REFERENCES "RequestLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
