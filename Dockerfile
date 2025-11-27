# High Wizardry Game Server Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev for any build steps)
RUN npm ci --only=production

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S highwizardry -u 1001 -G nodejs

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY --chown=highwizardry:nodejs package*.json ./
COPY --chown=highwizardry:nodejs server/ ./server/
COPY --chown=highwizardry:nodejs jsjs/ ./jsjs/
COPY --chown=highwizardry:nodejs src/ ./src/
COPY --chown=highwizardry:nodejs index.html ./
COPY --chown=highwizardry:nodejs game-core.js ./
COPY --chown=highwizardry:nodejs game-new.js ./
COPY --chown=highwizardry:nodejs high-wizardry-ui.js ./
COPY --chown=highwizardry:nodejs event-demo.html ./

# Copy CSS directory (note: directory name has special character)
COPY --chown=highwizardry:nodejs {css/ ./{css/

# Create data directory for persistent storage
RUN mkdir -p /app/server/data /app/backups && \
    chown -R highwizardry:nodejs /app/server/data /app/backups

# Switch to non-root user
USER highwizardry

# Environment variables with defaults
ENV NODE_ENV=production \
    PORT=8080

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { host: 'localhost', port: process.env.PORT || 8080, path: '/api/health', timeout: 5000 }; const req = http.get(options, res => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.on('timeout', () => { req.destroy(); process.exit(1); });"

# Start the server
CMD ["node", "server/index.js"]
