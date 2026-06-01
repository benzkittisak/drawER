# Yjs sync + PostgreSQL storage server (server/sync/server.cjs).
# Deps are installed and the server is run with Bun (CommonJS + node: builtins supported).
# server.cjs requires y-websocket/bin/utils.cjs by ../../node_modules path.

# --- install prod deps with Bun ----------------------------------------------
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# --ignore-scripts: better-sqlite3/oracledb have no Bun/musl prebuilds and would invoke node-gyp
# (needs python + toolchain). They're only used for the OPTIONAL SQLite/Oracle import (loaded
# lazily, OFF by default in prod via ENABLE_REMOTE_DB_IMPORT). The core sync server and the
# pg/mysql2/mssql drivers are pure JS, so the server runs fine without them. To enable native
# SQLite/Oracle import: add `RUN apk add --no-cache python3 make g++` and drop --ignore-scripts.
RUN bun install --frozen-lockfile --production --ignore-scripts

# Run on the same Bun/Node ABI the deps stage was built with (native addons stay valid).
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server ./server
# Oracle Instant Client (optional): install libaio + Oracle IC, set LD_LIBRARY_PATH,
# then oracledb can connect for /api/db/* Oracle introspect. See docs/adr/0005-remote-db-import.md.
ENV PORT=1234
ENV DATABASE_URL=postgres://drawer:drawer@db:5432/drawer
EXPOSE 1234
CMD ["bun", "server/sync/server.cjs"]
