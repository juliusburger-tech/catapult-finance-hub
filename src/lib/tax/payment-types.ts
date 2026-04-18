export const TAX_PAYMENT_TYPES = [
  "gewerbesteuer_va",
  "est_va",
  "est_final",
  "other",
] as const;

export type TaxPaymentType = (typeof TAX_PAYMENT_TYPES)[number];

export const TAX_PAYMENT_TYPE_LABELS: Record<TaxPaymentType, string> = {
  gewerbesteuer_va: "Gewerbesteuer-VA",
  est_va: "ESt-Vorauszahlung",
  est_final: "Einkommensteuer-Abschlusszahlung",
  other: "Sonstiges",
};

export function isTaxPaymentType(value: string): value is TaxPaymentType {
  return (TAX_PAYMENT_TYPES as readonly string[]).includes(value);
}

export function formatTaxPaymentType(type: string): string {
  if (isTaxPaymentType(type)) {
    return TAX_PAYMENT_TYPE_LABELS[type];
  }
  return type;
}
