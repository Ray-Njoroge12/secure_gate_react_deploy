# SecureGate Backend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S securegate -u 1001

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=securegate:nodejs . .

# Create writable directories
RUN mkdir -p logs data && chown -R securegate:nodejs logs data

# Switch to non-root user
USER securegate

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start with PM2 in cluster mode for production
CMD ["node", "--import", "./load-env.js", "server.js"]
