// Security: ownership checks, removed endpoints, admin setup, tokens (audit phase 1)
import jwt from 'jsonwebtoken';
import { API as B, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_KEY, ensureSeeded, jwtSecret } from './lib.mjs';
await ensureSeeded();

let fails = 0;
const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? '✓' : '✗'} ${name}${extra !== '' ? ' — ' + extra : ''}`); };
const section = (t) => console.log(`\n== ${t}`);
const call = async (method, path, body, token) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const KEY = { 'x-setup-key': SEED_KEY };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const login = async (email, password) => (await call('POST', '/auth/login', { email, password })).body.token;
let adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
let n = 0;
const newUser = async () => {
  const email = `sec${Date.now()}${n++}@t.local`;
  const key = (await call('GET', '/admin/clave', undefined, adminToken)).body.key.code;
  await call('POST', '/auth/register', { name: 'Test User', email, password: 'secreto123', registrationKey: key });
  const token = await login(email, 'secreto123');
  const accounts = (await call('GET', '/cuentas', undefined, token)).body.accounts;
  const categories = (await call('GET', '/categorias', undefined, token)).body.categories;
  return { email, token, accounts, cat: (name) => categories.find((c) => c.name === name).id };
};

section('C1 · no se puede mover dinero a la cuenta de otra persona');
const ana = await newUser();
const beto = await newUser();
const balanceOf = async (u, i = 0) => (await call('GET', '/cuentas', undefined, u.token)).body.accounts[i].balance;
const income = (await call('POST', '/ingresos', { name: 'Sueldo', amount: 1000, categoryId: ana.cat('Salario'), accountId: ana.accounts[0].id, date: today, frequency: 'ONE_TIME' }, ana.token)).body.income;
const expense = (await call('POST', '/gastos', { description: 'Renta', amount: 300, categoryId: ana.cat('Arriendo'), accountId: ana.accounts[0].id, date: today, frequency: 'ONE_TIME' }, ana.token)).body.expense;
const betoBefore = await balanceOf(beto);
let r = await call('PUT', `/ingresos/${income.id}`, { accountId: beto.accounts[0].id }, ana.token);
ok('mover un ingreso a una cuenta ajena → 404', r.status === 404);
r = await call('PUT', `/gastos/${expense.id}`, { accountId: beto.accounts[0].id }, ana.token);
ok('mover un gasto a una cuenta ajena → 404', r.status === 404);
ok('el saldo de la otra persona no cambió', (await balanceOf(beto)) === betoBefore);
r = await call('PUT', `/ingresos/${income.id}`, { accountId: ana.accounts[1].id }, ana.token);
ok('mover a otra cuenta propia sí funciona', r.status === 200);

section('Acceso a datos ajenos');
const anaDebt = (await call('POST', '/deudas', { name: 'Préstamo', entity: 'Banco', balance: 1000, interestRate: 2, minPayment: 100, dueDate: '2027-06-01' }, ana.token)).body.debt;
ok('otro usuario no puede ver ni editar la deuda de Ana (404)', (await call('PUT', `/deudas/${anaDebt.id}`, { name: 'Robada' }, beto.token)).status === 404);
ok('…ni pagarla', (await call('POST', '/pagos', { debtId: anaDebt.id, amount: 10 }, beto.token)).status === 404);
ok('…ni borrar su gasto', (await call('DELETE', `/gastos/${expense.id}`, undefined, beto.token)).status === 404);
ok('…ni su ingreso', (await call('DELETE', `/ingresos/${income.id}`, undefined, beto.token)).status === 404);
const betoCard = (await call('POST', '/tarjetas', { name: 'Visa', bank: 'Banco', creditLimit: 1000, interestRate: 2, dueDay: 5, cutDay: 20 }, beto.token)).body.card;
ok('…ni comprar con la tarjeta de otro (404)', (await call('POST', `/tarjetas/${betoCard.id}/compras`, { description: 'Algo', categoryId: ana.cat('Tecnología'), totalAmount: 10, installments: 1, date: today }, ana.token)).status === 404);

section('C2 / C4 · rutas eliminadas');
r = await call('POST', '/categorias', { name: 'Hack', type: 'EXPENSE' }, ana.token);
ok('un usuario no puede crear categorías (405)', r.status === 405);
r = await fetch(`${B}/seed`, { headers: KEY });
ok('/api/seed ya no existe (404)', r.status === 404);

section('C3 · /api/admin/setup');
ok('clave incorrecta → 403', (await fetch(`${B}/admin/setup`, { headers: { 'x-setup-key': 'incorrecta' } })).status === 403);
ok('la clave en la URL ya no sirve (403)', (await fetch(`${B}/admin/setup?key=${SEED_KEY}`)).status === 403);
ok('sin clave → 403', (await fetch(`${B}/admin/setup`)).status === 403);
ok('un usuario normal no entra al panel admin (403)', (await call('GET', '/admin/stats', undefined, ana.token)).status === 403);
adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
const changed = await call('PUT', '/auth/cambiar-password', { currentPassword: ADMIN_PASSWORD, newPassword: 'OtraClaveAdmin99' }, adminToken);
ok('el admin cambia su contraseña desde la app', changed.status === 200);
await fetch(`${B}/admin/setup`, { headers: KEY });
ok('volver a llamar a setup NO la sobrescribe', !!(await login(ADMIN_EMAIL, 'OtraClaveAdmin99')) && !(await login(ADMIN_EMAIL, ADMIN_PASSWORD)));
const reset = await (await fetch(`${B}/admin/setup?resetPassword=1`, { headers: KEY })).json();
ok('resetPassword=1 la devuelve al valor de ADMIN_PASSWORD', reset.passwordReset === true && !!(await login(ADMIN_EMAIL, ADMIN_PASSWORD)));
adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

section('Tokens');
const gets = ['/dashboard', '/cuentas', '/ingresos', '/gastos', '/deudas', '/tarjetas', '/alertas'];
const none = await Promise.all(gets.map((p) => call('GET', p)));
ok('sin token → 401 en todas las rutas', none.every((x) => x.status === 401), none.map((x) => x.status).join(','));
const garbage = await Promise.all(gets.map((p) => call('GET', p, undefined, 'esto.no.es.un.token')));
ok('token basura → 401', garbage.every((x) => x.status === 401));
const wrongKey = jwt.sign({ userId: 'x', tv: 0 }, 'otro-secreto-distinto-de-mas-de-32-caracteres');
ok('token firmado con otro secreto → 401', (await call('GET', '/dashboard', undefined, wrongKey)).status === 401);
const expired = jwt.sign({ userId: 'x', tv: 0 }, jwtSecret(), { expiresIn: -10 });
ok('token vencido → 401', (await call('GET', '/dashboard', undefined, expired)).status === 401);
const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ userId: 'x' })).toString('base64url')}.`;
ok('token sin firma (alg none) → 401', (await call('GET', '/dashboard', undefined, unsigned)).status === 401);

section('Login');
r = await call('POST', '/auth/login', { email: ana.email, password: 'incorrecta' });
const unknown = await call('POST', '/auth/login', { email: 'nadie@t.local', password: 'incorrecta' });
ok('contraseña mala y usuario inexistente dan la misma respuesta (no revela cuentas)', r.status === 401 && unknown.status === 401 && r.body.error === unknown.body.error, r.body.error);
r = await call('POST', '/auth/register', { name: 'Intruso', email: `intruso${Date.now()}@t.local`, password: 'secreto123', registrationKey: 'ZZZZZZ' });
ok('registrarse con una clave de acceso incorrecta → 403', r.status === 403);

console.log(`\n${fails === 0 ? 'TODO OK' : fails + ' FALLO(S)'}`);
process.exit(fails ? 1 : 0);
