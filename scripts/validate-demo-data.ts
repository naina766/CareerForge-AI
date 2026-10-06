import 'dotenv/config';
import { PrismaClient, UserRole, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationError {
  entity: string;
  id: string;
  field: string;
  issue: string;
}

async function validateDemoData() {
  console.log('🔍 Running CareerForge AI Demo Data Consistency Validation...\n');
  const errors: ValidationError[] = [];

  // 1. Audit Users & Canonical Email Domain
  const users = await prisma.user.findMany({
    include: { candidateProfile: true, recruiterProfile: true },
  });

  console.log(`[1/8] Validating ${users.length} Users & Canonical Domain (@careerforge.ai)...`);
  for (const user of users) {
    if (user.email.endsWith('@careerforge.io')) {
      errors.push({
        entity: 'User',
        id: user.id,
        field: 'email',
        issue: `Disallowed legacy domain @careerforge.io found: ${user.email}. Must use canonical @careerforge.ai.`,
      });
    }

    if (!user.email.endsWith('@careerforge.ai') && !user.email.endsWith('.internal')) {
      errors.push({
        entity: 'User',
        id: user.id,
        field: 'email',
        issue: `Non-canonical domain in user account: ${user.email}`,
      });
    }

    if (!['ADMIN', 'RECRUITER', 'CANDIDATE'].includes(user.role)) {
      errors.push({
        entity: 'User',
        id: user.id,
        field: 'role',
        issue: `Invalid user role: ${user.role}`,
      });
    }

    // Role-profile symmetry
    if (user.role === UserRole.CANDIDATE && !user.candidateProfile) {
      errors.push({
        entity: 'User',
        id: user.id,
        field: 'candidateProfile',
        issue: `Candidate user ${user.email} is missing a CandidateProfile.`,
      });
    }

    if (user.role === UserRole.RECRUITER && !user.recruiterProfile) {
      errors.push({
        entity: 'User',
        id: user.id,
        field: 'recruiterProfile',
        issue: `Recruiter user ${user.email} is missing a RecruiterProfile.`,
      });
    }
  }

  // 2. Audit Candidate Profiles & Career Preferences
  const candidates = await prisma.candidateProfile.findMany({
    include: {
      user: true,
      preferences: true,
      skills: { include: { skill: true } },
      resumes: { include: { chunks: true, parsedResume: true } },
    },
  });

  console.log(`[2/8] Validating ${candidates.length} Candidate Profiles, Skills, Resumes & Chunks...`);
  for (const cand of candidates) {
    if (!cand.user) {
      errors.push({
        entity: 'CandidateProfile',
        id: cand.id,
        field: 'userId',
        issue: `Candidate ${cand.name} has dangling userId ${cand.userId}`,
      });
    }

    if (!cand.preferences) {
      errors.push({
        entity: 'CandidateProfile',
        id: cand.id,
        field: 'preferences',
        issue: `Candidate ${cand.name} has no career preferences configured.`,
      });
    }

    if (cand.skills.length === 0) {
      errors.push({
        entity: 'CandidateProfile',
        id: cand.id,
        field: 'skills',
        issue: `Candidate ${cand.name} has 0 registered skills.`,
      });
    }

    // Verify Resumes and Chunks
    if (cand.resumes.length === 0) {
      errors.push({
        entity: 'CandidateProfile',
        id: cand.id,
        field: 'resumes',
        issue: `Candidate ${cand.name} has no active resume on file.`,
      });
    }

    for (const res of cand.resumes) {
      if (res.candidateId !== cand.id) {
        errors.push({
          entity: 'Resume',
          id: res.id,
          field: 'candidateId',
          issue: `Resume candidateId mismatch: ${res.candidateId} vs ${cand.id}`,
        });
      }

      if (res.chunks.length === 0) {
        errors.push({
          entity: 'Resume',
          id: res.id,
          field: 'chunks',
          issue: `Resume ${res.id} for ${cand.name} has 0 vector chunks.`,
        });
      }
    }
  }

  // 3. Audit Recruiters & Jobs
  const recruiters = await prisma.recruiterProfile.findMany({
    include: { user: true, jobs: { include: { jobSkills: { include: { skill: true } } } } },
  });

  console.log(`[3/8] Validating ${recruiters.length} Recruiters & Job Postings...`);
  for (const rec of recruiters) {
    if (!rec.companyName || rec.companyName.trim() === '') {
      errors.push({
        entity: 'RecruiterProfile',
        id: rec.id,
        field: 'companyName',
        issue: `Recruiter ${rec.name} has blank company name.`,
      });
    }

    for (const job of rec.jobs) {
      if (job.recruiterId !== rec.id) {
        errors.push({
          entity: 'Job',
          id: job.id,
          field: 'recruiterId',
          issue: `Job ${job.title} recruiterId mismatch: ${job.recruiterId} vs ${rec.id}`,
        });
      }

      if (job.jobSkills.length === 0) {
        errors.push({
          entity: 'Job',
          id: job.id,
          field: 'jobSkills',
          issue: `Job ${job.title} has 0 required/preferred skills.`,
        });
      }
    }
  }

  // 4. Audit Applications & Ownership Consistency
  const applications = await prisma.application.findMany({
    include: {
      candidate: true,
      job: true,
      resume: true,
      statusHistory: true,
    },
  });

  console.log(`[4/8] Validating ${applications.length} Applications & Lifecycles...`);
  for (const app of applications) {
    if (!app.candidate) {
      errors.push({
        entity: 'Application',
        id: app.id,
        field: 'candidateId',
        issue: `Application references non-existent candidate ${app.candidateId}`,
      });
    }

    if (!app.job) {
      errors.push({
        entity: 'Application',
        id: app.id,
        field: 'jobId',
        issue: `Application references non-existent job ${app.jobId}`,
      });
    }

    if (!app.resume || app.resume.candidateId !== app.candidateId) {
      errors.push({
        entity: 'Application',
        id: app.id,
        field: 'resumeId',
        issue: `Application resume ${app.resumeId} does not belong to candidate ${app.candidateId}`,
      });
    }

    if (app.statusHistory.length === 0) {
      errors.push({
        entity: 'Application',
        id: app.id,
        field: 'statusHistory',
        issue: `Application ${app.id} has no status history records.`,
      });
    }
  }

  // 5. Audit Match Reports (Deterministic Formula Compliance)
  const matchReports = await prisma.matchReport.findMany();
  console.log(`[5/8] Validating ${matchReports.length} Deterministic Match Reports...`);
  for (const rep of matchReports) {
    // Deterministic Formula: skill*0.40 + semantic*0.25 + exp*0.20 + edu*0.10 + loc*0.05
    const expected =
      Math.round(
        (rep.skillScore * 0.4 +
          rep.semanticScore * 0.25 +
          rep.experienceScore * 0.2 +
          rep.educationScore * 0.1 +
          rep.locationScore * 0.05) *
          100
      ) / 100;

    const diff = Math.abs(rep.overallScore - expected);
    if (diff > 0.05) {
      errors.push({
        entity: 'MatchReport',
        id: rep.id,
        field: 'overallScore',
        issue: `Match report score ${rep.overallScore} deviates from deterministic formula expected ${expected} (diff: ${diff.toFixed(3)})`,
      });
    }
  }

  // 6. Audit Recommendations (Deterministic Formula Compliance)
  const recommendations = await prisma.jobRecommendation.findMany();
  console.log(`[6/8] Validating ${recommendations.length} Deterministic Job Recommendations...`);
  for (const rec of recommendations) {
    // Formula: skill*0.40 + semantic*0.25 + exp*0.15 + pref*0.15 + fresh*0.05
    const expected =
      Math.round(
        (rec.skillScore * 0.4 +
          rec.semanticScore * 0.25 +
          rec.experienceScore * 0.15 +
          rec.preferenceScore * 0.15 +
          rec.freshnessScore * 0.05) *
          100
      ) / 100;

    const diff = Math.abs(rec.recommendationScore - expected);
    if (diff > 0.05) {
      errors.push({
        entity: 'JobRecommendation',
        id: rec.id,
        field: 'recommendationScore',
        issue: `Recommendation score ${rec.recommendationScore} deviates from formula expected ${expected} (diff: ${diff.toFixed(3)})`,
      });
    }
  }

  // 7. Audit Skill Gaps & Learning Paths
  const gapAnalyses = await prisma.skillGapAnalysis.findMany({
    include: { gaps: true, learningPath: { include: { items: true } } },
  });

  console.log(`[7/8] Validating ${gapAnalyses.length} Skill Gap Analyses & Learning Paths...`);
  for (const ga of gapAnalyses) {
    if (ga.gaps.length === 0) {
      errors.push({
        entity: 'SkillGapAnalysis',
        id: ga.id,
        field: 'gaps',
        issue: `Skill gap analysis ${ga.id} has 0 identified gaps.`,
      });
    }

    if (ga.learningPath) {
      if (ga.learningPath.candidateId !== ga.candidateId || ga.learningPath.jobId !== ga.jobId) {
        errors.push({
          entity: 'LearningPath',
          id: ga.learningPath.id,
          field: 'candidateId/jobId',
          issue: `Learning path does not match gap analysis candidate/job pairing.`,
        });
      }

      if (ga.learningPath.items.length === 0) {
        errors.push({
          entity: 'LearningPath',
          id: ga.learningPath.id,
          field: 'items',
          issue: `Learning path ${ga.learningPath.id} has 0 items.`,
        });
      }
    }
  }

  // 8. Audit Chat Sessions & AI Conversations
  const chatSessions = await prisma.chatSession.findMany({
    include: { messages: true, candidate: true },
  });

  console.log(`[8/8] Validating ${chatSessions.length} AI Mentor Chat Sessions...`);
  for (const cs of chatSessions) {
    if (!cs.candidate) {
      errors.push({
        entity: 'ChatSession',
        id: cs.id,
        field: 'candidateId',
        issue: `Chat session ${cs.id} belongs to nonexistent candidate ${cs.candidateId}`,
      });
    }

    if (cs.messages.length === 0) {
      errors.push({
        entity: 'ChatSession',
        id: cs.id,
        field: 'messages',
        issue: `Chat session ${cs.id} contains 0 messages.`,
      });
    }
  }

  // Final Summary
  console.log('\n============================================================');
  console.log('              DEMO DATA CONSISTENCY SUMMARY                 ');
  console.log('============================================================');
  if (errors.length === 0) {
    console.log('✅ ALL DEMO DATA IS 100% CONSISTENT, DETERMINISTIC & SAFE!');
    console.log(`- Canonical Users: ${users.length}`);
    console.log(`- Candidates: ${candidates.length}`);
    console.log(`- Recruiters: ${recruiters.length}`);
    console.log(`- Job Vacancies: ${recruiters.reduce((acc, r) => acc + r.jobs.length, 0)}`);
    console.log(`- Applications: ${applications.length}`);
    console.log(`- Match Reports: ${matchReports.length}`);
    console.log(`- Recommendations: ${recommendations.length}`);
    console.log(`- Skill Gap Analyses: ${gapAnalyses.length}`);
    console.log(`- AI Mentor Sessions: ${chatSessions.length}`);
    console.log('============================================================\n');
  } else {
    console.error(`❌ FOUND ${errors.length} DEMO DATA INCONSISTENCIES:`);
    for (const err of errors) {
      console.error(`  • [${err.entity}] ID: ${err.id} | Field: ${err.field} => ${err.issue}`);
    }
    console.error('============================================================\n');
    process.exit(1);
  }
}

validateDemoData()
  .catch((e) => {
    console.error('Fatal validation error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
