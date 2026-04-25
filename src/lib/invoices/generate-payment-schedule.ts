import { addMonths, getMonth, getYear } from "date-fns";

type PaymentEntry = {
  dueMonth: number;
  dueYear: number;
  dueDay: number;
  amount: number;
  entryType: string;
};

export function generatePaymentSchedule(
  paymentModel: string,
  paymentConfig: string,
  paymentDay: number,
  contractStart: Date,
  contractEnd: Date,
): PaymentEntry[] {
  const config = JSON.parse(paymentConfig) as Record<string, number | boolean>;
  const entries: PaymentEntry[] = [];

  const makeEntry = (date: Date, amount: number, entryType: string): PaymentEntry => ({
    dueMonth: getMonth(date) + 1,
    dueYear: getYear(date),
    dueDay: paymentDay,
    amount: Math.round(amount * 100) / 100,
    entryType,
  });

  switch (paymentModel) {
    case "retainer": {
      let current = new Date(contractStart.getFullYear(), contractStart.getMonth(), 1);
      const end = new Date(contractEnd.getFullYear(), contractEnd.getMonth(), 1);
      while (current <= end) {
        entries.push(makeEntry(current, Number(config.monthlyAmount), "retainer"));
        current = addMonths(current, 1);
      }
      break;
    }

    case "installment": {
      const totalAmount = Number(config.totalAmount);
      const discountPercent = Number(config.discountPercent);
      const secondOffset = Number(config.secondInstallmentMonthOffset);
      const applyDiscount = Boolean(config.applyDiscount);
      const net = applyDiscount ? totalAmount * (1 - discountPercent / 100) : totalAmount;
      const rate = net / 2;

      entries.push(makeEntry(contractStart, rate, "installment_1"));
      const date2 = addMonths(contractStart, secondOffset);
      entries.push(makeEntry(date2, rate, "installment_2"));
      break;
    }

    case "hybrid": {
      entries.push(makeEntry(contractStart, Number(config.upfrontAmount), "upfront"));
      let retainerStart = addMonths(contractStart, Number(config.retainerStartMonthOffset));
      const retainerEnd = new Date(contractEnd.getFullYear(), contractEnd.getMonth(), 1);
      while (retainerStart <= retainerEnd) {
        entries.push(
          makeEntry(retainerStart, Number(config.monthlyRetainerAmount), "retainer"),
        );
        retainerStart = addMonths(retainerStart, 1);
      }
      break;
    }

    case "one_time": {
      const totalAmount = Number(config.totalAmount);
      const discountPercent = Number(config.discountPercent);
      const applyDiscount = Boolean(config.applyDiscount);
      const net = applyDiscount ? totalAmount * (1 - discountPercent / 100) : totalAmount;
      entries.push(makeEntry(contractStart, net, "one_time"));
      break;
    }

    default:
      break;
  }

  return entries;
}
