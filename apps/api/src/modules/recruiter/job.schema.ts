import { z } from 'zod';

export const jobSkillInputSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100, 'Skill name is too long'),
  importance: z.enum(['REQUIRED', 'PREFERRED']).default('REQUIRED'),
  minimumYears: z.number().min(0, 'Minimum years cannot be negative').max(50).optional(),
});

export const baseJobSchema = z.object({
  title: z
    .string()
    .min(3, 'Job title must be at least 3 characters')
    .max(150, 'Job title cannot exceed 150 characters')
    .transform((t) => t.trim()),
  description: z
    .string()
    .min(20, 'Job description must be at least 20 characters')
    .max(20000, 'Job description exceeds maximum length')
    .transform((d) => d.trim()),
  responsibilities: z
    .string()
    .max(10000)
    .optional()
    .transform((r) => (r ? r.trim() : undefined)),
  requirements: z
    .string()
    .max(10000)
    .optional()
    .transform((r) => (r ? r.trim() : undefined)),
  benefits: z
    .string()
    .max(10000)
    .optional()
    .transform((b) => (b ? b.trim() : undefined)),
  companyName: z
    .string()
    .max(150)
    .optional()
    .transform((c) => (c ? c.trim() : undefined)),
  location: z
    .string()
    .max(200)
    .optional()
    .transform((l) => (l ? l.trim() : 'Remote')),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).default('REMOTE'),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'])
    .default('FULL_TIME'),
  experienceMin: z.number().min(0, 'Minimum experience cannot be negative').default(0),
  experienceMax: z.number().min(0, 'Maximum experience cannot be negative').optional(),
  salaryMin: z.number().min(0, 'Minimum salary cannot be negative').optional(),
  salaryMax: z.number().min(0, 'Maximum salary cannot be negative').optional(),
  currency: z.string().min(2).max(10).default('USD'),
  salaryPeriod: z.enum(['YEARLY', 'MONTHLY', 'HOURLY']).default('YEARLY'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED']).default('DRAFT'),
  applicationDeadline: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  skills: z.array(jobSkillInputSchema).optional().default([]),
});

export const createJobSchema = baseJobSchema
  .refine(
    (data) => {
      if (data.experienceMax !== undefined && data.experienceMax !== null) {
        return data.experienceMax >= data.experienceMin;
      }
      return true;
    },
    {
      message: 'Maximum experience must be greater than or equal to minimum experience',
      path: ['experienceMax'],
    }
  )
  .refine(
    (data) => {
      if (
        data.salaryMin !== undefined &&
        data.salaryMin !== null &&
        data.salaryMax !== undefined &&
        data.salaryMax !== null
      ) {
        return data.salaryMax >= data.salaryMin;
      }
      return true;
    },
    {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['salaryMax'],
    }
  );

export const updateJobSchema = baseJobSchema.partial();

export const jobStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED']),
});

export const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED', 'ALL']).optional(),
  search: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'applicationDeadline', 'title']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobStatusInput = z.infer<typeof jobStatusSchema>;
export type JobListQueryInput = z.infer<typeof jobListQuerySchema>;
