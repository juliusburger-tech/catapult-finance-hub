import { CustomersOverview } from "@/components/customers/customers-overview";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDue(month: number, year: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export default async function KundenPage() {
  const customers = await prisma.customer.findMany({
    include: {
      paymentEntries: {
        orderBy: [{ dueYear: "asc" }, { dueMonth: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = customers.map((customer) => {
    const totalVolume = customer.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const nextOpen = customer.paymentEntries.find((entry) => !entry.paid);
    return {
      id: customer.id,
      name: customer.name,
      status: customer.status as "active" | "completed" | "planned",
      paymentModel: customer.paymentModel,
      contractStart: formatDate(customer.contractStart),
      contractEnd: formatDate(customer.contractEnd),
      totalVolume,
      nextPayment: nextOpen ? formatDue(nextOpen.dueMonth, nextOpen.dueYear) : "—",
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          Kunden
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)] md:text-4xl">
          Kundenverwaltung
        </h1>
        <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
          Alle Kunden, Verträge und Zahlungsmodelle.
        </p>
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          Gesamtanzahl Kunden:{" "}
          <span className="font-extrabold text-[var(--color-text)]">{rows.length}</span>
        </p>
      </header>

      <CustomersOverview customers={rows} />
    </div>
  );
}
