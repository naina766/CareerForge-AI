import { prisma } from '@careerforge/database';
import {
  CareerAssistantResponse,
  CareerConversationItem,
  CareerMessageItem,
  RAGResponseStatus,
} from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';
import { QueryClassifier } from './query-classifier.js';
import { PromptGuard } from './prompt-guard.js';
import { RAGRetriever } from './rag-retriever.js';
import { ContextBuilder } from './context-builder.js';
import { ResponseValidator } from './response-validator.js';
import { CitationBuilder } from './citation-builder.js';
import { ConversationMemory } from './conversation-memory.js';
import { AIServiceClient } from '../../services/ai-client.js';
import { checkRateLimit } from '../../infrastructure/security/rate-limit.js';

export class CareerAssistantService {
  /**
   * Creates a new career conversation for the authenticated candidate.
   */
  static async createConversation(
    candidateUserId: string,
    title?: string
  ): Promise<CareerConversationItem> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    const conv = await prisma.careerConversation.create({
      data: {
        candidateId: candidate.id,
        title: title || 'Career Consultation',
        status: 'ACTIVE',
      },
    });

    return {
      id: conv.id,
      candidateId: conv.candidateId,
      title: conv.title,
      status: conv.status,
      messageCount: 0,
      lastMessageAt: conv.createdAt.toISOString(),
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: [],
    };
  }

  /**
   * Retrieves all conversations for the authenticated candidate.
   */
  static async getConversations(candidateUserId: string): Promise<CareerConversationItem[]> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    const convs = await prisma.careerConversation.findMany({
      where: {
        candidateId: candidate.id,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return convs.map((c) => ({
      id: c.id,
      candidateId: c.candidateId,
      title: c.title,
      status: c.status,
      messageCount: c._count.messages,
      lastMessageAt: c.messages[0]?.createdAt.toISOString() || c.createdAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves a single conversation with its complete message history and source citations.
   */
  static async getConversationById(
    candidateUserId: string,
    conversationId: string
  ): Promise<CareerConversationItem> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    const conv = await prisma.careerConversation.findFirst({
      where: {
        id: conversationId,
        candidateId: candidate.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sources: true },
        },
      },
    });

    if (!conv) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    return {
      id: conv.id,
      candidateId: conv.candidateId,
      title: conv.title,
      status: conv.status,
      messageCount: conv.messages.length,
      lastMessageAt: conv.messages[conv.messages.length - 1]?.createdAt.toISOString() || conv.createdAt.toISOString(),
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: conv.messages.map((m) => this.formatMessage(m)),
    };
  }

  /**
   * Deletes / archives a conversation.
   */
  static async deleteConversation(
    candidateUserId: string,
    conversationId: string
  ): Promise<{ success: boolean }> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    const conv = await prisma.careerConversation.findFirst({
      where: { id: conversationId, candidateId: candidate.id },
    });

    if (!conv) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    await prisma.careerConversation.delete({ where: { id: conv.id } });
    return { success: true };
  }

  /**
   * Submits user feedback (helpful / not helpful) on an AI response message.
   */
  static async submitFeedback(
    candidateUserId: string,
    messageId: string,
    isHelpful: boolean
  ): Promise<{ success: boolean }> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    const msg = await prisma.careerMessage.findFirst({
      where: {
        id: messageId,
        conversation: { candidateId: candidate.id },
      },
    });

    if (!msg) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    await prisma.careerMessage.update({
      where: { id: msg.id },
      data: { isHelpful },
    });

    return { success: true };
  }

  /**
   * Core RAG Chat Orchestration Pipeline.
   */
  static async sendMessage(
    candidateUserId: string,
    conversationId: string,
    userQuery: string,
    jobId?: string
  ): Promise<CareerAssistantResponse> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    // 1. Rate Limiting Check (15 messages/minute)
    await this.enforceRateLimit(candidate.id);

    // 2. Candidate-Isolated Conversation Verification
    const conv = await prisma.careerConversation.findFirst({
      where: { id: conversationId, candidateId: candidate.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
      },
    });

    if (!conv) {
      throw new AppError('Conversation not found or unauthorized', 404, 'CONVERSATION_NOT_FOUND');
    }

    const query = userQuery.trim();
    if (!query) {
      throw new AppError('Message content cannot be empty', 400, 'EMPTY_MESSAGE');
    }

    const startTime = Date.now();

    // 3. Security Pre-Check: Prompt Injection Defense
    const securityCheck = PromptGuard.evaluate(query);
    if (!securityCheck.isSafe) {
      const blockedAnswer =
        securityCheck.blockedReason ||
        'I cannot fulfill requests that attempt to override security rules or access restricted information.';

      // Persist User & Blocked Assistant Messages
      const result = await prisma.$transaction(async (tx) => {
        await tx.careerMessage.create({
          data: {
            conversationId: conv.id,
            role: 'USER',
            content: query,
          },
        });

        const assistantMsg = await tx.careerMessage.create({
          data: {
            conversationId: conv.id,
            role: 'ASSISTANT',
            content: blockedAnswer,
            responseStatus: 'BLOCKED',
          },
        });

        await tx.careerConversation.update({
          where: { id: conv.id },
          data: { updatedAt: new Date() },
        });

        return assistantMsg;
      });

      return {
        messageId: result.id,
        conversationId: conv.id,
        answer: blockedAnswer,
        status: 'BLOCKED',
        sources: [],
        confidence: 1.0,
      };
    }

    // 4. Intent Classification
    const intent = QueryClassifier.classify(query);

    // 5. Candidate-Isolated Multi-Source Context Retrieval
    const retrievedContext = await RAGRetriever.retrieve(candidate.id, query, intent, jobId);

    // 6. Memory Summarization & Prompt Envelope
    const memorySummary = ConversationMemory.summarizeRecentMessages(conv.messages.reverse());
    const promptEnvelope = ContextBuilder.buildPromptEnvelope(query, retrievedContext, memorySummary);

    // 7. FastAPI AI Service Execution with Local Fallback
    let rawAnswer = '';
    let responseStatus: RAGResponseStatus = 'SUCCESS';
    let modelName = 'careerforge-grounded-rag-v1';

    try {
      const aiResponse = await AIServiceClient.generateRAGResponse({
        query,
        intent,
        candidate_profile: retrievedContext.candidateProfile,
        context_documents: promptEnvelope.contextPayload,
        recent_history: conv.messages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (aiResponse && aiResponse.answer) {
        rawAnswer = aiResponse.answer;
        responseStatus = (aiResponse.status as RAGResponseStatus) || 'SUCCESS';
        modelName = aiResponse.model || modelName;
      } else {
        // Deterministic Grounded Generator
        const fb = this.generateFallbackAnswer(query, retrievedContext);
        rawAnswer = fb.answer;
        responseStatus = fb.status;
      }
    } catch {
      const fb = this.generateFallbackAnswer(query, retrievedContext);
      rawAnswer = fb.answer;
      responseStatus = fb.status;
    }

    // 8. Grounding & Hallucination Validation
    const validation = ResponseValidator.validate(rawAnswer, retrievedContext);
    const finalAnswer = validation.validatedAnswer;
    const finalStatus = validation.status !== 'SUCCESS' ? validation.status : responseStatus;

    // 9. Structured Citation Synthesis
    const citations = CitationBuilder.buildCitations(retrievedContext.sources);

    const latencyMs = Date.now() - startTime;

    // 10. PostgreSQL Transactional Persistence
    const savedAssistantMsg = await prisma.$transaction(async (tx) => {
      // Create user message
      await tx.careerMessage.create({
        data: {
          conversationId: conv.id,
          role: 'USER',
          content: query,
        },
      });

      // Create assistant message with sources
      const assistantMsg = await tx.careerMessage.create({
        data: {
          conversationId: conv.id,
          role: 'ASSISTANT',
          content: finalAnswer,
          responseStatus: finalStatus,
          sources: {
            create: citations.map((c) => ({
              sourceType: c.sourceType,
              sourceId: c.sourceId,
              title: c.title,
              snippet: c.snippet,
              relevance: c.relevance,
            })),
          },
        },
        include: { sources: true },
      });

      // Update conversation title if first message
      const isFirst = conv.messages.length === 0;
      const autoTitle = isFirst ? query.slice(0, 35) + (query.length > 35 ? '...' : '') : undefined;

      await tx.careerConversation.update({
        where: { id: conv.id },
        data: {
          updatedAt: new Date(),
          ...(autoTitle ? { title: autoTitle } : {}),
        },
      });

      // Record AI Usage Observability
      await tx.aIUsage.create({
        data: {
          userId: candidateUserId,
          operation: 'CAREER_ASSISTANT_RAG',
          model: modelName,
          inputTokens: Math.round(promptEnvelope.userPrompt.length / 4),
          outputTokens: Math.round(finalAnswer.length / 4),
          totalTokens: Math.round((promptEnvelope.userPrompt.length + finalAnswer.length) / 4),
          latencyMs,
          estimatedCost: 0.0005,
        },
      });

      return assistantMsg;
    });

    return {
      messageId: savedAssistantMsg.id,
      conversationId: conv.id,
      answer: finalAnswer,
      status: finalStatus,
      sources: citations,
      confidence: 0.95,
      usage: {
        model: modelName,
        promptTokens: Math.round(promptEnvelope.userPrompt.length / 4),
        completionTokens: Math.round(finalAnswer.length / 4),
        totalTokens: Math.round((promptEnvelope.userPrompt.length + finalAnswer.length) / 4),
        latencyMs,
      },
    };
  }

  /**
   * Deterministic local fallback generator if FastAPI AI service is offline.
   */
  private static generateFallbackAnswer(
    query: string,
    context: any
  ): { answer: string; status: RAGResponseStatus } {
    const q = query.toLowerCase();

    // Speculative / unanswerable intent handling
    const speculativePhrases = [
      'will i get selected',
      'guarantee an offer',
      'guaranteed an offer',
      'predict if i get hired',
      'what is the interviewer thinking',
    ];
    if (speculativePhrases.some((sp) => q.includes(sp))) {
      return {
        answer:
          'I cannot reliably predict hiring outcomes or internal interview decisions. I can, however, evaluate your current profile against the job description to identify skill overlaps, match scores, and learning priorities.',
        status: 'INSUFFICIENT_CONTEXT',
      };
    }

    // Skill gaps fallback
    const gapDoc = context.sources.find((s: any) => s.sourceType === 'SKILL_GAP');
    if ((q.includes('gap') || q.includes('missing') || q.includes('skill')) && gapDoc) {
      return {
        answer: `Based on your CareerForge profile and latest gap analysis: ${gapDoc.snippet}`,
        status: 'SUCCESS',
      };
    }

    // Learning roadmap fallback
    const learnDoc = context.sources.find((s: any) => s.sourceType === 'LEARNING_PATH');
    if ((q.includes('learn') || q.includes('roadmap') || q.includes('course')) && learnDoc) {
      return {
        answer: `According to your sequential learning path: ${learnDoc.snippet}`,
        status: 'SUCCESS',
      };
    }

    // Match fallback
    const matchDoc = context.sources.find((s: any) => s.sourceType === 'JOB');
    if ((q.includes('match') || q.includes('ready') || q.includes('score')) && matchDoc) {
      return {
        answer: `Based on your match evaluation: ${matchDoc.snippet}`,
        status: 'SUCCESS',
      };
    }

    // Generic Profile fallback
    return {
      answer: `Based on your verified CareerForge profile with skills (${
        context.candidateProfile.skills.join(', ') || 'verified skills'
      }): your career data is ready for role evaluations and learning paths.`,
      status: 'SUCCESS',
    };
  }

  /**
   * Rate Limiter Helper (15 requests/minute per candidate).
   */
  private static async enforceRateLimit(candidateId: string): Promise<void> {
    const { allowed, resetTime } = await checkRateLimit(candidateId, {
      prefix: 'assistant_candidate',
      windowMs: 60 * 1000,
      maxRequests: 15,
    });

    if (!allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
      throw new AppError(
        `Rate limit exceeded. Please wait ${retryAfterSeconds} seconds before sending another message.`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  /**
   * Analyzes candidate skill gaps against a target role using real FastEmbed and FAISS grounding.
   */
  static async analyzeSkillGap(
    candidateUserId: string,
    targetRole?: string
  ): Promise<any> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    // Fetch candidate verified skills from database
    const candidateSkills = await prisma.candidateSkill.findMany({
      where: { candidateId: candidate.id },
      include: { skill: true },
    });

    const skillNames = candidateSkills.map((cs) => cs.skill.name);
    const roleToAnalyze = targetRole || candidate.headline || 'Software Engineer';

    return await AIServiceClient.analyzeSkillGap({
      target_role: roleToAnalyze,
      candidate_skills: skillNames,
      top_k: 5,
    });
  }

  /**
   * Generates grounded career role recommendations matching candidate trajectory.
   */
  static async recommendRoles(
    candidateUserId: string,
    desiredRoles?: string[]
  ): Promise<any> {
    const candidate = await this.getCandidateProfile(candidateUserId);

    const candidateSkills = await prisma.candidateSkill.findMany({
      where: { candidateId: candidate.id },
      include: { skill: true },
    });

    const skillNames = candidateSkills.map((cs) => cs.skill.name);

    return await AIServiceClient.recommendCareerRoles({
      candidate_skills: skillNames,
      experience_years: candidate.experienceYears || 0,
      desired_roles: desiredRoles || (candidate.headline ? [candidate.headline] : undefined),
    });
  }

  /**
   * Generates a step-by-step learning roadmap for closing verified skill gaps.
   */
  static async generateLearningRoadmap(
    candidateUserId: string,
    targetRole?: string,
    skillGaps?: string[]
  ): Promise<any> {
    const candidate = await this.getCandidateProfile(candidateUserId);
    const role = targetRole || candidate.headline || 'Software Engineer';

    let gaps = skillGaps;
    if (!gaps || gaps.length === 0) {
      const gapAnalysis = await this.analyzeSkillGap(candidateUserId, role);
      gaps = gapAnalysis.missing_skills || [];
    }

    return await AIServiceClient.generateLearningRoadmap({
      target_role: role,
      skill_gaps: gaps || [],
    });
  }

  private static async getCandidateProfile(userId: string) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_NOT_FOUND');
    }

    return candidate;
  }

  private static formatMessage(m: any): CareerMessageItem {
    return {
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      responseStatus: m.responseStatus,
      isHelpful: m.isHelpful,
      sources: (m.sources || []).map((s: any) => ({
        id: s.id,
        sourceType: s.sourceType,
        sourceId: s.sourceId,
        title: s.title,
        snippet: s.snippet,
        relevance: s.relevance,
      })),
      createdAt: m.createdAt.toISOString(),
    };
  }
}
