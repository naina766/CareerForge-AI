FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY prisma/ ./prisma/
COPY apps/web/ ./apps/web/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@careerforge/types" build
RUN pnpm --filter "@careerforge/web" build

# Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app ./

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["pnpm", "--filter", "@careerforge/web", "start"]
