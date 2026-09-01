import { UserRole } from '@careerforge/types';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface RegisterDto {
  email: string;
  password: string;
  role?: 'CANDIDATE' | 'RECRUITER' | 'ADMIN' | string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokensResult {
  accessToken: string;
  rawRefreshToken: string;
  expiresIn: string;
  user: AuthenticatedUser;
}
