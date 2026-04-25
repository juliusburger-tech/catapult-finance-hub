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
