import { prisma } from '@careerforge/database';
import { MatchReport as MatchReportModel, RecommendationType, MatchLevel as PrismaMatchLevel } from '@prisma/client';
import { MatchReport, MatchLevel, MatchRecommendation } from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';
import { SkillMatcher } from './skill-matcher.js';
import { SemanticMatcher } from './semantic-matcher.js';
import { ExperienceMatcher } from './experience-matcher.js';
import { EducationMatcher } from './education-matcher.js';
import { LocationMatcher } from './location-matcher.js';
import { ScoreCalculator } from './score-calculator.js';
import { MatchExplanationService } from './match-explanation.js';

export const MATCH_ENGINE_VERSION = '1.0';

export class MatchingService {
  /**
   * Generates or retrieves an existing, valid MatchReport for a candidate against a job.
   */
  static async getCandidateJobMatch(
    candidateUserId: string,
    jobId: string,
    forceRecompute: boolean = false
  ): Promise<MatchReport> {
    // 1. Fetch Candidate Profile with skills, education, experience, and active resume
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
      include: {
        skills: {
          include: { skill: true },
        },
        experiences: true,
        educations: true,
        resumes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!candidate) {
      throw new AppError('Candidate profile not found. Please complete your profile.', 404, 'CANDIDATE_NOT_FOUND');
    }

    // 2. Fetch Job with skills and requirements
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        jobSkills: {
          include: { skill: true },
        },
      },
    });

    if (!job) {
      throw new AppError('Job vacancy not found', 404, 'JOB_NOT_FOUND');
    }

    if (job.status !== 'PUBLISHED' && job.status !== 'ACTIVE') {
      throw new AppError('Job vacancy is not active or available for matching', 400, 'JOB_NOT_ACTIVE');
    }

    // 3. Check for existing cached MatchReport
    const existingReport = await prisma.matchReport.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
    });

    const activeResume = candidate.resumes[0] || null;

    // Check if cached report is still valid
    if (existingReport && !forceRecompute && !existingReport.isStale) {
      const isCandidateStale = candidate.updatedAt > existingReport.updatedAt;
      const isJobStale = job.updatedAt > existingReport.updatedAt;
      const isResumeStale = activeResume ? activeResume.updatedAt > existingReport.updatedAt : false;
      const isVersionStale = existingReport.engineVersion !== MATCH_ENGINE_VERSION;

      if (!isCandidateStale && !isJobStale && !isResumeStale && !isVersionStale) {
        return this.formatMatchReport(existingReport);
      }
    }

    // 4. Compute Fresh Hybrid Match
    return await this.computeAndPersistMatch(candidate, job, activeResume);
  }

  /**
   * Recruiter fetches candidate match for an owned job posting.
   */
  static async getRecruiterCandidateMatch(
    recruiterUserId: string,
    recruiterRole: string,
    jobId: string,
    candidateId: string
  ): Promise<MatchReport> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        recruiter: true,
        jobSkills: {
          include: { skill: true },
        },
      },
    });

    if (!job) {
      throw new AppError('Job vacancy not found', 404, 'JOB_NOT_FOUND');
    }

    if (recruiterRole !== 'ADMIN' && job.recruiter.userId !== recruiterUserId) {
      throw new AppError('Unauthorized access to this job candidate pipeline', 403, 'UNAUTHORIZED_RECRUITER_ACCESS');
    }

    const candidate = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        skills: {
          include: { skill: true },
        },
        experiences: true,
        educations: true,
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

    // Check existing or recompute
    const existingReport = await prisma.matchReport.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
    });

    const activeResume = candidate.resumes[0] || null;

    if (existingReport && !existingReport.isStale) {
      const isCandidateStale = candidate.updatedAt > existingReport.updatedAt;
      const isJobStale = job.updatedAt > existingReport.updatedAt;
      const isResumeStale = activeResume ? activeResume.updatedAt > existingReport.updatedAt : false;
      const isVersionStale = existingReport.engineVersion !== MATCH_ENGINE_VERSION;

      if (!isCandidateStale && !isJobStale && !isResumeStale && !isVersionStale) {
        return this.formatMatchReport(existingReport);
      }
    }

    return await this.computeAndPersistMatch(candidate, job, activeResume);
  }

  /**
   * Internal pure calculation & database persistence for a MatchReport.
   */
  private static async computeAndPersistMatch(
    candidate: any,
    job: any,
    activeResume: any | null
  ): Promise<MatchReport> {
    // A. Deterministic Skill Match (40%)
    const rawCandidateSkills = candidate.skills.map((cs: any) => ({
      name: cs.skill.name,
      proficiency: cs.proficiency,
      yearsOfExperience: cs.yearsOfExperience,
    }));

    const rawJobSkills = job.jobSkills.map((js: any) => ({
      name: js.skill.name,
      required: js.required,
      importance: js.importance,
      minimumYears: js.minimumYears,
    }));

    const skillResult = await SkillMatcher.evaluate(rawCandidateSkills, rawJobSkills);

    // B. Semantic FAISS Vector Similarity (25%)
    const semanticResult = await SemanticMatcher.evaluate(activeResume?.id, {
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
    });

    // C. Experience Match (20%)
    const candidateYears = candidate.experienceYears ?? 0;
    const experienceResult = ExperienceMatcher.evaluate(
      candidateYears,
      job.experienceMin,
      job.experienceMax
    );

    // D. Education Match (10%)
    const rawEducations = candidate.educations.map((e: any) => ({
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
    }));
    const educationResult = EducationMatcher.evaluate(
      rawEducations,
      `${job.description} ${job.requirements || ''}`
    );

    // E. Location & Work Mode Match (5%)
    const locationResult = LocationMatcher.evaluate({
      candidateLocation: candidate.location,
      candidatePreferredLocation: candidate.preferredLocation,
      candidateWorkMode: candidate.workMode,
      jobLocation: job.location,
      jobWorkMode: job.workMode,
    });

    // F. Final Weighted Score & Level Determination
    const finalScore = ScoreCalculator.calculateFinalScore(
      skillResult.score,
      semanticResult.score,
      experienceResult.score,
      educationResult.score,
      locationResult.score
    );

    const matchLevel = ScoreCalculator.determineMatchLevel(finalScore);
    const recommendation = ScoreCalculator.determineRecommendation(
      finalScore,
      skillResult.required.percentage
    );
    const breakdown = ScoreCalculator.buildBreakdown(
      skillResult.score,
      semanticResult.score,
      experienceResult.score,
      educationResult.score,
      locationResult.score
    );

    // G. Grounded Factual Explanation
    const explanation = MatchExplanationService.generateDeterministicExplanation({
      finalScore,
      matchLevel,
      skills: skillResult,
      experience: experienceResult,
      education: educationResult,
      location: locationResult,
      jobTitle: job.title,
      companyName: job.companyName,
    });

    // H. Persist in PostgreSQL (Upsert MatchReport)
    const report = await prisma.matchReport.upsert({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
      create: {
        candidateId: candidate.id,
        jobId: job.id,
        overallScore: finalScore,
        matchLevel: matchLevel as PrismaMatchLevel,
        skillScore: skillResult.score,
        semanticScore: semanticResult.score,
        experienceScore: experienceResult.score,
        educationScore: educationResult.score,
        locationScore: locationResult.score,
        matchedSkills: skillResult.matchedSkills,
        missingSkills: skillResult.missingRequiredSkills,
        missingRequiredSkills: skillResult.missingRequiredSkills,
        missingPreferredSkills: skillResult.missingPreferredSkills,
        candidateExtraSkills: skillResult.candidateExtraSkills,
        experienceGaps: experienceResult.gap > 0 ? [`Experience gap of ${experienceResult.gap} year(s)`] : [],
        candidateYears: experienceResult.candidateYears,
        requiredYears: experienceResult.requiredYears,
        experienceGap: experienceResult.gap,
        breakdown: breakdown as any,
        recommendation: recommendation as RecommendationType,
        confidence: 0.95,
        explanation,
        engineVersion: MATCH_ENGINE_VERSION,
        isStale: false,
      },
      update: {
        overallScore: finalScore,
        matchLevel: matchLevel as PrismaMatchLevel,
        skillScore: skillResult.score,
        semanticScore: semanticResult.score,
        experienceScore: experienceResult.score,
        educationScore: educationResult.score,
        locationScore: locationResult.score,
        matchedSkills: skillResult.matchedSkills,
        missingSkills: skillResult.missingRequiredSkills,
        missingRequiredSkills: skillResult.missingRequiredSkills,
        missingPreferredSkills: skillResult.missingPreferredSkills,
        candidateExtraSkills: skillResult.candidateExtraSkills,
        experienceGaps: experienceResult.gap > 0 ? [`Experience gap of ${experienceResult.gap} year(s)`] : [],
        candidateYears: experienceResult.candidateYears,
        requiredYears: experienceResult.requiredYears,
        experienceGap: experienceResult.gap,
        breakdown: breakdown as any,
        recommendation: recommendation as RecommendationType,
        confidence: 0.95,
        explanation,
        engineVersion: MATCH_ENGINE_VERSION,
        isStale: false,
        updatedAt: new Date(),
      },
    });

    return {
      ...this.formatMatchReport(report),
      skills: skillResult,
      semantic: semanticResult,
      experience: experienceResult,
      education: educationResult,
      location: locationResult,
    };
  }

  /**
   * Formats a database MatchReport record to the API contract.
   */
  private static formatMatchReport(report: MatchReportModel): MatchReport {
    const rawBreakdown = (report.breakdown as any) || {
      skills: report.skillScore,
      semantic: report.semanticScore,
      experience: report.experienceScore,
      education: report.educationScore,
      location: report.locationScore,
    };

    return {
      id: report.id,
      candidateId: report.candidateId,
      jobId: report.jobId,
      applicationId: report.applicationId,
      overallScore: report.overallScore,
      finalScore: report.overallScore,
      matchLevel: report.matchLevel as MatchLevel,
      skillScore: report.skillScore,
      semanticScore: report.semanticScore,
      experienceScore: report.experienceScore,
      educationScore: report.educationScore,
      locationScore: report.locationScore,
      matchedSkills: (report.matchedSkills as string[]) || [],
      missingSkills: (report.missingSkills as string[]) || [],
      missingRequiredSkills: (report.missingRequiredSkills as string[]) || [],
      missingPreferredSkills: (report.missingPreferredSkills as string[]) || [],
      candidateExtraSkills: (report.candidateExtraSkills as string[]) || [],
      experienceGaps: (report.experienceGaps as string[]) || [],
      candidateYears: report.candidateYears,
      requiredYears: report.requiredYears,
      experienceGap: report.experienceGap,
      breakdown: rawBreakdown,
      recommendation: report.recommendation as MatchRecommendation,
      confidence: report.confidence,
      explanation: report.explanation,
      engineVersion: report.engineVersion,
      isStale: report.isStale,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }
}
