import { cn } from "@/lib/utils";

type PaymentModelBadgeProps = {
  model: string;
  className?: string;
};

const modelMap: Record<string, { label: string; style: string }> = {
  retainer: {
    label: "Retainer",
    style: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30",
  },
  installment: {
    label: "2 Raten",
    style: "bg-[#8b5cf6]/15 text-[#8b5cf6] border-[#8b5cf6]/30",
  },
  hybrid: {
    label: "Hybrid",
    style: "bg-[#ff6f16]/15 text-[#ff6f16] border-[#ff6f16]/30",
  },
  one_time: {
    label: "Einmalzahlung",
    style: "bg-[#14b8a6]/15 text-[#14b8a6] border-[#14b8a6]/30",
  },
};

export function PaymentModelBadge({ model, className }: PaymentModelBadgeProps) {
  const resolved = modelMap[model] ?? {
    label: model,
    style:
      "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border-token)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        resolved.style,
        className,
      )}
    >
      {resolved.label}
    </span>
  );
}
