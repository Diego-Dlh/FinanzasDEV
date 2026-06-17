# LUMINA FINANCE — CONTEXTO COMPLETO DEL PROYECTO

> Documento generado el 2026-06-17. Sirve como contexto total para un nuevo chat de Claude que retome el trabajo sin preguntas básicas.

---

## 1. Identidad del proyecto

- **Nombre:** Lumina Finance
- **Descripcion:** App de finanzas personales premium en espanol, orientada al mercado colombiano (moneda COP)
- **Repo GitHub:** https://github.com/Diego-Dlh/FinanzasDEV
- **VPS produccion:** 31.97.138.41 (Hostinger, Ubuntu 24.04)
- **Ruta en VPS:** `/opt/lumina`
- **Backup/staging Render:** https://finanzasdev.onrender.com
- **package.json name:** `finanzasdev`
- **version:** `1.0.0`

---

## 2. Stack tecnico (versiones exactas del package.json)

### Dependencias principales
| Paquete | Version |
|---------|---------|
| next | ^15.5.19 |
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| typescript | ^5.4.5 |
| tailwindcss | ^4.3.1 |
| @tailwindcss/postcss | ^4.3.1 |
| prisma | ^4.15.0 |
| @prisma/client | ^4.15.0 |
| react-hook-form | ^7.79.0 |
| @hookform/resolvers | ^5.4.0 |
| zod | ^4.4.3 |
| jsonwebtoken | ^9.0.3 |
| bcrypt | ^6.0.0 |
| lucide-react | ^1.20.0 |
| recharts | ^3.8.1 |
| clsx | ^2.1.1 |
| tailwind-merge | ^3.6.0 |
| autoprefixer | ^10.5.0 |
| postcss | ^8.5.15 |
| ts-node | ^10.9.2 |

### DevDependencies
| Paquete | Version |
|---------|---------|
| eslint | ^9.39.4 |
| eslint-config-next | ^16.2.9 |

### Infraestructura
- **Base de datos:** PostgreSQL 15-alpine
- **Contenedores:** Docker + Docker Compose
- **Reverse proxy:** Nginx 1.25-alpine
- **Node requerido:** >=20.0.0
- **Plataforma de deployment:** VPS con Docker Compose prod

---

## 3. Sistema de diseno

### Tailwind CSS v4 — IMPORTANTE
El proyecto usa **Tailwind CSS v4**, que cambia la forma de configurar completamente:
- En `globals.css`: usa `@import "tailwindcss"` (NO las directivas `@tailwind base/components/utilities` de v3)
- Los colores custom se definen en el bloque `@theme {}` dentro de `globals.css` usando variables CSS `--color-*`
- El `tailwind.config.ts` solo define `content` paths y `plugins: []` (minimo)

### Colores custom definidos en `@theme {}` (globals.css)

**Primary (Navy):**
- `--color-primary: #4a6fa5`
- `--color-on-primary: #ffffff`
- `--color-primary-container: #d6e3ff`
- `--color-on-primary-container: #0d1c32`

**Secondary (Green — color principal de accion):**
- `--color-secondary: #006e2a`
- `--color-on-secondary: #ffffff`
- `--color-secondary-container: #c8f5d5`
- `--color-on-secondary-container: #002108`
- `--color-secondary-fixed: #69ff87`
- `--color-secondary-fixed-dim: #3ce36a`
- `--color-on-secondary-fixed: #002108`
- `--color-on-secondary-fixed-variant: #00531e`

**Tertiary (Red accent):**
- `--color-tertiary: #ba1a1a`
- `--color-on-tertiary: #ffffff`
- `--color-tertiary-container: #ffdad6`
- `--color-on-tertiary-container: #410004`
- `--color-tertiary-fixed: #ffdad7`
- `--color-tertiary-fixed-dim: #ffb3ae`
- `--color-on-tertiary-fixed: #410004`
- `--color-on-tertiary-fixed-variant: #930015`

**Error:**
- `--color-error: #ba1a1a`
- `--color-on-error: #ffffff`
- `--color-error-container: #ffdad6`
- `--color-on-error-container: #93000a`

**Surface:**
- `--color-surface: #fbf9fb`
- `--color-surface-dim: #dbd9db`
- `--color-surface-bright: #fbf9fb`
- `--color-surface-container-lowest: #ffffff`
- `--color-surface-container-low: #f5f3f5`
- `--color-surface-container: #efedef`
- `--color-surface-container-high: #eae7ea`
- `--color-surface-container-highest: #e4e2e4`
- `--color-surface-variant: #e4e2e4`

**On-Surface:**
- `--color-on-surface: #1b1b1d`
- `--color-on-surface-variant: #44474d`
- `--color-inverse-surface: #303032`
- `--color-inverse-on-surface: #f2f0f2`

**Background:**
- `--color-background: #fbf9fb`
- `--color-on-background: #1b1b1d`

**Otros:**
- `--color-inverse-primary: #b9c7e4`
- `--color-surface-tint: #4a6fa5`
- `--color-outline: #75777e`
- `--color-outline-variant: #c5c6cd`

**Border Radius custom:**
- `--radius-xl: 1rem`
- `--radius-2xl: 1.25rem`
- `--radius-3xl: 1.5rem`
- `--radius-4xl: 2rem`

**Tipografia:**
- `--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif`
- Inter cargada desde Google Fonts en `app/layout.tsx` con `subsets: ['latin'], display: 'swap'`

**Sombras:**
- `--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.06)`
- `--shadow-soft: 0 24px 80px rgba(0, 0, 0, 0.08)`

### Clases de utilidad custom (en globals.css, no en Tailwind)

```css
/* Glass card — fondo semitransparente con blur */
.glass-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(196, 199, 210, 0.4);
}

/* Shadow card */
.shadow-card {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
}

/* Ocultar scrollbar */
.no-scrollbar { ... }
```

### Componentes UI reutilizables (`components/ui/field.tsx`)

Todos son `'use client'`. Importar desde `@/components/ui/field`.

**`Input`** — `forwardRef`, `HTMLInputElement`:
```tsx
className="w-full rounded-2xl bg-surface-container-low px-4 py-3.5 text-sm ..."
```

**`SelectField`** — `forwardRef`, `HTMLSelectElement`, incluye `ChevronDown` icon absoluto:
```tsx
className="w-full appearance-none rounded-2xl bg-surface-container-low px-4 py-3.5 pr-10 ..."
```

**`FieldLabel`** — props: `children`, `required?: boolean`:
```tsx
className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant mb-1.5"
// Si required: muestra <span className="text-error ml-0.5">*</span>
```

**`FieldError`** — props: `message?: string` (no renderiza nada si no hay mensaje):
```tsx
className="mt-1.5 text-xs font-medium text-error"
```

**`Field`** — wrapper completo: `label + children + error`:
```tsx
// Props: label: string, error?: string, required?: boolean, children: ReactNode
<Field label="Monto" error={errors.amount?.message} required>
  <Input {...register('amount')} type="number" />
</Field>
```

**`Btn`** — Button con variantes y estado loading:
- Props: `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'`, `loading?: boolean`, `icon?: ReactNode`, `size?: 'sm' | 'md' | 'lg'`
- Default: `variant='primary'`, `size='lg'`
- Variantes de color:
  - `primary`: `bg-primary text-on-primary`
  - `secondary`: `bg-secondary text-on-secondary`
  - `danger`: `bg-error text-on-error`
  - `ghost`: `bg-surface-container text-on-surface`
- Sizes: `sm=h-10 rounded-xl`, `md=h-12 rounded-2xl`, `lg=h-14 rounded-2xl`
- Cuando `loading=true` muestra spinner inline (borde animado) en lugar del contenido

### Componentes UI adicionales

**`Modal`** (`components/ui/modal.tsx`) — props: `title`, `subtitle?: string`, `onClose`, `children`:
- Cierra con Escape
- Bloquea scroll del body mientras esta abierto
- Backdrop con `bg-black/50 backdrop-blur-[6px]`, click cierra
- Sheet: `rounded-[28px]`, `max-w-lg`, fondo `#ffffff`
- Header con title y subtitle opcional, boton X
- Body: `overflow-y-auto`, `maxHeight: calc(100dvh - 200px)`

**`Spinner`** (`components/ui/spinner.tsx`):
```tsx
export function Spinner({ className = '' }) // span con animate-spin border-t-transparent
export function PageSpinner() // min-h-screen centrado, Spinner h-8 w-8 text-secondary
```

### Layout components

**`TopBar`** (`components/layout/topbar.tsx`) — `'use client'`:
- Fixed top-0, `bg-surface/90 backdrop-blur-xl`
- Muestra avatar circular verde con inicial del nombre del usuario
- Saludo: `"Hola, {user.name.split(' ')[0]}"` en uppercase tracking
- Botones: Bell (sin funcionalidad) y LogOut (logout + redirect /auth/login)

**`BottomNav`** (`components/layout/bottomnav.tsx`) — `'use client'`:
- Fixed bottom-0, `bg-surface/95 backdrop-blur-xl`
- 6 items: `/ (Home)`, `/ingresos (TrendingUp)`, `/gastos (TrendingDown)`, `/deudas (CreditCard)`, `/presupuestos (Target)`, `/ia (MoreHorizontal)`
- Item activo: `bg-secondary-container text-on-secondary-container`
- Labels en `text-[9px] uppercase tracking-[0.2em]`

### Tipografia
- Labels/etiquetas: `uppercase tracking-[0.25em]` o `tracking-[0.2em]` o `tracking-wider`
- Font: Inter (Google Fonts)
- Todos los textos en espanol

---

## 4. Autenticacion

### Almacenamiento en localStorage
- Token JWT: `localStorage.getItem('auth_token')`
- Usuario: `localStorage.getItem('auth_user')` (JSON)

**NOTA IMPORTANTE:** En versiones previas se usaba `'lumina_token'`. El codigo actual en `lib/api.ts` y `lib/hooks/useAuth.tsx` usa `'auth_token'` y `'auth_user'`.

### `lib/hooks/useAuth.tsx` — `'use client'`

**`AuthUser` interface:** `{ id: string; name: string; email: string }`

**`AuthProvider`:** Context provider que al montar lee `localStorage.auth_user`. Expone:
- `user: AuthUser | null`
- `isLoading: boolean` (true durante hidratacion inicial)
- `login(token, user)` — guarda en localStorage y setUser
- `logout()` — limpia localStorage y setUser(null)

**`useAuth()`:** Retorna el context (lanza Error si no hay Provider)

**`useProtected()`:** Usa `useAuth()`, en `useEffect` si `!isLoading && !user` hace `router.replace('/auth/login')`. Retorna `{ user, isLoading }`.

### `lib/auth.ts` (server-side)

- `hashPassword(password)` — bcrypt, SALT_ROUNDS=10
- `verifyPassword(password, hash)` — bcrypt.compare
- `createToken({ userId })` — JWT sign, expira en `7d`
- `verifyToken(token)` — JWT verify
- `authenticateToken(authHeader)` — extrae `Bearer <token>`, verifica, retorna `userId` o `null`
- En produccion, si `JWT_SECRET` no esta definido o es el placeholder, lanza Error

### `lib/api.ts` — cliente HTTP del lado cliente

```ts
export function getToken(): string | null // lee localStorage.auth_token
// request() agrega automaticamente Authorization: Bearer <token>
export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', ... }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', ... }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
// Las rutas se concatenan como /api${path}, ej: api.get('/ingresos') → fetch('/api/ingresos')
```

### `lib/prisma.ts`
Singleton pattern para evitar multiples conexiones en dev:
```ts
export const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
```

### Providers (`app/providers.tsx`)
```tsx
'use client'
export function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```
Wrappea en `app/layout.tsx`.

---

## 5. Base de datos (Prisma schema completo)

**Archivo:** `prisma/schema.prisma`

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

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
| password | String | hasheado con bcrypt |
| createdAt | DateTime @default(now()) | |
| updatedAt | DateTime @updatedAt | |
| Relaciones | incomes, expenses, debts, budgets, goals, payments, accounts, alerts, settings? | |

**`Account`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| name | String | |
| type | AccountType | CASH/BANK/NEQUI/DAVIPLATA/CARD |
| balance | Float @default(0) | |
| currency | String @default("USD") | En seed se crea con "COP" |
| createdAt / updatedAt | DateTime | |
| Relaciones | incomes[], expenses[] | |

**`Category`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| name | String @unique | |
| type | EntryType | INCOME o EXPENSE |
| createdAt | DateTime | |
| Relaciones | incomes[], expenses[] | |

> Las categorias son **globales** (sin userId). No pertenecen a un usuario especifico. Todos los usuarios comparten el mismo catalogo de categorias.

**`Income`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| accountId | String | FK a Account |
| categoryId | String | FK a Category |
| name | String | Nombre del ingreso |
| amount | Float | |
| date | DateTime | |
| frequency | Frequency | |
| createdAt | DateTime | |

**`Expense`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| accountId | String | FK a Account |
| categoryId | String | FK a Category |
| description | String | (no "name", sino "description") |
| amount | Float | |
| date | DateTime | |
| frequency | Frequency | |
| createdAt | DateTime | |

**`Debt`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| name | String | Nombre de la deuda |
| entity | String | Entidad bancaria/creditor |
| balance | Float | Saldo restante |
| interestRate | Float | Tasa anual en % |
| minPayment | Float | Pago minimo mensual |
| dueDate | DateTime | Fecha vencimiento |
| createdAt | DateTime | |
| payments | Payment[] | |

**`Payment`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| debtId | String | FK a Debt |
| amount | Float | |
| paidAt | DateTime @default(now()) | |
| createdAt | DateTime | |

**`Budget`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| name | String | |
| allocated | Float | Monto presupuestado |
| spent | Float @default(0) | Monto gastado (actualizado manualmente) |
| createdAt / updatedAt | DateTime | |

**`Goal`** (Meta de ahorro)
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| title | String | |
| description | String | |
| targetAmount | Float | Meta total |
| currentAmount | Float @default(0) | Ahorro actual |
| targetDate | DateTime | |
| createdAt / updatedAt | DateTime | |

**`Alert`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String | FK a User |
| message | String | |
| type | String | Ej: 'SPENDING_ALERT', 'DEBT_ADVICE' |
| read | Boolean @default(false) | |
| createdAt | DateTime | |

**`Setting`**
| Campo | Tipo | Nota |
|-------|------|------|
| id | String @id @default(cuid()) | |
| userId | String @unique | FK a User (1:1) |
| darkMode | Boolean @default(false) | |
| notifications | Boolean @default(true) | |
| createdAt / updatedAt | DateTime | |

---

## 6. API Routes (todas)

Todas las rutas requieren `Authorization: Bearer <token>` excepto donde se indica.

### Autenticacion
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/auth/register` | POST | No | Crea user, crea 3 cuentas default (Cuenta Principal BANK, Efectivo CASH, Ahorro BANK en COP balance 0), crea Setting, crea Alert bienvenida. Retorna `{ id, name, email }` 201. |
| `/api/auth/login` | POST | No | Valida credenciales con bcrypt, retorna `{ token, user: { id, name, email } }`. |

### Dashboard
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/dashboard` | GET | Si | Retorna: `totalBalance`, `monthlyIncome`, `monthlyExpenses`, `totalDebt`, `netWorth`, `healthScore`, `transactions` (ultimas 6 mezclando ingresos y gastos), `cashFlow` (ultimos 7 dias), `accountsCount`. |

**Health Score algorithm** (en `app/api/dashboard/route.ts`):
- Base: 70
- Si `monthlyIncome === 0`: retorna 30
- Savings rate: +15 si >=30%, +10 si >=20%, +5 si >=10%, -5 si >=0%, -20 si negativo
- Debt-to-income: +15 si 0%, +5 si <50%, -15 si >200%, -25 si >350%
- Goals: +5 si tiene al menos 1 meta

### Ingresos
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/ingresos` | GET | Si | Lista ingresos del user, orderBy date desc, include category+account |
| `/api/ingresos` | POST | Si | Crea ingreso. Body: `{ name, amount, categoryId, accountId, date, frequency }` |
| `/api/ingresos/[id]` | PUT | Si | Actualiza ingreso (verifica ownership). Body: campos parciales |
| `/api/ingresos/[id]` | DELETE | Si | Elimina ingreso (verifica ownership) |

### Gastos
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/gastos` | GET | Si | Lista gastos del user, orderBy date desc, include category+account |
| `/api/gastos` | POST | Si | Crea gasto. Body: `{ description, amount, categoryId, accountId, date, frequency }` |
| `/api/gastos/[id]` | PUT | Si | Actualiza gasto (verifica ownership) |
| `/api/gastos/[id]` | DELETE | Si | Elimina gasto (verifica ownership) |

### Deudas
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/deudas` | GET | Si | Lista deudas del user, orderBy createdAt desc |
| `/api/deudas` | POST | Si | Crea deuda. Body: `{ name, entity, balance, interestRate, minPayment, dueDate }` |
| `/api/deudas/[id]` | PUT | Si | Actualiza deuda. Al eliminar: primero borra Payments relacionados, luego la deuda |
| `/api/deudas/[id]` | DELETE | Si | Elimina deuda + sus pagos (cascade manual) |

### Pagos
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/pagos` | GET | Si | Lista pagos. Query param opcional: `?debtId=xxx`. Include debt name+entity |
| `/api/pagos` | POST | Si | Registra pago. Body validado con `paymentSchema`. Usa `$transaction`: crea Payment + actualiza Debt.balance (Math.max(0, balance - amount)) |

### Presupuestos
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/presupuestos` | GET | Si | Lista presupuestos, orderBy updatedAt desc |
| `/api/presupuestos` | POST | Si | Crea presupuesto. Body: `{ name, allocated }` |
| `/api/presupuestos/[id]` | PUT | Si | Actualiza: name, allocated, spent |
| `/api/presupuestos/[id]` | DELETE | Si | Elimina presupuesto |

### Metas
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/metas` | GET | Si | Lista goals, orderBy updatedAt desc |
| `/api/metas` | POST | Si | Crea goal. Body: `{ title, description, targetAmount, targetDate }`. currentAmount inicia en 0 |
| `/api/metas/[id]` | PUT | Si | Actualiza goal (title, description, targetAmount, currentAmount, targetDate) |
| `/api/metas/[id]` | DELETE | Si | Elimina goal |

### Categorias
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/categorias` | GET | Si | Lista TODAS las categorias (globales), orderBy name asc |
| `/api/categorias` | POST | Si | Crea categoria global. Body: `{ name, type }` |

### Cuentas
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/cuentas` | GET | Si | Lista cuentas del user, orderBy createdAt asc |
| `/api/cuentas` | POST | Si | Crea cuenta. Body: `{ name, type, balance, currency }` |

### Utilidades
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/health` | GET | No | Prueba conexion DB con `SELECT 1`. Retorna `{ status, database, timestamp }`. Status 200 ok / 503 error |
| `/api/seed` | GET | No (key) | Inicializa DB con 15 categorias + 3 usuarios. Query param: `?key=SEED_KEY`. Idempotente: si ya existe alex@finanzasdev.com, retorna sin hacer nada |

---

## 7. Paginas (todas)

### `/` — Dashboard (`app/page.tsx`)
- `'use client'`, usa `useProtected()`, redirige a /auth/login si no autenticado
- Consume `api.get<DashboardData>('/dashboard')`
- Muestra:
  - Wealth Card (saldo total, gradient negro, cuentas activas, indicador flujo +/-)
  - Health Score (SVG circular con strokeDashoffset calculado como `251.2 - (251.2 * score) / 100`)
  - 4 Overview Cards horizontales con scroll: Ingresos, Gastos, Total Deuda, Patrimonio
  - Cash Flow Chart (Recharts, ultimos 7 dias — componente `CashFlowChart` en `components/dashboard/cashflow-chart.tsx`)
  - Transacciones recientes (ultimas 6, mezcla ingresos/gastos)
- Formato moneda: `new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`
- Funcion `fmtShort()`: abrevia >=1M como `$XM`, >=1K como `$XK`
- Score labels: >=85 "Excelente", >=70 "Bueno", >=50 "Regular", default "Mejorar"
- Layout: `pb-32` para no tapar con BottomNav, `pt-24` para no tapar con TopBar

### `/auth/login` (`app/auth/login/page.tsx`)
- `'use client'`, NO usa useProtected (es publica)
- React Hook Form con `loginSchema` (Zod)
- Llama `fetch('/api/auth/login')` directo (no usa `api.ts` porque no necesita token)
- En exito: `login(token, user)` + `router.replace('/')`
- Toggle show/hide password con Eye/EyeOff de lucide
- Error global en `errors.root.message` mostrado en error-container

### `/auth/register` (`app/auth/register/page.tsx`)
- `'use client'`, NO usa useProtected
- React Hook Form con `registerSchema` (Zod)
- Flujo: POST /api/auth/register → si ok, POST /api/auth/login → login() + router.replace('/')
- Si el login automatico falla, mensaje "Registro exitoso, inicia sesion manualmente"
- Toggle show/hide password

### `/ingresos` (`app/ingresos/page.tsx`)
- `'use client'`, usa `useProtected()`
- Estado: `incomes`, `categories` (filtradas a `type === 'INCOME'`), `accounts`, modal abierto/cerrado, editTarget
- `loadData()`: `Promise.all([api.get('/ingresos'), api.get('/categorias'), api.get('/cuentas')])`
- Formulario (Modal) con `incomeSchema`: name, amount (number), categoryId (SelectField), accountId (SelectField), date (input date), frequency (SelectField: DAILY/WEEKLY/MONTHLY/ONE_TIME)
- Soporte para edicion: PUT `/api/ingresos/${id}` y eliminacion: DELETE
- `frequencyLabels`: `{ DAILY: 'Diario', WEEKLY: 'Semanal', MONTHLY: 'Mensual', ONE_TIME: 'Unico' }`
- Fechas en inputs: `new Date(income.date).toISOString().split('T')[0]`

### `/gastos` (`app/gastos/page.tsx`)
- `'use client'`, usa `useProtected()`
- Igual que ingresos pero con `expenseSchema`: usa `description` en lugar de `name`
- Categorias filtradas a `type === 'EXPENSE'`
- Tiene filtro por categoria (`filterCat` state)
- CRUD completo via `/api/gastos` y `/api/gastos/[id]`

### `/deudas` (`app/deudas/page.tsx`)
- `'use client'`, usa `useProtected()`
- CRUD de Debt via `/api/deudas` y `/api/deudas/[id]`
- Formulario con `debtSchema`: name, entity, balance, interestRate, minPayment, dueDate
- Incluye calculadora de pago de deudas integrada en la pagina:
  - Metodos: `snowball` (menor saldo primero) o `avalanche` (mayor interes primero)
  - Input de pago extra mensual
  - Funcion `calcPayoffPlan()` calcula meses hasta liquidar, interes total, orden de pago
  - Simulacion mes a mes hasta 600 iteraciones max
- Tipos: `PayoffMethod = 'snowball' | 'avalanche'`, `PayoffStep`
- Pagos via `/api/pagos` (POST crea Payment + actualiza balance deuda en transaction)

### `/presupuestos` (`app/presupuestos/page.tsx`)
- `'use client'`, usa `useProtected()`
- Maneja dos entidades en la misma pagina: **Budgets** y **Goals** (metas de ahorro)
- APIs consumidas: `/api/presupuestos`, `/api/metas`
- Estados para 3 modales: `showBudgetModal`, `showGoalModal`, `showAddProgressModal`
- Presupuesto: `budgetSchema` (name, allocated). El campo `spent` se actualiza via PUT
- Meta: `goalSchema` (title, description, targetAmount, currentAmount, targetDate)
- Progreso de meta: modal adicional para agregar monto al `currentAmount`
- Funcion `goalStatus()` retorna `{ label, color }` segun porcentaje y meses restantes:
  - >=100%: "Completada" (green)
  - months<=1 && <90%: "Urgente" (red)
  - months<=3 && <50%: "Retrasada" (tertiary)
  - >=75%: "Casi ahi" (green)
  - default: "En curso" (primary)
- `monthsRemaining()`: calcula meses restantes desde now hasta targetDate

### `/ia` (`app/ia/page.tsx`)
- `'use client'`, usa `useProtected()`
- Interfaz de chat con IA financiera
- Al montar carga datos del dashboard via `api.get('/dashboard')`
- La "IA" es una funcion local `generateAdvice(data, question)` — NO hay llamada a API externa
- Respuestas basadas en keywords del mensaje + datos reales del usuario (balance, savings rate, debtToIncome)
- Keywords detectadas: deuda/deudas/pagar, ahorro/ahorrar, gasto/gastos, ingreso/ingresos, presupuesto, meta/metas, salud, patrimonio, etc.
- Estado: `messages: Message[]` donde `Message = { type: 'user' | 'assistant', text: string, time: string }`
- useRef para scroll automatico al ultimo mensaje

### `/calculadoras` (`app/calculadoras/page.tsx`)
- `'use client'`, usa `useProtected()`
- Calculadoras financieras sin llamadas a API (todo local)
- Incluye:
  - `SimpleInterestCalc` — interes simple
  - Otras calculadoras financieras (compound interest, etc.)
- Iconos: Calculator, TrendingUp, Percent, Shield, PiggyBank, Target de lucide-react
- Componentes colapsables con ChevronDown/ChevronUp

---

## 8. Datos de seed (`/api/seed`)

**Endpoint:** `GET /api/seed?key=SEED_KEY`

**Idempotente:** Verifica si existe `alex@finanzasdev.com` antes de crear nada. Si ya existe, retorna `{ ok: true, message: 'Ya estaba inicializado' }`.

### 15 Categorias globales creadas

**INCOME (6):**
1. Salario
2. Freelance
3. Inversiones
4. Regalos
5. Primas
6. Pagos no recurrentes

**EXPENSE (9):**
1. Arriendo
2. Transporte
3. Alimentacion
4. Suscripciones
5. Entretenimiento
6. Salud
7. Lujos
8. Tecnologia
9. Gustos

### 3 Usuarios creados por el seed

| Usuario | Email | Password | Tipo |
|---------|-------|----------|------|
| Alex Sterling | alex@finanzasdev.com | test1234 | Demo con datos completos |
| Diego De la hoz | diego@finanzasdev.com | 1004360 | Cuenta limpia |
| Melissa Perez | melissa@finanzasdev.com | 108283 | Cuenta limpia |

**Alex Sterling** tiene datos de ejemplo:
- 3 cuentas: Cuenta Principal (BANK, $142.580 COP), Efectivo (CASH, $50.000 COP), Ahorro (BANK, $800.000 COP)
- 3 ingresos: Salario mensual $8.5M, Proyecto freelance $1.2M, Dividendos CDT $700K
- 5 gastos: Arriendo $1.2M, TransMilenio $95K, Supermercado $430K, Streaming $75K, Restaurante $85K
- 1 deuda: Tarjeta Premium (Bancolombia), balance $4.285.000, tasa 19.4%, pago min $95K
- 1 pago registrado: $125.000
- 4 presupuestos: Alimentacion, Transporte, Entretenimiento, Tecnologia
- 3 metas: Fondo de Emergencia (75%), Fondo Carro (32%), Viaje Europa (92%)
- 2 alertas

**Diego y Melissa**: solo cuentas vacias (3 c/u) + alert de bienvenida.

---

## 9. Infraestructura Docker

### `Dockerfile` — Multi-stage, node:20-alpine

**Stage 1 (deps):**
```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci
```

**Stage 2 (builder):**
```dockerfile
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NODE_ENV=production
RUN npm run build
```

**Stage 3 (runner — produccion):**
```dockerfile
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl wget
# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# Copiar artefactos con ownership nextjs:nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
```

**Razon del `openssl` en Alpine:** Prisma requiere openssl para el binary target `linux-musl-openssl-3.0.x` definido en schema.prisma.

### `docker/entrypoint.sh`
```sh
#!/bin/sh
set -e
echo "[lumina] Running Prisma migrations..."
npx prisma migrate deploy
echo "[lumina] Starting Next.js..."
exec npm start
```
Cada vez que el contenedor inicia: aplica migraciones pendientes y arranca Next.js.

### `docker-compose.yml` (desarrollo local)
```yaml
services:
  db:
    image: postgres:15-alpine
    ports: ['5433:5432']  # Puerto externo 5433 para no conflicto con postgres local
    environment: POSTGRES_DB=finanzasdev, POSTGRES_USER=postgres, POSTGRES_PASSWORD=postgres
    volumes: [postgres-data:/var/lib/postgresql/data]
  web:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/finanzasdev
      JWT_SECRET: super_secure_change_me
    ports: ['3000:3000']
    depends_on: [db]
```

### `docker-compose.prod.yml` (produccion en VPS)
```yaml
services:
  postgres:
    container_name: lumina_postgres
    image: postgres:15-alpine
    restart: unless-stopped
    healthcheck: pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
  app:
    container_name: lumina_app
    build: context=., dockerfile=Dockerfile
    restart: unless-stopped
    env_file: .env
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    depends_on: [postgres (condition: service_healthy)]
    healthcheck: wget -qO- http://localhost:3000/api/health
  nginx:
    container_name: lumina_nginx
    image: nginx:1.25-alpine
    restart: unless-stopped
    ports: [80:80, 443:443]
    volumes:
      - ./nginx/nginx.conf → /etc/nginx/nginx.conf
      - ./nginx/conf.d → /etc/nginx/conf.d
      - ./nginx/ssl → /etc/nginx/ssl
      - nginx_logs → /var/log/nginx
    depends_on: [app (condition: service_healthy)]
networks: lumina_net (bridge)
volumes: lumina_postgres_data, lumina_nginx_logs
```

---

## 10. Nginx (`nginx/conf.d/app.conf`)

### HTTP (puerto 80)
- `server_name _` (cualquier host)
- `/.well-known/acme-challenge/` → `/var/www/certbot` (para certbot Let's Encrypt)
- Todo lo demas → `return 301 https://$host$request_uri`

### HTTPS (puerto 443)
- `http2 on`
- SSL: `/etc/nginx/ssl/self-signed.crt` y `/etc/nginx/ssl/self-signed.key` (self-signed temporal)
- Protocolos: TLSv1.2 y TLSv1.3
- HSTS: `max-age=63072000; includeSubDomains; preload`
- Security headers en todas las respuestas

**Upstream dinamico (clave para evitar error al arrancar si app no existe aun):**
```nginx
set $upstream http://app:3000;
```
Esto hace que nginx resuelva el DNS de `app` en cada request, no al arrancar.

**Rate limiting:**
- `/api/auth/` → zona `auth`, `burst=3 nodelay`
- `/api/` → zona `api`, `burst=20 nodelay`
- `/` → zona `general`, `burst=100 nodelay`
- HTTP 429 en limit_req_status

**Static assets:**
- `/_next/static/` → `Cache-Control: public, max-age=31536000, immutable`, `access_log off`

**Cloudflare real IP:** Configurado en `nginx/nginx.conf` (no en app.conf) — el `nginx.conf` incluye `real_ip_header CF-Connecting-IP` y las rangos de IP de Cloudflare.

**resolver:** `resolver 127.0.0.11` (DNS interno de Docker) configurado en `nginx/nginx.conf`.

---

## 11. Variables de entorno

**Archivo de referencia:** `.env.example`. Copiar a `.env` antes de desplegar.

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_DB` | Nombre de la base de datos | `finanzasdev` |
| `POSTGRES_USER` | Usuario PostgreSQL | `lumina_user` |
| `POSTGRES_PASSWORD` | Password PostgreSQL | String fuerte |
| `DATABASE_URL` | URL completa de conexion Prisma | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secreto para firmar JWT (min 32 chars) | Generar: `openssl rand -base64 64` |
| `SEED_KEY` | Clave para el endpoint /api/seed | String aleatorio |
| `NODE_ENV` | Entorno | `production` |
| `NEXT_PUBLIC_APP_URL` | URL publica de la app | `https://31.97.138.41` o dominio |

**Dev local (`docker-compose.yml`):**
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/finanzasdev`
- `JWT_SECRET=super_secure_change_me` (solo dev — auth.ts lo acepta en no-produccion)

**Prod (`docker-compose.prod.yml`):**
- `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- Los demas via `.env`

---

## 12. Scripts disponibles

### NPM scripts (package.json)
```bash
npm run dev    # Inicia Next.js en modo desarrollo
npm run build  # Build de produccion
npm run start  # Inicia servidor produccion (requiere build previo)
npm run lint   # ESLint
npm run seed   # ts-node --transpile-only prisma/seed.ts (seed local sin Docker)
```

### `scripts/deploy.sh` — Deploy en VPS
```bash
./scripts/deploy.sh
# Pasos:
# 1. Verifica .env y docker-compose.prod.yml existen
# 2. git pull origin main
# 3. docker compose -f docker-compose.prod.yml build --no-cache app
# 4. docker compose -f docker-compose.prod.yml up -d --remove-orphans
# 5. Espera hasta 120s que lumina_app sea healthy (polling cada 5s, 24 intentos)
# 6. docker image prune -f
```

### `scripts/backup.sh` — Backup PostgreSQL
```bash
./scripts/backup.sh
# - Crea backups/ si no existe
# - pg_dump desde contenedor lumina_postgres
# - Comprime con gzip → backups/backup_YYYYMMDD_HHMMSS.sql.gz
# - Elimina backups de mas de 30 dias
# Cron sugerido: 0 3 * * * /opt/lumina/scripts/backup.sh >> /var/log/lumina-backup.log 2>&1
```

### `scripts/restore.sh` — Restaurar backup
```bash
./scripts/restore.sh backups/backup_20260617_030000.sql.gz
# - Pide confirmacion "yes"
# - DROP DATABASE + CREATE DATABASE en lumina_postgres
# - Restaura desde .gz via gunzip | psql
# - Recordar reiniciar: docker restart lumina_app
```

---

## 13. Comandos frecuentes VPS

```bash
# Acceso SSH
ssh root@31.97.138.41
cd /opt/lumina

# Estado de contenedores
docker compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker logs -f lumina_app
docker logs -f lumina_nginx
docker logs -f lumina_postgres

# Deploy completo
./scripts/deploy.sh

# Solo reiniciar la app (sin rebuild)
docker restart lumina_app

# Health check manual
curl -k https://localhost/api/health
# O desde afuera:
curl -k https://31.97.138.41/api/health

# Seed de base de datos (primera vez)
curl -k "https://localhost/api/seed?key=TU_SEED_KEY"

# Backup manual
./scripts/backup.sh

# Restaurar backup
./scripts/restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz

# Conectar a PostgreSQL directamente
docker exec -it lumina_postgres psql -U lumina_user -d finanzasdev

# Ver migraciones aplicadas
docker exec lumina_app npx prisma migrate status

# Reconstruir sin cache (si hay problemas)
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Limpiar imagenes viejas
docker image prune -f

# Ver uso de disco
df -h
du -sh /opt/lumina/backups/
```

---

## 14. Estado actual del proyecto y pendientes conocidos

### Lo que esta funcionando (al corte del documento)
- CRUD completo: ingresos, gastos, deudas, presupuestos, metas de ahorro
- Dashboard con health score, cash flow chart (Recharts), transacciones recientes
- Autenticacion JWT con 7 dias de expiracion
- 3 cuentas por defecto al registrarse + alerta de bienvenida
- Filtro de categorias: pagina `/ingresos` filtra categorias `type === 'INCOME'`, pagina `/gastos` filtra `type === 'EXPENSE'`
- Calculadora de payoff de deudas (snowball y avalanche) integrada en /deudas
- Asesor de IA local (sin API externa, basado en keywords y datos del usuario)
- Calculadoras financieras en /calculadoras
- Docker produccion con Nginx, SSL self-signed, rate limiting
- Scripts de deploy, backup y restore

### Pendientes / notas importantes
1. **SSL:** Actualmente self-signed (`nginx/ssl/self-signed.crt`). Pendiente configurar **Let's Encrypt con certbot**. El bloque `/.well-known/acme-challenge/` ya esta configurado en nginx para esto.

2. **Categorias globales sin userId:** El modelo `Category` no tiene campo `userId`. Todas las categorias son compartidas entre todos los usuarios. Si se quiere personalizar categorias por usuario, requiere migrar el schema.

3. **Campo `currency` en Account:** El schema tiene `@default("USD")` pero el seed y el register crean cuentas con `currency: 'COP'`. Considerar cambiar el default en el schema.

4. **Seed:** Debe correrse manualmente una vez despues del primer deploy:
   ```
   GET /api/seed?key=<SEED_KEY>
   ```
   Es idempotente, se puede llamar multiples veces sin dano.

5. **IA local:** La pagina `/ia` no llama a ninguna API de LLM externa. Es una funcion `generateAdvice()` local basada en keywords. Si se quiere integrar Claude/OpenAI real, hay que agregar la ruta `/api/ia` y la variable de API key.

6. **Bell (notificaciones):** El boton de campana en TopBar existe pero no tiene funcionalidad implementada. Las alertas se guardan en BD pero no hay UI para verlas.

7. **Dark mode:** El modelo `Setting` tiene `darkMode: boolean` pero no hay implementacion de dark mode en el frontend.

8. **Balance de cuentas:** El campo `balance` en `Account` no se actualiza automaticamente al crear ingresos/gastos. Es manual. El dashboard suma los balances actuales de las cuentas.

9. **Prisma version:** Usando v4 (no v5). Si se actualiza, revisar cambios de API breaking.

---

## 15. Convenciones del codigo

### Generales
- `'use client'` al inicio de TODOS los archivos de pagina (`app/**/page.tsx`) y componentes que usen hooks React o del browser
- Las API routes (`app/api/**/route.ts`) NO llevan `'use client'` — son server-side
- Alias de imports: `@/` mapea a la raiz del proyecto (configurado en tsconfig)

### Formularios
- Siempre: **React Hook Form** + **Zod** via `zodResolver`
- Schema en `lib/validators.ts`, type inferido con `z.infer<typeof schema>`
- Pattern en paginas (evitar el cast any cuando sea posible):
  ```tsx
  useForm<SchemaInput>({ resolver: zodResolver(schema) as any })
  ```
  El `as any` existe porque hay incompatibilidades de tipos entre versiones de zod y hookform resolvers.

### API calls desde el cliente
- SIEMPRE usar `api.get/post/put/delete` de `lib/api.ts`
- NUNCA usar `fetch` directo en paginas (salvo en login/register que no necesitan token)
- Los paths no incluyen `/api`, ej: `api.get('/ingresos')` → internamente llama `/api/ingresos`

### Formato de moneda
```ts
new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
// Resultado: $ 1.200.000
```

### Formato de fechas para inputs `<input type="date">`
```ts
// Para prellenar un input date con valor existente:
new Date(item.date).toISOString().split('T')[0]
// Resultado: "2026-06-17"
```

### Estructura de paginas (patron repetido)
```tsx
'use client';
// imports...

export default function XPage() {
  const { user, isLoading } = useProtected();
  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // ...

  async function loadData() {
    try {
      const res = await api.get<...>('/ruta');
      setData(res.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  if (isLoading || loadingData) return <PageSpinner />;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-surface text-on-surface pb-32">
      <TopBar title="..." />
      <section className="pt-24 pb-6 px-6 max-w-2xl mx-auto space-y-6">
        {/* contenido */}
      </section>
      {showModal && <Modal title="..." onClose={() => setShowModal(false)}>...</Modal>}
      <BottomNav />
    </main>
  );
}
```

### Validadores Zod (`lib/validators.ts`)
- `registerSchema`: name (min 2), email (email), password (min 6)
- `loginSchema`: email (email), password (min 1)
- `incomeSchema`: name (min 2), amount (number positive), categoryId (min 1), accountId (min 1), date (min 1), frequency (enum)
- `expenseSchema`: description (min 2), amount (number positive), categoryId, accountId, date, frequency
- `debtSchema`: name (min 2), entity (min 2), balance (positive), interestRate (0-100), minPayment (positive), dueDate (min 1)
- `budgetSchema`: name (min 2), allocated (positive)
- `goalSchema`: title (min 2), description (min 2), targetAmount (positive), currentAmount (>=0, default 0), targetDate (min 1)
- `paymentSchema`: debtId (min 1), amount (positive)

### Estructura de archivos relevantes
```
/
├── app/
│   ├── layout.tsx              # RootLayout, Inter font, metadata
│   ├── page.tsx                # Dashboard (/)
│   ├── providers.tsx           # AuthProvider wrapper
│   ├── globals.css             # Tailwind v4 @import + @theme + utilidades
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── ingresos/page.tsx
│   ├── gastos/page.tsx
│   ├── deudas/page.tsx
│   ├── presupuestos/page.tsx   # Budgets + Goals en la misma pagina
│   ├── ia/page.tsx
│   ├── calculadoras/page.tsx
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/register/route.ts
│       ├── dashboard/route.ts
│       ├── ingresos/route.ts + [id]/route.ts
│       ├── gastos/route.ts + [id]/route.ts
│       ├── deudas/route.ts + [id]/route.ts
│       ├── presupuestos/route.ts + [id]/route.ts
│       ├── metas/route.ts + [id]/route.ts
│       ├── pagos/route.ts
│       ├── categorias/route.ts
│       ├── cuentas/route.ts
│       ├── health/route.ts
│       └── seed/route.ts
├── components/
│   ├── ui/
│   │   ├── field.tsx           # Input, SelectField, Field, FieldLabel, FieldError, Btn
│   │   ├── modal.tsx           # Modal con subtitle prop
│   │   └── spinner.tsx         # Spinner, PageSpinner
│   ├── layout/
│   │   ├── topbar.tsx
│   │   └── bottomnav.tsx
│   └── dashboard/
│       └── cashflow-chart.tsx  # Recharts BarChart para flujo de caja
├── lib/
│   ├── api.ts                  # Cliente HTTP con auth token automatico
│   ├── auth.ts                 # bcrypt + JWT helpers
│   ├── prisma.ts               # Singleton PrismaClient
│   ├── validators.ts           # Esquemas Zod
│   └── hooks/
│       └── useAuth.tsx         # AuthProvider, useAuth, useProtected
├── prisma/
│   ├── schema.prisma
│   └── migrations/             # Migraciones SQL generadas por Prisma
├── nginx/
│   ├── nginx.conf              # Config principal nginx (resolver, rate zones, Cloudflare IPs)
│   ├── conf.d/
│   │   ├── app.conf            # Server blocks HTTP+HTTPS
│   │   └── proxy_params.conf   # Headers proxy comunes
│   └── ssl/
│       ├── self-signed.crt     # Certificado self-signed (no en git)
│       └── self-signed.key     # Clave privada (no en git)
├── docker/
│   └── entrypoint.sh           # prisma migrate deploy + npm start
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   └── restore.sh
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # Dev local (postgres en 5433)
├── docker-compose.prod.yml     # Produccion VPS
├── next.config.mjs             # reactStrictMode, security headers, cache static
├── tailwind.config.ts          # Solo content paths, plugins: []
├── .env.example                # Template de variables de entorno
└── package.json
```
