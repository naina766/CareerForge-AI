FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY prisma/ ./prisma/
COPY workers/ ./workers/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@careerforge/types" build
RUN pnpm --filter "@careerforge/database" build

# Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 careerforge

COPY --from=builder /app ./

USER careerforge

CMD ["pnpm", "worker:notification"]
