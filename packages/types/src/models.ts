export type UserRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

export interface UserSummary {
  id: string;
  email: string;
  role: UserRole;
  verified: boolean;
  createdAt: string;
}

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

export interface AuthResponseData {
  user: UserPayload;
  accessToken: string;
  expiresIn: string;
}

export type SkillProficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';

/**
 * Candidate Profile
 */
export interface CandidateProfile {
  id: string;
  userId: string;
  name: string;
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  preferredLocation?: string | null;
  workMode?: WorkMode | null;
  experienceYears?: number | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  websiteUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SkillCategory =
  | 'PROGRAMMING_LANGUAGE'
  | 'FRONTEND'
  | 'BACKEND'
  | 'DATABASE'
  | 'DEVOPS'
  | 'CLOUD'
  | 'AI'
  | 'AI_ML'
  | 'DATA'
  | 'DATA_SCIENCE'
  | 'SECURITY'
  | 'MOBILE'
  | 'TOOLS'
  | 'FRAMEWORK'
  | 'LIBRARY'
  | 'TESTING'
  | 'SYSTEM_DESIGN'
  | 'SOFT_SKILLS'
  | 'OTHER';

export interface SkillAlias {
  id: string;
  skillId: string;
  alias: string;
  normalizedAlias: string;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: SkillCategory;
  description?: string | null;
  isActive: boolean;
  aliases?: SkillAlias[];
  createdAt: string;
  updatedAt: string;
}

export type SkillMatchType = 'CANONICAL' | 'ALIAS' | 'FUZZY' | 'UNRESOLVED';

export interface ResolvedSkill {
  input: string;
  canonicalSkillId?: string | null;
  canonicalName?: string | null;
  slug?: string | null;
  category?: SkillCategory | null;
  matchType: SkillMatchType;
  confidence: number;
}

export interface CandidateSkill {
  id: string;
  candidateId: string;
  skillId: string;
  proficiency: SkillProficiency;
  source?: string;
  skill: {
    id: string;
    name: string;
    slug?: string;
    category: string;
  };
}

export interface CandidateExperience {
  id: string;
  candidateId: string;
  company: string;
  title: string;
  location?: string | null;
  employmentType?: EmploymentType | null;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  description?: string | null;
}

export interface CandidateEducation {
  id: string;
  candidateId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
}

export interface CareerPreference {
  id: string;
  candidateId: string;
  desiredJobTitles: string[];
  preferredLocations: string[];
  preferredWorkModes: WorkMode[];
  preferredEmploymentTypes: EmploymentType[];
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  currency: string;
  willingToRelocate: boolean;
  preferredIndustries: string[];
}

export interface ProfileCompletenessBreakdown {
  basicInfo: { weight: number; completed: boolean; score: number };
  summary: { weight: number; completed: boolean; score: number };
  skills: { weight: number; completed: boolean; score: number; count: number };
  experience: { weight: number; completed: boolean; score: number; count: number };
  education: { weight: number; completed: boolean; score: number; count: number };
  preferences: { weight: number; completed: boolean; score: number };
}

export interface ProfileCompleteness {
  percentage: number;
  completedSections: string[];
  missingSections: string[];
  breakdown: ProfileCompletenessBreakdown;
}

export type ResumeProcessingStatus =
  | 'UPLOADED'
  | 'STORED'
  | 'READY_FOR_PROCESSING'
  | 'PROCESSING'
  | 'PARSED'
  | 'EMBEDDED'
  | 'ANALYZED'
  | 'FAILED';

export interface PersonalInformation {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
}

export interface ExperienceExtraction {
  company: string;
  title: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  technologies?: string[];
}

export interface EducationExtraction {
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
}

export interface ProjectExtraction {
  name: string;
  description?: string | null;
  technologies?: string[];
  url?: string | null;
}

export interface CertificationExtraction {
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
}

export interface LanguageExtraction {
  name: string;
  proficiency?: string | null;
}

export interface StructuredResumeData {
  personal: PersonalInformation;
  summary?: string | null;
  skills: string[];
  experience: ExperienceExtraction[];
  education: EducationExtraction[];
  projects: ProjectExtraction[];
  certifications: CertificationExtraction[];
  languages: LanguageExtraction[];
}

export interface ParsedResume {
  id: string;
  resumeId: string;
  rawText: string;
  parsedData: StructuredResumeData;
  parserVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeChunkMetadata {
  id: string;
  resumeId: string;
  content: string;
  section: string;
  chunkIndex: number;
  tokenCount?: number | null;
  contentHash: string;
  embeddingModel: string;
  embeddingVersion: number;
  isIndexed: boolean;
  indexedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VectorSearchResult {
  chunkId: string;
  resumeId: string;
  section: string;
  content: string;
  similarityScore: number;
}

export interface ResumeIndexStatus {
  isIndexed: boolean;
  totalChunks: number;
  indexedChunks: number;
  isStale: boolean;
  embeddingModel: string;
  embeddingVersion: number;
  lastIndexedAt?: string | null;
}

export interface ResumeMetadata {
  id: string;
  candidateId: string;
  originalFileName: string;
  storageKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  checksum?: string | null;
  version: number;
  processingStatus: ResumeProcessingStatus;
  isActive: boolean;
  parsedResume?: ParsedResume | null;
  chunks?: ResumeChunkMetadata[];
  indexStatus?: ResumeIndexStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfileSummary {
  profile: CandidateProfile;
  completeness: ProfileCompleteness;
  skillsCount: number;
  experiencesCount: number;
  educationsCount: number;
  hasPreferences: boolean;
  resume?: ResumeMetadata | null;
}

/**
 * Recruiter Profile
 */
export interface RecruiterProfile {
  id: string;
  userId: string;
  companyName: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  designation?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export type SkillImportance = 'REQUIRED' | 'PREFERRED';

export interface JobSkillItem {
  id?: string;
  skillId: string;
  skillName?: string;
  skill?: {
    id: string;
    name: string;
    slug?: string;
  };
  importance: SkillImportance;
  required?: boolean;
  minimumYears?: number | null;
}

/**
 * Job Definition
 */
export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  slug: string;
  description: string;
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  companyName: string;
  location: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  salaryPeriod: string;
  status: JobStatus;
  applicationDeadline?: string | null;
  publishedAt?: string | null;
  closedAt?: string | null;
  archivedAt?: string | null;
  jobSkills?: JobSkillItem[];
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobDto {
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  companyName?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryPeriod?: string;
  status?: JobStatus;
  applicationDeadline?: string;
  skills?: Array<{ name: string; importance?: SkillImportance; minimumYears?: number }>;
}

export interface UpdateJobDto extends Partial<CreateJobDto> {}

export interface JobStatusDto {
  status: JobStatus;
}

export interface RecruiterJobStats {
  totalJobs: number;
  published: number;
  drafts: number;
  paused: number;
  closed: number;
}

export interface JobSearchQuery {
  search?: string;
  workMode?: WorkMode | WorkMode[] | string;
  employmentType?: EmploymentType | EmploymentType[] | string;
  location?: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string | string[];
  skillMatch?: 'any' | 'all';
  sort?: 'newest' | 'oldest' | 'deadline' | 'salary';
  page?: number;
  limit?: number;
}

export interface JobSearchResultItem {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  location: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  salaryPeriod: string;
  applicationDeadline?: string | null;
  publishedAt?: string | null;
  skills: Array<{
    id: string;
    name: string;
    importance: SkillImportance;
    required: boolean;
    minimumYears?: number | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchResponseData {
  items: JobSearchResultItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Application Lifecycle (Phase 12)
 */
export type ApplicationStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFERED'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface CreateApplicationDto {
  resumeId: string;
  coverLetter?: string;
}

export interface UpdateApplicationStatusDto {
  status: ApplicationStatus;
  note?: string;
}

export interface ApplicationStatusHistoryItem {
  id: string;
  applicationId: string;
  oldStatus?: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  changedBy?: string | null;
  changedById?: string | null;
  changedByRole?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  resumeId: string;
  coverLetter?: string | null;
  matchScore?: number | null;
  status: ApplicationStatus;
  appliedAt: string;
  withdrawnAt?: string | null;
  createdAt: string;
  updatedAt: string;
  job?: Job;
  resume?: ResumeSummary;
  statusHistory?: ApplicationStatusHistoryItem[];
}

export interface CandidateApplicationItem {
  id: string;
  jobId: string;
  jobTitle: string;
  slug: string;
  companyName: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  salaryPeriod: string;
  resumeId: string;
  resumeName: string;
  status: ApplicationStatus;
  coverLetter?: string | null;
  appliedAt: string;
  withdrawnAt?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: ApplicationStatusHistoryItem[];
}

export interface RecruiterApplicationItem {
  id: string;
  jobId: string;
  jobTitle?: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline?: string | null;
  candidateLocation?: string | null;
  skills: string[];
  experienceYears?: number | null;
  resumeId: string;
  resumeName: string;
  resumeFileUrl?: string;
  status: ApplicationStatus;
  coverLetter?: string | null;
  appliedAt: string;
  withdrawnAt?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: ApplicationStatusHistoryItem[];
}

export interface CandidateApplicationStats {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  hired: number;
}

export interface ResumeSummary {
  id: string;
  candidateId: string;
  originalFileName: string;
  fileUrl: string;
  processingStatus: ResumeProcessingStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Match Recommendation Category & Levels (Phase 13)
 */
export type MatchRecommendation =
  | 'STRONGLY_APPLY'
  | 'APPLY'
  | 'CONSIDER'
  | 'WEAK_MATCH'
  | 'NOT_RECOMMENDED'
  | 'strongly_apply'
  | 'apply'
  | 'consider'
  | 'weak_match'
  | 'not_recommended';

export type MatchLevel = 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'LOW';

export interface MatchBreakdown {
  skills: number;
  semantic: number;
  experience: number;
  education: number;
  location: number;
}

export interface SkillMatchDetails {
  score: number;
  required: {
    matched: number;
    total: number;
    percentage: number;
  };
  preferred: {
    matched: number;
    total: number;
    percentage: number;
  };
  matchedSkills: string[];
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  candidateExtraSkills: string[];
}

export interface SemanticMatchDetails {
  score: number;
  topSimilarity?: number;
  matchedChunksCount: number;
  model?: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'NO_EMBEDDING';
  note?: string;
}

export interface ExperienceMatchDetails {
  score: number;
  candidateYears: number;
  requiredYears: number;
  preferredYears?: number | null;
  gap: number;
  status: 'MEETS' | 'EXCEEDS' | 'BELOW';
}

export interface EducationMatchDetails {
  score: number;
  candidateDegrees: string[];
  requiredDegree?: string | null;
  status: 'COMPATIBLE' | 'PARTIAL' | 'NOT_SPECIFIED' | 'BELOW';
}

export interface LocationMatchDetails {
  score: number;
  candidateLocation?: string | null;
  jobLocation: string;
  candidateWorkMode?: string | null;
  jobWorkMode: string;
  status: 'COMPATIBLE' | 'PARTIAL' | 'MISMATCH';
}

/**
 * Explainable Match Report (Phase 13)
 */
export interface MatchReport {
  id: string;
  candidateId: string;
  jobId: string;
  applicationId?: string | null;
  overallScore: number;
  finalScore?: number;
  matchLevel: MatchLevel;
  skillScore: number;
  semanticScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  missingRequiredSkills?: string[];
  missingPreferredSkills?: string[];
  candidateExtraSkills?: string[];
  experienceGaps: string[];
  candidateYears?: number | null;
  requiredYears?: number | null;
  experienceGap?: number | null;
  breakdown: MatchBreakdown;
  skills?: SkillMatchDetails;
  semantic?: SemanticMatchDetails;
  experience?: ExperienceMatchDetails;
  education?: EducationMatchDetails;
  location?: LocationMatchDetails;
  recommendation: MatchRecommendation;
  confidence: number;
  explanation: string;
  engineVersion: string;
  isStale: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Skill Gap & Personalized Learning Path Types (Phase 14)
 */
export type GapPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type ReadinessLevel =
  | 'JOB_READY'
  | 'NEARLY_READY'
  | 'DEVELOPING'
  | 'SIGNIFICANT_GAPS'
  | 'EARLY_STAGE';

export type SkillRequirementType = 'REQUIRED' | 'PREFERRED';

export type SkillGapStatus = 'MISSING' | 'PARTIAL';

export type ResourceType =
  | 'COURSE'
  | 'TUTORIAL'
  | 'DOCUMENTATION'
  | 'VIDEO'
  | 'PROJECT'
  | 'BOOK';

export type ResourceDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type LearningItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type LearningPathStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface SkillGapItem {
  id: string;
  skillId?: string | null;
  skillName: string;
  priority: GapPriority;
  priorityScore: number;
  requirementType: SkillRequirementType;
  skillStatus: SkillGapStatus;
  jobRelevance: number;
  dependencyImportance: number;
  semanticRelevance: number;
  reason: string;
}

export interface SkillGapAnalysisReport {
  id: string;
  candidateId: string;
  jobId: string;
  matchReportId?: string | null;
  overallReadiness: number;
  readinessLevel: ReadinessLevel;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  estimatedLearningHours: number;
  gaps: SkillGapItem[];
  engineVersion: string;
  isStale: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningResourceItem {
  id: string;
  title: string;
  description?: string | null;
  provider: string;
  url: string;
  skillId: string;
  resourceType: ResourceType;
  difficulty: ResourceDifficulty;
  estimatedHours: number;
  isActive: boolean;
}

export interface LearningPathItemData {
  id: string;
  learningPathId: string;
  skillId?: string | null;
  skillName: string;
  resourceId?: string | null;
  resource?: LearningResourceItem | null;
  sequence: number;
  estimatedHours: number;
  priority: GapPriority;
  status: LearningItemStatus;
  completedAt?: string | null;
}

export interface LearningPathResponse {
  id: string;
  candidateId: string;
  jobId: string;
  gapAnalysisId: string;
  status: LearningPathStatus;
  totalEstimatedHours: number;
  completedHours: number;
  progressPercentage: number;
  readinessBefore: number;
  readinessTarget: number;
  items: LearningPathItemData[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Job Recommendation Engine Types (Phase 15)
 */
export type RecommendationLevel =
  | 'TOP_MATCH'
  | 'EXCELLENT_MATCH'
  | 'STRONG_MATCH'
  | 'GOOD_MATCH'
  | 'POSSIBLE_MATCH'
  | 'LOW_MATCH';

export interface RecommendationBreakdown {
  skillScore: number;
  semanticScore: number;
  experienceScore: number;
  preferenceScore: number;
  freshnessScore: number;
}

export interface JobRecommendationItem {
  id: string;
  candidateId: string;
  jobId: string;
  job: {
    id: string;
    title: string;
    slug: string;
    companyName: string;
    location: string;
    workMode: WorkMode;
    employmentType: EmploymentType;
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency: string;
    salaryPeriod: string;
    experienceMin?: number | null;
    experienceMax?: number | null;
    publishedAt?: string | null;
    createdAt: string;
    skills: Array<{ name: string; required: boolean; importance: string }>;
  };
  recommendationScore: number;
  recommendationLevel: RecommendationLevel;
  breakdown: RecommendationBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
  source: string;
  engineVersion: string;
  isStale: boolean;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRecommendationListResponse {
  items: JobRecommendationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  engineVersion: string;
  generatedAt: string;
}

/**
 * Grounded RAG Career Assistant Types (Phase 16)
 */
export type ChatMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export type RAGSourceType =
  | 'RESUME'
  | 'JOB'
  | 'SKILL_GAP'
  | 'LEARNING_PATH'
  | 'APPLICATION'
  | 'PROFILE'
  | 'CAREER_KNOWLEDGE';

export type RAGResponseStatus =
  | 'SUCCESS'
  | 'INSUFFICIENT_CONTEXT'
  | 'BLOCKED'
  | 'FALLBACK';

export type ConversationStatus = 'ACTIVE' | 'ARCHIVED';

export interface RAGSource {
  id?: string;
  sourceType: RAGSourceType;
  sourceId?: string | null;
  title: string;
  snippet?: string | null;
  relevance?: number | null;
}

export interface CareerMessageItem {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  content: string;
  responseStatus?: RAGResponseStatus | null;
  isHelpful?: boolean | null;
  sources: RAGSource[];
  createdAt: string;
}

export interface CareerConversationItem {
  id: string;
  candidateId: string;
  title?: string | null;
  status: ConversationStatus;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: CareerMessageItem[];
}

export interface CareerAssistantResponse {
  messageId: string;
  conversationId: string;
  answer: string;
  status: RAGResponseStatus;
  sources: RAGSource[];
  confidence?: number;
  usage?: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
}

export interface SendMessageRequest {
  message: string;
  jobId?: string;
}

/**
 * Subscription Tiers
 */
export type SubscriptionPlan = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
