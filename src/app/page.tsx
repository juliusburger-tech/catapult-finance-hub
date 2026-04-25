import { Suspense } from "react";
import Link from "next/link";

import { DashboardYearSelect } from "@/components/dashboard/dashboard-year-select";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueProfitChart } from "@/components/dashboard/revenue-profit-chart";
import { TaxPreviewCard } from "@/components/dashboard/tax-preview-card";
import { Button } from "@/components/ui/button";
import { formatBwaPeriod } from "@/lib/bwa/months";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { formatEuro, formatPercent } from "@/lib/format";
import { getInvoiceDashboardPreview } from "@/lib/invoices/get-invoice-preview";

export const revalidate = 60;

type DashboardPageProps = {
  searchParams: Promise<{ year?: string }>;
};

function parseYearParam(raw: string | undefined): number {
  const fallback = new Date().getFullYear();
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) {
    return fallback;
  }
  return n;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const year = parseYearParam(params.year);
  const data = await getDashboardData(year);

  const today = new Date();
  const rhythmYear = today.getFullYear();
  const rhythmMonth = today.getMonth() + 1;
  const rhythmHref = `/monatsueberblick?year=${rhythmYear}&month=${rhythmMonth}`;
  const rhythmLabel = formatBwaPeriod(rhythmMonth, rhythmYear);
  const invoicePreview = await getInvoiceDashboardPreview(rhythmMonth, rhythmYear);
  const invoiceHref = `/rechnungen?year=${rhythmYear}&month=${rhythmMonth}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          Übersicht
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)] md:text-4xl">
          Finanzdashboard
        </h1>
        <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
          Kennzahlen aus den erfassten BWAs, Monatsverlauf und eine kompakte
          Steuer-Vorschau auf Basis der hinterlegten Regeln.
        </p>
      </header>

      <aside
        className="flex flex-col gap-3 rounded-[var(--radius-container-token)] border border-[var(--color-border-token)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ boxShadow: "var(--shadow-card-token)" }}
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
            <span className="text-[var(--color-text-subtle)]">— </span>
            Monatsrhythmus
            <span className="text-[var(--color-text-subtle)]"> —</span>
          </p>
          <p className="text-sm font-medium text-[var(--color-text)]">
            Kumulierte Auswertung und Steuer-Forecast für{" "}
            <span className="text-[var(--color-primary)]">{rhythmLabel}</span>
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            BWA einpflegen, Lücken sehen, direkt mit Upload-Formular verknüpft.
          </p>
        </div>
        <Button asChild className="shrink-0 self-start sm:self-center">
          <Link href={rhythmHref}>Zum Monatsüberblick</Link>
        </Button>
      </aside>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Umsatz YTD"
          value={formatEuro(data.revenueYtd)}
          hint={`Summe Umsatz aller BWAs ${data.year}`}
        />
        <KpiCard
          label="Gewinn YTD"
          value={formatEuro(data.profitYtd)}
          hint={`Summe Gewinn aller BWAs ${data.year}`}
        />
        <KpiCard
          label="Ø Monatsumsatz"
          value={formatEuro(data.avgMonthlyRevenue)}
          hint={
            data.monthsWithData > 0
              ? `Umsatz YTD ÷ ${data.monthsWithData} Monat(e) mit BWA`
              : "Noch keine BWAs für dieses Jahr"
          }
        />
        <KpiCard
          label="Gewinnmarge YTD"
          value={data.profitMarginYtd === null ? "—" : formatPercent(data.profitMarginYtd)}
          hint="Gewinn YTD ÷ Umsatz YTD"
        />
        <KpiCard
          label="Letzte BWA"
          value={data.lastBwaLabel}
          hint="Zuletzt hochgeladen (über alle Jahre)"
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
              <span className="text-[var(--color-text-subtle)]">— </span>
              Verlauf
              <span className="text-[var(--color-text-subtle)]"> —</span>
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text)]">
              Monatsumsatz und Gewinn
            </h2>
          </div>
          <Suspense
            fallback={
              <div className="h-9 w-[140px] animate-pulse rounded-md bg-[var(--color-surface-raised)]" />
            }
          >
            <DashboardYearSelect years={data.yearOptions} value={data.year} />
          </Suspense>
        </div>
        <div
          className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-4 sm:p-6"
          style={{
            borderColor: "var(--color-border-token)",
            boxShadow: "var(--shadow-card-token)",
          }}
        >
          <RevenueProfitChart data={data.monthly} year={data.year} />
        </div>
      </section>

      <TaxPreviewCard tax={data.tax} dashboardYear={data.year} />

      <section
        className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
              <span className="text-[var(--color-text-subtle)]">— </span>
              Rechnungen
              <span className="text-[var(--color-text-subtle)]"> —</span>
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text)]">
              Rechnungs-Cockpit {rhythmLabel}
            </h2>
          </div>
          <Button asChild variant="outline" size="default">
            <Link href={invoiceHref}>Zum Cockpit</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniKpi
            label="Gestellt"
            value={`${invoicePreview.invoicesSentCount} / ${invoicePreview.totalEntries}`}
          />
          <MiniKpi
            label="Bezahlt"
            value={`${invoicePreview.paidCount} / ${invoicePreview.totalEntries}`}
          />
          <MiniKpi label="Soll" value={formatEuro(invoicePreview.plannedRevenue)} />
          <MiniKpi label="Ist" value={formatEuro(invoicePreview.actualRevenue)} />
        </div>

        {invoicePreview.overdueOpenInvoices > 0 ? (
          <p className="mt-4 text-sm font-medium text-amber-700">
            {invoicePreview.overdueOpenInvoices} überfällige Rechnungen sind noch nicht gestellt.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card-token)] border border-[var(--color-border-token)] bg-[var(--color-surface-raised)] p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
