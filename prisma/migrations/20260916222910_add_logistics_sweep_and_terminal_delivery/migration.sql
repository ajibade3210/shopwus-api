/*
  Warnings:

  - You are about to drop the `DeliveryZone` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeliveryZone" DROP CONSTRAINT "DeliveryZone_businessId_fkey";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "fallbackShippingFee" DECIMAL(12,2) DEFAULT 3000,
ADD COLUMN     "senderPhone" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "terminalRateId" TEXT,
ADD COLUMN     "terminalShipmentId" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

-- AlterTable
ALTER TABLE "OrderFulfillment" ADD COLUMN     "terminalShipmentId" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "requiresShipping" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weightKg" DECIMAL(8,2);

-- DropTable
DROP TABLE "DeliveryZone";

-- CreateTable
CREATE TABLE "LogisticsSweep" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "ordersCount" INTEGER NOT NULL,
    "transferReference" TEXT NOT NULL,
    "paystackTransferCode" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'RECORD_ONLY',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsSweep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsLedgerEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sweepId" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsSweep_transferReference_key" ON "LogisticsSweep"("transferReference");

-- CreateIndex
CREATE INDEX "LogisticsSweep_status_idx" ON "LogisticsSweep"("status");

-- CreateIndex
CREATE INDEX "LogisticsSweep_transferReference_idx" ON "LogisticsSweep"("transferReference");

-- CreateIndex
CREATE INDEX "LogisticsLedgerEntry_status_idx" ON "LogisticsLedgerEntry"("status");

-- CreateIndex
CREATE INDEX "LogisticsLedgerEntry_orderId_idx" ON "LogisticsLedgerEntry"("orderId");

-- CreateIndex
CREATE INDEX "LogisticsLedgerEntry_sweepId_idx" ON "LogisticsLedgerEntry"("sweepId");

-- AddForeignKey
ALTER TABLE "LogisticsLedgerEntry" ADD CONSTRAINT "LogisticsLedgerEntry_sweepId_fkey" FOREIGN KEY ("sweepId") REFERENCES "LogisticsSweep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsLedgerEntry" ADD CONSTRAINT "LogisticsLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
