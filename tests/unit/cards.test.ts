import { installmentsElapsed, installmentsRemaining, isInstallmentActive, calcCardPayment } from '../../lib/cards';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${JSON.stringify(got)}${ok ? '' : ' (esperado ' + JSON.stringify(want) + ')'}`);
};
const now = new Date('2026-10-15T17:00:00Z'); // 15-oct-2026 mediodía Colombia
const p = (date: string, installments: number, installmentAmt = 100) => ({ date: date + 'T00:00:00.000Z', installments, installmentAmt });

eq('compra de este mes, 3 cuotas: transcurridas', installmentsElapsed(p('2026-10-03', 3), now), 0);
eq('  restantes', installmentsRemaining(p('2026-10-03', 3), now), 3);
eq('compra de hace 2 meses, 3 cuotas: restantes', installmentsRemaining(p('2026-08-20', 3), now), 1);
eq('compra de hace 3 meses, 3 cuotas: ya no activa', isInstallmentActive(p('2026-07-01', 3), now), false);
eq('compra de hace 1 año, 1 cuota: no activa', isInstallmentActive(p('2025-10-15', 1), now), false);
eq('cruza año: dic-2025 con 6 cuotas en oct-2026 → agotada', isInstallmentActive(p('2025-12-10', 6), now), false);
eq('cruza año: ago-2026 con 12 cuotas → transcurridas 2', installmentsElapsed(p('2026-08-01', 12), now), 2);
eq('compra futura no genera cuotas negativas', installmentsElapsed(p('2026-12-01', 3), now), 0);
eq('31-oct a las 20:30 COT (=01:30Z del 1-nov) sigue siendo octubre', installmentsElapsed(p('2026-10-01', 3), new Date('2026-11-01T01:30:00Z')), 0);

const card = (usedBalance: number, purchases: ReturnType<typeof p>[], interestRate = 2) => ({ usedBalance, interestRate, purchases });
let r = calcCardPayment(card(800_000, [p('2026-10-03', 4, 200_000)]), now);
eq('cuota 200.000 + interés 16.000', [r.cuotasMes, r.interesMes, r.minPayment], [200_000, 16_000, 216_000]);
r = calcCardPayment(card(50_000, [p('2026-10-03', 4, 200_000)]), now);
eq('el mínimo nunca supera lo que se debe (antes: 216.000 > 50.000)', r.minPayment, 50_000);
r = calcCardPayment(card(0, [p('2026-10-03', 4, 200_000)]), now);
eq('saldo 0 → mínimo 0', r.minPayment, 0);
r = calcCardPayment(card(1_000_000, [p('2025-01-01', 3, 300_000)]), now);
eq('compras terminadas ya no suman: mínimo = 5% del saldo + nada más', r.cuotasMes, 0);
r = calcCardPayment(card(1_000_000, [p('2026-09-01', 12, 80_000), p('2026-10-01', 6, 50_000), p('2025-01-01', 3, 999_999)]), now);
eq('mezcla: solo suman las vigentes (130.000 + interés 20.000)', [r.cuotasMes, r.minPayment], [130_000, 150_000]);

process.exit(fails ? 1 : 0);
