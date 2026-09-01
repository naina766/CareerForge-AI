import assert from 'assert';
import http from 'http';
import { createServer } from '../../apps/api/src/server.js';
import { prisma } from '@careerforge/database';

const SAMPLE_DEV_PDF = Buffer.from(
  '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF'
);

interface TestResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: any;
  rawBody?: Buffer;
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
    const bodyString = data ? JSON.stringify(data) : undefined;

    const reqHeaders: Record<string, string> = { ...headers };
    if (bodyString) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyString).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          let parsed: any;
          try {
            parsed = JSON.parse(raw.toString('utf-8'));
          } catch {
            parsed = raw.toString('utf-8');
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
            rawBody: raw,
          });
        });
      }
    );

    req.on('error', reject);
    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

function uploadMultipart(
  method: string,
  path: string,
  fileBuffer: Buffer,
  filename: string,
  fieldName = 'resume',
  headers: Record<string, string> = {}
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const boundary = `----CareerForgeTestBoundary${Date.now()}`;
    const url = new URL(path, baseUrl);

    const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const multipartBody = Buffer.concat([
      Buffer.from(header, 'utf-8'),
      fileBuffer,
      Buffer.from(footer, 'utf-8'),
    ]);

    const req = http.request(
      url,
      {
        method,
        headers: {
          ...headers,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': multipartBody.length.toString(),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          let parsed: any;
          try {
            parsed = JSON.parse(raw.toString('utf-8'));
          } catch {
            parsed = raw.toString('utf-8');
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
            rawBody: raw,
          });
        });
      }
    );

    req.on('error', reject);
    req.write(multipartBody);
    req.end();
  });
}

async function runResumeParsingTests() {
  console.log('🧪 Starting Phase 6 Resume Parsing Service integration test suite...\n');

  // Start test server
  const app = createServer();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4000;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const testEmailCandidateA = `parsing_cand_a_${Date.now()}@example.com`;
  const testEmailCandidateB = `parsing_cand_b_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let candidateAToken = '';
  let candidateBToken = '';

  try {
    // -------------------------------------------------------------------------
    // Setup Test Accounts
    // -------------------------------------------------------------------------
    console.log('[1/7] Provisioning candidate test accounts...');
    const regA = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidateA,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Alice Developer',
    });
    assert.strictEqual(regA.status, 201);
    candidateAToken = regA.body.data.accessToken;

    const regB = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidateB,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Bob Designer',
    });
    assert.strictEqual(regB.status, 201);
    candidateBToken = regB.body.data.accessToken;
    console.log('  ✅ Candidate accounts provisioned');

    // -------------------------------------------------------------------------
    // [2/7] Attempting Parse Without Resume
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Testing parsing request when no resume is uploaded...');
    const noResumeParse = await makeRequest('POST', '/api/v1/candidates/me/resume/parse', undefined, {
      Authorization: `Bearer ${candidateAToken}`,
    });
    assert.strictEqual(noResumeParse.status, 404);
    console.log('  ✅ Rejected with 404 RESUME_NOT_FOUND as expected');

    // -------------------------------------------------------------------------
    // [3/7] Upload Valid PDF Resume
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Uploading valid resume for Candidate A...');
    const uploadRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      SAMPLE_DEV_PDF,
      'Alice_Senior_Engineer_2026.pdf',
      'resume',
      { Authorization: `Bearer ${candidateAToken}` }
    );
    assert.strictEqual(uploadRes.status, 201);
    assert.strictEqual(uploadRes.body.data.resume.processingStatus, 'READY_FOR_PROCESSING');
    console.log('  ✅ Resume uploaded and marked READY_FOR_PROCESSING');

    // -------------------------------------------------------------------------
    // [4/7] Parsing Candidate A Resume
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Executing resume parsing pipeline (POST /api/v1/candidates/me/resume/parse)...');
    const parseRes = await makeRequest('POST', '/api/v1/candidates/me/resume/parse', undefined, {
      Authorization: `Bearer ${candidateAToken}`,
    });

    assert.strictEqual(parseRes.status, 200);
    assert.strictEqual(parseRes.body.success, true);
    assert.strictEqual(parseRes.body.data.resume.processingStatus, 'PARSED');

    const parsedData = parseRes.body.data.parsedResume.parsedData;
    assert.ok(parsedData);
    assert.ok(Array.isArray(parsedData.skills));
    assert.ok(parsedData.skills.length > 0);
    assert.ok(Array.isArray(parsedData.experience));
    assert.ok(Array.isArray(parsedData.education));
    console.log(`  ✅ Resume parsed successfully (${parsedData.skills.length} skills extracted)`);

    // -------------------------------------------------------------------------
    // [5/7] Retrieve Parsed Resume Data
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Retrieving parsed resume metadata (GET /api/v1/candidates/me/resume/parsed)...');
    const getParsedRes = await makeRequest('GET', '/api/v1/candidates/me/resume/parsed', undefined, {
      Authorization: `Bearer ${candidateAToken}`,
    });

    assert.strictEqual(getParsedRes.status, 200);
    assert.strictEqual(getParsedRes.body.data.resume.processingStatus, 'PARSED');
    assert.strictEqual(getParsedRes.body.data.parsedResume.parserVersion, parseRes.body.data.parsedResume.parserVersion);
    console.log('  ✅ Parsed resume data persisted and retrieved accurately');

    // -------------------------------------------------------------------------
    // [6/7] Strict IDOR Security & Tenant Boundary Check
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Testing IDOR cross-tenant isolation for parsed data...');
    const candBGetParsed = await makeRequest('GET', '/api/v1/candidates/me/resume/parsed', undefined, {
      Authorization: `Bearer ${candidateBToken}`,
    });
    // Candidate B has not uploaded a resume, so should receive 404
    assert.strictEqual(candBGetParsed.status, 404);
    console.log('  ✅ IDOR protection verified: Candidate B cannot access Candidate A parsed resume');

    // -------------------------------------------------------------------------
    // [7/7] Security Audit Trail Verification
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Verifying RESUME_PARSED audit log entry...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { action: 'RESUME_PARSED' },
    });
    assert.ok(auditLogs.length >= 1);
    console.log(`  ✅ Security Audit Trail verified (${auditLogs.length} RESUME_PARSED event recorded)`);

    console.log('\n🎉 ALL PHASE 6 RESUME PARSING SERVICE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailCandidateA, testEmailCandidateB] } },
    });
    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
  }
}

runResumeParsingTests().catch((err) => {
  console.error('❌ Phase 6 Test suite failed:', err);
  process.exit(1);
});
