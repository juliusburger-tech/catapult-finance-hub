import { notFound } from "next/navigation";

import { CustomerDetailTabs } from "@/components/customers/customer-detail-tabs";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;
export const dynamic = "force-dynamic";

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function KundenDetailPage({ params }: PageProps) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      paymentEntries: {
        orderBy: [{ dueYear: "asc" }, { dueMonth: "asc" }, { dueDay: "asc" }],
      },
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
        <span className="text-[var(--color-text-subtle)]">— </span>
        Kunde
        <span className="text-[var(--color-text-subtle)]"> —</span>
      </p>

      <CustomerDetailTabs
        customer={{
          id: customer.id,
          name: customer.name,
          status: customer.status as "active" | "planned" | "completed",
          closingDate: customer.closingDate ? formatDateInput(customer.closingDate) : null,
          paymentModel: customer.paymentModel,
          paymentMethod: customer.paymentMethod,
          paymentDay: customer.paymentDay,
          contractStart: formatDateInput(customer.contractStart),
          contractEnd: formatDateInput(customer.contractEnd),
          contractSigned: customer.contractSigned,
          contractFile: customer.contractFile,
          contactPerson: customer.contactPerson,
          email: customer.email,
          phone: customer.phone,
          notes: customer.notes,
          paymentConfig: customer.paymentConfig,
        }}
        entries={customer.paymentEntries.map((entry) => ({
          id: entry.id,
          dueMonth: entry.dueMonth,
          dueYear: entry.dueYear,
          dueDay: entry.dueDay,
          amount: entry.amount,
          entryType: entry.entryType,
          invoiceSent: entry.invoiceSent,
          sepaConfirmed: entry.sepaConfirmed,
          paid: entry.paid,
          notes: entry.notes,
        }))}
      />
    </div>
  );
}
