# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm (match lockfile's pnpm major version)
RUN npm install -g pnpm@10.19.0

# Install dependencies and allow lifecycle scripts (needed for Prisma)
RUN pnpm install --frozen-lockfile --ignore-scripts=false

# Copy source code and prisma schema
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the application
RUN pnpm run build

# Remove dev dependencies to keep the runtime image slim
RUN pnpm prune --prod

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm (match builder version)
RUN npm install -g pnpm@10.19.0

# Copy runtime dependencies and manifest from the builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
