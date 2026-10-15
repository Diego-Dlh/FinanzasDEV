# Auditoría completa — Lumina Finance (FinanzasDEV)

> **Fecha:** 2026-10-15 · **Rama:** `claude/repository-audit-uxrc25` · **Alcance:** todo el repositorio (rutas API, páginas y componentes, Prisma, Docker, Nginx, scripts de despliegue)
> **Método:** revisión estática de cada archivo, trazando flujos reales (usuario → API → BD) para confirmar cada hallazgo. No se ejecutaron `tsc`, `build` ni tests (el repo no tiene tests y el entorno no permitió ejecutar comandos).
> **Auditoría anterior:** `auditoria-lumina.md` (2026-06-23). Este documento la reemplaza como lista de trabajo; los pendientes de esa auditoría que siguen vigentes están incluidos aquí.

---

## 1. Resumen ejecutivo

| Severidad | Cantidad | Significado |
|-----------|----------|-------------|
| 🔴 **Crítica** | 7 | Seguridad explotable hoy o funcionalidad rota/engañosa en producción |
| 🟠 **Alta** | 15 | Corrupción de saldos, validación ausente en dinero, fechas mal mostradas a todos los usuarios |
| 🟡 **Media** | 26 | Errores 500 evitables, lógica financiera imprecisa, deuda técnica de infraestructura |
| 🟢 **Baja** | 12 | UX, consistencia de diseño, documentación |

**Lo más urgente (hacer esta semana):**
1. **C3/C4**: rotar la contraseña del admin, la `SEED_KEY` de Render y las contraseñas de usuarios reales que están en el repositorio. Hoy cualquiera que lea el repo puede tomar el control del panel admin en Render.
2. **C1**: cerrar el IDOR que permite modificar el saldo de cuentas de **otros usuarios** al editar un ingreso o gasto.
3. **C2**: impedir que cualquier usuario cree categorías globales.
4. **C5**: bloquear el `JWT_SECRET` de ejemplo en producción.
5. **C6**: las alertas automáticas de vencimiento **nunca se han ejecutado** (URL duplicada `/api/api/...`).

---

## 2. Hallazgos críticos 🔴

### C1 — IDOR: editar un ingreso/gasto permite mover dinero en cuentas de otro usuario
- **Archivos:** `app/api/ingresos/[id]/route.ts:24,43-44` · `app/api/gastos/[id]/route.ts:24,43-44`
- **Problema:** el `PUT` toma `accountId` del body y hace `account.update({ where: { id: newAccountId } })` **sin verificar que la cuenta pertenezca al usuario**. El `POST` sí lo valida, el `PUT` no.
- **Escenario:** el usuario A edita su ingreso con `accountId` = id de una cuenta del usuario B → el saldo de B se incrementa/decrementa y el ingreso de A queda ligado a la cuenta de B (que además aparecerá en el historial de A con el nombre de la cuenta de B).
- **Solución:** antes de la transacción, si `accountChanged`, validar `prisma.account.findFirst({ where: { id: newAccountId, userId } })` → 404 si no existe.

### C2 — Cualquier usuario puede crear categorías globales
- **Archivo:** `app/api/categorias/route.ts:18-28`
- **Problema:** `POST /api/categorias` solo exige estar autenticado. Las categorías son globales (compartidas por todos los usuarios), así que cualquier usuario puede inyectar categorías visibles para todos. Además no valida `type` ni duplicados → 500 por violación de unique o enum inválido.
- **Solución:** eliminar el `POST` (ya existe `POST /api/admin/categorias` protegido) o exigir `requireAdmin`.

### C3 — Toma de control del admin en Render con datos públicos del repo
- **Archivos:** `render.yaml:23-24` (`SEED_KEY` en texto plano), `app/api/admin/setup/route.ts:7,20-28`, `CONTEXT.md:417`, `README.md`
- **Problema:** la `SEED_KEY` de Render está en texto plano en el repo. `GET /api/admin/setup?key=...` **reescribe la contraseña del admin en cada llamada** con `ADMIN_PASSWORD ?? '<contraseña por defecto hardcodeada>'`, y esa contraseña por defecto también está documentada en `CONTEXT.md`.
- **Escenario:** un atacante llama `https://finanzasdev.onrender.com/api/admin/setup?key=<SEED_KEY de render.yaml>` → la contraseña del admin vuelve al valor por defecto publicado → inicia sesión como admin → puede borrar usuarios, ver la clave de registro, editar saldos.
- **Solución:**
  1. Rotar `SEED_KEY` en Render y usar `sync: false` / `generateValue: true` en `render.yaml`.
  2. Eliminar el fallback de contraseña hardcodeado: si falta `ADMIN_PASSWORD`, responder 500.
  3. `setup` solo debe **crear** el admin si no existe; nunca sobrescribir la contraseña de uno existente.
  4. Cambiar la contraseña del admin en todos los entornos.

### C4 — Credenciales de usuarios reales en el código y en la respuesta HTTP
- **Archivos:** `app/api/seed/route.ts:49,120,142,162-166`, `prisma/seed.ts`, `README.md:33-35`, `CONTEXT.md:12,417`
- **Problema:** contraseñas de `diego@`, `melissa@` y `alex@` están en el código, en el README y se devuelven en el JSON de `/api/seed`. `CONTEXT.md` también expone la IP del VPS y la contraseña del admin.
- **Solución:** cambiar esas contraseñas ya, quitar las credenciales del código y la documentación (usar variables de entorno o generarlas aleatoriamente), y no devolverlas en la respuesta. Considerar limpiar el historial de git (`git filter-repo`) si el repo es o será público (el roadmap habla de open source en v1.6).

### C5 — El `JWT_SECRET` de ejemplo no se bloquea en producción
- **Archivos:** `lib/auth.ts:7` vs `.env.example:20`
- **Problema:** `getJwtSecret()` solo rechaza `change_this_secret` y `super_secure_change_me`, pero el `.env.example` usa `CHANGE_ME_minimum_32_chars_random_string`. Si alguien copia el `.env.example` sin editarlo, la app arranca con un secreto público y cualquiera puede firmar un token con el `userId` de cualquier usuario (incluido el admin).
- **Solución:** en producción, rechazar cualquier secreto con `CHANGE_ME` o de menos de 32 caracteres.

### C6 — Las alertas automáticas de vencimiento nunca se ejecutan
- **Archivo:** `app/ClientLayout.tsx:18`
- **Problema:** `api.post('/api/alertas/auto', {})`, pero `lib/api.ts:14` ya antepone `/api` → la petición va a `/api/api/alertas/auto` → 404, silenciado por `.catch(() => {})`. La funcionalidad F3 de la auditoría anterior está rota desde que se integró.
- **Solución:** `api.post('/alertas/auto', {})`.

### C7 — El dashboard muestra datos falsos como reales cuando falla la BD
- **Archivo:** `app/api/dashboard/route.ts:158-160`
- **Problema:** ante cualquier error, el endpoint responde `MOCK_DASHBOARD` (saldo de $5.500.000, salario, arriendo…) con status 200. En producción, un usuario real ve un saldo inventado sin ninguna advertencia. En una app financiera esto es grave.
- **Solución:** responder 503 en producción y que la UI muestre un error; usar el mock solo cuando el usuario sea el demo (`userId === 'demo-user-id'`).

---

## 3. Hallazgos de severidad alta 🟠

### Integridad de saldos y dinero

**A1 — Condiciones de carrera en pagos y abonos (dobles cobros / saldos perdidos)**
- `app/api/pagos/route.ts:38-57,86` · `app/api/tarjetas/[id]/abonos/route.ts:40-59,98` · `app/api/tarjetas/[id]/abonos/[paymentId]/route.ts:26`
- Las validaciones (`amount ≤ saldo`) se hacen **fuera** de la transacción y el nuevo saldo de la deuda o tarjeta se calcula con un valor leído antes (`balance: newBalance`, una asignación absoluta en vez de `decrement`).
- **Escenario:** doble clic en "Pagar" → se crean dos pagos y la cuenta se debita dos veces, pero la deuda solo baja una vez (la segunda escritura pisa la primera con el mismo `newBalance`).
- **Solución:** usar `decrement`/`increment` y validar dentro de una transacción interactiva (o `updateMany` con `where: { balance: { gte: amount } }` y comprobar `count === 1`). En el cliente, deshabilitar el botón mientras se envía.

**A2 — Se pierde dinero al restaurar el saldo de una tarjeta (`Math.min` con el cupo)**
- `app/api/tarjetas/[id]/abonos/[paymentId]/route.ts:26` · `app/api/gastos/[id]/route.ts:88`
- Al eliminar un abono, `usedBalance = min(creditLimit, usedBalance + amount)`. Si la tarjeta está sobre el cupo o el cupo se redujo, parte del abono "desaparece" y la deuda queda subestimada.
- **Solución:** `usedBalance: { increment: amount }` sin recorte.

**A3 — Gastos generados por pagos/abonos se pueden editar y desincronizan todo**
- `app/api/gastos/[id]/route.ts` (PUT) · `app/gastos/page.tsx:107-118`
- Los gastos "Pago: …" y "Abono: …" son editables desde /gastos. Si se cambia el monto o la cuenta, el `Payment`/`CardPayment`, la deuda y la tarjeta no se actualizan. Al eliminar después el pago, se reembolsa el monto **original** a la cuenta **original** → los saldos quedan descuadrados para siempre.
- **Solución:** bloquear la edición (y mostrar un aviso) cuando el gasto tenga un pago vinculado, o propagar el cambio.

**A4 — `POST /api/tarjetas/[id]/compras` sin validación**
- `app/api/tarjetas/[id]/compras/route.ts:34-38`
- `cardPurchaseSchema` existe pero no se usa. Un `totalAmount` negativo **reduce** la deuda de la tarjeta; `NaN` causa 500; `categoryId` puede ser de tipo INCOME o no existir (500); no se valida el cupo disponible.
- **Solución:** `cardPurchaseSchema.safeParse`, validar la categoría (existe y es de tipo EXPENSE) y opcionalmente advertir si se supera el cupo.

**A5 — Eliminar una compra deja el `usedBalance` en negativo**
- `app/api/tarjetas/[id]/compras/[purchaseId]/route.ts:23`
- Se resta el `totalAmount` completo aunque ya haya abonos. Ejemplo: compra de 1.000.000, abono de 1.000.000 (usedBalance 0), se borra la compra → usedBalance = −1.000.000.
- **Solución:** no permitir saldo negativo (`Math.max(0, …)` dentro de la transacción) o impedir borrar compras cuando haya abonos posteriores.

**A6 — Tarjetas: `POST` y `PUT` sin validación**
- `app/api/tarjetas/route.ts:32-46` · `app/api/tarjetas/[id]/route.ts:36-48`
- `creditCardSchema` existe pero no se usa. `dueDay: 99`, `creditLimit: "abc"` (NaN → 500) o `name` vacío se aceptan.
- **Solución:** `creditCardSchema.safeParse` / `.partial()` en el PUT.

**A7 — `paidInstallments` nunca se actualiza y el pago mínimo crece sin límite**
- `app/tarjetas/page.tsx:58-64,221-228` (pendiente L3 de la auditoría anterior)
- `calcMinPayment` suma las cuotas de **todas** las compras porque ninguna aparece como pagada. Con el tiempo, el "pago mínimo" sugerido supera el saldo real y el abono propuesto por defecto es rechazado por el servidor ("no puede superar el saldo").
- **Solución mínima:** `minPayment = min(usedBalance, …)`. **Solución completa:** decidir la regla de negocio (por ejemplo, al hacer un abono, marcar cuotas como pagadas de la más antigua a la más reciente, o calcular las cuotas vigentes según la fecha de corte).

**A8 — Saldos de cuentas históricos sin conciliar**
- Pendiente de la auditoría anterior: los ingresos y gastos creados antes de la lógica de saldos no afectaron el `balance`. No hay un endpoint de recálculo.
- **Solución:** endpoint admin `POST /api/admin/recalcular-balances` (saldo inicial + ingresos − gastos), con previsualización antes de aplicar.

### Fechas y zona horaria (afectan a todos los usuarios)

**D1 — Todas las fechas se muestran un día antes**
- Las fechas `YYYY-MM-DD` se guardan como medianoche UTC (`new Date('2026-10-15')`) y se muestran con `toLocaleDateString` en el navegador, que en Colombia (UTC−5) las convierte a "14 oct".
- Afecta: `app/gastos/page.tsx:246`, `app/ingresos/page.tsx:252`, `app/page.tsx:192`, `app/historial/page.tsx:114,382`, `app/tarjetas/page.tsx:801,853`, `app/deudas/page.tsx:333`.
- **Solución:** crear un helper `fmtDate(d)` con `timeZone: 'UTC'` para fechas de calendario, o guardar las fechas a mediodía UTC.

**D2 — Fecha por defecto y "mes actual" incorrectos después de las 7 p. m.**
- `new Date().toISOString()` devuelve la fecha UTC: después de las 19:00 en Colombia, el formulario propone **mañana**, y el último día del mes el filtro abre en el **mes siguiente**.
- Afecta: `app/gastos/page.tsx:49,103`, `app/ingresos/page.tsx:48,106`, `app/tarjetas/page.tsx:184,226`, `app/historial/page.tsx:47,129`, `app/deudas/page.tsx:83`.
- **Solución:** helper `todayLocal()` con `getFullYear/getMonth/getDate`.

**D3 — Los cortes de mes del servidor usan UTC**
- `app/api/dashboard/route.ts:62-67,134-137`, `app/api/admin/stats/route.ts:10`
- El contenedor corre en UTC. Los pagos y abonos se guardan con `new Date()` (hora real), así que un pago hecho el 31 a las 20:00 en Colombia cuenta en el mes **siguiente**, y el gráfico de 7 días corta los días a las 19:00 hora local.
- **Solución:** `TZ=America/Bogota` en Docker/Render, o calcular los rangos con una zona horaria explícita (se recomienda guardar la zona horaria del usuario en `Setting`).

**D4 — Presupuestos: los gastos del día 1 caen en el mes anterior**
- `app/presupuestos/page.tsx:164-175`: compara medianoche UTC con el inicio de mes **local** del navegador → un gasto del 1 de octubre (00:00Z = 30 sep 19:00 COT) se excluye de octubre.

### Seguridad adicional

**S1 — Sesión expirada sin manejo (usuario atrapado)**
- `lib/api.ts:17` y `lib/hooks/useAuth.tsx`: si el JWT expira (7 días), todas las llamadas devuelven 401 pero el usuario sigue "logueado" con pantallas vacías o con errores. No hay un logout automático.
- **Solución:** en `request()`, si `res.status === 401` → borrar el token y redirigir a `/auth/login`.

**S2 — Los tokens siguen siendo válidos tras cambiar la contraseña o borrar al usuario**
- `lib/auth.ts:34-43`: `authenticateToken` no consulta la BD. Un token robado sigue siendo válido 7 días aunque se cambie la contraseña, y un usuario eliminado por el admin sigue haciendo peticiones (que fallan con errores de FK → 500).
- **Solución:** añadir `tokenVersion` (o `passwordChangedAt`) en `User` e incluirlo en el JWT; validarlo en las rutas sensibles.

**S3 — HSTS `preload` + certificado autofirmado = sitio inaccesible**
- `nginx/conf.d/app.conf:21-22,31`: con HSTS (`includeSubDomains; preload`) los navegadores **no permiten** saltarse el aviso del certificado autofirmado. Si un navegador ya recibió la cabecera, el sitio queda bloqueado para ese usuario durante 2 años.
- **Solución:** completar Let's Encrypt (pendiente v1.4) **antes** de enviar HSTS; mientras tanto, quitar `preload` y bajar `max-age`. Nota: el dominio de Nginx es `luminafi.xyz` y la documentación usa `luminafi.com`; hay que unificarlo.

---

## 4. Hallazgos de severidad media 🟡

### Validación y manejo de errores

| ID | Archivo(s) | Problema | Solución |
|----|-----------|----------|----------|
| **M1** | Todas las rutas con `await request.json()` | Un JSON mal formado lanza una excepción → 500 con traza | Helper `parseBody(request, schema)` que devuelva 400 |
| **M2** | `presupuestos/[id]:16-24`, `metas/[id]:16-26`, `cuentas/[id]:26-29`, `admin/cuentas/[id]:12-21` | `Number(body.x)` sin validar → `NaN` (500) o montos negativos; el PUT de presupuestos permite fijar `spent` | Usar `budgetSchema.partial()`, `goalSchema.partial()`, etc. |
| **M3** | `auth/login/route.ts:10`, `pagos/route.ts:30` | Devuelven `error: parse.error.flatten()` (un objeto) → el frontend muestra `[object Object]` | Devolver `issues[0].message` como el resto de rutas |
| **M4** | `ingresos/route.ts:34-47`, `gastos/route.ts:34-47` (y sus PUT) | `categoryId` no se valida: si no existe → 500; se puede guardar un gasto con una categoría de ingreso | Validar existencia y `type` |
| **M5** | GET de `alertas`, `tarjetas`, `tarjetas/[id]`, `compras`, `abonos`, `pagos`, `configuracion` y todas las rutas `admin/*` | Sin try/catch (contradice `CONTEXT.md`). El usuario demo recibe 500 en `/configuracion` porque el `upsert` falla por FK | Envolver en try/catch y unificar con un helper |
| **M6** | `auth/register/route.ts:14,22`, `auth/login/route.ts:14` | El email no se normaliza (`Diego@x.com` ≠ `diego@x.com`) → cuentas duplicadas o logins fallidos | `email.trim().toLowerCase()` en el schema (`z.string().email().toLowerCase()`) |
| **M7** | `auth/register/route.ts:22-48` | Condición de carrera en el email único → 500 en lugar de 409 | Capturar el error `P2002` de Prisma |
| **M8** | `validators.ts:38`, `deudas/[id]` | `balance` debe ser `positive()`: no se puede marcar una deuda en 0 al editarla; las deudas pagadas (saldo 0) se quedan listadas para siempre sin estado "pagada" | Permitir `min(0)` en el PUT y añadir estado/filtro de deudas saldadas |
| **M9** | `admin/cuentas/[id]:15-21`, `admin/categorias/[id]:20` | `update` sobre un id inexistente → 500 (no 404); `type` de cuenta sin validar | Validar con `findUnique` y un enum |
| **M10** | `pagos/route.ts:63-67`, `abonos/route.ts:66-70`, `admin/categorias/[id]` | Las categorías de sistema "Pago de Deuda" y "Abono Tarjeta" se buscan **por nombre**: si el admin las renombra se crean de nuevo; además el usuario puede elegirlas a mano en /gastos | Marcar categorías de sistema (`isSystem`), ocultarlas en los selectores y protegerlas de renombrado o borrado |
| **M11** | `api/seed/route.ts:18-37` | Usa `create` para las categorías: si ya se ejecutó `/api/seed/categorias`, el seed falla con un unique y queda **a medias** (no es transaccional). Los saldos sembrados no cuadran con los ingresos y gastos sembrados | Usar `upsert` + `$transaction`, o eliminar el endpoint de producción |

### Lógica financiera

| ID | Archivo(s) | Problema | Solución |
|----|-----------|----------|----------|
| **F1** | `dashboard/route.ts:105,112` | `netWorth = totalBalance − deuda`, pero `totalBalance` **excluye las cuentas ocultas** → el patrimonio baja cuando el usuario oculta una cuenta (p. ej. ahorros) | Calcular el patrimonio con todas las cuentas; ocultar solo afecta al "Saldo disponible" |
| **F2** | `dashboard/route.ts:5-30,82-83` | Salud financiera: si aún no hay ingresos del mes → score 30 "Mejorar", aunque el usuario tenga un salario `MONTHLY`. El campo `frequency` no se usa en ningún cálculo | Proyectar los recurrentes o usar el promedio de los últimos 3 meses |
| **F3** | `deudas/page.tsx:175`, `calculadoras/page.tsx:169,187,312` | La tasa anual se divide entre 12 (nominal), pero en Colombia las tasas se expresan como **E.A.** y la propia UI dice "Tasa efectiva anual" → la cuota calculada sale mal | `r = (1 + EA)^(1/12) − 1` |
| **F4** | `deudas/page.tsx:174` | Con tasa 0 % la calculadora no muestra nada (`!tasaRaw`), aunque el código contempla `r === 0` | Validar con `isNaN` en lugar de truthiness |
| **F5** | `calculadoras/page.tsx:95-98,151` | Interés compuesto con aportes: el aporte se capitaliza **por periodo de capitalización** (1 vez al año si es anual), pero el "capital aportado" asume 12 aportes al año → con capitalización anual, semestral o trimestral los intereses salen **negativos** | Simular mes a mes, o convertir la tasa a mensual efectiva |
| **F6** | `presupuestos/page.tsx:208-209` | Si no hay gastos de esa categoría en el mes, se muestra el `spent` guardado (valores viejos o del seed) en lugar de 0. La relación presupuesto↔categoría se hace por nombre (frágil) | Añadir `categoryId` a `Budget` y usar 0 como valor por defecto |
| **F7** | Modelo de datos | Las compras con tarjeta no aparecen en gastos, historial, presupuestos ni flujo de caja; solo se ve el abono (categoría "Abono Tarjeta"). El gasto real por categoría con tarjeta se pierde | Decisión de producto: contar las compras de tarjeta como gasto (en la fecha de compra) y los abonos como transferencias, no como gasto |
| **F8** | `alertas/auto/route.ts:55-58` | `dueDay` 29-31 en meses cortos: `new Date(2026, 1, 31)` = 3 de marzo → fecha de pago incorrecta | Limitar al último día del mes |
| **F9** | `alertas/auto/route.ts:26-28,32-34` | Deudas con `dueDate` vencida nunca generan alerta; `dueDate` es una sola fecha (no mensual); la ventana de deduplicación de 3 días repite la alerta 2-3 veces dentro de los 7 días; `Setting.notifications` se ignora en toda la app | Alerta única por ciclo de vencimiento; respetar `notifications`; alertar las deudas vencidas |

### Infraestructura

| ID | Archivo(s) | Problema | Solución |
|----|-----------|----------|----------|
| **I1** | `scripts/auto-deploy.sh`, `scripts/deploy.sh` | Cada push a `main` se despliega en 2 minutos **sin tests, sin typecheck y sin backup previo** a `prisma migrate deploy` | Ejecutar `backup.sh` antes de construir; CI con `tsc --noEmit` + lint antes de mergear |
| **I2** | `scripts/restore.sh:38-42` | `DROP DATABASE` con la app conectada falla ("is being accessed by other users") | `docker stop lumina_app` antes y `start` después |
| **I3** | `nginx/nginx.conf:43`, `app.conf:48-49` | Límite de la API: 30 req/min por IP. Una sola carga de página hace 3-5 llamadas (+ TopBar + tema + alertas); navegar rápido produce errores 429 | Subir a ~10 r/s con burst, y dejar el límite estricto solo para `/api/auth/` |
| **I4** | `prisma/schema.prisma` | Sin índices en `userId`/`date`; sin `onDelete: Cascade`; `Payment.accountId/expenseId` y `CardPayment.accountId/expenseId` sin relación FK (huérfanos posibles); `Account.currency @default("USD")` (pendiente B7); `RegistrationKey.code` sin unique | Migración con `@@index([userId, date])`, relaciones con FK y default `COP` |
| **I5** | `prisma/schema.prisma` | Montos en `Float` → errores de redondeo acumulados en sumas de saldos | `Decimal` o enteros (los COP no usan centavos) |
| **I6** | `package.json` | Prisma 4 (sin soporte); `eslint-config-next@16` con `next@15` (versiones desalineadas); `next lint` está deprecado; no hay script `typecheck` ni tests | Actualizar a Prisma 5/6, alinear eslint-config-next, añadir `"typecheck": "tsc --noEmit"` |

---

## 5. Hallazgos de severidad baja 🟢

| ID | Archivo(s) | Problema |
|----|-----------|----------|
| **B1** | `components/layout/topbar.tsx:63-80` | Las acciones de alertas (marcar o eliminar) no tienen try/catch → promesas rechazadas sin manejar y la UI se desincroniza |
| **B2** | `app/historial/page.tsx:95-108` | Errores silenciados; si se cambian los filtros rápido, una respuesta vieja puede pisar a una nueva (no hay `AbortController`) |
| **B3** | `app/historial/page.tsx:121-122` | CSV separado por comas: Excel en español (es-CO) espera `;` → todo cae en una sola columna. Riesgo de inyección de fórmulas si una descripción empieza por `=`, `+`, `-` o `@` |
| **B4** | `app/layout.tsx:12` | Se referencia `/manifest.json`, pero `public/` solo contiene `.gitkeep` → 404 en cada carga |
| **B5** | `app/calculadoras/page.tsx` | Página huérfana: no aparece en el sidebar ni en el bottomnav |
| **B6** | `app/auth/login/page.tsx:122-130` | El botón "Acceso demo" se muestra en producción aunque la ruta responde 403. El demo entrega `isAdmin: true` a la UI (el backend lo rechaza, pero muestra el botón de admin) |
| **B7** | `app/page.tsx:105,107`, `presupuestos/page.tsx:217-218`, `historial/page.tsx:82` | Colores hardcodeados (`#e4e2e4`, `#006e2a`, `bg-amber-50`, `PIE_COLORS`) que rompen la convención y el modo oscuro |
| **B8** | `lib/hooks/useTheme.tsx:15-31` | El tema solo se sincroniza al montar la app; tras hacer login con otro usuario se mantiene el del anterior hasta recargar |
| **B9** | Formularios con `valueAsNumber` | Un monto vacío produce `NaN` y el mensaje de Zod sale en inglés ("Expected number, received nan") |
| **B10** | `lib/adminAuth.ts:14` | `generateKey` usa `Math.random` (no criptográfico); 6 caracteres sin límite de usos ni expiración |
| **B11** | `nginx/conf.d/app.conf`, `next.config.mjs` | Sin `Content-Security-Policy`; `X-XSS-Protection` está obsoleto. Las claves `?key=SEED_KEY` quedan registradas en los access logs de Nginx |
| **B12** | `CONTEXT.md` | Varias afirmaciones no coinciden con el código (todas las GET con try/catch, compras validadas, etc.) y contiene secretos (ver C4). Debe actualizarse después de las correcciones |

---

## 6. Plan de solución (lista de trabajo)

> Orden recomendado: cada fase se puede entregar en un PR independiente. Marca `[x]` al completar.

### Fase 0 — Acciones manuales inmediatas (sin código)
- [ ] Cambiar la contraseña del admin en VPS y Render.
- [ ] Rotar `SEED_KEY` en Render (y en el VPS si coincide).
- [ ] Cambiar las contraseñas de `diego@`, `melissa@` y `alex@` (o eliminar los usuarios de prueba en producción).
- [ ] Verificar que el `JWT_SECRET` de producción no sea el del `.env.example`; si hay dudas, rotarlo (cierra todas las sesiones).
- [ ] Verificar si Render define `NODE_ENV=production` (si no, `/api/demo-login` está habilitado allí).

### Fase 1 — Seguridad crítica (PR 1)
- [x] **C1** Validar la propiedad de `accountId` en el PUT de ingresos y gastos.
- [x] **C2** Eliminar o proteger `POST /api/categorias` (eliminado; queda `POST /api/admin/categorias`).
- [x] **C3** `admin/setup`: sin contraseña por defecto, sin sobrescribir la contraseña existente (salvo `resetPassword=1`); `render.yaml` sin `SEED_KEY` en claro.
- [x] **C4** Quitar credenciales de `prisma/seed.ts`, `README.md` y `CONTEXT.md`; `/api/seed` eliminado (también resuelve **M11**).
- [x] **C5** Endurecer `getJwtSecret()` (bloquear `CHANGE_ME` y longitudes < 32); la app no arranca con un secreto inválido.
- [x] **S1** Manejo de 401 en `lib/api.ts` y en el panel admin → logout automático.
- [ ] **Pendiente manual:** las credenciales antiguas siguen en el **historial de git**. Rótalas (Fase 0) y, si el repo será público, límpialo con `git filter-repo`.

### Fase 2 — Funcionalidad rota y datos engañosos (PR 2)
- [ ] **C6** Corregir la URL de `/alertas/auto`.
- [ ] **C7** Quitar el mock del dashboard en producción (mantenerlo solo para el demo).
- [ ] **D1** Helper `fmtDate` con `timeZone: 'UTC'` en todas las vistas.
- [ ] **D2** Helper `todayLocal()` / `currentMonthLocal()` para valores por defecto y filtros.
- [ ] **D3** `TZ=America/Bogota` en Dockerfile/compose/Render (o rangos con zona horaria explícita).
- [ ] **D4** Corregir la comparación de mes en presupuestos.

### Fase 3 — Integridad de saldos (PR 3)
- [ ] **A1** Pagos y abonos atómicos (validación dentro de la transacción + `increment`/`decrement`); deshabilitar el botón al enviar.
- [ ] **A2** Quitar el recorte `Math.min(creditLimit, …)` al restaurar abonos.
- [ ] **A3** Bloquear la edición de gastos vinculados a pagos o abonos.
- [ ] **A4** Validar `POST compras` con `cardPurchaseSchema` y la categoría.
- [ ] **A5** Evitar `usedBalance` negativo al borrar compras.
- [ ] **A6** Validar `POST`/`PUT` de tarjetas con `creditCardSchema`.
- [ ] **A7** Limitar el pago mínimo sugerido a `usedBalance` y definir la regla de `paidInstallments`.
- [ ] **M10** Marcar las categorías de sistema y ocultarlas en los selectores.

### Fase 4 — Robustez de la API (PR 4)
- [ ] **M1** Helper `parseBody` para JSON inválido → 400.
- [ ] **M2** Validación Zod en los PUT de presupuestos, metas, cuentas y admin/cuentas.
- [ ] **M3** Formato de error uniforme (`string`).
- [ ] **M4** Validar `categoryId` (existe y su tipo es correcto).
- [ ] **M5** try/catch en los GET restantes.
- [ ] **M6** Normalizar el email.
- [ ] **M7** Capturar `P2002` en el registro.
- [ ] **M8** Permitir saldo 0 en deudas y añadir estado "pagada".
- [ ] **M9** 404 correcto en las rutas admin.
- [ ] **S2** `tokenVersion` para invalidar sesiones al cambiar la contraseña o borrar al usuario.

### Fase 5 — Lógica financiera (PR 5)
- [ ] **F1** Patrimonio con todas las cuentas.
- [ ] **F2** Salud financiera con ingresos recurrentes o promedio.
- [ ] **F3/F4** Conversión de E.A. a tasa mensual y soporte para tasa 0 %.
- [ ] **F5** Corregir la calculadora de interés compuesto con aportes.
- [ ] **F6** `Budget.categoryId` y gasto por defecto 0.
- [ ] **F8/F9** Fechas de vencimiento correctas, deudas vencidas, respetar `notifications`.
- [ ] **A8** Endpoint de recálculo de saldos.
- [ ] **F7** (decisión de producto) Cómo contar las compras con tarjeta.

### Fase 6 — Infraestructura y base de datos (PR 6)
- [ ] **S3** Let's Encrypt; HSTS sin `preload` hasta tener un certificado válido; unificar el dominio.
- [ ] **I1** Backup antes del deploy + CI (typecheck + lint).
- [ ] **I2** `restore.sh` detiene la app antes de restaurar.
- [ ] **I3** Ajustar los límites de Nginx.
- [ ] **I4** Migración: índices, FKs, `currency` COP, unique en `RegistrationKey.code`.
- [ ] **I5** (planificar) Montos en `Decimal`/enteros.
- [ ] **I6** Actualizar Prisma y alinear ESLint; añadir el script `typecheck`.
- [ ] **M11** Seed idempotente o deshabilitado en producción.

### Fase 7 — UX y pulido (PR 7)
- [ ] **B1** try/catch en las acciones de alertas.
- [ ] **B2** `AbortController` en historial y mostrar errores.
- [ ] **B3** CSV con `;` y escape de fórmulas.
- [ ] **B4** Crear `public/manifest.json` o quitar la referencia.
- [ ] **B5** Enlazar `/calculadoras` en la navegación o eliminarla.
- [ ] **B6** Ocultar el botón demo en producción; demo con `isAdmin: false`.
- [ ] **B7** Reemplazar los colores hardcodeados por tokens del tema.
- [ ] **B8** Resincronizar el tema al hacer login o logout.
- [ ] **B9** Mensajes en español para `NaN`.
- [ ] **B10** `crypto.randomInt` en `generateKey`.
- [ ] **B11** Añadir CSP; pasar `SEED_KEY` por header en vez de query string.
- [ ] **B12** Actualizar `CONTEXT.md` sin secretos.

### Recomendación transversal — Tests
No existe ninguna prueba automatizada. Priorizar tests de integración (Vitest + BD de prueba) para los flujos de dinero: crear, editar y eliminar ingresos y gastos; pagos y abonos (incluyendo dos peticiones concurrentes); eliminar deudas y tarjetas en modo "cerrar" y "eliminar". Esos flujos concentran la mayoría de los bugs de este informe.
