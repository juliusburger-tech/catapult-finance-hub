import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const formData = await request.formData();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const file = formData.get("file");

  if (!customerId || !(file instanceof File)) {
    if (wantsJson) {
      return NextResponse.json(
        { ok: false, error: "Ungültige Upload-Daten." },
        { status: 400 },
      );
    }
    return NextResponse.redirect(new URL("/kunden", request.url), { status: 303 });
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    if (wantsJson) {
      return NextResponse.json(
        { ok: false, error: "Bitte nur PDF-Dateien hochladen." },
        { status: 400 },
      );
    }
    return NextResponse.redirect(new URL(`/kunden/${customerId}`, request.url), {
      status: 303,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFilename(file.name || "vertrag.pdf");
  const fileName = `${Date.now()}-${safeName}`;
  const relativeDir = path.join("uploads", "contracts", customerId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), buffer);

  const relativePath = path.join(relativeDir, fileName).replaceAll("\\", "/");
  await prisma.customer.update({
    where: { id: customerId },
    data: { contractFile: relativePath },
  });

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${customerId}`);

  if (wantsJson) {
    return NextResponse.json({ ok: true, contractFile: relativePath }, { status: 200 });
  }

  return NextResponse.redirect(new URL(`/kunden/${customerId}`, request.url), {
    status: 303,
  });
}
