import { prisma } from '@careerforge/database';
import {
  SkillGapAnalysisReport,
  SkillGapItem,
  SkillRequirementType,
  ReadinessLevel,
  GapPriority,
  SkillGapStatus,
} from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';
import { MatchingService } from '../matching/matching.service.js';
import { SkillService } from '../skill/skill.service.js';
import { SkillGapAnalyzer } from './gap-analyzer.js';
import { SeedCatalogService } from '../learning-path/seed-catalog.js';

export const GAP_ENGINE_VERSION = '1.0';

export class SkillGapService {
  /**
   * Generates or retrieves existing SkillGapAnalysis for authenticated candidate and job.
   */
  static async analyzeSkillGaps(
    candidateUserId: string,
    jobId: string,
    forceRecompute: boolean = false
  ): Promise<SkillGapAnalysisReport> {
    // 1. Ensure seed catalog exists
    await SeedCatalogService.seedIfEmpty();

    // 2. Fetch Candidate Profile
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
      include: {
        skills: { include: { skill: true } },
      },
    });

    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_NOT_FOUND');
    }

    // 3. Fetch Job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        jobSkills: { include: { skill: true } },
      },
    });

    if (!job) {
      throw new AppError('Job vacancy not found', 404, 'JOB_NOT_FOUND');
    }

    if (job.status !== 'PUBLISHED' && job.status !== 'ACTIVE') {
      throw new AppError('Job vacancy is not active', 400, 'JOB_NOT_ACTIVE');
    }

    // 4. Check for existing cached SkillGapAnalysis
    const existingAnalysis = await prisma.skillGapAnalysis.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
      include: {
        gaps: true,
      },
    });

    if (existingAnalysis && !forceRecompute && !existingAnalysis.isStale) {
      const isCandidateStale = candidate.updatedAt > existingAnalysis.updatedAt;
      const isJobStale = job.updatedAt > existingAnalysis.updatedAt;
      const isVersionStale = existingAnalysis.engineVersion !== GAP_ENGINE_VERSION;

      if (!isCandidateStale && !isJobStale && !isVersionStale) {
        return this.formatAnalysisReport(existingAnalysis);
      }
    }

    // 5. Retrieve Grounded Match Report from Phase 13
    const matchReport = await MatchingService.getCandidateJobMatch(candidateUserId, jobId, forceRecompute);

    // 6. Resolve Missing Skills with Canonical Taxonomy
    const rawMissingReq = matchReport.missingRequiredSkills || [];
    const rawMissingPref = matchReport.missingPreferredSkills || [];

    const resolvedReq = await SkillService.resolveSkills(rawMissingReq);
    const resolvedPref = await SkillService.resolveSkills(rawMissingPref);

    const allResolvedSkillIds = [
      ...resolvedReq.map((r) => r.canonicalSkillId).filter(Boolean),
      ...resolvedPref.map((r) => r.canonicalSkillId).filter(Boolean),
    ] as string[];

    // 7. Check Dependency Relationships Among Missing Skills
    const prerequisiteDependencies = await prisma.skillDependency.findMany({
      where: {
        prerequisiteSkillId: { in: allResolvedSkillIds },
        dependentSkillId: { in: allResolvedSkillIds },
      },
    });

    const prereqSkillIdSet = new Set(prerequisiteDependencies.map((d) => d.prerequisiteSkillId));

    // 8. Construct Evaluated SkillGap Items
    const evaluatedGaps: SkillGapItem[] = [];

    for (const req of resolvedReq) {
      const skillName = req.canonicalName || req.input;
      const skillId = req.canonicalSkillId;
      const isPrereq = skillId ? prereqSkillIdSet.has(skillId) : false;

      const gap = SkillGapAnalyzer.evaluateGapItem({
        skillId,
        skillName,
        requirementType: 'REQUIRED',
        isPrerequisiteToOtherMissing: isPrereq,
        semanticRelevance: 8,
      });
      evaluatedGaps.push(gap);
    }

    for (const pref of resolvedPref) {
      const skillName = pref.canonicalName || pref.input;
      const skillId = pref.canonicalSkillId;
      const isPrereq = skillId ? prereqSkillIdSet.has(skillId) : false;

      const gap = SkillGapAnalyzer.evaluateGapItem({
        skillId,
        skillName,
        requirementType: 'PREFERRED',
        isPrerequisiteToOtherMissing: isPrereq,
        semanticRelevance: 5,
      });
      evaluatedGaps.push(gap);
    }

    // 9. Calculate Deterministic Job Readiness
    const requiredStats = matchReport.skills?.required || { matched: 0, total: 0 };
    const preferredStats = matchReport.skills?.preferred || { matched: 0, total: 0 };

    const readiness = SkillGapAnalyzer.calculateReadiness({
      matchedRequired: requiredStats.matched,
      totalRequired: requiredStats.total,
      matchedPreferred: preferredStats.matched,
      totalPreferred: preferredStats.total,
    });

    // Priority counts
    const highCount = evaluatedGaps.filter((g) => g.priority === 'HIGH').length;
    const medCount = evaluatedGaps.filter((g) => g.priority === 'MEDIUM').length;
    const lowCount = evaluatedGaps.filter((g) => g.priority === 'LOW').length;
    const estimatedHours = evaluatedGaps.length * 8.0; // Baseline estimate

    // 10. Persist Relational Analysis and Gaps in PostgreSQL
    const savedAnalysis = await prisma.$transaction(async (tx) => {
      // Upsert Analysis Record
      const analysis = await tx.skillGapAnalysis.upsert({
        where: {
          candidateId_jobId: {
            candidateId: candidate.id,
            jobId: job.id,
          },
        },
        create: {
          candidateId: candidate.id,
          jobId: job.id,
          matchReportId: matchReport.id,
          overallReadiness: readiness.score,
          readinessLevel: readiness.level,
          highPriorityCount: highCount,
          mediumPriorityCount: medCount,
          lowPriorityCount: lowCount,
          estimatedLearningHours: estimatedHours,
          engineVersion: GAP_ENGINE_VERSION,
          isStale: false,
        },
        update: {
          matchReportId: matchReport.id,
          overallReadiness: readiness.score,
          readinessLevel: readiness.level,
          highPriorityCount: highCount,
          mediumPriorityCount: medCount,
          lowPriorityCount: lowCount,
          estimatedLearningHours: estimatedHours,
          engineVersion: GAP_ENGINE_VERSION,
          isStale: false,
          updatedAt: new Date(),
        },
      });

      // Clear existing gaps for clean refresh
      await tx.skillGap.deleteMany({
        where: { analysisId: analysis.id },
      });

      // Insert new relational gaps
      if (evaluatedGaps.length > 0) {
        await tx.skillGap.createMany({
          data: evaluatedGaps.map((g) => ({
            analysisId: analysis.id,
            skillId: g.skillId,
            skillName: g.skillName,
            priority: g.priority as GapPriority,
            priorityScore: g.priorityScore,
            requirementType: g.requirementType as SkillRequirementType,
            skillStatus: g.skillStatus as SkillGapStatus,
            jobRelevance: g.jobRelevance,
            dependencyImportance: g.dependencyImportance,
            semanticRelevance: g.semanticRelevance,
            reason: g.reason,
          })),
        });
      }

      return await tx.skillGapAnalysis.findUnique({
        where: { id: analysis.id },
        include: { gaps: true },
      });
    });

    return this.formatAnalysisReport(savedAnalysis!);
  }

  /**
   * Formats database analysis record into contract response.
   */
  private static formatAnalysisReport(analysis: any): SkillGapAnalysisReport {
    return {
      id: analysis.id,
      candidateId: analysis.candidateId,
      jobId: analysis.jobId,
      matchReportId: analysis.matchReportId,
      overallReadiness: analysis.overallReadiness,
      readinessLevel: analysis.readinessLevel as ReadinessLevel,
      highPriorityCount: analysis.highPriorityCount,
      mediumPriorityCount: analysis.mediumPriorityCount,
      lowPriorityCount: analysis.lowPriorityCount,
      estimatedLearningHours: analysis.estimatedLearningHours,
      gaps: (analysis.gaps || []).map((g: any) => ({
        id: g.id,
        skillId: g.skillId,
        skillName: g.skillName,
        priority: g.priority as GapPriority,
        priorityScore: g.priorityScore,
        requirementType: g.requirementType as SkillRequirementType,
        skillStatus: g.skillStatus as SkillGapStatus,
        jobRelevance: g.jobRelevance,
        dependencyImportance: g.dependencyImportance,
        semanticRelevance: g.semanticRelevance,
        reason: g.reason,
      })),
      engineVersion: analysis.engineVersion,
      isStale: analysis.isStale,
      createdAt: analysis.createdAt.toISOString(),
      updatedAt: analysis.updatedAt.toISOString(),
    };
  }
}
