/** Next quarterly advance payment due date (10th of Mar, Jun, Sep, Dec). */

const DUE_MONTH_DAY = [
  { month: 3, day: 10 },
  { month: 6, day: 10 },
  { month: 9, day: 10 },
  { month: 12, day: 10 },
] as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getNextAdvanceDueDate(from: Date = new Date()): Date {
  const today = startOfDay(from);
  const startYear = today.getFullYear();

  for (let y = startYear; y <= startYear + 1; y += 1) {
    for (const { month, day } of DUE_MONTH_DAY) {
      const candidate = startOfDay(new Date(y, month - 1, day));
      if (candidate >= today) {
        return candidate;
      }
    }
  }

  return startOfDay(new Date(startYear + 1, 2, 10));
}
