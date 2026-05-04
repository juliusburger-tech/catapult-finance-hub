"use server";

import { addMonths } from "date-fns";
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
  const planType =
    planTypeRaw === "installment" || planTypeRaw === "retainer" ? planTypeRaw : "one_time";
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title || !startDateRaw) return;

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
    const amount = Number(formData.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) return;

    entries.push({
      customerId: customerIdRaw || null,
      title,
      kind: "cross_upsell",
      category,
      salesType,
      includeInAv: true,
      planGroupId,
      planType,
      planConfig: JSON.stringify({ amount }),
      amount,
      paymentDate: startDate,
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      notes,
    });
  } else if (planType === "installment") {
    const totalAmount = Number(formData.get("totalAmount"));
    const installmentCount = Number(formData.get("installmentCount"));
    const intervalMonths = Number(formData.get("intervalMonths"));
    if (
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0 ||
      !Number.isInteger(installmentCount) ||
      installmentCount < 2 ||
      !Number.isInteger(intervalMonths) ||
      intervalMonths < 1
    ) {
      return;
    }

    const rawRate = totalAmount / installmentCount;
    const roundedRate = Math.round(rawRate * 100) / 100;
    let allocated = 0;
    for (let i = 0; i < installmentCount; i += 1) {
      const date = addMonths(startDate, i * intervalMonths);
      const isLast = i === installmentCount - 1;
      const amount = isLast ? Math.round((totalAmount - allocated) * 100) / 100 : roundedRate;
      allocated += amount;
      entries.push({
        customerId: customerIdRaw || null,
        title: `${title} (Rate ${i + 1}/${installmentCount})`,
        kind: "cross_upsell",
        category,
        salesType,
        includeInAv: true,
        planGroupId,
        planType,
        planConfig: JSON.stringify({ totalAmount, installmentCount, intervalMonths }),
        amount,
        paymentDate: date,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        notes,
      });
    }
  } else {
    const monthlyAmount = Number(formData.get("monthlyAmount"));
    const monthsCount = Number(formData.get("monthsCount"));
    if (
      !Number.isFinite(monthlyAmount) ||
      monthlyAmount <= 0 ||
      !Number.isInteger(monthsCount) ||
      monthsCount < 1
    ) {
      return;
    }

    for (let i = 0; i < monthsCount; i += 1) {
      const date = addMonths(startDate, i);
      entries.push({
        customerId: customerIdRaw || null,
        title: `${title} (Monat ${i + 1}/${monthsCount})`,
        kind: "cross_upsell",
        category,
        salesType,
        includeInAv: true,
        planGroupId,
        planType,
        planConfig: JSON.stringify({ monthlyAmount, monthsCount }),
        amount: Math.round(monthlyAmount * 100) / 100,
        paymentDate: date,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
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
