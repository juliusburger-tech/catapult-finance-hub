import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatBwaPeriod } from "@/lib/bwa/months";
import { formatEuro } from "@/lib/format";
import { getMonthlyOverviewData } from "@/lib/monthly-overview/get-monthly-overview-data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

function parseYear(raw: string | undefined): number {
  const y = new Date().getFullYear();
  if (raw === undefined || raw === "") return y;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return y;
  return n;
}

function parseMonth(raw: string | undefined): number {
  const m = new Date().getMonth() + 1;
  if (raw === undefined || raw === "") return m;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 12) return m;
  return n;
}

export default async function MonatsueberblickPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const year = parseYear(sp.year);
  const selectedMonth = parseMonth(sp.month);
  const data = await getMonthlyOverviewData(year, selectedMonth);

  const bwaUploadHref = `/bwa?year=${data.year}&month=${data.selectedMonth}`;
  const missingLabel =
    data.missingMonthsInRange.length > 0
      ? data.missingMonthsInRange
          .map((m) => formatBwaPeriod(m, data.year))
          .join(", ")
      : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          Rhythmus
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)] md:text-4xl">
          Monatsüberblick
        </h1>
        <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
          Monat für Monat BWAs einordnen, kumulierte Kennzahlen sehen und eine
          steuerliche Grob-Schätzung auf Basis des Gewinns bis Monatsende – alles
          an einem Ort.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-text-subtle)]">
          Jahr
        </p>
        <div className="flex flex-wrap gap-2">
          {data.yearOptions.map((y) => (
            <Link
              key={y}
              href={`/monatsueberblick?year=${y}&month=${data.selectedMonth}`}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                y === data.year
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border-token)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-text-subtle)]">
          Monat
        </p>
        <div className="flex flex-wrap gap-2">
          {data.monthStrip.map((cell) => (
            <Link
              key={cell.month}
              href={`/monatsueberblick?year=${data.year}&month=${cell.month}`}
              className={`inline-flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-[var(--radius-card-token)] border px-2.5 py-2 text-center text-xs font-semibold transition-colors ${
                cell.isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-surface-raised)] text-[var(--color-primary)]"
                  : "border-[var(--color-border-token)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40"
              }`}
            >
              <span>{cell.shortLabel}</span>
              <span
                className={`size-1.5 rounded-full ${
                  cell.hasBwa ? "bg-[var(--color-success)]" : "bg-[var(--color-text-subtle)]"
                }`}
                title={cell.hasBwa ? "BWA vorhanden" : "Noch keine BWA"}
              />
            </Link>
          ))}
        </div>
      </section>

      <section
        className="flex flex-col gap-4 rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
              <span className="text-[var(--color-text-subtle)]">— </span>
              Fokus-Monat
              <span className="text-[var(--color-text-subtle)]"> —</span>
            </p>
            <h2 className="text-xl font-extrabold text-[var(--color-text)]">
              {formatBwaPeriod(data.selectedMonth, data.year)}
            </h2>
          </div>
          <Button asChild variant="default" size="default">
            <Link href={bwaUploadHref}>BWA einpflegen</Link>
          </Button>
        </div>

        {data.selectedEntry ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-text-subtle)]">Datei</dt>
              <dd className="font-medium text-[var(--color-text)]">
                {data.selectedEntry.filename}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-subtle)]">Gewinn (Monat)</dt>
              <dd className="font-semibold text-[var(--color-text)]">
                {formatEuro(data.selectedEntry.profit ?? 0)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Für diesen Monat liegt noch keine BWA im Archiv. Nutze{" "}
            <span className="font-semibold text-[var(--color-text)]">BWA einpflegen</span>{" "}
            – Monat und Jahr sind dort schon vorausgewählt.
          </p>
        )}
      </section>

      {missingLabel ? (
        <p
          className="rounded-[var(--radius-card-token)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <span className="font-semibold">Lücken bis {formatBwaPeriod(data.selectedMonth, data.year)}: </span>
          {missingLabel}. Kumulierte Werte unten setzen fehlende Monate mit 0 an.
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
            <span className="text-[var(--color-text-subtle)]">— </span>
            Kumuliert
            <span className="text-[var(--color-text-subtle)]"> —</span>
          </p>
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">
            Finanzen {data.periodLabelDe}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Summe aus allen BWAs von Monat 1 bis {formatBwaPeriod(data.selectedMonth, data.year)}.
            Monate ohne Eintrag zählen als 0.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Umsatz (kumuliert)" value={formatEuro(data.cumulative.revenue)} />
          <SummaryCard label="Gewinn (kumuliert)" value={formatEuro(data.cumulative.profit)} />
          <SummaryCard
            label="Personalkosten (kumuliert)"
            value={formatEuro(data.cumulative.personnelCosts)}
          />
          <SummaryCard
            label="Sonst. Aufwendungen (kumuliert)"
            value={formatEuro(data.cumulative.operatingCosts)}
          />
        </div>
        <p className="text-xs text-[var(--color-text-subtle)]">
          Monate mit BWA in diesem Zeitraum: {data.cumulative.monthsWithDataInRange} von{" "}
          {data.selectedMonth}
        </p>
      </section>

      <section
        className="flex flex-col gap-5 rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
            <span className="text-[var(--color-text-subtle)]">— </span>
            Steuer-Forecast
            <span className="text-[var(--color-text-subtle)]"> —</span>
          </p>
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">
            Rücklage (Schätzung)
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">{data.tax.profitBasisNote}</p>
        </div>

        <div className="flex flex-col gap-2 border-b border-[var(--color-border-token)] pb-5">
          <p className="text-sm text-[var(--color-text-muted)]">Empfohlene Steuerrücklage</p>
          <p className="text-3xl font-black text-[var(--color-primary)]">
            {formatEuro(data.tax.breakdown.totalRecommended)}
          </p>
        </div>

        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text)]">
          <li className="flex justify-between gap-4">
            <span className="text-[var(--color-text-muted)]">Gewerbesteuer</span>
            <span className="font-semibold tabular-nums">
              {formatEuro(data.tax.breakdown.gewerbesteuer)}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="text-[var(--color-text-muted)]">ESt Gesellschafter 1</span>
            <span className="font-semibold tabular-nums">
              {formatEuro(data.tax.breakdown.estPartner1)}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="text-[var(--color-text-muted)]">ESt Gesellschafter 2</span>
            <span className="font-semibold tabular-nums">
              {formatEuro(data.tax.breakdown.estPartner2)}
            </span>
          </li>
        </ul>

        <div className="grid gap-4 border-t border-[var(--color-border-token)] pt-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
              Gezahlt (Jahr, aktiv)
            </p>
            <p className="mt-1 text-lg font-extrabold text-[var(--color-text)]">
              {formatEuro(data.tax.paidYtd)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
              Offene Rücklage (Schätzung)
            </p>
            <p className="mt-1 text-lg font-extrabold text-[var(--color-primary)]">
              {formatEuro(data.tax.openReserve)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="default">
            <Link href="/steuern">Zahlungen in Steuern verwalten</Link>
          </Button>
          <Button asChild variant="outline" size="default">
            <Link href="/">Zum Dashboard</Link>
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-[var(--color-text-subtle)]">
          Schätzwerte – kein Ersatz für steuerliche Beratung. Gezahlte Beträge beziehen
          sich auf alle aktiven Buchungen des Kalenderjahres, unabhängig vom gewählten
          Monat in dieser Ansicht.
        </p>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[var(--radius-card-token)] border bg-[var(--color-surface-raised)] p-4"
      style={{ borderColor: "var(--color-border-token)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="text-lg font-extrabold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
