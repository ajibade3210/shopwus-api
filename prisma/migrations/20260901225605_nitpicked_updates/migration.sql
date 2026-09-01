/*
  Warnings:

  - A unique constraint covering the columns `[businessId,email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "emailHeaderUrl" TEXT,
ADD COLUMN     "headerType" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "includeHeaderInEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeHeaderInInvoice" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_businessId_email_key" ON "Customer"("businessId", "email");
