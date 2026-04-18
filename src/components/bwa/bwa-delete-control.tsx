"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteBwa } from "@/app/bwa/actions";
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

type BwaDeleteControlProps = {
  id: string;
  periodLabel: string;
};

export function BwaDeleteControl({ id, periodLabel }: BwaDeleteControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteBwa(id);
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
          className="text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
          aria-label={`BWA ${periodLabel} löschen`}
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md border-[var(--color-border-token)] bg-[var(--color-surface)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--color-text)]">
            BWA löschen?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--color-text-muted)]">
            Die BWA für {periodLabel} und die zugehörige PDF-Datei werden dauerhaft
            entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
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
            size="default"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Löschen…" : "Endgültig löschen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
