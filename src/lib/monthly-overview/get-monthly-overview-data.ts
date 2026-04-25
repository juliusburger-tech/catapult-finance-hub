import type { BwaEntry } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { GERMAN_MONTH_LABELS } from "@/lib/bwa/months";
import { DEFAULT_TAX_CONFIG } from "@/lib/tax/defaults";
import { estimateTaxReserve } from "@/lib/tax/estimate-reserve";
import type { TaxReserveBreakdown } from "@/lib/tax/estimate-reserve";

export type MonthStripItem = {
  month: number;
  shortLabel: string;
  hasBwa: boolean;
  isSelected: boolean;
};

export type MonthlyOverviewData = {
  year: number;
  selectedMonth: number;
  yearOptions: number[];
  monthStrip: MonthStripItem[];
  selectedEntry: BwaEntry | null;
  cumulative: {
    revenue: number;
    profit: number;
    profitMargin: number | null;
    personnelCosts: number;
    operatingCosts: number;
    monthsWithDataInRange: number;
  };
  missingMonthsInRange: number[];
  periodLabelDe: string;
  tax: {
    breakdown: TaxReserveBreakdown;
    paidYtd: number;
    openReserve: number;
    profitBasisNote: string;
  };
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mrz",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
] as const;

function mergeYearOptions(years: number[]): number[] {
  const current = new Date().getFullYear();
  const set = new Set<number>(years);
  set.add(current);
  return Array.from(set).sort((a, b) => b - a);
}

function formatCumulativePeriodDe(year: number, throughMonth: number): string {
  if (throughMonth === 1) {
    return `${GERMAN_MONTH_LABELS[0]} ${year}`;
  }
  const end = GERMAN_MONTH_LABELS[throughMonth - 1];
  if (!end) {
    return `Monat 1–${throughMonth} ${year}`;
  }
  return `Januar–${end} ${year}`;
}

export async function getMonthlyOverviewData(
  year: number,
  selectedMonth: number,
): Promise<MonthlyOverviewData> {
  const distinctYears = await prisma.bwaEntry.findMany({
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  const yearOptions = mergeYearOptions(distinctYears.map((r) => r.year));

  const entries = await prisma.bwaEntry.findMany({
    where: { year },
    orderBy: { month: "asc" },
  });

  const byMonth = new Map<number, BwaEntry>();
  for (const e of entries) {
    byMonth.set(e.month, e);
  }

  let revenue = 0;
  let profit = 0;
  let personnelCosts = 0;
  let operatingCosts = 0;
  let monthsWithDataInRange = 0;
  const missingMonthsInRange: number[] = [];

  for (let m = 1; m <= selectedMonth; m += 1) {
    const row = byMonth.get(m);
    if (row) {
      monthsWithDataInRange += 1;
      revenue += row.revenue ?? 0;
      profit += row.profit ?? 0;
      personnelCosts += row.personnelCosts ?? 0;
      operatingCosts += row.operatingCosts ?? 0;
    } else {
      missingMonthsInRange.push(m);
    }
  }

  const taxConfigRow = await prisma.taxConfig.findUnique({
    where: { year },
  });

  const config = taxConfigRow
    ? {
        hebesatz: taxConfigRow.hebesatz,
        estRatePartner1: taxConfigRow.estRatePartner1,
        estRatePartner2: taxConfigRow.estRatePartner2,
        profitSplitP1: taxConfigRow.profitSplitP1,
      }
    : { ...DEFAULT_TAX_CONFIG };

  const breakdown = estimateTaxReserve(profit, config);

  const paidAgg = await prisma.taxPayment.aggregate({
    where: { year, status: "active" },
    _sum: { amount: true },
  });
  const paidYtd = paidAgg._sum.amount ?? 0;
  const openReserve = breakdown.totalRecommended - paidYtd;
  const profitMargin = revenue > 0 ? profit / revenue : null;

  const monthStrip: MonthStripItem[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month,
      shortLabel: MONTH_SHORT[i] ?? String(month),
      hasBwa: byMonth.has(month),
      isSelected: month === selectedMonth,
    };
  });

  const selectedEntry = byMonth.get(selectedMonth) ?? null;

  const periodLabelDe = formatCumulativePeriodDe(year, selectedMonth);
  const profitBasisNote = `Kumulierter Gewinn ${periodLabelDe} (Monate ohne BWA zählen als 0). Keine Hochrechnung aufs volle Jahr.`;

  return {
    year,
    selectedMonth,
    yearOptions,
    monthStrip,
    selectedEntry,
    cumulative: {
      revenue,
      profit,
      profitMargin,
      personnelCosts,
      operatingCosts,
      monthsWithDataInRange,
    },
    missingMonthsInRange,
    periodLabelDe,
    tax: {
      breakdown,
      paidYtd,
      openReserve,
      profitBasisNote,
    },
  };
}
