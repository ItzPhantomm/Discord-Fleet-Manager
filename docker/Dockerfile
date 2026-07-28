# Multi-stage build for Discord Fleet Manager
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/*/package.json packages/*/

# Install dependencies
RUN npm ci --workspaces --include-workspace-root

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built packages and node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Create data and logs directories
RUN mkdir -p /app/data /app/logs && chown -R nodejs:nodejs /app/data /app/logs

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) process.exit(1) }).on('error', () => process.exit(1))"

CMD ["node", "packages/manager/dist/index.js"]