# ================================================================
# Mustafa Academy API — Production Dockerfile
# Multi-stage build: builder → runner
# ================================================================

# ── Stage 1: Dependencies ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules (bcrypt, sharp)
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

RUN npm ci --workspace=apps/api --include-workspace-root

# ── Stage 2: Builder ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Compile TypeScript
RUN cd apps/api && npm run build

# ── Stage 3: Runner ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 academy

# Install only production runtime deps
RUN apk add --no-cache dumb-init

# Copy built artifacts
COPY --from=builder --chown=academy:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=academy:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=academy:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=academy:nodejs /app/apps/api/package.json ./

USER academy

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
