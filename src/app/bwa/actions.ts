"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createSupabaseServerClient,
  getBwaBucketName,
} from "@/lib/supabase/server";

export type BwaActionResult =
  | { ok: true }
  | { ok: false; error: string };

function parseRequiredInt(value: FormDataEntryValue | null, label: string) {
  if (value == null || value === "") {
    return { ok: false as const, error: `${label} fehlt.` };
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    return { ok: false as const, error: `${label} ist ungültig.` };
  }
  return { ok: true as const, value: n };
}

function parseOptionalFloat(value: FormDataEntryValue | null) {
  if (value == null || value === "") {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return n;
}

export async function createBwa(formData: FormData): Promise<BwaActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine PDF-Datei auswählen." };
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "Nur PDF-Dateien sind erlaubt." };
  }

  const monthResult = parseRequiredInt(formData.get("month"), "Monat");
  if (!monthResult.ok) {
    return monthResult;
  }
  const yearResult = parseRequiredInt(formData.get("year"), "Jahr");
  if (!yearResult.ok) {
    return yearResult;
  }

  const { value: month } = monthResult;
  const { value: year } = yearResult;

  if (month < 1 || month > 12) {
    return { ok: false, error: "Monat muss zwischen 1 und 12 liegen." };
  }

  const revenue = parseOptionalFloat(formData.get("revenue"));
  const personnelCosts = parseOptionalFloat(formData.get("personnelCosts"));
  const operatingCosts = parseOptionalFloat(formData.get("operatingCosts"));
  const profit = parseOptionalFloat(formData.get("profit"));
  const cashPosition = parseOptionalFloat(formData.get("cashPosition"));

  if (
    revenue === undefined ||
    personnelCosts === undefined ||
    operatingCosts === undefined ||
    profit === undefined
  ) {
    return {
      ok: false,
      error: "Umsatz, Personalkosten, sonstige betriebliche Aufwendungen und Gewinn sind Pflichtfelder.",
    };
  }

  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" && notesRaw.trim() !== "" ? notesRaw.trim() : undefined;

  const originalName = file.name.replace(/[/\\]/g, "_").slice(0, 200);
  const safeBase = `${year}-${String(month).padStart(2, "0")}-${crypto.randomUUID()}-${originalName}`;
  const objectPath = `${year}/${safeBase}`;
  const supabase = createSupabaseServerClient();
  const bucket = getBwaBucketName();

  const bytes = Buffer.from(await file.arrayBuffer());
  let uploaded = false;

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, bytes, {
        upsert: false,
        contentType: "application/pdf",
      });
    if (uploadError) {
      throw uploadError;
    }
    uploaded = true;

    await prisma.bwaEntry.create({
      data: {
        month,
        year,
        filename: originalName,
        filePath: objectPath,
        revenue,
        personnelCosts,
        operatingCosts,
        profit,
        cashPosition,
        notes,
      },
    });
  } catch (error) {
    if (uploaded) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove([objectPath]);
      if (removeError) {
        console.error(removeError);
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error: "Für diesen Monat und dieses Jahr existiert bereits eine BWA. Bitte zuerst löschen oder einen anderen Zeitraum wählen.",
      };
    }

    console.error(error);
    return {
      ok: false,
      error: "Speichern ist fehlgeschlagen. Bitte erneut versuchen.",
    };
  }

  revalidatePath("/bwa");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBwa(id: string): Promise<BwaActionResult> {
  if (!id) {
    return { ok: false, error: "Ungültige ID." };
  }

  const entry = await prisma.bwaEntry.findUnique({ where: { id } });
  if (!entry) {
    return { ok: false, error: "Eintrag wurde nicht gefunden." };
  }
  const supabase = createSupabaseServerClient();
  const bucket = getBwaBucketName();

  try {
    await prisma.bwaEntry.delete({ where: { id } });
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Löschen in der Datenbank ist fehlgeschlagen." };
  }

  if (!entry.filePath.startsWith("/")) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([entry.filePath]);
    if (removeError) {
      console.error(removeError);
    }
  }

  revalidatePath("/bwa");
  revalidatePath("/");
  return { ok: true };
}
