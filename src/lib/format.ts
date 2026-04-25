const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const percentFormatter = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatEuro(value: number): string {
  return euroFormatter.format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}
