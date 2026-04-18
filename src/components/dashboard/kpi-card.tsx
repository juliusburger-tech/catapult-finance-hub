type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius-card-token)] border bg-[var(--color-surface)] p-5"
      style={{
        borderColor: "var(--color-border-token)",
        boxShadow: "var(--shadow-card-token)",
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
        {value}
      </p>
      {hint ? (
        <p className="text-sm text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
