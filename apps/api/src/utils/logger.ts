import winston from 'winston';
import { env } from '@careerforge/config';

const { combine, timestamp, json, colorize, printf } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, correlationId, ...meta }) => {
  const corr = correlationId ? ` [${correlationId}]` : '';
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}:${corr} ${message}${extra}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'api' },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    env.NODE_ENV === 'production' ? json() : combine(colorize(), consoleFormat)
  ),
  transports: [
    new winston.transports.Console()
  ]
});
