# FinanzasDEV

Aplicación web de gestión financiera personal premium construida con Next.js 15, TypeScript, TailwindCSS y Prisma.

## Características

- Dashboard financiero con resúmenes clave
- Gestión de deudas con métodos Snowball y Avalanche
- Presupuestos y metas financieras
- Módulo IA de recomendaciones
- Multiple cuentas financieras y reportes
- Backend con JWT, bcrypt, PostgreSQL y Prisma
- Preparado para Docker y Render

## Tecnologías

- Next.js 15
- TypeScript
- TailwindCSS
- Prisma
- PostgreSQL
- Recharts
- React Hook Form
- Zod
- Lucide Icons

## Instalación local

1. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Ajusta `DATABASE_URL` para tu entorno local.

3. Inicia PostgreSQL local o usa Docker:

```bash
docker-compose up -d
```

4. Instala dependencias:

```bash
npm install
```

5. Ejecuta migraciones y la semilla de datos:

```bash
npx prisma migrate deploy
npm run seed
```

6. Inicia el proyecto:

```bash
npm run dev
```

## Despliegue en Render

Configura `DATABASE_URL`, `JWT_SECRET` y `NEXTAUTH_SECRET` en Render.

## Estructura del proyecto

- `app/` – páginas y rutas de Next.js
- `components/` – componentes reutilizables UI
- `lib/` – utilidades, Prisma y auth
- `prisma/` – esquema de datos y seed

## Notas

Este proyecto está diseñado para respetar el sistema visual ya definido en `screenDesing` y ofrece una base escalable para construir todas las funcionalidades solicitadas.
