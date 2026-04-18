-- CreateTable
CREATE TABLE "BwaEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revenue" REAL,
    "personnelCosts" REAL,
    "operatingCosts" REAL,
    "profit" REAL,
    "cashPosition" REAL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "TaxPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "quarter" INTEGER,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TaxConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "hebesatz" REAL NOT NULL DEFAULT 400,
    "estRatePartner1" REAL NOT NULL DEFAULT 35,
    "estRatePartner2" REAL NOT NULL DEFAULT 35,
    "profitSplitP1" REAL NOT NULL DEFAULT 50,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BwaEntry_year_month_idx" ON "BwaEntry"("year", "month");

-- CreateIndex
CREATE INDEX "BwaEntry_uploadedAt_idx" ON "BwaEntry"("uploadedAt");

-- CreateIndex
CREATE INDEX "TaxPayment_year_status_idx" ON "TaxPayment"("year", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfig_year_key" ON "TaxConfig"("year");
