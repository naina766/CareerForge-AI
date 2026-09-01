import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';

let server: http.Server;
const PORT = 4017;
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

async function runCandidateJobSearchTests() {
  console.log('--- STARTING PHASE 11: CANDIDATE JOB SEARCH & FILTERING INTEGRATION TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const testEmailRecruiter = `search_recruiter_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let recruiterToken = '';
  const createdJobSlugs: string[] = [];
  const createdJobIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // [1/11] Provision Recruiter & Seed Diverse Test Jobs
    // -------------------------------------------------------------------------
    console.log('\n[1/11] Provisioning test recruiter and multi-faceted job fixtures...');
    const recReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailRecruiter,
      password: testPassword,
      role: 'RECRUITER',
      name: 'Search Fixture Recruiter',
    });
    assert.strictEqual(recReg.status, 201);
    recruiterToken = recReg.body.data.accessToken;

    // Helper to post a job via recruiter endpoint
    async function createFixtureJob(jobData: any, status: 'PUBLISHED' | 'DRAFT' | 'PAUSED' | 'CLOSED' = 'PUBLISHED') {
      const res = await makeRequest(
        'POST',
        '/api/v1/recruiter/jobs',
        { ...jobData, status: 'DRAFT' },
        { Authorization: `Bearer ${recruiterToken}` }
      );
      assert.strictEqual(res.status, 201);
      const jId = res.body.data.id;
      createdJobIds.push(jId);
      createdJobSlugs.push(res.body.data.slug);

      if (status !== 'DRAFT') {
        if (status === 'PUBLISHED') {
          await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${recruiterToken}` });
        } else if (status === 'PAUSED') {
          await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${recruiterToken}` });
          await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jId}/status`, { status: 'PAUSED' }, { Authorization: `Bearer ${recruiterToken}` });
        } else if (status === 'CLOSED') {
          await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${recruiterToken}` });
          await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jId}/status`, { status: 'CLOSED' }, { Authorization: `Bearer ${recruiterToken}` });
        }
      }
      return res.body.data;
    }

    // Job 1: Published Fullstack Remote (React, Node.js, PostgreSQL)
    const job1 = await createFixtureJob({
      title: 'Senior Full Stack Cloud Engineer',
      description: 'Architect scalable web applications using React, Next.js, and Node.js microservices.',
      companyName: 'Apex Cloud Solutions',
      location: 'San Francisco, CA',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      experienceMin: 3,
      experienceMax: 6,
      salaryMin: 130000,
      salaryMax: 170000,
      skills: [{ name: 'ReactJS', importance: 'REQUIRED' }, { name: 'NodeJS', importance: 'REQUIRED' }, { name: 'PostgreSQL', importance: 'PREFERRED' }],
    }, 'PUBLISHED');

    // Job 2: Published Python Backend (Python, FastAPI, Docker) in New York, Onsite
    const job2 = await createFixtureJob({
      title: 'Python AI Backend Specialist',
      description: 'Develop high-throughput REST APIs and machine learning data pipelines.',
      companyName: 'Quantum AI Systems',
      location: 'New York, NY',
      workMode: 'ONSITE',
      employmentType: 'CONTRACT',
      experienceMin: 1,
      experienceMax: 3,
      salaryMin: 100000,
      salaryMax: 140000,
      skills: [{ name: 'Python', importance: 'REQUIRED' }, { name: 'FastAPI', importance: 'REQUIRED' }, { name: 'Docker', importance: 'REQUIRED' }],
    }, 'PUBLISHED');

    // Job 3: Published Frontend Entry-Level (React, TypeScript) in London, Hybrid
    const job3 = await createFixtureJob({
      title: 'Junior Frontend Developer',
      description: 'Build interactive dashboards and components using modern TypeScript and React.',
      companyName: 'Fintech London',
      location: 'London, UK',
      workMode: 'HYBRID',
      employmentType: 'INTERNSHIP',
      experienceMin: 0,
      experienceMax: 2,
      salaryMin: 50000,
      salaryMax: 70000,
      skills: [{ name: 'React', importance: 'REQUIRED' }, { name: 'TypeScript', importance: 'REQUIRED' }],
    }, 'PUBLISHED');

    // Job 4: Private DRAFT Job (Should be hidden from public discovery)
    const draftJob = await createFixtureJob({
      title: 'Secret Internal Architect',
      description: 'Draft job for upcoming unannounced team expansion.',
      location: 'Remote',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
    }, 'DRAFT');

    // Job 5: PAUSED Job (Should be hidden from public discovery)
    const pausedJob = await createFixtureJob({
      title: 'Paused Hiring Role',
      description: 'Temporarily on hold.',
      location: 'Remote',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
    }, 'PAUSED');

    // Job 6: Expired Published Job (Deadline was yesterday -> Should be hidden)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredJob = await createFixtureJob({
      title: 'Expired Legacy Role',
      description: 'Job with past deadline that should not be visible.',
      location: 'Remote',
      workMode: 'REMOTE',
      employmentType: 'FULL_TIME',
      applicationDeadline: yesterday,
    }, 'PUBLISHED');

    console.log('  ✅ Fixture jobs provisioned across statuses and filter categories');

    // -------------------------------------------------------------------------
    // [2/11] Published-Only Visibility & Expiration Filtering
    // -------------------------------------------------------------------------
    console.log('\n[2/11] Testing published-only visibility & automatic expiration filtering...');
    const allPublic = await makeRequest('GET', '/api/v1/jobs');
    assert.strictEqual(allPublic.status, 200);
    assert.strictEqual(allPublic.body.success, true);

    const publicIds = allPublic.body.data.map((j: any) => j.id);
    assert.ok(publicIds.includes(job1.id), 'Job 1 should be visible');
    assert.ok(publicIds.includes(job2.id), 'Job 2 should be visible');
    assert.ok(publicIds.includes(job3.id), 'Job 3 should be visible');
    assert.ok(!publicIds.includes(draftJob.id), 'DRAFT job must NOT be visible');
    assert.ok(!publicIds.includes(pausedJob.id), 'PAUSED job must NOT be visible');
    assert.ok(!publicIds.includes(expiredJob.id), 'Expired job must NOT be visible');
    console.log('  ✅ Strictly PUBLISHED and non-expired vacancies are returned');

    // -------------------------------------------------------------------------
    // [3/11] Keyword Search (Title, Description, Skills)
    // -------------------------------------------------------------------------
    console.log('\n[3/11] Testing keyword text search (?search=full+stack)...');
    const searchRes = await makeRequest('GET', '/api/v1/jobs?search=Full+Stack');
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.data.some((j: any) => j.id === job1.id));
    assert.ok(!searchRes.body.data.some((j: any) => j.id === job2.id));
    console.log('  ✅ Keyword search correctly matched Senior Full Stack Cloud Engineer');

    // -------------------------------------------------------------------------
    // [4/11] Work Mode Filtering (REMOTE, HYBRID, ONSITE)
    // -------------------------------------------------------------------------
    console.log('\n[4/11] Testing work mode filtering (?workMode=REMOTE)...');
    const remoteRes = await makeRequest('GET', '/api/v1/jobs?workMode=REMOTE');
    assert.strictEqual(remoteRes.status, 200);
    assert.ok(remoteRes.body.data.every((j: any) => j.workMode === 'REMOTE'));
    assert.ok(remoteRes.body.data.some((j: any) => j.id === job1.id));

    const multiWorkMode = await makeRequest('GET', '/api/v1/jobs?workMode=REMOTE,HYBRID');
    assert.strictEqual(multiWorkMode.status, 200);
    assert.ok(multiWorkMode.body.data.every((j: any) => j.workMode === 'REMOTE' || j.workMode === 'HYBRID'));
    console.log('  ✅ Work mode filtering (single and multi-select) verified');

    // -------------------------------------------------------------------------
    // [5/11] Employment Type Filtering (FULL_TIME, CONTRACT, INTERNSHIP)
    // -------------------------------------------------------------------------
    console.log('\n[5/11] Testing employment type filtering (?employmentType=CONTRACT)...');
    const contractRes = await makeRequest('GET', '/api/v1/jobs?employmentType=CONTRACT');
    assert.strictEqual(contractRes.status, 200);
    assert.ok(contractRes.body.data.every((j: any) => j.employmentType === 'CONTRACT'));
    assert.ok(contractRes.body.data.some((j: any) => j.id === job2.id));
    console.log('  ✅ Employment type filtering verified');

    // -------------------------------------------------------------------------
    // [6/11] Location Filtering
    // -------------------------------------------------------------------------
    console.log('\n[6/11] Testing location filtering (?location=London)...');
    const locRes = await makeRequest('GET', '/api/v1/jobs?location=London');
    assert.strictEqual(locRes.status, 200);
    assert.ok(locRes.body.data.some((j: any) => j.id === job3.id));
    assert.ok(!locRes.body.data.some((j: any) => j.id === job2.id));
    console.log('  ✅ Location filtering verified');

    // -------------------------------------------------------------------------
    // [7/11] Experience Range Overlap Logic
    // -------------------------------------------------------------------------
    console.log('\n[7/11] Testing experience overlap filtering (?experienceMin=0&experienceMax=2)...');
    const entryLevelRes = await makeRequest('GET', '/api/v1/jobs?experienceMin=0&experienceMax=2');
    assert.strictEqual(entryLevelRes.status, 200);
    assert.ok(entryLevelRes.body.data.some((j: any) => j.id === job3.id)); // 0-2 yrs
    assert.ok(entryLevelRes.body.data.some((j: any) => j.id === job2.id)); // 1-3 yrs overlaps [0, 2]
    assert.ok(!entryLevelRes.body.data.some((j: any) => j.id === job1.id)); // 3-6 yrs does not match max 2
    console.log('  ✅ Experience overlap range logic verified');

    // -------------------------------------------------------------------------
    // [8/11] Canonical Skill Normalization & ANY/ALL Matching
    // -------------------------------------------------------------------------
    console.log('\n[8/11] Testing canonical skill normalization (ReactJS -> React)...');
    const skillNormRes = await makeRequest('GET', '/api/v1/jobs?skills=ReactJS');
    assert.strictEqual(skillNormRes.status, 200);
    assert.ok(skillNormRes.body.data.some((j: any) => j.id === job1.id));
    assert.ok(skillNormRes.body.data.some((j: any) => j.id === job3.id));

    // Test ALL skill match: React + NodeJS
    const skillAllRes = await makeRequest('GET', '/api/v1/jobs?skills=ReactJS,NodeJS&skillMatch=all');
    assert.strictEqual(skillAllRes.status, 200);
    assert.ok(skillAllRes.body.data.some((j: any) => j.id === job1.id));
    assert.ok(!skillAllRes.body.data.some((j: any) => j.id === job3.id)); // Job 3 has React but not Node.js
    console.log('  ✅ Canonical skill normalization and ANY/ALL matching verified');

    // -------------------------------------------------------------------------
    // [9/11] Sorting Whitelist (newest, oldest, deadline, salary)
    // -------------------------------------------------------------------------
    console.log('\n[9/11] Testing sorting whitelist (?sort=salary)...');
    const salarySortRes = await makeRequest('GET', '/api/v1/jobs?sort=salary');
    assert.strictEqual(salarySortRes.status, 200);
    const salaries = salarySortRes.body.data.map((j: any) => j.salaryMin || 0);
    for (let i = 0; i < salaries.length - 1; i++) {
      assert.ok(salaries[i] >= salaries[i + 1], 'Salaries should be descending');
    }
    console.log('  ✅ Salary descending sort verified');

    // -------------------------------------------------------------------------
    // [10/11] Server-Side Pagination & Meta Envelope
    // -------------------------------------------------------------------------
    console.log('\n[10/11] Testing pagination envelope (?page=1&limit=2)...');
    const page1Res = await makeRequest('GET', '/api/v1/jobs?page=1&limit=2');
    assert.strictEqual(page1Res.status, 200);
    assert.strictEqual(page1Res.body.data.length, 2);
    assert.strictEqual(page1Res.body.meta.pagination.page, 1);
    assert.strictEqual(page1Res.body.meta.pagination.limit, 2);
    assert.ok(page1Res.body.meta.pagination.total >= 3);
    assert.strictEqual(page1Res.body.meta.pagination.hasNextPage, true);
    assert.strictEqual(page1Res.body.meta.pagination.hasPreviousPage, false);
    console.log('  ✅ Pagination meta envelope verified');

    // -------------------------------------------------------------------------
    // [11/11] Public Job Detail by Slug & 404 for Draft/Nonexistent
    // -------------------------------------------------------------------------
    console.log('\n[11/11] Testing public job details by slug and 404 for private jobs...');
    const detailRes = await makeRequest('GET', `/api/v1/jobs/${job1.slug}`);
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.data.title, 'Senior Full Stack Cloud Engineer');
    assert.ok(detailRes.body.data.skills.length >= 3);
    assert.strictEqual(detailRes.body.data.recruiter, undefined, 'Private recruiter data must NOT be exposed');

    // Attempting to fetch draft job by slug -> 404
    const draftDetailRes = await makeRequest('GET', `/api/v1/jobs/${draftJob.slug}`);
    assert.strictEqual(draftDetailRes.status, 404);
    console.log('  ✅ Public detail endpoint verified and DRAFT job correctly rejected with 404');

    console.log('\n🎉 ALL PHASE 11 CANDIDATE JOB SEARCH & FILTERING TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: testEmailRecruiter },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runCandidateJobSearchTests().catch((err) => {
  console.error('❌ Phase 11 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
