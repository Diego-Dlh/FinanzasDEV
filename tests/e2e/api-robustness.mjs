// API robustness: sessions, JSON/validation errors, emails, admin routes (audit phase 4)
import jwt from 'jsonwebtoken';
import { API as B, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_KEY, ensureSeeded, jwtSecret } from './lib.mjs';
await ensureSeeded();
const SECRET = jwtSecret();
let fails = 0;
const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? '✓' : '✗'} ${name}${extra !== '' ? ' — ' + extra : ''}`); };
const call = async (method, path, body, tk) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await r.text();
  let json = {}; try { json = JSON.parse(text); } catch {}
  return { status: r.status, body: json, text };
};
const count = (rs, s) => rs.filter((r) => r.status === s).length;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const section = (t) => console.log(`\n== ${t}`);

// ── setup ────────────────────────────────────────────────────────────────────
const login = async (email, password) => (await call('POST', '/auth/login', { email, password })).body.token;
let adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
const regKey = async () => (await call('GET', '/admin/clave', undefined, adminToken)).body.key.code;
let n = 0;
const newUser = async (password = 'secreto123') => {
  const email = `p4u${Date.now()}${n++}@t.local`;
  const r = await call('POST', '/auth/register', { name: 'Test User', email, password, registrationKey: await regKey() });
  const token = await login(email, password);
  return { email, password, token, id: r.body.id };
};

// ── S2: sesiones ─────────────────────────────────────────────────────────────
section('S2 · cambiar contraseña invalida las demás sesiones');
const u = await newUser();
const T1 = u.token;
const T1b = await login(u.email, u.password); // segundo dispositivo
ok('ambas sesiones funcionan antes del cambio', (await call('GET', '/dashboard', undefined, T1)).status === 200 && (await call('GET', '/dashboard', undefined, T1b)).status === 200);
let r = await call('PUT', '/auth/cambiar-password', { currentPassword: 'incorrecta', newPassword: 'nuevaclave1' }, T1);
ok('contraseña actual incorrecta → 400 y la sesión sigue activa', r.status === 400 && (await call('GET', '/dashboard', undefined, T1)).status === 200, r.body.error);
r = await call('PUT', '/auth/cambiar-password', { currentPassword: 'secreto123', newPassword: 'abc' }, T1);
ok('nueva contraseña corta → 400 con mensaje', r.status === 400 && typeof r.body.error === 'string', r.body.error);
r = await call('PUT', '/auth/cambiar-password', {}, T1);
ok('sin datos → 400', r.status === 400 && typeof r.body.error === 'string', r.body.error);
r = await call('PUT', '/auth/cambiar-password', { currentPassword: 'secreto123', newPassword: 'nuevaclave1' }, T1);
const T2 = r.body.token;
ok('cambio correcto → 200 y devuelve token nuevo', r.status === 200 && typeof T2 === 'string' && T2 !== T1);
ok('el token anterior queda invalidado (401)', (await call('GET', '/dashboard', undefined, T1)).status === 401);
ok('la sesión del otro dispositivo también (401)', (await call('GET', '/cuentas', undefined, T1b)).status === 401);
ok('el token nuevo funciona (este dispositivo sigue dentro)', (await call('GET', '/dashboard', undefined, T2)).status === 200);
ok('la contraseña vieja ya no entra', (await call('POST', '/auth/login', { email: u.email, password: 'secreto123' })).status === 401);
const T3 = await login(u.email, 'nuevaclave1');
ok('la nueva contraseña entra y su token vale', !!T3 && (await call('GET', '/dashboard', undefined, T3)).status === 200);

section('S2 · compatibilidad, usuario eliminado y reset de admin');
const legacyUser = await newUser();
const legacy = jwt.sign({ userId: legacyUser.id }, SECRET, { expiresIn: '1h' }); // token anterior a este cambio: sin claim `tv`
ok('token emitido antes de S2 (sin `tv`) sigue valiendo', (await call('GET', '/dashboard', undefined, legacy)).status === 200);
await call('PUT', '/auth/cambiar-password', { currentPassword: 'secreto123', newPassword: 'otraclave99' }, legacyUser.token);
ok('…y deja de valer tras cambiar la contraseña', (await call('GET', '/dashboard', undefined, legacy)).status === 401);
const forged = jwt.sign({ userId: u.id, tv: 99 }, SECRET, { expiresIn: '1h' });
ok('token con versión que no corresponde → 401', (await call('GET', '/dashboard', undefined, forged)).status === 401);
const wrongSecret = jwt.sign({ userId: u.id, tv: 1 }, 'otro-secreto-de-mas-de-32-caracteres-xxxx');
ok('token firmado con otro secreto → 401', (await call('GET', '/dashboard', undefined, wrongSecret)).status === 401);
const victim = await newUser();
r = await call('DELETE', `/admin/usuarios/${victim.id}`, undefined, adminToken);
ok('admin elimina al usuario', r.status === 200);
const afterDelete = await Promise.all(['/cuentas', '/ingresos', '/gastos', '/tarjetas', '/alertas'].map((p) => call('GET', p, undefined, victim.token)));
ok('usuario eliminado: su token da 401 en todo (antes: 500 o listas vacías)', afterDelete.every((x) => x.status === 401), afterDelete.map((x) => x.status).join(','));
const demoToken = jwt.sign({ userId: 'demo-user-id', tv: 0 }, SECRET, { expiresIn: '1h' });
r = await call('GET', '/dashboard', undefined, demoToken);
ok('el usuario demo sigue funcionando sin fila en la BD', r.status === 200 && r.body.totalBalance === 5_500_000);
const adminBefore = adminToken;
r = await call('GET', `/admin/setup?key=${SEED_KEY}&resetPassword=1`);
ok('resetPassword=1 responde ok', r.body.passwordReset === true);
ok('…e invalida las sesiones previas del admin', (await call('GET', '/admin/me', undefined, adminBefore)).status === 403 || (await call('GET', '/admin/stats', undefined, adminBefore)).status === 403);
adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
ok('el admin vuelve a entrar con ADMIN_PASSWORD', (await call('GET', '/admin/stats', undefined, adminToken)).status === 200);

// ── M1: JSON inválido ────────────────────────────────────────────────────────
section('M1 · JSON inválido → 400 en todas las rutas con cuerpo');
const t = (await newUser()).token;
const accs = (await call('GET', '/cuentas', undefined, t)).body.accounts;
const acc0 = accs[0].id;
const cats = (await call('GET', '/categorias', undefined, t)).body.categories;
const cat = (nm) => cats.find((c) => c.name === nm).id;
const mk = async (path, body) => (await call('POST', path, body, t)).body;
const budget = (await mk('/presupuestos', { name: 'Comida', allocated: 100_000, categoryId: cat('Alimentación') })).budget;
const goal = (await mk('/metas', { title: 'Viaje', description: 'Vacaciones', targetAmount: 1_000_000, currentAmount: 500, targetDate: '2027-06-01' })).goal;
const debt = (await mk('/deudas', { name: 'Préstamo', entity: 'Banco', balance: 100_000, interestRate: 2, minPayment: 10_000, dueDate: '2027-01-01' })).debt;
const income = (await mk('/ingresos', { name: 'Sueldo', amount: 50_000, categoryId: cat('Salario'), accountId: acc0, date: today, frequency: 'ONE_TIME' })).income;
const adminAcc = (await call('GET', `/admin/cuentas?userId=${(await call('GET', '/admin/usuarios', undefined, adminToken)).body.users.find((x) => x.email.startsWith('admin')).id}`, undefined, adminToken)).body.accounts[0];
const bad = '{"esto no es json';
const jsonCases = [
  ['POST', '/auth/login', ''], ['POST', '/auth/register', ''], ['PUT', '/auth/cambiar-password', t],
  ['POST', '/cuentas', t], ['PUT', `/cuentas/${acc0}`, t], ['POST', '/ingresos', t], ['PUT', `/ingresos/${income.id}`, t],
  ['POST', '/deudas', t], ['PUT', `/deudas/${debt.id}`, t], ['POST', '/presupuestos', t], ['PUT', `/presupuestos/${budget.id}`, t],
  ['POST', '/metas', t], ['PUT', `/metas/${goal.id}`, t], ['PUT', '/configuracion', t], ['PUT', '/alertas', t],
  ['POST', '/admin/cuentas', adminToken], ['PUT', `/admin/cuentas/${adminAcc.id}`, adminToken], ['POST', '/admin/categorias', adminToken],
];
const jsonResults = [];
for (const [m, p, tk] of jsonCases) jsonResults.push([m, p, await call(m, p, bad, tk || undefined)]);
const notOk = jsonResults.filter(([, , x]) => x.status !== 400 || typeof x.body.error !== 'string');
ok(`${jsonCases.length} rutas rechazan JSON inválido con 400 y mensaje`, notOk.length === 0, notOk.map(([m, p, x]) => `${m} ${p} → ${x.status}`).join('; '));

// ── M2 / M3: validación ──────────────────────────────────────────────────────
section('M2 · PUT/POST con validación');
const put = (p, b, tk = t) => call('PUT', p, b, tk);
const post = (p, b, tk = t) => call('POST', p, b, tk);
for (const [name, body] of [['allocated "abc"', { allocated: 'abc' }], ['allocated negativo', { allocated: -5 }], ['nombre de 1 letra', { name: 'X' }]]) {
  r = await put(`/presupuestos/${budget.id}`, body); ok(`presupuesto: rechaza ${name}`, r.status === 400, r.body.error);
}
r = await put(`/presupuestos/${budget.id}`, { spent: 999, allocated: 5000 });
const bAfter = (await call('GET', '/presupuestos', undefined, t)).body.budgets.find((x) => x.id === budget.id);
ok('presupuesto: `spent` se ignora y `allocated` se actualiza', r.status === 200 && bAfter.spent === 0 && bAfter.allocated === 5000, `spent=${bAfter.spent} allocated=${bAfter.allocated}`);
for (const [name, body] of [['currentAmount negativo', { currentAmount: -1 }], ['targetDate 31-feb', { targetDate: '2026-02-31' }], ['targetAmount 0', { targetAmount: 0 }], ['título de 1 letra', { title: 'x' }]]) {
  r = await put(`/metas/${goal.id}`, body); ok(`meta: rechaza ${name}`, r.status === 400, r.body.error);
}
r = await put(`/metas/${goal.id}`, { title: 'Viaje a Europa' });
ok('meta: editar solo el título NO reinicia currentAmount (trampa de zod 4)', r.status === 200 && r.body.goal.currentAmount === 500 && r.body.goal.title === 'Viaje a Europa', `currentAmount=${r.body.goal?.currentAmount}`);
r = await put(`/metas/${goal.id}`, { currentAmount: 750 });
ok('meta: registrar progreso (solo currentAmount)', r.status === 200 && r.body.goal.currentAmount === 750 && r.body.goal.title === 'Viaje a Europa');
r = await post('/metas', { title: 'Sin monto', description: 'ok ok', targetAmount: 1000, targetDate: '2027-01-01' });
ok('meta: crear sin currentAmount usa 0', r.status === 201 && r.body.goal.currentAmount === 0);
r = await post('/metas', { title: 'Sin fecha', description: 'ok ok', targetAmount: 1000, targetDate: '' });
ok('meta: fecha vacía → "La fecha es requerida"', r.status === 400 && /requerida/.test(r.body.error), r.body.error);
for (const [name, body] of [['balance "abc"', { balance: 'abc' }], ['nombre vacío', { name: '' }], ['hideFromTotal "yes"', { hideFromTotal: 'yes' }], ['moneda "pesos"', { currency: 'pesos' }], ['balance Infinity', { balance: 1e999 }]]) {
  r = await put(`/cuentas/${acc0}`, body); ok(`cuenta: rechaza ${name}`, r.status === 400, r.body.error);
}
r = await put(`/cuentas/${acc0}`, { hideFromTotal: true });
ok('cuenta: solo hideFromTotal no toca el resto', r.status === 200 && r.body.account.hideFromTotal === true && r.body.account.name === accs[0].name && r.body.account.currency === accs[0].currency);
r = await put(`/cuentas/${acc0}`, { name: 'Renombrada', balance: 123, currency: 'usd' });
ok('cuenta: renombrar, saldo y moneda (normalizada a USD)', r.status === 200 && r.body.account.name === 'Renombrada' && r.body.account.balance === 123 && r.body.account.currency === 'USD');
await put(`/cuentas/${acc0}`, { currency: 'COP', hideFromTotal: false });
for (const [name, body] of [['tipo inválido', { name: 'X', type: 'XXX' }], ['sin tipo', { name: 'X' }], ['balance "abc"', { name: 'X', type: 'CASH', balance: 'abc' }], ['sin nombre', { type: 'CASH' }]]) {
  r = await post('/cuentas', body); ok(`crear cuenta: rechaza ${name}`, r.status === 400, r.body.error);
}
r = await post('/cuentas', { name: 'Bolsillo', type: 'CASH' });
ok('crear cuenta mínima → 201 con balance 0 y moneda COP', r.status === 201 && r.body.account.balance === 0 && r.body.account.currency === 'COP');
section('M2 · configuración y fechas');
r = await put('/configuracion', { darkMode: 'false' });
ok('configuración: "false" (texto) ya no se interpreta como true', r.status === 400, r.body.error);
r = await put('/configuracion', { darkMode: true });
ok('configuración: booleano real → 200', r.status === 200 && r.body.setting.darkMode === true && r.body.setting.notifications === true);
ok('configuración: GET refleja el cambio', (await call('GET', '/configuracion', undefined, t)).body.setting.darkMode === true);
r = await put('/configuracion', {});
ok('configuración: {} no cambia nada', r.status === 200 && r.body.setting.darkMode === true);
r = await post('/ingresos', { name: 'Raro', amount: 1000, categoryId: cat('Salario'), accountId: acc0, date: '2026-13-45', frequency: 'ONE_TIME' });
ok('ingreso con fecha 2026-13-45 → 400 (antes: 500)', r.status === 400, r.body.error);
r = await put(`/deudas/${debt.id}`, { dueDate: 'abc' });
ok('deuda con fecha "abc" → 400 (antes: 500)', r.status === 400, r.body.error);

section('M3 · errores siempre como texto');
r = await call('POST', '/auth/login', { email: 'no-es-email', password: 'x' });
ok('login con email inválido: error es un texto', r.status === 400 && r.body.error === 'Correo inválido', JSON.stringify(r.body.error));
r = await call('POST', '/auth/login', { email: 'a@b.co', password: '' });
ok('login sin contraseña: error es un texto', r.status === 400 && typeof r.body.error === 'string', r.body.error);
r = await call('POST', '/pagos', { debtId: '', amount: -1 }, t);
ok('pagos inválidos: error es un texto', r.status === 400 && typeof r.body.error === 'string', JSON.stringify(r.body.error));

// ── M6 / M7: emails ──────────────────────────────────────────────────────────
section('M6/M7 · emails y registro concurrente');
const mixed = `Mixed.Case${Date.now()}@T.Local`;
r = await call('POST', '/auth/register', { name: 'Mixta Caso', email: `  ${mixed}  `, password: 'secreto123', registrationKey: await regKey() });
ok('registro con mayúsculas y espacios guarda el email en minúsculas', r.status === 201 && r.body.email === mixed.toLowerCase(), r.body.email);
ok('login con otra combinación de mayúsculas funciona', !!(await login(mixed.toUpperCase(), 'secreto123')));
r = await call('POST', '/auth/register', { name: 'Otra', email: mixed.toLowerCase(), password: 'secreto123', registrationKey: await regKey() });
ok('registrar el mismo correo con otra capitalización → 409', r.status === 409, r.body.error);
const race = `carrera${Date.now()}@t.local`;
const key = await regKey();
rs = await Promise.all(Array.from({ length: 6 }, () => call('POST', '/auth/register', { name: 'Carrera Test', email: race, password: 'secreto123', registrationKey: key })));
ok('6 registros simultáneos del mismo correo: 1 creado, 5 conflictos, ningún 500', count(rs, 201) === 1 && count(rs, 409) === 5 && count(rs, 500) === 0, rs.map((x) => x.status).join(','));
var rs;

// ── M8: deuda saldada ────────────────────────────────────────────────────────
section('M8 · deudas con saldo 0');
r = await post('/deudas', { name: 'Cero', entity: 'Banco', balance: 0, interestRate: 1, minPayment: 100, dueDate: '2027-01-01' });
ok('crear una deuda con saldo 0 → 400', r.status === 400, r.body.error);
r = await put(`/deudas/${debt.id}`, { balance: -1 });
ok('editar con saldo negativo → 400', r.status === 400, r.body.error);
r = await put(`/deudas/${debt.id}`, { balance: 0 });
ok('editar la deuda a saldo 0 (saldada) → 200', r.status === 200 && r.body.debt.balance === 0, r.body.error);
ok('el dashboard ya no cuenta esa deuda', (await call('GET', '/dashboard', undefined, t)).body.totalDebt === 0);
r = await post('/pagos', { debtId: debt.id, amount: 1000 });
ok('pagar una deuda saldada → 400', r.status === 400, r.body.error);

// ── M9: admin ────────────────────────────────────────────────────────────────
section('M9 · rutas de admin');
const A = (m, p, b) => call(m, p, b, adminToken);
r = await A('PUT', '/admin/cuentas/no-existe', { name: 'X', type: 'CASH', balance: 0 });
ok('PUT cuenta inexistente → 404 (antes: 500)', r.status === 404, r.body.error);
r = await A('DELETE', '/admin/cuentas/no-existe');
ok('DELETE cuenta inexistente → 404', r.status === 404);
r = await A('PUT', '/admin/categorias/no-existe', { name: 'Zzz' });
ok('PUT categoría inexistente → 404', r.status === 404);
r = await A('DELETE', '/admin/categorias/no-existe');
ok('DELETE categoría inexistente → 404', r.status === 404);
r = await A('DELETE', '/admin/usuarios/no-existe');
ok('DELETE usuario inexistente → 404', r.status === 404);
const uid = (await call('GET', '/admin/usuarios', undefined, adminToken)).body.users.find((x) => x.email.startsWith('admin')).id;
for (const [name, body] of [['tipo inválido', { userId: uid, name: 'X', type: 'ZZZ' }], ['sin tipo', { userId: uid, name: 'X' }], ['balance "abc"', { userId: uid, name: 'X', type: 'CASH', balance: 'abc' }], ['sin userId', { name: 'X', type: 'CASH' }], ['nombre vacío', { userId: uid, name: '  ', type: 'CASH' }]]) {
  r = await A('POST', '/admin/cuentas', body); ok(`admin crear cuenta: rechaza ${name}`, r.status === 400, r.body.error);
}
r = await A('POST', '/admin/cuentas', { userId: 'no-existe', name: 'X', type: 'CASH' });
ok('admin crear cuenta para usuario inexistente → 404', r.status === 404);
r = await A('POST', '/admin/cuentas', { userId: uid, name: ' Caja menor ', type: 'CASH' });
ok('admin crear cuenta mínima → 201, nombre recortado, COP', r.status === 201 && r.body.account.name === 'Caja menor' && r.body.account.currency === 'COP' && r.body.account.balance === 0);
const newAccId = r.body.account.id;
r = await A('PUT', `/admin/cuentas/${newAccId}`, { name: 'Caja', type: 'ZZZ', balance: 5 });
ok('admin editar con tipo inválido → 400 (antes: 500)', r.status === 400, r.body.error);
r = await A('PUT', `/admin/cuentas/${newAccId}`, { name: 'Caja', type: 'BANK', balance: 'abc' });
ok('admin editar con saldo "abc" → 400 (antes: NaN → 500)', r.status === 400, r.body.error);
r = await A('PUT', `/admin/cuentas/${newAccId}`, { name: 'Caja', type: 'BANK', balance: 2500 });
ok('admin editar válido → 200', r.status === 200 && r.body.account.type === 'BANK' && r.body.account.balance === 2500);

// ── M5: errores inesperados y sin sesión ─────────────────────────────────────
section('M5 · sin sesión y errores controlados');
const noAuthGets = ['/dashboard', '/ingresos', '/gastos', '/deudas', '/presupuestos', '/metas', '/categorias', '/cuentas', '/alertas', '/configuracion', '/historial', '/tarjetas', '/pagos'];
const na = await Promise.all(noAuthGets.map((p) => call('GET', p)));
ok(`${noAuthGets.length} GET sin token → 401 con JSON`, na.every((x) => x.status === 401 && typeof x.body.error === 'string'), na.map((x) => x.status).join(','));
const adminGets = ['/admin/me', '/admin/stats', '/admin/usuarios', '/admin/clave', '/admin/categorias', '/admin/cuentas'];
const ag = await Promise.all(adminGets.map((p) => call('GET', p, undefined, t)));
ok('rutas admin con un usuario normal → 403', ag.every((x) => x.status === 403), ag.map((x) => x.status).join(','));
const del4 = await Promise.all(Array.from({ length: 4 }, () => call('DELETE', `/ingresos/${income.id}`, undefined, t)));
ok('4 DELETE simultáneos del mismo ingreso: 1 ok y 3 not found (antes: 500)', count(del4, 200) === 1 && count(del4, 404) === 3 && count(del4, 500) === 0, del4.map((x) => x.status).join(','));
const balAfterDeletes = (await call('GET', '/cuentas', undefined, t)).body.accounts.find((a) => a.id === acc0).balance;
ok('…y el saldo se descontó una sola vez (123 − 50.000)', balAfterDeletes === 123 - 50_000, `saldo=${balAfterDeletes}`);
ok('todas las respuestas de error son JSON', [...del4, ...na, ...ag].every((x) => x.text.trim().startsWith('{')));

console.log(`\n${fails === 0 ? 'TODO OK' : fails + ' FALLO(S)'}`);
process.exit(fails ? 1 : 0);
