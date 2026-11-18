# Multi-stage Dockerfile for CalmLink SPA Frontend

# Stage 1: Build production bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies with frozen lockfile
COPY package*.json ./
RUN npm ci

# Copy application sources
COPY . .

# Build production bundle with TypeScript checking
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:1.27-alpine-slim AS runner

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
