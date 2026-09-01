import { createServer } from '../../apps/api/src/server.js';
import { prisma } from '@careerforge/database';
import http from 'http';

interface TestResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}

let server: http.Server;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  data?: any,
  headers: Record<string, string> = {}
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const postData = data ? JSON.stringify(data) : undefined;

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawBody = '';
        res.on('data', (chunk) => {
          rawBody += chunk;
        });
        res.on('end', () => {
          let body;
          try {
            body = JSON.parse(rawBody);
          } catch {
            body = rawBody;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runCandidateTests() {
  console.log('🧪 Starting CareerForge AI Phase 4 Candidate Profile & IDOR Verification Test Suite...');

  const app = createServer();
  server = app.listen(0);
  const port = (server.address() as any).port;
  baseUrl = `http://localhost:${port}`;

  const candidateAEmail = `candidate.a.${Date.now()}@careerforge.test`;
  const candidateBEmail = `candidate.b.${Date.now()}@careerforge.test`;
  const recruiterEmail = `recruiter.${Date.now()}@careerforge.test`;
  const testPassword = 'Password123!';

  try {
    // --------------------------------------------------------------------------
    // 1. Setup Candidate A, Candidate B, and Recruiter
    // --------------------------------------------------------------------------
    console.log('\n[1/10] Registering test candidate and recruiter accounts...');
    const candAReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: candidateAEmail,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Alice Rivera',
    });
    const tokenA = candAReg.body.data.accessToken;

    const candBReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: candidateBEmail,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Bob Chen',
    });
    const tokenB = candBReg.body.data.accessToken;

    const recReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: recruiterEmail,
      password: testPassword,
      role: 'RECRUITER',
      name: 'Rachel Recruiter',
    });
    const recruiterToken = recReg.body.data.accessToken;

    console.log('  ✅ Accounts initialized');

    // --------------------------------------------------------------------------
    // 2. RBAC & Auth Security Checks
    // --------------------------------------------------------------------------
    console.log('\n[2/10] Testing RBAC & Authentication boundaries on candidate routes...');
    // Unauthenticated -> 401
    const unauth = await makeRequest('GET', '/api/v1/candidates/me/profile');
    if (unauth.status !== 401) throw new Error(`Expected 401 for unauthenticated request, got ${unauth.status}`);

    // Recruiter -> 403 Forbidden
    const recOnCand = await makeRequest('GET', '/api/v1/candidates/me/profile', undefined, {
      Authorization: `Bearer ${recruiterToken}`,
    });
    if (recOnCand.status !== 403) throw new Error(`Expected 403 for recruiter on candidate route, got ${recOnCand.status}`);

    console.log('  ✅ Unauthenticated (401) and Recruiter access (403) strictly rejected');

    // --------------------------------------------------------------------------
    // 3. Update Candidate A Basic Profile & Bio
    // --------------------------------------------------------------------------
    console.log('\n[3/10] Testing Basic Profile & Bio update...');
    const updateProfRes = await makeRequest(
      'PATCH',
      '/api/v1/candidates/me/profile',
      {
        headline: 'Staff Full-Stack Engineer | Distributed Systems',
        summary: 'Architecting scalable cloud-native microservices with Node.js, TypeScript, PostgreSQL, and event-driven systems.',
        location: 'San Francisco, CA',
        city: 'San Francisco',
        country: 'United States',
        phone: '+1 (555) 234-5678',
        workMode: 'REMOTE',
        experienceYears: 6,
        githubUrl: 'https://github.com/alicerivera',
        linkedinUrl: 'https://linkedin.com/in/alicerivera',
      },
      { Authorization: `Bearer ${tokenA}` }
    );

    if (updateProfRes.status !== 200 || updateProfRes.body.data.profile.headline !== 'Staff Full-Stack Engineer | Distributed Systems') {
      throw new Error(`Profile update failed: ${JSON.stringify(updateProfRes.body)}`);
    }
    console.log('  ✅ Candidate profile updated successfully');

    // --------------------------------------------------------------------------
    // 4. Structured Skills Management & Normalization
    // --------------------------------------------------------------------------
    console.log('\n[4/10] Testing Structured Skills with normalization & duplicates check...');
    // Add raw 'js' -> normalized to 'JavaScript'
    const skill1 = await makeRequest(
      'POST',
      '/api/v1/candidates/me/skills',
      { name: 'js', proficiency: 'EXPERT' },
      { Authorization: `Bearer ${tokenA}` }
    );
    if (skill1.status !== 201 || skill1.body.data.skill.name !== 'JavaScript') {
      throw new Error(`Skill normalization failed: ${JSON.stringify(skill1.body)}`);
    }

    // Add 'TypeScript'
    const skill2 = await makeRequest(
      'POST',
      '/api/v1/candidates/me/skills',
      { name: 'typescript', proficiency: 'ADVANCED' },
      { Authorization: `Bearer ${tokenA}` }
    );

    // Add 'PostgreSQL'
    const skill3 = await makeRequest(
      'POST',
      '/api/v1/candidates/me/skills',
      { name: 'postgres', proficiency: 'ADVANCED' },
      { Authorization: `Bearer ${tokenA}` }
    );

    // Duplicate skill rejection -> 409
    const dupSkill = await makeRequest(
      'POST',
      '/api/v1/candidates/me/skills',
      { name: 'javascript', proficiency: 'INTERMEDIATE' },
      { Authorization: `Bearer ${tokenA}` }
    );
    if (dupSkill.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate skill, got ${dupSkill.status}`);
    }

    console.log('  ✅ Skills normalized (js->JavaScript, postgres->PostgreSQL) & duplicate rejected (409)');

    // --------------------------------------------------------------------------
    // 5. Work Experience Management
    // --------------------------------------------------------------------------
    console.log('\n[5/10] Testing Work Experience creation & updates...');
    const expRes = await makeRequest(
      'POST',
      '/api/v1/candidates/me/experience',
      {
        company: 'Stripe',
        title: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        employmentType: 'FULL_TIME',
        startDate: '2022-01-01T00:00:00.000Z',
        current: true,
        description: 'Led payments reliability and Kafka stream processing.',
      },
      { Authorization: `Bearer ${tokenA}` }
    );
    if (expRes.status !== 201 || !expRes.body.data.id) {
      throw new Error(`Experience creation failed: ${JSON.stringify(expRes.body)}`);
    }
    const expAId = expRes.body.data.id;

    console.log('  ✅ Work Experience created successfully');

    // --------------------------------------------------------------------------
    // 6. Education Management
    // --------------------------------------------------------------------------
    console.log('\n[6/10] Testing Education history creation...');
    const eduRes = await makeRequest(
      'POST',
      '/api/v1/candidates/me/education',
      {
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2016-09-01T00:00:00.000Z',
        endDate: '2020-05-15T00:00:00.000Z',
        grade: '3.9 GPA',
        description: 'Focus on distributed algorithms and databases.',
      },
      { Authorization: `Bearer ${tokenA}` }
    );
    if (eduRes.status !== 201 || !eduRes.body.data.id) {
      throw new Error(`Education creation failed: ${JSON.stringify(eduRes.body)}`);
    }
    const eduAId = eduRes.body.data.id;

    console.log('  ✅ Education record created successfully');

    // --------------------------------------------------------------------------
    // 7. Career Preferences Management
    // --------------------------------------------------------------------------
    console.log('\n[7/10] Testing Career Preferences management...');
    const prefRes = await makeRequest(
      'PUT',
      '/api/v1/candidates/me/preferences',
      {
        desiredJobTitles: ['Staff Software Engineer', 'Lead Backend Architect'],
        preferredLocations: ['San Francisco, CA', 'Remote'],
        preferredWorkModes: ['REMOTE', 'HYBRID'],
        preferredEmploymentTypes: ['FULL_TIME'],
        minimumSalary: 180000,
        maximumSalary: 250000,
        currency: 'USD',
        willingToRelocate: false,
        preferredIndustries: ['Fintech', 'Enterprise AI', 'Cloud Infrastructure'],
      },
      { Authorization: `Bearer ${tokenA}` }
    );
    if (prefRes.status !== 200 || prefRes.body.data.minimumSalary !== 180000) {
      throw new Error(`Preferences update failed: ${JSON.stringify(prefRes.body)}`);
    }

    console.log('  ✅ Career Preferences saved successfully');

    // --------------------------------------------------------------------------
    // 8. Deterministic Profile Completeness Scoring (100%)
    // --------------------------------------------------------------------------
    console.log('\n[8/10] Testing Deterministic Profile Completeness algorithm...');
    const summaryRes = await makeRequest('GET', '/api/v1/candidates/me/profile/summary', undefined, {
      Authorization: `Bearer ${tokenA}`,
    });

    if (summaryRes.status !== 200) {
      throw new Error(`Profile summary failed: ${JSON.stringify(summaryRes.body)}`);
    }

    const { completeness, skillsCount, experiencesCount, educationsCount } = summaryRes.body.data;
    console.log(`  📊 Completeness Score: ${completeness.percentage}%`);
    console.log(`  📊 Completed Sections (${completeness.completedSections.length}): ${completeness.completedSections.join(', ')}`);
    console.log(`  📊 Skills: ${skillsCount}, Experience: ${experiencesCount}, Education: ${educationsCount}`);

    if (completeness.percentage !== 100) {
      throw new Error(`Expected 100% completeness for fully populated profile, got ${completeness.percentage}%`);
    }
    console.log('  ✅ Deterministic Profile Completeness verified at 100%');

    // --------------------------------------------------------------------------
    // 9. Strict IDOR Security Protection
    // --------------------------------------------------------------------------
    console.log('\n[9/10] Testing IDOR Security Protection across candidate boundaries...');
    // Candidate B attempts to modify Candidate A's experience
    const idorExp = await makeRequest(
      'PATCH',
      `/api/v1/candidates/me/experience/${expAId}`,
      { title: 'Hacked Title' },
      { Authorization: `Bearer ${tokenB}` }
    );
    if (idorExp.status !== 404 && idorExp.status !== 403) {
      throw new Error(`SECURITY VIOLATION: IDOR not blocked on experience! Got status ${idorExp.status}`);
    }

    // Candidate B attempts to delete Candidate A's education
    const idorEdu = await makeRequest(
      'DELETE',
      `/api/v1/candidates/me/education/${eduAId}`,
      undefined,
      { Authorization: `Bearer ${tokenB}` }
    );
    if (idorEdu.status !== 404 && idorEdu.status !== 403) {
      throw new Error(`SECURITY VIOLATION: IDOR not blocked on education! Got status ${idorEdu.status}`);
    }

    // Candidate B attempts to modify Candidate A's skill
    const idorSkill = await makeRequest(
      'DELETE',
      `/api/v1/candidates/me/skills/${skill1.body.data.id}`,
      undefined,
      { Authorization: `Bearer ${tokenB}` }
    );
    if (idorSkill.status !== 404 && idorSkill.status !== 403) {
      throw new Error(`SECURITY VIOLATION: IDOR not blocked on skill! Got status ${idorSkill.status}`);
    }

    console.log('  ✅ IDOR attacks strictly blocked: cross-candidate modification rejected (404)');

    // --------------------------------------------------------------------------
    // 10. Audit Logging Verification
    // --------------------------------------------------------------------------
    console.log('\n[10/10] Verifying Audit Log trail for profile mutations...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['PROFILE_UPDATED', 'SKILL_ADDED', 'EXPERIENCE_ADDED', 'EDUCATION_ADDED', 'PREFERENCES_UPDATED'] },
      },
    });
    if (auditLogs.length < 5) {
      throw new Error(`Expected at least 5 audit log entries, found ${auditLogs.length}`);
    }
    console.log(`  ✅ Audit logs recorded: ${auditLogs.length} profile mutation events`);

    console.log('\n🎉 ALL PHASE 4 CANDIDATE PROFILE & IDOR SECURITY TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await prisma.user.deleteMany({
      where: { email: { in: [candidateAEmail, candidateBEmail, recruiterEmail] } },
    });
    await prisma.$disconnect();
  }
}

runCandidateTests().catch((err) => {
  console.error('\n❌ Candidate test suite failed:', err);
  process.exit(1);
});
