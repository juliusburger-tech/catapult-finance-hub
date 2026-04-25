import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient, getBwaBucketName } from "@/lib/supabase/server";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  try {
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

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFilename(file.name || "vertrag.pdf");
    const objectPath = `contracts/${customerId}/${Date.now()}-${safeName}`;
    const supabase = createSupabaseServerClient();
    const bucket = getBwaBucketName();

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, bytes, {
        upsert: false,
        contentType: "application/pdf",
      });
    if (uploadError) {
      throw uploadError;
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;

    await prisma.customer.update({
      where: { id: customerId },
      data: { contractFile: publicUrl || objectPath },
    });

    revalidatePath("/kunden");
    revalidatePath(`/kunden/${customerId}`);

    if (wantsJson) {
      return NextResponse.json(
        { ok: true, contractFile: publicUrl || objectPath },
        { status: 200 },
      );
    }

    return NextResponse.redirect(new URL(`/kunden/${customerId}`, request.url), {
      status: 303,
    });
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unbekannter Fehler";
    if (wantsJson) {
      return NextResponse.json(
        {
          ok: false,
          error: `Upload fehlgeschlagen: ${errorMessage}`,
        },
        { status: 500 },
      );
    }
    return NextResponse.redirect(new URL("/kunden", request.url), { status: 303 });
  }
}
