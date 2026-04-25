import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient, getBwaBucketName } from "@/lib/supabase/server";

function resolveStorageLocation(contractFile: string): { bucket: string; path: string } {
  if (!contractFile.startsWith("http")) {
    return { bucket: getBwaBucketName(), path: contractFile };
  }

  const url = new URL(contractFile);
  const markers = ["/object/public/", "/object/sign/"];
  for (const marker of markers) {
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      const tail = url.pathname.slice(markerIndex + marker.length);
      const parts = tail.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const [bucket, ...pathParts] = parts;
        return { bucket, path: pathParts.join("/") };
      }
    }
  }

  return { bucket: getBwaBucketName(), path: contractFile };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await context.params;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { contractFile: true, name: true },
  });

  if (!customer?.contractFile) {
    return NextResponse.json({ error: "Kein Angebot hinterlegt." }, { status: 404 });
  }

  const { bucket, path } = resolveStorageLocation(customer.contractFile);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    return NextResponse.json(
      { error: `Dokument konnte nicht geladen werden: ${error?.message ?? "Unbekannt"}` },
      { status: 404 },
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const safeName = (customer.name || "angebot").replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${safeName}-angebot.pdf\"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
