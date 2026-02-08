# Base stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=@daehanpns/api --workspace=@daehanpns/shared

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

# Build the application
RUN npm run build --workspace=@daehanpns/api

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared ./packages/shared

# Expose port
EXPOSE 3000

# Start the application
WORKDIR /app/apps/api

# Copy env check script
COPY --from=builder /app/apps/api/check-env.js ./check-env.js

# Start with environment check (removed healthcheck temporarily for debugging)
CMD ["sh", "-c", "echo '=== STARTING APPLICATION ===' && node check-env.js 2>&1 && echo '=== STARTING NESTJS ===' && node dist/apps/api/src/main.js 2>&1"]
