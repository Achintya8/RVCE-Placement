# ── Production Dockerfile for RVCE Placement Frontend ──
# Multi-stage: build with Node, serve with Nginx

# ── Stage 1: Build the Vite app ──
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inject build-time environment variables
ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# ── Stage 2: Serve with Nginx ──
FROM nginx:1.27-alpine
LABEL org.opencontainers.image.source="https://github.com/Achintya8/RVCE-Placement"
LABEL org.opencontainers.image.description="RVCE Placement Portal — Frontend (Nginx)"

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
