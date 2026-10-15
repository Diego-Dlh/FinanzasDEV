# Pruebas

| Tipo | Qué prueba | Comando |
|------|-----------|---------|
| **Unitarias** (`tests/unit`) | Fórmulas puras: fechas y zona horaria, cuotas de tarjeta, tasas E.A., préstamos, interés compuesto, meta de ahorro | `npm run test:unit` |
| **End-to-end** (`tests/e2e`) | La API real contra Postgres: seguridad, saldos, validación, concurrencia, lógica financiera | `npm run test:e2e` |

Las e2e **no usan mocks**: levantan peticiones HTTP contra un servidor en marcha y una base de datos real, así que ejercitan rutas, validación, transacciones y bloqueos. Cada ejecución crea sus propios usuarios, por lo que se pueden repetir sobre la misma base de datos.

## Ejecutarlas en local

```bash
# 1. Base de datos de desarrollo
docker compose up -d db                    # Postgres en localhost:5433

# 2. Variables (las mismas deben estar en el servidor y en las pruebas)
export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/finanzasdev
export JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
export SEED_KEY=semilla-de-pruebas-1234
export ADMIN_EMAIL=admin@test.local
export ADMIN_PASSWORD=ClaveDeAdmin123
export BASE_URL=http://localhost:3000      # opcional, es el valor por defecto

# 3. Esquema y servidor
npx prisma migrate deploy
npm run build && npm start &               # o `npm run dev` en otra terminal

# 4. Pruebas
npm test                                   # unitarias + e2e
node tests/e2e/finance.mjs                 # o una sola suite
```

> Las pruebas llaman a `/api/admin/setup?resetPassword=1`, que **restablece la contraseña del admin**. Úsalas contra una base de datos de pruebas, nunca contra producción.

## Suites e2e

| Archivo | Cubre |
|---------|-------|
| `security.mjs` | Acceso a datos ajenos, rutas eliminadas, `admin/setup`, tokens falsos/vencidos/sin firma, login |
| `balances.mjs` | Pagos de deuda, abonos y compras de tarjeta, gastos vinculados, categorías de sistema (incluye peticiones simultáneas) |
| `api-robustness.mjs` | Sesiones (`tokenVersion`), JSON inválido, validación, emails, deudas saldadas, rutas de admin |
| `concurrency.mjs` | Ediciones y borrados simultáneos de ingresos/gastos: el saldo debe quedar exacto |
| `finance.mjs` | Compras de tarjeta como gasto, presupuestos por categoría, patrimonio, salud financiera, alertas, conciliación |

El CI (`.github/workflows/ci.yml`) ejecuta todo esto en cada push y pull request.
