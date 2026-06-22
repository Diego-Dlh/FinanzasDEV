# LUMINA FINANCE — CONTEXTO COMPLETO DEL PROYECTO

> Última actualización: 2026-06-22. Documento de referencia para continuar desarrollo en nuevas sesiones de Claude.

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
- `ThemeProvider` en `lib/hooks/useTheme.tsx` sincroniza con `Setting.darkMode` de la DB

### Componentes UI (`components/ui/`)
- **`field.tsx`**: `Input`, `SelectField`, `Field`, `FieldLabel`, `FieldError`, `Btn`
- **`modal.tsx`**: Modal con props `title`, `subtitle?`, `onClose`. Cierra con Escape, bloquea scroll
- **`spinner.tsx`**: `Spinner`, `PageSpinner`

### Clases CSS custom
- `.glass-card` — fondo semitransparente con blur
- `.shadow-card` — sombra suave
- `.no-scrollbar` — oculta scrollbar

---

## 4. Autenticación

- Token JWT en `localStorage.auth_token` (expira 7d)
- Usuario en `localStorage.auth_user` (JSON)
- `lib/auth.ts`: `hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, `authenticateToken`
- `lib/adminAuth.ts`: `requireAdmin(authHeader)` — verifica userId + `isAdmin: true` en DB; `generateKey()` — genera código 6 chars alfanumérico sin ambiguos (sin 0/O, 1/I)
- `lib/hooks/useAuth.tsx`: `AuthProvider`, `useAuth()`, `useProtected()`
- `lib/hooks/useTheme.tsx`: `ThemeProvider`, `useTheme()` — lee localStorage + sincroniza con DB

### `app/providers.tsx`
```tsx
<AuthProvider>
  <ThemeProvider>{children}</ThemeProvider>
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
- Avatar click → Settings modal (perfil, dark mode toggle, cambiar contraseña)
- Bell con badge rojo de no leídas → Notifications modal
- Settings modal: toggle dark mode (llama `api.put('/configuracion', { darkMode })`), form cambiar contraseña
- Notifications modal: marcar todas como leídas, marcar una, eliminar

### `components/layout/sidebar.tsx` (`'use client'`)
- `hidden lg:flex` — solo visible en desktop (≥1024px)
- Fixed, `w-60` (240px), `left-0 top-0 h-full`
- Logo Lumina Finance + 8 nav items con iconos
- Item activo: `bg-secondary-container text-on-secondary-container`

### `components/layout/bottomnav.tsx` (`'use client'`)
- `lg:hidden` — solo visible en mobile
- `overflow-x-auto no-scrollbar` (scroll horizontal para 8 items)
- Items con `shrink-0`

### Ítems de navegación (ambos sidebar y bottomnav)
```
/ → Inicio (Home)
/historial → Historial (History)
/ingresos → Ingresos (TrendingUp)
/gastos → Gastos (TrendingDown)
/deudas → Deudas (Landmark)
/presupuestos → Metas (Target)
/tarjetas → Tarjetas (CreditCard)
/ia → IA (MoreHorizontal)
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

**`Account`** — type: CASH/BANK/NEQUI/DAVIPLATA/CARD · currency default "USD" (seed crea con "COP")

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
20260617210000_add_credit_cards      → CreditCard + CardPurchase
20260621000000_add_card_payments     → CardPayment
20260622000001_add_admin             → User.isAdmin + RegistrationKey
```

---

## 7. API Routes (todas)

Todas requieren `Authorization: Bearer <token>` excepto donde se indica.

### Autenticación
| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/auth/register` | POST | No | Valida `registrationKey` contra clave activa en DB. Crea user + 3 cuentas + Setting + Alert bienvenida |
| `/api/auth/login` | POST | No | Retorna `{ token, user: { id, name, email } }` |
| `/api/auth/cambiar-password` | PUT | Sí | Verifica `currentPassword`, hashea `newPassword`, actualiza |

### Dashboard
| Ruta | Descripción |
|------|-------------|
| `GET /api/dashboard` | totalBalance, monthlyIncome, monthlyExpenses, totalDebt (incluye usedBalance de tarjetas), netWorth, healthScore, transactions (últimas 6), cashFlow (7 días), accountsCount |

### Ingresos / Gastos / Deudas / Presupuestos / Metas / Pagos / Categorías / Cuentas
*(sin cambios respecto a versión anterior — CRUD estándar)*

### Alertas
| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/alertas` | GET | Lista alertas + unreadCount, orderBy [read asc, createdAt desc] |
| `/api/alertas` | PUT | Body `{ markAllRead: true }` → marca todas como leídas |
| `/api/alertas/[id]` | PUT | Marca alerta individual como leída |
| `/api/alertas/[id]` | DELETE | Elimina alerta |

### Configuración
| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/configuracion` | GET | Upsert Setting (crea si no existe con darkMode: false, notifications: true) |
| `/api/configuracion` | PUT | Actualiza darkMode y/o notifications |

### Tarjetas de Crédito
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/tarjetas` | GET | Lista tarjetas con purchases (include category) + payments, orderBy createdAt desc |
| `POST /api/tarjetas` | POST | Crea tarjeta |
| `GET/PUT/DELETE /api/tarjetas/[id]` | — | CRUD individual |
| `GET/POST /api/tarjetas/[id]/compras` | — | Lista / crea compra (calcula installmentAmt, incrementa usedBalance) |
| `DELETE /api/tarjetas/[id]/compras/[purchaseId]` | — | Elimina compra, decrementa usedBalance |
| `GET /api/tarjetas/[id]/abonos` | GET | Lista abonos de la tarjeta |
| `POST /api/tarjetas/[id]/abonos` | POST | Registra abono: decrementa usedBalance (Math.max(0, balance - amount)), $transaction |
| `DELETE /api/tarjetas/[id]/abonos/[paymentId]` | DELETE | Elimina abono, restaura usedBalance (Math.min(limit, balance + amount)) |

### Historial
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/historial` | GET | Query params: `from`, `to`, `type` (ALL/INCOME/EXPENSE), `categoryId`. Retorna: transactions[], summary {totalIncome, totalExpenses, balance}, byMonth[], byCategory[] |

### Admin (requieren isAdmin: true en DB)
| Ruta | Método | Descripción |
|------|--------|-------------|
| `GET /api/admin/me` | GET | Verifica si usuario es admin |
| `GET /api/admin/stats` | GET | totalUsers, newThisMonth, activeKey |
| `GET /api/admin/usuarios` | GET | Lista todos los usuarios con _count {incomes, expenses} |
| `DELETE /api/admin/usuarios/[id]` | DELETE | Elimina usuario + todos sus datos (cascade manual en $transaction). No puede eliminar admins ni a sí mismo |
| `GET /api/admin/clave` | GET | Obtiene clave de registro activa |
| `POST /api/admin/clave` | POST | Genera nueva clave (desactiva anteriores), retorna nuevo código |
| `GET /api/admin/setup` | GET | Query: `?key=SEED_KEY`. Idempotente. Crea/actualiza admin@luminafi.com con isAdmin:true + password Dlh2026. Crea clave de registro si no existe |

### Utilidades
| Ruta | Descripción |
|------|-------------|
| `GET /api/health` | Prueba DB con SELECT 1 |
| `GET /api/seed?key=SEED_KEY` | Seed inicial (idempotente, verifica alex@finanzasdev.com) |
| `GET /api/seed/categorias?key=SEED_KEY` | Upsert idempotente de categorías |

---

## 8. Páginas (todas)

### `/` — Dashboard
- Health score SVG circular, Wealth card gradiente negro, 4 overview cards scroll horizontal, CashFlow chart (Recharts BarChart), transacciones recientes

### `/historial` — Historial (`app/historial/page.tsx`)
- **Filtros:** chips de período (Este mes / Mes anterior / 3 meses / 6 meses / Este año), tipo (ALL/INCOME/EXPENSE), categoría dropdown
- **Resumen:** 3 cards (Ingresos totales, Gastos totales, Balance del período)
- **Gráficas:** BarChart ingresos vs gastos por mes (3/5 ancho desktop) + PieChart gastos por categoría con donut (2/5 ancho desktop)
- **Lista:** búsqueda cliente-side (filtra por label y categoría), ícono tipo, descripción, categoría·cuenta, fecha, monto coloreado

### `/ingresos`, `/gastos`, `/deudas`, `/presupuestos`, `/ia`, `/calculadoras`
- Sin cambios estructurales respecto a versión anterior

### `/tarjetas` — Tarjetas de Crédito
- Vista lista + vista detalle en misma página
- **Detalle ahora incluye sección "Abonos":**
  - Lista abonos con monto, fecha, nota opcional, botón eliminar
  - Botón "Abonar" abre modal pre-llenado con pago mínimo estimado
  - Modal: monto, fecha, nota opcional, muestra saldo actual como referencia
- Cálculo pago mínimo: `max(usedBalance * 0.05, cuotasMes + interesMes)`

### `/auth/register` — Registro
- Ahora incluye campo "Código de acceso" (registrationKey)
- Se convierte a mayúsculas automáticamente
- El servidor valida contra `RegistrationKey.code` activa en DB

### `/auth/login` — Login
- Tiene `noValidate` en el form (evita validación nativa del browser para email)

### `/admin` — Panel de Administrador
- **Completamente separado del layout principal** (sin Sidebar, sin TopBar de la app)
- Tema dark `bg-[#0f1117]`
- Verifica admin vía `GET /api/admin/me` al montar; si no es admin → redirect a /
- **Secciones:**
  1. Stats: usuarios totales, nuevos este mes, clave activa actual
  2. Clave de registro: muestra cada carácter en cuadro separado, botón "Generar nueva clave", destaca nuevo código generado
  3. Tabla de usuarios: nombre (con badge Admin), email, actividad (↑ingresos ↓gastos), fecha registro, botón eliminar (visible en hover)
- Admin: `admin@luminafi.com` / `Dlh2026`
- URL: `/admin` (navegación manual, no está en sidebar/bottomnav)

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
paymentSchema         // debtId, amount
creditCardSchema      // name, bank, creditLimit, interestRate, dueDay, cutDay, currency
cardPurchaseSchema    // description, categoryId, totalAmount, installments, date
cardPaymentSchema     // amount (positive), note (optional), paidAt (date string)
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
│   ├── page.tsx                 # Dashboard
│   ├── historial/page.tsx       # Historial con filtros + charts + lista
│   ├── tarjetas/page.tsx        # CreditCards + abonos
│   ├── admin/page.tsx           # Panel admin (dark, standalone)
│   ├── auth/
│   │   ├── login/page.tsx       # noValidate en form
│   │   └── register/page.tsx    # Campo registrationKey
│   ├── ingresos/page.tsx
│   ├── gastos/page.tsx
│   ├── deudas/page.tsx
│   ├── presupuestos/page.tsx
│   ├── ia/page.tsx
│   ├── calculadoras/page.tsx
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/register/route.ts       # Valida registrationKey
│       ├── auth/cambiar-password/route.ts
│       ├── dashboard/route.ts
│       ├── ingresos/route.ts + [id]/
│       ├── gastos/route.ts + [id]/
│       ├── deudas/route.ts + [id]/
│       ├── presupuestos/route.ts + [id]/
│       ├── metas/route.ts + [id]/
│       ├── pagos/route.ts
│       ├── categorias/route.ts
│       ├── cuentas/route.ts
│       ├── alertas/route.ts + [id]/
│       ├── configuracion/route.ts
│       ├── historial/route.ts
│       ├── health/route.ts
│       ├── seed/route.ts + categorias/
│       ├── tarjetas/route.ts
│       ├── tarjetas/[id]/route.ts
│       ├── tarjetas/[id]/compras/route.ts
│       ├── tarjetas/[id]/compras/[purchaseId]/route.ts
│       ├── tarjetas/[id]/abonos/route.ts
│       ├── tarjetas/[id]/abonos/[paymentId]/route.ts
│       └── admin/
│           ├── me/route.ts
│           ├── stats/route.ts
│           ├── usuarios/route.ts + [id]/
│           ├── clave/route.ts
│           └── setup/route.ts           # GET idempotente, crea admin@luminafi.com
├── components/
│   ├── ui/field.tsx + modal.tsx + spinner.tsx
│   ├── layout/
│   │   ├── topbar.tsx           # Settings + Notif modals, dark mode toggle
│   │   ├── bottomnav.tsx        # lg:hidden, 8 items con scroll
│   │   └── sidebar.tsx          # hidden lg:flex, 8 items
│   └── dashboard/cashflow-chart.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── adminAuth.ts             # requireAdmin(), generateKey()
│   ├── prisma.ts
│   ├── validators.ts
│   └── hooks/
│       ├── useAuth.tsx
│       └── useTheme.tsx         # ThemeProvider, useTheme()
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── .../20260617210000_add_credit_cards/
│       ├── .../20260621000000_add_card_payments/
│       └── .../20260622000001_add_admin/
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
# Deploy en VPS (autodeploy en cada push a main)
# El entrypoint.sh corre: npx prisma migrate deploy && npm start

# Primera vez o cuando cambia el schema:
curl "https://luminafi.com/api/admin/setup?key=TU_SEED_KEY"
# → Crea admin@luminafi.com + primera clave de registro

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

## 13. Estado actual del proyecto (2026-06-22)

### Funcional
- CRUD: ingresos, gastos, deudas, presupuestos, metas
- **Tarjetas de crédito** con compras en cuotas + **abonos** que reducen saldo
- **Dashboard** con health score, cashflow chart, total deuda incluye tarjetas
- **Historial** (`/historial`): filtros período/tipo/categoría, bar chart mensual, donut por categoría, lista con búsqueda
- **TopBar**: settings modal (perfil + dark mode + cambiar contraseña), bell con badge + modal de notificaciones
- **Dark mode** completo con anti-FOUC y sincronización con DB
- **Sidebar** en desktop (≥1024px), BottomNav en mobile
- **Panel admin** (`/admin`): gestión de usuarios, generación de clave de registro
- **Registro controlado**: campo "Código de acceso" obligatorio en registro
- **16 categorías** globales (6 ingresos, 10 gastos incluyendo Mascotas)
- Docker producción con Nginx, rate limiting, SSL self-signed

### Pendientes conocidos
1. **SSL:** Self-signed actualmente. Pendiente Let's Encrypt con certbot
2. **IA:** Función local sin LLM real. Para integrar Claude/OpenAI: agregar `/api/ia` + `API_KEY` env
3. **Balance de cuentas:** No se actualiza automáticamente al crear ingresos/gastos (es manual)
4. **Categorías:** Globales sin userId — si se necesitan por usuario requiere migración
5. **paidInstallments en compras:** El campo existe pero no se actualiza automáticamente al hacer abonos

---

## 14. Convenciones del código

- `'use client'` en todas las páginas y componentes con hooks
- API routes: sin `'use client'`, server-side
- **Forms:** React Hook Form + Zod + `zodResolver(schema) as any`
- **API calls:** `api.get/post/put/delete` de `lib/api.ts` (agrega Bearer token automático)
- **Moneda:** `new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`
- **Fechas en inputs:** `new Date(item.date).toISOString().split('T')[0]`
- **Forms con email:** siempre `noValidate` en el `<form>` para evitar validación nativa del browser
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
