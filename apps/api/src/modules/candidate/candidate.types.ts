import {
  SkillProficiency,
  WorkMode,
  EmploymentType,
} from '@careerforge/types';

export interface UpdateProfileDto {
  name?: string;
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  preferredLocation?: string | null;
  workMode?: WorkMode;
  experienceYears?: number;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  websiteUrl?: string | null;
}

export interface AddSkillDto {
  name: string;
  proficiency?: SkillProficiency;
}

export interface UpdateSkillDto {
  proficiency: SkillProficiency;
}

export interface CreateExperienceDto {
  company: string;
  title: string;
  location?: string | null;
  employmentType?: EmploymentType;
  startDate: string;
  endDate?: string | null;
  current?: boolean;
  description?: string | null;
}

export interface UpdateExperienceDto {
  company?: string;
  title?: string;
  location?: string | null;
  employmentType?: EmploymentType;
  startDate?: string;
  endDate?: string | null;
  current?: boolean;
  description?: string | null;
}

export interface CreateEducationDto {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
}

export interface UpdateEducationDto {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
}

export interface UpdateCareerPreferenceDto {
  desiredJobTitles?: string[];
  preferredLocations?: string[];
  preferredWorkModes?: WorkMode[];
  preferredEmploymentTypes?: EmploymentType[];
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  currency?: string;
  willingToRelocate?: boolean;
  preferredIndustries?: string[];
}
