import Link from "next/link";

import { formatEuro } from "@/lib/format";
import { getNextAdvanceDueDate } from "@/lib/tax/advance-due-dates";
import type { DashboardData } from "@/lib/dashboard/get-dashboard-data";
import { Button } from "@/components/ui/button";

type TaxPreviewCardProps = {
  tax: DashboardData["tax"];
  dashboardYear: number;
};

function statusBadge(openReserve: number, recommended: number) {
  if (recommended <= 0) {
    return { label: "Keine Schätzung", className: "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]" };
  }
  if (openReserve <= 0) {
    return {
      label: "Rücklage erreicht",
      className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    };
  }
  if (openReserve <= recommended * 0.25) {
    return {
      label: "Prüfen",
      className: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    };
  }
  return {
    label: "Rückstellung fehlt",
    className: "bg-red-50 text-red-800 ring-1 ring-red-200",
  };
}

export function TaxPreviewCard({ tax, dashboardYear }: TaxPreviewCardProps) {
  const today = new Date();
  const rhythmMonth =
    dashboardYear === today.getFullYear() ? today.getMonth() + 1 : 12;
  const monatsueberblickHref = `/monatsueberblick?year=${dashboardYear}&month=${rhythmMonth}`;

  const nextDue = getNextAdvanceDueDate();
  const nextDueLabel = nextDue.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const badge = statusBadge(tax.openReserve, tax.breakdown.totalRecommended);

  return (
    <section
      className="flex flex-col gap-5 rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
      style={{
        borderColor: "var(--color-border-token)",
        boxShadow: "var(--shadow-card-token)",
      }}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
            <span className="text-[var(--color-text-subtle)]">— </span>
            Steuern
            <span className="text-[var(--color-text-subtle)]"> —</span>
          </p>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text)]">
            Steuer-Status
          </h2>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-[var(--radius-card-token)] bg-[var(--color-surface-raised)] p-4">
          <dt className="text-xs font-medium text-[var(--color-text-subtle)]">
            Empfohlene Rücklage (Schätzung)
          </dt>
          <dd className="text-lg font-extrabold text-[var(--color-text)]">
            {formatEuro(tax.breakdown.totalRecommended)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--radius-card-token)] bg-[var(--color-surface-raised)] p-4">
          <dt className="text-xs font-medium text-[var(--color-text-subtle)]">
            Gezahlt (aktives Jahr)
          </dt>
          <dd className="text-lg font-extrabold text-[var(--color-text)]">
            {formatEuro(tax.paidYtd)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--radius-card-token)] bg-[var(--color-surface-raised)] p-4">
          <dt className="text-xs font-medium text-[var(--color-text-subtle)]">
            Offene Rücklage
          </dt>
          <dd className="text-lg font-extrabold text-[var(--color-primary)]">
            {formatEuro(tax.openReserve)}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-[var(--color-text-muted)]">
        Nächste typische Vorauszahlung:{" "}
        <span className="font-semibold text-[var(--color-text)]">{nextDueLabel}</span>
      </p>

      <p className="text-xs leading-relaxed text-[var(--color-text-subtle)]">
        Schätzwerte – kein Ersatz für steuerliche Beratung. Basis: Gewinn YTD
        aus den BWAs dieses Jahres und die Steuer-Konfiguration
        {tax.hasConfigRow ? "" : " (Standardwerte, bis unter Steuern ein Jahr angelegt ist)"}.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="default">
          <Link href="/steuern">Zum Steuer-Tracking</Link>
        </Button>
        <Button asChild variant="outline" size="default">
          <Link href={monatsueberblickHref}>Monatsüberblick ({dashboardYear})</Link>
        </Button>
      </div>
    </section>
  );
}
