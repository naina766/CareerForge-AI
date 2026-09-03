import { PrismaClient, UserRole, WorkMode, EmploymentType, JobStatus, ApplicationStatus, ResumeProcessingStatus, SkillCategory, RecommendationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic valid bcrypt hash for 'Password123!'
const DEMO_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

async function main() {
  console.log('🌱 Starting CareerForge AI Database Seeding (Phase 2)...');

  // PostgreSQL Seed Initialization

  // Clean existing data in reverse relation order for deterministic idempotent seeding
  console.log('🧹 Cleaning existing records...');
  await prisma.auditLog.deleteMany();
  await prisma.aIUsage.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.jobRecommendation.deleteMany();
  await prisma.matchReport.deleteMany();
  await prisma.applicationStatusHistory.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobSkill.deleteMany();
  await prisma.job.deleteMany();
  await prisma.resumeSkill.deleteMany();
  await prisma.resumeChunk.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.education.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.recruiterProfile.deleteMany();
  await prisma.user.deleteMany();

  // ==============================================================================
  // 1. SEED SKILLS & ALIAS TAXONOMY (Phase 7)
  // ==============================================================================
  console.log('📦 Seeding Skill Taxonomy & Normalization Aliases...');
  const skillsData = [
    { name: 'JavaScript', slug: 'javascript', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['JS', 'Javascript', 'java script', 'ECMAScript', 'ES6'] },
    { name: 'TypeScript', slug: 'typescript', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['TS', 'Typescript', 'type script'] },
    { name: 'Python', slug: 'python', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['Python 3', 'Python3', 'py'] },
    { name: 'Java', slug: 'java', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['Java 17', 'Java 21', 'Core Java'] },
    { name: 'C++', slug: 'cpp', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['C plus plus', 'cplusplus'] },
    { name: 'C#', slug: 'csharp', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['C sharp', 'csharp', '.NET C#'] },
    { name: 'Go', slug: 'go', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['Golang', 'Go Language'] },
    { name: 'Rust', slug: 'rust', category: SkillCategory.PROGRAMMING_LANGUAGE, aliases: ['Rust Lang'] },
    { name: 'React', slug: 'react', category: SkillCategory.FRONTEND, aliases: ['React.js', 'ReactJS', 'React 18', 'react js'] },
    { name: 'Next.js', slug: 'next-js', category: SkillCategory.FRONTEND, aliases: ['NextJS', 'Next 14', 'Next 15', 'next.js', 'next js'] },
    { name: 'Angular', slug: 'angular', category: SkillCategory.FRONTEND, aliases: ['AngularJS', 'Angular 2+', 'Angular 17'] },
    { name: 'Vue.js', slug: 'vue-js', category: SkillCategory.FRONTEND, aliases: ['Vue', 'VueJS', 'Vue 3'] },
    { name: 'Tailwind CSS', slug: 'tailwind-css', category: SkillCategory.FRONTEND, aliases: ['Tailwind', 'TailwindCSS', 'tailwind'] },
    { name: 'HTML5', slug: 'html5', category: SkillCategory.FRONTEND, aliases: ['HTML', 'html'] },
    { name: 'CSS3', slug: 'css3', category: SkillCategory.FRONTEND, aliases: ['CSS', 'css'] },
    { name: 'Node.js', slug: 'node-js', category: SkillCategory.BACKEND, aliases: ['NodeJS', 'Node', 'node.js', 'node js'] },
    { name: 'Express', slug: 'express', category: SkillCategory.BACKEND, aliases: ['Express.js', 'ExpressJS', 'express'] },
    { name: 'FastAPI', slug: 'fastapi', category: SkillCategory.BACKEND, aliases: ['Fast API', 'fastapi'] },
    { name: 'Django', slug: 'django', category: SkillCategory.BACKEND, aliases: ['Django REST Framework', 'DRF'] },
    { name: 'Spring Boot', slug: 'spring-boot', category: SkillCategory.BACKEND, aliases: ['SpringBoot', 'Spring Framework'] },
    { name: 'PostgreSQL', slug: 'postgresql', category: SkillCategory.DATABASE, aliases: ['Postgres', 'PostgresDB', 'PGSQL', 'PostgreSQL DB'] },
    { name: 'MongoDB', slug: 'mongodb', category: SkillCategory.DATABASE, aliases: ['Mongo', 'MongoDB Atlas', 'mongo db'] },
    { name: 'Redis', slug: 'redis', category: SkillCategory.DATABASE, aliases: ['Redis Cache', 'Redis Stack'] },
    { name: 'MySQL', slug: 'mysql', category: SkillCategory.DATABASE, aliases: ['My SQL'] },
    { name: 'Docker', slug: 'docker', category: SkillCategory.DEVOPS, aliases: ['Docker Engine', 'Docker Compose'] },
    { name: 'Kubernetes', slug: 'kubernetes', category: SkillCategory.DEVOPS, aliases: ['K8s', 'K8s Cluster', 'k8s'] },
    { name: 'Kafka', slug: 'kafka', category: SkillCategory.DEVOPS, aliases: ['Apache Kafka', 'Kafka Streams'] },
    { name: 'GitHub Actions', slug: 'github-actions', category: SkillCategory.DEVOPS, aliases: ['GH Actions', 'GHA', 'CI/CD'] },
    { name: 'AWS', slug: 'aws', category: SkillCategory.CLOUD, aliases: ['Amazon Web Services', 'AWS Cloud'] },
    { name: 'Azure', slug: 'azure', category: SkillCategory.CLOUD, aliases: ['Microsoft Azure'] },
    { name: 'Google Cloud', slug: 'google-cloud', category: SkillCategory.CLOUD, aliases: ['GCP', 'Google Cloud Platform'] },
    { name: 'Git', slug: 'git', category: SkillCategory.TOOLS, aliases: ['GitHub', 'GitLab', 'Version Control'] },
    { name: 'REST APIs', slug: 'rest-apis', category: SkillCategory.BACKEND, aliases: ['RESTful API', 'REST', 'REST API'] },
    { name: 'GraphQL', slug: 'graphql', category: SkillCategory.BACKEND, aliases: ['GraphQL API', 'Apollo GraphQL'] },
    { name: 'LangChain', slug: 'langchain', category: SkillCategory.AI_ML, aliases: ['Langchain', 'LangChain Core'] },
    { name: 'RAG', slug: 'rag', category: SkillCategory.AI_ML, aliases: ['Retrieval Augmented Generation', 'RAG Pipeline'] },
    { name: 'React Native', slug: 'react-native', category: SkillCategory.MOBILE, aliases: ['RN', 'react native'] },
    { name: 'Flutter', slug: 'flutter', category: SkillCategory.MOBILE, aliases: ['Flutter SDK'] },
    { name: 'Problem Solving', slug: 'problem-solving', category: SkillCategory.SOFT_SKILLS, aliases: ['Analytical Skills', 'Troubleshooting'] },
  ];

  const createdSkills: Record<string, string> = {};
  for (const s of skillsData) {
    const record = await prisma.skill.upsert({
      where: { name: s.name },
      create: {
        name: s.name,
        slug: s.slug,
        category: s.category,
        isActive: true,
      },
      update: {
        slug: s.slug,
        category: s.category,
        isActive: true,
      },
    });
    createdSkills[s.name] = record.id;

    // Seed aliases
    for (const alias of s.aliases) {
      const normalized = alias.toLowerCase().replace(/[^a-z0-9+#]/g, '').trim();
      if (normalized) {
        await prisma.skillAlias.upsert({
          where: { normalizedAlias: normalized },
          create: {
            skillId: record.id,
            alias: alias,
            normalizedAlias: normalized,
          },
          update: {
            skillId: record.id,
            alias: alias,
          },
        });
      }
    }
  }

  // ==============================================================================
  // 2. SEED ADMIN USER
  // ==============================================================================
  console.log('👤 Seeding Admin User...');
  await prisma.user.create({
    data: {
      email: 'admin@careerforge.ai',
      passwordHash: DEMO_PASSWORD_HASH,
      role: UserRole.ADMIN,
      verified: true,
    },
  });

  // ==============================================================================
  // 3. SEED RECRUITERS & JOBS
  // ==============================================================================
  console.log('🏢 Seeding Recruiters & Jobs...');
  const recruitersData = [
    {
      email: 'recruiter.techcorp@careerforge.ai',
      name: 'Sarah Jenkins',
      company: 'TechCorp Solutions',
      website: 'https://techcorp.example.com',
      jobTitle: 'Principal Technical Recruiter',
    },
    {
      email: 'recruiter.innovate@careerforge.ai',
      name: 'David Chen',
      company: 'Innovate AI Labs',
      website: 'https://innovateai.example.com',
      jobTitle: 'Head of Talent Acquisition',
    },
    {
      email: 'recruiter.cloudscale@careerforge.ai',
      name: 'Elena Rostova',
      company: 'CloudScale Global',
      website: 'https://cloudscale.example.com',
      jobTitle: 'Senior Talent Partner',
    },
  ];

  const recruiterProfileIds: string[] = [];
  for (const r of recruitersData) {
    const user = await prisma.user.create({
      data: {
        email: r.email,
        passwordHash: DEMO_PASSWORD_HASH,
        role: UserRole.RECRUITER,
        verified: true,
        recruiterProfile: {
          create: {
            name: r.name,
            companyName: r.company,
            companyWebsite: r.website,
            jobTitle: r.jobTitle,
          },
        },
      },
      include: { recruiterProfile: true },
    });
    if (user.recruiterProfile) {
      recruiterProfileIds.push(user.recruiterProfile.id);
    }
  }

  // Seed 8 Realistic Jobs
  const jobsData = [
    {
      recruiterId: recruiterProfileIds[0]!,
      title: 'Senior Full Stack Developer',
      companyName: 'TechCorp Solutions',
      location: 'San Francisco, CA',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 4,
      experienceMax: 8,
      salaryMin: 140000,
      salaryMax: 185000,
      description: 'We are seeking a seasoned Full Stack Engineer proficient in Next.js, React, Node.js, and PostgreSQL to scale our core web products.',
      skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    },
    {
      recruiterId: recruiterProfileIds[0]!,
      title: 'Senior Backend Engineer (Node/TypeScript)',
      companyName: 'TechCorp Solutions',
      location: 'New York, NY',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 5,
      experienceMax: 10,
      salaryMin: 150000,
      salaryMax: 200000,
      description: 'Architect scalable microservices, manage PostgreSQL databases, Kafka streams, and high-performance REST APIs.',
      skills: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Kafka', 'Redis'],
    },
    {
      recruiterId: recruiterProfileIds[1]!,
      title: 'AI & GenAI Solutions Engineer',
      companyName: 'Innovate AI Labs',
      location: 'Austin, TX',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 3,
      experienceMax: 6,
      salaryMin: 160000,
      salaryMax: 210000,
      description: 'Lead the development of RAG pipelines, LLM fine-tuning, FAISS vector retrieval, and FastAPI orchestration.',
      skills: ['Python', 'FastAPI', 'RAG', 'LangChain', 'PostgreSQL', 'Docker'],
    },
    {
      recruiterId: recruiterProfileIds[1]!,
      title: 'Python Backend Developer',
      companyName: 'Innovate AI Labs',
      location: 'Boston, MA',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 2,
      experienceMax: 5,
      salaryMin: 120000,
      salaryMax: 155000,
      description: 'Develop high-throughput REST APIs using FastAPI and async Python with relational data modeling.',
      skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'REST APIs', 'Git'],
    },
    {
      recruiterId: recruiterProfileIds[2]!,
      title: 'Frontend Engineer (React/Next.js)',
      companyName: 'CloudScale Global',
      location: 'Seattle, WA',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 3,
      experienceMax: 6,
      salaryMin: 130000,
      salaryMax: 165000,
      description: 'Craft responsive, accessible, high-performance dashboards using React, Next.js, and Tailwind CSS.',
      skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'JavaScript'],
    },
    {
      recruiterId: recruiterProfileIds[2]!,
      title: 'DevOps & Platform Engineer',
      companyName: 'CloudScale Global',
      location: 'Denver, CO',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 4,
      experienceMax: 8,
      salaryMin: 145000,
      salaryMax: 190000,
      description: 'Manage Kubernetes clusters, AWS infrastructure, CI/CD pipelines, and Kafka event streaming brokers.',
      skills: ['Docker', 'Kubernetes', 'AWS', 'Kafka', 'Git'],
    },
    {
      recruiterId: recruiterProfileIds[0]!,
      title: 'Data & Analytics Engineer',
      companyName: 'TechCorp Solutions',
      location: 'Chicago, IL',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 3,
      experienceMax: 7,
      salaryMin: 125000,
      salaryMax: 160000,
      description: 'Design analytical queries, ETL pipelines, and structured schemas across PostgreSQL and data pipelines.',
      skills: ['Python', 'PostgreSQL', 'REST APIs', 'Git', 'Problem Solving'],
    },
    {
      recruiterId: recruiterProfileIds[2]!,
      title: 'Software Engineer (Full Stack)',
      companyName: 'CloudScale Global',
      location: 'Remote, US',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.CONTRACT,
      experienceMin: 2,
      experienceMax: 5,
      salaryMin: 110000,
      salaryMax: 140000,
      description: 'Build end-to-end features connecting React web interfaces to Node/Express REST backends.',
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Git'],
    },
  ];

  const createdJobs: Array<{ id: string; title: string }> = [];
  const sampleStatuses: JobStatus[] = [JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.DRAFT, JobStatus.PAUSED, JobStatus.CLOSED];

  for (let idx = 0; idx < jobsData.length; idx++) {
    const j = jobsData[idx]!;
    const status = sampleStatuses[idx % sampleStatuses.length]!;
    const slug = `${j.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx + 1}`;

    const jobRecord = await prisma.job.create({
      data: {
        recruiterId: j.recruiterId,
        title: j.title,
        slug,
        companyName: j.companyName,
        location: j.location,
        workMode: j.workMode,
        employmentType: j.employmentType,
        experienceMin: j.experienceMin,
        experienceMax: j.experienceMax,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        currency: 'USD',
        salaryPeriod: 'YEARLY',
        status,
        publishedAt: status === JobStatus.PUBLISHED ? new Date() : null,
        closedAt: status === JobStatus.CLOSED ? new Date() : null,
        description: j.description,
        responsibilities: '- Architect and implement mission-critical features\n- Participate in code reviews and design discussions',
        requirements: `- Strong engineering foundation\n- ${j.experienceMin}+ years relevant production experience`,
        benefits: '- Remote-first flexible culture\n- Comprehensive health, dental, and vision\n- 401(k) retirement matching',
        jobSkills: {
          create: j.skills.map((skillName, sIdx) => ({
            skillId: createdSkills[skillName]!,
            required: sIdx < 3,
            importance: sIdx < 3 ? 'REQUIRED' : 'PREFERRED',
            minimumYears: 2,
          })),
        },
      },
    });
    createdJobs.push({ id: jobRecord.id, title: jobRecord.title });
  }

  // ==============================================================================
  // 4. SEED 10 CANDIDATES WITH EXPERIENCES, RESUMES & SKILLS
  // ==============================================================================
  console.log('👨‍💻 Seeding 10 Candidate Profiles, Resumes & Skills...');
  const candidatesData = [
    {
      email: 'alex.rivera@careerforge.ai',
      name: 'Alex Rivera',
      headline: 'Senior Full Stack & AI Engineer',
      summary: 'Passionate software architect with 6 years building modern React, Node, and Python RAG applications.',
      location: 'San Francisco, CA',
      experienceYears: 6,
      skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'PostgreSQL', 'RAG'],
    },
    {
      email: 'maya.patel@careerforge.ai',
      name: 'Maya Patel',
      headline: 'Backend & Cloud Infrastructure Engineer',
      summary: '5+ years specialized in distributed systems, PostgreSQL optimization, Kafka streaming, and Docker.',
      location: 'New York, NY',
      experienceYears: 5,
      skills: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Kafka', 'Docker', 'Redis'],
    },
    {
      email: 'liam.smith@careerforge.ai',
      name: 'Liam Smith',
      headline: 'Frontend Specialist (React/Next.js)',
      summary: 'UI/UX focused engineer creating accessible and high-performance web applications.',
      location: 'Seattle, WA',
      experienceYears: 4,
      skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'JavaScript', 'Git'],
    },
    {
      email: 'priya.sharma@careerforge.ai',
      name: 'Priya Sharma',
      headline: 'Machine Learning & GenAI Engineer',
      summary: 'Expert in LLM orchestration, LangChain, vector retrieval, and Python microservices.',
      location: 'Austin, TX',
      experienceYears: 4.5,
      skills: ['Python', 'FastAPI', 'LangChain', 'RAG', 'PostgreSQL', 'Docker'],
    },
    {
      email: 'marcus.vance@careerforge.ai',
      name: 'Marcus Vance',
      headline: 'DevOps & Site Reliability Engineer',
      summary: 'Automating multi-cloud Kubernetes deployments, Kafka monitoring, and CI/CD pipelines.',
      location: 'Denver, CO',
      experienceYears: 7,
      skills: ['Docker', 'Kubernetes', 'AWS', 'Kafka', 'Git', 'Problem Solving'],
    },
    {
      email: 'emily.zhao@careerforge.ai',
      name: 'Emily Zhao',
      headline: 'Full Stack JavaScript Engineer',
      summary: 'Full stack engineer with strong roots in React, Node.js, and relational database schema design.',
      location: 'Chicago, IL',
      experienceYears: 3,
      skills: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'REST APIs'],
    },
    {
      email: 'jordan.taylor@careerforge.ai',
      name: 'Jordan Taylor',
      headline: 'Data & Analytics Developer',
      summary: 'Bridging software engineering and data analytics using Python, PostgreSQL, and REST workflows.',
      location: 'Boston, MA',
      experienceYears: 3.5,
      skills: ['Python', 'PostgreSQL', 'REST APIs', 'Git', 'Problem Solving'],
    },
    {
      email: 'sophia.martinez@careerforge.ai',
      name: 'Sophia Martinez',
      headline: 'Frontend Engineer & Design Technologist',
      summary: 'Creative developer delivering pixel-perfect interfaces with Tailwind CSS and Next.js.',
      location: 'San Diego, CA',
      experienceYears: 3,
      skills: ['React', 'Next.js', 'JavaScript', 'Tailwind CSS', 'Git'],
    },
    {
      email: 'daniel.kim@careerforge.ai',
      name: 'Daniel Kim',
      headline: 'Backend Developer (Python/FastAPI)',
      summary: 'Building asynchronous APIs, database integrations, and caching architectures.',
      location: 'Atlanta, GA',
      experienceYears: 2.5,
      skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'REST APIs'],
    },
    {
      email: 'hannah.brown@careerforge.ai',
      name: 'Hannah Brown',
      headline: 'Junior Full Stack Developer',
      summary: 'Recent CS graduate with internship experience in React, TypeScript, and Node.js backends.',
      location: 'Austin, TX',
      experienceYears: 1.5,
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Git'],
    },
  ];

  const candidateProfileList: Array<{ id: string; name: string; resumeId: string }> = [];

  for (const c of candidatesData) {
    const user = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash: DEMO_PASSWORD_HASH,
        role: UserRole.CANDIDATE,
        verified: true,
        candidateProfile: {
          create: {
            name: c.name,
            headline: c.headline,
            summary: c.summary,
            location: c.location,
            preferredLocation: 'Remote',
            workMode: WorkMode.REMOTE,
            experienceYears: c.experienceYears,
            experiences: {
              create: [
                {
                  company: 'Apex Technologies',
                  title: 'Software Engineer',
                  location: c.location,
                  startDate: new Date('2021-06-01'),
                  current: true,
                  description: 'Building modern web applications, microservices, and databases.',
                },
              ],
            },
            educations: {
              create: [
                {
                  institution: 'University of Science & Technology',
                  degree: 'Bachelor of Science',
                  fieldOfStudy: 'Computer Science',
                  startDate: new Date('2017-09-01'),
                  endDate: new Date('2021-05-30'),
                  grade: '3.8 GPA',
                },
              ],
            },
            resumes: {
              create: {
                originalFileName: `${c.name.replace(/\s+/g, '_')}_Resume.pdf`,
                fileUrl: `/uploads/resumes/${c.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                processingStatus: ResumeProcessingStatus.ANALYZED,
                version: 1,
                resumeSkills: {
                  create: c.skills.map((skillName) => ({
                    skillId: createdSkills[skillName]!,
                    proficiency: 'Expert',
                    yearsOfExperience: c.experienceYears,
                  })),
                },
              },
            },
          },
        },
      },
      include: {
        candidateProfile: {
          include: { resumes: true },
        },
      },
    });

    if (user.candidateProfile && user.candidateProfile.resumes[0]) {
      candidateProfileList.push({
        id: user.candidateProfile.id,
        name: user.candidateProfile.name,
        resumeId: user.candidateProfile.resumes[0].id,
      });
    }
  }

  // ==============================================================================
  // 5. SEED APPLICATIONS, MATCH REPORTS & RECOMMENDATIONS
  // ==============================================================================
  console.log('📊 Seeding Applications, Status Histories & Match Reports...');

  // Application 1: Alex Rivera -> Senior Full Stack Developer (Offer status)
  const app1 = await prisma.application.create({
    data: {
      candidateId: candidateProfileList[0]!.id,
      jobId: createdJobs[0]!.id,
      resumeId: candidateProfileList[0]!.resumeId,
      matchScore: 94.5,
      status: ApplicationStatus.OFFER,
      statusHistory: {
        create: [
          { oldStatus: null, newStatus: ApplicationStatus.APPLIED, changedBy: 'Candidate' },
          { oldStatus: ApplicationStatus.APPLIED, newStatus: ApplicationStatus.SCREENING, changedBy: 'Sarah Jenkins' },
          { oldStatus: ApplicationStatus.SCREENING, newStatus: ApplicationStatus.INTERVIEW, changedBy: 'Sarah Jenkins' },
          { oldStatus: ApplicationStatus.INTERVIEW, newStatus: ApplicationStatus.OFFER, changedBy: 'Sarah Jenkins' },
        ],
      },
    },
  });

  await prisma.matchReport.create({
    data: {
      candidateId: candidateProfileList[0]!.id,
      jobId: createdJobs[0]!.id,
      applicationId: app1.id,
      overallScore: 94.5,
      skillScore: 96.0,
      semanticScore: 92.0,
      experienceScore: 95.0,
      educationScore: 90.0,
      locationScore: 100.0,
      matchedSkills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
      missingSkills: [],
      experienceGaps: [],
      recommendation: RecommendationType.STRONGLY_APPLY,
      confidence: 0.95,
      explanation: 'Exceptional alignment across React, Next.js, Node.js, and PostgreSQL. Candidate meets all core requirements.',
    },
  });

  // Application 2: Maya Patel -> Senior Backend Engineer (Interview status)
  const app2 = await prisma.application.create({
    data: {
      candidateId: candidateProfileList[1]!.id,
      jobId: createdJobs[1]!.id,
      resumeId: candidateProfileList[1]!.resumeId,
      matchScore: 91.0,
      status: ApplicationStatus.INTERVIEW,
      statusHistory: {
        create: [
          { oldStatus: null, newStatus: ApplicationStatus.APPLIED, changedBy: 'Candidate' },
          { oldStatus: ApplicationStatus.APPLIED, newStatus: ApplicationStatus.SCREENING, changedBy: 'Sarah Jenkins' },
          { oldStatus: ApplicationStatus.SCREENING, newStatus: ApplicationStatus.INTERVIEW, changedBy: 'Sarah Jenkins' },
        ],
      },
    },
  });

  await prisma.matchReport.create({
    data: {
      candidateId: candidateProfileList[1]!.id,
      jobId: createdJobs[1]!.id,
      applicationId: app2.id,
      overallScore: 91.0,
      skillScore: 93.0,
      semanticScore: 89.0,
      experienceScore: 90.0,
      educationScore: 90.0,
      locationScore: 95.0,
      matchedSkills: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Kafka', 'Redis'],
      missingSkills: [],
      experienceGaps: [],
      recommendation: RecommendationType.STRONGLY_APPLY,
      confidence: 0.92,
      explanation: 'Strong backend foundation with Kafka event streaming and Redis caching experience matching all job expectations.',
    },
  });

  // Application 3: Priya Sharma -> AI & GenAI Solutions Engineer (Screening status)
  const app3 = await prisma.application.create({
    data: {
      candidateId: candidateProfileList[3]!.id,
      jobId: createdJobs[2]!.id,
      resumeId: candidateProfileList[3]!.resumeId,
      matchScore: 96.0,
      status: ApplicationStatus.SCREENING,
      statusHistory: {
        create: [
          { oldStatus: null, newStatus: ApplicationStatus.APPLIED, changedBy: 'Candidate' },
          { oldStatus: ApplicationStatus.APPLIED, newStatus: ApplicationStatus.SCREENING, changedBy: 'David Chen' },
        ],
      },
    },
  });

  await prisma.matchReport.create({
    data: {
      candidateId: candidateProfileList[3]!.id,
      jobId: createdJobs[2]!.id,
      applicationId: app3.id,
      overallScore: 96.0,
      skillScore: 98.0,
      semanticScore: 95.0,
      experienceScore: 92.0,
      educationScore: 95.0,
      locationScore: 100.0,
      matchedSkills: ['Python', 'FastAPI', 'RAG', 'LangChain', 'PostgreSQL', 'Docker'],
      missingSkills: [],
      experienceGaps: [],
      recommendation: RecommendationType.STRONGLY_APPLY,
      confidence: 0.96,
      explanation: 'Outstanding fit for GenAI and RAG orchestration role with deep Python and vector retrieval background.',
    },
  });

  console.log('✅ CareerForge AI Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
