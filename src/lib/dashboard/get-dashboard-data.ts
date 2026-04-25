import { prisma } from "@/lib/prisma";
import { formatBwaPeriod } from "@/lib/bwa/months";
import { estimateTaxReserve } from "@/lib/tax/estimate-reserve";
import type { TaxReserveBreakdown } from "@/lib/tax/estimate-reserve";
import { DEFAULT_TAX_CONFIG } from "@/lib/tax/defaults";

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

export type MonthlyChartPoint = {
  monthIndex: number;
  label: string;
  revenue: number;
  profit: number;
};

export type DashboardData = {
  year: number;
  yearOptions: number[];
  revenueYtd: number;
  profitYtd: number;
  profitMarginYtd: number | null;
  monthsWithData: number;
  avgMonthlyRevenue: number;
  lastBwaLabel: string;
  monthly: MonthlyChartPoint[];
  tax: {
    breakdown: TaxReserveBreakdown;
    paidYtd: number;
    openReserve: number;
    hasConfigRow: boolean;
  };
};

function mergeYearOptions(years: number[]): number[] {
  const current = new Date().getFullYear();
  const set = new Set<number>(years);
  set.add(current);
  return Array.from(set).sort((a, b) => b - a);
}

export async function getDashboardData(year: number): Promise<DashboardData> {
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

  const lastUploaded = await prisma.bwaEntry.findFirst({
    orderBy: { uploadedAt: "desc" },
  });

  let revenueYtd = 0;
  let profitYtd = 0;
  const byMonth = new Map<number, { revenue: number; profit: number }>();

  for (const e of entries) {
    const revenue = e.revenue ?? 0;
    const profit = e.profit ?? 0;
    revenueYtd += revenue;
    profitYtd += profit;
    byMonth.set(e.month, { revenue, profit });
  }

  const monthsWithData = entries.length;
  const avgMonthlyRevenue =
    monthsWithData > 0 ? revenueYtd / monthsWithData : 0;
  const profitMarginYtd = revenueYtd > 0 ? profitYtd / revenueYtd : null;

  const lastBwaLabel = lastUploaded
    ? formatBwaPeriod(lastUploaded.month, lastUploaded.year)
    : "—";

  const monthly: MonthlyChartPoint[] = Array.from(
    { length: 12 },
    (_, i) => {
      const monthIndex = i + 1;
      const row = byMonth.get(monthIndex);
      return {
        monthIndex,
        label: MONTH_SHORT[i] ?? String(monthIndex),
        revenue: row?.revenue ?? 0,
        profit: row?.profit ?? 0,
      };
    },
  );

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

  const breakdown = estimateTaxReserve(profitYtd, config);

  const paidAgg = await prisma.taxPayment.aggregate({
    where: { year, status: "active" },
    _sum: { amount: true },
  });

  const paidYtd = paidAgg._sum.amount ?? 0;
  const openReserve = breakdown.totalRecommended - paidYtd;

  return {
    year,
    yearOptions,
    revenueYtd,
    profitYtd,
    profitMarginYtd,
    monthsWithData,
    avgMonthlyRevenue,
    lastBwaLabel,
    monthly,
    tax: {
      breakdown,
      paidYtd,
      openReserve,
      hasConfigRow: Boolean(taxConfigRow),
    },
  };
}
