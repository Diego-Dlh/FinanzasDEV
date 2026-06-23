# Auditoría Lumina Finance — 2026-06-23
> Rama: `agent/auditoria-20260623` | Auditor: Claude Code (agente)

---

## MAPA DEL ESTADO ACTUAL

### Stack
- **Framework**: Next.js 15 (App Router, server-side API routes)
- **Frontend**: React 18 + Tailwind CSS v4 + Lucide React v1.20.0 + Recharts
- **ORM**: Prisma 4 + PostgreSQL 15
- **Auth**: JWT en localStorage (7d) + bcrypt
- **Validación**: Zod v4 + React Hook Form v7
- **Deploy**: Docker Compose + Nginx en VPS (Hostinger Ubuntu 24.04)

### Rutas API (39 archivos)
```
/api/auth/login         POST  — login, retorna token + user
/api/auth/register      POST  — registro con registrationKey
/api/auth/cambiar-password PUT — cambio de contraseña
/api/dashboard          GET   — resumen financiero
/api/ingresos           GET,POST
/api/ingresos/[id]      PUT,DELETE
/api/gastos             GET,POST
/api/gastos/[id]        PUT,DELETE
/api/deudas             GET,POST
/api/deudas/[id]        PUT,DELETE
/api/presupuestos       GET,POST
/api/presupuestos/[id]  PUT,DELETE
/api/metas              GET,POST
/api/metas/[id]         PUT,DELETE
/api/pagos              GET,POST
/api/categorias         GET
/api/cuentas            GET,POST
/api/cuentas/[id]       PUT
/api/alertas            GET,PUT
/api/alertas/[id]       PUT,DELETE
/api/configuracion      GET,PUT
/api/historial          GET
/api/tarjetas           GET,POST
/api/tarjetas/[id]      GET,PUT,DELETE
/api/tarjetas/[id]/compras       GET,POST
/api/tarjetas/[id]/compras/[pid] DELETE
/api/tarjetas/[id]/abonos        GET,POST
/api/tarjetas/[id]/abonos/[pid]  DELETE
/api/admin/me           GET
/api/admin/stats        GET
/api/admin/usuarios     GET
/api/admin/usuarios/[id] DELETE
/api/admin/clave        GET,POST
/api/admin/categorias   GET,POST
/api/admin/categorias/[id] PUT,DELETE
/api/admin/cuentas      GET,POST
/api/admin/cuentas/[id] PUT,DELETE
/api/admin/setup        GET (protegido por SEED_KEY)
/api/health             GET
/api/seed               GET
/api/seed/categorias    GET
```

### Páginas
```
/           — Dashboard (health score, wealth card, cashflow, transacciones)
/cuentas    — Desglose de cuentas con toggle hideFromTotal
/ingresos   — CRUD ingresos
/gastos     — CRUD gastos + filtro por categoría
/deudas     — CRUD deudas + calculadora + tarjetas read-only
/presupuestos — Presupuestos + Metas financieras
/tarjetas   — CRUD tarjetas de crédito + compras + abonos
/historial  — Transacciones con filtros y charts
/ia         — IA local (sin LLM real)
/about      — Info del proyecto
/auth/login — Login
/auth/register — Registro con código de acceso
/admin      — Panel admin (standalone, sin sidebar)
```

### Modelos de datos
User, Account, Category (global), Income, Expense, Debt, Payment, Budget, Goal, Alert, Setting, CreditCard, CardPurchase, CardPayment, RegistrationKey

---

## DIAGNÓSTICO COMPLETO

### BUGS / INCOHERENCIAS

- [x] **B1**: `GET /api/ingresos`, `GET /api/gastos`, `GET /api/deudas`, `GET /api/presupuestos`, `GET /api/metas`, `GET /api/categorias` — **sin try/catch**. Si la DB falla retornan 500 con stack trace en lugar de array vacío. El CONTEXT.md dice que todas tienen try/catch pero es falso.
- [x] **B2**: `POST /api/ingresos` y `POST /api/gastos` — **sin validación Zod**. Extraen campos del body directamente sin validar. `POST /api/deudas`, `POST /api/cuentas`, `POST /api/tarjetas/[id]/compras` también carecen de validación.
- [x] **B3**: **Dashboard cashflow bug**: `recentIncomes` y `recentExpenses` se consultan con `take: 5`. Luego el cashflow de 7 días filtra esas 5 entradas por día. Si hay más de 5 transacciones recientes, el gráfico muestra datos incompletos.
- [x] **B4**: `DELETE /api/deudas/[id]` — **no usa transacción**. Hace `deleteMany(payments)` seguido de `delete(debt)` en secuencia. Si falla el segundo paso, los pagos ya están eliminados.
- [x] **B5**: `DELETE /api/tarjetas/[id]` — **no elimina `CardPayment`** antes de eliminar la tarjeta. Si la tarjeta tiene abonos, la eliminación puede fallar o dejar registros huérfanos.
- [x] **B6**: **`/api/demo-login` NO EXISTE** — el CONTEXT.md describe esta ruta y el botón "Acceso demo" en login, pero la ruta no existe y la página de login no tiene el botón. Esta funcionalidad está completamente ausente.
- [x] **B7**: `Account.currency` default en `schema.prisma` es `"USD"` pero la app opera en COP. Las cuentas creadas vía registro correcto usan `currency: 'COP'` explícitamente, pero un create manual sin `currency` usaría USD.
- [x] **B8**: `app/auth/login/page.tsx` línea 50: `bg-white` **hardcodeado** — viola la convención del proyecto de usar variables CSS del tema. En modo dark, el formulario de login quedará con fondo blanco.
- [x] **B9**: `POST /api/tarjetas/[id]/abonos` — **sin validación Zod**. Extrae `body.amount` con `Number(body.amount)` sin validar el schema completo.
- [ ] **B10**: `accountsCount` en dashboard devuelve el total de cuentas incluyendo las ocultas (`hideFromTotal: true`). La UI muestra "X cuentas activas" — debería ser el conteo de cuentas visibles.
- [ ] **B11**: Presupuesto `spent` es un campo estático — nunca se actualiza automáticamente. Si el usuario crea gastos, el presupuesto no refleja el gasto real. El usuario debe actualizar `spent` manualmente (no hay forma en la UI de hacerlo desde la página de gastos).

### SEGURIDAD

- [x] **S1**: **Sin validación en varios POST** — ver B2 y B9. Datos sin sanitizar llegan a Prisma, que protege de SQL injection pero no de datos maliciosos (strings vacíos, montos negativos, NaN).
- [ ] **S2**: **Sin rate limiting** en ningún endpoint. Login puede sufrir fuerza bruta sin restricción. **REVISAR CON HUMANO** — requiere middleware (Upstash Rate Limit, Nginx config, etc.).
- [ ] **S3**: JWT en `localStorage` — vulnerable a XSS. Alternativa: httpOnly cookie. **REVISAR CON HUMANO** — cambio de arquitectura significativo.
- [x] **S4**: `app/auth/login/page.tsx` formulario usa `bg-white` hardcodeado — bug cosmético pero indica que el form no fue testeado en dark mode.
- [ ] **S5**: `ADMIN_PASSWORD` fallback `'Dlh2026'` hardcodeado en `admin/setup/route.ts`. El código ya está en el repositorio. **REVISAR CON HUMANO** — las credenciales de producción deben estar siempre en variables de entorno; el fallback hardcodeado es riesgo si alguien usa la app con variables por defecto.
- [ ] **S6**: `/api/seed` y `/api/seed/categorias` solo protegidos por `SEED_KEY` en query param — exponer a internet sin más protección es riesgo menor pero aceptable si la clave es fuerte. **REVISAR CON HUMANO**.

### LÓGICA FALTANTE

- [x] **L1**: Crear ingreso/gasto **no actualiza el balance de la cuenta** origen. El balance solo cambia al pagar deudas o hacer abonos a tarjetas.
- [ ] **L2**: Editar o eliminar ingreso/gasto tampoco ajusta el balance. **REVISAR CON HUMANO** — decidir si se quiere balance histórico o en tiempo real.
- [ ] **L3**: `paidInstallments` en `CardPurchase` nunca se incrementa. El campo existe pero no hay lógica que lo actualice. **REVISAR CON HUMANO** — implicaciones en la lógica de pagos.
- [x] **L4**: `POST /api/ingresos` y `POST /api/gastos` — ausencia total de validación. Campos requeridos pueden llegar vacíos.
- [x] **L5**: **Demo login ausente** — funcionalidad prometida en CONTEXT.md inexistente.
- [ ] **L6**: **Sin paginación** en ninguna lista. Con cientos de registros, todo se carga en memoria y en el cliente. **REVISAR CON HUMANO** — decisión de arquitectura.
- [x] **L7**: `historial/route.ts` tiene try/catch implícito en el diseño (la ruta funciona) pero no retorna datos vacíos si la DB falla — lanza 500.

### UX / DISEÑO

- [x] **U1**: **Errores acumulados sin limpiar**: En varias páginas (ingresos, gastos, deudas, tarjetas), `setError(...)` se llama al fallar pero nunca se limpia al volver a intentar o al cerrar el modal.
- [x] **U2**: En `app/deudas/page.tsx`, `payError` no se limpia cuando se abre un modal de pago para una deuda diferente (solo se limpia al inicio de `openPayment`). Si hay error en el modal y el usuario lo cierra y abre otro, el error anterior podría reaparecer brevemente. *(Revisado: `setPayError('')` sí está en `openPayment`, es correcto)*
- [x] **U3**: Login formulario con `bg-white` hardcodeado — roto en dark mode.
- [ ] **U4**: En la página de ingresos, el resumen "Total mensual" solo suma ingresos con `frequency === 'MONTHLY'`. Un ingreso único de $5M no aparece en el resumen. Puede confundir al usuario. **Cosmético — anotar para el futuro**.
- [x] **U5**: El error de página (`error` state) permanece visible aunque el usuario ya corrigió el problema y realizó una acción exitosa. No hay `setError('')` al inicio de operaciones exitosas.

### PERFORMANCE

- [x] **P1**: Dashboard cashflow con `take:5` (ver B3). Solución: hacer query separada para cashflow sin límite, filtrada por fecha.
- [ ] **P2**: Sin índices DB en campos frecuentemente consultados como `userId`, `date`, `categoryId`. Prisma los infiere en FK pero para queries con `date: { gte, lte }`, un índice explícito en `date` aceleraría historial y dashboard. **REVISAR CON HUMANO** — requiere migración.

---

## PLAN DE IMPLEMENTACIÓN (priorizado)

### Alta prioridad
- [x] **B6 + L5**: Crear ruta `/api/demo-login` y botón en login
- [x] **B1**: Agregar try/catch a todos los GET sin protección
- [x] **B2 + S1 + L4**: Agregar validación Zod a `POST /api/ingresos`, `POST /api/gastos`, `POST /api/deudas`, `POST /api/cuentas`
- [x] **B3 + P1**: Corregir dashboard cashflow (eliminar `take:5` de los datos para cashflow)
- [x] **B4**: Hacer atómica la eliminación de deudas
- [x] **B5**: Incluir `CardPayment` en la eliminación de tarjetas
- [x] **B9 + S1**: Agregar validación Zod a `POST /api/tarjetas/[id]/abonos`
- [x] **U3 + B8**: Fix `bg-white` en login (usar `bg-surface`)
- [x] **U1 + U5**: Limpiar errores al iniciar operaciones o al carrar modales

### Media prioridad
- [x] **L1**: Crear lógica de actualización de balance en ingreso/gasto (incrementar/decrementar cuenta)
- [x] **B10**: Corregir `accountsCount` en dashboard
- [x] **B7**: Corregir default de `currency` en schema (o en el POST de cuentas)

### Anotar como REVISAR CON HUMANO
- S2: Rate limiting
- S3: JWT en cookie httpOnly
- S5: Admin password default hardcodeado
- L2: Editar/eliminar ingreso-gasto y su efecto en balance
- L3: paidInstallments logic
- L6: Paginación
- P2: Índices DB
- U4: Resumen total en ingresos (solo MONTHLY)

---

## LOG DE COMMITS

<!-- Se irá llenando -->

---

## RESUMEN FINAL

<!-- Se llenará al cierre -->
