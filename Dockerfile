# --- build the SPA -----------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Baked into the bundle at build time — the URL the BROWSER uses to reach the sync server.
# For local docker-compose the browser hits the published host port, so localhost:1234 is correct.
ARG VITE_SYNC_URL=ws://localhost:1234
ENV VITE_SYNC_URL=$VITE_SYNC_URL
RUN npm run build

# --- serve static via nginx --------------------------------------------------
FROM nginx:alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
