import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';

let server: http.Server;
const PORT = 4018;
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

async function runJobApplicationTests() {
  console.log('--- STARTING PHASE 12: JOB APPLICATIONS & APPLICATION LIFECYCLE TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const suffix = Date.now();
  const emailCandA = `cand_a_${suffix}@example.com`;
  const emailCandB = `cand_b_${suffix}@example.com`;
  const emailRecA = `rec_a_${suffix}@example.com`;
  const emailRecB = `rec_b_${suffix}@example.com`;
  const password = 'Password123!';

  let tokenCandA = '';
  let tokenCandB = '';
  let tokenRecA = '';
  let tokenRecB = '';

  let resumeCandAId = '';
  let resumeCandBId = '';

  let job1Id = '';
  let job2ExpiredId = '';
  let job3DraftId = '';
  let job4RecBId = '';

  let application1Id = '';

  try {
    // -------------------------------------------------------------------------
    // [1/12] Provision Candidates, Resumes, Recruiters, and Vacancies
    // -------------------------------------------------------------------------
    console.log('\n[1/12] Provisioning candidate and recruiter accounts with resume artifacts...');

    // Candidate A
    const regCandA = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandA,
      password,
      role: 'CANDIDATE',
      name: 'Candidate Alex',
    });
    assert.strictEqual(regCandA.status, 201);
    tokenCandA = regCandA.body.data.accessToken;

    const candAProfile = await prisma.candidateProfile.findUnique({
      where: { userId: regCandA.body.data.user.id },
    });
    const resumeA = await prisma.resume.create({
      data: {
        candidateId: candAProfile!.id,
        storageKey: `resumes/${candAProfile!.id}/resume_a.pdf`,
        fileUrl: 'http://localhost:4000/storage/resumes/resume_a.pdf',
        originalFileName: 'Alex_Rivera_Resume_2026.pdf',
        fileSize: 120480,
        checksum: `hash_${suffix}_a`,
        mimeType: 'application/pdf',
        processingStatus: 'PARSED',
      },
    });
    resumeCandAId = resumeA.id;

    // Candidate B
    const regCandB = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandB,
      password,
      role: 'CANDIDATE',
      name: 'Candidate Brenda',
    });
    assert.strictEqual(regCandB.status, 201);
    tokenCandB = regCandB.body.data.accessToken;

    const candBProfile = await prisma.candidateProfile.findUnique({
      where: { userId: regCandB.body.data.user.id },
    });
    const resumeB = await prisma.resume.create({
      data: {
        candidateId: candBProfile!.id,
        storageKey: `resumes/${candBProfile!.id}/resume_b.pdf`,
        fileUrl: 'http://localhost:4000/storage/resumes/resume_b.pdf',
        originalFileName: 'Brenda_Lee_Resume.pdf',
        fileSize: 98000,
        checksum: `hash_${suffix}_b`,
        mimeType: 'application/pdf',
        processingStatus: 'PARSED',
      },
    });
    resumeCandBId = resumeB.id;

    // Recruiter A
    const regRecA = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailRecA,
      password,
      role: 'RECRUITER',
      name: 'Recruiter Alice',
    });
    assert.strictEqual(regRecA.status, 201);
    tokenRecA = regRecA.body.data.accessToken;

    // Recruiter B
    const regRecB = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailRecB,
      password,
      role: 'RECRUITER',
      name: 'Recruiter Bob',
    });
    assert.strictEqual(regRecB.status, 201);
    tokenRecB = regRecB.body.data.accessToken;

    // Recruiter A creates Job 1 (Published, Active Deadline)
    const futureDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const resJob1 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Senior Full Stack Cloud Engineer',
        description: 'Lead engineering team building cloud microservices.',
        companyName: 'Apex Cloud Systems',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        status: 'DRAFT',
        applicationDeadline: futureDeadline,
      },
      { Authorization: `Bearer ${tokenRecA}` }
    );
    job1Id = resJob1.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${job1Id}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRecA}` });

    // Recruiter A creates Job 2 (Published, Expired Deadline)
    const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const resJob2 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Legacy Backend Developer',
        description: 'Maintain legacy systems.',
        companyName: 'Apex Cloud Systems',
        location: 'San Francisco, CA',
        workMode: 'HYBRID',
        employmentType: 'FULL_TIME',
        status: 'DRAFT',
        applicationDeadline: pastDeadline,
      },
      { Authorization: `Bearer ${tokenRecA}` }
    );
    job2ExpiredId = resJob2.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${job2ExpiredId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRecA}` });

    // Recruiter A creates Job 3 (Draft)
    const resJob3 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Unpublished Secret Role',
        description: 'Internal confidential engineering leadership position.',
        companyName: 'Apex Cloud Systems',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        status: 'DRAFT',
      },
      { Authorization: `Bearer ${tokenRecA}` }
    );
    assert.strictEqual(resJob3.status, 201);
    job3DraftId = resJob3.body.data.id;

    // Recruiter B creates Job 4 (Published)
    const resJob4 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'DevOps Platform Architect',
        description: 'Scale multi-region Kubernetes clusters and cloud infrastructure.',
        companyName: 'ScaleGlobal',
        location: 'Austin, TX',
        workMode: 'REMOTE',
        status: 'DRAFT',
      },
      { Authorization: `Bearer ${tokenRecB}` }
    );
    assert.strictEqual(resJob4.status, 201);
    job4RecBId = resJob4.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${job4RecBId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRecB}` });

    console.log('  ✅ Fixtures setup successfully');

    // -------------------------------------------------------------------------
    // [2/12] Candidate Applies to Published Job
    // -------------------------------------------------------------------------
    console.log('\n[2/12] Testing Candidate A applying to published Job 1...');
    const applyRes = await makeRequest(
      'POST',
      `/api/v1/jobs/${job1Id}/applications`,
      {
        resumeId: resumeCandAId,
        coverLetter: 'I am excited to bring 6+ years of cloud architecture experience to Apex Cloud Systems.',
      },
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(applyRes.status, 201);
    assert.strictEqual(applyRes.body.success, true);
    assert.strictEqual(applyRes.body.data.status, 'APPLIED');
    application1Id = applyRes.body.data.id;

    // Verify initial status history
    const historyCheck = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: application1Id },
    });
    assert.strictEqual(historyCheck.length, 1);
    assert.strictEqual(historyCheck[0]!.newStatus, 'APPLIED');
    console.log('  ✅ Application successfully created with APPLIED status and audit history');

    // -------------------------------------------------------------------------
    // [3/12] Duplicate Application Rejection
    // -------------------------------------------------------------------------
    console.log('\n[3/12] Testing duplicate application rejection...');
    const dupRes = await makeRequest(
      'POST',
      `/api/v1/jobs/${job1Id}/applications`,
      {
        resumeId: resumeCandAId,
      },
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(dupRes.status, 409);
    assert.strictEqual(dupRes.body.error.code, 'APPLICATION_ALREADY_EXISTS');
    console.log('  ✅ Duplicate application rejected with 409 Conflict');

    // -------------------------------------------------------------------------
    // [4/12] Foreign Resume IDOR Protection
    // -------------------------------------------------------------------------
    console.log('\n[4/12] Testing foreign resume ownership protection (IDOR)...');
    const foreignResumeRes = await makeRequest(
      'POST',
      `/api/v1/jobs/${job4RecBId}/applications`,
      {
        resumeId: resumeCandBId, // Cand A trying to use Cand B's resume
      },
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(foreignResumeRes.status, 403);
    assert.strictEqual(foreignResumeRes.body.error.code, 'INVALID_RESUME_OWNERSHIP');
    console.log('  ✅ Foreign resume rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // [5/12] Expired Job Application Rejection
    // -------------------------------------------------------------------------
    console.log('\n[5/12] Testing applying to expired job...');
    const expiredRes = await makeRequest(
      'POST',
      `/api/v1/jobs/${job2ExpiredId}/applications`,
      {
        resumeId: resumeCandAId,
      },
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(expiredRes.status, 400);
    assert.strictEqual(expiredRes.body.error.code, 'APPLICATION_DEADLINE_PASSED');
    console.log('  ✅ Expired vacancy application rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // [6/12] Draft / Non-Published Vacancy Application Rejection
    // -------------------------------------------------------------------------
    console.log('\n[6/12] Testing applying to private draft job...');
    const draftRes = await makeRequest(
      'POST',
      `/api/v1/jobs/${job3DraftId}/applications`,
      {
        resumeId: resumeCandAId,
      },
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(draftRes.status, 400);
    assert.strictEqual(draftRes.body.error.code, 'JOB_NOT_ACCEPTING_APPLICATIONS');
    console.log('  ✅ Draft job application rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // [7/12] Candidate Applications List & Aggregated Statistics
    // -------------------------------------------------------------------------
    console.log('\n[7/12] Testing Candidate A application listing and stats...');
    const candAppsRes = await makeRequest('GET', '/api/v1/applications/me', undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(candAppsRes.status, 200);
    assert.strictEqual(candAppsRes.body.data.length, 1);
    assert.strictEqual(candAppsRes.body.data[0].jobTitle, 'Senior Full Stack Cloud Engineer');
    assert.strictEqual(candAppsRes.body.meta.stats.total, 1);
    assert.strictEqual(candAppsRes.body.meta.stats.active, 1);
    console.log('  ✅ Candidate applications list and stats calculated accurately');

    // -------------------------------------------------------------------------
    // [8/12] Application Detail & Unauthorized Access Protection (IDOR)
    // -------------------------------------------------------------------------
    console.log('\n[8/12] Testing application detail lookup and IDOR boundaries...');
    const detailRes = await makeRequest('GET', `/api/v1/applications/${application1Id}`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.data.status, 'APPLIED');
    assert.ok(detailRes.body.data.statusHistory.length >= 1);

    // Candidate B trying to view Candidate A's application -> 403
    const idorRes = await makeRequest('GET', `/api/v1/applications/${application1Id}`, undefined, {
      Authorization: `Bearer ${tokenCandB}`,
    });
    assert.strictEqual(idorRes.status, 403);
    assert.strictEqual(idorRes.body.error.code, 'UNAUTHORIZED_APPLICATION_ACCESS');
    console.log('  ✅ Application detail and IDOR authorization strictly verified');

    // -------------------------------------------------------------------------
    // [9/12] Recruiter Kanban Applications View & Multi-Tenant Isolation
    // -------------------------------------------------------------------------
    console.log('\n[9/12] Testing Recruiter A job applications and tenant isolation...');
    const recAppsRes = await makeRequest('GET', `/api/v1/recruiter/jobs/${job1Id}/applications`, undefined, {
      Authorization: `Bearer ${tokenRecA}`,
    });
    assert.strictEqual(recAppsRes.status, 200);
    assert.strictEqual(recAppsRes.body.data.length, 1);
    assert.strictEqual(recAppsRes.body.data[0].candidateName, 'Candidate Alex');

    // Recruiter B trying to view Recruiter A's job applications -> 403
    const recIdorRes = await makeRequest('GET', `/api/v1/recruiter/jobs/${job1Id}/applications`, undefined, {
      Authorization: `Bearer ${tokenRecB}`,
    });
    assert.strictEqual(recIdorRes.status, 403);
    assert.strictEqual(recIdorRes.body.error.code, 'UNAUTHORIZED_RECRUITER_ACCESS');
    console.log('  ✅ Recruiter application pipeline and multi-tenant isolation verified');

    // -------------------------------------------------------------------------
    // [10/12] Lifecycle Status Transitions (APPLIED -> SCREENING -> SHORTLISTED -> INTERVIEW -> OFFERED -> HIRED)
    // -------------------------------------------------------------------------
    console.log('\n[10/12] Testing complete recruiter lifecycle state progression...');

    // 1. Move to SCREENING
    const s1 = await makeRequest('PATCH', `/api/v1/applications/${application1Id}/status`, { status: 'SCREENING', note: 'Passed resume screening' }, { Authorization: `Bearer ${tokenRecA}` });
    assert.strictEqual(s1.status, 200);
    assert.strictEqual(s1.body.data.status, 'SCREENING');

    // 2. Move to SHORTLISTED
    const s2 = await makeRequest('PATCH', `/api/v1/applications/${application1Id}/status`, { status: 'SHORTLISTED', note: 'Selected for hiring manager interview' }, { Authorization: `Bearer ${tokenRecA}` });
    assert.strictEqual(s2.status, 200);
    assert.strictEqual(s2.body.data.status, 'SHORTLISTED');

    // 3. Move to INTERVIEW
    const s3 = await makeRequest('PATCH', `/api/v1/applications/${application1Id}/status`, { status: 'INTERVIEW', note: 'Scheduled technical live round' }, { Authorization: `Bearer ${tokenRecA}` });
    assert.strictEqual(s3.status, 200);
    assert.strictEqual(s3.body.data.status, 'INTERVIEW');

    // 4. Move to OFFERED
    const s4 = await makeRequest('PATCH', `/api/v1/applications/${application1Id}/status`, { status: 'OFFERED', note: 'Formal offer extended' }, { Authorization: `Bearer ${tokenRecA}` });
    assert.strictEqual(s4.status, 200);
    assert.strictEqual(s4.body.data.status, 'OFFERED');

    // 5. Move to HIRED
    const s5 = await makeRequest('PATCH', `/api/v1/applications/${application1Id}/status`, { status: 'HIRED', note: 'Offer accepted! Candidate onboarded' }, { Authorization: `Bearer ${tokenRecA}` });
    assert.strictEqual(s5.status, 200);
    assert.strictEqual(s5.body.data.status, 'HIRED');

    // Check full history records
    const allHistory = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: application1Id },
      orderBy: { createdAt: 'asc' },
    });
    assert.strictEqual(allHistory.length, 6);
    console.log('  ✅ Complete 6-step lifecycle progression verified with persistent history');

    // -------------------------------------------------------------------------
    // [11/12] Invalid Status Transitions from Terminal State
    // -------------------------------------------------------------------------
    console.log('\n[11/12] Testing rejection of invalid status transitions from terminal state (HIRED)...');
    const invalidTrans = await makeRequest('PATCH', `/api/v1/applications/${application1Id}/status`, { status: 'INTERVIEW' }, { Authorization: `Bearer ${tokenRecA}` });
    assert.strictEqual(invalidTrans.status, 400);
    assert.strictEqual(invalidTrans.body.error.code, 'INVALID_STATUS_TRANSITION');
    console.log('  ✅ Invalid status transition rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // [12/12] Candidate Application Withdrawal
    // -------------------------------------------------------------------------
    console.log('\n[12/12] Testing candidate application withdrawal...');
    // Candidate B applies to Job 4
    const applyCandB = await makeRequest(
      'POST',
      `/api/v1/jobs/${job4RecBId}/applications`,
      { resumeId: resumeCandBId, coverLetter: 'DevOps architect application' },
      { Authorization: `Bearer ${tokenCandB}` }
    );
    assert.strictEqual(applyCandB.status, 201);
    const appBId = applyCandB.body.data.id;

    // Candidate B withdraws
    const withdrawRes = await makeRequest('POST', `/api/v1/applications/${appBId}/withdraw`, {}, { Authorization: `Bearer ${tokenCandB}` });
    assert.strictEqual(withdrawRes.status, 200);
    assert.strictEqual(withdrawRes.body.data.status, 'WITHDRAWN');

    const appBRecord = await prisma.application.findUnique({ where: { id: appBId } });
    assert.strictEqual(appBRecord!.status, 'WITHDRAWN');
    assert.ok(appBRecord!.withdrawnAt !== null);

    // Attempting to withdraw again -> 400
    const withdrawAgain = await makeRequest('POST', `/api/v1/applications/${appBId}/withdraw`, {}, { Authorization: `Bearer ${tokenCandB}` });
    assert.strictEqual(withdrawAgain.status, 400);
    assert.strictEqual(withdrawAgain.body.error.code, 'APPLICATION_ALREADY_WITHDRAWN');
    console.log('  ✅ Application withdrawal and idempotent protection verified');

    console.log('\n🎉 ALL PHASE 12 JOB APPLICATIONS & LIFECYCLE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [emailCandA, emailCandB, emailRecA, emailRecB] } },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runJobApplicationTests().catch((err) => {
  console.error('❌ Phase 12 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
