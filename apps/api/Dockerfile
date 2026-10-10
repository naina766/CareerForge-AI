FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY prisma/ ./prisma/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@careerforge/types" build
RUN pnpm --filter "@careerforge/database" build
RUN pnpm --filter "@careerforge/config" build
RUN pnpm --filter "@careerforge/api" build

# Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 careerforge

COPY --from=builder /app ./

RUN mkdir -p /app/storage/uploads/resumes && \
    chown -R careerforge:nodejs /app/storage

USER careerforge

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/live || exit 1

CMD ["node", "apps/api/dist/index.js"]
