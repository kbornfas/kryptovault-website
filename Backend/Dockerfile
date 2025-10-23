# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm (pin to v9 to match lockfile format v9)
RUN npm install -g pnpm@9.12.3

# Install dependencies (allow lifecycle scripts for Prisma binaries)
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
RUN npm install -g pnpm@9.12.3

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only (keep lifecycle scripts enabled)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts=false

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
