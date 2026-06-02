# --- install deps with Bun (the package manager) -----------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# SPA build only — skip native server drivers (better-sqlite3, oracledb, …); sync image installs those.
RUN bun install --frozen-lockfile --ignore-scripts

# --- build the SPA (Bun runs the same scripts as local dev) --------------------
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Override only for non-standard deployments (separate sync host). When empty (default),
# the SPA derives the WebSocket URL from window.location at runtime via nginx /sync proxy.
ARG VITE_SYNC_URL=
ENV VITE_SYNC_URL=$VITE_SYNC_URL
# Bundling @dbml/core (antlr4) is memory-heavy — raise V8's heap so the build doesn't OOM.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN bun run build

# --- serve static via nginx --------------------------------------------------
FROM nginx:alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
