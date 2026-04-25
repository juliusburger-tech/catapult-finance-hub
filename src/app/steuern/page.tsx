import { Suspense } from "react";

import { TaxConfigForm } from "@/components/tax/tax-config-form";
import { TaxPaymentDialog } from "@/components/tax/tax-payment-dialog";
import { TaxPaymentsTable } from "@/components/tax/tax-payments-table";
import { TaxReserveOverview } from "@/components/tax/tax-reserve-overview";
import { TaxYearResetButton } from "@/components/tax/tax-year-reset-button";
import { DashboardYearSelect } from "@/components/dashboard/dashboard-year-select";
import { getTaxPageData } from "@/lib/tax/get-tax-page-data";

export const revalidate = 60;

type SteuernPageProps = {
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

export default async function SteuernPage({ searchParams }: SteuernPageProps) {
  const params = await searchParams;
  const year = parseYearParam(params.year);
  const data = await getTaxPageData(year);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
            <span className="text-[var(--color-text-subtle)]">— </span>
            Steuern
            <span className="text-[var(--color-text-subtle)]"> —</span>
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)] md:text-4xl">
            Steuer-Tracking
          </h1>
          <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
            Rücklagen-Schätzung aus BWAs, Vorauszahlungen erfassen und bei
            Jahreswechsel zurücksetzen.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-9 w-[140px] animate-pulse rounded-md bg-[var(--color-surface-raised)]" />
          }
        >
          <DashboardYearSelect years={data.yearOptions} value={data.year} />
        </Suspense>
      </header>

      <TaxConfigForm year={data.year} initial={data.config} />

      <TaxReserveOverview
        data={{
          year: data.year,
          profitYtd: data.profitYtd,
          breakdown: data.breakdown,
          paidYtd: data.paidYtd,
          openReserve: data.openReserve,
        }}
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
              <span className="text-[var(--color-text-subtle)]">— </span>
              Zahlungen
              <span className="text-[var(--color-text-subtle)]"> —</span>
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text)]">
              Zahlungshistorie
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TaxPaymentDialog year={data.year} />
            <TaxYearResetButton year={data.year} />
          </div>
        </div>
        <TaxPaymentsTable payments={data.payments} />
      </section>

      <p className="text-xs leading-relaxed text-[var(--color-text-subtle)]">
        Schätzwerte – kein Ersatz für steuerliche Beratung. Gewerbesteuer und
        ESt werden vereinfacht aus dem Gewinn YTD der BWAs dieses Jahres
        abgeleitet.
      </p>
    </div>
  );
}
