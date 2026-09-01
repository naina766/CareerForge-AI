import { prisma } from '@careerforge/database';
import { ResolvedSkill, SkillCategory } from '@careerforge/types';
import { normalizeSkillName, stringSimilarity } from './skill.normalizer.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

export class SkillService {
  /**
   * Resolves a single raw skill name to its canonical taxonomy representation.
   * Order: Exact canonical -> Normalized name -> Alias lookup -> Conservative fuzzy match -> Unresolved.
   */
  static async resolveSkill(rawInput: string): Promise<ResolvedSkill> {
    const trimmed = (rawInput || '').trim();
    if (!trimmed) {
      return {
        input: rawInput,
        matchType: 'UNRESOLVED',
        confidence: 0.0,
      };
    }

    const normalized = normalizeSkillName(trimmed);

    // 1. Exact match by canonical name or slug
    const exactSkill = await prisma.skill.findFirst({
      where: {
        OR: [
          { name: { equals: trimmed, mode: 'insensitive' } },
          { slug: { equals: trimmed.toLowerCase() } },
        ],
        isActive: true,
      },
    });

    if (exactSkill) {
      return {
        input: trimmed,
        canonicalSkillId: exactSkill.id,
        canonicalName: exactSkill.name,
        slug: exactSkill.slug,
        category: exactSkill.category as any,
        matchType: 'CANONICAL',
        confidence: 1.0,
      };
    }

    // 2. Exact match by normalized alias lookup
    const aliasRecord = await prisma.skillAlias.findUnique({
      where: { normalizedAlias: normalized },
      include: { skill: true },
    });

    if (aliasRecord && aliasRecord.skill && aliasRecord.skill.isActive) {
      return {
        input: trimmed,
        canonicalSkillId: aliasRecord.skill.id,
        canonicalName: aliasRecord.skill.name,
        slug: aliasRecord.skill.slug,
        category: aliasRecord.skill.category as any,
        matchType: 'ALIAS',
        confidence: 1.0,
      };
    }

    // 3. Conservative fuzzy matching against all active canonical skills
    // We strictly guard against false positives like Java vs JavaScript, React vs React Native, C vs C++
    const allSkills = await prisma.skill.findMany({
      where: { isActive: true },
    });

    let bestMatch: (typeof allSkills)[0] | null = null;
    let highestScore = 0.0;

    for (const skill of allSkills) {
      const canonicalNorm = normalizeSkillName(skill.name);

      // Never match single-letter distinctions (e.g. C vs C++, C# vs C)
      if (Math.abs(canonicalNorm.length - normalized.length) > 2) {
        continue;
      }

      // Never match Java to JavaScript or React to React Native
      if (
        (normalized === 'java' && canonicalNorm.includes('javascript')) ||
        (normalized === 'javascript' && canonicalNorm === 'java') ||
        (normalized === 'react' && canonicalNorm.includes('native'))
      ) {
        continue;
      }

      const score = stringSimilarity(normalized, canonicalNorm);
      if (score >= 0.85 && score > highestScore) {
        highestScore = score;
        bestMatch = skill;
      }
    }

    if (bestMatch && highestScore >= 0.85) {
      return {
        input: trimmed,
        canonicalSkillId: bestMatch.id,
        canonicalName: bestMatch.name,
        slug: bestMatch.slug,
        category: bestMatch.category as any,
        matchType: 'FUZZY',
        confidence: parseFloat(highestScore.toFixed(2)),
      };
    }

    // 4. Unresolved fallback
    return {
      input: trimmed,
      canonicalSkillId: null,
      canonicalName: null,
      slug: null,
      category: null,
      matchType: 'UNRESOLVED',
      confidence: 0.0,
    };
  }

  /**
   * Batch resolves a list of raw skill strings and eliminates duplicate canonical IDs.
   */
  static async resolveSkills(rawInputs: string[]): Promise<ResolvedSkill[]> {
    if (!Array.isArray(rawInputs) || rawInputs.length === 0) {
      return [];
    }

    const results: ResolvedSkill[] = [];
    const seenCanonicalIds = new Set<string>();

    for (const input of rawInputs) {
      const resolved = await this.resolveSkill(input);
      if (resolved.canonicalSkillId) {
        if (!seenCanonicalIds.has(resolved.canonicalSkillId)) {
          seenCanonicalIds.add(resolved.canonicalSkillId);
          results.push(resolved);
        }
      } else {
        results.push(resolved);
      }
    }

    return results;
  }

  /**
   * Searches canonical skills in database with debouncing/pagination support.
   */
  static async searchSkills(params: {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (params.category) {
      where.category = params.category as any;
    }

    if (params.query) {
      const q = params.query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q.toLowerCase() } },
        { aliases: { some: { alias: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, skills] = await Promise.all([
      prisma.skill.count({ where }),
      prisma.skill.findMany({
        where,
        include: { aliases: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        category: s.category,
        description: s.description,
        isActive: s.isActive,
        aliases: s.aliases.map((a) => a.alias),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single skill details by ID.
   */
  static async getSkillById(id: string) {
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { aliases: true },
    });

    if (!skill) {
      throw new AppError('Skill not found in taxonomy', 404, 'NOT_FOUND');
    }

    return {
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      category: skill.category,
      description: skill.description,
      isActive: skill.isActive,
      aliases: skill.aliases.map((a) => a.alias),
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    };
  }

  /**
   * ADMIN: Creates a new canonical skill.
   */
  static async createSkill(data: {
    name: string;
    slug?: string;
    category?: SkillCategory;
    description?: string;
    aliases?: string[];
  }) {
    const name = data.name.trim();
    const slug = (data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');

    const existing = await prisma.skill.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existing) {
      throw new AppError(`Skill with name '${name}' or slug '${slug}' already exists`, 409, 'CONFLICT');
    }

    const skill = await prisma.skill.create({
      data: {
        name,
        slug,
        category: (data.category as any) || 'OTHER',
        description: data.description,
        isActive: true,
      },
    });

    if (Array.isArray(data.aliases)) {
      for (const alias of data.aliases) {
        const norm = normalizeSkillName(alias);
        if (norm) {
          await prisma.skillAlias.create({
            data: {
              skillId: skill.id,
              alias: alias.trim(),
              normalizedAlias: norm,
            },
          }).catch((err) => logger.warn(`Skipping duplicate alias ${alias}:`, err.message));
        }
      }
    }

    return this.getSkillById(skill.id);
  }

  /**
   * ADMIN: Updates or deactivates a canonical skill.
   */
  static async updateSkill(
    id: string,
    data: {
      name?: string;
      slug?: string;
      category?: SkillCategory;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      throw new AppError('Skill not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.skill.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        slug: data.slug !== undefined ? data.slug.trim() : undefined,
        category: data.category ? (data.category as any) : undefined,
        description: data.description !== undefined ? data.description : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    return this.getSkillById(updated.id);
  }

  /**
   * ADMIN: Creates a new alias for a canonical skill.
   */
  static async createAlias(skillId: string, alias: string) {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      throw new AppError('Skill not found', 404, 'NOT_FOUND');
    }

    const trimmed = alias.trim();
    const normalized = normalizeSkillName(trimmed);

    const existing = await prisma.skillAlias.findUnique({
      where: { normalizedAlias: normalized },
    });

    if (existing) {
      throw new AppError(`Alias '${trimmed}' already exists and maps to skill ${existing.skillId}`, 409, 'CONFLICT');
    }

    const created = await prisma.skillAlias.create({
      data: {
        skillId,
        alias: trimmed,
        normalizedAlias: normalized,
      },
    });

    return created;
  }

  /**
   * ADMIN: Deletes an alias.
   */
  static async deleteAlias(aliasId: string) {
    const alias = await prisma.skillAlias.findUnique({ where: { id: aliasId } });
    if (!alias) {
      throw new AppError('Alias not found', 404, 'NOT_FOUND');
    }

    await prisma.skillAlias.delete({ where: { id: aliasId } });
    return { message: 'Alias removed successfully' };
  }
}
