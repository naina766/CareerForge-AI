import { prisma } from '@careerforge/database';
import {
  JobRecommendationItem,
  JobRecommendationListResponse,
  RecommendationLevel,
  WorkMode,
  EmploymentType,
} from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';
import { SkillMatcher } from '../matching/skill-matcher.js';
import { SemanticMatcher } from '../matching/semantic-matcher.js';
import { ExperienceMatcher } from '../matching/experience-matcher.js';
import { PreferenceMatcher } from './preference-matcher.js';
import { FreshnessCalculator } from './freshness-calculator.js';
import { RecommendationScorer } from './recommendation-scorer.js';

export const RECOMMENDATION_ENGINE_VERSION = '1.0';

export interface GetRecommendationsOptions {
  page?: number;
  limit?: number;
  workMode?: WorkMode;
  location?: string;
  minScore?: number;
  sortBy?: 'recommended' | 'highest_match' | 'newest';
  forceRefresh?: boolean;
}

export class RecommendationService {
  /**
   * Generates or retrieves cached personalized job recommendations for a candidate.
   */
  static async getRecommendedJobs(
    candidateUserId: string,
    options: GetRecommendationsOptions = {}
  ): Promise<JobRecommendationListResponse> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    // 1. Fetch Candidate Profile with relations
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
      include: {
        skills: { include: { skill: true } },
        experiences: true,
        preferences: true,
        resumes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_NOT_FOUND');
    }

    // 2. Fetch all jobs candidate has already applied to / withdrawn from
    const candidateApplications = await prisma.application.findMany({
      where: { candidateId: candidate.id },
      select: { jobId: true },
    });
    const appliedJobIds = candidateApplications.map((a) => a.jobId);

    // 3. Check for existing cached recommendations
    const existingRecs = await prisma.jobRecommendation.findMany({
      where: { candidateId: candidate.id },
      orderBy: { generatedAt: 'desc' },
      take: 1,
    });

    let needsRecompute = options.forceRefresh === true || existingRecs.length === 0;

    if (!needsRecompute && existingRecs.length > 0) {
      const latestGeneratedAt = existingRecs[0].generatedAt;
      const isCandidateStale = candidate.updatedAt > latestGeneratedAt;
      const isPreferenceStale = candidate.preferences
        ? candidate.preferences.updatedAt > latestGeneratedAt
        : false;
      const isVersionStale = existingRecs[0].engineVersion !== RECOMMENDATION_ENGINE_VERSION;

      if (isCandidateStale || isPreferenceStale || isVersionStale) {
        needsRecompute = true;
      }
    }

    // 4. Compute fresh recommendations if needed
    if (needsRecompute) {
      await this.computeAndPersistRecommendations(candidate, appliedJobIds);
    }

    // 5. Query persisted recommendations with filters, sorting, and pagination
    const now = new Date();
    const whereClause: any = {
      candidateId: candidate.id,
      jobId: { notIn: appliedJobIds },
      job: {
        status: { in: ['PUBLISHED', 'ACTIVE'] },
        OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: now } }],
      },
    };

    if (options.workMode) {
      whereClause.job.workMode = options.workMode;
    }

    if (options.location) {
      whereClause.job.location = { contains: options.location, mode: 'insensitive' };
    }

    if (options.minScore && options.minScore > 0) {
      whereClause.recommendationScore = { gte: options.minScore };
    }

    let orderByClause: any = { recommendationScore: 'desc' };
    if (options.sortBy === 'highest_match') {
      orderByClause = { skillScore: 'desc' };
    } else if (options.sortBy === 'newest') {
      orderByClause = { job: { createdAt: 'desc' } };
    }

    const [total, recs] = await Promise.all([
      prisma.jobRecommendation.count({ where: whereClause }),
      prisma.jobRecommendation.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          job: {
            include: {
              jobSkills: { include: { skill: true } },
            },
          },
        },
      }),
    ]);

    const items: JobRecommendationItem[] = recs.map((r) => this.formatRecommendationItem(r));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      engineVersion: RECOMMENDATION_ENGINE_VERSION,
      generatedAt: recs[0]?.generatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Retrieves single job recommendation details for authenticated candidate.
   */
  static async getSingleRecommendation(
    candidateUserId: string,
    jobId: string
  ): Promise<JobRecommendationItem> {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
    });

    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_NOT_FOUND');
    }

    let rec = await prisma.jobRecommendation.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId,
        },
      },
      include: {
        job: {
          include: {
            jobSkills: { include: { skill: true } },
          },
        },
      },
    });

    if (!rec) {
      // Recompute and fetch
      await this.getRecommendedJobs(candidateUserId, { forceRefresh: true });
      rec = await prisma.jobRecommendation.findUnique({
        where: {
          candidateId_jobId: {
            candidateId: candidate.id,
            jobId,
          },
        },
        include: {
          job: {
            include: {
              jobSkills: { include: { skill: true } },
            },
          },
        },
      });
    }

    if (!rec) {
      throw new AppError('Recommendation not found for this vacancy', 404, 'RECOMMENDATION_NOT_FOUND');
    }

    return this.formatRecommendationItem(rec);
  }

  /**
   * Internal pipeline: Computes 5-signal scores for all eligible published vacancies.
   */
  private static async computeAndPersistRecommendations(
    candidate: any,
    appliedJobIds: string[]
  ): Promise<void> {
    const now = new Date();

    // 1. Fetch eligible jobs in PostgreSQL
    const eligibleJobs = await prisma.job.findMany({
      where: {
        id: { notIn: appliedJobIds },
        status: { in: ['PUBLISHED', 'ACTIVE'] },
        OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: now } }],
      },
      include: {
        jobSkills: { include: { skill: true } },
      },
    });

    if (eligibleJobs.length === 0) return;

    // 2. Prepare candidate representations
    const candidateSkillInputs = candidate.skills.map((s: any) => ({
      name: s.skill.name,
      proficiency: s.proficiency,
    }));
    const candidateTotalYears =
      candidate.experienceYears && candidate.experienceYears > 0
        ? candidate.experienceYears
        : candidate.experiences && candidate.experiences.length > 0
        ? candidate.experiences.reduce((acc: number, exp: any) => {
            const start = new Date(exp.startDate).getTime();
            const end = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
            return acc + Math.max(0, (end - start) / (1000 * 60 * 60 * 24 * 365.25));
          }, 0)
        : 0;
    const activeResume = candidate.resumes?.[0];
    const candidatePreferences = candidate.preferences;

    // 3. Process jobs in parallel batches
    const recommendationRecords: any[] = [];

    for (const job of eligibleJobs) {
      // Signal 1: Skills (40%)
      const jobSkillInputs = job.jobSkills.map((js: any) => ({
        name: js.skill.name,
        required: js.required ?? true,
        importance: js.importance || (js.required ? 'REQUIRED' : 'PREFERRED'),
      }));
      const skillDetails = await SkillMatcher.evaluate(candidateSkillInputs, jobSkillInputs);

      // Signal 2: Semantic (25%) via FAISS
      const semanticDetails = await SemanticMatcher.evaluate(activeResume?.id, {
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
      });

      // Signal 3: Experience (15%)
      const experienceDetails = ExperienceMatcher.evaluate(
        candidateTotalYears,
        job.experienceMin,
        job.experienceMax
      );

      // Signal 4: Preferences (15%)
      const preferenceScore = PreferenceMatcher.evaluate(candidatePreferences, {
        location: job.location,
        workMode: job.workMode,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
      });

      // Signal 5: Freshness (5%)
      const freshnessScore = FreshnessCalculator.calculate(job.publishedAt, job.createdAt);

      // Final 100-Point Weighted Score
      const breakdown = {
        skillScore: skillDetails.score,
        semanticScore: semanticDetails.score,
        experienceScore: experienceDetails.score,
        preferenceScore,
        freshnessScore,
      };

      const { score, level } = RecommendationScorer.calculateScore(breakdown);

      // Grounded Reason Synthesis
      const reason = RecommendationScorer.generateReason({
        skillScore: skillDetails.score,
        semanticScore: semanticDetails.score,
        experienceScore: experienceDetails.score,
        preferenceScore,
        freshnessScore,
        matchedSkills: skillDetails.matchedSkills,
        missingRequiredSkills: skillDetails.missingRequiredSkills,
        workMode: job.workMode,
        location: job.location,
      });

      recommendationRecords.push({
        candidateId: candidate.id,
        jobId: job.id,
        recommendationScore: score,
        recommendationLevel: level as RecommendationLevel,
        skillScore: breakdown.skillScore,
        semanticScore: breakdown.semanticScore,
        experienceScore: breakdown.experienceScore,
        preferenceScore: breakdown.preferenceScore,
        freshnessScore: breakdown.freshnessScore,
        matchedSkills: skillDetails.matchedSkills,
        missingSkills: [...skillDetails.missingRequiredSkills, ...skillDetails.missingPreferredSkills],
        reason,
        source: 'HYBRID_ENGINE',
        engineVersion: RECOMMENDATION_ENGINE_VERSION,
        isStale: false,
        generatedAt: now,
      });
    }

    // 4. Upsert in PostgreSQL transaction
    await prisma.$transaction(async (tx) => {
      for (const rec of recommendationRecords) {
        await tx.jobRecommendation.upsert({
          where: {
            candidateId_jobId: {
              candidateId: rec.candidateId,
              jobId: rec.jobId,
            },
          },
          create: rec,
          update: {
            recommendationScore: rec.recommendationScore,
            recommendationLevel: rec.recommendationLevel,
            skillScore: rec.skillScore,
            semanticScore: rec.semanticScore,
            experienceScore: rec.experienceScore,
            preferenceScore: rec.preferenceScore,
            freshnessScore: rec.freshnessScore,
            matchedSkills: rec.matchedSkills,
            missingSkills: rec.missingSkills,
            reason: rec.reason,
            engineVersion: rec.engineVersion,
            isStale: false,
            generatedAt: now,
            updatedAt: now,
          },
        });
      }
    });
  }

  /**
   * Helper formatting Prisma model to contract interface.
   */
  private static formatRecommendationItem(r: any): JobRecommendationItem {
    return {
      id: r.id,
      candidateId: r.candidateId,
      jobId: r.jobId,
      job: {
        id: r.job.id,
        title: r.job.title,
        slug: r.job.slug,
        companyName: r.job.companyName || 'Apex Data Labs',
        location: r.job.location,
        workMode: r.job.workMode as WorkMode,
        employmentType: r.job.employmentType as EmploymentType,
        salaryMin: r.job.salaryMin,
        salaryMax: r.job.salaryMax,
        currency: r.job.currency || 'USD',
        salaryPeriod: r.job.salaryPeriod || 'YEARLY',
        experienceMin: r.job.experienceMin,
        experienceMax: r.job.experienceMax,
        publishedAt: r.job.publishedAt ? r.job.publishedAt.toISOString() : null,
        createdAt: r.job.createdAt.toISOString(),
        skills: (r.job.jobSkills || []).map((js: any) => ({
          name: js.skill.name,
          required: js.required ?? true,
          importance: js.importance || 'REQUIRED',
        })),
      },
      recommendationScore: r.recommendationScore,
      recommendationLevel: r.recommendationLevel as RecommendationLevel,
      breakdown: {
        skillScore: r.skillScore,
        semanticScore: r.semanticScore,
        experienceScore: r.experienceScore,
        preferenceScore: r.preferenceScore,
        freshnessScore: r.freshnessScore,
      },
      matchedSkills: (r.matchedSkills as string[]) || [],
      missingSkills: (r.missingSkills as string[]) || [],
      reason: r.reason,
      source: r.source || 'HYBRID_ENGINE',
      engineVersion: r.engineVersion,
      isStale: r.isStale,
      generatedAt: r.generatedAt ? r.generatedAt.toISOString() : r.createdAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
