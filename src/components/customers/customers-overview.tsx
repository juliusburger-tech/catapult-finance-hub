"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteCustomer } from "@/app/kunden/actions";
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
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog";
import { CustomerImportDialog } from "@/components/customers/customer-import-dialog";
import { formatEuro } from "@/lib/format";

type CustomerRow = {
  id: string;
  name: string;
  status: "active" | "completed" | "planned";
  paymentModel: string;
  contractStart: string;
  contractEnd: string;
  totalVolume: number;
  nextPayment: string;
};

type CustomersOverviewProps = {
  customers: CustomerRow[];
};

const statusFilters = [
  { value: "all", label: "Alle" },
  { value: "active", label: "In Betreuung" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "planned", label: "Geplant" },
] as const;

const modelFilters = [
  { value: "all", label: "Alle" },
  { value: "retainer", label: "Retainer" },
  { value: "installment", label: "2 Raten" },
  { value: "hybrid", label: "Hybrid" },
  { value: "one_time", label: "Einmalzahlung" },
] as const;

export function CustomersOverview({ customers }: CustomersOverviewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]["value"]>("all");
  const [modelFilter, setModelFilter] = useState<(typeof modelFilters)[number]["value"]>("all");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch =
        searchLower === "" || customer.name.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const matchesModel = modelFilter === "all" || customer.paymentModel === modelFilter;
      return matchesSearch && matchesStatus && matchesModel;
    });
  }, [customers, modelFilter, search, statusFilter]);

  async function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCustomer(id);
      if (!result.ok) return;
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
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-wide text-[var(--color-text-subtle)]">
              Suche
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name suchen..."
              className="h-9 max-w-sm rounded-lg border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === item.value ? "default" : "outline"}
                  onClick={() => setStatusFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {modelFilters.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={modelFilter === item.value ? "default" : "outline"}
                  onClick={() => setModelFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CustomerImportDialog />
          <CustomerCreateDialog />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-token)] text-left text-[var(--color-text-subtle)]">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Zahlungsmodell</th>
              <th className="pb-3 pr-4 font-medium">Vertrag</th>
              <th className="pb-3 pr-4 font-medium">Gesamtvolumen</th>
              <th className="pb-3 pr-4 font-medium">Nächste Zahlung</th>
              <th className="pb-3 pr-4 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer) => (
              <tr key={customer.id} className="border-b border-[var(--color-border-token)]">
                <td className="py-3 pr-4">
                  <Link
                    href={`/kunden/${customer.id}`}
                    className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={customer.status} />
                </td>
                <td className="py-3 pr-4">
                  <PaymentModelBadge model={customer.paymentModel} />
                </td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                  {customer.contractStart} - {customer.contractEnd}
                </td>
                <td className="py-3 pr-4 font-semibold text-[var(--color-text)]">
                  {formatEuro(customer.totalVolume)}
                </td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{customer.nextPayment}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/kunden/${customer.id}`}>Details</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" disabled={pending}>
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
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete(customer.id)}
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-sm text-[var(--color-text-muted)]"
                >
                  Keine Kunden für die aktuelle Filterung gefunden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: CustomerRow["status"] }) {
  const map: Record<CustomerRow["status"], { label: string; style: string }> = {
    active: {
      label: "In Betreuung",
      style: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    completed: {
      label: "Abgeschlossen",
      style: "bg-slate-100 text-slate-700 border-slate-200",
    },
    planned: {
      label: "Geplant",
      style: "bg-amber-100 text-amber-700 border-amber-200",
    },
  };
  const resolved = map[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${resolved.style}`}
    >
      {resolved.label}
    </span>
  );
}
