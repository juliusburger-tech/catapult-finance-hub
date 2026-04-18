-- Drop non-unique composite index from initial migration (if present)
DROP INDEX IF EXISTS "BwaEntry_year_month_idx";

-- Enforce at most one BWA per calendar month
CREATE UNIQUE INDEX IF NOT EXISTS "BwaEntry_year_month_key" ON "BwaEntry"("year", "month");
