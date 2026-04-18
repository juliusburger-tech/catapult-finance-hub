"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addTaxPayment } from "@/app/steuern/actions";
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
import {
  TAX_PAYMENT_TYPES,
  TAX_PAYMENT_TYPE_LABELS,
} from "@/lib/tax/payment-types";

type TaxPaymentDialogProps = {
  year: number;
};

function todayInputValue(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function TaxPaymentDialog({ year }: TaxPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await addTaxPayment(undefined, fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">Zahlung buchen</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-[var(--color-border-token)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-text)]">Zahlung erfassen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="year" value={year} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="tax-pay-date">Datum</Label>
            <Input
              id="tax-pay-date"
              name="date"
              type="date"
              required
              defaultValue={todayInputValue()}
              className="border-[var(--color-border-token)] bg-[var(--color-surface)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tax-pay-type">Art der Zahlung</Label>
            <select
              id="tax-pay-type"
              name="type"
              required
              className="flex h-9 w-full rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
            >
              {TAX_PAYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TAX_PAYMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tax-pay-amount">Betrag (EUR)</Label>
            <Input
              id="tax-pay-amount"
              name="amount"
              type="number"
              step="any"
              min={0}
              required
              placeholder="0"
              className="border-[var(--color-border-token)] bg-[var(--color-surface)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tax-pay-quarter">Quartal (optional)</Label>
            <select
              id="tax-pay-quarter"
              name="quarter"
              className="flex h-9 w-full rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
            >
              <option value="">Kein Quartal</option>
              <option value="1">Q1</option>
              <option value="2">Q2</option>
              <option value="3">Q3</option>
              <option value="4">Q4</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tax-pay-notes">Notiz</Label>
            <textarea
              id="tax-pay-notes"
              name="notes"
              rows={3}
              className="w-full resize-y rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm outline-none placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
              placeholder="Optional"
            />
          </div>

          {error ? (
            <p className="text-sm text-[var(--color-error)]" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : "Zahlung speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
