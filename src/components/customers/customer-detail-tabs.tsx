"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { deleteCustomer, updateCustomer } from "@/app/kunden/actions";
import {
  toggleInvoiceSent,
  togglePaid,
  toggleSepaConfirmed,
  updateEntryNoteFromForm,
} from "@/app/rechnungen/actions";
import { PaymentModelBadge } from "@/components/invoices/payment-model-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";

type Entry = {
  id: string;
  dueMonth: number;
  dueYear: number;
  dueDay: number;
  amount: number;
  entryType: string;
  invoiceSent: boolean;
  sepaConfirmed: boolean;
  paid: boolean;
  notes: string | null;
};

type CustomerDetailProps = {
  customer: {
    id: string;
    name: string;
    status: "active" | "planned" | "completed";
    paymentModel: string;
    paymentMethod: string;
    paymentDay: number;
    contractStart: string;
    contractEnd: string;
    contractSigned: boolean;
    contractFile: string | null;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    paymentConfig: string;
  };
  entries: Entry[];
};

type Tab = "plan" | "master" | "docs";

export function CustomerDetailTabs({ customer, entries }: CustomerDetailProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<Tab>("plan");
  const [pendingDelete, startDeleteTransition] = useTransition();
  const [pendingUpdate, startUpdateTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [draftFormData, setDraftFormData] = useState<FormData | null>(null);

  const initialMasterState = {
    name: customer.name,
    contactPerson: customer.contactPerson ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    status: customer.status,
    contractStart: customer.contractStart,
    contractEnd: customer.contractEnd,
    paymentModel: customer.paymentModel,
    paymentConfig: customer.paymentConfig,
    paymentDay: String(customer.paymentDay),
    paymentMethod: customer.paymentMethod,
    contractSigned: customer.contractSigned,
    notes: customer.notes ?? "",
  };

  const [masterState, setMasterState] = useState(initialMasterState);
  const contractHref = customer.contractFile ? `/api/contracts/${customer.id}` : null;

  const totals = useMemo(() => {
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const paid = entries.filter((entry) => entry.paid).reduce((sum, entry) => sum + entry.amount, 0);
    return { total, paid, open: total - paid };
  }, [entries]);

  function statusLabel() {
    if (customer.status === "active") return "In Betreuung";
    if (customer.status === "planned") return "Geplant";
    return "Abgeschlossen";
  }

  function formatMonth(month: number, year: number): string {
    return new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" }).format(
      new Date(year, month - 1, 1),
    );
  }

  function entryTypeLabel(type: string): string {
    const map: Record<string, string> = {
      retainer: "Monatlich",
      installment_1: "Rate 1",
      installment_2: "Rate 2",
      upfront: "Upfront",
      one_time: "Einmalig",
    };
    return map[type] ?? type;
  }

  function criticalChanged(fd: FormData): boolean {
    return (
      String(fd.get("contractStart")) !== customer.contractStart ||
      String(fd.get("contractEnd")) !== customer.contractEnd ||
      String(fd.get("paymentModel")) !== customer.paymentModel ||
      String(fd.get("paymentConfig")) !== customer.paymentConfig ||
      String(fd.get("paymentDay")) !== String(customer.paymentDay)
    );
  }

  async function submitUpdate(fd: FormData) {
    startUpdateTransition(async () => {
      const result = await updateCustomer(customer.id, fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setShowResetConfirm(false);
      setDraftFormData(null);
      router.refresh();
    });
  }

  function handleMasterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (criticalChanged(fd)) {
      setDraftFormData(fd);
      setShowResetConfirm(true);
      return;
    }
    void submitUpdate(fd);
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/kunden");
      router.refresh();
    });
  }

  async function handleContractUpload() {
    if (!selectedFile) {
      setUploadError("Bitte zuerst eine PDF-Datei auswählen.");
      return;
    }

    setUploadPending(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const formData = new FormData();
      formData.append("customerId", customer.id);
      formData.append("file", selectedFile);

      const response = await fetch("/api/contracts/upload", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const rawBody = await response.text();
      let payload:
        | { ok: true; contractFile: string }
        | { ok: false; error?: string }
        | null = null;
      try {
        payload = JSON.parse(rawBody) as
          | { ok: true; contractFile: string }
          | { ok: false; error?: string };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload || !payload.ok) {
        const detail =
          payload && !payload.ok
            ? payload.error
            : rawBody
              ? `HTTP ${response.status}: ${rawBody.slice(0, 180)}`
              : `HTTP ${response.status}`;
        setUploadError(`Upload-Fehlerdetail: ${detail ?? "Unbekannt"}`);
        return;
      }

      setUploadSuccess("Angebot erfolgreich hochgeladen.");
      setSelectedFileName(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch (uploadErr) {
      console.error(uploadErr);
      const detail =
        uploadErr instanceof Error ? uploadErr.message : "Unbekannter Client-Fehler";
      setUploadError(`Upload-Fehlerdetail: ${detail}`);
    } finally {
      setUploadPending(false);
    }
  }

  function handleSelectedFile(file: File | null) {
    setUploadError(null);
    setUploadSuccess(null);

    if (!file) {
      setSelectedFileName(null);
      setSelectedFile(null);
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setUploadError("Bitte nur PDF-Dateien hochladen.");
      setSelectedFileName(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFileName(file.name);
    setSelectedFile(file);
  }

  return (
    <div className="flex flex-col gap-6">
      <header
        className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)]">
              {customer.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[var(--color-border-token)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
                {statusLabel()}
              </span>
              <PaymentModelBadge model={customer.paymentModel} />
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Vertragszeitraum: {customer.contractStart} - {customer.contractEnd} · Zahlungstag:{" "}
              {customer.paymentDay}. · Zahlungsart:{" "}
              {customer.paymentMethod === "sepa" ? "SEPA Lastschrift" : "Überweisung"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setTab("master")}>
              Bearbeiten
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={pendingDelete}>
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-[var(--color-border-token)] bg-[var(--color-surface)]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Kunde löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion entfernt den Kunden und den Zahlungsplan dauerhaft.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <section className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={tab === "plan" ? "default" : "outline"} onClick={() => setTab("plan")}>
          Zahlungsplan
        </Button>
        <Button type="button" size="sm" variant={tab === "master" ? "default" : "outline"} onClick={() => setTab("master")}>
          Stammdaten
        </Button>
        <Button type="button" size="sm" variant={tab === "docs" ? "default" : "outline"} onClick={() => setTab("docs")}>
          Dokumente
        </Button>
      </section>

      {tab === "plan" ? (
        <section
          className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
          style={{
            borderColor: "var(--color-border-token)",
            boxShadow: "var(--shadow-card-token)",
          }}
        >
          <h2 className="mb-4 text-xl font-extrabold text-[var(--color-text)]">Zahlungsplan</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-token)] text-left text-[var(--color-text-subtle)]">
                  <th className="pb-3 pr-4 font-medium">Monat</th>
                  <th className="pb-3 pr-4 font-medium">Typ</th>
                  <th className="pb-3 pr-4 font-medium">Betrag</th>
                  <th className="pb-3 pr-4 font-medium">Rechnung</th>
                  <th className="pb-3 pr-4 font-medium">SEPA</th>
                  <th className="pb-3 pr-4 font-medium">Bezahlt</th>
                  <th className="pb-3 pr-4 font-medium">Notiz</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--color-border-token)]">
                    <td className="py-3 pr-4">{formatMonth(entry.dueMonth, entry.dueYear)}</td>
                    <td className="py-3 pr-4">{entryTypeLabel(entry.entryType)}</td>
                    <td className="py-3 pr-4 font-semibold text-[var(--color-text)]">
                      {formatEuro(entry.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      <form action={toggleInvoiceSent.bind(null, entry.id)}>
                        <Button variant={entry.invoiceSent ? "default" : "outline"} size="sm">
                          {entry.invoiceSent ? "Ja" : "Nein"}
                        </Button>
                      </form>
                    </td>
                    <td className="py-3 pr-4">
                      {customer.paymentMethod === "sepa" ? (
                        <form action={toggleSepaConfirmed.bind(null, entry.id)}>
                          <Button variant={entry.sepaConfirmed ? "default" : "outline"} size="sm">
                            {entry.sepaConfirmed ? "Ja" : "Nein"}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-[var(--color-text-subtle)]">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <form action={togglePaid.bind(null, entry.id)}>
                        <Button variant={entry.paid ? "default" : "outline"} size="sm">
                          {entry.paid ? "Ja" : "Nein"}
                        </Button>
                      </form>
                    </td>
                    <td className="py-3 pr-4">
                      <form action={updateEntryNoteFromForm.bind(null, entry.id)} className="flex items-center gap-2">
                        <input
                          type="text"
                          name="notes"
                          defaultValue={entry.notes ?? ""}
                          className="h-8 w-40 rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-2 text-xs"
                        />
                        <Button variant="outline" size="sm">
                          Speichern
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            Gesamtvolumen: {formatEuro(totals.total)} | Bezahlt: {formatEuro(totals.paid)} | Ausstehend:{" "}
            {formatEuro(totals.open)}
          </p>
        </section>
      ) : null}

      {tab === "master" ? (
        <section
          className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
          style={{
            borderColor: "var(--color-border-token)",
            boxShadow: "var(--shadow-card-token)",
          }}
        >
          <h2 className="mb-4 text-xl font-extrabold text-[var(--color-text)]">Stammdaten</h2>
          <form onSubmit={handleMasterSubmit} className="grid gap-4 md:grid-cols-2">
            <Field label="Kundenname*" name="name" value={masterState.name} onChange={(value) => setMasterState((s) => ({ ...s, name: value }))} />
            <Field label="Ansprechpartner" name="contactPerson" value={masterState.contactPerson} onChange={(value) => setMasterState((s) => ({ ...s, contactPerson: value }))} />
            <Field label="E-Mail" name="email" value={masterState.email} onChange={(value) => setMasterState((s) => ({ ...s, email: value }))} />
            <Field label="Telefon" name="phone" value={masterState.phone} onChange={(value) => setMasterState((s) => ({ ...s, phone: value }))} />

            <SelectField
              label="Status"
              name="status"
              value={masterState.status}
              onChange={(value) => setMasterState((s) => ({ ...s, status: value as typeof s.status }))}
              options={[
                { value: "active", label: "In Betreuung" },
                { value: "planned", label: "Geplant" },
                { value: "completed", label: "Abgeschlossen" },
              ]}
            />

            <SelectField
              label="Zahlungsmodell"
              name="paymentModel"
              value={masterState.paymentModel}
              onChange={(value) => setMasterState((s) => ({ ...s, paymentModel: value }))}
              options={[
                { value: "retainer", label: "Retainer" },
                { value: "installment", label: "2 Raten" },
                { value: "hybrid", label: "Hybrid" },
                { value: "one_time", label: "Einmalzahlung" },
              ]}
            />

            <Field
              label="Vertragsbeginn*"
              name="contractStart"
              type="date"
              value={masterState.contractStart}
              onChange={(value) => setMasterState((s) => ({ ...s, contractStart: value }))}
            />
            <Field
              label="Vertragsende*"
              name="contractEnd"
              type="date"
              value={masterState.contractEnd}
              onChange={(value) => setMasterState((s) => ({ ...s, contractEnd: value }))}
            />

            <SelectField
              label="Zahlungstag"
              name="paymentDay"
              value={masterState.paymentDay}
              onChange={(value) => setMasterState((s) => ({ ...s, paymentDay: value }))}
              options={[
                { value: "1", label: "1." },
                { value: "15", label: "15." },
                { value: "30", label: "30." },
              ]}
            />
            <SelectField
              label="Zahlungsart"
              name="paymentMethod"
              value={masterState.paymentMethod}
              onChange={(value) => setMasterState((s) => ({ ...s, paymentMethod: value }))}
              options={[
                { value: "sepa", label: "SEPA Lastschrift" },
                { value: "transfer", label: "Überweisung" },
              ]}
            />

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="paymentConfig" className="text-sm font-medium text-[var(--color-text)]">
                Zahlungsmodell-Konfiguration (JSON)
              </label>
              <textarea
                id="paymentConfig"
                name="paymentConfig"
                rows={6}
                value={masterState.paymentConfig}
                onChange={(e) => setMasterState((s) => ({ ...s, paymentConfig: e.target.value }))}
                className="w-full rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="contractSigned"
                name="contractSigned"
                type="checkbox"
                checked={masterState.contractSigned}
                onChange={(e) => setMasterState((s) => ({ ...s, contractSigned: e.target.checked }))}
              />
              <label htmlFor="contractSigned" className="text-sm text-[var(--color-text)]">
                Angebot unterschrieben
              </label>
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-[var(--color-text)]">
                Notizen
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={masterState.notes}
                onChange={(e) => setMasterState((s) => ({ ...s, notes: e.target.value }))}
                className="w-full rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </div>

            {error ? (
              <p className="md:col-span-2 text-sm text-[var(--color-error)]">{error}</p>
            ) : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={pendingUpdate}>
                {pendingUpdate ? "Speichere..." : "Änderungen speichern"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "docs" ? (
        <section
          className="rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
          style={{
            borderColor: "var(--color-border-token)",
            boxShadow: "var(--shadow-card-token)",
          }}
        >
          <h2 className="mb-3 text-xl font-extrabold text-[var(--color-text)]">Dokumente</h2>
          {customer.contractFile ? (
            <div className="mb-4 flex flex-col gap-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                Hochgeladenes Angebot wird direkt angezeigt.
              </p>
              <div className="h-[520px] w-full overflow-hidden rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface-raised)]">
                <iframe
                  src={contractHref ?? undefined}
                  title="Angebot PDF Vorschau"
                  className="h-full w-full"
                />
              </div>
              <p className="text-xs text-[var(--color-text-subtle)]">
                Falls die Vorschau nicht lädt:{" "}
                <Link
                  href={contractHref ?? "#"}
                  target="_blank"
                  className="font-semibold text-[var(--color-primary)] underline"
                >
                  PDF in neuem Tab öffnen
                </Link>
              </p>
            </div>
          ) : (
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Noch kein Angebot hochgeladen.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => {
                handleSelectedFile(e.target.files?.[0] ?? null);
              }}
            />
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
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleSelectedFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
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
              <p className="text-center text-xs text-[var(--color-text-muted)]">
                {selectedFileName ?? "Noch keine Datei ausgewählt"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="contract-file-input-fallback"
                className="text-xs font-medium text-[var(--color-text-muted)]"
              >
                Fallback:
              </label>
              <input
                id="contract-file-input-fallback"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  handleSelectedFile(next);
                }}
                className="text-xs text-[var(--color-text-muted)]"
              />
            </div>
            <Button
              type="button"
              variant="default"
              onClick={handleContractUpload}
              disabled={uploadPending || !selectedFileName}
            >
              {uploadPending ? "Lädt hoch..." : "PDF hochladen"}
            </Button>
            {uploadError ? (
              <p className="text-sm text-[var(--color-error)]">{uploadError}</p>
            ) : null}
            {uploadSuccess ? (
              <p className="text-sm text-emerald-700">{uploadSuccess}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="border-[var(--color-border-token)] bg-[var(--color-surface)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Zahlungsplan neu generieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Durch diese Änderungen wird der aktuelle Zahlungsplan gelöscht und neu erstellt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!draftFormData) return;
                void submitUpdate(draftFormData);
              }}
            >
              Ja, neu generieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
