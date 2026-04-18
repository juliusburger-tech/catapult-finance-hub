"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

import { archiveTaxPayment } from "@/app/steuern/actions";
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
import { formatEuro } from "@/lib/format";

type TaxPaymentArchiveButtonProps = {
  paymentId: string;
  amount: number;
  typeLabel: string;
  dateLabel: string;
};

export function TaxPaymentArchiveButton({
  paymentId,
  amount,
  typeLabel,
  dateLabel,
}: TaxPaymentArchiveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await archiveTaxPayment(paymentId);
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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          aria-label="Zahlung archivieren"
        >
          <Archive className="size-4" strokeWidth={1.75} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md border-[var(--color-border-token)] bg-[var(--color-surface)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--color-text)]">
            Zahlung archivieren?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--color-text-muted)]">
            {dateLabel} · {typeLabel} · {formatEuro(amount)} wird aus der aktiven
            Historie genommen und als „archived“ geführt. Die Summe „Gezahlt YTD“
            passt sich danach an.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-[var(--color-error)]" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
          <Button type="button" variant="outline" disabled={pending} onClick={handleConfirm}>
            {pending ? "Archiviere…" : "Archivieren"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
