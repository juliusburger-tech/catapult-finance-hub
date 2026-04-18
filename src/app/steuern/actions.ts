"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isTaxPaymentType } from "@/lib/tax/payment-types";

export type TaxActionResult = { ok: true } | { ok: false; error: string };

function parseYear(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) {
    return null;
  }
  return n;
}

export async function saveTaxConfig(
  _prev: TaxActionResult | undefined,
  formData: FormData,
): Promise<TaxActionResult> {
  const year = parseYear(formData.get("year"));
  if (year === null) {
    return { ok: false, error: "Ungültiges Jahr." };
  }

  const hebesatz = Number(formData.get("hebesatz"));
  const estRatePartner1 = Number(formData.get("estRatePartner1"));
  const estRatePartner2 = Number(formData.get("estRatePartner2"));
  const profitSplitP1 = Number(formData.get("profitSplitP1"));

  if (!Number.isFinite(hebesatz) || hebesatz <= 0 || hebesatz > 999) {
    return { ok: false, error: "Hebesatz muss zwischen 1 und 999 liegen." };
  }
  if (
    !Number.isFinite(estRatePartner1) ||
    estRatePartner1 < 0 ||
    estRatePartner1 > 100
  ) {
    return {
      ok: false,
      error: "ESt-Satz Gesellschafter 1 muss zwischen 0 und 100 % liegen.",
    };
  }
  if (
    !Number.isFinite(estRatePartner2) ||
    estRatePartner2 < 0 ||
    estRatePartner2 > 100
  ) {
    return {
      ok: false,
      error: "ESt-Satz Gesellschafter 2 muss zwischen 0 und 100 % liegen.",
    };
  }
  if (
    !Number.isFinite(profitSplitP1) ||
    profitSplitP1 < 0 ||
    profitSplitP1 > 100
  ) {
    return {
      ok: false,
      error: "Gewinnverteilung Gesellschafter 1 muss zwischen 0 und 100 % liegen.",
    };
  }

  try {
    await prisma.taxConfig.upsert({
      where: { year },
      create: {
        year,
        hebesatz,
        estRatePartner1,
        estRatePartner2,
        profitSplitP1,
      },
      update: {
        hebesatz,
        estRatePartner1,
        estRatePartner2,
        profitSplitP1,
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Speichern der Einstellungen ist fehlgeschlagen." };
  }

  revalidatePath("/steuern");
  revalidatePath("/");
  return { ok: true };
}

export async function addTaxPayment(
  _prev: TaxActionResult | undefined,
  formData: FormData,
): Promise<TaxActionResult> {
  const year = parseYear(formData.get("year"));
  if (year === null) {
    return { ok: false, error: "Ungültiges Jahr." };
  }

  const dateRaw = formData.get("date");
  if (typeof dateRaw !== "string" || dateRaw === "") {
    return { ok: false, error: "Datum ist erforderlich." };
  }
  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Datum ist ungültig." };
  }

  const typeRaw = formData.get("type");
  if (typeof typeRaw !== "string" || !isTaxPaymentType(typeRaw)) {
    return { ok: false, error: "Bitte eine gültige Zahlungsart wählen." };
  }

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Betrag muss größer als 0 sein." };
  }

  const quarterRaw = formData.get("quarter");
  let quarter: number | null = null;
  if (typeof quarterRaw === "string" && quarterRaw !== "") {
    const q = Number(quarterRaw);
    if (!Number.isInteger(q) || q < 1 || q > 4) {
      return { ok: false, error: "Quartal muss Q1–Q4 sein." };
    }
    quarter = q;
  }

  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" && notesRaw.trim() !== ""
      ? notesRaw.trim()
      : null;

  try {
    await prisma.taxPayment.create({
      data: {
        date,
        type: typeRaw,
        amount,
        quarter,
        year,
        notes,
        status: "active",
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Zahlung konnte nicht gespeichert werden." };
  }

  revalidatePath("/steuern");
  revalidatePath("/");
  return { ok: true };
}

export async function archiveTaxPayment(paymentId: string): Promise<TaxActionResult> {
  if (!paymentId) {
    return { ok: false, error: "Ungültige Zahlung." };
  }

  try {
    const row = await prisma.taxPayment.findFirst({
      where: { id: paymentId, status: "active" },
    });
    if (!row) {
      return { ok: false, error: "Zahlung nicht gefunden oder bereits archiviert." };
    }

    await prisma.taxPayment.update({
      where: { id: paymentId },
      data: { status: "archived" },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Archivieren ist fehlgeschlagen." };
  }

  revalidatePath("/steuern");
  revalidatePath("/");
  return { ok: true };
}

export async function archiveTaxYearPayments(year: number): Promise<TaxActionResult> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, error: "Ungültiges Jahr." };
  }

  try {
    await prisma.taxPayment.updateMany({
      where: { year, status: "active" },
      data: { status: "archived" },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Zahlungen konnten nicht archiviert werden." };
  }

  revalidatePath("/steuern");
  revalidatePath("/");
  return { ok: true };
}
