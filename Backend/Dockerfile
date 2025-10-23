# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm (match lockfile's pnpm major version)
RUN npm install -g pnpm@latest

# Install dependencies and allow lifecycle scripts (needed for Prisma)
RUN pnpm install --frozen-lockfile --ignore-scripts=false

# Copy source code and prisma schema
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm (match builder version)
RUN npm install -g pnpm@latest

# Copy package manifest for production install
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies (allow lifecycle scripts for Prisma)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts=false

# Copy built application and Prisma schema from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client for the runtime image
RUN pnpm dlx prisma@5.22.0 generate

# Expose port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
