import { prisma } from '@careerforge/database';
import {
  LearningPathResponse,
  LearningItemStatus,
  LearningPathStatus,
  GapPriority,
} from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';
import { SkillGapService } from '../skill-gap/skill-gap.service.js';
import { DependencyResolver, SkillNode } from './dependency-resolver.js';
import { ResourceSelector } from './resource-selector.js';

export class LearningPathService {
  /**
   * Generates or retrieves the personalized learning path for a candidate against a job.
   */
  static async getOrCreateLearningPath(
    candidateUserId: string,
    jobId: string,
    forceRegenerate: boolean = false
  ): Promise<LearningPathResponse> {
    // 1. Fetch Candidate Profile
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
    });

    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_NOT_FOUND');
    }

    // 2. Fetch Job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new AppError('Job vacancy not found', 404, 'JOB_NOT_FOUND');
    }

    // 3. Check for existing LearningPath
    const existingPath = await prisma.learningPath.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
      include: {
        items: {
          include: { resource: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (existingPath && !forceRegenerate) {
      return this.formatLearningPath(existingPath);
    }

    // 4. Run / Retrieve Skill Gap Analysis
    const gapAnalysis = await SkillGapService.analyzeSkillGaps(candidateUserId, jobId, forceRegenerate);

    // If candidate has 0 gaps, create an empty / completed learning path
    if (gapAnalysis.gaps.length === 0) {
      const emptyPath = await prisma.learningPath.upsert({
        where: {
          candidateId_jobId: {
            candidateId: candidate.id,
            jobId: job.id,
          },
        },
        create: {
          candidateId: candidate.id,
          jobId: job.id,
          gapAnalysisId: gapAnalysis.id,
          status: 'COMPLETED' as LearningPathStatus,
          totalEstimatedHours: 0,
          completedHours: 0,
          progressPercentage: 100,
          readinessBefore: gapAnalysis.overallReadiness,
          readinessTarget: 100,
        },
        update: {
          status: 'COMPLETED' as LearningPathStatus,
          totalEstimatedHours: 0,
          completedHours: 0,
          progressPercentage: 100,
          readinessBefore: gapAnalysis.overallReadiness,
          readinessTarget: 100,
          updatedAt: new Date(),
        },
        include: {
          items: { include: { resource: true } },
        },
      });
      return this.formatLearningPath(emptyPath);
    }

    // 5. Prepare Skill Nodes for Topological Ordering
    const skillNodes: SkillNode[] = gapAnalysis.gaps.map((g) => ({
      skillId: g.skillId || g.skillName.toLowerCase(),
      skillName: g.skillName,
      priorityScore: g.priorityScore,
    }));

    // Topologically sort missing skills based on database prerequisites
    const orderedSkills = await DependencyResolver.resolveLearningOrder(skillNodes);

    // 6. Retrieve Approved Database Learning Resources for missing skills
    const validSkillIds = gapAnalysis.gaps.map((g) => g.skillId).filter(Boolean) as string[];
    const resourceMap = await ResourceSelector.selectResourcesForSkills(validSkillIds);

    // 7. Assemble Ordered Learning Path Items
    let totalHours = 0;
    const itemsData = orderedSkills.map((node, index) => {
      const matchingGap = gapAnalysis.gaps.find((g) => g.skillName === node.skillName);
      const skillId = matchingGap?.skillId || null;
      const resource = skillId ? resourceMap.get(skillId) : null;
      const itemHours = resource ? resource.estimatedHours : 5.0;
      totalHours += itemHours;

      return {
        skillId,
        skillName: node.skillName,
        resourceId: resource?.id || null,
        sequence: index + 1,
        estimatedHours: itemHours,
        priority: (matchingGap?.priority || 'MEDIUM') as GapPriority,
        status: 'NOT_STARTED' as LearningItemStatus,
      };
    });

    // 8. Persist Learning Path & Items in Transaction
    const createdPath = await prisma.$transaction(async (tx) => {
      const path = await tx.learningPath.upsert({
        where: {
          candidateId_jobId: {
            candidateId: candidate.id,
            jobId: job.id,
          },
        },
        create: {
          candidateId: candidate.id,
          jobId: job.id,
          gapAnalysisId: gapAnalysis.id,
          status: 'ACTIVE' as LearningPathStatus,
          totalEstimatedHours: totalHours,
          completedHours: 0,
          progressPercentage: 0,
          readinessBefore: gapAnalysis.overallReadiness,
          readinessTarget: 100,
        },
        update: {
          totalEstimatedHours: totalHours,
          completedHours: 0,
          progressPercentage: 0,
          readinessBefore: gapAnalysis.overallReadiness,
          readinessTarget: 100,
          updatedAt: new Date(),
        },
      });

      // Clear previous items
      await tx.learningPathItem.deleteMany({
        where: { learningPathId: path.id },
      });

      // Insert new items
      for (const item of itemsData) {
        await tx.learningPathItem.create({
          data: {
            learningPathId: path.id,
            skillId: item.skillId,
            skillName: item.skillName,
            resourceId: item.resourceId,
            sequence: item.sequence,
            estimatedHours: item.estimatedHours,
            priority: item.priority,
            status: item.status,
          },
        });
      }

      return await tx.learningPath.findUnique({
        where: { id: path.id },
        include: {
          items: {
            include: { resource: true },
            orderBy: { sequence: 'asc' },
          },
        },
      });
    });

    return this.formatLearningPath(createdPath!);
  }

  /**
   * Updates progress status of an individual learning path item.
   * Candidate ownership validated to prevent IDOR.
   */
  static async updateItemProgress(
    candidateUserId: string,
    itemId: string,
    newStatus: LearningItemStatus
  ): Promise<LearningPathResponse> {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
    });

    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_NOT_FOUND');
    }

    const item = await prisma.learningPathItem.findUnique({
      where: { id: itemId },
      include: { learningPath: true },
    });

    if (!item) {
      throw new AppError('Learning path item not found', 404, 'ITEM_NOT_FOUND');
    }

    if (item.learningPath.candidateId !== candidate.id) {
      throw new AppError('Unauthorized access to this learning path item', 403, 'UNAUTHORIZED_ITEM_ACCESS');
    }

    // Update item status
    await prisma.learningPathItem.update({
      where: { id: itemId },
      data: {
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date() : null,
      },
    });

    // Recompute total completed hours & percentage
    const allItems = await prisma.learningPathItem.findMany({
      where: { learningPathId: item.learningPathId },
    });

    const totalItems = allItems.length;
    const completedItems = allItems.filter((i) => i.status === 'COMPLETED');
    const completedHours = completedItems.reduce((sum, i) => sum + i.estimatedHours, 0);
    const progressPercentage = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 10000) / 100 : 100;
    const isAllCompleted = totalItems > 0 && completedItems.length === totalItems;

    const updatedPath = await prisma.learningPath.update({
      where: { id: item.learningPathId },
      data: {
        completedHours,
        progressPercentage,
        status: isAllCompleted ? ('COMPLETED' as LearningPathStatus) : ('ACTIVE' as LearningPathStatus),
      },
      include: {
        items: {
          include: { resource: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return this.formatLearningPath(updatedPath);
  }

  /**
   * Formats database learning path to API response.
   */
  private static formatLearningPath(path: any): LearningPathResponse {
    return {
      id: path.id,
      candidateId: path.candidateId,
      jobId: path.jobId,
      gapAnalysisId: path.gapAnalysisId,
      status: path.status as LearningPathStatus,
      totalEstimatedHours: path.totalEstimatedHours,
      completedHours: path.completedHours,
      progressPercentage: path.progressPercentage,
      readinessBefore: path.readinessBefore,
      readinessTarget: path.readinessTarget,
      items: (path.items || []).map((i: any) => ({
        id: i.id,
        learningPathId: i.learningPathId,
        skillId: i.skillId,
        skillName: i.skillName,
        resourceId: i.resourceId,
        resource: i.resource
          ? {
              id: i.resource.id,
              title: i.resource.title,
              description: i.resource.description,
              provider: i.resource.provider,
              url: i.resource.url,
              skillId: i.resource.skillId,
              resourceType: i.resource.resourceType,
              difficulty: i.resource.difficulty,
              estimatedHours: i.resource.estimatedHours,
              isActive: i.resource.isActive,
            }
          : null,
        sequence: i.sequence,
        estimatedHours: i.estimatedHours,
        priority: i.priority as GapPriority,
        status: i.status as LearningItemStatus,
        completedAt: i.completedAt ? i.completedAt.toISOString() : null,
      })),
      createdAt: path.createdAt.toISOString(),
      updatedAt: path.updatedAt.toISOString(),
    };
  }
}
