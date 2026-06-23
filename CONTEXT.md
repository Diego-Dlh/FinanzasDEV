# LUMINA FINANCE — CONTEXTO COMPLETO DEL PROYECTO

> Última actualización: 2026-06-23 (sesión 3). Documento de referencia para continuar desarrollo en nuevas sesiones de Claude.

---

## 1. Identidad del proyecto

- **Nombre:** Lumina Finance
- **Descripción:** App de finanzas personales premium en español, orientada al mercado colombiano (moneda COP)
- **Repo GitHub:** https://github.com/Diego-Dlh/FinanzasDEV
- **VPS producción:** 31.97.138.41 (Hostinger, Ubuntu 24.04)
- **Ruta en VPS:** `/opt/lumina`
- **Backup/staging Render:** https://finanzasdev.onrender.com
- **package.json name:** `finanzasdev`

---

## 2. Stack técnico

| Paquete | Versión |
|---------|---------|
| next | ^15.5.19 |
| react | ^18.3.1 |
| typescript | ^5.4.5 |
| tailwindcss | ^4.3.1 |
| prisma | ^4.15.0 |
| @prisma/client | ^4.15.0 |
| react-hook-form | ^7.79.0 |
| @hookform/resolvers | ^5.4.0 |
| zod | ^4.4.3 |
| jsonwebtoken | ^9.0.3 |
| bcrypt | ^6.0.0 |
| lucide-react | ^1.20.0 |
| recharts | ^3.8.1 |

**IMPORTANTE lucide-react v1.20.0:** El ícono `Github` NO existe. Usar `ExternalLink` como alternativa para links externos.

**Infraestructura:** PostgreSQL 15-alpine · Docker Compose · Nginx 1.25-alpine · Node >=20

---

## 3. Sistema de diseño

### Tailwind CSS v4
- `globals.css`: usa `@import "tailwindcss"` (NO directivas v3)
- Colores custom en bloque `@theme {}` con variables `--color-*`
- `tailwind.config.ts` solo define `content` paths

### Colores principales
- **Secondary** (acción principal): `#006e2a` (verde)
- **Primary**: `#4a6fa5` (navy)
- **Error/Tertiary**: `#ba1a1a` (rojo)
- **Surface**: `#fbf9fb`

### Dark mode
- Activado con clase `html.dark`
- `globals.css` tiene bloque `html.dark {}` que sobreescribe todas las CSS vars de surface/on-surface
- Anti-FOUC: `<script>` síncrono al inicio de `<body>` en layout.tsx lee localStorage antes del paint
- `ThemeProvider` en `lib/hooks/useTheme.tsx` sincroniza con `Setting.darkMode` de la DB (con `.catch(() => {})` — no rompe sin DB)

### Componentes UI (`components/ui/`)
- **`field.tsx`**: `Input`, `SelectField`, `Field`, `FieldLabel`, `FieldError`, `Btn`
- **`modal.tsx`**: Modal con props `title`, `subtitle?`, `onClose`. Fondo `bg-surface` (tema-aware, NO hardcodeado). Cierra con Escape, bloquea scroll
- **`spinner.tsx`**: `Spinner`, `PageSpinner`
- **`toast.tsx`**: `ToastProvider`, `useToast()`. Toasts apilables (máx 3), auto-dismiss 3.5s, slide-up. Variante `success` (secondary-container) y `error` (error-container). Posición: `bottom-24 right-4` mobile / `bottom-6 right-6` desktop

### Clases CSS custom
- `.glass-card` — fondo semitransparente con blur
- `.shadow-card` — sombra suave
- `.no-scrollbar` — oculta scrollbar

### IMPORTANTE: No usar colores hardcodeados
Usar siempre variables CSS del tema: `bg-surface`, `bg-surface-container`, `bg-surface-container-high`, `text-on-surface`, `text-on-surface-variant`, `border-outline-variant/20`, etc. Nunca `bg-white`, `text-white`, `bg-[#0f1117]`.

---

## 4. Autenticación

- Token JWT en `localStorage.auth_token` (expira 7d)
- Usuario en `localStorage.auth_user` (JSON) — incluye `isAdmin?: boolean`
- `lib/auth.ts`: `hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, `authenticateToken`
- `lib/adminAuth.ts`: `requireAdmin(authHeader)` — verifica userId + `isAdmin: true` en DB; `generateKey()` — genera código 6 chars alfanumérico sin ambiguos (sin 0/O, 1/I)
- `lib/hooks/useAuth.tsx`: `AuthProvider`, `useAuth()`, `useProtected()`
  - `AuthUser = { id, name, email, isAdmin?: boolean }`
- `lib/hooks/useTheme.tsx`: `ThemeProvider`, `useTheme()` — lee localStorage + sincroniza con DB

### Login API
`POST /api/auth/login` retorna `{ token, user: { id, name, email, isAdmin } }` — `isAdmin` se persiste en localStorage.

### `app/providers.tsx`
```tsx
<AuthProvider>
  <ThemeProvider>
    <ToastProvider>{children}</ToastProvider>
  </ThemeProvider>
</AuthProvider>
```

### `app/layout.tsx`
```tsx
<body>
  <script dangerouslySetInnerHTML={{ /* anti-FOUC dark mode */ }} />
  <Providers>
    <ClientLayout>{children}</ClientLayout>
  </Providers>
</body>
```

### `app/ClientLayout.tsx` (`'use client'`)
- Si ruta es `/admin/*` o `/auth/*`: renderiza children directo (sin sidebar, sin padding)
- Resto: `<Sidebar />` + `<div className="lg:pl-60">{children}</div>`

---

## 5. Layout y navegación

### `components/layout/topbar.tsx` (`'use client'`)
- Fixed, `left-0 w-full lg:left-60 lg:w-[calc(100%-240px)]`
- Avatar click → Settings modal
  - **Si `user?.isAdmin`**: botón "Panel de Administrador" (Shield icon) arriba del perfil → navega a `/admin`
  - Perfil, dark mode toggle, cambiar contraseña
- Bell con badge rojo de no leídas → Notifications modal
- Notifications modal: marcar todas como leídas, marcar una, eliminar

### `components/layout/sidebar.tsx` (`'use client'`)
- `hidden lg:flex` — solo visible en desktop (≥1024px)
- Fixed, `w-60` (240px), `left-0 top-0 h-full`
- Logo Lumina Finance + **9 nav items** con iconos
- Item activo: `bg-secondary-container text-on-secondary-container`

### `components/layout/bottomnav.tsx` (`'use client'`)
- `lg:hidden` — solo visible en mobile
- `overflow-x-auto no-scrollbar` (scroll horizontal para 9 items)
- Items con `shrink-0`

### Ítems de navegación (sidebar y bottomnav — 9 items)
```
/ → Inicio (Home)
/historial → Historial (History)
/ingresos → Ingresos (TrendingUp)
/gastos → Gastos (TrendingDown)
/deudas → Deudas (Landmark)
/presupuestos → Metas (Target)
/tarjetas → Tarjetas (CreditCard)
/ia → IA (MoreHorizontal)
/about → Acerca de (Info)
```

### Páginas — layout responsivo
- `<main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">`
- `<section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">`
- `pb-32` = espacio para BottomNav en mobile; `lg:pb-12` en desktop
- `max-w-2xl` en mobile; `lg:max-w-5xl` en desktop

---

## 6. Base de datos (Prisma schema completo)

**Archivo:** `prisma/schema.prisma`
**binaryTargets:** `["native", "linux-musl-openssl-3.0.x"]`

### Enums
```prisma
enum Frequency { DAILY | WEEKLY | MONTHLY | ONE_TIME }
enum EntryType { INCOME | EXPENSE }
enum AccountType { CASH | BANK | NEQUI | DAVIPLATA | CARD }
```

### Modelos

**`User`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| name | String | |
| email | String @unique | |
| password | String | bcrypt |
| isAdmin | Boolean @default(false) | Panel admin |
| createdAt / updatedAt | DateTime | |
| Relaciones | incomes, expenses, debts, budgets, goals, payments, accounts, alerts, settings?, creditCards, cardPurchases, cardPayments | |

**`Account`** — type: CASH/BANK/NEQUI/DAVIPLATA/CARD · currency default "COP" · `hideFromTotal Boolean @default(false)` — si true, la cuenta se excluye del Saldo Disponible en dashboard y `/cuentas`

**`Category`** — global (sin userId), todos comparten el catálogo · Relaciones: incomes[], expenses[], cardPurchases[]

**`Income`** — campos: name, amount, date, frequency · FK: userId, accountId, categoryId

**`Expense`** — campos: description (no "name"), amount, date, frequency · FK: userId, accountId, categoryId

**`Debt`** — campos: name, entity, balance, interestRate, minPayment, dueDate · Relación: payments Payment[]

**`Payment`** — FK: userId, debtId · campos: amount, paidAt

**`Budget`** — campos: name, allocated, spent (default 0)

**`Goal`** — campos: title, description, targetAmount, currentAmount (default 0), targetDate

**`Alert`** — campos: message, type (string), read (default false)

**`Setting`** — 1:1 con User · campos: darkMode (default false), notifications (default true)

**`CreditCard`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id | |
| userId | String | FK User |
| name | String | "Visa Platinum" |
| bank | String | "Bancolombia" |
| creditLimit | Float | |
| usedBalance | Float @default(0) | Suma de compras |
| interestRate | Float | Tasa mensual % |
| dueDay | Int | Día vencimiento |
| cutDay | Int | Día corte |
| currency | String @default("COP") | |
| Relaciones | purchases CardPurchase[], payments CardPayment[] | |

**`CardPurchase`**
| Campo | Tipo |
|-------|------|
| description | String |
| totalAmount | Float |
| installments | Int @default(1) |
| installmentAmt | Float |
| paidInstallments | Int @default(0) |
| date | DateTime |
| FK | userId, cardId, categoryId |

**`CardPayment`** (abonos a tarjetas)
| Campo | Tipo |
|-------|------|
| amount | Float |
| note | String? |
| paidAt | DateTime @default(now()) |
| FK | userId, cardId |

**`RegistrationKey`** (control de registro)
| Campo | Tipo | Nota |
|-------|------|------|
| code | String | 6 chars alfanumérico |
| active | Boolean @default(true) | Solo uno activo a la vez |
| createdAt | DateTime | |

### Migraciones aplicadas
```
20260617210000_add_credit_cards          → CreditCard + CardPurchase
20260621000000_add_card_payments         → CardPayment
20260622000001_add_admin                 → User.isAdmin + RegistrationKey
20260622000002_account_hide_from_total   → Account.hideFromTotal Boolean DEFAULT false
```

---

## 7. API Routes (todas)

Todas requieren `Authorization: Bearer <token>` excepto donde se indica.
**Todas las rutas GET tienen try/catch** — retornan datos vacíos (o mock) si la DB no está disponible.

### Autenticación
| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/auth/register` | POST | No | Valida `registrationKey` contra clave activa en DB. Crea user + 3 cuentas + Setting + Alert bienvenida |
| `/api/auth/login` | POST | No | Retorna `{ token, user: { id, name, email, isAdmin } }` |
| `/api/auth/cambiar-password` | PUT | Sí | Verifica `currentPassword`, hashea `newPassword`, actualiza |
| `/api/demo-login` | GET | No | **Solo desarrollo** (bloqueado en NODE_ENV=production). Genera JWT para usuario demo sin DB. Retorna `{ token, user: { id: 'demo-user-id', name: 'Diego Demo', email: 'demo@luminafi.com', isAdmin: true } }` |

### Dashboard
| Ruta | Descripción |
|------|-------------|
| `GET /api/dashboard` | totalBalance (solo cuentas con `hideFromTotal: false`), monthlyIncome, monthlyExpenses, totalDebt (deudas + tarjetas), netWorth, healthScore, transactions (últimas 6), cashFlow (7 días), accountsCount. **Si DB falla → retorna MOCK_DASHBOARD con datos de ejemplo en COP** |

### Ingresos / Gastos / Deudas / Presupuestos / Metas / Categorías
GET de cada ruta retorna array vacío si DB no disponible.

### Cuentas
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/cuentas` | GET | Lista cuentas del usuario. Si DB falla → `{ accounts: [] }` |
| `POST /api/cuentas` | POST | Crea cuenta |
| `PUT /api/cuentas/[id]` | PUT | Actualiza cuenta. Body: `{ hideFromTotal?: boolean }` — solo campos enviados se actualizan. Valida que la cuenta pertenezca al userId antes de actualizar |

### Alertas
| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/alertas` | GET | Lista alertas + unreadCount. Si DB falla → `{ alerts: [], unreadCount: 0 }` |
| `/api/alertas` | PUT | Body `{ markAllRead: true }` → marca todas como leídas |
| `/api/alertas/[id]` | PUT | Marca alerta individual como leída |
| `/api/alertas/[id]` | DELETE | Elimina alerta |

### Configuración
| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/configuracion` | GET | Upsert Setting. Si DB falla → `{ setting: { darkMode: false, notifications: true } }` |
| `/api/configuracion` | PUT | Actualiza darkMode y/o notifications |

### Tarjetas de Crédito
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/tarjetas` | GET | Lista tarjetas con purchases + payments. Si DB falla → `{ cards: [] }` |
| `POST /api/tarjetas` | POST | Crea tarjeta |
| `GET/PUT/DELETE /api/tarjetas/[id]` | — | CRUD individual |
| `GET/POST /api/tarjetas/[id]/compras` | — | Lista / crea compra |
| `DELETE /api/tarjetas/[id]/compras/[purchaseId]` | — | Elimina compra, decrementa usedBalance |
| `GET /api/tarjetas/[id]/abonos` | GET | Lista abonos de la tarjeta |
| `POST /api/tarjetas/[id]/abonos` | POST | Registra abono: decrementa usedBalance. Body: `{ amount, note?, paidAt, accountId? }`. Valida: amount ≤ usedBalance; si accountId → amount ≤ account.balance. Si accountId → decrementa account.balance en la misma $transaction |
| `DELETE /api/tarjetas/[id]/abonos/[paymentId]` | DELETE | Elimina abono, restaura usedBalance |

### Historial
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/historial` | GET | Query params: `from`, `to`, `type`, `categoryId`. Si DB falla → vacío |

### Admin (requieren isAdmin: true en DB)
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/admin/me` | GET | Verifica si usuario es admin |
| `GET /api/admin/stats` | GET | totalUsers, newThisMonth, activeKey |
| `GET /api/admin/usuarios` | GET | Lista todos los usuarios con _count {incomes, expenses} |
| `DELETE /api/admin/usuarios/[id]` | DELETE | Elimina usuario + todos sus datos en cascada ($transaction). No puede eliminar admins ni a sí mismo |
| `GET /api/admin/clave` | GET | Obtiene clave de registro activa |
| `POST /api/admin/clave` | POST | Genera nueva clave (desactiva anteriores) |
| `GET /api/admin/categorias` | GET | Lista todas las categorías globales con `_count {incomes, expenses, cardPurchases}` |
| `POST /api/admin/categorias` | POST | Crea categoría global. Body: `{ name, type: 'INCOME'|'EXPENSE' }` |
| `PUT /api/admin/categorias/[id]` | PUT | Renombra categoría. Body: `{ name }` |
| `DELETE /api/admin/categorias/[id]` | DELETE | Elimina si no está en uso (verifica _count). Error 409 si hay registros |
| `GET /api/admin/cuentas?userId=` | GET | Lista cuentas de un usuario con `_count {incomes, expenses}` |
| `POST /api/admin/cuentas` | POST | Crea cuenta para un usuario. Body: `{ userId, name, type, balance, currency }` |
| `PUT /api/admin/cuentas/[id]` | PUT | Edita cuenta. Body: `{ name, type, balance, currency }` |
| `DELETE /api/admin/cuentas/[id]` | DELETE | Elimina si no tiene transacciones. Error 409 si hay registros |
| `GET /api/admin/setup` | GET | Query: `?key=SEED_KEY`. Idempotente. Crea/actualiza admin@luminafi.com con isAdmin:true |

### Pagos de deudas
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/pagos` | GET | Lista pagos, filtro opcional `?debtId=` |
| `POST /api/pagos` | POST | Registra pago. Body: `{ debtId, amount, accountId? }`. Valida: amount ≤ debt.balance; si accountId → amount ≤ account.balance. Si accountId → decrementa account.balance en la misma $transaction |

### Utilidades
| Ruta | Descripción |
|------|-------------|
| `GET /api/health` | Prueba DB con SELECT 1 |
| `GET /api/seed?key=SEED_KEY` | Seed inicial (idempotente) |
| `GET /api/seed/categorias?key=SEED_KEY` | Upsert idempotente de categorías |

---

## 8. Páginas (todas)

### `/` — Dashboard
- Health score SVG circular, **Wealth card** gradiente negro siempre oscuro (clickeable → `/cuentas`), **3** overview cards scroll horizontal (Ingresos, Gastos, Total Deuda — **Patrimonio eliminado**), CashFlow chart, transacciones recientes
- **Wealth card:** usa `text-white/70` para labels (NUNCA `text-on-primary-container` — en modo claro esa variable es oscura y queda ilegible sobre fondo negro)
- **totalBalance** solo suma cuentas con `hideFromTotal: false`
- **Si DB no disponible:** muestra datos mock (salario 5.5M COP, arriendo, etc.)

### `/cuentas` — Mis Cuentas (página nueva)
- Accesible únicamente desde el Wealth card del dashboard (no está en sidebar/bottomnav)
- Muestra: card con saldo total visible + contador "X de Y cuentas incluidas"
- Lista todas las cuentas con icono por tipo (CASH→Wallet, BANK→Building2, NEQUI/DAVIPLATA→Smartphone, CARD→CreditCard), nombre, tipo y balance
- Botón ojo (`Eye`/`EyeOff`) por cuenta: toggle optimista de `hideFromTotal`, con rollback si falla la API
- Cuentas excluidas: atenuadas (opacity-60) con balance tachado

### `/historial` — Historial
- Filtros período/tipo/categoría, bar chart mensual, donut por categoría, lista con búsqueda

### `/deudas` — Deudas
- **Total deuda = deudas directas + saldo usado de tarjetas de crédito** (desglose en dos sub-cards)
- **Calculadora de deudas** (reemplazó el Planificador): inputs monto, tasa (toggle mensual/anual), meses → resultado en tiempo real: cuota mensual, total a pagar, total en intereses. Fórmula: `cuota = P*r*(1+r)^n / ((1+r)^n - 1)`
- **Tarjetas de crédito** aparecen como sección en el listado (read-only, clickeable → `/tarjetas`)
- **Modal de pago:** selector de cuenta con preview saldo resultante; valida client-side que amount ≤ debt.balance y amount ≤ account.balance
- Carga: `/deudas` + `/tarjetas` + `/cuentas` en paralelo

### `/tarjetas` — Tarjetas de Crédito
- Vista lista + vista detalle con sección "Abonos"
- **Modal de abono:** ahora incluye selector de cuenta (opcional). Valida client-side que amount ≤ card.usedBalance y amount ≤ account.balance
- Carga: `/tarjetas` + `/categorias` + `/cuentas` en paralelo

### `/about` — Acerca de (`app/about/page.tsx`)
- **Página protegida** (requiere login), con sidebar/bottomnav normal
- Secciones: Hero app, grid 8 funcionalidades, roadmap v1.0→v1.6, tarjeta desarrollador, stack tecnológico, card open source v1.6
- **Sin emojis** — el 🇨🇴 fue eliminado del hero y del footer
- Footer: `Versión 1.3 · 2026 · Hecho con dedicación en Colombia por Diego De la Hoz`
- Icono GitHub → usa `GitBranch` (el linter lo convirtió desde `ExternalLink`; `Github` no existe en v1.20.0)

### `/auth/login` — Login
- Form con `noValidate`, fondo `bg-surface-container` (tema-aware)
- **Botón "Acceso demo"** debajo del form — llama `GET /api/demo-login`, no requiere DB

### `/auth/register` — Registro
- Incluye campo "Código de acceso" (registrationKey), se convierte a mayúsculas

### `/admin` — Panel de Administrador
- **Completamente separado** del layout principal (sin Sidebar, sin TopBar de la app)
- **Sigue el tema del sistema** (light/dark) — usa variables CSS, NO colores hardcodeados
- Header con botón **Volver** (→ `/`) y botón **Salir** (logout completo)
- Accesible desde: Settings modal en TopBar (solo si `user.isAdmin`) → botón "Panel de Administrador"
- **Secciones:**
  1. Stats: usuarios totales, nuevos este mes, clave activa
  2. Clave de registro: cuadros individuales por char, botón generar nueva
  3. **Categorías:** tabs Ingresos/Egresos, lista con edición inline (lápiz → input → Enter/✓), botón eliminar (deshabilitado si en uso), campo agregar al final
  4. **Cuentas de usuario:** select de usuario → lista cuentas con tipo/saldo/conteo txn, edición inline expandible, botón eliminar (deshabilitado si tiene txn), formulario agregar cuenta
  5. Usuarios registrados: tabla con nombre/email/actividad/fecha, botón eliminar (cascade completo)
- Admin: `admin@luminafi.com` / `Dlh2026`

---

## 9. Validators (`lib/validators.ts`)

```ts
registerSchema        // name, email, password, registrationKey (min 1)
loginSchema           // email, password
incomeSchema          // name, amount, categoryId, accountId, date, frequency
expenseSchema         // description, amount, categoryId, accountId, date, frequency
debtSchema            // name, entity, balance, interestRate, minPayment, dueDate
budgetSchema          // name, allocated
goalSchema            // title, description, targetAmount, currentAmount, targetDate
paymentSchema         // debtId, amount, accountId? (optional — descuenta de cuenta si se envía)
creditCardSchema      // name, bank, creditLimit, interestRate, dueDay, cutDay, currency
cardPurchaseSchema    // description, categoryId, totalAmount, installments, date
cardPaymentSchema     // amount (positive), note (optional), paidAt (date string), accountId? (optional)
changePasswordSchema  // currentPassword, newPassword, confirmPassword (.refine match)
```

**IMPORTANTE:** `useForm<T>({ resolver: zodResolver(schema) as any })` — el `as any` es necesario por incompatibilidades de tipos entre zod v4 y @hookform/resolvers v5.

---

## 10. Archivos relevantes (árbol actualizado)

```
/
├── app/
│   ├── layout.tsx               # Anti-FOUC script en body, ClientLayout wrapper
│   ├── ClientLayout.tsx         # 'use client' — Sidebar + lg:pl-60 (excepto /admin, /auth)
│   ├── providers.tsx            # AuthProvider + ThemeProvider
│   ├── globals.css              # Tailwind v4, @theme, dark mode vars, .glass-card
│   ├── page.tsx                 # Dashboard — Wealth card clickeable → /cuentas
│   ├── cuentas/page.tsx         # Desglose de cuentas con toggle hideFromTotal (ojo)
│   ├── about/page.tsx           # Acerca de — sin emojis, footer actualizado, GitBranch icon
│   ├── historial/page.tsx       # Historial con filtros + charts + lista
│   ├── tarjetas/page.tsx        # CreditCards + abonos (con selector de cuenta)
│   ├── deudas/page.tsx          # Deudas + tarjetas en total + calculadora + selector cuenta
│   ├── admin/page.tsx           # Panel admin (tema-aware, standalone, con categorías y cuentas)
│   ├── auth/
│   │   ├── login/page.tsx       # noValidate, bg-surface-container, botón demo
│   │   └── register/page.tsx    # Campo registrationKey
│   ├── ingresos/page.tsx
│   ├── gastos/page.tsx
│   ├── presupuestos/page.tsx
│   ├── ia/page.tsx
│   ├── calculadoras/page.tsx
│   └── api/
│       ├── auth/login/route.ts          # Retorna isAdmin en user
│       ├── auth/register/route.ts       # Valida registrationKey
│       ├── auth/cambiar-password/route.ts
│       ├── demo-login/route.ts          # GET sin DB, solo dev
│       ├── dashboard/route.ts           # totalBalance filtra hideFromTotal; MOCK_DASHBOARD si DB falla
│       ├── ingresos/route.ts + [id]/    # GET con try/catch → []
│       ├── gastos/route.ts + [id]/      # GET con try/catch → []
│       ├── deudas/route.ts + [id]/      # GET con try/catch → []
│       ├── presupuestos/route.ts + [id]/# GET con try/catch → []
│       ├── metas/route.ts + [id]/       # GET con try/catch → []
│       ├── pagos/route.ts               # POST valida amount≤balance y descuenta cuenta opcional
│       ├── categorias/route.ts          # GET con try/catch → []
│       ├── cuentas/route.ts             # GET con try/catch → []
│       ├── cuentas/[id]/route.ts        # PUT: actualiza hideFromTotal (valida userId con findFirst)
│       ├── alertas/route.ts + [id]/     # GET con try/catch → {alerts:[], unreadCount:0}
│       ├── configuracion/route.ts       # GET con try/catch → default setting
│       ├── historial/route.ts           # try/catch → vacío
│       ├── health/route.ts
│       ├── seed/route.ts + categorias/
│       ├── tarjetas/route.ts            # GET con try/catch → []
│       ├── tarjetas/[id]/route.ts
│       ├── tarjetas/[id]/compras/route.ts
│       ├── tarjetas/[id]/compras/[purchaseId]/route.ts
│       ├── tarjetas/[id]/abonos/route.ts      # POST valida amount≤usedBalance y descuenta cuenta
│       ├── tarjetas/[id]/abonos/[paymentId]/route.ts
│       └── admin/
│           ├── me/route.ts
│           ├── stats/route.ts
│           ├── usuarios/route.ts + [id]/
│           ├── clave/route.ts
│           ├── categorias/route.ts          # GET+POST admin categorías globales
│           ├── categorias/[id]/route.ts     # PUT (rename) + DELETE (con validación de uso)
│           ├── cuentas/route.ts             # GET?userId= + POST
│           ├── cuentas/[id]/route.ts        # PUT + DELETE (con validación de uso)
│           └── setup/route.ts
├── components/
│   ├── ui/field.tsx + modal.tsx + spinner.tsx + toast.tsx
│   │   # modal.tsx: bg-surface (NO bg-white hardcodeado)
│   │   # toast.tsx: ToastProvider + useToast() — integrado en providers.tsx
│   ├── layout/
│   │   ├── topbar.tsx           # Settings modal con botón admin si user.isAdmin
│   │   ├── bottomnav.tsx        # lg:hidden, 9 items con scroll
│   │   └── sidebar.tsx          # hidden lg:flex, 9 items
│   └── dashboard/cashflow-chart.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── adminAuth.ts             # requireAdmin(), generateKey()
│   ├── prisma.ts
│   ├── validators.ts
│   └── hooks/
│       ├── useAuth.tsx          # AuthUser incluye isAdmin?: boolean
│       └── useTheme.tsx
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── .../20260617210000_add_credit_cards/
│       ├── .../20260621000000_add_card_payments/
│       ├── .../20260622000001_add_admin/
│       └── .../20260622000002_account_hide_from_total/
└── [docker, nginx, scripts — sin cambios]
```

---

## 11. Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL Prisma | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto JWT (min 32 chars) | `openssl rand -base64 64` |
| `SEED_KEY` | Clave para endpoints /api/seed y /api/admin/setup | String aleatorio |
| `ADMIN_EMAIL` | Email del admin (opcional, default: admin@luminafi.com) | |
| `ADMIN_PASSWORD` | Password del admin (opcional, default: Dlh2026) | |
| `ADMIN_NAME` | Nombre del admin (opcional, default: Admin Lumina) | |
| `NODE_ENV` | `production` en VPS | |

---

## 12. Comandos frecuentes

```bash
# Dev local
npm run dev

# Limpiar caché y reiniciar (si hay errores de hydration)
rm -rf .next && npm run dev

# Deploy en VPS (autodeploy en cada push a main)
# El entrypoint.sh corre: npx prisma migrate deploy && npm start

# Primera vez o cuando cambia el schema:
curl "https://luminafi.com/api/admin/setup?key=TU_SEED_KEY"

# Seed de categorías (idempotente, safe en producción):
curl "https://luminafi.com/api/seed/categorias?key=TU_SEED_KEY"

# Ver logs
docker logs -f lumina_app

# Conectar a DB
docker exec -it lumina_postgres psql -U lumina_user -d finanzasdev

# Estado de migraciones
docker exec lumina_app npx prisma migrate status
```

---

## 13. Estado actual del proyecto (2026-06-23 sesión 3)

### Funcional
- CRUD: ingresos, gastos, deudas, presupuestos, metas
- Tarjetas de crédito con compras en cuotas + abonos (con selector de cuenta origen)
- Dashboard con health score, cashflow chart; Wealth card clickeable → `/cuentas`
- Historial con filtros/charts
- TopBar: settings modal con botón admin (si isAdmin), dark mode, cambiar contraseña, notificaciones
- Dark mode completo con anti-FOUC
- Sidebar (desktop) + BottomNav (mobile) con 9 items
- Panel admin (`/admin`): tema-aware, categorías CRUD, cuentas CRUD por usuario, usuarios con cascade delete, clave de registro
- Botón admin en settings modal del TopBar (solo visible si isAdmin)
- Registro controlado con clave de acceso
- Demo mode: botón en login, JWT sin DB, todas las rutas GET toleran fallo de DB
- Página `/about` con roadmap, features, perfil del desarrollador (sin emojis)
- **Página `/cuentas`**: desglose de cuentas con toggle ojo (hideFromTotal)
- **Deudas**: total incluye tarjetas, calculadora de deudas, selector cuenta en pagos
- **Pagos y abonos**: validan que no excedan el saldo de deuda/tarjeta ni de la cuenta origen
- **Balance de cuentas**: se actualiza atómicamente (`$transaction`) al crear/editar/eliminar ingresos y gastos
- **Toast global** (`useToast()`): feedback de éxito/error en todas las páginas CRUD
- **Ingresos**: resumen muestra total real del mes actual (no solo `MONTHLY`)
- **Presupuestos**: barra de progreso usa gasto real del mes por categoría (matching por nombre, case-insensitive)

### Bugs pendientes
1. **SSL:** Self-signed. Pendiente Let's Encrypt con certbot
2. **IA:** Función local sin LLM real
3. **paidInstallments en compras:** El campo existe pero no se incrementa al hacer abonos a tarjetas

### Roadmap (desde `/about`)
- v1.0–v1.3: completos ✓
- v1.4: SSL Let's Encrypt
- v1.5: IA financiera real
- v1.6: Open source en GitHub

---

## 14. Convenciones del código

- `'use client'` en todas las páginas y componentes con hooks
- API routes: sin `'use client'`, server-side
- **Forms:** React Hook Form + Zod + `zodResolver(schema) as any`
- **API calls:** `api.get/post/put/delete` de `lib/api.ts` (agrega Bearer token automático)
- **Moneda:** `new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`
- **Fechas en inputs:** `new Date(item.date).toISOString().split('T')[0]`
- **Forms con email:** siempre `noValidate` en el `<form>`
- **NO usar colores hardcodeados** — siempre variables CSS del tema
- **Cards con fondo siempre oscuro (gradiente negro):** usar `text-white/70` para labels, NO `text-on-primary-container` ni `text-secondary-fixed-dim` — esos tokens son oscuros en modo claro y quedan ilegibles sobre fondo negro
- **Lucide icons:** `Github` NO existe en v1.20.0. En `about/page.tsx` se usa `GitBranch` para el link de GitHub. Para links externos genéricos usar `ExternalLink`
- **Prisma `$transaction` con ops condicionales** — patrón correcto (evita error de tipos TypeScript):
```ts
const ops = [
  prisma.model.create({ data: { ... } }),
  prisma.model.update({ where: { id }, data: { ... } }),
  ...(condition ? [prisma.account.update({ where: { id: accountId }, data: { balance: { decrement: amount } } })] : []),
] as const;
const [result] = await prisma.$transaction([...ops]);
// ❌ NO usar ops.push() — genera union type que TypeScript rechaza en $transaction
```
- **Toast:** importar `useToast` de `@/components/ui/toast`. Llamar `toast.success('msg')` o `toast.error('msg')` dentro de try/catch en handlers. El `ToastProvider` ya está en `providers.tsx`, no agregar de nuevo.

- **Patron de página protegida:**
```tsx
const { user, isLoading } = useProtected();
if (isLoading || loadingData) return <PageSpinner />;
if (!user) return null;
return (
  <main className="min-h-screen bg-surface text-on-surface pb-32 lg:pb-12">
    <TopBar title="..." />
    <section className="pt-24 px-6 max-w-2xl lg:max-w-5xl mx-auto space-y-6">
      {/* contenido */}
    </section>
    <BottomNav />
  </main>
);
```

---

## 15. PROMPT PARA NUEVA SESIÓN

```
Tengo una app Next.js 15 llamada Lumina Finance. Lee el archivo CONTEXT.md en la raíz del proyecto — tiene el contexto completo antes de continuar.

La app está corriendo en local con `npm run dev` (http://localhost:3000). Si hay errores de hydration o el servidor está caído, el comando para reiniciar limpio es: `rm -rf .next && npm run dev`

Para entrar a la app sin base de datos: ir a /auth/login y usar el botón "Acceso demo (sin base de datos)".

Espera la siguiente instrucción.
```
