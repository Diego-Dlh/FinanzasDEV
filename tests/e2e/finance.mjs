// Finance: card purchases as spending, budgets, net worth, health score, alerts, reconciliation (audit phase 5)
import { API as B, ADMIN_EMAIL, ADMIN_PASSWORD, ensureSeeded } from './lib.mjs';
await ensureSeeded();
import { getPrisma } from './lib.mjs';
const prisma = getPrisma();
let fails = 0;
const ok = (n, c, e = '') => { if (!c) fails++; console.log(`${c ? '✓' : '✗'} ${n}${e !== '' ? ' — ' + e : ''}`); };
const section = (t) => console.log(`\n== ${t}`);
const call = async (m, p, b, tk) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const plusDays = (n) => new Date(Date.parse(today + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const monthStart = (offset) => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + offset); return d.toISOString().slice(0, 10); };

const adminToken = (await call('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).body.token;
let n = 0;
const newUser = async () => {
  const email = `p5u${Date.now()}${n++}@t.local`;
  const key = (await call('GET', '/admin/clave', undefined, adminToken)).body.key.code;
  const reg = await call('POST', '/auth/register', { name: 'Test User', email, password: 'secreto123', registrationKey: key });
  const token = (await call('POST', '/auth/login', { email, password: 'secreto123' })).body.token;
  const accounts = (await call('GET', '/cuentas', undefined, token)).body.accounts;
  const categories = (await call('GET', '/categorias', undefined, token)).body.categories;
  const all = (await call('GET', '/categorias?all=1', undefined, token)).body.categories;
  return { id: reg.body.id, email, token, accounts, cat: (nm) => categories.find((c) => c.name === nm).id, sysCat: (nm) => all.find((c) => c.name === nm).id };
};
const withU = (u) => ({
  get: (p) => call('GET', p, undefined, u.token), post: (p, b) => call('POST', p, b, u.token),
  put: (p, b) => call('PUT', p, b, u.token), del: (p) => call('DELETE', p, undefined, u.token),
});
const income = (api, u, amount, date, acc = 0) => api.post('/ingresos', { name: 'Sueldo', amount, categoryId: u.cat('Salario'), accountId: u.accounts[acc].id, date, frequency: 'ONE_TIME' });
const expense = (api, u, amount, date, catName = 'Alimentación', acc = 0) => api.post('/gastos', { description: `Gasto ${catName}`, amount, categoryId: u.cat(catName), accountId: u.accounts[acc].id, date, frequency: 'ONE_TIME' });

// ════════════════════════════════════════════════════════════════════════════
section('F7 · una compra de tarjeta es gasto del día; el abono no suma');
const u = await newUser(); const api = withU(u);
await income(api, u, 1_000_000, today);
await expense(api, u, 100_000, today);
const card = (await api.post('/tarjetas', { name: 'Visa', bank: 'Banco', creditLimit: 5_000_000, interestRate: 2, dueDay: 15, cutDay: 1 })).body.card;
await api.post(`/tarjetas/${card.id}/compras`, { description: 'TV', categoryId: u.cat('Tecnología'), totalAmount: 900_000, installments: 3, date: today });
await api.post(`/tarjetas/${card.id}/abonos`, { amount: 300_000, paidAt: today, accountId: u.accounts[0].id });
let d = (await api.get('/dashboard')).body;
ok('gastos del mes = 100.000 + compra 900.000 (el abono de 300.000 NO suma)', d.monthlyExpenses === 1_000_000, `monthlyExpenses=${d.monthlyExpenses}`);
ok('ingresos del mes = 1.000.000', d.monthlyIncome === 1_000_000);
ok('la compra aparece en transacciones recientes con el nombre de la tarjeta', d.transactions.some((t) => t.title === 'TV · Visa' && t.amount === 900_000 && t.type === 'expense'));
ok('el abono NO aparece en transacciones recientes', !d.transactions.some((t) => /Abono/.test(t.title)));
ok('flujo de caja de hoy incluye la compra (1.000.000)', d.cashFlow.at(-1).expense === 1_000_000, JSON.stringify(d.cashFlow.at(-1)));
const accBal = async (i = 0) => (await api.get('/cuentas')).body.accounts.find((a) => a.id === u.accounts[i].id).balance;
ok('la compra con tarjeta no toca la cuenta; el abono sí: 1.000.000 − 100.000 − 300.000 = 600.000', (await accBal()) === 600_000, `saldo=${await accBal()}`);

let h = (await api.get(`/historial?from=${monthStart(0)}&to=${today}`)).body;
const purchaseRow = h.transactions.find((t) => t.label === 'TV');
ok('historial: la compra es un gasto con origen tarjeta', purchaseRow && purchaseRow.type === 'EXPENSE' && purchaseRow.source === 'card' && purchaseRow.account === 'Tarjeta Visa' && purchaseRow.category === 'Tecnología');
ok('historial: el abono no se lista', !h.transactions.some((t) => /Abono/.test(t.label)));
ok('historial: total gastos = 1.000.000', h.summary.totalExpenses === 1_000_000, `totalExpenses=${h.summary.totalExpenses}`);
ok('historial: por categoría incluye Tecnología 900.000', h.byCategory.find((c) => c.name === 'Tecnología')?.amount === 900_000);
ok('historial: por mes suma la compra', h.byMonth.at(-1).expense === 1_000_000);
ok('historial: balance = ingresos − gastos = 0', h.summary.balance === 0);
h = (await api.get(`/historial?from=${monthStart(0)}&to=${today}&categoryId=${u.cat('Tecnología')}`)).body;
ok('historial: filtrar por Tecnología devuelve solo la compra', h.transactions.length === 1 && h.transactions[0].label === 'TV');
h = (await api.get(`/historial?from=${monthStart(0)}&to=${today}&type=INCOME`)).body;
ok('historial: tipo INGRESO no incluye compras', h.transactions.every((t) => t.type === 'INCOME') && h.summary.totalExpenses === 0);
h = (await api.get(`/historial?from=${monthStart(0)}&to=${today}&type=EXPENSE`)).body;
ok('historial: tipo GASTO incluye la compra pero no el abono', h.transactions.some((t) => t.label === 'TV') && !h.transactions.some((t) => /Abono/.test(t.label)));
const g = (await api.get('/gastos')).body;
ok('/gastos devuelve la compra en cardPurchases', g.cardPurchases.length === 1 && g.cardPurchases[0].card.name === 'Visa');
ok('/gastos marca el abono como transfer', g.expenses.find((e) => e.description.startsWith('Abono'))?.transfer === true && g.expenses.find((e) => e.description === 'Gasto Alimentación')?.transfer === false);

section('F7 · el mes de la compra manda (no el del abono)');
const u2 = await newUser(); const api2 = withU(u2);
await income(api2, u2, 2_000_000, monthStart(-1));
const c2 = (await api2.post('/tarjetas', { name: 'Master', bank: 'Banco', creditLimit: 5_000_000, interestRate: 2, dueDay: 10, cutDay: 1 })).body.card;
await api2.post(`/tarjetas/${c2.id}/compras`, { description: 'Compra del mes pasado', categoryId: u2.cat('Tecnología'), totalAmount: 800_000, installments: 1, date: monthStart(-1) });
await api2.post(`/tarjetas/${c2.id}/abonos`, { amount: 800_000, paidAt: today, accountId: u2.accounts[0].id });
d = (await api2.get('/dashboard')).body;
ok('pagar este mes una compra del mes pasado NO es gasto de este mes', d.monthlyExpenses === 0, `monthlyExpenses=${d.monthlyExpenses}`);
h = (await api2.get(`/historial?from=${monthStart(-1)}&to=${today}`)).body;
const lastMonth = h.byMonth.find((m) => m.month === monthStart(-1).slice(0, 7));
ok('…y sí es gasto del mes pasado (800.000)', lastMonth?.expense === 800_000, JSON.stringify(h.byMonth));

// ════════════════════════════════════════════════════════════════════════════
section('F6 · presupuestos ligados a una categoría');
const post = (b) => api.post('/presupuestos', b);
let r = await post({ name: 'Sin categoría', allocated: 100_000 });
ok('crear sin categoría → 400', r.status === 400, r.body.error);
r = await post({ name: 'Con ingreso', allocated: 100_000, categoryId: u.cat('Salario') });
ok('con categoría de ingreso → 400', r.status === 400, r.body.error);
r = await post({ name: 'Con sistema', allocated: 100_000, categoryId: u.sysCat('Pago de Deuda') });
ok('con categoría de sistema → 400', r.status === 400, r.body.error);
r = await post({ name: 'Con inexistente', allocated: 100_000, categoryId: 'nope' });
ok('con categoría inexistente → 400', r.status === 400, r.body.error);
const bTec = (await post({ name: 'Tecnología', allocated: 1_000_000, categoryId: u.cat('Tecnología') })).body.budget;
const bAli = (await post({ name: 'Comida', allocated: 500_000, categoryId: u.cat('Alimentación') })).body.budget;
ok('presupuestos válidos creados', !!bTec && !!bAli);
r = await post({ name: 'Otra tecnología', allocated: 5, categoryId: u.cat('Tecnología') });
ok('un segundo presupuesto para la misma categoría → 409', r.status === 409, r.body.error);

// gastos de borde: primer día del mes (cuenta) y último día del mes anterior (no cuenta)
await expense(api, u, 7_000, monthStart(0));
await expense(api, u, 9_999, plusDays(-(Number(today.slice(8)))), 'Alimentación'); // último día del mes anterior
await api.post(`/tarjetas/${card.id}/compras`, { description: 'Compra antigua', categoryId: u.cat('Tecnología'), totalAmount: 111_111, installments: 1, date: monthStart(-1) });
let budgets = (await api.get('/presupuestos')).body.budgets;
const spentOf = (id) => budgets.find((b) => b.id === id).spent;
ok('Tecnología: gastó 900.000 (la compra con tarjeta; la antigua no cuenta)', spentOf(bTec.id) === 900_000, `spent=${spentOf(bTec.id)}`);
ok('Comida: 100.000 + 7.000 del día 1 = 107.000 (el del mes pasado no cuenta)', spentOf(bAli.id) === 107_000, `spent=${spentOf(bAli.id)}`);
ok('cada presupuesto trae su categoría', budgets.find((b) => b.id === bTec.id).category?.name === 'Tecnología');
await api.post(`/tarjetas/${card.id}/abonos`, { amount: 100_000, paidAt: today });
budgets = (await api.get('/presupuestos')).body.budgets;
ok('un abono nunca cambia lo gastado en un presupuesto', spentOf(bTec.id) === 900_000);
r = await api.put(`/presupuestos/${bTec.id}`, { categoryId: u.cat('Alimentación') });
ok('cambiar a una categoría que ya tiene presupuesto → 409', r.status === 409);
r = await api.put(`/presupuestos/${bTec.id}`, { categoryId: u.cat('Transporte') });
ok('cambiar a una categoría libre → 200', r.status === 200 && r.body.budget.categoryId === u.cat('Transporte'));
budgets = (await api.get('/presupuestos')).body.budgets;
ok('al cambiar de categoría el gasto se recalcula (Transporte: 0)', spentOf(bTec.id) === 0, `spent=${spentOf(bTec.id)}`);
r = await api.put(`/presupuestos/${bTec.id}`, { name: 'Solo renombrar' });
ok('editar solo el nombre conserva la categoría', r.status === 200 && r.body.budget.categoryId === u.cat('Transporte'));
const stale = String((await prisma.budget.findUnique({ where: { id: bAli.id } })).spent);
ok('la columna `spent` heredada nunca se escribe (sigue en 0)', stale === '0', `spent en BD=${stale}`);
// presupuesto heredado sin categoría
await prisma.budget.create({ data: { id: `legacy-${u.id}`, userId: u.id, name: 'Viejo', allocated: 1000, spent: 777 } });
budgets = (await api.get('/presupuestos')).body.budgets;
const legacy = budgets.find((b) => b.id === `legacy-${u.id}`);
ok('presupuesto heredado sin categoría: gasto 0 (ya no usa el `spent` viejo de 777) y category null', legacy.spent === 0 && legacy.category === null, `spent=${legacy.spent}`);
r = await api.put(`/presupuestos/legacy-${u.id}`, { categoryId: u.cat('Mascotas') });
ok('…y se puede vincular editándolo', r.status === 200 && r.body.budget.categoryId === u.cat('Mascotas'));
r = await call('DELETE', `/admin/categorias/${u.cat('Alimentación')}`, undefined, adminToken);
ok('el admin no puede borrar una categoría con presupuestos (409)', r.status === 409, r.body.error);

// ════════════════════════════════════════════════════════════════════════════
section('F1 · el patrimonio incluye las cuentas ocultas');
await api.put(`/cuentas/${u.accounts[1].id}`, { balance: 2_000_000, hideFromTotal: true });
await api.post('/deudas', { name: 'Préstamo', entity: 'Banco', balance: 100_000, interestRate: 2, minPayment: 10_000, dueDate: '2027-06-01' });
d = (await api.get('/dashboard')).body;
const balances = (await api.get('/cuentas')).body.accounts.map((a) => a.balance);
const allSum = balances.reduce((s, x) => s + x, 0);
const cardDebt = (await api.get('/tarjetas')).body.cards.reduce((s, c) => s + c.usedBalance, 0);
const totalDebt = cardDebt + 100_000;
ok('saldo disponible = solo cuentas visibles', d.totalBalance === allSum - 2_000_000, `totalBalance=${d.totalBalance}`);
ok('patrimonio = TODAS las cuentas − deudas', d.netWorth === allSum - totalDebt, `netWorth=${d.netWorth} esperado=${allSum - totalDebt}`);
await api.put(`/cuentas/${u.accounts[1].id}`, { hideFromTotal: false });
const d2 = (await api.get('/dashboard')).body;
ok('mostrar la cuenta cambia el disponible pero NO el patrimonio', d2.totalBalance === allSum && d2.netWorth === d.netWorth);

// ════════════════════════════════════════════════════════════════════════════
section('F2 · salud financiera con promedio de los últimos meses');
const u3 = await newUser(); const api3 = withU(u3);
await income(api3, u3, 2_000_000, monthStart(-1));
await expense(api3, u3, 1_700_000, monthStart(-1));
d = (await api3.get('/dashboard')).body;
ok('mes actual sin ingresos pero con historial: el puntaje ya no es 30', d.healthScore === 90, `healthScore=${d.healthScore} (30 con la lógica anterior)`);
ok('las tarjetas del dashboard siguen mostrando el mes actual (0)', d.monthlyIncome === 0 && d.monthlyExpenses === 0);
await expense(api3, u3, 5_000_000, today); // un gasto enorme este mes (parcial)
d = (await api3.get('/dashboard')).body;
ok('un mes parcial no hunde el puntaje (sigue 90) mientras haya historial', d.healthScore === 90, `healthScore=${d.healthScore}`);
ok('…pero el gasto de este mes sí se ve en las tarjetas (5.000.000)', d.monthlyExpenses === 5_000_000);
// promedio de dos meses con datos
const u4 = await newUser(); const api4 = withU(u4);
await income(api4, u4, 3_000_000, monthStart(-1)); await expense(api4, u4, 1_000_000, monthStart(-1));
await income(api4, u4, 3_000_000, monthStart(-2)); await expense(api4, u4, 2_000_000, monthStart(-2));
d = (await api4.get('/dashboard')).body;
ok('promedio de 2 meses (ingreso 3M, gasto 1,5M → ahorro 50%) → 100', d.healthScore === 100, `healthScore=${d.healthScore}`);
// sin historial: usa el mes actual
const u5 = await newUser(); const api5 = withU(u5);
d = (await api5.get('/dashboard')).body;
ok('usuario nuevo sin datos → 30', d.healthScore === 30);
await income(api5, u5, 1_000_000, today); await expense(api5, u5, 900_000, today);
d = (await api5.get('/dashboard')).body;
ok('sin historial usa el mes actual (ahorro 10%) → 90', d.healthScore === 90, `healthScore=${d.healthScore}`);
// la deuda pesa según el promedio
const u6 = await newUser(); const api6 = withU(u6);
await income(api6, u6, 1_000_000, monthStart(-1)); await expense(api6, u6, 500_000, monthStart(-1));
await api6.post('/deudas', { name: 'Grande', entity: 'Banco', balance: 50_000_000, interestRate: 2, minPayment: 10_000, dueDate: '2027-06-01' });
d = (await api6.get('/dashboard')).body;
ok('con deuda 50M sobre ingreso 12M/año (4,2×) el puntaje baja (70+15−25=60)', d.healthScore === 60, `healthScore=${d.healthScore}`);

// ════════════════════════════════════════════════════════════════════════════
section('F9 · alertas: una por vencimiento, vencidas y notificaciones');
const u7 = await newUser(); const api7 = withU(u7);
const debtSoon = (await api7.post('/deudas', { name: 'Próxima', entity: 'Banco', balance: 500_000, interestRate: 2, minPayment: 10_000, dueDate: plusDays(3) })).body.debt;
await api7.post('/deudas', { name: 'Vencida', entity: 'Banco', balance: 300_000, interestRate: 2, minPayment: 10_000, dueDate: plusDays(-10) });
const paid = (await api7.post('/deudas', { name: 'Saldada', entity: 'Banco', balance: 50_000, interestRate: 2, minPayment: 10_000, dueDate: plusDays(-20) })).body.debt;
await api7.put(`/deudas/${paid.id}`, { balance: 0 });
const dueDay = Number(plusDays(2).slice(8));
const c7 = (await api7.post('/tarjetas', { name: 'Visa7', bank: 'Banco', creditLimit: 1_000_000, interestRate: 2, dueDay, cutDay: 1 })).body.card;
await api7.post(`/tarjetas/${c7.id}/compras`, { description: 'Algo', categoryId: u7.cat('Tecnología'), totalAmount: 100_000, installments: 1, date: today });
let auto = (await api7.post('/alertas/auto', {})).body;
ok('1ª llamada crea 3 alertas (deuda próxima, deuda vencida, tarjeta)', auto.created === 3, JSON.stringify(auto));
let alerts = (await api7.get('/alertas')).body.alerts;
ok('hay alerta de deuda vencida con su mensaje', alerts.some((a) => a.type.startsWith('vencida_deuda_') && /venció/.test(a.message) && /Vencida/.test(a.message)));
ok('la deuda saldada no genera alerta', !alerts.some((a) => /Saldada/.test(a.message)));
for (let i = 0; i < 3; i++) auto = (await api7.post('/alertas/auto', {})).body;
ok('llamarla de nuevo (como en cada login) no repite nada', auto.created === 0 && (await api7.get('/alertas')).body.alerts.length === alerts.length, JSON.stringify(auto));
await api7.put(`/deudas/${debtSoon.id}`, { dueDate: plusDays(5) });
auto = (await api7.post('/alertas/auto', {})).body;
ok('mover la fecha de vencimiento genera UNA alerta nueva (otra fecha)', auto.created === 1, JSON.stringify(auto));
auto = (await api7.post('/alertas/auto', {})).body;
ok('…y tampoco se repite', auto.created === 0);
await api7.put('/configuracion', { notifications: false });
await api7.post('/deudas', { name: 'Vencida 2', entity: 'Banco', balance: 10_000, interestRate: 2, minPayment: 1_000, dueDate: plusDays(-3) });
auto = (await api7.post('/alertas/auto', {})).body;
ok('con notificaciones desactivadas no se crea nada', auto.created === 0 && auto.skipped === 'notifications_off', JSON.stringify(auto));
await api7.put('/configuracion', { notifications: true });
auto = (await api7.post('/alertas/auto', {})).body;
ok('al reactivarlas se crean las pendientes (la deuda vencida nueva)', auto.created === 1, JSON.stringify(auto));

// ════════════════════════════════════════════════════════════════════════════
section('A8 · informe de conciliación de saldos');
r = await call('GET', `/admin/conciliacion?userId=${u.id}`, undefined, u.token);
ok('un usuario normal no puede verlo (403)', r.status === 403);
r = (await call('GET', `/admin/conciliacion?userId=${u.id}`, undefined, adminToken)).body;
const rep = Object.fromEntries(r.accounts.map((a) => [a.accountId, a]));
const a0 = rep[u.accounts[0].id], a1 = rep[u.accounts[1].id];
ok('cuenta con solo movimientos: saldo = ingresos − gastos y ajuste 0', a0.adjustment === 0 && a0.balance === a0.incomes - a0.expenses, JSON.stringify({ b: a0.balance, i: a0.incomes, e: a0.expenses, adj: a0.adjustment }));
ok('cuenta cuyo saldo se editó a mano: el ajuste lo revela (2.000.000)', a1.adjustment === 2_000_000, `adjustment=${a1.adjustment}`);
ok('el informe cuenta cuántas tienen ajuste', r.withAdjustment === 1, `withAdjustment=${r.withAdjustment}`);
await prisma.account.update({ where: { id: u.accounts[0].id }, data: { balance: { increment: 123.45 } } }); // simulate drift
r = (await call('GET', `/admin/conciliacion?userId=${u.id}`, undefined, adminToken)).body;
ok('una deriva de 123,45 se detecta', r.accounts.find((a) => a.accountId === u.accounts[0].id).adjustment === 123.45);

console.log(`\n${fails === 0 ? 'TODO OK' : fails + ' FALLO(S)'}`);
await prisma.$disconnect();
process.exit(fails ? 1 : 0);
