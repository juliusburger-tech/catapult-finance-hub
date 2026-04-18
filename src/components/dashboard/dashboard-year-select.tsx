"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type DashboardYearSelectProps = {
  years: number[];
  value: number;
};

export function DashboardYearSelect({ years, value }: DashboardYearSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const options = years.includes(value) ? years : [value, ...years];

  function onChange(nextYear: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", nextYear);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <span>Jahr</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[100px] rounded-md border border-[var(--color-border-token)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] shadow-sm outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 disabled:opacity-60"
      >
        {options.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
