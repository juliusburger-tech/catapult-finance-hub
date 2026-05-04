"use server";

import { revalidatePath } from "next/cache";

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
  const salesTypeRaw = String(formData.get("salesType") ?? "other").trim();
  const salesType =
    salesTypeRaw === "cross_sell" || salesTypeRaw === "upsell" ? salesTypeRaw : "other";
  const customerIdRaw = String(formData.get("customerId") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const paymentDateRaw = String(formData.get("paymentDate") ?? "").trim();
  const includeInAv =
    String(formData.get("includeInAv") ?? "").trim() === "on" ||
    salesType === "cross_sell" ||
    salesType === "upsell";

  if (!title || !Number.isFinite(amount) || amount <= 0 || !paymentDateRaw) {
    return;
  }

  const paymentDate = new Date(paymentDateRaw);
  if (Number.isNaN(paymentDate.getTime())) {
    return;
  }

  await prisma.otherPayment.create({
    data: {
      customerId: customerIdRaw || null,
      title,
      category,
      salesType,
      includeInAv,
      amount,
      paymentDate,
      month: paymentDate.getMonth() + 1,
      year: paymentDate.getFullYear(),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/rechnungen");
}

export async function deleteOtherPayment(id: string) {
  if (!id) return;
  await prisma.otherPayment.delete({ where: { id } });
  revalidatePath("/rechnungen");
}
