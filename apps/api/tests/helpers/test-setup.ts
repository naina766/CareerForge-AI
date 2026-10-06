import request from 'supertest';
import { Express } from 'express';
import { createServer } from '../../src/server.js';
import { prisma } from '@careerforge/database';
import { signAccessToken, hashPassword } from '../../src/modules/auth/auth.utils.js';
import { closeRedisConnection } from '../../src/infrastructure/redis/redis.client.js';

// Ensure consistent test environment
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_ci_env_32_chars_min';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_ci_env_32_chars_min';

export const app: Express = createServer();
export const supertest = request(app);

export function generateTestEmail(prefix: string): string {
  const nonce = Math.random().toString(36).substring(2, 8);
  return `${prefix}.${Date.now()}.${nonce}@test.careerforge.internal`;
}

export interface TestUserContext {
  id: string;
  email: string;
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
  token: string;
  authHeader: string;
  candidateProfileId?: string;
  recruiterProfileId?: string;
}

export async function createTestCandidate(prefix = 'cand'): Promise<TestUserContext> {
  const email = generateTestEmail(prefix);
  const passwordHash = await hashPassword('Password123!');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'CANDIDATE',
      verified: true,
      candidateProfile: {
        create: {
          name: `Candidate ${prefix}`,
          headline: 'Full Stack Engineer',
          summary: 'Automated test candidate profile for end-to-end integration tests',
          location: 'San Francisco, CA',
          city: 'San Francisco',
          country: 'USA',
          phone: '+1-555-0199',
          workMode: 'HYBRID',
          experienceYears: 4,
        },
      },
    },
    include: {
      candidateProfile: true,
    },
  });

  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return {
    id: user.id,
    email: user.email,
    role: 'CANDIDATE',
    token,
    authHeader: `Bearer ${token}`,
    candidateProfileId: user.candidateProfile?.id,
  };
}

export async function createTestRecruiter(prefix = 'rec', companyName = 'Test Tech Corp'): Promise<TestUserContext> {
  const email = generateTestEmail(prefix);
  const passwordHash = await hashPassword('Password123!');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'RECRUITER',
      verified: true,
      recruiterProfile: {
        create: {
          name: `Recruiter ${prefix}`,
          companyName,
          jobTitle: 'Senior Talent Partner',
        },
      },
    },
    include: {
      recruiterProfile: true,
    },
  });

  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return {
    id: user.id,
    email: user.email,
    role: 'RECRUITER',
    token,
    authHeader: `Bearer ${token}`,
    recruiterProfileId: user.recruiterProfile?.id,
  };
}

export async function createTestAdmin(prefix = 'admin'): Promise<TestUserContext> {
  const email = generateTestEmail(prefix);
  const passwordHash = await hashPassword('Password123!');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      verified: true,
    },
  });

  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return {
    id: user.id,
    email: user.email,
    role: 'ADMIN',
    token,
    authHeader: `Bearer ${token}`,
  };
}

export async function cleanupUsers(userIdsOrEmails: string[]): Promise<void> {
  if (!userIdsOrEmails || userIdsOrEmails.length === 0) return;

  try {
    // Delete test users by ID or Email (cascade deletes profiles, resumes, applications, conversations)
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: userIdsOrEmails } },
          { email: { in: userIdsOrEmails } },
        ],
      },
    });
  } catch (err: any) {
    console.warn(`[test-cleanup] Cleanup warning: ${err.message}`);
  }
}

export async function cleanupJobs(jobIds: string[]): Promise<void> {
  if (!jobIds || jobIds.length === 0) return;

  try {
    await prisma.application.deleteMany({
      where: { jobId: { in: jobIds } },
    });
    await prisma.job.deleteMany({
      where: { id: { in: jobIds } },
    });
  } catch (err: any) {
    console.warn(`[test-cleanup] Job cleanup warning: ${err.message}`);
  }
}

export async function closeConnections(): Promise<void> {
  await closeRedisConnection();
  await prisma.$disconnect();
}
