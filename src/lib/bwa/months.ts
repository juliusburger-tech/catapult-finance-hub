export const GERMAN_MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export function formatBwaPeriod(month: number, year: number): string {
  const label = GERMAN_MONTH_LABELS[month - 1];
  if (!label) {
    return `${month}/${year}`;
  }
  return `${label} ${year}`;
}
