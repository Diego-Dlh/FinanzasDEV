// Financial formulas shared by the calculators (client-safe, no dependencies).
//
// Rates in Colombia are quoted as effective annual (E.A.). Dividing an E.A. rate by 12
// overstates the monthly rate, so loans and savings convert it first.

/** Parses a text input: null when empty or not a finite number (0 is a valid value). */
export function parseNum(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Monthly rate (as a fraction) equivalent to an effective annual rate given in %. */
export function monthlyRateFromEA(eaPercent: number): number {
  return Math.pow(1 + eaPercent / 100, 1 / 12) - 1;
}

/** Level monthly payment of a loan (French system). A 0% loan is just principal / months. */
export function loanPayment(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Value of a lump sum plus monthly contributions (paid at the end of each month).
 * `annualRatePercent` is a nominal annual rate compounded `periodsPerYear` times a year;
 * it is converted to the growth factor of one month, so contributions are not
 * mistaken for annual deposits when compounding is not monthly.
 */
export function compoundGrowth(input: {
  principal: number;
  annualRatePercent: number;
  periodsPerYear: number;
  monthlyContribution: number;
  years: number;
}) {
  const { principal, annualRatePercent, periodsPerYear, monthlyContribution, years } = input;
  const months = Math.round(years * 12);
  const monthlyGrowth = Math.pow(1 + annualRatePercent / 100 / periodsPerYear, periodsPerYear / 12);
  const growthOverTerm = Math.pow(monthlyGrowth, months);
  const annuity = Math.abs(monthlyGrowth - 1) < 1e-12 ? months : (growthOverTerm - 1) / (monthlyGrowth - 1);
  const total = principal * growthOverTerm + monthlyContribution * annuity;
  const contributed = principal + monthlyContribution * months;
  return { months, total, contributed, interest: total - contributed };
}

/**
 * Monthly deposit needed to reach `target` in `months`, given what is already saved.
 * The amount already saved also earns interest, so it is grown before subtracting.
 * Returns 0 when the current savings alone reach the target.
 */
export function monthlySavingsNeeded(target: number, current: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return Math.max(0, (target - current) / months);
  const factor = Math.pow(1 + monthlyRate, months);
  const missing = target - current * factor;
  if (missing <= 0) return 0;
  return (missing * monthlyRate) / (factor - 1);
}
