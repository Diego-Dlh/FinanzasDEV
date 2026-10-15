// Concurrency: simultaneous edits/deletes must keep account balances exact (row locks)
import { API as B, ADMIN_EMAIL, ADMIN_PASSWORD, ensureSeeded } from './lib.mjs';
await ensureSeeded();
let fails = 0;
const ok = (n, c, e = '') => { if (!c) fails++; console.log(`${c ? '✓' : '✗'} ${n}${e ? ' — ' + e : ''}`); };
const call = async (m, p, b, tk) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const admin = (await call('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).body.token;
const key = (await call('GET', '/admin/clave', undefined, admin)).body.key.code;
const email = `lock${Date.now()}@t.local`;
await call('POST', '/auth/register', { name: 'Lock Test', email, password: 'secreto123', registrationKey: key });
const t = (await call('POST', '/auth/login', { email, password: 'secreto123' })).body.token;
const accs = (await call('GET', '/cuentas', undefined, t)).body.accounts;
const [a0, a1] = [accs[0].id, accs[1].id];
const cats = (await call('GET', '/categorias', undefined, t)).body.categories;
const cat = (n) => cats.find((c) => c.name === n).id;
const bal = async (id) => (await call('GET', '/cuentas', undefined, t)).body.accounts.find((a) => a.id === id).balance;
const mkInc = async (amount) => (await call('POST', '/ingresos', { name: 'Ingreso', amount, categoryId: cat('Salario'), accountId: a0, date: today, frequency: 'ONE_TIME' }, t)).body.income;
const mkExp = async (amount) => (await call('POST', '/gastos', { description: 'Gasto', amount, categoryId: cat('Alimentación'), accountId: a0, date: today, frequency: 'ONE_TIME' }, t)).body.expense;

console.log('== ediciones simultáneas de un ingreso');
let inc = await mkInc(1000);
ok('saldo inicial 1.000', (await bal(a0)) === 1000);
let rs = await Promise.all([5000, 7000, 9000, 3000, 11000, 2000].map((amount) => call('PUT', `/ingresos/${inc.id}`, { amount }, t)));
const finalAmount = (await call('GET', '/ingresos', undefined, t)).body.incomes.find((i) => i.id === inc.id).amount;
ok('6 ediciones simultáneas: todas 200', rs.every((r) => r.status === 200), rs.map((r) => r.status).join(','));
ok('el saldo coincide con el monto final del ingreso (sin deriva)', (await bal(a0)) === finalAmount, `monto final=${finalAmount} saldo=${await bal(a0)}`);

console.log('\n== mover de cuenta + editar a la vez');
rs = await Promise.all([call('PUT', `/ingresos/${inc.id}`, { accountId: a1 }, t), call('PUT', `/ingresos/${inc.id}`, { amount: 4000 }, t), call('PUT', `/ingresos/${inc.id}`, { accountId: a0, amount: 6000 }, t)]);
const cur = (await call('GET', '/ingresos', undefined, t)).body.incomes.find((i) => i.id === inc.id);
const [b0, b1] = [await bal(a0), await bal(a1)];
ok('el ingreso queda en exactamente una cuenta con su monto, y la otra en 0', (cur.account.id === a0 ? b0 === cur.amount && b1 === 0 : b1 === cur.amount && b0 === 0), `monto=${cur.amount} cuenta=${cur.account.id === a0 ? 'A0' : 'A1'} saldos=${b0}/${b1}`);

console.log('\n== ediciones y borrado simultáneos de un gasto');
await call('DELETE', `/ingresos/${inc.id}`, undefined, t);
ok('tras borrar el ingreso las cuentas vuelven a 0', (await bal(a0)) === 0 && (await bal(a1)) === 0, `${await bal(a0)}/${await bal(a1)}`);
let exp = await mkExp(400);
rs = await Promise.all([call('PUT', `/gastos/${exp.id}`, { amount: 900 }, t), call('PUT', `/gastos/${exp.id}`, { amount: 100 }, t), call('DELETE', `/gastos/${exp.id}`, undefined, t), call('DELETE', `/gastos/${exp.id}`, undefined, t)]);
const stillThere = (await call('GET', '/gastos', undefined, t)).body.expenses.some((e) => e.id === exp.id);
ok('el gasto terminó borrado y las respuestas son 200/404 (ningún 500)', !stillThere && rs.every((r) => [200, 404].includes(r.status)), rs.map((r) => r.status).join(','));
ok('el saldo volvió exactamente a 0 sin importar el orden', (await bal(a0)) === 0, `saldo=${await bal(a0)}`);

console.log('\n== carga: 30 operaciones mezcladas sobre 10 gastos');
const exps = [];
for (let i = 0; i < 10; i++) exps.push(await mkExp(100 * (i + 1)));
const ops = [];
for (const e of exps) { ops.push(call('PUT', `/gastos/${e.id}`, { amount: 50 }, t)); ops.push(call('PUT', `/gastos/${e.id}`, { amount: 70 }, t)); ops.push(call('DELETE', `/gastos/${e.id}`, undefined, t)); }
rs = await Promise.all(ops);
const left = (await call('GET', '/gastos', undefined, t)).body.expenses;
const expectedBalance = -left.reduce((s, e) => s + e.amount, 0);
ok('ningún 500 ni 409 de interbloqueo', rs.every((r) => [200, 404].includes(r.status)), `estados: ${[...new Set(rs.map((r) => r.status))].join(',')}`);
ok('el saldo coincide con la suma de los gastos que quedaron', (await bal(a0)) === expectedBalance, `saldo=${await bal(a0)} esperado=${expectedBalance} (quedan ${left.length})`);

console.log(`\n${fails === 0 ? 'TODO OK' : fails + ' FALLO(S)'}`);
process.exit(fails ? 1 : 0);
