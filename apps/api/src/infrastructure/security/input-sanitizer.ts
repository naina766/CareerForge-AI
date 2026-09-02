import { Request, Response, NextFunction } from 'express';

/**
 * Sanitizes input strings to strip dangerous HTML tags and script injections.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export function sanitizeDeep(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeDeep(value);
    }
    return sanitized;
  }
  return obj;
}

export function inputSanitizerMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeDeep(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeDeep(req.params);
  }
  next();
}
