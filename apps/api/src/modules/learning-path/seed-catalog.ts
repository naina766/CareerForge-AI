import { prisma } from '@careerforge/database';
import { ResourceType, ResourceDifficulty } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export class SeedCatalogService {
  /**
   * Seeds initial canonical skill dependencies and approved learning resources if not already present.
   */
  static async seedIfEmpty(): Promise<void> {
    try {
      // 1. Ensure canonical skills exist for seeding
      const skillMap = new Map<string, string>(); // name -> skillId

      const coreSkills = [
        { name: 'JavaScript', slug: 'javascript', category: 'PROGRAMMING_LANGUAGE' },
        { name: 'TypeScript', slug: 'typescript', category: 'PROGRAMMING_LANGUAGE' },
        { name: 'Node.js', slug: 'nodejs', category: 'BACKEND' },
        { name: 'Express', slug: 'express', category: 'BACKEND' },
        { name: 'React', slug: 'react', category: 'FRONTEND' },
        { name: 'Next.js', slug: 'nextjs', category: 'FRONTEND' },
        { name: 'PostgreSQL', slug: 'postgresql', category: 'DATABASE' },
        { name: 'Prisma', slug: 'prisma', category: 'DATABASE' },
        { name: 'MongoDB', slug: 'mongodb', category: 'DATABASE' },
        { name: 'Redis', slug: 'redis', category: 'DATABASE' },
        { name: 'Kafka', slug: 'kafka', category: 'DEVOPS' },
        { name: 'Docker', slug: 'docker', category: 'DEVOPS' },
        { name: 'Kubernetes', slug: 'kubernetes', category: 'DEVOPS' },
        { name: 'Python', slug: 'python', category: 'PROGRAMMING_LANGUAGE' },
        { name: 'FastAPI', slug: 'fastapi', category: 'BACKEND' },
        { name: 'Terraform', slug: 'terraform', category: 'DEVOPS' },
        { name: 'AWS', slug: 'aws', category: 'CLOUD' },
        { name: 'Git', slug: 'git', category: 'TOOLS' },
      ];

      for (const s of coreSkills) {
        const record = await prisma.skill.upsert({
          where: { name: s.name },
          update: {},
          create: {
            name: s.name,
            slug: s.slug,
            category: s.category as any,
            isActive: true,
          },
        });
        skillMap.set(s.name.toLowerCase(), record.id);
        skillMap.set(s.slug.toLowerCase(), record.id);
      }

      // 2. Seed Skill Dependencies (Prerequisite -> Dependent)
      const dependencies = [
        { prereq: 'javascript', dep: 'typescript' },
        { prereq: 'javascript', dep: 'nodejs' },
        { prereq: 'nodejs', dep: 'express' },
        { prereq: 'javascript', dep: 'react' },
        { prereq: 'react', dep: 'nextjs' },
        { prereq: 'postgresql', dep: 'prisma' },
        { prereq: 'docker', dep: 'kubernetes' },
        { prereq: 'python', dep: 'fastapi' },
        { prereq: 'docker', dep: 'terraform' },
      ];

      for (const d of dependencies) {
        const prereqId = skillMap.get(d.prereq);
        const depId = skillMap.get(d.dep);
        if (prereqId && depId && prereqId !== depId) {
          await prisma.skillDependency.upsert({
            where: {
              prerequisiteSkillId_dependentSkillId: {
                prerequisiteSkillId: prereqId,
                dependentSkillId: depId,
              },
            },
            update: {},
            create: {
              prerequisiteSkillId: prereqId,
              dependentSkillId: depId,
              strength: 1.0,
            },
          });
        }
      }

      // 3. Seed Approved Learning Resources
      const resources = [
        // JavaScript
        {
          skill: 'javascript',
          title: 'JavaScript Fundamentals & Modern ES6+',
          description: 'Comprehensive modern JavaScript guide covering language core, async programming, and DOM APIs.',
          provider: 'MDN Web Docs',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.BEGINNER,
          estimatedHours: 12.0,
        },
        // TypeScript
        {
          skill: 'typescript',
          title: 'TypeScript for JavaScript Programmers',
          description: 'Official TypeScript handbook for type systems, generics, utility types, and strict mode best practices.',
          provider: 'TypeScript Official',
          url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          estimatedHours: 8.0,
        },
        // Node.js
        {
          skill: 'nodejs',
          title: 'Node.js Backend Architecture & Event Loop',
          description: 'Deep dive into asynchronous I/O, streams, buffers, clustering, and production backend development in Node.js.',
          provider: 'Node.js Foundation',
          url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          estimatedHours: 10.0,
        },
        // Express
        {
          skill: 'express',
          title: 'Building Production REST APIs with Express',
          description: 'Master routing, middleware chains, error handling, security headers, and rate limiting in Express.',
          provider: 'Express.js Documentation',
          url: 'https://expressjs.com/en/starter/installing.html',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.BEGINNER,
          estimatedHours: 6.0,
        },
        // React
        {
          skill: 'react',
          title: 'Modern React with Hooks & Component Architecture',
          description: 'Interactive documentation for state management, custom hooks, Server Components, and render performance.',
          provider: 'React Documentation',
          url: 'https://react.dev/learn',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.BEGINNER,
          estimatedHours: 14.0,
        },
        // Next.js
        {
          skill: 'nextjs',
          title: 'Next.js App Router & Full-Stack Web Development',
          description: 'Building high-performance SSR, SSG, and Server Actions applications with Next.js.',
          provider: 'Vercel Next.js Learn',
          url: 'https://nextjs.org/learn',
          resourceType: ResourceType.COURSE,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          estimatedHours: 12.0,
        },
        // PostgreSQL
        {
          skill: 'postgresql',
          title: 'PostgreSQL Relational Mastery & Query Optimization',
          description: 'Indexing strategies, EXPLAIN ANALYZE execution plans, window functions, and schema design.',
          provider: 'PostgreSQL Documentation',
          url: 'https://www.postgresql.org/docs/current/tutorial.html',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          estimatedHours: 10.0,
        },
        // Redis
        {
          skill: 'redis',
          title: 'Redis In-Memory Data Structures & Caching Patterns',
          description: 'Caching invalidation strategies, pub/sub messaging, sorted sets, and distributed locks with Redis.',
          provider: 'Redis University',
          url: 'https://redis.io/learn',
          resourceType: ResourceType.TUTORIAL,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          estimatedHours: 6.0,
        },
        // Kafka
        {
          skill: 'kafka',
          title: 'Apache Kafka Distributed Event Streaming Fundamentals',
          description: 'Producer/consumer groups, partition rebalancing, log compaction, offset commit semantics, and fault tolerance.',
          provider: 'Confluent Developer',
          url: 'https://developer.confluent.io/courses/apache-kafka/events/',
          resourceType: ResourceType.COURSE,
          difficulty: ResourceDifficulty.ADVANCED,
          estimatedHours: 12.0,
        },
        // Docker
        {
          skill: 'docker',
          title: 'Containerization Essentials with Docker',
          description: 'Multi-stage builds, rootless containers, Docker Compose networks, volumes, and image optimization.',
          provider: 'Docker Documentation',
          url: 'https://docs.docker.com/get-started/',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.BEGINNER,
          estimatedHours: 8.0,
        },
        // Kubernetes
        {
          skill: 'kubernetes',
          title: 'Kubernetes Cluster Orchestration & Deployments',
          description: 'Pods, Deployments, Services, Ingress, Horizontal Pod Autoscaling (HPA), and ConfigMaps/Secrets.',
          provider: 'Kubernetes Official',
          url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/',
          resourceType: ResourceType.TUTORIAL,
          difficulty: ResourceDifficulty.ADVANCED,
          estimatedHours: 16.0,
        },
        // Python
        {
          skill: 'python',
          title: 'Python 3 Advanced Programming & Concurrency',
          description: 'Object-oriented patterns, decorators, generators, asyncio, and type hinting in Python.',
          provider: 'Python Software Foundation',
          url: 'https://docs.python.org/3/tutorial/',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.BEGINNER,
          estimatedHours: 10.0,
        },
        // FastAPI
        {
          skill: 'fastapi',
          title: 'Building High-Performance Async APIs with FastAPI',
          description: 'Pydantic data validation, OpenAPI autodoc, dependency injection, and asynchronous endpoint routing.',
          provider: 'FastAPI Documentation',
          url: 'https://fastapi.tiangolo.com/tutorial/',
          resourceType: ResourceType.DOCUMENTATION,
          difficulty: ResourceDifficulty.INTERMEDIATE,
          estimatedHours: 8.0,
        },
      ];

      for (const r of resources) {
        const skillId = skillMap.get(r.skill);
        if (skillId) {
          const existing = await prisma.learningResource.findFirst({
            where: { skillId, title: r.title },
          });

          if (!existing) {
            await prisma.learningResource.create({
              data: {
                skillId,
                title: r.title,
                description: r.description,
                provider: r.provider,
                url: r.url,
                resourceType: r.resourceType,
                difficulty: r.difficulty,
                estimatedHours: r.estimatedHours,
                isActive: true,
              },
            });
          }
        }
      }

      logger.info('Phase 14 skill dependencies and approved learning catalog seeded successfully');
    } catch (err: any) {
      logger.warn(`SeedCatalogService failed or skipped: ${err.message}`);
    }
  }
}
