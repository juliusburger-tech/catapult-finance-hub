import { prisma } from "@/lib/prisma";

export type InvoiceDashboardPreview = {
  month: number;
  year: number;
  totalEntries: number;
  invoicesSentCount: number;
  paidCount: number;
  plannedRevenue: number;
  actualRevenue: number;
  overdueOpenInvoices: number;
};

export async function getInvoiceDashboardPreview(
  month: number,
  year: number,
): Promise<InvoiceDashboardPreview> {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

  const entries = await prisma.paymentScheduleEntry.findMany({
    where: { dueYear: year, dueMonth: month },
    select: {
      dueDay: true,
      amount: true,
      paid: true,
      invoiceSent: true,
    },
  });

  const totalEntries = entries.length;
  const invoicesSentCount = entries.filter((entry) => entry.invoiceSent).length;
  const paidCount = entries.filter((entry) => entry.paid).length;
  const plannedRevenue = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const actualRevenue = entries
    .filter((entry) => entry.paid)
    .reduce((sum, entry) => sum + entry.amount, 0);

  const overdueOpenInvoices = isCurrentMonth
    ? entries.filter((entry) => !entry.invoiceSent && entry.dueDay <= now.getDate()).length
    : 0;

  return {
    month,
    year,
    totalEntries,
    invoicesSentCount,
    paidCount,
    plannedRevenue,
    actualRevenue,
    overdueOpenInvoices,
  };
}
