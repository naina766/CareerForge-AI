import { prisma, UserRepository } from '@careerforge/database';
import { UserRole } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler.js';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateRandomToken,
  signAccessToken,
} from './auth.utils.js';
import { RegisterDto, LoginDto, AuthTokensResult, AuthenticatedUser } from './auth.types.js';
import { logger } from '../../utils/logger.js';
import { env } from '@careerforge/config';
import { BruteForceProtection } from '../../infrastructure/security/brute-force-protection.js';

export class AuthService {
  /**
   * Registers a new user (Candidate or Recruiter). Public ADMIN registration is strictly forbidden.
   */
  static async register(dto: RegisterDto, context?: { ip?: string; userAgent?: string }): Promise<AuthTokensResult> {
    // Prevent public registration as ADMIN
    if (dto.role === 'ADMIN' || (dto.role as string) === 'admin') {
      throw new AppError('Public registration for the ADMIN role is not permitted', 403, 'FORBIDDEN');
    }

    const email = dto.email.trim().toLowerCase();
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
    }

    const role = (dto.role?.toUpperCase() as UserRole) || UserRole.CANDIDATE;
    const passwordHash = await hashPassword(dto.password);

    // Create user and associated profile transactionally
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        verified: false,
        ...(role === UserRole.CANDIDATE && {
          candidateProfile: {
            create: {
              name: dto.name || email.split('@')[0] || 'Candidate',
            },
          },
        }),
        ...(role === UserRole.RECRUITER && {
          recruiterProfile: {
            create: {
              name: dto.name || email.split('@')[0] || 'Recruiter',
              companyName: 'Unassigned Organization',
            },
          },
        }),
      },
    });

    // Generate tokens
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ip,
      },
    });

    // Record Security Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        metadata: { role: user.role, email: user.email },
      },
    });

    logger.info(`User registered successfully: ${user.id} [${user.role}]`);

    return {
      accessToken,
      rawRefreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as AuthenticatedUser['role'],
      },
    };
  }

  /**
   * Authenticates user credentials with constant-time verification and generic error messaging.
   */
  static async login(dto: LoginDto, context?: { ip?: string; userAgent?: string }): Promise<AuthTokensResult> {
    const email = dto.email.trim().toLowerCase();

    // Verify brute force lockout before attempting authentication
    await BruteForceProtection.verifyLockout(email);

    const user = await UserRepository.findByEmail(email);

    // Constant-time generic error to prevent account enumeration
    if (!user) {
      await hashPassword('dummy-timing-defense');
      await BruteForceProtection.recordFailure(email);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyPassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      await BruteForceProtection.recordFailure(email);
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: user.id,
          metadata: { ip: context?.ip, userAgent: context?.userAgent },
        },
      });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed brute force attempts upon successful login
    await BruteForceProtection.recordSuccess(email);

    // Generate tokens
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ip,
      },
    });

    // Audit log login success
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
        metadata: { ip: context?.ip },
      },
    });

    logger.info(`User logged in successfully: ${user.id} [${user.role}]`);

    return {
      accessToken,
      rawRefreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as AuthenticatedUser['role'],
      },
    };
  }

  /**
   * Rotates refresh tokens with reuse detection.
   * If a revoked token is presented, all active sessions for the user are invalidated.
   */
  static async refresh(rawRefreshToken: string, context?: { ip?: string; userAgent?: string }): Promise<AuthTokensResult> {
    if (!rawRefreshToken) {
      throw new AppError('Authentication refresh token is missing', 401, 'UNAUTHORIZED');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_TOKEN');
    }

    // REUSE DETECTION: If token is already revoked, family is compromised
    if (tokenRecord.revokedAt) {
      logger.warn(`Refresh token reuse detected for user ${tokenRecord.userId}! Revoking all active tokens.`);
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          userId: tokenRecord.userId,
          action: 'REFRESH_TOKEN_REUSED',
          entityType: 'RefreshToken',
          entityId: tokenRecord.id,
          metadata: { compromisedTokenId: tokenRecord.id, ip: context?.ip },
        },
      });

      throw new AppError('Session invalidated due to suspicious token reuse. Please log in again.', 401, 'TOKEN_REUSE_DETECTED');
    }

    // Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      throw new AppError('Refresh token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }

    // ROTATION: Generate new refresh token and link replacement
    const newRawRefreshToken = generateRandomToken(40);
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    const newRecord = await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ip,
      },
    });

    // Revoke old token and link to new one
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
        replacedByTokenId: newRecord.id,
      },
    });

    const accessToken = signAccessToken({
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
    });

    return {
      accessToken,
      rawRefreshToken: newRawRefreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role as AuthenticatedUser['role'],
      },
    };
  }

  /**
   * Logs out the current session by revoking the refresh token.
   */
  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = hashToken(rawRefreshToken);
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });

    if (tokenRecord) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          userId: tokenRecord.userId,
          action: 'LOGOUT',
          entityType: 'RefreshToken',
          entityId: tokenRecord.id,
        },
      });
    }
  }

  /**
   * Logs out all sessions across all devices for the user.
   */
  static async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT_ALL',
        entityType: 'User',
        entityId: userId,
      },
    });
  }

  /**
   * Retrieves safe user profile summary.
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
      },
    });
    if (!user) {
      throw new AppError('User account not found', 404, 'NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      verified: user.verified,
      candidateProfile: user.candidateProfile,
      recruiterProfile: user.recruiterProfile,
      createdAt: user.createdAt,
    };
  }
}
