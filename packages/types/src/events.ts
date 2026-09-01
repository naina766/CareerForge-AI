/**
 * Standard Domain Event Envelope
 */
export interface DomainEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: DomainEventType;
  correlationId: string;
  timestamp: string;
  producer: string;
  payload: T;
  version: string;
}

export type DomainEventType =
  | 'resume.uploaded'
  | 'resume.parsed'
  | 'resume.embedded'
  | 'resume.analyzed'
  | 'job.created'
  | 'job.updated'
  | 'job.closed'
  | 'application.created'
  | 'application.status_changed'
  | 'match.requested'
  | 'match.completed'
  | 'payment.completed'
  | 'notification.requested';

export interface ResumeUploadedPayload {
  resumeId: string;
  candidateId: string;
  fileUrl: string;
  originalFileName: string;
}

export interface ApplicationCreatedPayload {
  applicationId: string;
  candidateId: string;
  jobId: string;
  resumeId: string;
}

export interface MatchCompletedPayload {
  matchReportId: string;
  candidateId: string;
  jobId: string;
  overallScore: number;
  recommendation: string;
}
