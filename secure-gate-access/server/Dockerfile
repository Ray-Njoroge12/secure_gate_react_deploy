# Multi-stage Dockerfile for Secure Gate Backend
# Production-ready Node.js application

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install --only=production && npm cache clean --force

# Copy source code
COPY . .

# Remove development files (already cleaned in Phase 1)
RUN rm -rf tests/ scripts/ reports/ || true

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create app directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy application code from builder stage
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/integration ./integration
COPY --from=builder /usr/src/app/server.js ./
COPY --from=builder /usr/src/app/.env.production ./.env

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server.js"]

