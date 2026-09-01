import { z } from 'zod';

export const candidateJobSearchSchema = z.object({
  search: z.string().max(100, 'Search query cannot exceed 100 characters').optional(),
  workMode: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',').map((v) => v.trim().toUpperCase());
    }),
  employmentType: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',').map((v) => v.trim().toUpperCase());
    }),
  location: z.string().max(100).optional(),
  experienceMin: z.coerce.number().min(0).max(50).optional(),
  experienceMax: z.coerce.number().min(0).max(50).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  skills: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }),
  skillMatch: z.enum(['any', 'all']).default('any'),
  sort: z.enum(['newest', 'oldest', 'deadline', 'salary']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).refine(
  (data) => {
    if (data.experienceMin !== undefined && data.experienceMax !== undefined) {
      return data.experienceMax >= data.experienceMin;
    }
    return true;
  },
  {
    message: 'experienceMax must be greater than or equal to experienceMin',
    path: ['experienceMax'],
  }
).refine(
  (data) => {
    if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
      return data.salaryMax >= data.salaryMin;
    }
    return true;
  },
  {
    message: 'salaryMax must be greater than or equal to salaryMin',
    path: ['salaryMax'],
  }
);

export type CandidateJobSearchInput = z.infer<typeof candidateJobSearchSchema>;
