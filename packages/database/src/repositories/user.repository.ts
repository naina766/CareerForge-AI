import { prisma } from '../client.js';
import { User, UserRole, Prisma } from '@prisma/client';

export class UserRepository {
  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
      },
    });
  }

  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
      },
    });
  }

  static async create(data: {
    email: string;
    passwordHash: string;
    role?: UserRole;
    verified?: boolean;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        role: data.role ?? UserRole.CANDIDATE,
        verified: data.verified ?? false,
      },
    });
  }

  static async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  static async list(params: {
    skip?: number;
    take?: number;
    role?: UserRole;
  }): Promise<User[]> {
    return prisma.user.findMany({
      where: params.role ? { role: params.role } : undefined,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
      },
    });
  }
}
