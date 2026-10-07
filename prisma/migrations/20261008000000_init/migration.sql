-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CANDIDATE', 'RECRUITER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SkillImportance" AS ENUM ('REQUIRED', 'PREFERRED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ResumeProcessingStatus" AS ENUM ('UPLOADED', 'STORED', 'READY_FOR_PROCESSING', 'PROCESSING', 'PARSED', 'EMBEDDED', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('PROGRAMMING_LANGUAGE', 'FRONTEND', 'BACKEND', 'DATABASE', 'DEVOPS', 'CLOUD', 'AI', 'AI_ML', 'DATA', 'DATA_SCIENCE', 'SECURITY', 'MOBILE', 'TOOLS', 'FRAMEWORK', 'LIBRARY', 'TESTING', 'SYSTEM_DESIGN', 'SOFT_SKILLS', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "MatchLevel" AS ENUM ('EXCELLENT', 'STRONG', 'MODERATE', 'WEAK', 'LOW');

-- CreateEnum
CREATE TYPE "RecommendationLevel" AS ENUM ('TOP_MATCH', 'EXCELLENT_MATCH', 'STRONG_MATCH', 'GOOD_MATCH', 'POSSIBLE_MATCH', 'LOW_MATCH');

-- CreateEnum
CREATE TYPE "GapPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ReadinessLevel" AS ENUM ('JOB_READY', 'NEARLY_READY', 'DEVELOPING', 'SIGNIFICANT_GAPS', 'EARLY_STAGE');

-- CreateEnum
CREATE TYPE "SkillRequirementType" AS ENUM ('REQUIRED', 'PREFERRED');

-- CreateEnum
CREATE TYPE "SkillGapStatus" AS ENUM ('MISSING', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('COURSE', 'TUTORIAL', 'DOCUMENTATION', 'VIDEO', 'PROJECT', 'BOOK');

-- CreateEnum
CREATE TYPE "ResourceDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "LearningItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LearningPathStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('STRONGLY_APPLY', 'APPLY', 'CONSIDER', 'DEVELOP_SKILLS', 'EXPLORE_LATER');

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RAGSourceType" AS ENUM ('RESUME', 'JOB', 'SKILL_GAP', 'LEARNING_PATH', 'APPLICATION', 'PROFILE', 'CAREER_KNOWLEDGE');

-- CreateEnum
CREATE TYPE "RAGResponseStatus" AS ENUM ('SUCCESS', 'INSUFFICIENT_CONTEXT', 'BLOCKED', 'FALLBACK');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "AIAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'INCOMPLETE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH_COMPLETED', 'SKILL_GAP_UPDATED', 'LEARNING_PATH_UPDATED', 'JOB_RECOMMENDED', 'APPLICATION_STATUS_CHANGED', 'RESUME_PROCESSED', 'CAREER_ASSISTANT_RESPONSE', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WorkerJobStatus" AS ENUM ('STARTED', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING', 'DLQ');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "city" TEXT,
    "country" TEXT,
    "preferredLocation" TEXT,
    "workMode" "WorkMode" DEFAULT 'REMOTE',
    "experienceYears" DOUBLE PRECISION DEFAULT 0,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyWebsite" TEXT,
    "jobTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" "EmploymentType" DEFAULT 'FULL_TIME',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "grade" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" "SkillProficiency" NOT NULL DEFAULT 'INTERMEDIATE',
    "source" TEXT NOT NULL DEFAULT 'PROFILE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPreference" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "desiredJobTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredWorkModes" "WorkMode"[] DEFAULT ARRAY[]::"WorkMode"[],
    "preferredEmploymentTypes" "EmploymentType"[] DEFAULT ARRAY[]::"EmploymentType"[],
    "minimumSalary" DOUBLE PRECISION,
    "maximumSalary" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "willingToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "preferredIndustries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "parsedText" TEXT,
    "structuredData" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "processingStatus" "ResumeProcessingStatus" NOT NULL DEFAULT 'READY_FOR_PROCESSING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedResume" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsedData" JSONB NOT NULL,
    "parserVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParsedResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeChunk" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'general',
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER DEFAULT 0,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "embeddingModel" TEXT NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    "embeddingVersion" INTEGER NOT NULL DEFAULT 1,
    "isIndexed" BOOLEAN NOT NULL DEFAULT false,
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillAlias" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeSkill" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" TEXT,
    "yearsOfExperience" DOUBLE PRECISION,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "description" TEXT NOT NULL,
    "responsibilities" TEXT,
    "requirements" TEXT,
    "benefits" TEXT,
    "companyName" TEXT NOT NULL DEFAULT 'Company',
    "location" TEXT NOT NULL DEFAULT 'Remote',
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "workMode" "WorkMode" NOT NULL DEFAULT 'REMOTE',
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "experienceMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experienceMax" DOUBLE PRECISION,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "salaryPeriod" TEXT NOT NULL DEFAULT 'YEARLY',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "applicationDeadline" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "importance" "SkillImportance" NOT NULL DEFAULT 'REQUIRED',
    "minimumYears" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "matchScore" DOUBLE PRECISION,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "oldStatus" "ApplicationStatus",
    "newStatus" "ApplicationStatus" NOT NULL,
    "changedBy" TEXT,
    "changedById" TEXT,
    "changedByRole" "UserRole",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchReport" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicationId" TEXT,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "matchLevel" "MatchLevel" NOT NULL DEFAULT 'MODERATE',
    "skillScore" DOUBLE PRECISION NOT NULL,
    "semanticScore" DOUBLE PRECISION NOT NULL,
    "experienceScore" DOUBLE PRECISION NOT NULL,
    "educationScore" DOUBLE PRECISION NOT NULL,
    "locationScore" DOUBLE PRECISION NOT NULL,
    "matchedSkills" JSONB NOT NULL DEFAULT '[]',
    "missingSkills" JSONB NOT NULL DEFAULT '[]',
    "missingRequiredSkills" JSONB NOT NULL DEFAULT '[]',
    "missingPreferredSkills" JSONB NOT NULL DEFAULT '[]',
    "candidateExtraSkills" JSONB NOT NULL DEFAULT '[]',
    "experienceGaps" JSONB NOT NULL DEFAULT '[]',
    "candidateYears" DOUBLE PRECISION,
    "requiredYears" DOUBLE PRECISION,
    "experienceGap" DOUBLE PRECISION,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "recommendation" "RecommendationType" NOT NULL DEFAULT 'CONSIDER',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "explanation" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT '1.0',
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRecommendation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "recommendationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendationLevel" "RecommendationLevel" NOT NULL DEFAULT 'GOOD_MATCH',
    "skillScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "semanticScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experienceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchedSkills" JSONB NOT NULL DEFAULT '[]',
    "missingSkills" JSONB NOT NULL DEFAULT '[]',
    "reason" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'HYBRID_ENGINE',
    "engineVersion" TEXT NOT NULL DEFAULT '1.0',
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillDependency" (
    "id" TEXT NOT NULL,
    "prerequisiteSkillId" TEXT NOT NULL,
    "dependentSkillId" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL DEFAULT 'DOCUMENTATION',
    "difficulty" "ResourceDifficulty" NOT NULL DEFAULT 'BEGINNER',
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGapAnalysis" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "matchReportId" TEXT,
    "overallReadiness" DOUBLE PRECISION NOT NULL,
    "readinessLevel" "ReadinessLevel" NOT NULL DEFAULT 'DEVELOPING',
    "highPriorityCount" INTEGER NOT NULL DEFAULT 0,
    "mediumPriorityCount" INTEGER NOT NULL DEFAULT 0,
    "lowPriorityCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedLearningHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engineVersion" TEXT NOT NULL DEFAULT '1.0',
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillGapAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGap" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "skillId" TEXT,
    "skillName" TEXT NOT NULL,
    "priority" "GapPriority" NOT NULL DEFAULT 'MEDIUM',
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "requirementType" "SkillRequirementType" NOT NULL DEFAULT 'REQUIRED',
    "skillStatus" "SkillGapStatus" NOT NULL DEFAULT 'MISSING',
    "jobRelevance" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "dependencyImportance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "semanticRelevance" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "gapAnalysisId" TEXT NOT NULL,
    "status" "LearningPathStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalEstimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readinessBefore" DOUBLE PRECISION NOT NULL,
    "readinessTarget" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPathItem" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "skillId" TEXT,
    "skillName" TEXT NOT NULL,
    "resourceId" TEXT,
    "sequence" INTEGER NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "priority" "GapPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "LearningItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPathItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "title" TEXT DEFAULT 'Career Consultation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerConversation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "title" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "responseStatus" "RAGResponseStatus" DEFAULT 'SUCCESS',
    "isHelpful" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerMessageSource" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sourceType" "RAGSourceType" NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "snippet" TEXT,
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerMessageSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "output" JSONB NOT NULL,
    "tokensUsed" INTEGER,
    "latencyMs" DOUBLE PRECISION,
    "status" "AIAnalysisStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "latencyMs" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB DEFAULT '{}',
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "consumerGroup" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "consumerGroup" TEXT,
    "payload" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "stackTrace" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadLetterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM_ALERT',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "matchNotifications" BOOLEAN NOT NULL DEFAULT true,
    "skillGapNotifications" BOOLEAN NOT NULL DEFAULT true,
    "learningNotifications" BOOLEAN NOT NULL DEFAULT true,
    "applicationNotifications" BOOLEAN NOT NULL DEFAULT true,
    "recommendationNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "labels" JSONB DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metricName" TEXT,
    "threshold" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceHealthCheck" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "latencyMs" DOUBLE PRECISION,
    "version" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceHealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceHealthSnapshot" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "status" "ServiceHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "latencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerExecution" (
    "id" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "WorkerJobStatus" NOT NULL DEFAULT 'STARTED',
    "durationMs" DOUBLE PRECISION,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "stackTrace" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkerExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_userId_idx" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_location_idx" ON "CandidateProfile"("location");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterProfile_userId_key" ON "RecruiterProfile"("userId");

-- CreateIndex
CREATE INDEX "RecruiterProfile_userId_idx" ON "RecruiterProfile"("userId");

-- CreateIndex
CREATE INDEX "RecruiterProfile_companyName_idx" ON "RecruiterProfile"("companyName");

-- CreateIndex
CREATE INDEX "Experience_candidateId_idx" ON "Experience"("candidateId");

-- CreateIndex
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateSkill_candidateId_idx" ON "CandidateSkill"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateSkill_skillId_idx" ON "CandidateSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSkill_candidateId_skillId_key" ON "CandidateSkill"("candidateId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPreference_candidateId_key" ON "CareerPreference"("candidateId");

-- CreateIndex
CREATE INDEX "Resume_candidateId_idx" ON "Resume"("candidateId");

-- CreateIndex
CREATE INDEX "Resume_processingStatus_idx" ON "Resume"("processingStatus");

-- CreateIndex
CREATE INDEX "Resume_isActive_idx" ON "Resume"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedResume_resumeId_key" ON "ParsedResume"("resumeId");

-- CreateIndex
CREATE INDEX "ParsedResume_resumeId_idx" ON "ParsedResume"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeChunk_resumeId_idx" ON "ResumeChunk"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeChunk_isIndexed_idx" ON "ResumeChunk"("isIndexed");

-- CreateIndex
CREATE INDEX "ResumeChunk_section_idx" ON "ResumeChunk"("section");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeChunk_resumeId_chunkIndex_key" ON "ResumeChunk"("resumeId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_name_idx" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "Skill_slug_idx" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_category_idx" ON "Skill"("category");

-- CreateIndex
CREATE INDEX "Skill_isActive_idx" ON "Skill"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SkillAlias_normalizedAlias_key" ON "SkillAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "SkillAlias_skillId_idx" ON "SkillAlias"("skillId");

-- CreateIndex
CREATE INDEX "SkillAlias_normalizedAlias_idx" ON "SkillAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "ResumeSkill_resumeId_idx" ON "ResumeSkill"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeSkill_skillId_idx" ON "ResumeSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeSkill_resumeId_skillId_key" ON "ResumeSkill"("resumeId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_recruiterId_idx" ON "Job"("recruiterId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_slug_idx" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_location_idx" ON "Job"("location");

-- CreateIndex
CREATE INDEX "Job_workMode_idx" ON "Job"("workMode");

-- CreateIndex
CREATE INDEX "Job_employmentType_idx" ON "Job"("employmentType");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_applicationDeadline_idx" ON "Job"("applicationDeadline");

-- CreateIndex
CREATE INDEX "JobSkill_jobId_idx" ON "JobSkill"("jobId");

-- CreateIndex
CREATE INDEX "JobSkill_skillId_idx" ON "JobSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSkill_jobId_skillId_key" ON "JobSkill"("jobId", "skillId");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");

-- CreateIndex
CREATE INDEX "Application_appliedAt_idx" ON "Application"("appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidateId_jobId_key" ON "Application"("candidateId", "jobId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_idx" ON "ApplicationStatusHistory"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_createdAt_idx" ON "ApplicationStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "MatchReport_candidateId_idx" ON "MatchReport"("candidateId");

-- CreateIndex
CREATE INDEX "MatchReport_jobId_idx" ON "MatchReport"("jobId");

-- CreateIndex
CREATE INDEX "MatchReport_overallScore_idx" ON "MatchReport"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "MatchReport_candidateId_jobId_key" ON "MatchReport"("candidateId", "jobId");

-- CreateIndex
CREATE INDEX "JobRecommendation_candidateId_idx" ON "JobRecommendation"("candidateId");

-- CreateIndex
CREATE INDEX "JobRecommendation_jobId_idx" ON "JobRecommendation"("jobId");

-- CreateIndex
CREATE INDEX "JobRecommendation_recommendationScore_idx" ON "JobRecommendation"("recommendationScore");

-- CreateIndex
CREATE INDEX "JobRecommendation_isStale_idx" ON "JobRecommendation"("isStale");

-- CreateIndex
CREATE UNIQUE INDEX "JobRecommendation_candidateId_jobId_key" ON "JobRecommendation"("candidateId", "jobId");

-- CreateIndex
CREATE INDEX "SkillDependency_prerequisiteSkillId_idx" ON "SkillDependency"("prerequisiteSkillId");

-- CreateIndex
CREATE INDEX "SkillDependency_dependentSkillId_idx" ON "SkillDependency"("dependentSkillId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillDependency_prerequisiteSkillId_dependentSkillId_key" ON "SkillDependency"("prerequisiteSkillId", "dependentSkillId");

-- CreateIndex
CREATE INDEX "LearningResource_skillId_idx" ON "LearningResource"("skillId");

-- CreateIndex
CREATE INDEX "LearningResource_isActive_idx" ON "LearningResource"("isActive");

-- CreateIndex
CREATE INDEX "SkillGapAnalysis_candidateId_idx" ON "SkillGapAnalysis"("candidateId");

-- CreateIndex
CREATE INDEX "SkillGapAnalysis_jobId_idx" ON "SkillGapAnalysis"("jobId");

-- CreateIndex
CREATE INDEX "SkillGapAnalysis_overallReadiness_idx" ON "SkillGapAnalysis"("overallReadiness");

-- CreateIndex
CREATE UNIQUE INDEX "SkillGapAnalysis_candidateId_jobId_key" ON "SkillGapAnalysis"("candidateId", "jobId");

-- CreateIndex
CREATE INDEX "SkillGap_analysisId_idx" ON "SkillGap"("analysisId");

-- CreateIndex
CREATE INDEX "SkillGap_skillId_idx" ON "SkillGap"("skillId");

-- CreateIndex
CREATE INDEX "SkillGap_priority_idx" ON "SkillGap"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_gapAnalysisId_key" ON "LearningPath"("gapAnalysisId");

-- CreateIndex
CREATE INDEX "LearningPath_candidateId_idx" ON "LearningPath"("candidateId");

-- CreateIndex
CREATE INDEX "LearningPath_jobId_idx" ON "LearningPath"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_candidateId_jobId_key" ON "LearningPath"("candidateId", "jobId");

-- CreateIndex
CREATE INDEX "LearningPathItem_learningPathId_idx" ON "LearningPathItem"("learningPathId");

-- CreateIndex
CREATE INDEX "LearningPathItem_skillId_idx" ON "LearningPathItem"("skillId");

-- CreateIndex
CREATE INDEX "LearningPathItem_status_idx" ON "LearningPathItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPathItem_learningPathId_sequence_key" ON "LearningPathItem"("learningPathId", "sequence");

-- CreateIndex
CREATE INDEX "ChatSession_candidateId_idx" ON "ChatSession"("candidateId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "CareerConversation_candidateId_idx" ON "CareerConversation"("candidateId");

-- CreateIndex
CREATE INDEX "CareerConversation_updatedAt_idx" ON "CareerConversation"("updatedAt");

-- CreateIndex
CREATE INDEX "CareerMessage_conversationId_idx" ON "CareerMessage"("conversationId");

-- CreateIndex
CREATE INDEX "CareerMessage_createdAt_idx" ON "CareerMessage"("createdAt");

-- CreateIndex
CREATE INDEX "CareerMessageSource_messageId_idx" ON "CareerMessageSource"("messageId");

-- CreateIndex
CREATE INDEX "CareerMessageSource_sourceType_idx" ON "CareerMessageSource"("sourceType");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_providerEventId_idx" ON "PaymentEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "AIAnalysis_userId_idx" ON "AIAnalysis"("userId");

-- CreateIndex
CREATE INDEX "AIAnalysis_type_idx" ON "AIAnalysis"("type");

-- CreateIndex
CREATE INDEX "AIAnalysis_inputHash_idx" ON "AIAnalysis"("inputHash");

-- CreateIndex
CREATE INDEX "AIUsage_userId_idx" ON "AIUsage"("userId");

-- CreateIndex
CREATE INDEX "AIUsage_operation_idx" ON "AIUsage"("operation");

-- CreateIndex
CREATE INDEX "AIUsage_createdAt_idx" ON "AIUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_eventId_key" ON "OutboxEvent"("eventId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_idx" ON "OutboxEvent"("status");

-- CreateIndex
CREATE INDEX "OutboxEvent_availableAt_idx" ON "OutboxEvent"("availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_topic_idx" ON "OutboxEvent"("topic");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ProcessedEvent_consumerGroup_idx" ON "ProcessedEvent"("consumerGroup");

-- CreateIndex
CREATE INDEX "ProcessedEvent_processedAt_idx" ON "ProcessedEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEvent_eventId_consumerGroup_key" ON "ProcessedEvent"("eventId", "consumerGroup");

-- CreateIndex
CREATE UNIQUE INDEX "DeadLetterEvent_eventId_key" ON "DeadLetterEvent"("eventId");

-- CreateIndex
CREATE INDEX "DeadLetterEvent_topic_idx" ON "DeadLetterEvent"("topic");

-- CreateIndex
CREATE INDEX "DeadLetterEvent_eventType_idx" ON "DeadLetterEvent"("eventType");

-- CreateIndex
CREATE INDEX "DeadLetterEvent_failedAt_idx" ON "DeadLetterEvent"("failedAt");

-- CreateIndex
CREATE INDEX "Notification_candidateId_idx" ON "Notification"("candidateId");

-- CreateIndex
CREATE INDEX "Notification_candidateId_status_idx" ON "Notification"("candidateId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_candidateId_key" ON "NotificationPreference"("candidateId");

-- CreateIndex
CREATE INDEX "NotificationPreference_candidateId_idx" ON "NotificationPreference"("candidateId");

-- CreateIndex
CREATE INDEX "SystemMetric_service_idx" ON "SystemMetric"("service");

-- CreateIndex
CREATE INDEX "SystemMetric_metricName_idx" ON "SystemMetric"("metricName");

-- CreateIndex
CREATE INDEX "SystemMetric_recordedAt_idx" ON "SystemMetric"("recordedAt");

-- CreateIndex
CREATE INDEX "SystemAlert_service_idx" ON "SystemAlert"("service");

-- CreateIndex
CREATE INDEX "SystemAlert_status_idx" ON "SystemAlert"("status");

-- CreateIndex
CREATE INDEX "SystemAlert_severity_idx" ON "SystemAlert"("severity");

-- CreateIndex
CREATE INDEX "SystemAlert_createdAt_idx" ON "SystemAlert"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceHealthCheck_service_idx" ON "ServiceHealthCheck"("service");

-- CreateIndex
CREATE INDEX "ServiceHealthCheck_checkedAt_idx" ON "ServiceHealthCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "ServiceHealthSnapshot_serviceName_idx" ON "ServiceHealthSnapshot"("serviceName");

-- CreateIndex
CREATE INDEX "ServiceHealthSnapshot_checkedAt_idx" ON "ServiceHealthSnapshot"("checkedAt");

-- CreateIndex
CREATE INDEX "WorkerExecution_workerName_idx" ON "WorkerExecution"("workerName");

-- CreateIndex
CREATE INDEX "WorkerExecution_eventType_idx" ON "WorkerExecution"("eventType");

-- CreateIndex
CREATE INDEX "WorkerExecution_status_idx" ON "WorkerExecution"("status");

-- CreateIndex
CREATE INDEX "WorkerExecution_startedAt_idx" ON "WorkerExecution"("startedAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterProfile" ADD CONSTRAINT "RecruiterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPreference" ADD CONSTRAINT "CareerPreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedResume" ADD CONSTRAINT "ParsedResume_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeChunk" ADD CONSTRAINT "ResumeChunk_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAlias" ADD CONSTRAINT "SkillAlias_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeSkill" ADD CONSTRAINT "ResumeSkill_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeSkill" ADD CONSTRAINT "ResumeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "RecruiterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchReport" ADD CONSTRAINT "MatchReport_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchReport" ADD CONSTRAINT "MatchReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchReport" ADD CONSTRAINT "MatchReport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillDependency" ADD CONSTRAINT "SkillDependency_prerequisiteSkillId_fkey" FOREIGN KEY ("prerequisiteSkillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillDependency" ADD CONSTRAINT "SkillDependency_dependentSkillId_fkey" FOREIGN KEY ("dependentSkillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGapAnalysis" ADD CONSTRAINT "SkillGapAnalysis_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGapAnalysis" ADD CONSTRAINT "SkillGapAnalysis_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SkillGapAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_gapAnalysisId_fkey" FOREIGN KEY ("gapAnalysisId") REFERENCES "SkillGapAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathItem" ADD CONSTRAINT "LearningPathItem_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathItem" ADD CONSTRAINT "LearningPathItem_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathItem" ADD CONSTRAINT "LearningPathItem_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerConversation" ADD CONSTRAINT "CareerConversation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerMessage" ADD CONSTRAINT "CareerMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CareerConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerMessageSource" ADD CONSTRAINT "CareerMessageSource_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CareerMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

