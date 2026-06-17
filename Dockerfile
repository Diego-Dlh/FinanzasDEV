# ─── Stage 1: Install all dependencies (dev + prod needed for build) ──────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client for the target platform (linux/alpine)
RUN npx prisma generate
ENV NODE_ENV=production
RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat wget

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# App files
COPY --from=builder --chown=nextjs:nodejs /app/.next          ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules   ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma         ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder                        /app/package.json   ./package.json

# Entrypoint: runs migrations then starts Next.js
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
