import { z } from 'zod';

const optionalUrl = z
  .string()
  .url('Must be a valid URL (e.g. https://github.com/username)')
  .or(z.literal(''))
  .nullable()
  .optional();

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100).optional(),
  headline: z.string().max(160, 'Headline cannot exceed 160 characters').nullable().optional(),
  summary: z.string().max(3000, 'Summary cannot exceed 3000 characters').nullable().optional(),
  phone: z.string().max(30, 'Phone number cannot exceed 30 characters').nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  preferredLocation: z.string().max(100).nullable().optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  experienceYears: z.number().min(0).max(60).optional(),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  websiteUrl: optionalUrl,
});

export const addSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(80),
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
});

export const updateSkillSchema = z.object({
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
});

export const createExperienceSchema = z.object({
  company: z.string().min(1, 'Company is required').max(150),
  title: z.string().min(1, 'Job title is required').max(150),
  location: z.string().max(150).nullable().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).default('FULL_TIME'),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD or ISO date')),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD or ISO date')).nullable().optional(),
  current: z.boolean().default(false),
  description: z.string().max(4000).nullable().optional(),
});

export const updateExperienceSchema = createExperienceSchema.partial();

export const createEducationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(200),
  degree: z.string().min(1, 'Degree is required').max(150),
  fieldOfStudy: z.string().min(1, 'Field of study is required').max(150),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD or ISO date')),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD or ISO date')).nullable().optional(),
  grade: z.string().max(50).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const updateEducationSchema = createEducationSchema.partial();

export const updateCareerPreferencesSchema = z.object({
  desiredJobTitles: z.array(z.string().max(100)).default([]),
  preferredLocations: z.array(z.string().max(100)).default([]),
  preferredWorkModes: z.array(z.enum(['REMOTE', 'HYBRID', 'ONSITE'])).default([]),
  preferredEmploymentTypes: z.array(z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'])).default([]),
  minimumSalary: z.number().min(0).nullable().optional(),
  maximumSalary: z.number().min(0).nullable().optional(),
  currency: z.string().length(3).default('USD'),
  willingToRelocate: z.boolean().default(false),
  preferredIndustries: z.array(z.string().max(100)).default([]),
});
