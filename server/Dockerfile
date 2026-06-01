# Yjs sync + SQLite storage server (server/sync/server.cjs).
# Build context is the repo root so node_modules resolves the same way as in the repo
# (server.cjs requires y-websocket/bin/utils.cjs by ../../node_modules path).
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
ENV PORT=1234
ENV DB_PATH=/data/drawer.sqlite
EXPOSE 1234
VOLUME /data
CMD ["node", "server/sync/server.cjs"]
