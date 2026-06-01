# Yjs sync + PostgreSQL storage server (server/sync/server.cjs).
# Deps are installed with Bun; the server runs on Node.
# server.cjs requires y-websocket/bin/utils.cjs by ../../node_modules path.

# --- install prod deps with Bun ----------------------------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# --- run on Node -------------------------------------------------------------
FROM node:24-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server ./server
# Oracle Instant Client (optional): install libaio + Oracle IC, set LD_LIBRARY_PATH,
# then oracledb can connect for /api/db/* Oracle introspect. See docs/adr/0005-remote-db-import.md.
ENV PORT=1234
ENV DATABASE_URL=postgres://drawer:drawer@db:5432/drawer
EXPOSE 1234
CMD ["node", "server/sync/server.cjs"]
