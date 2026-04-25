import { ExternalLink, Download } from "lucide-react";

import { formatBwaPeriod } from "@/lib/bwa/months";
import { BwaDeleteControl } from "@/components/bwa/bwa-delete-control";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BwaEntriesTableProps = {
  entries: Array<{
    id: string;
    month: number;
    year: number;
    uploadedAt: Date;
    filename: string;
    openUrl: string;
    downloadUrl: string;
  }>;
};

export function BwaEntriesTable({ entries }: BwaEntriesTableProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[var(--radius-card-token)] border border-dashed border-[var(--color-border-token)] bg-[var(--color-surface-raised)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
        Noch keine BWAs vorhanden. Lade oben die erste PDF hoch.
      </p>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-container-token)] border bg-[var(--color-surface)]"
      style={{
        borderColor: "var(--color-border-token)",
        boxShadow: "var(--shadow-card-token)",
      }}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--color-border-token)] hover:bg-transparent">
            <TableHead className="text-[var(--color-text)]">Zeitraum</TableHead>
            <TableHead className="text-[var(--color-text)]">Upload</TableHead>
            <TableHead className="text-[var(--color-text)]">Dateiname</TableHead>
            <TableHead className="w-[1%] text-right text-[var(--color-text)]">
              Aktionen
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const period = formatBwaPeriod(entry.month, entry.year);
            const uploaded = entry.uploadedAt.toLocaleString("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            return (
              <TableRow
                key={entry.id}
                className="border-[var(--color-border-token)] hover:bg-[var(--color-surface-raised)]"
              >
                <TableCell className="font-medium text-[var(--color-text)]">
                  {period}
                </TableCell>
                <TableCell className="text-[var(--color-text-muted)]">
                  {uploaded}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-[var(--color-text-muted)] md:max-w-xs">
                  {entry.filename}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a
                        href={entry.openUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`PDF ${period} in neuem Tab öffnen`}
                      >
                        <ExternalLink className="size-4" strokeWidth={1.75} />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a
                        href={entry.downloadUrl}
                        download={entry.filename}
                        aria-label={`PDF ${period} herunterladen`}
                      >
                        <Download className="size-4" strokeWidth={1.75} />
                      </a>
                    </Button>
                    <BwaDeleteControl id={entry.id} periodLabel={period} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
