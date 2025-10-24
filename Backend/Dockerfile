# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm (match lockfile's pnpm major version)
RUN npm install -g pnpm@latest

# Install dependencies and allow lifecycle scripts (needed for Prisma)
RUN pnpm install --no-frozen-lockfile --ignore-scripts=false

# Copy source code and prisma schema
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the application using TypeScript compiler
RUN pnpm exec tsc -p tsconfig.build.json

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install system dependencies required by Prisma (OpenSSL runtime)
RUN apk add --no-cache openssl

# Install pnpm (match builder version)
RUN npm install -g pnpm@latest

# Copy package manifest for production install
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies (keep dev deps so Prisma CLI is available)
RUN pnpm install --no-frozen-lockfile --ignore-scripts=false

# Copy built application and Prisma schema from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Regenerate Prisma client to ensure engines exist in runtime image
RUN pnpm exec prisma generate

# Generate Prisma client for the runtime image
# Note: do NOT run `pnpm prisma generate` in the runtime image because
# the `prisma` CLI is a devDependency. Instead we rely on `@prisma/client`'s
# postinstall (run by `pnpm install --prod --ignore-scripts=false`) to
# place the runtime engine files under node_modules/.prisma.

# Expose port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
