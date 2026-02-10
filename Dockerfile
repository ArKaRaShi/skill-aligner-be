# syntax=docker/dockerfile:1

# ============================
# STAGE: bun-base  (common base with required system packages)
# Purpose: provide a single place to install OS-level dependencies reused across stages.
# ============================
FROM oven/bun:1.2.22-slim AS bun-base

USER root
RUN set -eux; \
    apt-get update -y; \
    apt-get install -y --no-install-recommends ca-certificates openssl procps; \
    rm -rf /var/lib/apt/lists/*
USER bun


# ============================
# STAGE: base  (build inputs only)
# Purpose: define the minimal source inputs that later stages will pull from.
# - Improves cache hits by copying package*.json first.
# - DO NOT COPY .env/tests/docs here (keep attack surface + context small).
# ============================
FROM bun-base AS base
WORKDIR /app
# Only package files first -> best cache hits for bun install
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun bun.lock ./
# Build inputs (no .env, no docs, no tests)
COPY --chown=bun:bun tsconfig*.json ./
COPY --chown=bun:bun src/ src/
COPY --chown=bun:bun prisma/ prisma/



# ============================
# STAGE: deps-prod  (install prod deps only)
# Purpose: produce a lean node_modules with ONLY runtime dependencies.
# Used later by runtime-prod so you don’t ship dev tools to production.
# ============================
FROM bun-base AS deps-prod
WORKDIR /app
COPY --chown=bun:bun --from=base /app/package.json ./package.json
COPY --chown=bun:bun --from=base /app/bun.lock ./bun.lock
COPY --chown=bun:bun --from=base /app/prisma ./prisma
RUN bun install --production --frozen-lockfile

# ============================
# STAGE: deps-dev  (install full deps)
# Purpose: full node_modules including devDependencies for building (nest, typescript, etc.).
# Used by builder to compile TS → JS.
# ============================
FROM bun-base AS deps-dev
WORKDIR /app
COPY --chown=bun:bun --from=base /app/package.json ./package.json
COPY --chown=bun:bun --from=base /app/bun.lock ./bun.lock
COPY --chown=bun:bun --from=base /app/prisma ./prisma
RUN bun install --frozen-lockfile
COPY --chown=bun:bun --from=base /app ./


# ============================
# STAGE: builder-prod  (compile application)
# Purpose: use dev deps (nest/tsc) to build TS → JS, generate artifacts if needed.
# Output: /app/dist (+ optional Prisma client if you uncomment generate).
# ============================
FROM bun-base AS builder-prod
WORKDIR /app
# Use full deps for build
COPY --chown=bun:bun --from=deps-dev /app/node_modules ./node_modules
# Bring source (allowlisted) from base
COPY --chown=bun:bun --from=base /app ./

# Build your app 
RUN bun run build && bunx prisma generate

# ============================
# STAGE: runtime-prod  (final production image)  ← used when you target runtime-prod
# Purpose: smallest, safest image:
#  - prod-only node_modules from deps-prod
#  - compiled JS from builder-prod
#  - NO TS sources, NO dev tools
# Notes:
#  - You can add USER non-root for extra hardening if desired.
#  - Keep Prisma migrations/client copy lines commented/controlled as needed.
# ============================
FROM bun-base AS runtime-prod
WORKDIR /app

# Prod deps only
COPY --chown=bun:bun --from=deps-prod /app/node_modules ./node_modules
# Compiled JS only
COPY --chown=bun:bun --from=builder-prod /app/dist ./dist
# If migrations are needed at runtime, bring them:
COPY --chown=bun:bun --from=base /app/prisma/migrations ./prisma/migrations
# If you need the Prisma client, uncomment this line:
COPY --chown=bun:bun --from=builder-prod /app/node_modules/.prisma ./node_modules/.prisma


EXPOSE 3001
CMD ["bun", "./dist/main.js"]

# ============================
# STAGE: runtime-dev  (development convenience image)
# Purpose: includes full deps + sources for watch mode (nodemon/nest start:dev).
# Not used in prod; great for local Docker dev loops.
# ============================
FROM bun-base AS runtime-dev
WORKDIR /app

# Full deps for dev (nodemon, etc)
COPY --chown=bun:bun --from=deps-dev /app/node_modules ./node_modules
# Keep sources + tsconfigs for watch mode
COPY --chown=bun:bun --from=base /app ./

# Generate Prisma client
RUN bunx prisma generate
EXPOSE 3001
CMD ["bun", "run", "start:dev"]
