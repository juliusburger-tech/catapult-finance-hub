import Link from "next/link";
import { CheckCircle2, Circle, Clock3, CreditCard, Landmark, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PaymentModelBadge } from "@/components/invoices/payment-model-badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/format";

import {
  createOtherPayment,
  deleteOtherPayment,
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

function formatKpiEuro(value: number): string {
  return formatEuro(value).replace(/\s/g, "\u00A0");
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
  const monthStart = new Date(year, selectedMonth - 1, 1);
  const monthEnd = new Date(year, selectedMonth, 1);

  const entries = await prisma.paymentScheduleEntry.findMany({
    where: { dueYear: year, dueMonth: selectedMonth },
    include: { customer: true },
    orderBy: [{ dueDay: "asc" }, { customer: { name: "asc" } }],
  });
  const closedDeals = await prisma.customer.findMany({
    where: {
      closingDate: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
    include: {
      paymentEntries: {
        select: { amount: true },
      },
    },
  });
  const yearlyClosedDeals = await prisma.customer.findMany({
    where: {
      closingDate: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    include: {
      paymentEntries: {
        select: { amount: true },
      },
    },
  });
  const otherPayments = await prisma.otherPayment.findMany({
    where: { year, month: selectedMonth },
    include: {
      customer: {
        select: { name: true },
      },
    },
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
  });
  const yearlyOtherPaymentsForAv = await prisma.otherPayment.findMany({
    where: {
      year,
      includeInAv: true,
      salesType: { in: ["cross_sell", "upsell"] },
    },
    select: {
      amount: true,
      paymentDate: true,
    },
  });
  const customersForOtherPayments = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const totalEntries = entries.length;
  const invoicesSentCount = entries.filter((entry) => entry.invoiceSent).length;
  const unpaidCount = entries.filter((entry) => !entry.paid).length;
  const paidCount = entries.filter((entry) => entry.paid).length;
  const invoicePendingCount = entries.filter((entry) => !entry.invoiceSent).length;
  const invoicePlannedRevenue = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const invoiceActualRevenue = entries
    .filter((entry) => entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const otherPaymentsTotal = otherPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const plannedRevenue = invoicePlannedRevenue + otherPaymentsTotal;
  const actualRevenue = invoiceActualRevenue + otherPaymentsTotal;
  const retainerEntries = entries.filter((entry) => entry.entryType === "retainer");
  const retainerCashflow = retainerEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const closedDealVolume = closedDeals.reduce(
    (sum, customer) =>
      sum + customer.paymentEntries.reduce((customerSum, entry) => customerSum + entry.amount, 0),
    0,
  );
  const monthlyCrossUpsellVolume = otherPayments
    .filter(
      (payment) =>
        payment.includeInAv &&
        (payment.salesType === "cross_sell" || payment.salesType === "upsell"),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  const closedDealVolumeWithCrossUpsell = closedDealVolume + monthlyCrossUpsellVolume;
  const quarterDealVolume = yearlyClosedDeals.reduce(
    (acc, customer) => {
      if (!customer.closingDate) return acc;
      const quarter = Math.floor(customer.closingDate.getMonth() / 3);
      const customerVolume = customer.paymentEntries.reduce(
        (customerSum, entry) => customerSum + entry.amount,
        0,
      );
      acc[quarter] += customerVolume;
      return acc;
    },
    [0, 0, 0, 0] as [number, number, number, number],
  );
  for (const payment of yearlyOtherPaymentsForAv) {
    const quarter = Math.floor(payment.paymentDate.getMonth() / 3);
    quarterDealVolume[quarter] += payment.amount;
  }
  const yearlyDealVolumeTotal = quarterDealVolume.reduce((sum, value) => sum + value, 0);

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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard label="Rechnungen gestellt" value={`${invoicesSentCount}`} hint={`von ${totalEntries}`} />
        <KpiCard label="Rechnungen ausstehend" value={`${invoicePendingCount}`} hint={`von ${totalEntries}`} />
        <KpiCard label="Bezahlt" value={`${paidCount}`} hint={`von ${totalEntries}`} />
        <KpiCard label="Offen (unbezahlt)" value={`${unpaidCount}`} hint={`von ${totalEntries}`} />
        <KpiCard
          label="Soll-Umsatz"
          value={formatKpiEuro(plannedRevenue)}
          hint={`inkl. ${formatKpiEuro(otherPaymentsTotal)} sonstige Zahlungen`}
        />
        <KpiCard
          label="Ist-Umsatz"
          value={formatKpiEuro(actualRevenue)}
          hint={`inkl. ${formatKpiEuro(otherPaymentsTotal)} sonstige Zahlungen`}
        />
        <div
          className="flex flex-col gap-2 rounded-[var(--radius-card-token)] border bg-[var(--color-surface)] p-5"
          style={{
            borderColor: "var(--color-border-token)",
            boxShadow: "var(--shadow-card-token)",
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
            Abgeschlossenes Dealvolumen (AV)
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
            {formatKpiEuro(closedDealVolumeWithCrossUpsell)}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {closedDeals.length} Closings + {formatKpiEuro(monthlyCrossUpsellVolume)} Cross-/Upsell im
            Monat
          </p>
          <details className="rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface-raised)] px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--color-text)]">
              Quartalsübersicht {year}
            </summary>
            <div className="mt-2 flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
              <p className="flex items-center justify-between gap-2">
                <span>Q1</span>
                <span className="font-semibold text-[var(--color-text)]">{formatKpiEuro(quarterDealVolume[0])}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Q2</span>
                <span className="font-semibold text-[var(--color-text)]">{formatKpiEuro(quarterDealVolume[1])}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Q3</span>
                <span className="font-semibold text-[var(--color-text)]">{formatKpiEuro(quarterDealVolume[2])}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Q4</span>
                <span className="font-semibold text-[var(--color-text)]">{formatKpiEuro(quarterDealVolume[3])}</span>
              </p>
              <p className="mt-1 border-t border-[var(--color-border-token)] pt-1.5 flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--color-text)]">Gesamt DV {year}</span>
                <span className="font-extrabold text-[var(--color-primary)]">{formatKpiEuro(yearlyDealVolumeTotal)}</span>
              </p>
            </div>
          </details>
        </div>
        <KpiCard
          label="Monatlicher Retainer-Cashflow"
          value={formatKpiEuro(retainerCashflow)}
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

      <section
        className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">Sonstige Zahlungen</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Kickbacks, Trainings, Reiseerlöse oder weitere Einnahmen für {formatMonthYear(selectedMonth, year)}.
          </p>
        </div>

        <form action={createOtherPayment} className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input type="hidden" name="month" value={selectedMonth} />
          <input type="hidden" name="year" value={year} />
          <input
            type="text"
            name="title"
            placeholder="Bezeichnung (z. B. Kickback Partner X)"
            required
            className="h-10 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] xl:col-span-2"
          />
          <select
            name="customerId"
            className="h-10 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
            defaultValue=""
          >
            <option value="">Kein Kunde zugeordnet</option>
            {customersForOtherPayments.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <select
            name="salesType"
            defaultValue="other"
            className="h-10 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
          >
            <option value="other">Typ: Sonstiges</option>
            <option value="cross_sell">Typ: Cross-Sell</option>
            <option value="upsell">Typ: Upsell</option>
          </select>
          <input
            type="text"
            name="category"
            placeholder="Kategorie (z. B. Kickback)"
            className="h-10 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
          />
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            required
            placeholder="Betrag"
            className="h-10 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
          />
          <input
            type="date"
            name="paymentDate"
            required
            defaultValue={`${year}-${String(selectedMonth).padStart(2, "0")}-${String(Math.min(now.getDate(), 28)).padStart(2, "0")}`}
            className="h-10 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
          />
          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]">
            <input type="checkbox" name="includeInAv" className="size-4 accent-[var(--color-primary)]" />
            Im AV berücksichtigen
          </label>
          <input
            type="text"
            name="notes"
            placeholder="Notiz (optional)"
            className="h-10 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] md:col-span-2 xl:col-span-3"
          />
          <Button type="submit" className="h-10 xl:col-span-1">
            Zahlung erfassen
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-token)] text-left text-[var(--color-text-subtle)]">
                <th className="pb-3 pr-4 font-medium">Bezeichnung</th>
                <th className="pb-3 pr-4 font-medium">Kunde</th>
                <th className="pb-3 pr-4 font-medium">Vertriebsart</th>
                <th className="pb-3 pr-4 font-medium">Kategorie</th>
                <th className="pb-3 pr-4 font-medium">Datum</th>
                <th className="pb-3 pr-4 font-medium">Betrag</th>
                <th className="pb-3 pr-4 font-medium">Notiz</th>
                <th className="pb-3 pr-4 font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {otherPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--color-border-token)]">
                  <td className="py-3 pr-4 font-semibold text-[var(--color-text)]">{payment.title}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]">{payment.customer?.name ?? "-"}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                    {payment.salesType === "cross_sell"
                      ? "Cross-Sell"
                      : payment.salesType === "upsell"
                        ? "Upsell"
                        : "Sonstiges"}
                    {payment.includeInAv ? " · AV" : ""}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]">{payment.category}</td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                    {new Intl.DateTimeFormat("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(payment.paymentDate)}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-[var(--color-text)]">
                    {formatEuro(payment.amount)}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]">{payment.notes || "-"}</td>
                  <td className="py-3 pr-4">
                    <form action={deleteOtherPayment.bind(null, payment.id)}>
                      <Button variant="outline" size="sm">
                        Entfernen
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {otherPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                    Keine sonstigen Zahlungen für diesen Monat erfasst.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="pt-4 font-semibold text-[var(--color-text)]">
                  Summe sonstige Zahlungen
                </td>
                <td className="pt-4 font-extrabold text-[var(--color-text)]">
                  {formatEuro(otherPaymentsTotal)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
