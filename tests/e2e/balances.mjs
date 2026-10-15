// Balances: payments, card payments, purchases, linked expenses, system categories (audit phase 3)
import { API as B, ADMIN_EMAIL, ADMIN_PASSWORD, ensureSeeded } from './lib.mjs';
await ensureSeeded();
let fails = 0, token = '';
const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); };
const call = async (method, path, body, tk = token) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const get = (p) => call('GET', p);
const post = (p, b) => call('POST', p, b);
const put = (p, b) => call('PUT', p, b);
const del = (p) => call('DELETE', p);
const countStatus = (rs, s) => rs.filter((r) => r.status === s).length;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// ── setup ────────────────────────────────────────────────────────────────────
const adminLogin = await call('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, '');
const adminToken = adminLogin.body.token;
const reg = (await call('GET', '/admin/clave', undefined, adminToken)).body.key.code;
const email = `u${Date.now()}@t.local`;
await call('POST', '/auth/register', { name: 'Test', email, password: 'secreto123', registrationKey: reg }, '');
token = (await call('POST', '/auth/login', { email, password: 'secreto123' }, '')).body.token;
const accounts = (await get('/cuentas')).body.accounts;
const acc0 = accounts[0].id;
const categories = (await get('/categorias')).body.categories;
const allCategories = (await get('/categorias?all=1')).body.categories;
const cat = (n) => categories.find((c) => c.name === n).id;
const sysDebt = allCategories.find((c) => c.name === 'Pago de Deuda');
const balance = async (id = acc0) => (await get('/cuentas')).body.accounts.find((a) => a.id === id).balance;
const cardOf = async (id) => (await get('/tarjetas')).body.cards.find((c) => c.id === id);
const debtOf = async (id) => (await get('/deudas')).body.debts.find((d) => d.id === id);
await post('/ingresos', { name: 'Sueldo', amount: 1_000_000, categoryId: cat('Salario'), accountId: acc0, date: today, frequency: 'ONE_TIME' });

// ── A1: pagos de deuda concurrentes ──────────────────────────────────────────
console.log('\n== A1 · pagos de deuda concurrentes');
const debt = (await post('/deudas', { name: 'Préstamo', entity: 'Banco', balance: 100_000, interestRate: 2, minPayment: 10_000, dueDate: '2027-01-01' })).body.debt;
let rs = await Promise.all(Array.from({ length: 5 }, () => post('/pagos', { debtId: debt.id, amount: 80_000, accountId: acc0 })));
ok('5 pagos simultáneos de 80.000 sobre deuda de 100.000: solo 1 pasa', countStatus(rs, 201) === 1 && countStatus(rs, 400) === 4, rs.map((r) => r.status).join(','));
ok('deuda queda en 20.000', (await debtOf(debt.id)).balance === 20_000);
ok('cuenta se debita una sola vez (920.000)', (await balance()) === 920_000, `saldo=${await balance()}`);
const payExpenses = (await get('/gastos')).body.expenses.filter((e) => e.category.name === 'Pago de Deuda');
ok('se creó un único gasto vinculado', payExpenses.length === 1);
const payment1 = rs.find((r) => r.status === 201).body.payment;

rs = await Promise.all(Array.from({ length: 3 }, () => post('/pagos', { debtId: debt.id, amount: 15_000 })));
ok('3 pagos simultáneos de 15.000 sobre saldo de 20.000 (sin cuenta): solo 1 pasa', countStatus(rs, 201) === 1, rs.map((r) => r.status).join(','));
ok('deuda queda en 5.000', (await debtOf(debt.id)).balance === 5_000);
ok('pago sin cuenta no toca el saldo de la cuenta', (await balance()) === 920_000);

rs = await Promise.all(Array.from({ length: 4 }, () => post('/pagos', { debtId: debt.id, amount: 1_000, accountId: 'inexistente' })));
ok('cuenta inexistente → 404', countStatus(rs, 404) === 4);
ok('JSON inválido → 400 (no 500)', (await call('POST', '/pagos', '{no es json')).status === 400);

console.log('\n== A1 · eliminación concurrente de un pago (restaura una sola vez)');
rs = await Promise.all(Array.from({ length: 5 }, () => del(`/pagos/${payment1.id}`)));
ok('5 DELETE simultáneos: 1 ok y 4 not found', countStatus(rs, 200) === 1 && countStatus(rs, 404) === 4, rs.map((r) => r.status).join(','));
ok('deuda restaurada una vez (5.000 + 80.000)', (await debtOf(debt.id)).balance === 85_000, `deuda=${(await debtOf(debt.id)).balance}`);
ok('cuenta restaurada una vez (1.000.000)', (await balance()) === 1_000_000, `saldo=${await balance()}`);
ok('el gasto vinculado desapareció', (await get('/gastos')).body.expenses.filter((e) => e.category.name === 'Pago de Deuda').length === 0);

// ── A2: abonos sin recorte al cupo ───────────────────────────────────────────
console.log('\n== A2 · restaurar abono sin recortar al cupo');
const card = (await post('/tarjetas', { name: 'Visa', bank: 'Banco', creditLimit: 1_000_000, interestRate: 2, dueDay: 15, cutDay: 1 })).body.card;
await post(`/tarjetas/${card.id}/compras`, { description: 'TV', categoryId: cat('Tecnología'), totalAmount: 800_000, installments: 4, date: today });
const abono = (await post(`/tarjetas/${card.id}/abonos`, { amount: 300_000, paidAt: today, accountId: acc0 })).body.payment;
ok('abono registrado: tarjeta 500.000, cuenta 700.000', (await cardOf(card.id)).usedBalance === 500_000 && (await balance()) === 700_000);
await put(`/tarjetas/${card.id}`, { creditLimit: 400_000 });
ok('PUT parcial conserva la moneda', (await cardOf(card.id)).currency === 'COP' && (await cardOf(card.id)).creditLimit === 400_000);
rs = await Promise.all(Array.from({ length: 5 }, () => del(`/tarjetas/${card.id}/abonos/${abono.id}`)));
ok('5 DELETE simultáneos del abono: 1 ok', countStatus(rs, 200) === 1, rs.map((r) => r.status).join(','));
ok('con cupo reducido a 400.000 la deuda vuelve a 800.000 (antes se recortaba a 400.000)', (await cardOf(card.id)).usedBalance === 800_000, `usedBalance=${(await cardOf(card.id)).usedBalance}`);
ok('cuenta restaurada una vez', (await balance()) === 1_000_000);
await put(`/tarjetas/${card.id}`, { creditLimit: 1_000_000 });

// ── A1: abonos concurrentes ──────────────────────────────────────────────────
console.log('\n== A1 · abonos concurrentes');
rs = await Promise.all(Array.from({ length: 5 }, () => post(`/tarjetas/${card.id}/abonos`, { amount: 300_000, paidAt: today, accountId: acc0 })));
ok('5 abonos de 300.000 sobre saldo de 800.000: pasan exactamente 2', countStatus(rs, 201) === 2, rs.map((r) => r.status).join(','));
ok('tarjeta queda en 200.000', (await cardOf(card.id)).usedBalance === 200_000);
ok('cuenta debitada 600.000 (400.000)', (await balance()) === 400_000, `saldo=${await balance()}`);
ok('fecha inválida → 400', (await post(`/tarjetas/${card.id}/abonos`, { amount: 1000, paidAt: '2026-02-31' })).status === 400);
ok('monto negativo → 400', (await post(`/tarjetas/${card.id}/abonos`, { amount: -5, paidAt: today })).status === 400);

// ── A3: gastos vinculados ────────────────────────────────────────────────────
console.log('\n== A3 · gastos generados por pagos');
let expenses = (await get('/gastos')).body.expenses;
const linked = expenses.filter((e) => e.linked);
ok('GET /gastos marca los 2 gastos de abono como linked', linked.length === 2 && linked.every((e) => e.category.name === 'Abono Tarjeta'), `linked=${linked.length}`);
const manual = (await post('/gastos', { description: 'Café', amount: 5_000, categoryId: cat('Alimentación'), accountId: acc0, date: today, frequency: 'ONE_TIME' })).body.expense;
expenses = (await get('/gastos')).body.expenses;
ok('un gasto manual no está linked', expenses.find((e) => e.id === manual.id).linked === false);
let r = await put(`/gastos/${linked[0].id}`, { amount: 1 });
ok('editar un gasto vinculado → 409', r.status === 409, r.body.error?.slice(0, 60));
ok('editar un gasto manual sigue funcionando', (await put(`/gastos/${manual.id}`, { amount: 6_000 })).status === 200);
ok('saldo ajustado por la edición manual (400.000 − 5.000 − 1.000)', (await balance()) === 394_000, `saldo=${await balance()}`);
await del(`/gastos/${manual.id}`);
r = await Promise.all(Array.from({ length: 4 }, () => del(`/gastos/${linked[0].id}`)));
ok('4 DELETE simultáneos del gasto vinculado: 1 ok', countStatus(r, 200) === 1, r.map((x) => x.status).join(','));
ok('revierte el abono: tarjeta 500.000 y cuenta 700.000', (await cardOf(card.id)).usedBalance === 500_000 && (await balance()) === 700_000, `tarjeta=${(await cardOf(card.id)).usedBalance} cuenta=${await balance()}`);
ok('el abono ya no existe', (await cardOf(card.id)).payments.length === 1);

// ── A4: compras ──────────────────────────────────────────────────────────────
console.log('\n== A4 · validación de compras');
const base = { description: 'Compra', categoryId: cat('Tecnología'), totalAmount: 10_000, installments: 1, date: today };
const buy = (over) => post(`/tarjetas/${card.id}/compras`, { ...base, ...over });
const before = (await cardOf(card.id)).usedBalance;
const incomeCat = cat('Salario');
const cases = [
  ['monto negativo', { totalAmount: -50_000 }], ['monto cero', { totalAmount: 0 }], ['cuotas 0', { installments: 0 }],
  ['cuotas 99', { installments: 99 }], ['fecha inválida', { date: '2026-02-31' }], ['sin descripción', { description: '' }],
  ['categoría de ingreso', { categoryId: incomeCat }], ['categoría inexistente', { categoryId: 'nope' }],
  ['categoría de sistema', { categoryId: sysDebt.id }], ['monto "abc"', { totalAmount: 'abc' }],
];
for (const [name, over] of cases) { const x = await buy(over); ok(`rechaza ${name}`, x.status === 400, `${x.body.error}`); }
ok('JSON inválido → 400', (await call('POST', `/tarjetas/${card.id}/compras`, 'xx')).status === 400);
ok('ninguna compra inválida modificó el saldo', (await cardOf(card.id)).usedBalance === before);
const over = await buy({ totalAmount: 600_000 });
ok('compra sobre el cupo disponible (500.000) → 400', over.status === 400 && /cupo/.test(over.body.error), over.body.error);
rs = await Promise.all(Array.from({ length: 5 }, () => buy({ totalAmount: 200_000, description: 'Concurrente' })));
ok('5 compras simultáneas de 200.000 con 500.000 disponibles: pasan exactamente 2', countStatus(rs, 201) === 2, rs.map((x) => x.status).join(','));
ok('el saldo nunca supera el cupo', (await cardOf(card.id)).usedBalance === before + 400_000 && (await cardOf(card.id)).usedBalance <= 1_000_000, `usedBalance=${(await cardOf(card.id)).usedBalance}`);

// ── A5: eliminar compra con abonos ───────────────────────────────────────────
console.log('\n== A5 · eliminar una compra con abonos aplicados');
const c2 = (await post('/tarjetas', { name: 'Master', bank: 'Banco', creditLimit: 2_000_000, interestRate: 2, dueDay: 10, cutDay: 1 })).body.card;
const p2 = (await post(`/tarjetas/${c2.id}/compras`, { ...base, totalAmount: 500_000 })).body.purchase;
const ab2 = (await post(`/tarjetas/${c2.id}/abonos`, { amount: 300_000, paidAt: today })).body.payment;
r = await del(`/tarjetas/${c2.id}/compras/${p2.id}`);
ok('borrar compra de 500.000 con saldo 200.000 → 409', r.status === 409, r.body.error?.slice(0, 70));
ok('nada cambió (saldo 200.000, compra sigue)', (await cardOf(c2.id)).usedBalance === 200_000 && (await cardOf(c2.id)).purchases.length === 1);
await del(`/tarjetas/${c2.id}/abonos/${ab2.id}`);
rs = await Promise.all(Array.from({ length: 4 }, () => del(`/tarjetas/${c2.id}/compras/${p2.id}`)));
ok('tras quitar el abono, 4 DELETE simultáneos de la compra: 1 ok', countStatus(rs, 200) === 1, rs.map((x) => x.status).join(','));
ok('saldo en 0 (nunca negativo)', (await cardOf(c2.id)).usedBalance === 0, `usedBalance=${(await cardOf(c2.id)).usedBalance}`);

// ── A6: tarjetas ─────────────────────────────────────────────────────────────
console.log('\n== A6 · validación de tarjetas');
const okCard = { name: 'Amex', bank: 'Banco', creditLimit: 1_000_000, interestRate: 2, dueDay: 5, cutDay: 20, currency: 'USD' };
for (const [name, over] of [['dueDay 99', { dueDay: 99 }], ['cutDay 0', { cutDay: 0 }], ['cupo "abc"', { creditLimit: 'abc' }], ['cupo negativo', { creditLimit: -1 }], ['nombre vacío', { name: '' }], ['sin banco', { bank: undefined }]]) {
  const x = await post('/tarjetas', { ...okCard, ...over }); ok(`POST rechaza ${name}`, x.status === 400, `HTTP ${x.status}`);
}
const c3 = await post('/tarjetas', okCard);
ok('POST válida → 201 y conserva la moneda', c3.status === 201 && c3.body.card.currency === 'USD');
ok('PUT dueDay 0 → 400', (await put(`/tarjetas/${c3.body.card.id}`, { dueDay: 0 })).status === 400);
ok('PUT cupo negativo → 400', (await put(`/tarjetas/${c3.body.card.id}`, { creditLimit: -5 })).status === 400);
r = await put(`/tarjetas/${c3.body.card.id}`, { name: 'Amex Gold' });
ok('PUT parcial {name} conserva moneda USD y demás campos', r.status === 200 && r.body.card.currency === 'USD' && r.body.card.name === 'Amex Gold' && r.body.card.dueDay === 5);

// ── M10: categorías de sistema ───────────────────────────────────────────────
console.log('\n== M10 · categorías de sistema');
ok('GET /categorias no incluye las de sistema', !categories.some((c) => c.isSystem) && !categories.some((c) => ['Pago de Deuda', 'Abono Tarjeta'].includes(c.name)));
ok('GET /categorias?all=1 sí las incluye', allCategories.filter((c) => c.isSystem).length === 2);
r = await post('/gastos', { description: 'prueba', amount: 1000, categoryId: sysDebt.id, accountId: acc0, date: today, frequency: 'ONE_TIME' });
ok('crear gasto con categoría de sistema → 400 por la categoría', r.status === 400 && /categor/i.test(r.body.error), r.body.error);
r = await post('/gastos', { description: 'prueba', amount: 1000, categoryId: incomeCat, accountId: acc0, date: today, frequency: 'ONE_TIME' });
ok('crear gasto con categoría de ingreso → 400 por la categoría', r.status === 400 && /categor/i.test(r.body.error), r.body.error);
r = await post('/ingresos', { name: 'prueba', amount: 1000, categoryId: cat('Arriendo'), accountId: acc0, date: today, frequency: 'ONE_TIME' });
ok('crear ingreso con categoría de gasto → 400 por la categoría', r.status === 400 && /categor/i.test(r.body.error), r.body.error);
const m2 = (await post('/gastos', { description: 'valido', amount: 1000, categoryId: cat('Alimentación'), accountId: acc0, date: today, frequency: 'ONE_TIME' })).body.expense;
r = await put(`/gastos/${m2.id}`, { categoryId: sysDebt.id });
ok('mover un gasto a categoría de sistema → 400 por la categoría', r.status === 400 && /categor/i.test(r.body.error), r.body.error);
ok('cambiar a otra categoría válida → 200', (await put(`/gastos/${m2.id}`, { categoryId: cat('Transporte') })).status === 200);
const adminCats = (await call('GET', '/admin/categorias', undefined, adminToken)).body.categories;
ok('el panel admin ve isSystem', adminCats.filter((c) => c.isSystem).length === 2);
ok('admin no puede renombrar categoría de sistema (409)', (await call('PUT', `/admin/categorias/${sysDebt.id}`, { name: 'Otra' }, adminToken)).status === 409);
ok('admin no puede eliminar categoría de sistema (409)', (await call('DELETE', `/admin/categorias/${sysDebt.id}`, undefined, adminToken)).status === 409);
ok('admin no puede crear un nombre reservado (409)', (await call('POST', '/admin/categorias', { name: 'pago de deuda', type: 'EXPENSE' }, adminToken)).status === 409);
ok('admin no puede renombrar otra a un nombre reservado (409)', (await call('PUT', `/admin/categorias/${cat('Gustos')}`, { name: 'Abono Tarjeta' }, adminToken)).status === 409);
// A throwaway category of its own, so the suite can be re-run against the same database
const tmpCat = (await call('POST', '/admin/categorias', { name: `Prueba ${Date.now()}`, type: 'EXPENSE' }, adminToken)).body.category;
ok('admin sigue pudiendo renombrar una normal', (await call('PUT', `/admin/categorias/${tmpCat.id}`, { name: `${tmpCat.name} renombrada` }, adminToken)).status === 200);
ok('…y eliminarla si no está en uso', (await call('DELETE', `/admin/categorias/${tmpCat.id}`, undefined, adminToken)).status === 200);

console.log(`\n${fails === 0 ? 'TODO OK' : fails + ' FALLO(S)'}`);
process.exit(fails ? 1 : 0);
