# syntax=docker/dockerfile:1

# ============================
# STAGE: base  (build inputs only)
# Purpose: define the minimal source inputs that later stages will pull from.
# - Improves cache hits by copying package*.json first.
# - DO NOT COPY .env/tests/docs here (keep attack surface + context small).
# ============================
FROM node:24.4.0-alpine AS base
WORKDIR /app
# Only package files first -> best cache hits for npm ci
COPY --chown=node:node package*.json ./
# Build inputs (no .env, no docs, no tests)
COPY --chown=node:node tsconfig*.json ./
COPY --chown=node:node src/ src/
COPY --chown=node:node prisma/ prisma/





# ============================
# STAGE: deps-prod  (install prod deps only)
# Purpose: produce a lean node_modules with ONLY runtime dependencies.
# Used later by runtime-prod so you don’t ship dev tools to production.
# ============================
FROM node:24.4.0-alpine AS deps-prod
WORKDIR /app
COPY --chown=node:node --from=base /app/package*.json ./
# upgrade npm
RUN npm install -g npm@latest
RUN npm ci --omit=dev --ignore-scripts
COPY --chown=node:node --from=base /app ./

# ============================
# STAGE: deps-dev  (install full deps)
# Purpose: full node_modules including devDependencies for building (nest, typescript, etc.).
# Used by builder to compile TS → JS.
# ============================
FROM node:24.4.0-alpine AS deps-dev
WORKDIR /app
COPY --chown=node:node --from=base /app/package*.json ./
# upgrade npm
RUN npm install -g npm@latest
RUN npm ci
COPY --chown=node:node --from=base /app ./


# ============================
# STAGE: builder-prod  (compile application)
# Purpose: use dev deps (nest/tsc) to build TS → JS, generate artifacts if needed.
# Output: /app/dist (+ optional Prisma client if you uncomment generate).
# ============================
FROM node:24.4.0-alpine AS builder-prod
WORKDIR /app
# Use full deps for build
COPY --chown=node:node --from=deps-dev /app/node_modules ./node_modules
# Bring source (allowlisted) from base
COPY --chown=node:node --from=base /app ./

# Build your app 
RUN npm run build && npx prisma generate

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
FROM node:24.4.0-alpine AS runtime-prod
WORKDIR /app
ENV APP_DEBUG=false
ENV NODE_ENV=production

# Prod deps only
COPY --chown=node:node --from=deps-prod /app/node_modules ./node_modules
# Compiled JS only
COPY --chown=node:node --from=builder-prod /app/dist ./dist
# If migrations are needed at runtime, bring them:
COPY --chown=node:node --from=base /app/prisma/migrations ./prisma/migrations
# If you need the Prisma client, uncomment this line:
COPY --chown=node:node --from=builder-prod /app/node_modules/.prisma ./node_modules/.prisma


EXPOSE 3001
CMD ["node", "dist/main.js"]

# ============================
# STAGE: runtime-dev  (development convenience image)
# Purpose: includes full deps + sources for watch mode (nodemon/nest start:dev).
# Not used in prod; great for local Docker dev loops.
# ============================
FROM node:24.4.0-alpine AS runtime-dev
WORKDIR /app
ENV APP_DEBUG=true
ENV NODE_ENV=development

# Full deps for dev (nodemon, etc)
COPY --chown=node:node --from=deps-dev /app/node_modules ./node_modules
# Keep sources + tsconfigs for watch mode
COPY --chown=node:node --from=base /app ./

# Generate Prisma client
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]
