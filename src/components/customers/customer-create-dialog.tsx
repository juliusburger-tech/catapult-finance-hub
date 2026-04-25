"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { createCustomer } from "@/app/kunden/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/format";

type Step = 1 | 2 | 3 | 4;

type FormState = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: "active" | "planned" | "completed";
  notes: string;
  contractStart: string;
  contractEnd: string;
  paymentModel: "retainer" | "installment" | "hybrid" | "one_time";
  retainerMonthlyAmount: string;
  installmentTotalAmount: string;
  installmentApplyDiscount: boolean;
  installmentDiscountPercent: string;
  installmentSecondOffset: string;
  hybridUpfrontAmount: string;
  hybridRetainerStartOffset: string;
  hybridMonthlyRetainerAmount: string;
  oneTimeTotalAmount: string;
  oneTimeApplyDiscount: boolean;
  oneTimeDiscountPercent: string;
  paymentDay: "1" | "15" | "30";
  paymentMethod: "sepa" | "transfer";
  contractSigned: boolean;
};

const INITIAL_STATE: FormState = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  status: "active",
  notes: "",
  contractStart: "",
  contractEnd: "",
  paymentModel: "retainer",
  retainerMonthlyAmount: "",
  installmentTotalAmount: "",
  installmentApplyDiscount: true,
  installmentDiscountPercent: "5",
  installmentSecondOffset: "3",
  hybridUpfrontAmount: "",
  hybridRetainerStartOffset: "6",
  hybridMonthlyRetainerAmount: "",
  oneTimeTotalAmount: "",
  oneTimeApplyDiscount: true,
  oneTimeDiscountPercent: "10",
  paymentDay: "1",
  paymentMethod: "sepa",
  contractSigned: false,
};

function toPaymentConfig(state: FormState): string {
  switch (state.paymentModel) {
    case "retainer":
      return JSON.stringify({ monthlyAmount: Number(state.retainerMonthlyAmount || 0) });
    case "installment":
      return JSON.stringify({
        totalAmount: Number(state.installmentTotalAmount || 0),
        applyDiscount: state.installmentApplyDiscount,
        discountPercent: Number(state.installmentDiscountPercent || 0),
        secondInstallmentMonthOffset: Number(state.installmentSecondOffset || 0),
      });
    case "hybrid":
      return JSON.stringify({
        upfrontAmount: Number(state.hybridUpfrontAmount || 0),
        retainerStartMonthOffset: Number(state.hybridRetainerStartOffset || 0),
        monthlyRetainerAmount: Number(state.hybridMonthlyRetainerAmount || 0),
      });
    case "one_time":
      return JSON.stringify({
        totalAmount: Number(state.oneTimeTotalAmount || 0),
        applyDiscount: state.oneTimeApplyDiscount,
        discountPercent: Number(state.oneTimeDiscountPercent || 0),
      });
  }
}

export function CustomerCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const installmentPreview = useMemo(() => {
    const total = Number(state.installmentTotalAmount || 0);
    const discount = Number(state.installmentDiscountPercent || 0);
    const net = state.installmentApplyDiscount ? total * (1 - discount / 100) : total;
    return {
      net,
      rate: net / 2,
    };
  }, [state.installmentTotalAmount, state.installmentDiscountPercent, state.installmentApplyDiscount]);

  const oneTimePreview = useMemo(() => {
    const total = Number(state.oneTimeTotalAmount || 0);
    const discount = Number(state.oneTimeDiscountPercent || 0);
    return state.oneTimeApplyDiscount ? total * (1 - discount / 100) : total;
  }, [state.oneTimeApplyDiscount, state.oneTimeDiscountPercent, state.oneTimeTotalAmount]);

  function resetForm() {
    setStep(1);
    setState(INITIAL_STATE);
    setError(null);
  }

  function closeDialog(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  function nextStep() {
    setStep((current) => (current < 4 ? ((current + 1) as Step) : current));
  }

  function prevStep() {
    setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
  }

  function isStepValid(currentStep: Step): boolean {
    if (currentStep === 1) {
      return state.name.trim() !== "";
    }
    if (currentStep === 2) {
      return state.contractStart !== "" && state.contractEnd !== "";
    }
    if (currentStep === 3) {
      if (state.paymentModel === "retainer") return Number(state.retainerMonthlyAmount) > 0;
      if (state.paymentModel === "installment") return Number(state.installmentTotalAmount) > 0;
      if (state.paymentModel === "hybrid") {
        return (
          Number(state.hybridUpfrontAmount) > 0 &&
          Number(state.hybridRetainerStartOffset) >= 0 &&
          Number(state.hybridMonthlyRetainerAmount) > 0
        );
      }
      return Number(state.oneTimeTotalAmount) > 0;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("name", state.name);
    formData.set("contactPerson", state.contactPerson);
    formData.set("email", state.email);
    formData.set("phone", state.phone);
    formData.set("status", state.status);
    formData.set("notes", state.notes);
    formData.set("contractStart", state.contractStart);
    formData.set("contractEnd", state.contractEnd);
    formData.set("paymentModel", state.paymentModel);
    formData.set("paymentConfig", toPaymentConfig(state));
    formData.set("paymentDay", state.paymentDay);
    formData.set("paymentMethod", state.paymentMethod);
    if (state.contractSigned) formData.set("contractSigned", "on");

    startTransition(async () => {
      const result = await createCustomer(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeDialog(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTrigger asChild>
        <Button>Neuer Kunde</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-[var(--color-border-token)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-text)]">Neuen Kunden anlegen</DialogTitle>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
            {[1, 2, 3, 4].map((dot) => (
              <span
                key={dot}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                  dot === step
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border-token)] text-[var(--color-text-subtle)]"
                }`}
              >
                {dot}
              </span>
            ))}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kundenname*" htmlFor="customer-name">
                <Input
                  id="customer-name"
                  value={state.name}
                  onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                />
              </Field>
              <Field label="Ansprechpartner" htmlFor="customer-contact">
                <Input
                  id="customer-contact"
                  value={state.contactPerson}
                  onChange={(e) => setState((s) => ({ ...s, contactPerson: e.target.value }))}
                />
              </Field>
              <Field label="E-Mail" htmlFor="customer-email">
                <Input
                  id="customer-email"
                  type="email"
                  value={state.email}
                  onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
                />
              </Field>
              <Field label="Telefon" htmlFor="customer-phone">
                <Input
                  id="customer-phone"
                  value={state.phone}
                  onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
                />
              </Field>
              <Field label="Status*" htmlFor="customer-status">
                <select
                  id="customer-status"
                  value={state.status}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      status: e.target.value as FormState["status"],
                    }))
                  }
                  className="h-8 rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface)] px-2.5 text-sm"
                >
                  <option value="active">In Betreuung</option>
                  <option value="planned">Geplant</option>
                  <option value="completed">Abgeschlossen</option>
                </select>
              </Field>
              <Field label="Notizen" htmlFor="customer-notes">
                <textarea
                  id="customer-notes"
                  rows={3}
                  value={state.notes}
                  onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface)] px-2.5 py-2 text-sm"
                />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Vertragsbeginn*" htmlFor="contract-start">
                <Input
                  id="contract-start"
                  type="date"
                  value={state.contractStart}
                  onChange={(e) => setState((s) => ({ ...s, contractStart: e.target.value }))}
                />
              </Field>
              <Field label="Vertragsende*" htmlFor="contract-end">
                <Input
                  id="contract-end"
                  type="date"
                  value={state.contractEnd}
                  onChange={(e) => setState((s) => ({ ...s, contractEnd: e.target.value }))}
                />
              </Field>
              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">Zahlungsmodell*</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <PaymentModelCard
                    active={state.paymentModel === "retainer"}
                    title="Retainer"
                    description="Monatlich gleichbleibend"
                    onClick={() => setState((s) => ({ ...s, paymentModel: "retainer" }))}
                  />
                  <PaymentModelCard
                    active={state.paymentModel === "installment"}
                    title="2 Raten"
                    description="Aufgeteilt mit optionalem Skonto"
                    onClick={() => setState((s) => ({ ...s, paymentModel: "installment" }))}
                  />
                  <PaymentModelCard
                    active={state.paymentModel === "hybrid"}
                    title="Hybrid"
                    description="Upfront + verzögerter Retainer"
                    onClick={() => setState((s) => ({ ...s, paymentModel: "hybrid" }))}
                  />
                  <PaymentModelCard
                    active={state.paymentModel === "one_time"}
                    title="Einmalzahlung"
                    description="Komplett auf einmal mit optionalem Skonto"
                    onClick={() => setState((s) => ({ ...s, paymentModel: "one_time" }))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {state.paymentModel === "retainer" ? (
                <Field label="Monatlicher Betrag* (EUR)" htmlFor="retainer-amount">
                  <Input
                    id="retainer-amount"
                    type="number"
                    min={0}
                    step="any"
                    value={state.retainerMonthlyAmount}
                    onChange={(e) =>
                      setState((s) => ({ ...s, retainerMonthlyAmount: e.target.value }))
                    }
                  />
                </Field>
              ) : null}

              {state.paymentModel === "installment" ? (
                <>
                  <Field label="Gesamtbetrag* (EUR)" htmlFor="installment-total">
                    <Input
                      id="installment-total"
                      type="number"
                      min={0}
                      step="any"
                      value={state.installmentTotalAmount}
                      onChange={(e) =>
                        setState((s) => ({ ...s, installmentTotalAmount: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Skonto anwenden?" htmlFor="installment-discount-toggle">
                    <input
                      id="installment-discount-toggle"
                      type="checkbox"
                      checked={state.installmentApplyDiscount}
                      onChange={(e) =>
                        setState((s) => ({ ...s, installmentApplyDiscount: e.target.checked }))
                      }
                      className="size-4"
                    />
                  </Field>
                  {state.installmentApplyDiscount ? (
                    <Field label="Skonto-Prozentsatz (%)" htmlFor="installment-discount-percent">
                      <Input
                        id="installment-discount-percent"
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={state.installmentDiscountPercent}
                        onChange={(e) =>
                          setState((s) => ({ ...s, installmentDiscountPercent: e.target.value }))
                        }
                      />
                    </Field>
                  ) : null}
                  <Field label="Fälligkeit Rate 2 (Monate nach Start)*" htmlFor="installment-offset">
                    <Input
                      id="installment-offset"
                      type="number"
                      min={0}
                      step={1}
                      value={state.installmentSecondOffset}
                      onChange={(e) =>
                        setState((s) => ({ ...s, installmentSecondOffset: e.target.value }))
                      }
                    />
                  </Field>
                  <div className="md:col-span-2 rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text)]">
                    <p>Fälliger Nettobetrag: {formatEuro(installmentPreview.net)}</p>
                    <p>Rate 1: {formatEuro(installmentPreview.rate)} - fällig im Startmonat</p>
                    <p>
                      Rate 2: {formatEuro(installmentPreview.rate)} - fällig nach{" "}
                      {state.installmentSecondOffset || "0"} Monaten
                    </p>
                  </div>
                </>
              ) : null}

              {state.paymentModel === "hybrid" ? (
                <>
                  <Field label="Upfront-Betrag* (EUR)" htmlFor="hybrid-upfront">
                    <Input
                      id="hybrid-upfront"
                      type="number"
                      min={0}
                      step="any"
                      value={state.hybridUpfrontAmount}
                      onChange={(e) =>
                        setState((s) => ({ ...s, hybridUpfrontAmount: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Retainer startet nach X Monaten*" htmlFor="hybrid-offset">
                    <Input
                      id="hybrid-offset"
                      type="number"
                      min={0}
                      step={1}
                      value={state.hybridRetainerStartOffset}
                      onChange={(e) =>
                        setState((s) => ({ ...s, hybridRetainerStartOffset: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Monatlicher Retainer-Betrag* (EUR)" htmlFor="hybrid-retainer-monthly">
                    <Input
                      id="hybrid-retainer-monthly"
                      type="number"
                      min={0}
                      step="any"
                      value={state.hybridMonthlyRetainerAmount}
                      onChange={(e) =>
                        setState((s) => ({ ...s, hybridMonthlyRetainerAmount: e.target.value }))
                      }
                    />
                  </Field>
                  <div className="md:col-span-2 rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text)]">
                    Vorschau: Monat 1: {formatEuro(Number(state.hybridUpfrontAmount || 0))} Upfront
                    · Ab Monat {Number(state.hybridRetainerStartOffset || 0) + 1}:{" "}
                    {formatEuro(Number(state.hybridMonthlyRetainerAmount || 0))}/Monat
                  </div>
                </>
              ) : null}

              {state.paymentModel === "one_time" ? (
                <>
                  <Field label="Gesamtbetrag* (EUR)" htmlFor="one-time-total">
                    <Input
                      id="one-time-total"
                      type="number"
                      min={0}
                      step="any"
                      value={state.oneTimeTotalAmount}
                      onChange={(e) =>
                        setState((s) => ({ ...s, oneTimeTotalAmount: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Skonto anwenden?" htmlFor="one-time-discount-toggle">
                    <input
                      id="one-time-discount-toggle"
                      type="checkbox"
                      checked={state.oneTimeApplyDiscount}
                      onChange={(e) =>
                        setState((s) => ({ ...s, oneTimeApplyDiscount: e.target.checked }))
                      }
                      className="size-4"
                    />
                  </Field>
                  {state.oneTimeApplyDiscount ? (
                    <Field label="Skonto-Prozentsatz (%)" htmlFor="one-time-discount-percent">
                      <Input
                        id="one-time-discount-percent"
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={state.oneTimeDiscountPercent}
                        onChange={(e) =>
                          setState((s) => ({ ...s, oneTimeDiscountPercent: e.target.value }))
                        }
                      />
                    </Field>
                  ) : null}
                  <div className="md:col-span-2 rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text)]">
                    Zu zahlender Betrag: {formatEuro(oneTimePreview)}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Zahlungstag*" htmlFor="payment-day">
                <div id="payment-day" className="flex gap-2">
                  {(["1", "15", "30"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={state.paymentDay === value ? "default" : "outline"}
                      onClick={() => setState((s) => ({ ...s, paymentDay: value }))}
                    >
                      {value}.
                    </Button>
                  ))}
                </div>
              </Field>
              <Field label="Zahlungsart*" htmlFor="payment-method">
                <div id="payment-method" className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={state.paymentMethod === "sepa" ? "default" : "outline"}
                    onClick={() => setState((s) => ({ ...s, paymentMethod: "sepa" }))}
                  >
                    SEPA Lastschrift
                  </Button>
                  <Button
                    type="button"
                    variant={state.paymentMethod === "transfer" ? "default" : "outline"}
                    onClick={() => setState((s) => ({ ...s, paymentMethod: "transfer" }))}
                  >
                    Überweisung
                  </Button>
                </div>
              </Field>
              <Field label="Angebot unterschrieben" htmlFor="contract-signed">
                <input
                  id="contract-signed"
                  type="checkbox"
                  checked={state.contractSigned}
                  onChange={(e) =>
                    setState((s) => ({ ...s, contractSigned: e.target.checked }))
                  }
                  className="size-4"
                />
              </Field>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-[var(--color-error)]" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
              Abbrechen
            </Button>
            <div className="flex items-center gap-2">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Zurück
                </Button>
              ) : null}
              {step < 4 ? (
                <Button type="button" onClick={nextStep} disabled={!isStepValid(step)}>
                  Weiter
                </Button>
              ) : (
                <Button type="submit" disabled={pending || !isStepValid(3)}>
                  {pending ? "Speichern..." : "Speichern"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function PaymentModelCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-[var(--color-border-token)]"
      }`}
    >
      <p className="font-semibold text-[var(--color-text)]">{title}</p>
      <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
    </button>
  );
}
