import { monthlyRateFromEA, loanPayment, compoundGrowth, monthlySavingsNeeded, parseNum } from '../../lib/finance-math';

let fails = 0;
const near = (name: string, got: number, want: number, tol = 0.01) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${got.toFixed(4)}${ok ? '' : ` (esperado ${want})`}`);
};
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (esperado ${JSON.stringify(want)})`}`);
};

// Month-by-month simulations: independent of the closed formulas
const simulateGrowth = (p: number, monthlyGrowth: number, c: number, months: number) => { let b = p; for (let i = 0; i < months; i++) b = b * monthlyGrowth + c; return b; };
const simulateLoan = (P: number, i: number, pay: number, n: number) => { let b = P; for (let k = 0; k < n; k++) b = b * (1 + i) - pay; return b; };

console.log('== tasa efectiva anual → mensual');
near('E.A. 12,6825% equivale a 1% mensual', monthlyRateFromEA(12.6825030131969) * 100, 1, 1e-6);
near('E.A. 0% → 0', monthlyRateFromEA(0), 0, 1e-12);
near('el viejo /12 sobrestimaba: 24% E.A. → 1,8088% mensual (no 2%)', monthlyRateFromEA(24) * 100, 1.8088, 1e-3);

console.log('\n== cuota de préstamo');
near('1.000.000 al 1% mensual, 12 cuotas = 88.848,79', loanPayment(1_000_000, 0.01, 12), 88_848.79);
near('tasa 0%: capital / cuotas', loanPayment(1_200_000, 0, 12), 100_000, 1e-9);
{
  const i = monthlyRateFromEA(18), pay = loanPayment(20_000_000, i, 36);
  near('20M al 18% E.A. a 36 meses: la deuda llega a 0 simulando mes a mes', simulateLoan(20_000_000, i, pay, 36), 0, 1e-4);
  const oldPay = loanPayment(20_000_000, 0.18 / 12, 36);
  console.log(`  (cuota correcta ${pay.toFixed(0)} vs. la del cálculo anterior ${oldPay.toFixed(0)}: diferencia ${(oldPay - pay).toFixed(0)}/mes)`);
}

console.log('\n== interés compuesto con aportes');
let g = compoundGrowth({ principal: 1_000_000, annualRatePercent: 12, periodsPerYear: 12, monthlyContribution: 0, years: 1 });
near('1.000.000 al 12% nominal mensual, 1 año', g.total, 1_126_825.03);
g = compoundGrowth({ principal: 1_000_000, annualRatePercent: 12, periodsPerYear: 12, monthlyContribution: 100_000, years: 1 });
near('+100.000/mes: total', g.total, 2_395_075.33);
near('  capital aportado', g.contributed, 2_200_000, 1e-9);
near('  intereses', g.interest, 195_075.33);
for (const n of [1, 2, 4, 12, 365]) {
  const r = compoundGrowth({ principal: 500_000, annualRatePercent: 10, periodsPerYear: n, monthlyContribution: 200_000, years: 5 });
  const sim = simulateGrowth(500_000, Math.pow(1 + 0.10 / n, n / 12), 200_000, 60);
  near(`capitalización ${String(n).padStart(3)}/año: coincide con la simulación`, r.total, sim, 1e-4);
  if (r.interest <= 0) { fails++; console.log(`✗ intereses negativos con n=${n}: ${r.interest}`); }
}
{
  const r = compoundGrowth({ principal: 0, annualRatePercent: 0, periodsPerYear: 12, monthlyContribution: 150_000, years: 2 });
  near('tasa 0% y sin capital inicial, solo aportes (24 × 150.000)', r.total, 3_600_000, 1e-9);
  near('  intereses 0', r.interest, 0, 1e-9);
}
{
  const r = compoundGrowth({ principal: 1_000_000, annualRatePercent: 8, periodsPerYear: 1, monthlyContribution: 0, years: 10.5 });
  eq('años fraccionarios: 10,5 años = 126 meses', r.months, 126);
}

console.log('\n== meta de ahorro');
near('sin tasa: 12.000.000 en 12 meses = 1.000.000/mes', monthlySavingsNeeded(12_000_000, 0, 0, 12), 1_000_000, 1e-9);
near('sin tasa y con 2.000.000 ahorrados: 10.000.000/12', monthlySavingsNeeded(12_000_000, 2_000_000, 0, 12), 10_000_000 / 12, 1e-6);
{
  const i = monthlyRateFromEA(6), c = monthlySavingsNeeded(10_000_000, 3_000_000, i, 24);
  near('con 6% E.A. y 3M ya ahorrados: simulando llega justo a la meta', simulateGrowth(3_000_000, 1 + i, c, 24), 10_000_000, 1e-3);
  const old = (7_000_000 * (0.06 / 12)) / (Math.pow(1 + 0.06 / 12, 24) - 1);
  console.log(`  (depósito correcto ${c.toFixed(0)} vs. el cálculo anterior ${old.toFixed(0)}: pedía ${(old - c).toFixed(0)} de más al mes)`);
}
near('si lo ahorrado ya crece hasta la meta → 0', monthlySavingsNeeded(10_000_000, 9_800_000, monthlyRateFromEA(12), 24), 0, 1e-9);
near('meta ya alcanzada → 0', monthlySavingsNeeded(5_000_000, 6_000_000, 0, 12), 0, 1e-9);

console.log('\n== parseNum');
eq('vacío', parseNum(''), null);
eq('espacios', parseNum('   '), null);
eq('cero es válido', parseNum('0'), 0);
eq('decimal', parseNum('12.5'), 12.5);
eq('texto', parseNum('abc'), null);
eq('infinito', parseNum('1e999'), null);

process.exit(fails ? 1 : 0);
