import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .max(255, 'Email cannot exceed 255 characters')
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  role: z
    .enum(['CANDIDATE', 'RECRUITER', 'ADMIN'], {
      errorMap: () => ({ message: 'Role must be either CANDIDATE or RECRUITER' }),
    })
    .default('CANDIDATE'),
  name: z.string().min(1, 'Name cannot be empty').max(100).optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
