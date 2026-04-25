"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { importCustomersFromCsv } from "@/app/kunden/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseCsv } from "@/lib/invoices/csv";

export function CustomerImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parsed = useMemo(() => parseCsv(csvContent), [csvContent]);
  const previewRows = parsed.rows.slice(0, 5);

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvContent(text);
    setError(null);
    setSuccess(null);
  }

  function handleImport() {
    if (!csvContent.trim()) {
      setError("Bitte zuerst eine CSV-Datei auswählen.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("csvContent", csvContent);
      const result = await importCustomersFromCsv(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Import abgeschlossen: ${result.imported} importiert, ${result.skipped} übersprungen.`);
      router.refresh();
    });
  }

  function reset() {
    setCsvContent("");
    setError(null);
    setSuccess(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Aus Excel importieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-[var(--color-border-token)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-text)]">Kunden aus CSV importieren</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-text)]">CSV-Upload</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleFileChange(file);
              }}
              className="text-sm text-[var(--color-text)]"
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text-muted)]">
            <p className="font-semibold text-[var(--color-text)]">Mapping-Hinweis</p>
            <p>Kunde → name · Status → status · Zahlungsmodell → paymentModel</p>
            <p>Zahlungstag → paymentDay · Startdatum/Enddatum → contractStart/contractEnd</p>
            <p>Betrag (€) → paymentConfig · Zahlungsart → paymentMethod · Notizen → notes</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Vorschau (erste 5 Zeilen)</p>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border-token)]">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-token)] bg-[var(--color-surface-raised)]">
                    {parsed.headers.length > 0 ? (
                      parsed.headers.map((header) => (
                        <th key={header} className="px-3 py-2 text-left font-medium text-[var(--color-text-subtle)]">
                          {header}
                        </th>
                      ))
                    ) : (
                      <th className="px-3 py-2 text-left font-medium text-[var(--color-text-subtle)]">
                        Keine Vorschau verfügbar
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-border-token)]">
                      {parsed.headers.map((header) => (
                        <td key={`${idx}-${header}`} className="px-3 py-2 text-[var(--color-text)]">
                          {row[header] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsed.headers.length > 0 && previewRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={parsed.headers.length}
                        className="px-3 py-6 text-center text-[var(--color-text-muted)]"
                      >
                        Keine Datenzeilen gefunden.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Schließen
          </Button>
          <Button type="button" onClick={handleImport} disabled={pending}>
            {pending ? "Import läuft..." : "Importieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
