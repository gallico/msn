# Stage 1: build the React frontend
FROM node:22-slim AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: compile native backend deps (better-sqlite3)
FROM node:22-slim AS backend-deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 3: lean production image — no build tools, runtime libs intact
FROM node:22-slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/ ./backend/
COPY --from=frontend-build /build/dist ./frontend/dist
COPY docker-entrypoint.sh ./
RUN mkdir -p /app/backend/assets && chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
EXPOSE 3001
VOLUME ["/app/data"]
ENTRYPOINT ["./docker-entrypoint.sh"]
