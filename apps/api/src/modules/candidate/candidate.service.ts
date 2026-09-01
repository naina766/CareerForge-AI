import { prisma, CandidateRepository } from '@careerforge/database';
import { AppError } from '../../middleware/errorHandler.js';
import {
  UpdateProfileDto,
  AddSkillDto,
  UpdateSkillDto,
  CreateExperienceDto,
  UpdateExperienceDto,
  CreateEducationDto,
  UpdateEducationDto,
  UpdateCareerPreferenceDto,
} from './candidate.types.js';
import { calculateProfileCompleteness } from './candidate.utils.js';
import { SkillCategory, SkillProficiency, WorkMode, EmploymentType } from '@prisma/client';
import { SkillService } from '../skill/skill.service.js';

export class CandidateService {
  /**
   * Helper to fetch or initialize the candidate profile for the authenticated user.
   */
  private static async getOrCreateProfile(userId: string) {
    let profile = await CandidateRepository.findByUserId(userId);
    if (!profile) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('Authenticated user not found', 404, 'NOT_FOUND');
      }

      profile = await prisma.candidateProfile.create({
        data: {
          userId,
          name: user.email.split('@')[0] || 'Candidate',
        },
        include: {
          skills: { include: { skill: true } },
          experiences: true,
          educations: true,
          preferences: true,
        },
      });
    }
    return profile;
  }

  /**
   * Retrieves full candidate profile with skills, experience, education, preferences, and completeness.
   */
  static async getProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const completeness = calculateProfileCompleteness(profile);

    return {
      profile,
      completeness,
    };
  }

  /**
   * Retrieves summary with completeness score, section counts, and active resume.
   */
  static async getProfileSummary(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const completeness = calculateProfileCompleteness(profile);

    const activeResume = await prisma.resume.findFirst({
      where: { candidateId: profile.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      profile,
      completeness,
      skillsCount: profile.skills.length,
      experiencesCount: profile.experiences.length,
      educationsCount: profile.educations.length,
      hasPreferences: !!profile.preferences,
      resume: activeResume
        ? {
            id: activeResume.id,
            candidateId: activeResume.candidateId,
            originalFileName: activeResume.originalFileName,
            storageKey: activeResume.storageKey,
            fileUrl: activeResume.fileUrl,
            mimeType: activeResume.mimeType,
            fileSize: activeResume.fileSize,
            checksum: activeResume.checksum,
            version: activeResume.version,
            processingStatus: activeResume.processingStatus,
            isActive: activeResume.isActive,
            createdAt: activeResume.createdAt.toISOString(),
            updatedAt: activeResume.updatedAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Updates basic information and professional summary.
   */
  static async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.getOrCreateProfile(userId);

    const updated = await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.headline !== undefined && { headline: dto.headline }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.preferredLocation !== undefined && { preferredLocation: dto.preferredLocation }),
        ...(dto.workMode !== undefined && { workMode: dto.workMode as WorkMode }),
        ...(dto.experienceYears !== undefined && { experienceYears: dto.experienceYears }),
        ...(dto.githubUrl !== undefined && { githubUrl: dto.githubUrl }),
        ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
        ...(dto.portfolioUrl !== undefined && { portfolioUrl: dto.portfolioUrl }),
        ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
      },
      include: {
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { startDate: 'desc' } },
        preferences: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROFILE_UPDATED',
        entityType: 'CandidateProfile',
        entityId: updated.id,
      },
    });

    const completeness = calculateProfileCompleteness(updated);
    return { profile: updated, completeness };
  }

  /**
   * Deletes candidate profile and related candidate data.
   */
  static async deleteProfile(userId: string) {
    const profile = await CandidateRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError('Candidate profile not found', 404, 'NOT_FOUND');
    }

    await prisma.candidateProfile.delete({
      where: { id: profile.id },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROFILE_DELETED',
        entityType: 'CandidateProfile',
        entityId: profile.id,
      },
    });

    return { message: 'Candidate profile deleted successfully' };
  }

  // ============================================================================
  // SKILLS MANAGEMENT
  // ============================================================================

  static async getSkills(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return prisma.candidateSkill.findMany({
      where: { candidateId: profile.id },
      include: { skill: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async addSkill(userId: string, dto: AddSkillDto) {
    const profile = await this.getOrCreateProfile(userId);
    
    // Resolve via Phase 7 Skill Taxonomy
    const resolved = await SkillService.resolveSkill(dto.name);
    
    let skillId: string;
    let canonicalName: string;

    if (resolved.canonicalSkillId) {
      skillId = resolved.canonicalSkillId;
      canonicalName = resolved.canonicalName || dto.name;
    } else {
      const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const created = await prisma.skill.upsert({
        where: { name: dto.name },
        create: {
          name: dto.name,
          slug: slug || `skill-${Date.now()}`,
          category: SkillCategory.OTHER,
          isActive: true,
        },
        update: {},
      });
      skillId = created.id;
      canonicalName = created.name;
    }

    // Check if candidate already has this skill
    const existing = await prisma.candidateSkill.findUnique({
      where: {
        candidateId_skillId: {
          candidateId: profile.id,
          skillId,
        },
      },
    });

    if (existing) {
      throw new AppError(`Skill '${canonicalName}' is already on your profile`, 409, 'DUPLICATE_SKILL');
    }

    const candidateSkill = await prisma.candidateSkill.create({
      data: {
        candidateId: profile.id,
        skillId,
        proficiency: (dto.proficiency as SkillProficiency) || SkillProficiency.INTERMEDIATE,
        source: 'PROFILE',
      },
      include: { skill: true },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SKILL_ADDED',
        entityType: 'CandidateSkill',
        entityId: candidateSkill.id,
        metadata: { skill: canonicalName, input: dto.name, matchType: resolved.matchType },
      },
    });

    return candidateSkill;
  }

  static async updateSkill(userId: string, candidateSkillId: string, dto: UpdateSkillDto) {
    const profile = await this.getOrCreateProfile(userId);

    // IDOR Protection: verify skill belongs to this candidate
    const existing = await prisma.candidateSkill.findUnique({
      where: { id: candidateSkillId },
    });

    if (!existing || existing.candidateId !== profile.id) {
      throw new AppError('Skill not found or access denied', 404, 'NOT_FOUND');
    }

    return prisma.candidateSkill.update({
      where: { id: candidateSkillId },
      data: {
        proficiency: dto.proficiency as SkillProficiency,
      },
      include: { skill: true },
    });
  }

  static async removeSkill(userId: string, candidateSkillId: string) {
    const profile = await this.getOrCreateProfile(userId);

    // IDOR Protection
    const existing = await prisma.candidateSkill.findUnique({
      where: { id: candidateSkillId },
    });

    if (!existing || existing.candidateId !== profile.id) {
      throw new AppError('Skill not found or access denied', 404, 'NOT_FOUND');
    }

    await prisma.candidateSkill.delete({
      where: { id: candidateSkillId },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SKILL_REMOVED',
        entityType: 'CandidateSkill',
        entityId: candidateSkillId,
      },
    });

    return { message: 'Skill removed from profile' };
  }

  // ============================================================================
  // WORK EXPERIENCE MANAGEMENT
  // ============================================================================

  static async getExperience(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return prisma.experience.findMany({
      where: { candidateId: profile.id },
      orderBy: { startDate: 'desc' },
    });
  }

  static async addExperience(userId: string, dto: CreateExperienceDto) {
    const profile = await this.getOrCreateProfile(userId);

    const experience = await prisma.experience.create({
      data: {
        candidateId: profile.id,
        company: dto.company,
        title: dto.title,
        location: dto.location,
        employmentType: dto.employmentType as EmploymentType,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        current: dto.current ?? false,
        description: dto.description,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EXPERIENCE_ADDED',
        entityType: 'Experience',
        entityId: experience.id,
      },
    });

    return experience;
  }

  static async updateExperience(userId: string, experienceId: string, dto: UpdateExperienceDto) {
    const profile = await this.getOrCreateProfile(userId);

    // IDOR Protection
    const existing = await prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!existing || existing.candidateId !== profile.id) {
      throw new AppError('Experience record not found or access denied', 404, 'NOT_FOUND');
    }

    const updated = await prisma.experience.update({
      where: { id: experienceId },
      data: {
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.employmentType !== undefined && { employmentType: dto.employmentType as EmploymentType }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.current !== undefined && { current: dto.current }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EXPERIENCE_UPDATED',
        entityType: 'Experience',
        entityId: updated.id,
      },
    });

    return updated;
  }

  static async deleteExperience(userId: string, experienceId: string) {
    const profile = await this.getOrCreateProfile(userId);

    // IDOR Protection
    const existing = await prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!existing || existing.candidateId !== profile.id) {
      throw new AppError('Experience record not found or access denied', 404, 'NOT_FOUND');
    }

    await prisma.experience.delete({
      where: { id: experienceId },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EXPERIENCE_DELETED',
        entityType: 'Experience',
        entityId: experienceId,
      },
    });

    return { message: 'Experience record deleted successfully' };
  }

  // ============================================================================
  // EDUCATION MANAGEMENT
  // ============================================================================

  static async getEducation(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return prisma.education.findMany({
      where: { candidateId: profile.id },
      orderBy: { startDate: 'desc' },
    });
  }

  static async addEducation(userId: string, dto: CreateEducationDto) {
    const profile = await this.getOrCreateProfile(userId);

    const education = await prisma.education.create({
      data: {
        candidateId: profile.id,
        institution: dto.institution,
        degree: dto.degree,
        fieldOfStudy: dto.fieldOfStudy,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        grade: dto.grade,
        description: dto.description,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EDUCATION_ADDED',
        entityType: 'Education',
        entityId: education.id,
      },
    });

    return education;
  }

  static async updateEducation(userId: string, educationId: string, dto: UpdateEducationDto) {
    const profile = await this.getOrCreateProfile(userId);

    // IDOR Protection
    const existing = await prisma.education.findUnique({
      where: { id: educationId },
    });

    if (!existing || existing.candidateId !== profile.id) {
      throw new AppError('Education record not found or access denied', 404, 'NOT_FOUND');
    }

    const updated = await prisma.education.update({
      where: { id: educationId },
      data: {
        ...(dto.institution !== undefined && { institution: dto.institution }),
        ...(dto.degree !== undefined && { degree: dto.degree }),
        ...(dto.fieldOfStudy !== undefined && { fieldOfStudy: dto.fieldOfStudy }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EDUCATION_UPDATED',
        entityType: 'Education',
        entityId: updated.id,
      },
    });

    return updated;
  }

  static async deleteEducation(userId: string, educationId: string) {
    const profile = await this.getOrCreateProfile(userId);

    // IDOR Protection
    const existing = await prisma.education.findUnique({
      where: { id: educationId },
    });

    if (!existing || existing.candidateId !== profile.id) {
      throw new AppError('Education record not found or access denied', 404, 'NOT_FOUND');
    }

    await prisma.education.delete({
      where: { id: educationId },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EDUCATION_DELETED',
        entityType: 'Education',
        entityId: educationId,
      },
    });

    return { message: 'Education record deleted successfully' };
  }

  // ============================================================================
  // CAREER PREFERENCES MANAGEMENT
  // ============================================================================

  static async getPreferences(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const preferences = await prisma.careerPreference.findUnique({
      where: { candidateId: profile.id },
    });

    return preferences || {
      id: '',
      candidateId: profile.id,
      desiredJobTitles: [],
      preferredLocations: [],
      preferredWorkModes: [],
      preferredEmploymentTypes: [],
      minimumSalary: null,
      maximumSalary: null,
      currency: 'USD',
      willingToRelocate: false,
      preferredIndustries: [],
    };
  }

  static async updatePreferences(userId: string, dto: UpdateCareerPreferenceDto) {
    const profile = await this.getOrCreateProfile(userId);

    const preferences = await prisma.careerPreference.upsert({
      where: { candidateId: profile.id },
      create: {
        candidateId: profile.id,
        desiredJobTitles: dto.desiredJobTitles || [],
        preferredLocations: dto.preferredLocations || [],
        preferredWorkModes: (dto.preferredWorkModes as WorkMode[]) || [],
        preferredEmploymentTypes: (dto.preferredEmploymentTypes as EmploymentType[]) || [],
        minimumSalary: dto.minimumSalary,
        maximumSalary: dto.maximumSalary,
        currency: dto.currency || 'USD',
        willingToRelocate: dto.willingToRelocate || false,
        preferredIndustries: dto.preferredIndustries || [],
      },
      update: {
        ...(dto.desiredJobTitles !== undefined && { desiredJobTitles: dto.desiredJobTitles }),
        ...(dto.preferredLocations !== undefined && { preferredLocations: dto.preferredLocations }),
        ...(dto.preferredWorkModes !== undefined && { preferredWorkModes: dto.preferredWorkModes as WorkMode[] }),
        ...(dto.preferredEmploymentTypes !== undefined && { preferredEmploymentTypes: dto.preferredEmploymentTypes as EmploymentType[] }),
        ...(dto.minimumSalary !== undefined && { minimumSalary: dto.minimumSalary }),
        ...(dto.maximumSalary !== undefined && { maximumSalary: dto.maximumSalary }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.willingToRelocate !== undefined && { willingToRelocate: dto.willingToRelocate }),
        ...(dto.preferredIndustries !== undefined && { preferredIndustries: dto.preferredIndustries }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PREFERENCES_UPDATED',
        entityType: 'CareerPreference',
        entityId: preferences.id,
      },
    });

    return preferences;
  }
}
