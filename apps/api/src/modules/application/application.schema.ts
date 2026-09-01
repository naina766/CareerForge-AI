import { z } from 'zod';

export const createApplicationSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID format'),
  coverLetter: z
    .string()
    .max(5000, 'Cover letter cannot exceed 5000 characters')
    .optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    'APPLIED',
    'SCREENING',
    'SHORTLISTED',
    'INTERVIEW',
    'OFFERED',
    'HIRED',
    'REJECTED',
  ]),
  note: z.string().max(2000, 'Status note cannot exceed 2000 characters').optional(),
});

export const applicationQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'status']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type ApplicationQueryInput = z.infer<typeof applicationQuerySchema>;
