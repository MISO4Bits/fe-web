# syntax=docker/dockerfile:1.7
# Imagen de fe-web (cliente web). Multi-stage: build con Node + runtime nginx
# no-root, con healthcheck. Sirve el bundle estático generado por `ng build`.

ARG NODE_VERSION=22

# ---------- build ----------
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/fe-web/browser /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1
