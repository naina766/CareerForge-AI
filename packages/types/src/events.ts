/**
 * Standard Centralized Kafka Topics
 */
export const KafkaTopics = {
  RESUME: 'careerforge.resume',
  MATCHING: 'careerforge.matching',
  SKILL_GAP: 'careerforge.skill-gap',
  LEARNING_PATH: 'careerforge.learning-path',
  APPLICATION: 'careerforge.application',
  RECOMMENDATION: 'careerforge.recommendation',
  NOTIFICATION: 'careerforge.notification',
  CAREER_ASSISTANT: 'careerforge.career-assistant',
  DLQ: 'careerforge.dlq',
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];

/**
 * Standard Domain Event Envelope
 */
export interface DomainEvent<T = Record<string, any>> {
  eventId: string;
  eventType: DomainEventType;
  version: string;
  occurredAt: string;
  producer: string;
  correlationId: string;
  causationId?: string | null;
  aggregateType: string;
  aggregateId: string;
  payload: T;
}

export type DomainEventType =
  | 'resume.uploaded'
  | 'resume.processed'
  | 'resume.embeddings.created'
  | 'match.requested'
  | 'match.completed'
  | 'skill-gap.analysis.requested'
  | 'skill-gap.analyzed'
  | 'learning-path.created'
  | 'application.created'
  | 'application.status.changed'
  | 'recommendation.refresh.requested'
  | 'recommendation.generated'
  | 'notification.requested'
  | 'career-message.created';

/**
 * Domain Event Payloads
 */
export interface ResumeUploadedPayload {
  resumeId: string;
  candidateId: string;
  fileUrl: string;
  originalFileName: string;
  fileSize: number;
}

export interface ResumeProcessedPayload {
  resumeId: string;
  candidateId: string;
  skillsExtracted: string[];
  experienceYears?: number | null;
  parsingEngine: string;
}

export interface ResumeEmbeddingsCreatedPayload {
  resumeId: string;
  candidateId: string;
  vectorCount: number;
  dimension: number;
  embeddingModel: string;
}

export interface MatchRequestedPayload {
  candidateId: string;
  jobId: string;
  applicationId?: string | null;
  forceRecompute?: boolean;
}

export interface MatchCompletedPayload {
  matchReportId: string;
  candidateId: string;
  jobId: string;
  overallScore: number;
  matchLevel: string;
  recommendation: string;
}

export interface SkillGapAnalysisRequestedPayload {
  candidateId: string;
  jobId: string;
  matchReportId?: string | null;
}

export interface SkillGapAnalyzedPayload {
  analysisId: string;
  candidateId: string;
  jobId: string;
  overallReadiness: number;
  readinessLevel: string;
  highPriorityCount: number;
}

export interface LearningPathCreatedPayload {
  pathId: string;
  candidateId: string;
  jobId: string;
  totalEstimatedHours: number;
  itemCount: number;
}

export interface ApplicationCreatedPayload {
  applicationId: string;
  candidateId: string;
  jobId: string;
  resumeId: string;
}

export interface ApplicationStatusChangedPayload {
  applicationId: string;
  candidateId: string;
  jobId: string;
  oldStatus: string;
  newStatus: string;
  recruiterId?: string | null;
  notes?: string | null;
}

export interface RecommendationRefreshRequestedPayload {
  candidateId: string;
  reason?: string;
  forceRecompute?: boolean;
}

export interface RecommendationGeneratedPayload {
  candidateId: string;
  jobCount: number;
  topScore: number;
  engineVersion: string;
}

export interface NotificationRequestedPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface CareerMessageCreatedPayload {
  conversationId: string;
  messageId: string;
  candidateId: string;
  role: string;
  contentSnippet: string;
  responseStatus?: string | null;
}

/**
 * Event Observability & Outbox Types
 */
export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export interface OutboxEventItem {
  id: string;
  eventId: string;
  eventType: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  payload: any;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  availableAt: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessedEventItem {
  id: string;
  eventId: string;
  eventType: string;
  consumerGroup: string;
  status: string;
  processedAt: string;
}

export interface DeadLetterEventItem {
  id: string;
  eventId: string;
  eventType: string;
  topic: string;
  consumerGroup?: string | null;
  payload: any;
  error: string;
  stackTrace?: string | null;
  attempts: number;
  failedAt: string;
}

export interface EventStatsResponse {
  totalPublished: number;
  totalPending: number;
  totalProcessed: number;
  totalFailed: number;
  totalDlq: number;
  topicBreakdown: Record<string, number>;
}

export interface EventListResponse {
  items: OutboxEventItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
