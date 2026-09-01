import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';

let server: http.Server;
const PORT = 4016;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    let postData: string | undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (body !== undefined) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsedBody = data;
          try {
            parsedBody = JSON.parse(data);
          } catch {
            // Raw text
          }
          resolve({
            status: res.statusCode || 500,
            body: parsedBody,
            headers: res.headers,
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

async function runRecruiterJobsTests() {
  console.log('--- STARTING PHASE 10: RECRUITER JOB LIFECYCLE MANAGEMENT INTEGRATION TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const testEmailRecruiterA = `recruiter_a_${Date.now()}@example.com`;
  const testEmailRecruiterB = `recruiter_b_${Date.now()}@example.com`;
  const testEmailCandidate = `candidate_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let recruiterTokenA = '';
  let recruiterTokenB = '';
  let candidateToken = '';

  let createdJobId = '';

  try {
    // -------------------------------------------------------------------------
    // [1/10] Provision Accounts (Recruiter A, Recruiter B, Candidate)
    // -------------------------------------------------------------------------
    console.log('\n[1/10] Provisioning test accounts...');
    const recAReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailRecruiterA,
      password: testPassword,
      role: 'RECRUITER',
      name: 'Sarah Hiring Manager',
    });
    assert.strictEqual(recAReg.status, 201);
    recruiterTokenA = recAReg.body.data.accessToken;

    const recBReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailRecruiterB,
      password: testPassword,
      role: 'RECRUITER',
      name: 'Dave Tech Lead',
    });
    assert.strictEqual(recBReg.status, 201);
    recruiterTokenB = recBReg.body.data.accessToken;

    const candReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidate,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Alex JobSeeker',
    });
    assert.strictEqual(candReg.status, 201);
    candidateToken = candReg.body.data.accessToken;
    console.log('  ✅ Recruiter A, Recruiter B, and Candidate provisioned');

    // -------------------------------------------------------------------------
    // [2/10] RBAC: Candidate Attempting Recruiter Actions -> 403
    // -------------------------------------------------------------------------
    console.log('\n[2/10] Testing RBAC: Candidate cannot create recruiter jobs...');
    const candCreateRes = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Unauthorized Candidate Job',
        description: 'Candidate should not be allowed to post jobs on the platform.',
      },
      { Authorization: `Bearer ${candidateToken}` }
    );
    assert.strictEqual(candCreateRes.status, 403);
    console.log('  ✅ Candidate correctly rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // [3/10] Create Job with Canonical Skill Normalization & Validation
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Recruiter A creating job with canonical skill normalization...');
    const createJobRes = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Senior Full Stack Engineer',
        description: 'Lead backend microservices and modern React frontend architectures.',
        responsibilities: '- Build high-performance REST and GraphQL APIs\n- Maintain scalable database models',
        requirements: '- 4+ years software development experience\n- Strong TypeScript skills',
        benefits: '- Remote flexibility\n- Comprehensive health insurance',
        companyName: 'Apex Cloud Solutions',
        location: 'San Francisco, CA / Remote',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        experienceMin: 3,
        experienceMax: 7,
        salaryMin: 120000,
        salaryMax: 160000,
        currency: 'USD',
        salaryPeriod: 'YEARLY',
        status: 'DRAFT',
        skills: [
          { name: 'ReactJS', importance: 'REQUIRED', minimumYears: 3 },
          { name: 'NodeJS', importance: 'REQUIRED', minimumYears: 3 },
          { name: 'PostgreSQL', importance: 'REQUIRED', minimumYears: 2 },
          { name: 'Docker', importance: 'PREFERRED', minimumYears: 1 },
          { name: 'React', importance: 'REQUIRED', minimumYears: 3 }, // Duplicate check
        ],
      },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );

    assert.strictEqual(createJobRes.status, 201);
    assert.strictEqual(createJobRes.body.success, true);
    createdJobId = createJobRes.body.data.id;
    assert.strictEqual(createJobRes.body.data.status, 'DRAFT');
    assert.ok(createJobRes.body.data.slug.includes('senior-full-stack-engineer'));
    assert.ok(createJobRes.body.data.jobSkills.length === 4); // Deduplicated ReactJS + React
    console.log(`  ✅ Job created as DRAFT (${createdJobId}) with 4 deduplicated canonical skills`);

    // -------------------------------------------------------------------------
    // [4/10] State Machine Status Transitions
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Testing state machine status transitions...');

    // 1. DRAFT -> PUBLISHED (Valid)
    const pubRes = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}/status`,
      { status: 'PUBLISHED' },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.body.data.status, 'PUBLISHED');
    assert.ok(pubRes.body.data.publishedAt !== null);
    console.log('  ✅ DRAFT -> PUBLISHED: Success');

    // 2. PUBLISHED -> PAUSED (Valid)
    const pauseRes = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}/status`,
      { status: 'PAUSED' },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.body.data.status, 'PAUSED');
    console.log('  ✅ PUBLISHED -> PAUSED: Success');

    // 3. PAUSED -> PUBLISHED (Valid Reopen)
    const reopenRes = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}/status`,
      { status: 'PUBLISHED' },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(reopenRes.status, 200);
    assert.strictEqual(reopenRes.body.data.status, 'PUBLISHED');
    console.log('  ✅ PAUSED -> PUBLISHED: Success');

    // 4. PUBLISHED -> CLOSED (Valid)
    const closeRes = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}/status`,
      { status: 'CLOSED' },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(closeRes.status, 200);
    assert.strictEqual(closeRes.body.data.status, 'CLOSED');
    assert.ok(closeRes.body.data.closedAt !== null);
    console.log('  ✅ PUBLISHED -> CLOSED: Success');

    // 5. CLOSED -> PUBLISHED (Invalid Transition -> 400)
    const invalidPub = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}/status`,
      { status: 'PUBLISHED' },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(invalidPub.status, 400);
    console.log('  ✅ Rejected invalid CLOSED -> PUBLISHED transition with 400');

    // 6. CLOSED -> ARCHIVED (Valid)
    const archRes = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}/archive`,
      {},
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(archRes.status, 200);
    assert.strictEqual(archRes.body.data.status, 'ARCHIVED');
    assert.ok(archRes.body.data.archivedAt !== null);
    console.log('  ✅ CLOSED -> ARCHIVED: Success');

    // 7. ARCHIVED -> PUBLISHED (Invalid Transition -> 400)
    const invalidArch = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}/status`,
      { status: 'PUBLISHED' },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(invalidArch.status, 400);
    console.log('  ✅ Rejected invalid ARCHIVED -> PUBLISHED transition with 400');

    // -------------------------------------------------------------------------
    // [5/10] Multi-Tenant Recruiter Ownership Isolation
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Testing multi-tenant recruiter ownership isolation...');

    // Recruiter B attempting to view Recruiter A's job -> 403
    const recBGet = await makeRequest(
      'GET',
      `/api/v1/recruiter/jobs/${createdJobId}`,
      undefined,
      { Authorization: `Bearer ${recruiterTokenB}` }
    );
    assert.strictEqual(recBGet.status, 403);

    // Recruiter B attempting to update Recruiter A's job -> 403
    const recBUpdate = await makeRequest(
      'PATCH',
      `/api/v1/recruiter/jobs/${createdJobId}`,
      { title: 'Hacked Title' },
      { Authorization: `Bearer ${recruiterTokenB}` }
    );
    assert.strictEqual(recBUpdate.status, 403);

    // Recruiter B attempting to duplicate Recruiter A's job -> 403
    const recBDup = await makeRequest(
      'POST',
      `/api/v1/recruiter/jobs/${createdJobId}/duplicate`,
      {},
      { Authorization: `Bearer ${recruiterTokenB}` }
    );
    assert.strictEqual(recBDup.status, 403);
    console.log('  ✅ Recruiter ownership enforcement verified (403 Forbidden for cross-tenant mutations)');

    // -------------------------------------------------------------------------
    // [6/10] Duplicate Job Functionality
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Testing job duplication...');
    const dupRes = await makeRequest(
      'POST',
      `/api/v1/recruiter/jobs/${createdJobId}/duplicate`,
      {},
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(dupRes.status, 201);
    assert.strictEqual(dupRes.body.data.status, 'DRAFT');
    assert.notStrictEqual(dupRes.body.data.id, createdJobId);
    assert.strictEqual(dupRes.body.data.publishedAt, null);
    assert.strictEqual(dupRes.body.data.closedAt, null);
    assert.strictEqual(dupRes.body.data.archivedAt, null);
    assert.ok(dupRes.body.data.slug !== createJobRes.body.data.slug);
    assert.strictEqual(dupRes.body.data.jobSkills.length, 4);
    console.log(`  ✅ Job duplicated as fresh DRAFT with new ID ${dupRes.body.data.id} and copied skills`);

    // -------------------------------------------------------------------------
    // [7/10] List Jobs with Search and Status Filtering
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Testing job listing with filtering, search, and pagination...');
    const listAll = await makeRequest(
      'GET',
      '/api/v1/recruiter/jobs?status=ALL&page=1&limit=10',
      undefined,
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(listAll.status, 200);
    assert.ok(listAll.body.data.total >= 2);

    const listDrafts = await makeRequest(
      'GET',
      '/api/v1/recruiter/jobs?status=DRAFT',
      undefined,
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(listDrafts.status, 200);
    assert.ok(listDrafts.body.data.items.every((j: any) => j.status === 'DRAFT'));

    const searchRes = await makeRequest(
      'GET',
      '/api/v1/recruiter/jobs?search=Full+Stack',
      undefined,
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.data.items.length >= 1);
    console.log('  ✅ Listing, filtering by DRAFT, and title search verified');

    // -------------------------------------------------------------------------
    // [8/10] Recruiter Dashboard Statistics Endpoint
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Testing GET /api/v1/recruiter/jobs/stats...');
    const statsRes = await makeRequest(
      'GET',
      '/api/v1/recruiter/jobs/stats',
      undefined,
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsRes.body.data.totalJobs >= 2);
    assert.ok(statsRes.body.data.drafts >= 1);
    assert.ok(statsRes.body.data.archived >= 1);
    console.log(`  ✅ Stats verified: Total=${statsRes.body.data.totalJobs}, Drafts=${statsRes.body.data.drafts}, Archived=${statsRes.body.data.archived}`);

    // -------------------------------------------------------------------------
    // [9/10] Validation Constraints (Experience & Salary Bounds)
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Testing input validation constraints...');
    const invalidExp = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Invalid Experience Job',
        description: 'Testing experience min > max',
        experienceMin: 5,
        experienceMax: 2, // invalid
      },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(invalidExp.status, 400);

    const invalidSalary = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Invalid Salary Job',
        description: 'Testing salary min > max',
        salaryMin: 150000,
        salaryMax: 90000, // invalid
      },
      { Authorization: `Bearer ${recruiterTokenA}` }
    );
    assert.strictEqual(invalidSalary.status, 400);
    console.log('  ✅ Experience and salary range constraints rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // [10/10] Audit Logging Verification
    // -------------------------------------------------------------------------
    console.log('\n[10/10] Verifying audit trail logging...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: 'Job' },
    });
    assert.ok(auditLogs.length >= 4);
    console.log(`  ✅ ${auditLogs.length} Job lifecycle audit logs verified in PostgreSQL`);

    console.log('\n🎉 ALL PHASE 10 RECRUITER JOB LIFECYCLE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailRecruiterA, testEmailRecruiterB, testEmailCandidate] } },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runRecruiterJobsTests().catch((err) => {
  console.error('❌ Phase 10 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
