-- CreateTable
CREATE TABLE "BwaEntry" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revenue" DOUBLE PRECISION,
    "personnelCosts" DOUBLE PRECISION,
    "operatingCosts" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "cashPosition" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "BwaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPayment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quarter" INTEGER,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxConfig" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "hebesatz" DOUBLE PRECISION NOT NULL DEFAULT 400,
    "estRatePartner1" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "estRatePartner2" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "profitSplitP1" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BwaEntry_uploadedAt_idx" ON "BwaEntry"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BwaEntry_year_month_key" ON "BwaEntry"("year", "month");

-- CreateIndex
CREATE INDEX "TaxPayment_year_status_idx" ON "TaxPayment"("year", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfig_year_key" ON "TaxConfig"("year");

