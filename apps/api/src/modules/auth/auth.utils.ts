import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '@careerforge/config';
import { JwtAccessPayload } from './auth.types.js';

const BCRYPT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt with standard work factor.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verifies a plaintext password against its bcrypt hash in constant time.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Computes a SHA-256 hash of a raw token string for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a cryptographically random raw refresh token string.
 */
export function generateRandomToken(bytes: number = 40): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Signs a short-lived access JWT containing minimal necessary user claims.
 */
export function signAccessToken(payload: { sub: string; email: string; role: string }): string {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  );
}

/**
 * Verifies and decodes an access JWT. Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
}

/**
 * Sets the refresh token into an HTTP-only secure cookie.
 */
export function setRefreshTokenCookie(res: Response, rawRefreshToken: string): void {
  const maxAgeMs = env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

  res.cookie(env.AUTH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE || process.env['NODE_ENV'] === 'production',
    sameSite: env.AUTH_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
  });
}

/**
 * Clears the HTTP-only refresh token cookie.
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(env.AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE || process.env['NODE_ENV'] === 'production',
    sameSite: env.AUTH_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
    path: '/api/v1/auth',
  });
}
