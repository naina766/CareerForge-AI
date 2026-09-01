import {
  RAGResponseStatus,
  RAGSource,
} from '@careerforge/types';

export type QueryIntent =
  | 'PROFILE'
  | 'RESUME'
  | 'JOB'
  | 'MATCH'
  | 'SKILL_GAP'
  | 'LEARNING'
  | 'APPLICATION'
  | 'GENERAL_CAREER'
  | 'MULTI_CONTEXT';

export interface RetrievedContext {
  intent: QueryIntent;
  candidateProfile: {
    name: string;
    headline?: string | null;
    location?: string | null;
    experienceYears?: number | null;
    skills: string[];
    preferences?: any;
  };
  sources: RAGSource[];
  rawContextBlocks: string[];
}

export interface PromptGuardResult {
  isSafe: boolean;
  blockedReason?: string;
}

export interface RAGExecutionResult {
  answer: string;
  status: RAGResponseStatus;
  sources: RAGSource[];
  confidence: number;
  usage?: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
}
