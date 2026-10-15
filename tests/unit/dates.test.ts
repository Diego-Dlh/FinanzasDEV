import * as D from '../../lib/dates';
let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (esperado ${JSON.stringify(want)})`}`);
};
// 31 oct 2026, 20:30 hora Colombia = 1 nov 01:30 UTC
const lateNight = new Date('2026-11-01T01:30:00Z');
eq('todayISO a las 20:30 COT el 31-oct', D.todayISO(lateNight), '2026-10-31');
eq('currentMonthISO a esa hora', D.currentMonthISO(lateNight), '2026-10');
eq('startOfCurrentMonthInstant', D.startOfCurrentMonthInstant(lateNight).toISOString(), '2026-10-01T05:00:00.000Z');
eq('fmtDate de 2026-10-15 (guardado UTC)', D.fmtDate('2026-10-15T00:00:00.000Z'), D.fmtDate(new Date(Date.UTC(2026, 9, 15))));
eq('fmtDate día correcto', D.fmtDate('2026-10-15T00:00:00.000Z', { day: 'numeric' }), '15');
eq('addDaysISO cruza mes', D.addDaysISO('2026-10-31', 1), '2026-11-01');
eq('addDaysISO negativo cruza año', D.addDaysISO('2026-01-01', -1), '2025-12-31');
eq('addMonthsISO cruza año', D.addMonthsISO('2026-12', 1), '2027-01');
eq('addMonthsISO negativo', D.addMonthsISO('2026-01', -1), '2025-12');
const r = D.monthRangeUTC('2026-02');
eq('monthRangeUTC feb', [r.start.toISOString(), r.end.toISOString()], ['2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z']);
eq('toDateInput', D.toDateInput('2026-10-15T00:00:00.000Z'), '2026-10-15');
process.exit(fails ? 1 : 0);
