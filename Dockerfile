# Multi-stage build for Phantom Fleet Manager
FROM node:26-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy package files
COPY package*.json ./
COPY packages/*/package*.json ./packages/

# Install dependencies
RUN npm ci --prefer-offline --no-audit 2>&1 | tail -10

# Copy source code
COPY . .

# Build all packages
RUN npm run build 2>&1 | tail -20

# Production stage
FROM node:26-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache sqlite-libs dumb-init

# Create non-root user
RUN addgroup -g 1001 -S phantom && \
    adduser -S -u 1001 -G phantom phantom

# Copy built artifacts
COPY --from=builder --chown=phantom:phantom /app/packages/manager/dist ./packages/manager/dist
COPY --from=builder --chown=phantom:phantom /app/packages/manager/package.json ./packages/manager/package.json
COPY --from=builder --chown=phantom:phantom /app/node_modules ./node_modules
COPY --from=builder --chown=phantom:phantom /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=phantom:phantom /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder --chown=phantom:phantom /app/packages/intelligence/dist ./packages/intelligence/dist

# Create data directory
RUN mkdir -p /app/data /app/logs && chown -R phantom:phantom /app/data /app/logs

USER phantom

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/fleet.db

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/manager/dist/index.js"]