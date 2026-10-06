import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  WorkMode,
  EmploymentType,
  JobStatus,
  ApplicationStatus,
  ResumeProcessingStatus,
  SkillCategory,
  SkillProficiency,
  RecommendationType,
  MatchLevel,
  RecommendationLevel,
  ReadinessLevel,
  GapPriority,
  SkillRequirementType,
  SkillGapStatus,
  LearningItemStatus,
  LearningPathStatus,
  MessageRole,
  ResourceType,
  ResourceDifficulty,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic valid bcrypt hash for 'Password123!' (Development/Demo Only)
const DEMO_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

async function main() {
  console.log('🌱 Starting CareerForge AI Canonical Database Seeding (Phase 15)...');

  // ==============================================================================
  // 0. IDEMPOTENT CLEANUP (Reverse Dependency Order)
  // ==============================================================================
  console.log('🧹 Performing deterministic cleanup of existing records...');
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.careerMessageSource.deleteMany();
  await prisma.careerMessage.deleteMany();
  await prisma.careerConversation.deleteMany();
  await prisma.learningPathItem.deleteMany();
  await prisma.learningPath.deleteMany();
  await prisma.skillGap.deleteMany();
  await prisma.skillGapAnalysis.deleteMany();
  await prisma.learningResource.deleteMany();
  await prisma.skillDependency.deleteMany();
  await prisma.jobRecommendation.deleteMany();
  await prisma.matchReport.deleteMany();
  await prisma.applicationStatusHistory.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobSkill.deleteMany();
  await prisma.job.deleteMany();
  await prisma.resumeSkill.deleteMany();
  await prisma.resumeChunk.deleteMany();
  await prisma.parsedResume.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.careerPreference.deleteMany();
  await prisma.candidateSkill.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.education.deleteMany();
  await prisma.skillAlias.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.aIUsage.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.recruiterProfile.deleteMany();
  await prisma.user.deleteMany();

  // ==============================================================================
  // 1. SKILL TAXONOMY & ALIAS NORMALIZATION
  // ==============================================================================
  console.log('📦 Seeding Canonical Skill Taxonomy & Aliases...');
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
  // 2. SEED CANONICAL ADMIN IDENTITY
  // ==============================================================================
  console.log('👤 Seeding Canonical Admin User (@careerforge.ai)...');
  await prisma.user.create({
    data: {
      email: 'admin@careerforge.ai',
      passwordHash: DEMO_PASSWORD_HASH,
      role: UserRole.ADMIN,
      verified: true,
    },
  });

  // ==============================================================================
  // 3. SEED CANONICAL RECRUITERS & COMPANIES
  // ==============================================================================
  console.log('🏢 Seeding Canonical Recruiters & Companies...');
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

  const recruiterMap = new Map<string, string>(); // email -> recruiterProfileId
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
      recruiterMap.set(r.email, user.recruiterProfile.id);
    }
  }

  const techcorpRecruiterId = recruiterMap.get('recruiter.techcorp@careerforge.ai')!;
  const innovateRecruiterId = recruiterMap.get('recruiter.innovate@careerforge.ai')!;
  const cloudscaleRecruiterId = recruiterMap.get('recruiter.cloudscale@careerforge.ai')!;

  // ==============================================================================
  // 4. SEED CANONICAL JOBS WITH DETERMINISTIC SKILLS
  // ==============================================================================
  console.log('💼 Seeding Canonical Realistic Jobs...');
  const jobsData = [
    {
      key: 'job_fullstack',
      recruiterId: techcorpRecruiterId,
      title: 'Senior Full Stack Developer',
      companyName: 'TechCorp Solutions',
      location: 'San Francisco, CA',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 4,
      experienceMax: 8,
      salaryMin: 140000,
      salaryMax: 185000,
      status: JobStatus.PUBLISHED,
      description: 'We are seeking a seasoned Full Stack Engineer proficient in Next.js, React, Node.js, and PostgreSQL to scale our core web products.',
      requiredSkills: ['React', 'Next.js', 'TypeScript'],
      preferredSkills: ['Node.js', 'PostgreSQL', 'Docker'],
    },
    {
      key: 'job_backend',
      recruiterId: techcorpRecruiterId,
      title: 'Senior Backend Engineer (Node/TypeScript)',
      companyName: 'TechCorp Solutions',
      location: 'New York, NY',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 5,
      experienceMax: 10,
      salaryMin: 150000,
      salaryMax: 200000,
      status: JobStatus.PUBLISHED,
      description: 'Architect scalable microservices, manage PostgreSQL databases, Kafka streams, and high-performance REST APIs.',
      requiredSkills: ['Node.js', 'Express', 'TypeScript'],
      preferredSkills: ['PostgreSQL', 'Kafka', 'Redis'],
    },
    {
      key: 'job_genai',
      recruiterId: innovateRecruiterId,
      title: 'AI & GenAI Solutions Engineer',
      companyName: 'Innovate AI Labs',
      location: 'Austin, TX',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 3,
      experienceMax: 6,
      salaryMin: 160000,
      salaryMax: 210000,
      status: JobStatus.PUBLISHED,
      description: 'Lead the development of RAG pipelines, LLM fine-tuning, FAISS vector retrieval, and FastAPI orchestration.',
      requiredSkills: ['Python', 'FastAPI', 'RAG'],
      preferredSkills: ['LangChain', 'PostgreSQL', 'Docker'],
    },
    {
      key: 'job_python_backend',
      recruiterId: innovateRecruiterId,
      title: 'Python Backend Developer',
      companyName: 'Innovate AI Labs',
      location: 'Boston, MA',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 2,
      experienceMax: 5,
      salaryMin: 120000,
      salaryMax: 155000,
      status: JobStatus.PUBLISHED,
      description: 'Develop high-throughput REST APIs using FastAPI and async Python with relational data modeling.',
      requiredSkills: ['Python', 'FastAPI', 'PostgreSQL'],
      preferredSkills: ['Redis', 'REST APIs', 'Git'],
    },
    {
      key: 'job_frontend',
      recruiterId: cloudscaleRecruiterId,
      title: 'Frontend Engineer (React/Next.js)',
      companyName: 'CloudScale Global',
      location: 'Seattle, WA',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 3,
      experienceMax: 6,
      salaryMin: 130000,
      salaryMax: 165000,
      status: JobStatus.PUBLISHED,
      description: 'Craft responsive, accessible, high-performance dashboards using React, Next.js, and Tailwind CSS.',
      requiredSkills: ['React', 'Next.js', 'TypeScript'],
      preferredSkills: ['Tailwind CSS', 'JavaScript'],
    },
    {
      key: 'job_devops',
      recruiterId: cloudscaleRecruiterId,
      title: 'DevOps & Platform Engineer',
      companyName: 'CloudScale Global',
      location: 'Denver, CO',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 4,
      experienceMax: 8,
      salaryMin: 145000,
      salaryMax: 190000,
      status: JobStatus.PUBLISHED,
      description: 'Manage Kubernetes clusters, AWS infrastructure, CI/CD pipelines, and Kafka event streaming brokers.',
      requiredSkills: ['Docker', 'Kubernetes', 'AWS'],
      preferredSkills: ['Kafka', 'Git'],
    },
    {
      key: 'job_data',
      recruiterId: techcorpRecruiterId,
      title: 'Data & Analytics Engineer',
      companyName: 'TechCorp Solutions',
      location: 'Chicago, IL',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      experienceMin: 3,
      experienceMax: 7,
      salaryMin: 125000,
      salaryMax: 160000,
      status: JobStatus.PUBLISHED,
      description: 'Design analytical queries, ETL pipelines, and structured schemas across PostgreSQL and data pipelines.',
      requiredSkills: ['Python', 'PostgreSQL', 'REST APIs'],
      preferredSkills: ['Git', 'Problem Solving'],
    },
    {
      key: 'job_fullstack_draft',
      recruiterId: cloudscaleRecruiterId,
      title: 'Software Engineer (Full Stack)',
      companyName: 'CloudScale Global',
      location: 'Remote, US',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.CONTRACT,
      experienceMin: 2,
      experienceMax: 5,
      salaryMin: 110000,
      salaryMax: 140000,
      status: JobStatus.DRAFT,
      description: 'Build end-to-end features connecting React web interfaces to Node/Express REST backends.',
      requiredSkills: ['React', 'Node.js', 'TypeScript'],
      preferredSkills: ['PostgreSQL', 'Git'],
    },
  ];

  const jobMap = new Map<string, { id: string; title: string; slug: string }>();

  for (let idx = 0; idx < jobsData.length; idx++) {
    const j = jobsData[idx]!;
    const slug = `${j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idx + 1}`;

    const jobSkillsCreate = [
      ...j.requiredSkills.map((s) => ({
        skillId: createdSkills[s]!,
        required: true,
        importance: 'REQUIRED' as const,
        minimumYears: 2,
      })),
      ...j.preferredSkills.map((s) => ({
        skillId: createdSkills[s]!,
        required: false,
        importance: 'PREFERRED' as const,
        minimumYears: 1,
      })),
    ];

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
        status: j.status,
        publishedAt: j.status === JobStatus.PUBLISHED ? new Date('2026-09-01T00:00:00Z') : null,
        description: j.description,
        responsibilities: '- Architect and implement mission-critical production features\n- Collaborate cross-functionally with engineering and product leaders\n- Write unit, integration, and end-to-end tests',
        requirements: `- Strong foundational background in software engineering\n- ${j.experienceMin}+ years of demonstrated production experience`,
        benefits: '- Remote-first flexible culture\n- Comprehensive health, dental, and vision insurance\n- 401(k) matching and dedicated learning stipend',
        jobSkills: {
          create: jobSkillsCreate,
        },
      },
    });

    jobMap.set(j.key, { id: jobRecord.id, title: jobRecord.title, slug: jobRecord.slug });
  }

  // ==============================================================================
  // 5. SEED CANONICAL CANDIDATES & RESUMES & VECTOR CHUNKS
  // ==============================================================================
  console.log('👨‍💻 Seeding Canonical Candidates, Resumes, and Chunks...');
  const candidatesData = [
    {
      key: 'alex',
      email: 'candidate.alex@careerforge.ai',
      name: 'Alex Rivera',
      headline: 'Senior Full Stack & AI Engineer',
      summary: 'Passionate software architect with 6 years building modern React, Node, and Python RAG applications.',
      location: 'San Francisco, CA',
      experienceYears: 6,
      skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'PostgreSQL', 'RAG', 'Docker'],
      desiredJobTitles: ['Senior Full Stack Developer', 'AI Solutions Engineer', 'Full Stack Architect'],
      preferredLocations: ['San Francisco, CA', 'Remote'],
      preferredWorkModes: [WorkMode.REMOTE, WorkMode.HYBRID],
      chunks: [
        { section: 'summary', content: 'Alex Rivera — Senior Full Stack & AI Engineer with 6 years of experience specializing in Next.js, Node.js, PostgreSQL, and Python RAG pipelines.' },
        { section: 'skills', content: 'Technical Skills: React, Next.js, TypeScript, Node.js, Express, Python, FastAPI, PostgreSQL, RAG, Docker, REST APIs, Git.' },
        { section: 'experience', content: 'Apex Technologies (2021 - Present): Senior Software Engineer. Architected Next.js dashboard and Node/Express backend serving 200k monthly active users. Integrated FastAPI retrieval pipeline with PostgreSQL.' },
        { section: 'education', content: 'University of Science & Technology (2017 - 2021): Bachelor of Science in Computer Science, Magna Cum Laude, 3.8 GPA.' },
      ],
    },
    {
      key: 'priya',
      email: 'candidate.priya@careerforge.ai',
      name: 'Priya Sharma',
      headline: 'Machine Learning & GenAI Engineer',
      summary: 'Expert in LLM orchestration, LangChain, vector retrieval, and Python microservices.',
      location: 'Austin, TX',
      experienceYears: 4.5,
      skills: ['Python', 'FastAPI', 'LangChain', 'RAG', 'PostgreSQL', 'Docker', 'Redis'],
      desiredJobTitles: ['AI & GenAI Solutions Engineer', 'Machine Learning Engineer'],
      preferredLocations: ['Austin, TX', 'Remote'],
      preferredWorkModes: [WorkMode.REMOTE],
      chunks: [
        { section: 'summary', content: 'Priya Sharma — Machine Learning & GenAI Engineer specializing in LangChain orchestration, RAG architectures, and FastAPI microservices.' },
        { section: 'skills', content: 'Core Competencies: Python, FastAPI, LangChain, RAG, FAISS Vector Search, PostgreSQL, Docker, Redis, PyTorch.' },
        { section: 'experience', content: 'Cognitive Cloud (2022 - Present): ML Systems Engineer. Deployed production RAG pipelines with sub-200ms latency, handling semantic chunking and embedding caching with Redis.' },
        { section: 'education', content: 'Texas Tech Institute (2018 - 2022): Bachelor of Science in Artificial Intelligence & Data Science, 3.9 GPA.' },
      ],
    },
    {
      key: 'maya',
      email: 'maya.patel@careerforge.ai',
      name: 'Maya Patel',
      headline: 'Senior Backend & Cloud Infrastructure Engineer',
      summary: '5+ years specialized in distributed systems, PostgreSQL optimization, Kafka streaming, and Docker.',
      location: 'New York, NY',
      experienceYears: 5,
      skills: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Kafka', 'Docker', 'Redis'],
      desiredJobTitles: ['Senior Backend Engineer', 'Distributed Systems Architect'],
      preferredLocations: ['New York, NY', 'Remote'],
      preferredWorkModes: [WorkMode.REMOTE, WorkMode.HYBRID],
      chunks: [
        { section: 'summary', content: 'Maya Patel — Senior Backend Engineer with 5 years designing high-throughput distributed systems with Node.js, PostgreSQL, and Apache Kafka.' },
        { section: 'skills', content: 'Proficiencies: Node.js, Express, TypeScript, PostgreSQL, Kafka Streams, Docker, Redis Caching, Distributed Systems Design.' },
        { section: 'experience', content: 'Metropolis Data (2021 - Present): Backend Lead. Architected Kafka event streaming bus processing 5M daily events with zero data loss and automated DLQ recovery.' },
        { section: 'education', content: 'Columbia University (2017 - 2021): Bachelor of Science in Computer Engineering.' },
      ],
    },
    {
      key: 'liam',
      email: 'liam.smith@careerforge.ai',
      name: 'Liam Smith',
      headline: 'Frontend Specialist (React/Next.js)',
      summary: 'UI/UX focused engineer creating accessible and high-performance web applications.',
      location: 'Seattle, WA',
      experienceYears: 4,
      skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'JavaScript', 'Git'],
      desiredJobTitles: ['Frontend Engineer', 'UI/UX Engineer'],
      preferredLocations: ['Seattle, WA', 'Remote'],
      preferredWorkModes: [WorkMode.REMOTE],
      chunks: [
        { section: 'summary', content: 'Liam Smith — Frontend Specialist with 4 years creating responsive, accessible (WCAG 2.1 AA) applications using React and Next.js.' },
        { section: 'skills', content: 'Frontend Expertise: React 18, Next.js App Router, TypeScript, Tailwind CSS, Web Performance, WCAG Accessibility, Framer Motion.' },
        { section: 'experience', content: 'Pacific Digital (2022 - Present): Senior Frontend Developer. Led redesign of enterprise SaaS design system, improving lighthouse accessibility scores from 72 to 98.' },
        { section: 'education', content: 'University of Washington (2018 - 2022): Bachelor of Science in Human-Computer Interaction.' },
      ],
    },
    {
      key: 'marcus',
      email: 'marcus.vance@careerforge.ai',
      name: 'Marcus Vance',
      headline: 'DevOps & Site Reliability Engineer',
      summary: 'Automating multi-cloud Kubernetes deployments, Kafka monitoring, and CI/CD pipelines.',
      location: 'Denver, CO',
      experienceYears: 7,
      skills: ['Docker', 'Kubernetes', 'AWS', 'Kafka', 'Git', 'Problem Solving'],
      desiredJobTitles: ['DevOps & Platform Engineer', 'Site Reliability Engineer'],
      preferredLocations: ['Denver, CO', 'Remote'],
      preferredWorkModes: [WorkMode.REMOTE],
      chunks: [
        { section: 'summary', content: 'Marcus Vance — DevOps & SRE with 7 years automating multi-cloud Kubernetes deployments, Kafka clusters, and GitOps CI/CD pipelines.' },
        { section: 'skills', content: 'Infrastructure: Docker, Kubernetes, AWS EKS, Kafka, GitHub Actions, Terraform, Prometheus, Grafana.' },
        { section: 'experience', content: 'Summit Cloud Systems (2019 - Present): Staff SRE. Maintained 99.99% uptime across 12 production EKS clusters and automated disaster recovery.' },
        { section: 'education', content: 'Colorado State University (2014 - 2018): Bachelor of Science in Information Systems.' },
      ],
    },
  ];

  const candidateMap = new Map<string, { id: string; userId: string; resumeId: string; name: string }>();

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
            workMode: c.preferredWorkModes[0],
            experienceYears: c.experienceYears,
            preferences: {
              create: {
                desiredJobTitles: c.desiredJobTitles,
                preferredLocations: c.preferredLocations,
                preferredWorkModes: c.preferredWorkModes,
                preferredEmploymentTypes: [EmploymentType.FULL_TIME],
                minimumSalary: 120000,
                maximumSalary: 200000,
                currency: 'USD',
                willingToRelocate: false,
              },
            },
            skills: {
              create: c.skills.map((skillName) => ({
                skillId: createdSkills[skillName]!,
                proficiency: SkillProficiency.EXPERT,
                source: 'PROFILE',
              })),
            },
            experiences: {
              create: [
                {
                  company: 'Apex Technologies',
                  title: c.headline.split('&')[0]?.trim() || 'Software Engineer',
                  location: c.location,
                  startDate: new Date('2021-06-01T00:00:00Z'),
                  current: true,
                  description: 'Architecting scalable applications, microservices, and databases.',
                },
              ],
            },
            educations: {
              create: [
                {
                  institution: 'University of Science & Technology',
                  degree: 'Bachelor of Science',
                  fieldOfStudy: 'Computer Science',
                  startDate: new Date('2017-09-01T00:00:00Z'),
                  endDate: new Date('2021-05-30T00:00:00Z'),
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
                isActive: true,
                parsedResume: {
                  create: {
                    rawText: c.chunks.map((chk) => chk.content).join('\n\n'),
                    parsedData: {
                      name: c.name,
                      email: c.email,
                      skills: c.skills,
                      experienceYears: c.experienceYears,
                    },
                    parserVersion: '1.0.0',
                  },
                },
                resumeSkills: {
                  create: c.skills.map((skillName) => ({
                    skillId: createdSkills[skillName]!,
                    proficiency: 'Expert',
                    yearsOfExperience: c.experienceYears,
                    source: 'PARSED',
                  })),
                },
                chunks: {
                  create: c.chunks.map((chk, chunkIdx) => ({
                    content: chk.content,
                    section: chk.section,
                    chunkIndex: chunkIdx,
                    tokenCount: Math.round(chk.content.length / 4),
                    embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
                    embeddingVersion: 1,
                    isIndexed: true,
                    indexedAt: new Date('2026-09-01T00:00:00Z'),
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
      candidateMap.set(c.key, {
        id: user.candidateProfile.id,
        userId: user.id,
        resumeId: user.candidateProfile.resumes[0].id,
        name: user.candidateProfile.name,
      });
    }
  }

  const alex = candidateMap.get('alex')!;
  const priya = candidateMap.get('priya')!;
  const maya = candidateMap.get('maya')!;
  const liam = candidateMap.get('liam')!;
  const marcus = candidateMap.get('marcus')!;

  const fullstackJob = jobMap.get('job_fullstack')!;
  const backendJob = jobMap.get('job_backend')!;
  const genaiJob = jobMap.get('job_genai')!;
  const frontendJob = jobMap.get('job_frontend')!;
  const devopsJob = jobMap.get('job_devops')!;
  const pythonBackendJob = jobMap.get('job_python_backend')!;

  // ==============================================================================
  // 6. SEED REALISTIC APPLICATIONS & MATCH REPORTS (Deterministic 100-Point Formula)
  // ==============================================================================
  console.log('📊 Seeding Applications & Deterministic Match Reports...');

  // Application 1: Alex Rivera -> Senior Full Stack Developer (TechCorp) -> Status: OFFER
  const app1 = await prisma.application.create({
    data: {
      candidateId: alex.id,
      jobId: fullstackJob.id,
      resumeId: alex.resumeId,
      matchScore: 94.4,
      status: ApplicationStatus.OFFER,
      appliedAt: new Date('2026-08-10T10:00:00Z'),
      statusHistory: {
        create: [
          { oldStatus: null, newStatus: ApplicationStatus.APPLIED, changedBy: 'Alex Rivera', createdAt: new Date('2026-08-10T10:00:00Z') },
          { oldStatus: ApplicationStatus.APPLIED, newStatus: ApplicationStatus.SCREENING, changedBy: 'Sarah Jenkins', createdAt: new Date('2026-08-14T14:30:00Z') },
          { oldStatus: ApplicationStatus.SCREENING, newStatus: ApplicationStatus.INTERVIEW, changedBy: 'Sarah Jenkins', createdAt: new Date('2026-08-20T09:15:00Z') },
          { oldStatus: ApplicationStatus.INTERVIEW, newStatus: ApplicationStatus.OFFER, changedBy: 'Sarah Jenkins', createdAt: new Date('2026-08-28T16:00:00Z') },
        ],
      },
    },
  });

  // Formula: 96.0*0.40 + 92.0*0.25 + 95.0*0.20 + 90.0*0.10 + 100.0*0.05 = 38.4 + 23.0 + 19.0 + 9.0 + 5.0 = 94.40
  await prisma.matchReport.create({
    data: {
      candidateId: alex.id,
      jobId: fullstackJob.id,
      applicationId: app1.id,
      overallScore: 94.4,
      matchLevel: MatchLevel.EXCELLENT,
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
      explanation: 'Exceptional alignment across Next.js, React, Node.js, and PostgreSQL. Candidate meets all core full stack requirements.',
    },
  });

  // Application 2: Maya Patel -> Senior Backend Engineer (TechCorp) -> Status: INTERVIEW
  const app2 = await prisma.application.create({
    data: {
      candidateId: maya.id,
      jobId: backendJob.id,
      resumeId: maya.resumeId,
      matchScore: 91.2,
      status: ApplicationStatus.INTERVIEW,
      appliedAt: new Date('2026-08-15T11:00:00Z'),
      statusHistory: {
        create: [
          { oldStatus: null, newStatus: ApplicationStatus.APPLIED, changedBy: 'Maya Patel', createdAt: new Date('2026-08-15T11:00:00Z') },
          { oldStatus: ApplicationStatus.APPLIED, newStatus: ApplicationStatus.SCREENING, changedBy: 'Sarah Jenkins', createdAt: new Date('2026-08-18T10:00:00Z') },
          { oldStatus: ApplicationStatus.SCREENING, newStatus: ApplicationStatus.INTERVIEW, changedBy: 'Sarah Jenkins', createdAt: new Date('2026-08-25T15:00:00Z') },
        ],
      },
    },
  });

  // Formula: 93.0*0.40 + 89.0*0.25 + 90.0*0.20 + 90.0*0.10 + 95.0*0.05 = 37.2 + 22.25 + 18.0 + 9.0 + 4.75 = 91.20
  await prisma.matchReport.create({
    data: {
      candidateId: maya.id,
      jobId: backendJob.id,
      applicationId: app2.id,
      overallScore: 91.2,
      matchLevel: MatchLevel.EXCELLENT,
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

  // Application 3: Priya Sharma -> AI & GenAI Solutions Engineer (Innovate AI) -> Status: SCREENING
  const app3 = await prisma.application.create({
    data: {
      candidateId: priya.id,
      jobId: genaiJob.id,
      resumeId: priya.resumeId,
      matchScore: 95.85,
      status: ApplicationStatus.SCREENING,
      appliedAt: new Date('2026-08-22T09:30:00Z'),
      statusHistory: {
        create: [
          { oldStatus: null, newStatus: ApplicationStatus.APPLIED, changedBy: 'Priya Sharma', createdAt: new Date('2026-08-22T09:30:00Z') },
          { oldStatus: ApplicationStatus.APPLIED, newStatus: ApplicationStatus.SCREENING, changedBy: 'David Chen', createdAt: new Date('2026-08-26T11:00:00Z') },
        ],
      },
    },
  });

  // Formula: 98.0*0.40 + 95.0*0.25 + 92.0*0.20 + 95.0*0.10 + 100.0*0.05 = 39.2 + 23.75 + 18.4 + 9.5 + 5.0 = 95.85
  await prisma.matchReport.create({
    data: {
      candidateId: priya.id,
      jobId: genaiJob.id,
      applicationId: app3.id,
      overallScore: 95.85,
      matchLevel: MatchLevel.EXCELLENT,
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

  // Application 4: Liam Smith -> Frontend Engineer (CloudScale) -> Status: APPLIED
  const app4 = await prisma.application.create({
    data: {
      candidateId: liam.id,
      jobId: frontendJob.id,
      resumeId: liam.resumeId,
      matchScore: 91.6,
      status: ApplicationStatus.APPLIED,
      appliedAt: new Date('2026-08-29T14:00:00Z'),
      statusHistory: {
        create: [
          { oldStatus: null, newStatus: ApplicationStatus.APPLIED, changedBy: 'Liam Smith', createdAt: new Date('2026-08-29T14:00:00Z') },
        ],
      },
    },
  });

  // Formula: 95.0*0.40 + 90.0*0.25 + 88.0*0.20 + 85.0*0.10 + 100.0*0.05 = 38.0 + 22.5 + 17.6 + 8.5 + 5.0 = 91.60
  await prisma.matchReport.create({
    data: {
      candidateId: liam.id,
      jobId: frontendJob.id,
      applicationId: app4.id,
      overallScore: 91.6,
      matchLevel: MatchLevel.EXCELLENT,
      skillScore: 95.0,
      semanticScore: 90.0,
      experienceScore: 88.0,
      educationScore: 85.0,
      locationScore: 100.0,
      matchedSkills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'JavaScript'],
      missingSkills: [],
      experienceGaps: [],
      recommendation: RecommendationType.STRONGLY_APPLY,
      confidence: 0.93,
      explanation: 'Exceptional UI/UX background with Next.js and Tailwind CSS matching CloudScale requirements.',
    },
  });

  // ==============================================================================
  // 7. SEED DETERMINISTIC RECOMMENDATIONS (Deterministic 100-Point Formula)
  // ==============================================================================
  console.log('🎯 Seeding Canonical Job Recommendations...');
  // Formula: skill*0.40 + semantic*0.25 + exp*0.15 + pref*0.15 + fresh*0.05
  // Alex Rivera recommended for AI & GenAI Solutions Engineer
  // 88.0*0.40(35.2) + 86.0*0.25(21.5) + 90.0*0.15(13.5) + 95.0*0.15(14.25) + 90.0*0.05(4.5) = 88.95
  await prisma.jobRecommendation.create({
    data: {
      candidateId: alex.id,
      jobId: genaiJob.id,
      recommendationScore: 88.95,
      recommendationLevel: RecommendationLevel.EXCELLENT_MATCH,
      skillScore: 88.0,
      semanticScore: 86.0,
      experienceScore: 90.0,
      preferenceScore: 95.0,
      freshnessScore: 90.0,
      matchedSkills: ['Python', 'FastAPI', 'RAG', 'PostgreSQL', 'Docker'],
      missingSkills: ['LangChain'],
      reason: 'Strong technical match with your profile possessing key required skills (Python, FastAPI, RAG). Matches your remote work preferences.',
      source: 'HYBRID_ENGINE',
      engineVersion: '1.0',
    },
  });

  // Priya Sharma recommended for Python Backend Developer
  // 92.0*0.40(36.8) + 90.0*0.25(22.5) + 85.0*0.15(12.75) + 90.0*0.15(13.5) + 85.0*0.05(4.25) = 89.80
  await prisma.jobRecommendation.create({
    data: {
      candidateId: priya.id,
      jobId: pythonBackendJob.id,
      recommendationScore: 89.8,
      recommendationLevel: RecommendationLevel.EXCELLENT_MATCH,
      skillScore: 92.0,
      semanticScore: 90.0,
      experienceScore: 85.0,
      preferenceScore: 90.0,
      freshnessScore: 85.0,
      matchedSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis'],
      missingSkills: ['Git', 'REST APIs'],
      reason: 'High technical overlap with your background in async Python and FastAPI relational backends.',
      source: 'HYBRID_ENGINE',
      engineVersion: '1.0',
    },
  });

  // Marcus Vance recommended for DevOps & Platform Engineer
  // 96.0*0.40(38.4) + 92.0*0.25(23.0) + 95.0*0.15(14.25) + 100.0*0.15(15.0) + 90.0*0.05(4.5) = 95.15
  await prisma.jobRecommendation.create({
    data: {
      candidateId: marcus.id,
      jobId: devopsJob.id,
      recommendationScore: 95.15,
      recommendationLevel: RecommendationLevel.TOP_MATCH,
      skillScore: 96.0,
      semanticScore: 92.0,
      experienceScore: 95.0,
      preferenceScore: 100.0,
      freshnessScore: 90.0,
      matchedSkills: ['Docker', 'Kubernetes', 'AWS', 'Kafka', 'Git'],
      missingSkills: [],
      reason: 'Top match across container orchestration, cloud platform engineering, and event infrastructure.',
      source: 'HYBRID_ENGINE',
      engineVersion: '1.0',
    },
  });

  // ==============================================================================
  // 8. SEED SKILL GAPS & PERSONALIZED LEARNING PATHS
  // ==============================================================================
  console.log('📚 Seeding Skill Gaps & Personalized Learning Paths...');

  // Alex Rivera exploring DevOps & Platform Engineer role
  const alexDevopsAnalysis = await prisma.skillGapAnalysis.create({
    data: {
      candidateId: alex.id,
      jobId: devopsJob.id,
      overallReadiness: 72.5,
      readinessLevel: ReadinessLevel.NEARLY_READY,
      highPriorityCount: 2,
      mediumPriorityCount: 1,
      lowPriorityCount: 0,
      estimatedLearningHours: 35.0,
      engineVersion: '1.0',
      gaps: {
        create: [
          {
            skillId: createdSkills['Kubernetes'],
            skillName: 'Kubernetes',
            priority: GapPriority.HIGH,
            priorityScore: 85.0,
            requirementType: SkillRequirementType.REQUIRED,
            skillStatus: SkillGapStatus.MISSING,
            jobRelevance: 35.0,
            dependencyImportance: 25.0,
            semanticRelevance: 25.0,
            reason: 'Kubernetes is a critical required skill for this DevOps role and is missing from your active profile.',
          },
          {
            skillId: createdSkills['AWS'],
            skillName: 'AWS',
            priority: GapPriority.HIGH,
            priorityScore: 80.0,
            requirementType: SkillRequirementType.REQUIRED,
            skillStatus: SkillGapStatus.MISSING,
            jobRelevance: 30.0,
            dependencyImportance: 25.0,
            semanticRelevance: 25.0,
            reason: 'AWS cloud platform expertise is required for infrastructure provisioning and cluster deployment.',
          },
          {
            skillId: createdSkills['Kafka'],
            skillName: 'Kafka',
            priority: GapPriority.MEDIUM,
            priorityScore: 55.0,
            requirementType: SkillRequirementType.PREFERRED,
            skillStatus: SkillGapStatus.MISSING,
            jobRelevance: 20.0,
            dependencyImportance: 15.0,
            semanticRelevance: 20.0,
            reason: 'Kafka event streaming experience is preferred for telemetry and event-driven logging.',
          },
        ],
      },
    },
  });

  // Learning path attached to gap analysis
  await prisma.learningPath.create({
    data: {
      candidateId: alex.id,
      jobId: devopsJob.id,
      gapAnalysisId: alexDevopsAnalysis.id,
      status: LearningPathStatus.ACTIVE,
      totalEstimatedHours: 35.0,
      completedHours: 10.0,
      progressPercentage: 28.5,
      readinessBefore: 72.5,
      readinessTarget: 92.0,
      items: {
        create: [
          {
            skillId: createdSkills['Kubernetes'],
            skillName: 'Kubernetes',
            sequence: 1,
            estimatedHours: 20.0,
            priority: GapPriority.HIGH,
            status: LearningItemStatus.IN_PROGRESS,
          },
          {
            skillId: createdSkills['AWS'],
            skillName: 'AWS',
            sequence: 2,
            estimatedHours: 15.0,
            priority: GapPriority.HIGH,
            status: LearningItemStatus.NOT_STARTED,
          },
        ],
      },
    },
  });

  // ==============================================================================
  // 9. SEED GROUNDED AI MENTOR CONVERSATION
  // ==============================================================================
  console.log('🤖 Seeding Grounded AI Career Mentor Session...');
  const alexSession = await prisma.chatSession.create({
    data: {
      candidateId: alex.id,
      title: 'Senior Full Stack Role Fit Consultation',
      messages: {
        create: [
          {
            role: MessageRole.USER,
            content: 'How does my background in Next.js and PostgreSQL position me for the Senior Full Stack role at TechCorp Solutions?',
          },
          {
            role: MessageRole.ASSISTANT,
            content: 'Based on your verified CareerForge profile and resume, you have 6 years of experience building modern React, Next.js, and Node.js applications with relational PostgreSQL database modeling. TechCorp Solutions’ Senior Full Stack Developer position prioritizes React, Next.js, and PostgreSQL for their core web products. Your background aligns with their key technical requirements, representing an estimated 94.4% match.',
          },
        ],
      },
    },
  });

  console.log('✅ CareerForge AI Canonical Database Seeding Completed Successfully!');
  console.log(`
Canonical Demo Identities:
--------------------------------------------------
[Candidate]  candidate.alex@careerforge.ai     (Password: Password123!)
[Candidate]  candidate.priya@careerforge.ai    (Password: Password123!)
[Candidate]  maya.patel@careerforge.ai         (Password: Password123!)
[Candidate]  liam.smith@careerforge.ai         (Password: Password123!)
[Candidate]  marcus.vance@careerforge.ai       (Password: Password123!)
[Recruiter]  recruiter.techcorp@careerforge.ai (Password: Password123!)
[Recruiter]  recruiter.innovate@careerforge.ai (Password: Password123!)
[Recruiter]  recruiter.cloudscale@careerforge.ai (Password: Password123!)
[Admin]      admin@careerforge.ai              (Password: Password123!)
--------------------------------------------------
All identities strictly adhere to canonical domain @careerforge.ai
Idempotency: Guaranteed via deterministic reverse-relation cascade cleanup
`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
