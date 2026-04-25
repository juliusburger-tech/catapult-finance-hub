"use server";

import { revalidatePath } from "next/cache";

import { parseCsv, parseGermanNumber } from "@/lib/invoices/csv";
import { generatePaymentSchedule } from "@/lib/invoices/generate-payment-schedule";
import { prisma } from "@/lib/prisma";

type CustomerActionResult = { ok: true } | { ok: false; error: string };
type UpdateCustomerActionResult =
  | { ok: true; scheduleRegenerated: boolean }
  | { ok: false; error: string };
type ImportCustomersResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

function parseDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function parseCsvDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const excelSerial = Number(trimmed.replace(",", "."));
  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 90000) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const millis = excelSerial * 24 * 60 * 60 * 1000;
    const converted = new Date(base.getTime() + millis);
    if (!Number.isNaN(converted.getTime())) {
      return new Date(converted.getUTCFullYear(), converted.getUTCMonth(), converted.getUTCDate());
    }
  }

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const dmySlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlashMatch) {
    const day = Number(dmySlashMatch[1]);
    const month = Number(dmySlashMatch[2]);
    const year = Number(dmySlashMatch[3]);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const dotParts = trimmed.split(".");
  if (dotParts.length === 3) {
    const day = Number(dotParts[0]);
    const month = Number(dotParts[1]);
    const year = Number(dotParts[2]);
    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12 &&
      year >= 2000
    ) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

function normalizeColumnName(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/\s+/g, " ");
}

function normalizeValue(value: string): string {
  return normalizeColumnName(value).replace(/\./g, "");
}

function getCell(row: Record<string, string>, aliases: string[]): string {
  const normalizedAliases = aliases.map((alias) => normalizeColumnName(alias));
  for (const [key, raw] of Object.entries(row)) {
    const normalized = normalizeColumnName(key);
    if (
      normalizedAliases.some(
        (alias) => normalized === alias || normalized.includes(alias) || alias.includes(normalized),
      )
    ) {
      return raw ?? "";
    }
  }
  return "";
}

export async function createCustomer(formData: FormData): Promise<CustomerActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const paymentModel = String(formData.get("paymentModel") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paymentConfig = String(formData.get("paymentConfig") ?? "").trim();
  const paymentDayRaw = parseNumber(formData.get("paymentDay"));
  const contractStart = parseDate(formData.get("contractStart"));
  const contractEnd = parseDate(formData.get("contractEnd"));

  if (name === "") return { ok: false, error: "Kundenname ist erforderlich." };
  if (!["active", "planned", "completed"].includes(status)) {
    return { ok: false, error: "Ungültiger Status." };
  }
  if (!["retainer", "installment", "hybrid", "one_time"].includes(paymentModel)) {
    return { ok: false, error: "Ungültiges Zahlungsmodell." };
  }
  if (!["sepa", "transfer"].includes(paymentMethod)) {
    return { ok: false, error: "Ungültige Zahlungsart." };
  }
  if (paymentDayRaw === null || ![1, 15, 30].includes(paymentDayRaw)) {
    return { ok: false, error: "Zahlungstag muss 1, 15 oder 30 sein." };
  }
  if (!contractStart || !contractEnd) {
    return { ok: false, error: "Vertragszeitraum ist erforderlich." };
  }
  if (contractStart > contractEnd) {
    return { ok: false, error: "Vertragsbeginn darf nicht nach Vertragsende liegen." };
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = JSON.parse(paymentConfig);
  } catch {
    return { ok: false, error: "Zahlungsmodell-Konfiguration ist ungültig." };
  }
  if (typeof parsedConfig !== "object" || parsedConfig === null) {
    return { ok: false, error: "Zahlungsmodell-Konfiguration ist ungültig." };
  }

  const contactPerson = String(formData.get("contactPerson") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const contractSigned = String(formData.get("contractSigned") ?? "") === "on";

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name,
          contactPerson,
          email,
          phone,
          status,
          contractStart,
          contractEnd,
          paymentModel,
          paymentDay: paymentDayRaw,
          paymentMethod,
          paymentConfig,
          contractSigned,
          notes,
        },
      });

      const paymentEntries = generatePaymentSchedule(
        paymentModel,
        paymentConfig,
        paymentDayRaw,
        contractStart,
        contractEnd,
      );

      if (paymentEntries.length > 0) {
        await tx.paymentScheduleEntry.createMany({
          data: paymentEntries.map((entry) => ({
            customerId: customer.id,
            dueMonth: entry.dueMonth,
            dueYear: entry.dueYear,
            dueDay: entry.dueDay,
            amount: entry.amount,
            entryType: entry.entryType,
          })),
        });
      }
    });
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Kunde konnte nicht gespeichert werden." };
  }

  revalidatePath("/kunden");
  revalidatePath("/rechnungen");
  return { ok: true };
}

export async function deleteCustomer(id: string): Promise<CustomerActionResult> {
  if (!id) return { ok: false, error: "Ungültige Kunden-ID." };

  try {
    await prisma.customer.delete({ where: { id } });
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Kunde konnte nicht gelöscht werden." };
  }

  revalidatePath("/kunden");
  revalidatePath("/rechnungen");
  return { ok: true };
}

export async function updateCustomer(
  id: string,
  formData: FormData,
): Promise<UpdateCustomerActionResult> {
  if (!id) return { ok: false, error: "Ungültige Kunden-ID." };

  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const paymentModel = String(formData.get("paymentModel") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paymentConfig = String(formData.get("paymentConfig") ?? "").trim();
  const paymentDayRaw = parseNumber(formData.get("paymentDay"));
  const contractStart = parseDate(formData.get("contractStart"));
  const contractEnd = parseDate(formData.get("contractEnd"));

  if (name === "") return { ok: false, error: "Kundenname ist erforderlich." };
  if (!["active", "planned", "completed"].includes(status)) {
    return { ok: false, error: "Ungültiger Status." };
  }
  if (!["retainer", "installment", "hybrid", "one_time"].includes(paymentModel)) {
    return { ok: false, error: "Ungültiges Zahlungsmodell." };
  }
  if (!["sepa", "transfer"].includes(paymentMethod)) {
    return { ok: false, error: "Ungültige Zahlungsart." };
  }
  if (paymentDayRaw === null || ![1, 15, 30].includes(paymentDayRaw)) {
    return { ok: false, error: "Zahlungstag muss 1, 15 oder 30 sein." };
  }
  if (!contractStart || !contractEnd) {
    return { ok: false, error: "Vertragszeitraum ist erforderlich." };
  }
  if (contractStart > contractEnd) {
    return { ok: false, error: "Vertragsbeginn darf nicht nach Vertragsende liegen." };
  }

  try {
    JSON.parse(paymentConfig);
  } catch {
    return { ok: false, error: "Zahlungsmodell-Konfiguration ist ungültig." };
  }

  const existing = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      contractStart: true,
      contractEnd: true,
      paymentModel: true,
      paymentConfig: true,
      paymentDay: true,
    },
  });

  if (!existing) return { ok: false, error: "Kunde nicht gefunden." };

  const shouldRegenerateSchedule =
    existing.contractStart.getTime() !== contractStart.getTime() ||
    existing.contractEnd.getTime() !== contractEnd.getTime() ||
    existing.paymentModel !== paymentModel ||
    existing.paymentConfig !== paymentConfig ||
    existing.paymentDay !== paymentDayRaw;

  const contactPerson = String(formData.get("contactPerson") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const contractSigned = String(formData.get("contractSigned") ?? "") === "on";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: {
          name,
          contactPerson,
          email,
          phone,
          status,
          contractStart,
          contractEnd,
          paymentModel,
          paymentDay: paymentDayRaw,
          paymentMethod,
          paymentConfig,
          contractSigned,
          notes,
        },
      });

      if (shouldRegenerateSchedule) {
        await tx.paymentScheduleEntry.deleteMany({ where: { customerId: id } });
        const paymentEntries = generatePaymentSchedule(
          paymentModel,
          paymentConfig,
          paymentDayRaw,
          contractStart,
          contractEnd,
        );
        if (paymentEntries.length > 0) {
          await tx.paymentScheduleEntry.createMany({
            data: paymentEntries.map((entry) => ({
              customerId: id,
              dueMonth: entry.dueMonth,
              dueYear: entry.dueYear,
              dueDay: entry.dueDay,
              amount: entry.amount,
              entryType: entry.entryType,
            })),
          });
        }
      }
    });
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Kunde konnte nicht aktualisiert werden." };
  }

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${id}`);
  revalidatePath("/rechnungen");
  return { ok: true, scheduleRegenerated: shouldRegenerateSchedule };
}

export async function importCustomersFromCsv(
  formData: FormData,
): Promise<ImportCustomersResult> {
  const csvContent = String(formData.get("csvContent") ?? "");
  if (!csvContent.trim()) {
    return { ok: false, error: "CSV-Inhalt fehlt." };
  }

  const parsedCsv = parseCsv(csvContent);
  if (parsedCsv.rows.length === 0) {
    return { ok: false, error: "CSV enthält keine Datensätze." };
  }
  const rows = parsedCsv.rows;

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = getCell(row, ["Kunde", "Kundenname", "Name", "Firma", "Unternehmen"]).trim();
    const statusRaw = normalizeValue(getCell(row, ["Status"]));
    const paymentModelRaw = normalizeValue(
      getCell(row, ["Zahlungsmodell", "Modell", "Abrechnungsmodell", "Payment Model"]),
    );
    const paymentDayRaw = normalizeValue(
      getCell(row, ["Zahlungstag", "Tag", "Faelligkeit", "Fälligkeit", "Pay Day"]),
    );
    const paymentMethodRaw = normalizeValue(
      getCell(row, ["Zahlungsart", "Zahlungsweise", "Payment Method"]),
    );

    const status: "active" | "completed" | "planned" =
      statusRaw.includes("abgeschlossen")
        ? "completed"
        : statusRaw.includes("geplant")
          ? "planned"
          : "active";

    const paymentModel: "retainer" | "installment" | "one_time" | undefined =
      paymentModelRaw.includes("retainer")
        ? "retainer"
        : paymentModelRaw.includes("teilzahlung") ||
            paymentModelRaw.includes("raten") ||
            paymentModelRaw.includes("installment")
          ? "installment"
          : paymentModelRaw.includes("einmal")
            ? "one_time"
            : undefined;

    const paymentDay = paymentDayRaw.includes("15")
      ? 15
      : paymentDayRaw.includes("30")
        ? 30
        : paymentDayRaw.includes("1")
          ? 1
          : 1;

    const paymentMethod: "sepa" | "transfer" =
      paymentMethodRaw.includes("sepa") ? "sepa" : "transfer";
    const contractStart = parseCsvDate(
      getCell(row, ["Startdatum", "Vertragsbeginn", "Start", "Beginn"]),
    );
    const contractEnd = parseCsvDate(
      getCell(row, ["Enddatum", "Vertragsende", "Ende", "Laufzeitende"]),
    );
    const amount = parseGermanNumber(
      getCell(row, ["Betrag (€)", "Betrag", "Gesamtbetrag", "Preis", "Volumen"]),
    );
    const notes = getCell(row, ["Notizen", "Notiz", "Kommentar", "Bemerkung"]).trim() || null;

    if (!name || !paymentModel || !contractStart || !contractEnd || amount === null) {
      skipped += 1;
      continue;
    }

    const paymentConfig =
      paymentModel === "retainer"
        ? JSON.stringify({ monthlyAmount: amount })
        : paymentModel === "installment"
          ? JSON.stringify({
              totalAmount: amount,
              applyDiscount: true,
              discountPercent: 5,
              secondInstallmentMonthOffset: 3,
            })
          : JSON.stringify({
              totalAmount: amount,
              applyDiscount: true,
              discountPercent: 10,
            });

    try {
      await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            name,
            status,
            paymentModel,
            paymentDay,
            paymentMethod,
            paymentConfig,
            contractStart,
            contractEnd,
            notes,
          },
        });

        const entries = generatePaymentSchedule(
          paymentModel,
          paymentConfig,
          paymentDay,
          contractStart,
          contractEnd,
        );

        if (entries.length > 0) {
          await tx.paymentScheduleEntry.createMany({
            data: entries.map((entry) => ({
              customerId: customer.id,
              dueMonth: entry.dueMonth,
              dueYear: entry.dueYear,
              dueDay: entry.dueDay,
              amount: entry.amount,
              entryType: entry.entryType,
            })),
          });
        }
      });
      imported += 1;
    } catch (error) {
      console.error(error);
      skipped += 1;
    }
  }

  if (imported === 0 && skipped > 0) {
    return {
      ok: false,
      error:
        "Keine Zeile konnte importiert werden. Bitte prüfe, ob die Spaltenüberschriften zum Mapping passen (z. B. Kunde, Zahlungsmodell, Zahlungstag, Startdatum, Enddatum, Betrag (€)).",
    };
  }

  revalidatePath("/kunden");
  revalidatePath("/rechnungen");
  return { ok: true, imported, skipped };
}
