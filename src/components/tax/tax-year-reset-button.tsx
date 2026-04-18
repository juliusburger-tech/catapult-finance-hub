"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { archiveTaxYearPayments } from "@/app/steuern/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type TaxYearResetButtonProps = {
  year: number;
};

export function TaxYearResetButton({ year }: TaxYearResetButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await archiveTaxYearPayments(year);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="border-[var(--color-warning)] text-[var(--color-text)] hover:bg-amber-50">
          Jahres-Reset
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg border-[var(--color-border-token)] bg-[var(--color-surface)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--color-text)]">
            Jahres-Reset für {year}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--color-text-muted)]">
            Achtung: Dies archiviert alle aktiven Zahlungen für das Jahr {year}.
            Verwende dies, wenn du für ein neues Steuerjahr neu starten möchtest.
            Zahlungen erhalten den Status „archived“. Diese Aktion kann nicht
            rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-[var(--color-error)]" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Archiviere…" : "Alle Zahlungen archivieren"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
