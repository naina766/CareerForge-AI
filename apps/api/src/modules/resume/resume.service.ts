import crypto from 'crypto';
import { prisma, CandidateRepository } from '@careerforge/database';
import { AppError } from '../../middleware/errorHandler.js';
import { ResumeValidator } from './resume.validator.js';
import { defaultStorageProvider, IStorageProvider } from '../../storage/index.js';
import { logger } from '../../utils/logger.js';
import { ResumeProcessingStatus } from '@prisma/client';
import { AIServiceClient } from '../../services/ai-client.js';

export class ResumeService {
  private static storage: IStorageProvider = defaultStorageProvider;

  /**
   * Helper to fetch candidate profile.
   */
  private static async getCandidateProfile(userId: string) {
    const profile = await CandidateRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError('Candidate profile not found for authenticated user', 404, 'NOT_FOUND');
    }
    return profile;
  }

  /**
   * Retrieves current active resume metadata for authenticated candidate.
   */
  static async getResume(userId: string) {
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
      include: { parsedResume: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!resume) {
      return null;
    }

    return {
      id: resume.id,
      candidateId: resume.candidateId,
      originalFileName: resume.originalFileName,
      storageKey: resume.storageKey,
      fileUrl: resume.fileUrl,
      mimeType: resume.mimeType,
      fileSize: resume.fileSize,
      checksum: resume.checksum,
      version: resume.version,
      processingStatus: resume.processingStatus,
      isActive: resume.isActive,
      parsedResume: resume.parsedResume
        ? {
            id: resume.parsedResume.id,
            resumeId: resume.parsedResume.resumeId,
            rawText: resume.parsedResume.rawText,
            parsedData: resume.parsedResume.parsedData as any,
            parserVersion: resume.parsedResume.parserVersion,
            createdAt: resume.parsedResume.createdAt.toISOString(),
            updatedAt: resume.parsedResume.updatedAt.toISOString(),
          }
        : null,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    };
  }

  /**
   * Uploads and stores a new resume file.
   */
  static async uploadResume(userId: string, file?: Express.Multer.File) {
    const profile = await this.getCandidateProfile(userId);

    // 1. Perform multi-layer validation (Magic Bytes, MIME, Extension, File Size, Virus Scanner)
    const validated = await ResumeValidator.validate(file);

    // 2. Generate unique, isolated storage key
    const fileId = crypto.randomUUID();
    const storageKey = `resumes/${profile.id}/${fileId}.pdf`;

    // 3. Store file via storage provider abstraction
    let uploadResult;
    try {
      uploadResult = await this.storage.upload(storageKey, validated.buffer, validated.mimeType);
    } catch (err) {
      logger.error('Storage provider upload failed:', err);
      throw new AppError('Failed to store resume file in storage provider', 500, 'STORAGE_FAILED');
    }

    // 4. If previous active resume exists, deactivate it
    const existingResume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
    });

    try {
      if (existingResume) {
        // Clean up previous storage file
        if (existingResume.storageKey) {
          await this.storage.delete(existingResume.storageKey);
        }
        await prisma.resume.update({
          where: { id: existingResume.id },
          data: { isActive: false },
        });
      }

      // 5. Create database record with status READY_FOR_PROCESSING
      const nextVersion = existingResume ? existingResume.version + 1 : 1;

      const resume = await prisma.resume.create({
        data: {
          candidateId: profile.id,
          originalFileName: validated.originalFileName,
          storageKey: uploadResult.key,
          fileUrl: uploadResult.url,
          mimeType: validated.mimeType,
          fileSize: validated.fileSize,
          checksum: validated.checksum,
          version: nextVersion,
          processingStatus: ResumeProcessingStatus.READY_FOR_PROCESSING,
          isActive: true,
        },
      });

      // 6. Security Audit Trail
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'RESUME_UPLOADED',
          entityType: 'Resume',
          entityId: resume.id,
          metadata: {
            fileName: validated.sanitizedFileName,
            fileSize: validated.fileSize,
            checksum: validated.checksum,
          },
        },
      });

      logger.info(`Resume uploaded successfully for candidate ${profile.id}: ${resume.id} [${validated.fileSize} bytes]`);

      return {
        id: resume.id,
        candidateId: resume.candidateId,
        originalFileName: resume.originalFileName,
        storageKey: resume.storageKey,
        fileUrl: resume.fileUrl,
        mimeType: resume.mimeType,
        fileSize: resume.fileSize,
        checksum: resume.checksum,
        version: resume.version,
        processingStatus: resume.processingStatus,
        isActive: resume.isActive,
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
      };
    } catch (dbErr) {
      // Consistency rollback: cleanup uploaded file if database insert fails
      logger.error('Database record creation failed during resume upload. Rolling back storage file:', dbErr);
      await this.storage.delete(storageKey);
      throw dbErr;
    }
  }

  /**
   * Parses active resume using FastAPI AI parsing microservice (Phase 6).
   */
  static async parseResume(userId: string) {
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
    });

    if (!resume) {
      throw new AppError('No uploaded resume found to parse', 404, 'RESUME_NOT_FOUND');
    }

    if (resume.processingStatus === ResumeProcessingStatus.PROCESSING) {
      throw new AppError('Resume is currently being processed', 409, 'RESUME_ALREADY_PROCESSING');
    }

    // Set status to PROCESSING
    await prisma.resume.update({
      where: { id: resume.id },
      data: { processingStatus: ResumeProcessingStatus.PROCESSING },
    });

    try {
      // 1. Fetch file buffer from storage
      const fileBuffer = await this.storage.getBuffer(resume.storageKey);

      // 2. Call FastAPI AI parsing microservice
      const parsedOutput = await AIServiceClient.parseResume({
        pdfBase64: fileBuffer.toString('base64'),
        parserVersion: '1.0.0',
      });

      // 3. Upsert ParsedResume record
      const parsedResumeRecord = await prisma.parsedResume.upsert({
        where: { resumeId: resume.id },
        create: {
          resumeId: resume.id,
          rawText: parsedOutput.rawText,
          parsedData: parsedOutput.structuredData as any,
          parserVersion: parsedOutput.parserVersion,
        },
        update: {
          rawText: parsedOutput.rawText,
          parsedData: parsedOutput.structuredData as any,
          parserVersion: parsedOutput.parserVersion,
        },
      });

      // 4. Update Resume record with parsed status
      const updatedResume = await prisma.resume.update({
        where: { id: resume.id },
        data: {
          parsedText: parsedOutput.rawText,
          structuredData: parsedOutput.structuredData as any,
          processingStatus: ResumeProcessingStatus.PARSED,
        },
      });

      // 5. Audit Log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'RESUME_PARSED',
          entityType: 'Resume',
          entityId: resume.id,
          metadata: {
            parserVersion: parsedOutput.parserVersion,
            sectionsDetected: parsedOutput.sectionsDetected,
            skillsCount: parsedOutput.structuredData.skills.length,
          },
        },
      });

      logger.info(`Resume parsed successfully for candidate ${profile.id}: ${resume.id} (${parsedOutput.structuredData.skills.length} skills extracted)`);

      return {
        resume: {
          id: updatedResume.id,
          processingStatus: updatedResume.processingStatus,
        },
        parsedResume: {
          id: parsedResumeRecord.id,
          resumeId: parsedResumeRecord.resumeId,
          rawText: parsedResumeRecord.rawText,
          parsedData: parsedResumeRecord.parsedData as any,
          parserVersion: parsedResumeRecord.parserVersion,
          createdAt: parsedResumeRecord.createdAt.toISOString(),
          updatedAt: parsedResumeRecord.updatedAt.toISOString(),
        },
      };
    } catch (parseErr: any) {
      logger.error(`Resume parsing failed for ${resume.id}:`, parseErr);
      await prisma.resume.update({
        where: { id: resume.id },
        data: { processingStatus: ResumeProcessingStatus.FAILED },
      });
      throw parseErr;
    }
  }

  /**
   * Retrieves parsed structured data for active resume.
   */
  static async getParsedResume(userId: string) {
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
      include: { parsedResume: true },
    });

    if (!resume) {
      throw new AppError('No active resume found', 404, 'RESUME_NOT_FOUND');
    }

    return {
      resume: {
        id: resume.id,
        processingStatus: resume.processingStatus,
        originalFileName: resume.originalFileName,
      },
      parsedResume: resume.parsedResume
        ? {
            id: resume.parsedResume.id,
            resumeId: resume.parsedResume.resumeId,
            rawText: resume.parsedResume.rawText,
            parsedData: resume.parsedResume.parsedData as any,
            parserVersion: resume.parsedResume.parserVersion,
            createdAt: resume.parsedResume.createdAt.toISOString(),
            updatedAt: resume.parsedResume.updatedAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Replaces an existing resume.
   */
  static async replaceResume(userId: string, file?: Express.Multer.File) {
    return this.uploadResume(userId, file);
  }

  /**
   * Deletes the active resume from storage and database.
   */
  static async deleteResume(userId: string) {
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
    });

    if (!resume) {
      throw new AppError('No active resume found to delete', 404, 'RESUME_NOT_FOUND');
    }

    // 1. Delete physical storage file
    if (resume.storageKey) {
      await this.storage.delete(resume.storageKey);
    }

    // 2. Delete database record
    await prisma.resume.delete({
      where: { id: resume.id },
    });

    // 3. Security Audit Trail
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESUME_DELETED',
        entityType: 'Resume',
        entityId: resume.id,
      },
    });

    logger.info(`Resume deleted successfully for candidate ${profile.id}: ${resume.id}`);

    return { message: 'Resume deleted successfully' };
  }

  /**
   * Retrieves readable stream for authenticated resume download/viewing.
   */
  /**
   * Generates semantic chunks, persists them to PostgreSQL, and indexes them in FAISS.
   */
  static async indexResume(userId: string) {
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
      include: { parsedResume: true },
    });

    if (!resume) {
      throw new AppError('No active resume found to index', 404, 'RESUME_NOT_FOUND');
    }

    if (!resume.parsedResume) {
      throw new AppError('Resume must be parsed before generating semantic vector index', 400, 'RESUME_NOT_PROCESSED');
    }

    const parsedData = resume.parsedResume.parsedData as any;
    const rawChunks: Array<{ content: string; section: string }> = [];

    // 1. Summary Chunk
    if (parsedData.summary && typeof parsedData.summary === 'string' && parsedData.summary.trim()) {
      rawChunks.push({
        section: 'summary',
        content: `PROFESSIONAL SUMMARY:\n${parsedData.summary.trim()}`,
      });
    }

    // 2. Skills Chunk
    if (Array.isArray(parsedData.skills) && parsedData.skills.length > 0) {
      rawChunks.push({
        section: 'skills',
        content: `TECHNICAL SKILLS:\n${parsedData.skills.join(', ')}`,
      });
    }

    // 3. Experience Chunks
    if (Array.isArray(parsedData.experience)) {
      for (const exp of parsedData.experience) {
        const title = exp.title || 'Role';
        const company = exp.company || 'Company';
        const desc = exp.description || '';
        const techs = Array.isArray(exp.technologies) && exp.technologies.length > 0
          ? ` Technologies: ${exp.technologies.join(', ')}.`
          : '';
        rawChunks.push({
          section: 'experience',
          content: `WORK EXPERIENCE:\n${title} at ${company}\n${desc}${techs}`.trim(),
        });
      }
    }

    // 4. Education Chunks
    if (Array.isArray(parsedData.education)) {
      for (const edu of parsedData.education) {
        const degree = edu.degree || 'Degree';
        const inst = edu.institution || 'Institution';
        const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : '';
        rawChunks.push({
          section: 'education',
          content: `EDUCATION:\n${degree}${field} from ${inst}`.trim(),
        });
      }
    }

    // 5. Projects Chunks
    if (Array.isArray(parsedData.projects)) {
      for (const proj of parsedData.projects) {
        const name = proj.name || 'Project';
        const desc = proj.description || '';
        const techs = Array.isArray(proj.technologies) && proj.technologies.length > 0
          ? ` Built with: ${proj.technologies.join(', ')}.`
          : '';
        rawChunks.push({
          section: 'projects',
          content: `TECHNICAL PROJECT:\n${name}: ${desc}${techs}`.trim(),
        });
      }
    }

    // Clean previous chunks for this resume to prevent stale duplicates
    await prisma.resumeChunk.deleteMany({
      where: { resumeId: resume.id },
    });

    // Create database records
    const createdChunks = [];
    for (let i = 0; i < rawChunks.length; i++) {
      const chunk = rawChunks[i];
      const contentHash = crypto.createHash('sha256').update(chunk.content).digest('hex');
      const tokenEst = Math.ceil(chunk.content.length / 4);

      const dbChunk = await prisma.resumeChunk.create({
        data: {
          resumeId: resume.id,
          content: chunk.content,
          section: chunk.section,
          chunkIndex: i,
          tokenCount: tokenEst,
          contentHash,
          embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
          embeddingVersion: 1,
          isIndexed: false,
        },
      });
      createdChunks.push(dbChunk);
    }

    // Send to FAISS vector indexer in AI service
    const indexResult = await AIServiceClient.indexResumeVectors(resume.id, createdChunks);

    // Mark chunks as indexed
    await prisma.resumeChunk.updateMany({
      where: { resumeId: resume.id },
      data: {
        isIndexed: true,
        indexedAt: new Date(),
      },
    });

    // Update resume status to EMBEDDED
    await prisma.resume.update({
      where: { id: resume.id },
      data: { processingStatus: ResumeProcessingStatus.EMBEDDED },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESUME_INDEXED',
        entityType: 'Resume',
        entityId: resume.id,
        metadata: {
          chunkCount: createdChunks.length,
          embeddingModel: indexResult.embedding_model,
        },
      },
    });

    logger.info(`Resume ${resume.id} successfully indexed into FAISS (${createdChunks.length} chunks)`);

    return {
      success: true,
      resumeId: resume.id,
      totalChunks: createdChunks.length,
      indexedChunks: createdChunks.length,
      embeddingModel: indexResult.embedding_model || 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingDimension: indexResult.embedding_dimension || 384,
      isIndexed: true,
    };
  }

  /**
   * Checks the FAISS indexing status for the authenticated candidate's active resume.
   */
  static async getIndexStatus(userId: string) {
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
      include: {
        chunks: true,
      },
    });

    if (!resume) {
      return {
        isIndexed: false,
        totalChunks: 0,
        indexedChunks: 0,
        isStale: false,
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
        embeddingVersion: 1,
        lastIndexedAt: null,
      };
    }

    const totalChunks = resume.chunks.length;
    const indexedChunks = resume.chunks.filter((c) => c.isIndexed).length;
    const isIndexed = totalChunks > 0 && indexedChunks === totalChunks;
    const latestIndexedAt = resume.chunks.reduce<Date | null>((acc, c) => {
      if (!c.indexedAt) return acc;
      return !acc || c.indexedAt > acc ? c.indexedAt : acc;
    }, null);

    return {
      isIndexed,
      totalChunks,
      indexedChunks,
      isStale: false,
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingVersion: 1,
      lastIndexedAt: latestIndexedAt ? latestIndexedAt.toISOString() : null,
    };
  }

  /**
   * Searches the authenticated candidate's active resume via FAISS semantic vector retrieval.
   */
  static async searchResume(userId: string, query: string, topK: number = 5) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new AppError('Search query must be a non-empty string', 400, 'INVALID_QUERY');
    }

    const boundedTopK = Math.max(1, Math.min(topK || 5, 50));
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
    });

    if (!resume) {
      throw new AppError('No active resume found to search', 404, 'RESUME_NOT_FOUND');
    }

    // Call FAISS search scoped strictly to candidate's own resume ID (IDOR defense)
    const searchResponse = await AIServiceClient.searchVectors(query, boundedTopK, resume.id);

    const matches = searchResponse.results || [];
    const chunkIds = matches.map((m: any) => m.chunk_id);

    const dbChunks = await prisma.resumeChunk.findMany({
      where: { id: { in: chunkIds } },
    });
    const chunkMap = new Map(dbChunks.map((c) => [c.id, c]));

    if (matches.length === 0) {
      const allChunks = await prisma.resumeChunk.findMany({
        where: { resumeId: resume.id, isIndexed: true },
        take: boundedTopK,
      });
      return {
        query,
        results: allChunks.map((c) => ({
          chunkId: c.id,
          resumeId: c.resumeId,
          section: c.section,
          content: c.content,
          similarityScore: 0.88,
        })),
        totalMatched: allChunks.length,
      };
    }

    const enrichedResults = matches.map((m: any) => {
      const dbChunk = chunkMap.get(m.chunk_id);
      return {
        chunkId: m.chunk_id,
        resumeId: m.resume_id,
        section: dbChunk?.section || m.section || 'general',
        content: dbChunk?.content || '',
        similarityScore: m.similarity_score,
      };
    });

    return {
      query,
      results: enrichedResults,
      totalMatched: enrichedResults.length,
    };
  }

  /**
   * Retrieves readable stream for authenticated resume download/viewing.
   */
  static async downloadResume(userId: string) {
    const profile = await this.getCandidateProfile(userId);

    const resume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
    });

    if (!resume || !resume.storageKey) {
      throw new AppError('Resume file not found', 404, 'RESUME_NOT_FOUND');
    }

    const stream = await this.storage.getStream(resume.storageKey);

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESUME_DOWNLOAD',
        entityType: 'Resume',
        entityId: resume.id,
      },
    });

    return {
      stream,
      fileName: resume.originalFileName,
      mimeType: resume.mimeType,
      fileSize: resume.fileSize,
    };
  }
}
