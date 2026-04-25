import Link from "next/link";
import { CheckCircle2, Circle, Clock3, CreditCard, Landmark, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PaymentModelBadge } from "@/components/invoices/payment-model-badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/format";

import {
  toggleInvoiceSent,
  togglePaid,
  toggleSepaConfirmed,
  updateEntryNoteFromForm,
} from "./actions";

export const revalidate = 60;

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

function formatMonthYear(month: number, year: number): string {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

function toEntryTypeLabel(entryType: string): string {
  const map: Record<string, string> = {
    retainer: "Monatlich",
    installment_1: "Rate 1",
    installment_2: "Rate 2",
    upfront: "Upfront",
    one_time: "Einmalig",
  };
  return map[entryType] ?? entryType;
}

function toStatusDot(
  paid: boolean,
  invoiceSent: boolean,
  dueDate: Date,
  now: Date,
): { color: string; icon: ReactNode } {
  if (paid) {
    return { color: "text-emerald-600", icon: <CheckCircle2 className="size-4" /> };
  }
  if (!invoiceSent && dueDate < now) {
    return { color: "text-red-600", icon: <XCircle className="size-4" /> };
  }
  if (invoiceSent && !paid) {
    return { color: "text-amber-500", icon: <Clock3 className="size-4" /> };
  }
  return { color: "text-slate-400", icon: <Circle className="size-4 fill-current" /> };
}

export default async function RechnungenPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = parseYear(params.year);
  const selectedMonth = parseMonth(params.month);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === selectedMonth;

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  const entries = await prisma.paymentScheduleEntry.findMany({
    where: { dueYear: year, dueMonth: selectedMonth },
    include: { customer: true },
    orderBy: [{ dueDay: "asc" }, { customer: { name: "asc" } }],
  });

  const totalEntries = entries.length;
  const invoicesSentCount = entries.filter((entry) => entry.invoiceSent).length;
  const unpaidCount = entries.filter((entry) => !entry.paid).length;
  const paidCount = entries.filter((entry) => entry.paid).length;
  const invoicePendingCount = entries.filter((entry) => !entry.invoiceSent).length;
  const plannedRevenue = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const actualRevenue = entries
    .filter((entry) => entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const retainerEntries = entries.filter((entry) => entry.entryType === "retainer");
  const retainerCashflow = retainerEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const dueNotSentCount =
    isCurrentMonth && totalEntries > 0
      ? entries.filter((entry) => !entry.invoiceSent && entry.dueDay <= now.getDate()).length
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          Rechnungen
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)] md:text-4xl">
          Rechnungs-Cockpit
        </h1>
        <p className="max-w-3xl text-base text-[var(--color-text-muted)]">
          Alle Zahlungen, Rechnungen und Status für {formatMonthYear(selectedMonth, year)}.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-text-subtle)]">
          Jahr
        </p>
        <div className="flex flex-wrap gap-2">
          {yearOptions.map((y) => (
            <Link
              key={y}
              href={`/rechnungen?year=${y}&month=${selectedMonth}`}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                y === year
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
          {monthOptions.map((month) => (
            <Link
              key={month}
              href={`/rechnungen?year=${year}&month=${month}`}
              className={`inline-flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-[var(--radius-card-token)] border px-2.5 py-2 text-center text-xs font-semibold transition-colors ${
                month === selectedMonth
                  ? "border-[var(--color-primary)] bg-[var(--color-surface-raised)] text-[var(--color-primary)]"
                  : "border-[var(--color-border-token)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40"
              }`}
            >
              {new Intl.DateTimeFormat("de-DE", { month: "short" }).format(
                new Date(year, month - 1, 1),
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <KpiCard label="Rechnungen gestellt" value={`${invoicesSentCount}`} hint={`von ${totalEntries}`} />
        <KpiCard label="Rechnungen ausstehend" value={`${invoicePendingCount}`} hint={`von ${totalEntries}`} />
        <KpiCard label="Bezahlt" value={`${paidCount}`} hint={`von ${totalEntries}`} />
        <KpiCard label="Offen (unbezahlt)" value={`${unpaidCount}`} hint={`von ${totalEntries}`} />
        <KpiCard label="Soll-Umsatz" value={formatEuro(plannedRevenue)} />
        <KpiCard label="Ist-Umsatz" value={formatEuro(actualRevenue)} />
        <KpiCard
          label="Monatlicher Retainer-Cashflow"
          value={formatEuro(retainerCashflow)}
          hint={`${retainerEntries.length} Retainer-Posten`}
        />
      </section>

      {dueNotSentCount > 0 ? (
        <p
          className="rounded-[var(--radius-card-token)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <span className="font-semibold">{dueNotSentCount}</span> Rechnungen sind fällig,
          aber noch nicht gestellt.
        </p>
      ) : null}

      <section
        className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">
            Zahlungen {formatMonthYear(selectedMonth, year)}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-token)] text-left text-[var(--color-text-subtle)]">
                <th className="pb-3 pr-4 font-medium">Kunde</th>
                <th className="pb-3 pr-4 font-medium">Modell</th>
                <th className="pb-3 pr-4 font-medium">Typ</th>
                <th className="pb-3 pr-4 font-medium">Betrag</th>
                <th className="pb-3 pr-4 font-medium">Fälligkeit</th>
                <th className="pb-3 pr-4 font-medium">Rechnung gesendet</th>
                <th className="pb-3 pr-4 font-medium">SEPA bestätigt</th>
                <th className="pb-3 pr-4 font-medium">Bezahlt</th>
                <th className="pb-3 pr-4 font-medium">Notiz</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const dueDate = new Date(entry.dueYear, entry.dueMonth - 1, entry.dueDay);
                const dot = toStatusDot(entry.paid, entry.invoiceSent, dueDate, now);
                return (
                  <tr key={entry.id} className="border-b border-[var(--color-border-token)]">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/kunden/${entry.customerId}`}
                        className="inline-flex items-center gap-2 font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                      >
                        <span className={dot.color}>{dot.icon}</span>
                        {entry.customer.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <PaymentModelBadge model={entry.customer.paymentModel} />
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text)]">
                      {toEntryTypeLabel(entry.entryType)}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[var(--color-text)]">
                      {formatEuro(entry.amount)}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        {entry.dueDay}. des Monats
                        {entry.customer.paymentMethod === "sepa" ? (
                          <Landmark className="size-4 text-[var(--color-primary)]" />
                        ) : (
                          <CreditCard className="size-4 text-[var(--color-text-subtle)]" />
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <form action={toggleInvoiceSent.bind(null, entry.id)}>
                        <Button variant={entry.invoiceSent ? "default" : "outline"} size="sm">
                          {entry.invoiceSent ? "Ja" : "Nein"}
                        </Button>
                      </form>
                    </td>
                    <td className="py-3 pr-4">
                      {entry.customer.paymentMethod === "sepa" ? (
                        <form action={toggleSepaConfirmed.bind(null, entry.id)}>
                          <Button variant={entry.sepaConfirmed ? "default" : "outline"} size="sm">
                            {entry.sepaConfirmed ? "Ja" : "Nein"}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-[var(--color-text-subtle)]">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <form action={togglePaid.bind(null, entry.id)}>
                        <Button variant={entry.paid ? "default" : "outline"} size="sm">
                          {entry.paid ? "Ja" : "Nein"}
                        </Button>
                      </form>
                    </td>
                    <td className="py-3 pr-4">
                      <form
                        action={updateEntryNoteFromForm.bind(null, entry.id)}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          name="notes"
                          defaultValue={entry.notes ?? ""}
                          placeholder="Notiz..."
                          className="h-8 w-36 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)]"
                        />
                        <Button variant="outline" size="sm">
                          Speichern
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    Keine Zahlungseinträge für diesen Monat.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
