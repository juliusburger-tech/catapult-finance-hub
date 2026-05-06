"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

type CrossUpsellEntryInput = {
  planGroupId: string;
  title: string;
  category: string;
  customerId: string | null;
  salesType: "cross_sell" | "upsell";
  planType: "one_time" | "installment";
  startDate: Date;
  totalAmount: number;
  installmentPlanRaw: string;
  notes: string | null;
};

function toRoundedAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildCrossUpsellEntries(input: CrossUpsellEntryInput) {
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

  if (input.planType === "one_time") {
    entries.push({
      customerId: input.customerId,
      title: input.title,
      kind: "cross_upsell",
      category: input.category,
      salesType: input.salesType,
      includeInAv: true,
      planGroupId: input.planGroupId,
      planType: input.planType,
      planConfig: JSON.stringify({ totalAmount: input.totalAmount }),
      amount: toRoundedAmount(input.totalAmount),
      paymentDate: input.startDate,
      month: input.startDate.getMonth() + 1,
      year: input.startDate.getFullYear(),
      notes: input.notes,
    });

    return entries;
  }

  const rows = input.installmentPlanRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (rows.length < 1) return [];

  const parsedRows: Array<{ date: Date; amount: number; monthKey: string }> = [];
  for (const row of rows) {
    const normalized = row.replace(/\s+/g, " ");
    const match = normalized.match(/^(\d{4}-\d{2})\s*[:;]\s*([0-9.,]+)$/);
    if (!match) return [];
    const [, monthRaw, amountRaw] = match;

    const date = new Date(`${monthRaw}-01T00:00:00.000Z`);
    const amount = Number(amountRaw.replace(",", "."));
    if (Number.isNaN(date.getTime()) || !Number.isFinite(amount) || amount <= 0) return [];

    parsedRows.push({ date, amount: toRoundedAmount(amount), monthKey: monthRaw });
  }

  const planTotal = toRoundedAmount(parsedRows.reduce((sum, row) => sum + row.amount, 0));
  const expectedTotal = toRoundedAmount(input.totalAmount);
  if (Math.abs(planTotal - expectedTotal) > 0.01) return [];

  for (let i = 0; i < parsedRows.length; i += 1) {
    const item = parsedRows[i];
    entries.push({
      customerId: input.customerId,
      title: `${input.title} (Rate ${i + 1}/${parsedRows.length})`,
      kind: "cross_upsell",
      category: input.category,
      salesType: input.salesType,
      includeInAv: true,
      planGroupId: input.planGroupId,
      planType: input.planType,
      planConfig: JSON.stringify({
        totalAmount: expectedTotal,
        installments: parsedRows.map((row) => ({ month: row.monthKey, amount: row.amount })),
      }),
      amount: item.amount,
      paymentDate: item.date,
      month: item.date.getUTCMonth() + 1,
      year: item.date.getUTCFullYear(),
      notes: input.notes,
    });
  }

  return entries;
}

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

export async function updatePaymentScheduleEntryFromForm(entryId: string, formData: FormData) {
  const amount = Number(formData.get("amount"));
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0 || !dueDateRaw) {
    return;
  }

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) {
    return;
  }

  const dueDay = dueDate.getDate();
  const dueMonth = dueDate.getMonth() + 1;
  const dueYear = dueDate.getFullYear();

  await prisma.paymentScheduleEntry.update({
    where: { id: entryId },
    data: {
      amount: Math.round(amount * 100) / 100,
      dueDay,
      dueMonth,
      dueYear,
    },
  });

  revalidatePath("/rechnungen");
  revalidatePath("/kunden");
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
  const installmentPlanRaw = String(formData.get("installmentPlan") ?? "").trim();
  const entries = buildCrossUpsellEntries({
    planGroupId,
    title,
    category,
    customerId: customerIdRaw || null,
    salesType,
    planType,
    startDate,
    totalAmount,
    installmentPlanRaw,
    notes,
  });

  if (entries.length === 0) return;
  await prisma.otherPayment.createMany({ data: entries });
  revalidatePath("/rechnungen");
}

export async function updateCrossUpsellPlan(formData: FormData) {
  const planGroupId = String(formData.get("planGroupId") ?? "").trim();
  if (!planGroupId) return;

  const existing = await prisma.otherPayment.findMany({
    where: { planGroupId, kind: "cross_upsell" },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
  });
  if (existing.length === 0) return;

  const first = existing[0];
  const fallbackTitle = first.title.replace(/\s+\(Rate \d+\/\d+\)\s*$/, "");
  const title = String(formData.get("title") ?? fallbackTitle).trim() || fallbackTitle;
  const category = String(formData.get("category") ?? first.category).trim() || first.category;
  const customerIdRaw = String(formData.get("customerId") ?? "").trim();
  const salesTypeRaw = String(formData.get("salesType") ?? first.salesType).trim();
  const salesType: "cross_sell" | "upsell" = salesTypeRaw === "upsell" ? "upsell" : "cross_sell";
  const planTypeRaw = String(formData.get("planType") ?? first.planType ?? "one_time").trim();
  const planType: "one_time" | "installment" =
    planTypeRaw === "installment" ? "installment" : "one_time";
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const totalAmount = Number(formData.get("totalAmount"));
  const installmentPlanRaw = String(formData.get("installmentPlan") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "");
  const notes = notesRaw.trim() === "" ? null : notesRaw.trim();

  if (!startDateRaw || !Number.isFinite(totalAmount) || totalAmount <= 0) return;
  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) return;

  const entries = buildCrossUpsellEntries({
    planGroupId,
    title,
    category,
    customerId: customerIdRaw || null,
    salesType,
    planType,
    startDate,
    totalAmount,
    installmentPlanRaw,
    notes,
  });
  if (entries.length === 0) return;

  await prisma.$transaction([
    prisma.otherPayment.deleteMany({ where: { planGroupId, kind: "cross_upsell" } }),
    prisma.otherPayment.createMany({ data: entries }),
  ]);

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

export async function deleteCrossUpsellPlan(planGroupId: string) {
  if (!planGroupId) return;
  await prisma.otherPayment.deleteMany({
    where: { planGroupId, kind: "cross_upsell" },
  });
  revalidatePath("/rechnungen");
}
