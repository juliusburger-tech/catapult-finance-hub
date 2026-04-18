"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveTaxConfig, type TaxActionResult } from "@/app/steuern/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaxConfigSnapshot } from "@/lib/tax/estimate-reserve";

type TaxConfigFormProps = {
  year: number;
  initial: TaxConfigSnapshot;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Speichern…" : "Einstellungen speichern"}
    </Button>
  );
}

export function TaxConfigForm({ year, initial }: TaxConfigFormProps) {
  const [state, formAction] = useActionState(
    saveTaxConfig,
    undefined as TaxActionResult | undefined,
  );

  const formKey = `${year}-${initial.hebesatz}-${initial.estRatePartner1}-${initial.estRatePartner2}-${initial.profitSplitP1}`;

  return (
    <details className="group rounded-[var(--radius-container-token)] border border-[var(--color-border-token)] bg-[var(--color-surface)] shadow-[var(--shadow-card-token)]">
      <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[var(--color-text)] marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="text-[var(--color-primary)]">Einstellungen</span>
        <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
          (Hebesatz, ESt-Sätze, Gewinnverteilung)
        </span>
      </summary>
      <div className="border-t border-[var(--color-border-token)] px-5 py-5">
        <form key={formKey} action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="year" value={year} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`hebesatz-${year}`}>Gewerbesteuer-Hebesatz</Label>
              <Input
                id={`hebesatz-${year}`}
                name="hebesatz"
                type="number"
                step="1"
                min={1}
                max={999}
                required
                defaultValue={initial.hebesatz}
                className="border-[var(--color-border-token)] bg-[var(--color-surface)]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`split-${year}`}>
                Gewinnverteilung Gesellschafter 1 (%)
              </Label>
              <Input
                id={`split-${year}`}
                name="profitSplitP1"
                type="number"
                step="0.1"
                min={0}
                max={100}
                required
                defaultValue={initial.profitSplitP1}
                className="border-[var(--color-border-token)] bg-[var(--color-surface)]"
              />
              <p className="text-xs text-[var(--color-text-subtle)]">
                Gesellschafter 2: Restanteil (100 % abzüglich Wert oben).
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`est1-${year}`}>
                Geschätzter ESt-Satz Gesellschafter 1 (%)
              </Label>
              <Input
                id={`est1-${year}`}
                name="estRatePartner1"
                type="number"
                step="0.1"
                min={0}
                max={100}
                required
                defaultValue={initial.estRatePartner1}
                className="border-[var(--color-border-token)] bg-[var(--color-surface)]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`est2-${year}`}>
                Geschätzter ESt-Satz Gesellschafter 2 (%)
              </Label>
              <Input
                id={`est2-${year}`}
                name="estRatePartner2"
                type="number"
                step="0.1"
                min={0}
                max={100}
                required
                defaultValue={initial.estRatePartner2}
                className="border-[var(--color-border-token)] bg-[var(--color-surface)]"
              />
            </div>
          </div>

          {state && !state.ok ? (
            <p className="text-sm text-[var(--color-error)]" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </div>
    </details>
  );
}
