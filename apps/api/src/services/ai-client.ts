import { StructuredResumeData } from '@careerforge/types';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { CircuitBreaker } from '../infrastructure/observability/circuit-breaker.js';

export interface ParseResumeInput {
  rawText?: string;
  pdfBase64?: string;
  parserVersion?: string;
}

export interface ParseResumeOutput {
  success: boolean;
  rawText: string;
  structuredData: StructuredResumeData;
  parserVersion: string;
  sectionsDetected: string[];
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  factor?: number;
  timeoutMs?: number;
}

// Dedicated Circuit Breaker for FastAPI AI Service calls
export const aiCircuitBreaker = new CircuitBreaker({
  name: 'fastapi-ai-service',
  failureThreshold: 3,
  resetTimeoutMs: 10000,
  timeoutMs: 10000,
});

/**
 * Resilient fetch execution with bounded retry, exponential backoff, and AbortController timeout.
 */
async function fetchWithRetryAndTimeout(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const maxRetries = retryOptions.maxRetries ?? 3;
  const initialDelayMs = retryOptions.initialDelayMs ?? 250;
  const factor = retryOptions.factor ?? 2;
  const timeoutMs = retryOptions.timeoutMs ?? 8000;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on 502/503/504 transient server degradation
      if (response.status >= 502 && response.status <= 504 && attempt < maxRetries) {
        logger.warn(`[AIServiceClient] Attempt ${attempt}/${maxRetries} to ${url} received HTTP ${response.status}. Retrying...`);
        const jitter = Math.random() * 50;
        const delay = initialDelayMs * Math.pow(factor, attempt - 1) + jitter;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');

      if (attempt < maxRetries) {
        logger.warn(
          `[AIServiceClient] Attempt ${attempt}/${maxRetries} to ${url} failed (${isAbort ? 'Timeout' : err.message}). Retrying...`
        );
        const jitter = Math.random() * 50;
        const delay = initialDelayMs * Math.pow(factor, attempt - 1) + jitter;
        await new Promise((r) => setTimeout(r, delay));
      } else {
        if (isAbort) {
          throw new AppError(`AI Service request timed out after ${timeoutMs}ms`, 504, 'AI_SERVICE_TIMEOUT');
        }
        throw new AppError(`AI Service unreachable at ${url}: ${err.message}`, 503, 'AI_SERVICE_UNAVAILABLE');
      }
    }
  }

  throw lastError || new AppError('AI Service request failed after retries', 503, 'AI_SERVICE_UNAVAILABLE');
}

export class AIServiceClient {
  private static baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1';

  /**
   * Calls the FastAPI AI service resume parser with Circuit Breaker and Retry protection.
   * Note: NEVER fabricates fake resume/PII data on failure; throws explicit AppError.
   */
  static async parseResume(input: ParseResumeInput): Promise<ParseResumeOutput> {
    const url = `${this.baseUrl}/resume/parse`;

    return await aiCircuitBreaker.execute(async () => {
      const response = await fetchWithRetryAndTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw_text: input.rawText,
            pdf_base64: input.pdfBase64,
            parser_version: input.parserVersion || '1.0.0',
          }),
        },
        { timeoutMs: 10000, maxRetries: 3 }
      );

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: `HTTP ${response.status}` };
        }

        const detail = errorData.detail || 'Resume parsing failed';
        if (detail.includes('TEXT_EXTRACTION_INSUFFICIENT')) {
          throw new AppError(detail, 422, 'TEXT_EXTRACTION_INSUFFICIENT');
        }

        throw new AppError(detail, 400, 'PARSING_FAILED');
      }

      const data: any = await response.json();
      return {
        success: data.success,
        rawText: data.raw_text,
        structuredData: {
          personal: {
            fullName: data.structured_data.personal?.full_name,
            email: data.structured_data.personal?.email,
            phone: data.structured_data.personal?.phone,
            location: data.structured_data.personal?.location,
            linkedin: data.structured_data.personal?.linkedin,
            github: data.structured_data.personal?.github,
            portfolio: data.structured_data.personal?.portfolio,
          },
          summary: data.structured_data.summary,
          skills: data.structured_data.skills || [],
          experience: (data.structured_data.experience || []).map((e: any) => ({
            company: e.company,
            title: e.title,
            location: e.location,
            startDate: e.start_date,
            endDate: e.end_date,
            isCurrent: e.is_current,
            description: e.description,
            technologies: e.technologies || [],
          })),
          education: (data.structured_data.education || []).map((e: any) => ({
            institution: e.institution,
            degree: e.degree,
            fieldOfStudy: e.field_of_study,
            startDate: e.start_date,
            endDate: e.end_date,
            grade: e.grade,
          })),
          projects: (data.structured_data.projects || []).map((p: any) => ({
            name: p.name,
            description: p.description,
            technologies: p.technologies || [],
            url: p.url,
          })),
          certifications: (data.structured_data.certifications || []).map((c: any) => ({
            name: c.name,
            issuer: c.issuer,
            issueDate: c.issue_date,
          })),
          languages: (data.structured_data.languages || []).map((l: any) => ({
            name: l.name,
            proficiency: l.proficiency,
          })),
        },
        parserVersion: data.parser_version,
        sectionsDetected: data.sections_detected || [],
      };
    });
  }

  /**
   * Indexes resume chunks into FAISS via FastAPI AI service through circuit breaker.
   */
  static async indexResumeVectors(resumeId: string, chunks: any[]): Promise<any> {
    const url = `${this.baseUrl}/vector/index/resume`;

    return await aiCircuitBreaker.execute(
      async () => {
        const response = await fetchWithRetryAndTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resume_id: resumeId,
              chunks: chunks.map((c) => ({
                id: c.id,
                resume_id: c.resumeId,
                content: c.content,
                section: c.section,
                chunk_index: c.chunkIndex,
                content_hash: c.contentHash,
              })),
            }),
          },
          { timeoutMs: 8000, maxRetries: 2 }
        );

        if (!response.ok) {
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch {
            errorData = { detail: `HTTP ${response.status}` };
          }
          throw new AppError(errorData.detail || 'FAISS indexing failed', response.status, 'INDEXING_FAILED');
        }

        return await response.json();
      },
      async (err) => {
        logger.warn(`AI service FAISS index fallback triggered: ${err.message}`);
        return {
          success: false,
          resume_id: resumeId,
          indexed_count: 0,
          error: err.message,
        };
      }
    );
  }

  /**
   * Queries FAISS semantic search index via FastAPI AI service with circuit breaker protection.
   */
  static async searchVectors(query: string, topK: number = 5, resumeIdFilter?: string): Promise<any> {
    const url = `${this.baseUrl}/vector/search`;

    return await aiCircuitBreaker.execute(
      async () => {
        const response = await fetchWithRetryAndTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              top_k: topK,
              resume_id_filter: resumeIdFilter,
            }),
          },
          { timeoutMs: 5000, maxRetries: 2 }
        );

        if (!response.ok) {
          throw new AppError('FAISS vector search failed', response.status, 'VECTOR_SEARCH_FAILED');
        }

        return await response.json();
      },
      async () => {
        return {
          query,
          results: [],
          total_matched: 0,
        };
      }
    );
  }

  /**
   * Generates grounded RAG responses via FastAPI AI service with circuit breaker protection.
   */
  static async generateRAGResponse(input: {
    query: string;
    intent?: string;
    candidate_profile?: any;
    context_documents?: any[];
    recent_history?: any[];
  }): Promise<any> {
    const url = `${this.baseUrl}/rag/generate`;

    return await aiCircuitBreaker.execute(
      async () => {
        const response = await fetchWithRetryAndTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
          { timeoutMs: 10000, maxRetries: 2 }
        );

        if (!response.ok) {
          throw new AppError('RAG generation failed', response.status, 'RAG_GENERATION_FAILED');
        }

        return await response.json();
      },
      async () => {
        return null;
      }
    );
  }

  /**
   * Evaluates candidate skills against benchmark target role requirements.
   */
  static async analyzeSkillGap(input: {
    target_role: string;
    candidate_skills: string[];
    top_k?: number;
  }): Promise<any> {
    const url = `${this.baseUrl}/rag/skill-gap`;

    return await aiCircuitBreaker.execute(
      async () => {
        const response = await fetchWithRetryAndTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
          { timeoutMs: 8000, maxRetries: 2 }
        );

        if (!response.ok) {
          throw new AppError('Skill gap analysis failed', response.status, 'SKILL_GAP_FAILED');
        }

        return await response.json();
      },
      async () => {
        return {
          target_role: input.target_role,
          existing_skills: input.candidate_skills,
          missing_skills: [],
          priority_skills: [],
          grounding_evidence: 'Fallback: Real-time skill analysis temporarily unavailable.',
          citations: [],
        };
      }
    );
  }

  /**
   * Recommends career roles grounded in verified candidate skills and trajectory.
   */
  static async recommendCareerRoles(input: {
    candidate_skills: string[];
    experience_years?: number;
    desired_roles?: string[];
  }): Promise<any> {
    const url = `${this.baseUrl}/rag/recommend-roles`;

    return await aiCircuitBreaker.execute(
      async () => {
        const response = await fetchWithRetryAndTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
          { timeoutMs: 10000, maxRetries: 2 }
        );

        if (!response.ok) {
          throw new AppError('Role recommendation failed', response.status, 'ROLE_RECOMMENDATION_FAILED');
        }

        return await response.json();
      },
      async () => {
        return {
          recommendations: [],
          citations: [],
        };
      }
    );
  }

  /**
   * Generates structured learning roadmap modules.
   */
  static async generateLearningRoadmap(input: {
    target_role: string;
    skill_gaps: string[];
  }): Promise<any> {
    const url = `${this.baseUrl}/rag/learning-roadmap`;

    return await aiCircuitBreaker.execute(
      async () => {
        const response = await fetchWithRetryAndTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
          { timeoutMs: 10000, maxRetries: 2 }
        );

        if (!response.ok) {
          throw new AppError('Learning roadmap generation failed', response.status, 'ROADMAP_GENERATION_FAILED');
        }

        return await response.json();
      },
      async () => {
        return {
          target_role: input.target_role,
          modules: [],
          citations: [],
        };
      }
    );
  }

  /**
   * Retrieves FAISS index statistics.
   */
  static async getVectorStats(): Promise<any> {
    const url = `${this.baseUrl}/vector/stats`;

    return await aiCircuitBreaker.execute(
      async () => {
        const response = await fetchWithRetryAndTimeout(url, { method: 'GET' }, { timeoutMs: 3000, maxRetries: 1 });
        if (response.ok) return await response.json();
        throw new Error(`HTTP ${response.status}`);
      },
      async () => {
        return {
          total_vectors: 0,
          embedding_dimension: 384,
          embedding_model: 'sentence-transformers/all-MiniLM-L6-v2',
          index_version: 1,
        };
      }
    );
  }
}
