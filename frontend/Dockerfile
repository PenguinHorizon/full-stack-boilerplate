# ── Build stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time. The API is same-origin (/api/v1),
# proxied by nginx.conf to the `api` service.
ARG VITE_API_URL=/api/v1
ARG VITE_PLATFORM_DOMAIN=localhost
ARG VITE_PLATFORM_NAME="Tourism Platform"
ENV VITE_API_URL=$VITE_API_URL     VITE_PLATFORM_DOMAIN=$VITE_PLATFORM_DOMAIN     VITE_PLATFORM_NAME=$VITE_PLATFORM_NAME
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
