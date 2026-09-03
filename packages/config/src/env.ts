import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Attempt to load .env from workspace root or current dir
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  AI_SERVICE_PORT: z.coerce.number().default(8000),
  WEB_PORT: z.coerce.number().default(3000),
  
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000/api/v1'),
  
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/careerforge?schema=public'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PORT: z.coerce.number().default(6379),
  
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('careerforge-api'),
  
  JWT_ACCESS_SECRET: z.string().default('default-insecure-jwt-access-secret-32-chars-min'),
  JWT_REFRESH_SECRET: z.string().default('default-insecure-jwt-refresh-secret-32-chars-min'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(7),
  
  AUTH_COOKIE_NAME: z.string().default('careerforge_refresh'),
  AUTH_COOKIE_SECURE: z.string().transform((v) => v === 'true').default('false'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  
  MAX_RESUME_SIZE_MB: z.coerce.number().default(5),
  RESUME_STORAGE_DIR: z.string().default('./storage/uploads/resumes'),
  
  LLM_PROVIDER: z.enum(['mock', 'openai', 'anthropic', 'gemini', 'ollama']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateAndParseEnv(): EnvConfig {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const prodErrors: string[] = [];
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || accessSecret === 'default-insecure-jwt-access-secret-32-chars-min') {
      prodErrors.push('JWT_ACCESS_SECRET must be explicitly set to a strong secret in production');
    } else if (accessSecret.length < 32) {
      prodErrors.push('JWT_ACCESS_SECRET must be at least 32 characters long in production');
    }

    if (!refreshSecret || refreshSecret === 'default-insecure-jwt-refresh-secret-32-chars-min') {
      prodErrors.push('JWT_REFRESH_SECRET must be explicitly set to a strong secret in production');
    } else if (refreshSecret.length < 32) {
      prodErrors.push('JWT_REFRESH_SECRET must be at least 32 characters long in production');
    }

    if (prodErrors.length > 0) {
      const errMessage = `❌ FATAL: Production environment validation failed:\n${prodErrors.join('\n')}`;
      console.error(errMessage);
      throw new Error(errMessage);
    }
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
      console.error(`❌ Invalid environment variables:\n${formattedErrors}`);
      if (isProd) {
        throw new Error(`Invalid production environment variables:\n${formattedErrors}`);
      }
    }
    // Fallback to defaults in development/test if parsing failed
    return envSchema.parse({});
  }
}

export const env = validateAndParseEnv();

