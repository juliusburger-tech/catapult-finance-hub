import { BwaEntriesTable } from "@/components/bwa/bwa-entries-table";
import { BwaUploadPanel } from "@/components/bwa/bwa-upload-panel";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseServerClient,
  getBwaBucketName,
} from "@/lib/supabase/server";

export const revalidate = 60;

type BwaPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

function parsePresetYear(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return undefined;
  return n;
}

function parsePresetMonth(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 12) return undefined;
  return n;
}

export default async function BwaArchivePage({ searchParams }: BwaPageProps) {
  const sp = await searchParams;
  const presetYear = parsePresetYear(sp.year);
  const presetMonth = parsePresetMonth(sp.month);

  const entries = await prisma.bwaEntry.findMany({
    orderBy: { uploadedAt: "desc" },
  });
  const supabase = createSupabaseServerClient();
  const bucket = getBwaBucketName();

  const entriesWithLinks = await Promise.all(
    entries.map(async (entry) => {
      if (entry.filePath.startsWith("/")) {
        return {
          ...entry,
          openUrl: entry.filePath,
          downloadUrl: entry.filePath,
        };
      }

      const [{ data: openData, error: openError }, { data: downloadData, error: downloadError }] =
        await Promise.all([
          supabase.storage.from(bucket).createSignedUrl(entry.filePath, 60 * 10),
          supabase.storage
            .from(bucket)
            .createSignedUrl(entry.filePath, 60 * 10, { download: entry.filename }),
        ]);

      if (openError || downloadError || !openData?.signedUrl || !downloadData?.signedUrl) {
        console.error(openError || downloadError || "Missing signed URL");
        return {
          ...entry,
          openUrl: "#",
          downloadUrl: "#",
        };
      }

      return {
        ...entry,
        openUrl: openData.signedUrl,
        downloadUrl: downloadData.signedUrl,
      };
    }),
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          BWA
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)] md:text-4xl">
          BWA-Archiv
        </h1>
        <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
          Monatliche Betriebswirtschaftliche Auswertungen als PDF ablegen, Kennzahlen
          für das Dashboard erfassen und jederzeit öffnen oder löschen.
        </p>
      </header>

      <BwaUploadPanel initialYear={presetYear} initialMonth={presetMonth} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
            <span className="text-[var(--color-text-subtle)]">— </span>
            Archiv
            <span className="text-[var(--color-text-subtle)]"> —</span>
          </p>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text)]">
            Alle BWAs
          </h2>
        </div>
        <BwaEntriesTable entries={entriesWithLinks} />
      </section>
    </div>
  );
}
