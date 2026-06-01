# --- install deps with Bun (the package manager) -----------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build the SPA (Node runtime: V8 heap flag + the tested Vite build) ------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked into the bundle — the URL the BROWSER uses to reach the sync server.
ARG VITE_SYNC_URL=ws://localhost:1234
ENV VITE_SYNC_URL=$VITE_SYNC_URL
# Bundling @dbml/core (antlr4) is memory-heavy — raise V8's heap so the build doesn't OOM.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# --- serve static via nginx --------------------------------------------------
FROM nginx:alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
