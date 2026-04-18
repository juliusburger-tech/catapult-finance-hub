/** Simplified tax reserve estimate (GbR) — display only, not tax advice. */

export type TaxConfigSnapshot = {
  hebesatz: number;
  estRatePartner1: number;
  estRatePartner2: number;
  profitSplitP1: number;
};

export type TaxReserveBreakdown = {
  gewerbesteuer: number;
  estPartner1: number;
  estPartner2: number;
  totalRecommended: number;
};

const STEUERMESSZAHL = 0.035;

export function estimateTaxReserve(
  profitYtd: number,
  config: TaxConfigSnapshot,
): TaxReserveBreakdown {
  const gewinnFuerGewSt = profitYtd;
  const gewerbesteuer =
    gewinnFuerGewSt * STEUERMESSZAHL * (config.hebesatz / 100);

  const split = config.profitSplitP1;
  const gewinnPartner1 = profitYtd * (split / 100);
  const gewinnPartner2 = profitYtd * ((100 - split) / 100);
  const estPartner1 = gewinnPartner1 * (config.estRatePartner1 / 100);
  const estPartner2 = gewinnPartner2 * (config.estRatePartner2 / 100);

  const totalRecommended = gewerbesteuer + estPartner1 + estPartner2;

  return {
    gewerbesteuer,
    estPartner1,
    estPartner2,
    totalRecommended,
  };
}
