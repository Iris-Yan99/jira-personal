# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:24-alpine AS frontend-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ── Stage 2: Install backend dependencies (needs build tools for better-sqlite3) ──
FROM node:24-alpine AS backend-builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

# Copy backend production deps (pre-built native addons)
COPY --from=backend-builder /app/node_modules ./node_modules

# Copy backend source
COPY server.js db.js ./
COPY routes/ ./routes/

# Copy built frontend
COPY --from=frontend-builder /app/client/dist ./client/dist

# Data directory (mounted as volume at runtime)
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
