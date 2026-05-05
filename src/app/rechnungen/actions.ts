"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

export async function toggleInvoiceSent(entryId: string) {
  const row = await prisma.paymentScheduleEntry.findUnique({
    where: { id: entryId },
    select: { invoiceSent: true },
  });
  if (!row) return;

  const nextValue = !row.invoiceSent;
  await prisma.paymentScheduleEntry.update({
    where: { id: entryId },
    data: {
      invoiceSent: nextValue,
      invoiceSentAt: nextValue ? new Date() : null,
    },
  });

  revalidatePath("/rechnungen");
}

export async function toggleSepaConfirmed(entryId: string) {
  const row = await prisma.paymentScheduleEntry.findUnique({
    where: { id: entryId },
    select: { sepaConfirmed: true },
  });
  if (!row) return;

  await prisma.paymentScheduleEntry.update({
    where: { id: entryId },
    data: { sepaConfirmed: !row.sepaConfirmed },
  });

  revalidatePath("/rechnungen");
}

export async function togglePaid(entryId: string) {
  const row = await prisma.paymentScheduleEntry.findUnique({
    where: { id: entryId },
    select: { paid: true },
  });
  if (!row) return;

  const nextValue = !row.paid;
  await prisma.paymentScheduleEntry.update({
    where: { id: entryId },
    data: {
      paid: nextValue,
      paidAt: nextValue ? new Date() : null,
    },
  });

  revalidatePath("/rechnungen");
}

export async function updateEntryNote(entryId: string, notes: string) {
  await prisma.paymentScheduleEntry.update({
    where: { id: entryId },
    data: { notes: notes.trim() === "" ? null : notes.trim() },
  });
  revalidatePath("/rechnungen");
}

export async function updateEntryNoteFromForm(entryId: string, formData: FormData) {
  const notes = String(formData.get("notes") ?? "");
  await updateEntryNote(entryId, notes);
}

export async function createOtherPayment(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "Sonstiges";
  const amount = Number(formData.get("amount"));
  const paymentDateRaw = String(formData.get("paymentDate") ?? "").trim();

  if (!title || !Number.isFinite(amount) || amount <= 0 || !paymentDateRaw) {
    return;
  }

  const paymentDate = new Date(paymentDateRaw);
  if (Number.isNaN(paymentDate.getTime())) {
    return;
  }

  await prisma.otherPayment.create({
    data: {
      title,
      kind: "other_payment",
      category,
      salesType: "other",
      includeInAv: false,
      amount,
      paymentDate,
      month: paymentDate.getMonth() + 1,
      year: paymentDate.getFullYear(),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/rechnungen");
}

export async function createCrossUpsellPlan(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "Cross-/Upsell";
  const customerIdRaw = String(formData.get("customerId") ?? "").trim();
  const salesTypeRaw = String(formData.get("salesType") ?? "cross_sell").trim();
  const salesType = salesTypeRaw === "upsell" ? "upsell" : "cross_sell";
  const planTypeRaw = String(formData.get("planType") ?? "one_time").trim();
  const planType = planTypeRaw === "installment" ? "installment" : "one_time";
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const totalAmount = Number(formData.get("totalAmount"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title || !startDateRaw || !Number.isFinite(totalAmount) || totalAmount <= 0) return;

  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) return;

  const planGroupId = randomUUID();
  const entries: Array<{
    customerId: string | null;
    title: string;
    kind: string;
    category: string;
    salesType: string;
    includeInAv: boolean;
    planGroupId: string;
    planType: string;
    planConfig: string;
    amount: number;
    paymentDate: Date;
    month: number;
    year: number;
    notes: string | null;
  }> = [];

  if (planType === "one_time") {
    entries.push({
      customerId: customerIdRaw || null,
      title,
      kind: "cross_upsell",
      category,
      salesType,
      includeInAv: true,
      planGroupId,
      planType,
      planConfig: JSON.stringify({ totalAmount }),
      amount: Math.round(totalAmount * 100) / 100,
      paymentDate: startDate,
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      notes,
    });
  } else {
    const installmentPlanRaw = String(formData.get("installmentPlan") ?? "").trim();
    if (!installmentPlanRaw) return;

    const rows = installmentPlanRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (rows.length < 2) return;

    const parsedRows: Array<{ date: Date; amount: number }> = [];
    for (const row of rows) {
      const [monthRaw, amountRaw] = row.split(":").map((part) => part?.trim() ?? "");
      if (!monthRaw || !amountRaw) return;
      const date = new Date(`${monthRaw}-01T00:00:00.000Z`);
      const amount = Number(amountRaw.replace(",", "."));
      if (Number.isNaN(date.getTime()) || !Number.isFinite(amount) || amount <= 0) return;
      parsedRows.push({ date, amount: Math.round(amount * 100) / 100 });
    }

    const planTotal = Math.round(parsedRows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
    const expectedTotal = Math.round(totalAmount * 100) / 100;
    if (Math.abs(planTotal - expectedTotal) > 0.01) return;

    for (let i = 0; i < parsedRows.length; i += 1) {
      const item = parsedRows[i];
      entries.push({
        customerId: customerIdRaw || null,
        title: `${title} (Rate ${i + 1}/${parsedRows.length})`,
        kind: "cross_upsell",
        category,
        salesType,
        includeInAv: true,
        planGroupId,
        planType,
        planConfig: JSON.stringify({
          totalAmount: expectedTotal,
          installments: parsedRows.map((row) => ({
            month: row.date.toISOString().slice(0, 7),
            amount: row.amount,
          })),
        }),
        amount: item.amount,
        paymentDate: item.date,
        month: item.date.getUTCMonth() + 1,
        year: item.date.getUTCFullYear(),
        notes,
      });
    }
  }

  if (entries.length === 0) return;
  await prisma.otherPayment.createMany({ data: entries });
  revalidatePath("/rechnungen");
}

export async function deleteOtherPayment(id: string) {
  if (!id) return;
  const row = await prisma.otherPayment.findUnique({
    where: { id },
    select: { kind: true, planGroupId: true },
  });
  if (!row) return;

  if (row.kind === "cross_upsell" && row.planGroupId) {
    await prisma.otherPayment.deleteMany({ where: { planGroupId: row.planGroupId } });
  } else {
    await prisma.otherPayment.delete({ where: { id } });
  }
  revalidatePath("/rechnungen");
}
