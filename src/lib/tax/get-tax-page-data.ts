import { prisma } from "@/lib/prisma";
import {
  estimateTaxReserve,
  type TaxConfigSnapshot,
  type TaxReserveBreakdown,
} from "@/lib/tax/estimate-reserve";
import { DEFAULT_TAX_CONFIG } from "@/lib/tax/defaults";
import type { TaxPayment } from "@prisma/client";

export type TaxPageData = {
  year: number;
  yearOptions: number[];
  profitYtd: number;
  config: TaxConfigSnapshot;
  hasConfigRow: boolean;
  breakdown: TaxReserveBreakdown;
  paidYtd: number;
  openReserve: number;
  payments: TaxPayment[];
};

function mergeYearOptions(years: number[]): number[] {
  const current = new Date().getFullYear();
  const set = new Set<number>(years);
  set.add(current);
  return Array.from(set).sort((a, b) => b - a);
}

export async function getTaxPageData(year: number): Promise<TaxPageData> {
  const [bwaYears, taxYears, paymentYears] = await Promise.all([
    prisma.bwaEntry.findMany({
      select: { year: true },
      distinct: ["year"],
    }),
    prisma.taxConfig.findMany({ select: { year: true } }),
    prisma.taxPayment.findMany({
      select: { year: true },
      distinct: ["year"],
    }),
  ]);

  const yearOptions = mergeYearOptions([
    ...bwaYears.map((r) => r.year),
    ...taxYears.map((r) => r.year),
    ...paymentYears.map((r) => r.year),
  ]);

  const bwaEntries = await prisma.bwaEntry.findMany({
    where: { year },
  });

  const profitYtd = bwaEntries.reduce((sum, e) => sum + (e.profit ?? 0), 0);

  const taxConfigRow = await prisma.taxConfig.findUnique({
    where: { year },
  });

  const config: TaxConfigSnapshot = taxConfigRow
    ? {
        hebesatz: taxConfigRow.hebesatz,
        estRatePartner1: taxConfigRow.estRatePartner1,
        estRatePartner2: taxConfigRow.estRatePartner2,
        profitSplitP1: taxConfigRow.profitSplitP1,
      }
    : { ...DEFAULT_TAX_CONFIG };

  const breakdown = estimateTaxReserve(profitYtd, config);

  const payments = await prisma.taxPayment.findMany({
    where: { year, status: "active" },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const paidYtd = payments.reduce((sum, p) => sum + p.amount, 0);
  const openReserve = breakdown.totalRecommended - paidYtd;

  return {
    year,
    yearOptions,
    profitYtd,
    config,
    hasConfigRow: Boolean(taxConfigRow),
    breakdown,
    paidYtd,
    openReserve,
    payments,
  };
}
