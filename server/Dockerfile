# Yjs sync + SQLite storage server (server/sync/server.cjs).
# Deps are installed with Bun; the server runs on Node because it uses node:sqlite.
# server.cjs requires y-websocket/bin/utils.cjs by ../../node_modules path, so node_modules
# sits at /app/node_modules.

# --- install prod deps with Bun ----------------------------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# --- run on Node (node:sqlite) -----------------------------------------------
FROM node:24-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server ./server
ENV PORT=1234
ENV DB_PATH=/data/drawer.sqlite
EXPOSE 1234
VOLUME /data
CMD ["node", "server/sync/server.cjs"]
