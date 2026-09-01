import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __careerforge_prisma__: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__careerforge_prisma__ ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__careerforge_prisma__ = prisma;
}
