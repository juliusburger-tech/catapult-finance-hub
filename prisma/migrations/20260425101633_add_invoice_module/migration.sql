-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "contractStart" TIMESTAMP(3) NOT NULL,
    "contractEnd" TIMESTAMP(3) NOT NULL,
    "paymentModel" TEXT NOT NULL,
    "paymentDay" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentConfig" TEXT NOT NULL,
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractFile" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentScheduleEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dueMonth" INTEGER NOT NULL,
    "dueYear" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "entryType" TEXT NOT NULL,
    "invoiceSent" BOOLEAN NOT NULL DEFAULT false,
    "invoiceSentAt" TIMESTAMP(3),
    "sepaConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_contractStart_idx" ON "Customer"("contractStart");

-- CreateIndex
CREATE INDEX "PaymentScheduleEntry_dueYear_dueMonth_idx" ON "PaymentScheduleEntry"("dueYear", "dueMonth");

-- CreateIndex
CREATE INDEX "PaymentScheduleEntry_customerId_idx" ON "PaymentScheduleEntry"("customerId");

-- AddForeignKey
ALTER TABLE "PaymentScheduleEntry" ADD CONSTRAINT "PaymentScheduleEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
