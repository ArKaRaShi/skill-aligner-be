# syntax=docker/dockerfile:1

# --- Base with source ---
FROM node:24.4.0-alpine AS base
WORKDIR /app
# Only package files first -> best cache hits for npm ci
COPY package*.json ./
# Build inputs (no .env, no docs, no tests)
COPY tsconfig*.json ./
COPY src/ src/
# COPY prisma/schema.prisma prisma/schema.prisma
# COPY prisma/migrations prisma/migrations  

# --- Dependencies: prod-only ---
FROM node:24.4.0-alpine AS deps-prod
WORKDIR /app
COPY --from=base /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=base /app ./

# --- Dependencies: dev (includes dev deps, nodemon, etc.) ---
FROM node:24.4.0-alpine AS deps-dev
WORKDIR /app
COPY --from=base /app/package*.json ./
RUN npm ci
COPY --from=base /app ./


# Builder: compile TS, generate Prisma
FROM node:24.4.0-alpine AS builder-prod
WORKDIR /app
# Use full deps for build
COPY --from=deps-dev /app/node_modules ./node_modules
# Bring source (allowlisted) from base
COPY --from=base /app ./

# Build your app and generate Prisma client
RUN npm run build 
# RUN npx prisma generate

# --- Runtime: PRODUCTION (small) ---
FROM node:24.4.0-alpine AS runtime-prod
WORKDIR /app
ENV APP_DEBUG=false
ENV NODE_ENV=production

# Prod deps only
COPY --from=deps-prod /app/node_modules ./node_modules
# Compiled JS only
COPY --from=builder-prod /app/dist ./dist
# If migrations are needed at runtime, bring them:
# COPY --from=base /app/prisma/migrations ./prisma/migrations
# Prisma client (generated in builder)
# COPY --from=builder-prod /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
CMD ["npm", "run", "start:prod"]

# --- Runtime: DEVELOPMENT (includes dev tooling) ---
FROM node:24.4.0-alpine AS runtime-dev
WORKDIR /app
ENV APP_DEBUG=true
ENV NODE_ENV=development

# Full deps for dev (nodemon, etc)
COPY --from=deps-dev /app/node_modules ./node_modules
# Keep sources + tsconfigs for watch mode
COPY --from=base /app ./

EXPOSE 3001
CMD ["npm", "run", "start:dev"]
