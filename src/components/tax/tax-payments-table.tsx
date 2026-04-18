import type { TaxPayment } from "@prisma/client";

import { formatEuro } from "@/lib/format";
import { formatTaxPaymentType } from "@/lib/tax/payment-types";
import { TaxPaymentArchiveButton } from "@/components/tax/tax-payment-archive-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TaxPaymentsTableProps = {
  payments: TaxPayment[];
};

function formatQuarter(q: number | null): string {
  if (q === null || q === undefined) {
    return "—";
  }
  return `Q${q}`;
}

export function TaxPaymentsTable({ payments }: TaxPaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <p className="rounded-[var(--radius-card-token)] border border-dashed border-[var(--color-border-token)] bg-[var(--color-surface-raised)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
        Noch keine Zahlungen für dieses Jahr erfasst.
      </p>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-container-token)] border bg-[var(--color-surface)]"
      style={{
        borderColor: "var(--color-border-token)",
        boxShadow: "var(--shadow-card-token)",
      }}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--color-border-token)] hover:bg-transparent">
            <TableHead className="text-[var(--color-text)]">Datum</TableHead>
            <TableHead className="text-[var(--color-text)]">Art</TableHead>
            <TableHead className="text-right text-[var(--color-text)]">Betrag</TableHead>
            <TableHead className="text-[var(--color-text)]">Quartal</TableHead>
            <TableHead className="text-[var(--color-text)]">Notiz</TableHead>
            <TableHead className="w-[72px] text-right text-[var(--color-text)]">
              Aktionen
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => {
            const dateLabel = p.date.toLocaleDateString("de-DE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
            <TableRow
              key={p.id}
              className="border-[var(--color-border-token)] hover:bg-[var(--color-surface-raised)]"
            >
              <TableCell className="whitespace-nowrap text-[var(--color-text)]">
                {dateLabel}
              </TableCell>
              <TableCell className="text-[var(--color-text-muted)]">
                {formatTaxPaymentType(p.type)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-[var(--color-text)]">
                {formatEuro(p.amount)}
              </TableCell>
              <TableCell className="text-[var(--color-text-muted)]">
                {formatQuarter(p.quarter)}
              </TableCell>
              <TableCell className="max-w-[220px] truncate text-[var(--color-text-muted)]">
                {p.notes ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <TaxPaymentArchiveButton
                  paymentId={p.id}
                  amount={p.amount}
                  dateLabel={dateLabel}
                  typeLabel={formatTaxPaymentType(p.type)}
                />
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
