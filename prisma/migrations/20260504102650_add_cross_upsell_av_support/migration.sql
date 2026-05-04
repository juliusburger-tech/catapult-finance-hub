-- AlterTable
ALTER TABLE "OtherPayment" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "includeInAv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salesType" TEXT NOT NULL DEFAULT 'other';

-- CreateIndex
CREATE INDEX "OtherPayment_customerId_idx" ON "OtherPayment"("customerId");

-- AddForeignKey
ALTER TABLE "OtherPayment" ADD CONSTRAINT "OtherPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
