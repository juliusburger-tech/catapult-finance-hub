"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState, useTransition } from "react";
import { Upload } from "lucide-react";

import { createBwa } from "@/app/bwa/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const YEAR_OPTIONS = Array.from(
  { length: 12 },
  (_, i) => new Date().getFullYear() - 4 + i,
);

export type BwaUploadPanelProps = {
  initialYear?: number;
  initialMonth?: number;
};

export function BwaUploadPanel({ initialYear, initialMonth }: BwaUploadPanelProps) {
  const router = useRouter();
  const formId = useId();
  const defaultYear = initialYear ?? new Date().getFullYear();
  const defaultMonth = initialMonth ?? new Date().getMonth() + 1;
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = useCallback((next: File | null) => {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Bitte nur PDF-Dateien verwenden.");
      setFile(null);
      return;
    }
    setFile(next);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) {
        onFile(dropped);
      }
    },
    [onFile],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (file) {
      fd.set("file", file);
    }

    startTransition(async () => {
      const result = await createBwa(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setFile(null);
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
      style={{
        borderColor: "var(--color-border-token)",
        boxShadow: "var(--shadow-card-token)",
      }}
    >
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          Neue BWA
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text)]">
          PDF hochladen und Kennzahlen erfassen
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Monat und Jahr zuordnen, anschließend die Kennzahlen aus der BWA
          eintragen. Kassenbestand ist optional.
        </p>
      </div>

      <form
        key={`bwa-upload-${defaultYear}-${defaultMonth}`}
        className="flex flex-col gap-6"
        onSubmit={handleSubmit}
      >
        <div
          className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card-token)] border-2 border-dashed px-4 py-6 transition-colors ${
            dragActive
              ? "border-[var(--color-primary)] bg-[var(--color-surface-raised)]"
              : "border-[var(--color-border-token)] bg-[var(--color-surface-raised)] hover:border-[var(--color-primary)]/50"
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById(`${formId}-file`)?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById(`${formId}-file`)?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="PDF per Drag and Drop ablegen oder auswählen"
        >
          <Upload className="size-8 text-[var(--color-primary)]" strokeWidth={1.5} />
          <p className="text-center text-sm font-medium text-[var(--color-text)]">
            PDF hierher ziehen oder Bereich anklicken
          </p>
          {file ? (
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              Ausgewählt: {file.name}
            </p>
          ) : (
            <p className="text-center text-xs text-[var(--color-text-subtle)]">
              Nur PDF, max. praktisch durch Browser begrenzt
            </p>
          )}
          <input
            id={`${formId}-file`}
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(ev) => {
              const f = ev.target.files?.[0] ?? null;
              onFile(f);
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-month`} className="text-[var(--color-text)]">
              Monat
            </Label>
            <select
              id={`${formId}-month`}
              name="month"
              required
              defaultValue={String(defaultMonth)}
              className="flex h-9 w-full rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-year`} className="text-[var(--color-text)]">
              Jahr
            </Label>
            <select
              id={`${formId}-year`}
              name="year"
              required
              defaultValue={String(defaultYear)}
              className="flex h-9 w-full rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricField
            id={`${formId}-revenue`}
            name="revenue"
            label="Umsatz (netto)"
            required
          />
          <MetricField
            id={`${formId}-personnel`}
            name="personnelCosts"
            label="Personalkosten"
            required
          />
          <MetricField
            id={`${formId}-operating`}
            name="operatingCosts"
            label="Sonstige betriebliche Aufwendungen"
            required
          />
          <MetricField
            id={`${formId}-profit`}
            name="profit"
            label="Vorläufiger Gewinn / Jahresüberschuss"
            required
          />
          <MetricField
            id={`${formId}-cash`}
            name="cashPosition"
            label="Kassenbestand / Bankguthaben"
            hint="Optional"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-notes`} className="text-[var(--color-text)]">
            Notizen
          </Label>
          <textarea
            id={`${formId}-notes`}
            name="notes"
            rows={3}
            className="w-full resize-y rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm outline-none placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
            placeholder="Freitext, z. B. Hinweise zur Auswertung"
          />
        </div>

        {error ? (
          <p className="text-sm text-[var(--color-error)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !file}>
            {pending ? "Speichern…" : "BWA speichern"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function MetricField({
  id,
  name,
  label,
  required,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-[var(--color-text)]">
        {label}
        {hint ? (
          <span className="ml-1 font-normal text-[var(--color-text-subtle)]">
            ({hint})
          </span>
        ) : null}
      </Label>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        step="any"
        required={required}
        placeholder="0"
        className="border-[var(--color-border-token)] bg-[var(--color-surface)] text-[var(--color-text)]"
      />
    </div>
  );
}
