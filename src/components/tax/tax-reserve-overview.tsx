import { formatEuro } from "@/lib/format";
import type { TaxPageData } from "@/lib/tax/get-tax-page-data";

type TaxReserveOverviewProps = {
  data: Pick<
    TaxPageData,
    "year" | "profitYtd" | "breakdown" | "paidYtd" | "openReserve"
  >;
};

export function TaxReserveOverview({ data }: TaxReserveOverviewProps) {
  const { year, profitYtd, breakdown, paidYtd, openReserve } = data;

  return (
    <section
      className="flex flex-col gap-6 rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6 sm:p-8"
      style={{
        borderColor: "var(--color-border-token)",
        boxShadow: "var(--shadow-card-token)",
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          Rücklage
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)]">
          Steuerrücklage {year}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Basis: Gewinn YTD aus BWAs ({formatEuro(profitYtd)}).
        </p>
      </div>

      <div className="flex flex-col gap-2 border-b border-[var(--color-border-token)] pb-6">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          Empfohlene Steuerrücklage
        </p>
        <p className="text-3xl font-black tracking-tight text-[var(--color-primary)] sm:text-4xl">
          {formatEuro(breakdown.totalRecommended)}
        </p>
      </div>

      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex justify-between gap-4 text-[var(--color-text)]">
          <span className="text-[var(--color-text-muted)]">davon Gewerbesteuer</span>
          <span className="font-semibold tabular-nums">
            {formatEuro(breakdown.gewerbesteuer)}
          </span>
        </li>
        <li className="flex justify-between gap-4 text-[var(--color-text)]">
          <span className="text-[var(--color-text-muted)]">
            davon ESt Gesellschafter 1
          </span>
          <span className="font-semibold tabular-nums">
            {formatEuro(breakdown.estPartner1)}
          </span>
        </li>
        <li className="flex justify-between gap-4 text-[var(--color-text)]">
          <span className="text-[var(--color-text-muted)]">
            davon ESt Gesellschafter 2
          </span>
          <span className="font-semibold tabular-nums">
            {formatEuro(breakdown.estPartner2)}
          </span>
        </li>
      </ul>

      <div className="grid gap-4 border-t border-[var(--color-border-token)] pt-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
            Bereits gezahlte Vorauszahlungen YTD
          </p>
          <p className="mt-1 text-xl font-extrabold text-[var(--color-text)]">
            {formatEuro(paidYtd)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
            Offene Rücklage
          </p>
          <p className="mt-1 text-xl font-extrabold text-[var(--color-primary)]">
            {formatEuro(openReserve)}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[var(--color-text-subtle)]">
        Schätzwerte – kein Ersatz für steuerliche Beratung.
      </p>
    </section>
  );
}
