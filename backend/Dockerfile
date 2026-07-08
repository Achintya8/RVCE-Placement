# ── Production Dockerfile for RVCE Placement Backend ──
# Multi-stage build for minimal image size

# ── Stage 1: Install production dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: Production image ──
FROM node:20-alpine
LABEL org.opencontainers.image.source="https://github.com/Achintya8/RVCE-Placement"
LABEL org.opencontainers.image.description="RVCE Placement Portal — Backend API"

# tini for proper PID 1 signal handling
RUN apk add --no-cache tini

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source
COPY . .

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
