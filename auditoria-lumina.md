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

| Hash | Mensaje |
|------|---------|
| `14dd973` | docs: auditoría inicial — mapa de estado y plan de mejoras |
| `454da81` | feat: agregar ruta demo-login y botón acceso demo en login |
| `688b689` | fix: validación Zod, try/catch y correcciones de integridad en API routes |
| `60dd441` | ui: limpiar estado de error al iniciar acciones y mejorar mensajes |
| `b596374` | fix: PUT y DELETE de ingresos/gastos ahora ajustan balance de cuenta |
| `6a2c64e` | fix: corregir errores de tipos TypeScript (tsc --noEmit limpio) |

---

## RESUMEN FINAL

### Qué encontramos

La app tiene una arquitectura sólida y un diseño de calidad. Sin embargo, en el estado previo a esta auditoría:

1. **17 rutas API sin try/catch** en sus GETs — cualquier fallo de DB retornaba 500 con stack trace.
2. **5 endpoints POST sin validación Zod** — datos maliciosos o incompletos llegaban directamente a Prisma.
3. **El botón "Acceso demo" y la ruta `/api/demo-login`** prometidos en el CONTEXT.md no existían.
4. **Bug en el cashflow del dashboard**: `recentIncomes/Expenses` tenían `take: 5`, haciendo que el gráfico de 7 días perdiera datos si había más de 5 transacciones.
5. **2 DELETE sin transacción atómica**: deudas (pagos + deuda en secuencia) y tarjetas (no eliminaba CardPayments).
6. **El balance de cuentas nunca se actualizaba** al crear/editar/eliminar ingresos y gastos.
7. **`accountsCount` en dashboard** incluía cuentas ocultas (`hideFromTotal: true`).
8. **`bg-white` hardcodeado** en el formulario de login — roto en dark mode.
9. **Errores de estado** no se limpiaban al re-intentar acciones en páginas de ingresos, gastos, deudas y tarjetas.

### Qué mejoramos (6 commits, todos en `agent/auditoria-20260623`)

1. **feat**: Ruta `GET /api/demo-login` + botón en login page (con separador visual) + corrección `bg-white → bg-surface-container`.
2. **fix** (API routes masivo):
   - try/catch en GET de ingresos, gastos, deudas, presupuestos, metas, categorias, historial
   - Validación Zod en POST de ingresos, gastos, deudas, presupuestos, metas, abonos, cuentas
   - POST ingresos/gastos actualiza atomicamente el balance de la cuenta (increment/decrement)
   - Dashboard cashflow: query separada sin límite `take`
   - Dashboard `accountsCount`: solo cuentas con `hideFromTotal: false`
   - Dashboard: try/catch con fallback a MOCK_DASHBOARD
   - DELETE deudas: $transaction atómica
   - DELETE tarjetas: incluye CardPayments y CardPurchases en la transacción
   - Validación de enum en POST cuentas (AccountType)
   - Currency default 'COP' en POST cuentas
3. **ui**: `setError('')` al inicio de cada submit/delete en 4 páginas de CRUD.
4. **fix** (balance): PUT y DELETE de ingresos/gastos ajustan balance de cuenta (con lógica para cambio de monto y/o cambio de cuenta).
5. **fix** (TypeScript): Todos los errores de tipos corregidos. `npx tsc --noEmit` pasa limpio.

### Qué decidimos NO hacer (REVISAR CON HUMANO)

| Item | Razón |
|------|-------|
| **Rate limiting en login/register** | Requiere decisión de infraestructura: Upstash, Nginx, middleware propio. No implementar sin coordinar con el dueño del VPS. |
| **JWT → httpOnly cookie** | Cambio de arquitectura significativo. Afecta toda la capa de auth, el demo mode y las llamadas API del cliente. |
| **Password admin default 'Dlh2026'** | Está en código fuente. No tocamos credenciales; el usuario debe setear `ADMIN_PASSWORD` en `.env` antes de producción. |
| **Ajuste de balance para datos históricos** | Los ingresos/gastos creados antes de esta auditoría no afectaron el balance. La corrección de datos existentes requiere una migración coordinada con el usuario. |
| **`paidInstallments` en CardPurchase** | La lógica de cuotas pagadas implica decisiones de negocio no especificadas (¿se incrementa por abono parcial? ¿proporcional?). |
| **Paginación de listas** | App personal con pocos usuarios; no urgente. Anotar para cuando supere 500+ registros por usuario. |
| **Índices DB explícitos en `date`** | Requiere migración. Evaluar cuando el historial supere decenas de miles de registros. |
| **`spent` en Budget auto-sync** | Requiere diseño: ¿qué gastos cuentan para qué presupuesto? La app no tiene una relación Budget↔Expense. Anotar para v2. |

### Recomendaciones para el futuro

1. **Migración de balance**: Crear un endpoint `GET /api/admin/recalcular-balances?key=SEED_KEY` que recorra todos los ingresos/gastos históricos y corrija los balances de las cuentas de cada usuario.
2. **Rate limiting**: Agregar `X-RateLimit` en Nginx para `/api/auth/login` y `/api/auth/register` (máximo 10 req/min por IP).
3. **SSL**: Completar la configuración Let's Encrypt con certbot para HTTPS en producción.
4. **IA real**: Integrar Claude API (`claude-haiku-4-5-20251001`) en `/ia` para análisis financiero real.
5. **Tests**: Agregar jest + @testing-library/react para los componentes críticos (formularios, modales de pago).

---

## FASE 2.5 — NUEVAS FUNCIONALIDADES (2026-06-23)

> Evaluación como product engineer: ¿qué agrega valor real a una app de finanzas colombiana?
> Criterios: **VALOR** (alto/medio/bajo) · **ESFUERZO** (alto/medio/bajo) · **ENCAJE** (sí/no)
> Regla de corte: VALOR ≥ medio + ESFUERZO ≤ medio + ENCAJE sí → INTEGRAR

### Tabla de evaluación

| # | Candidata | VALOR | ESFUERZO | ENCAJE | Decisión | Razón |
|---|-----------|-------|----------|--------|----------|-------|
| F1 | Filtros avanzados en /ingresos y /gastos (búsqueda texto + mes) | Alto | Bajo | Sí | **INTEGRAR** | Las páginas actuales muestran todo sin filtrar; agregar buscador y selector de mes es cambio puramente de UI state, sin tocar API |
| F2 | Exportar movimientos a CSV desde /historial | Alto | Bajo | Sí | **INTEGRAR** | Los contadores y el DIAN exigen registros descargables; la implementación es pure-frontend (Blob + anchor download), sin dependencias nuevas |
| F3 | Alertas automáticas de vencimiento de deudas y tarjetas | Alto | Medio | Sí | **INTEGRAR** | Colombia cobra intereses de mora muy punitivoss; detectar deudas/tarjetas que vencen en 7 días y crear alertas via el sistema ya existente agrega recordatorio pasivo de alto valor |
| F4 | Análisis visual de gastos por categoría en /gastos (donut chart) | Medio | Bajo | Sí | **Descartada** | /historial ya tiene este gráfico con mejor contexto (filtros de período); duplicarlo en /gastos sería redundante |
| F5 | Duplicar / clonar transacciones | Bajo | Bajo | Sí | **Descartada** | Valor marginal; la frecuencia MONTHLY ya sirve para recurrentes; el esfuerzo es bajo pero el valor no justifica el scope |
| F6 | Buscador global (búsqueda desde cualquier página) | Medio | Alto | Sí | **Descartada** | Requiere índice de texto completo en DB o lógica de búsqueda federada entre modelos; scope demasiado amplio para el valor relativo |
| F7 | Recuperación de contraseña por email | Alto | Alto | Parcial | **REVISAR CON HUMANO** | Valor alto para usuarios reales; requiere servicio de email (Nodemailer + SMTP / SendGrid), tokens de reset en DB, y nueva página — cambio de infraestructura no trivial |
| F8 | 2FA / historial de sesiones | Alto | Alto | No | **Descartada** | Cambio de arquitectura de autenticación completo; no encaja con el JWT-en-localStorage actual sin un rediseño significativo |
| F9 | TRM del día (Tasa Representativa del Mercado, Banco de la República) | Medio | Bajo | Sí | **Descartada** | Útil solo para usuarios que cobran en USD; nicho pequeño en el contexto de la app; fácil de agregar más adelante como widget en dashboard |
| F10 | Proyección de transacciones recurrentes (auto-generar MONTHLY/WEEKLY) | Alto | Alto | Sí | **REVISAR CON HUMANO** | El schema tiene `frequency` pero auto-generar requiere un cron job (o lógica de "proyección virtual"), decisiones de negocio sobre cutoff de fechas, y manejo de duplicados — no implementar a medias |
| F11 | Resumen mensual exportable (estado de cuenta en PDF) | Medio | Alto | Sí | **Descartada** | PDF requiere librería pesada (puppeteer/jsPDF) y layout especial; el CSV de F2 cubre la necesidad básica de exportación |
| F12 | Métricas de uso en panel admin (gráficos de actividad por usuario) | Medio | Medio | Sí | **Descartada** | Admin ya tiene stats básicas (usuarios, clave activa); métricas avanzadas tienen valor bajo en fase actual con pocos usuarios |
| F13 | Ordenamiento de listas (por monto, fecha, categoría) | Medio | Bajo | Sí | **Descartada** | F1 (filtros) cubre la mayoría del problema de "encontrar algo específico"; el ordenamiento es mejora de segundo orden |
| F14 | Importar transacciones desde CSV/Excel | Alto | Alto | Sí | **REVISAR CON HUMANO** | Altamente demandado por usuarios con historial en otras apps; requiere parser de CSV, mapeo de columnas, validación masiva y manejo de duplicados — no implementar a medias |
| F15 | Vista de calendario de transacciones | Medio | Alto | Sí | **Descartada** | /historial ya cubre la narrativa temporal; un calendario completo requiere librería especializada y no agrega valor proporcional al esfuerzo |

### Funciones seleccionadas para integrar

| ID | Función | Estado |
|----|---------|--------|
| F1 | Filtros avanzados en /ingresos y /gastos | ✅ Integrada |
| F2 | Exportar CSV desde /historial | ✅ Integrada |
| F3 | Alertas automáticas de vencimiento | ✅ Integrada |

### Para REVISAR CON HUMANO (no implementadas)

| Candidata | Propuesta de abordaje |
|-----------|----------------------|
| **Recuperación de contraseña** | 1) Agregar modelo `PasswordReset { token, userId, expiresAt }` en schema. 2) `POST /api/auth/reset-request` genera token + envía email (Nodemailer con SMTP de Gmail/Resend). 3) `POST /api/auth/reset-confirm` valida token y actualiza password. 4) Página `/auth/reset/[token]`. Coordinar credenciales SMTP antes de implementar. |
| **Proyección de recurrentes** | Decidir modelo: ¿"transacciones virtuales" que se muestran pero no se persisten?, ¿o auto-creación real con job? Recomiendo mostrar proyección visual en /presupuestos sin persistir. Requiere diseño de UX antes de tocar código. |
| **Importar desde CSV** | Definir formato de columnas esperado (Fecha, Tipo, Descripción, Monto, Categoría, Cuenta). Implementar parser con `PapaParse`. Agregar página `/importar` con preview antes de confirmar. Mínimo 2 sesiones de trabajo. |

---

### LOG DE IMPLEMENTACIÓN FASE 2.5

| Commit | Función | Archivos |
|--------|---------|---------|
| `429edfa` | F1: Filtros avanzados (búsqueda texto + selector mes) | `app/ingresos/page.tsx`, `app/gastos/page.tsx` |
| `5e1faa8` | F2: Exportar CSV desde historial | `app/historial/page.tsx` |
| `a0d1bfb` | F3: Alertas automáticas de vencimiento | `app/api/alertas/auto/route.ts`, `app/ClientLayout.tsx` |

