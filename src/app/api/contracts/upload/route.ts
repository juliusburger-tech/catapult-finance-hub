import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const file = formData.get("file");

  if (!customerId || !(file instanceof File)) {
    return NextResponse.redirect(new URL("/kunden", request.url));
  }

  if (file.type !== "application/pdf") {
    return NextResponse.redirect(new URL(`/kunden/${customerId}`, request.url));
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

  return NextResponse.redirect(new URL(`/kunden/${customerId}`, request.url));
}
