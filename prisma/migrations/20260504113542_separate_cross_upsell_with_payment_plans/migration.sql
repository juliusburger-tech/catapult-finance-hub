-- AlterTable
ALTER TABLE "OtherPayment" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'other_payment',
ADD COLUMN     "planConfig" TEXT,
ADD COLUMN     "planGroupId" TEXT,
ADD COLUMN     "planType" TEXT;

-- CreateIndex
CREATE INDEX "OtherPayment_kind_idx" ON "OtherPayment"("kind");

-- CreateIndex
CREATE INDEX "OtherPayment_planGroupId_idx" ON "OtherPayment"("planGroupId");
