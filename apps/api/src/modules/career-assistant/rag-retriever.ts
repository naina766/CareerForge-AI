import { prisma } from '@careerforge/database';
import { RAGSource } from '@careerforge/types';
import { QueryIntent, RetrievedContext } from './types.js';
import { AIServiceClient } from '../../services/ai-client.js';

export class RAGRetriever {
  /**
   * Retrieves candidate-isolated structured records from PostgreSQL and semantic chunks from FAISS.
   */
  static async retrieve(
    candidateId: string,
    query: string,
    intent: QueryIntent,
    jobId?: string
  ): Promise<RetrievedContext> {
    // 1. Candidate Core Profile & Skills (Authoritative Source of Truth)
    const candidate = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: 'desc' }, take: 3 },
        preferences: true,
        resumes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!candidate) {
      throw new Error('Candidate profile not found');
    }

    const candidateSkillNames = candidate.skills.map((s) => s.skill.name);
    const activeResume = candidate.resumes?.[0];

    const sources: RAGSource[] = [];
    const rawContextBlocks: string[] = [];

    // Base Profile Context
    const profileSummary = `Candidate: ${candidate.name || 'Anonymous'}. Experience: ${
      candidate.experienceYears ?? 0
    } years. Verified Skills: ${candidateSkillNames.join(', ') || 'None'}.`;
    sources.push({
      sourceType: 'PROFILE',
      sourceId: candidate.id,
      title: 'Verified Candidate Profile',
      snippet: profileSummary,
      relevance: 1.0,
    });
    rawContextBlocks.push(`[PROFILE]: ${profileSummary}`);

    // 2. Intent-Targeted Data Retrieval

    // A. Skill Gap & Learning Retrieval
    if (intent === 'SKILL_GAP' || intent === 'LEARNING' || intent === 'MULTI_CONTEXT') {
      const gapAnalysis = await prisma.skillGapAnalysis.findFirst({
        where: {
          candidateId: candidate.id,
          ...(jobId ? { jobId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          gaps: { orderBy: { priorityScore: 'desc' }, take: 5 },
          job: { select: { title: true, companyName: true } },
        },
      });

      if (gapAnalysis) {
        const gapList = gapAnalysis.gaps
          .map((g) => `${g.skillName} (${g.priority} priority - ${g.reason || 'Required'})`)
          .join(', ');
        const gapSnippet = `Target Role: ${gapAnalysis.job?.title || 'Evaluated Job'}. Readiness: ${
          gapAnalysis.overallReadiness
        }%. Missing / Gaps: ${gapList || 'None'}.`;

        sources.push({
          sourceType: 'SKILL_GAP',
          sourceId: gapAnalysis.id,
          title: `Skill Gap Analysis (${gapAnalysis.job?.title || 'Latest'})`,
          snippet: gapSnippet,
          relevance: 0.95,
        });
        rawContextBlocks.push(`[SKILL_GAP]: ${gapSnippet}`);
      }

      // Learning Path Roadmap
      const learningPath = await prisma.learningPath.findFirst({
        where: {
          candidateId: candidate.id,
          ...(jobId ? { jobId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          items: {
            orderBy: { sequence: 'asc' },
            take: 4,
            include: { resource: true },
          },
        },
      });

      if (learningPath && learningPath.items.length > 0) {
        const stepList = learningPath.items
          .map(
            (item) =>
              `Step ${item.sequence}: ${item.skillName} using '${
                item.resource?.title || 'Official Documentation'
              }' (${item.estimatedHours}h, Status: ${item.status})`
          )
          .join('; ');
        const pathSnippet = `Learning Path: ${learningPath.progressPercentage}% complete. Roadmap: ${stepList}.`;

        sources.push({
          sourceType: 'LEARNING_PATH',
          sourceId: learningPath.id,
          title: 'Personalized Learning Roadmap',
          snippet: pathSnippet,
          relevance: 0.95,
        });
        rawContextBlocks.push(`[LEARNING_PATH]: ${pathSnippet}`);
      }
    }

    // B. Match Report Retrieval
    if (intent === 'MATCH' || intent === 'JOB' || intent === 'MULTI_CONTEXT') {
      const matchReport = await prisma.matchReport.findFirst({
        where: {
          candidateId: candidate.id,
          ...(jobId ? { jobId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          job: { select: { id: true, title: true, companyName: true, location: true, workMode: true } },
        },
      });

      if (matchReport) {
        const matchSnippet = `Evaluated Job: ${matchReport.job.title} at ${
          matchReport.job.companyName || 'Company'
        }. Match Score: ${matchReport.overallScore}% (${matchReport.matchLevel}). Matched Skills: ${(
          matchReport.matchedSkills as string[]
        ).join(', ')}. Missing Required: ${(matchReport.missingRequiredSkills as string[]).join(', ') || 'None'}. Recommendation: ${
          matchReport.recommendation
        }.`;

        sources.push({
          sourceType: 'JOB',
          sourceId: matchReport.job.id,
          title: `Job Match (${matchReport.job.title})`,
          snippet: matchSnippet,
          relevance: 0.95,
        });
        rawContextBlocks.push(`[MATCH_REPORT]: ${matchSnippet}`);
      }
    }

    // C. Application History Retrieval
    if (intent === 'APPLICATION' || intent === 'MULTI_CONTEXT') {
      const applications = await prisma.application.findMany({
        where: { candidateId: candidate.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          job: { select: { title: true, companyName: true } },
        },
      });

      if (applications.length > 0) {
        const appList = applications
          .map((a) => `${a.job.title} at ${a.job.companyName} [Stage: ${a.status}]`)
          .join('; ');
        const appSnippet = `Submitted Applications (${applications.length}): ${appList}.`;

        sources.push({
          sourceType: 'APPLICATION',
          sourceId: applications[0].id,
          title: 'Candidate Applications',
          snippet: appSnippet,
          relevance: 0.9,
        });
        rawContextBlocks.push(`[APPLICATIONS]: ${appSnippet}`);
      }
    }

    // D. FAISS Resume Vector Semantic Retrieval
    if (activeResume && (intent === 'RESUME' || intent === 'PROFILE' || intent === 'GENERAL_CAREER' || intent === 'MULTI_CONTEXT')) {
      try {
        const searchResult = await AIServiceClient.searchVectors(query, 3, activeResume.id);
        if (searchResult && searchResult.results && searchResult.results.length > 0) {
          for (const res of searchResult.results) {
            const snippetText = res.text || res.content || `Resume section match: ${res.section_type || 'Experience'}`;
            sources.push({
              sourceType: 'RESUME',
              sourceId: activeResume.id,
              title: `Resume Chunk (${res.section_type || 'Experience'})`,
              snippet: snippetText.slice(0, 300),
              relevance: res.similarity_score || 0.85,
            });
            rawContextBlocks.push(`[RESUME_CHUNK]: ${snippetText}`);
          }
        }
      } catch (err: any) {
        // Safe graceful fallback if FAISS is offline
      }
    }

    return {
      intent,
      candidateProfile: {
        name: candidate.name || 'Candidate',
        headline: candidate.headline,
        location: candidate.location,
        experienceYears: candidate.experienceYears,
        skills: candidateSkillNames,
        preferences: candidate.preferences,
      },
      sources,
      rawContextBlocks,
    };
  }
}
