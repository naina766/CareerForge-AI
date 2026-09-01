import { ProfileCompleteness } from '@careerforge/types';

/**
 * Basic skill name normalization dictionary for Phase 4.
 * Note: Advanced taxonomy engine will replace/extend this in Phase 7.
 */
const CANONICAL_SKILL_MAP: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  react: 'React',
  reactjs: 'React',
  'react.js': 'React',
  next: 'Next.js',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  py: 'Python',
  python: 'Python',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  psql: 'PostgreSQL',
  mongo: 'MongoDB',
  mongodb: 'MongoDB',
  docker: 'Docker',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  graphql: 'GraphQL',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  kafka: 'Kafka',
  redis: 'Redis',
  fastapi: 'FastAPI',
  express: 'Express',
  expressjs: 'Express',
};

/**
 * Normalizes raw skill input into canonical name casing or formatted title case.
 */
export function normalizeSkillName(rawName: string): string {
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();

  if (CANONICAL_SKILL_MAP[lower]) {
    return CANONICAL_SKILL_MAP[lower]!;
  }

  // Format capitalized words nicely if not explicitly mapped
  return trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Deterministic Profile Completeness Scoring Function (100% total)
 * - Basic Information: 15% (Name, Headline, Location/City, Phone)
 * - Professional Summary: 15% (Bio/Summary length >= 30 chars)
 * - Structured Skills: 20% (>= 3 skills)
 * - Work Experience: 20% (>= 1 experience record)
 * - Education: 15% (>= 1 education record)
 * - Career Preferences: 15% (>= 1 desired role & location/workMode)
 */
export function calculateProfileCompleteness(profile: {
  name?: string | null;
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  city?: string | null;
  phone?: string | null;
  skills?: any[];
  experiences?: any[];
  educations?: any[];
  preferences?: {
    desiredJobTitles?: string[];
    preferredLocations?: string[];
    preferredWorkModes?: any[];
  } | null;
}): ProfileCompleteness {
  const completedSections: string[] = [];
  const missingSections: string[] = [];

  // 1. Basic Information (15%)
  const hasBasicInfo = Boolean(
    profile.name &&
    profile.headline &&
    (profile.location || profile.city)
  );
  if (hasBasicInfo) {
    completedSections.push('Basic Information');
  } else {
    missingSections.push('Basic Information (Name, Headline, Location)');
  }

  // 2. Summary (15%)
  const hasSummary = Boolean(profile.summary && profile.summary.trim().length >= 30);
  if (hasSummary) {
    completedSections.push('Professional Summary');
  } else {
    missingSections.push('Professional Summary (min 30 chars)');
  }

  // 3. Skills (20%)
  const skillCount = profile.skills?.length || 0;
  const hasSkills = skillCount >= 3;
  if (hasSkills) {
    completedSections.push('Technical Skills');
  } else {
    missingSections.push(`Technical Skills (${skillCount}/3 added)`);
  }

  // 4. Experience (20%)
  const expCount = profile.experiences?.length || 0;
  const hasExperience = expCount >= 1;
  if (hasExperience) {
    completedSections.push('Work Experience');
  } else {
    missingSections.push('Work Experience');
  }

  // 5. Education (15%)
  const eduCount = profile.educations?.length || 0;
  const hasEducation = eduCount >= 1;
  if (hasEducation) {
    completedSections.push('Education');
  } else {
    missingSections.push('Education History');
  }

  // 6. Career Preferences (15%)
  const hasPreferences = Boolean(
    profile.preferences &&
    profile.preferences.desiredJobTitles &&
    profile.preferences.desiredJobTitles.length > 0 &&
    (profile.preferences.preferredLocations?.length || profile.preferences.preferredWorkModes?.length)
  );
  if (hasPreferences) {
    completedSections.push('Career Preferences');
  } else {
    missingSections.push('Career Preferences (Desired Roles & Locations)');
  }

  const basicScore = hasBasicInfo ? 15 : 0;
  const summaryScore = hasSummary ? 15 : 0;
  const skillsScore = hasSkills ? 20 : Math.min(20, Math.round((skillCount / 3) * 20));
  const expScore = hasExperience ? 20 : 0;
  const eduScore = hasEducation ? 15 : 0;
  const prefScore = hasPreferences ? 15 : 0;

  const percentage = basicScore + summaryScore + skillsScore + expScore + eduScore + prefScore;

  return {
    percentage,
    completedSections,
    missingSections,
    breakdown: {
      basicInfo: { weight: 15, completed: hasBasicInfo, score: basicScore },
      summary: { weight: 15, completed: hasSummary, score: summaryScore },
      skills: { weight: 20, completed: hasSkills, score: skillsScore, count: skillCount },
      experience: { weight: 20, completed: hasExperience, score: expScore, count: expCount },
      education: { weight: 15, completed: hasEducation, score: eduScore, count: eduCount },
      preferences: { weight: 15, completed: hasPreferences, score: prefScore },
    },
  };
}
