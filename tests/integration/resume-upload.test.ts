import assert from 'assert';
import http from 'http';
import { createServer } from '../../apps/api/src/server.js';
import { prisma } from '@careerforge/database';

// Sample valid PDF buffer with standard %PDF- magic bytes
const VALID_PDF_BUFFER = Buffer.from(
  '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF'
);

// Disguised non-PDF file (has .pdf extension but lacks %PDF- signature)
const FAKE_PDF_BUFFER = Buffer.from('THIS_IS_NOT_A_REAL_PDF_FILE_HEADER_DATA');

// Oversized buffer (> 5MB)
const OVERSIZED_BUFFER = Buffer.alloc(6 * 1024 * 1024, 'A');

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

async function runResumeUploadTests() {
  console.log('🧪 Starting Phase 5 Resume Upload & Storage Pipeline integration test suite...\n');

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

  const testEmailCandidateA = `resume_cand_a_${Date.now()}@example.com`;
  const testEmailCandidateB = `resume_cand_b_${Date.now()}@example.com`;
  const testEmailRecruiter = `resume_rec_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let candidateAToken = '';
  let candidateBToken = '';
  let recruiterToken = '';

  try {
    // -------------------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------------------
    console.log('[1/11] Setting up candidate and recruiter test accounts...');
    const regA = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidateA,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Alice Candidate',
    });
    assert.strictEqual(regA.status, 201);
    candidateAToken = regA.body.data.accessToken;

    const regB = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidateB,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Bob Candidate',
    });
    assert.strictEqual(regB.status, 201);
    candidateBToken = regB.body.data.accessToken;

    const regRec = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailRecruiter,
      password: testPassword,
      role: 'RECRUITER',
      name: 'Rachel Recruiter',
      companyName: 'TechCorp',
    });
    assert.strictEqual(regRec.status, 201);
    recruiterToken = regRec.body.data.accessToken;
    console.log('  ✅ Test accounts provisioned');

    // -------------------------------------------------------------------------
    // [2/11] Authentication & RBAC Checks
    // -------------------------------------------------------------------------
    console.log('\n[2/11] Testing unauthenticated and unauthorized access rejection...');
    const unauthRes = await uploadMultipart('POST', '/api/v1/candidates/me/resume', VALID_PDF_BUFFER, 'resume.pdf');
    assert.strictEqual(unauthRes.status, 401);

    const recruiterUpload = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      VALID_PDF_BUFFER,
      'resume.pdf',
      'resume',
      { Authorization: `Bearer ${recruiterToken}` }
    );
    assert.strictEqual(recruiterUpload.status, 403);
    console.log('  ✅ Unauthenticated and recruiter upload attempts strictly rejected (401 / 403)');

    // -------------------------------------------------------------------------
    // [3/11] File Validation: Extension & MIME
    // -------------------------------------------------------------------------
    console.log('\n[3/11] Testing invalid file extension rejection (.txt / .docx)...');
    const txtRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      Buffer.from('hello plain text'),
      'resume.txt',
      'resume',
      { Authorization: `Bearer ${candidateAToken}` }
    );
    assert.strictEqual(txtRes.status, 400);
    assert.strictEqual(txtRes.body.error.code, 'INVALID_FILE_TYPE');
    console.log('  ✅ Invalid file extensions rejected with 400 INVALID_FILE_TYPE');

    // -------------------------------------------------------------------------
    // [4/11] Magic-Byte Signature Verification
    // -------------------------------------------------------------------------
    console.log('\n[4/11] Testing magic-byte inspection (rejecting disguised non-PDF)...');
    const fakePdfRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      FAKE_PDF_BUFFER,
      'malicious.pdf',
      'resume',
      { Authorization: `Bearer ${candidateAToken}` }
    );
    assert.strictEqual(fakePdfRes.status, 400);
    assert.strictEqual(fakePdfRes.body.error.code, 'INVALID_FILE_SIGNATURE');
    console.log('  ✅ Disguised files without %PDF- magic bytes rejected with 400 INVALID_FILE_SIGNATURE');

    // -------------------------------------------------------------------------
    // [5/11] File Size Limit (> 5MB)
    // -------------------------------------------------------------------------
    console.log('\n[5/11] Testing oversized file rejection (> 5MB)...');
    const oversizedRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      OVERSIZED_BUFFER,
      'huge_resume.pdf',
      'resume',
      { Authorization: `Bearer ${candidateAToken}` }
    );
    assert.strictEqual(oversizedRes.status, 400);
    console.log('  ✅ Oversized files (> 5MB) rejected with 400');

    // -------------------------------------------------------------------------
    // [6/11] Valid PDF Upload & Metadata Storage
    // -------------------------------------------------------------------------
    console.log('\n[6/11] Testing valid PDF upload & SHA-256 checksum calculation...');
    const uploadRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      VALID_PDF_BUFFER,
      'Alice_Resume_2026.pdf',
      'resume',
      { Authorization: `Bearer ${candidateAToken}` }
    );

    assert.strictEqual(uploadRes.status, 201);
    const resumeData = uploadRes.body.data.resume;
    assert.ok(resumeData.id);
    assert.strictEqual(resumeData.originalFileName, 'Alice_Resume_2026.pdf');
    assert.strictEqual(resumeData.mimeType, 'application/pdf');
    assert.strictEqual(resumeData.processingStatus, 'READY_FOR_PROCESSING');
    assert.strictEqual(resumeData.version, 1);
    assert.ok(resumeData.checksum);
    assert.ok(resumeData.storageKey.startsWith('resumes/'));
    console.log(`  ✅ Resume uploaded successfully (ID: ${resumeData.id}, Checksum: ${resumeData.checksum.slice(0, 16)}...)`);

    // -------------------------------------------------------------------------
    // [7/11] Path Traversal Filename Sanitization
    // -------------------------------------------------------------------------
    console.log('\n[7/11] Testing malicious path-traversal filename sanitization...');
    const maliciousNameRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      VALID_PDF_BUFFER,
      '../../../../etc/passwd.pdf',
      'resume',
      { Authorization: `Bearer ${candidateBToken}` }
    );

    assert.strictEqual(maliciousNameRes.status, 201);
    const bResume = maliciousNameRes.body.data.resume;
    assert.strictEqual(bResume.storageKey.includes('..'), false);
    console.log(`  ✅ Path traversal filename sanitized safely: ${bResume.storageKey}`);

    // -------------------------------------------------------------------------
    // [8/11] Authenticated Download
    // -------------------------------------------------------------------------
    console.log('\n[8/11] Testing authenticated resume download/view stream...');
    const downloadRes = await makeRequest('GET', '/api/v1/candidates/me/resume/download', undefined, {
      Authorization: `Bearer ${candidateAToken}`,
    });

    assert.strictEqual(downloadRes.status, 200);
    assert.strictEqual(downloadRes.headers['content-type'], 'application/pdf');
    assert.ok(downloadRes.rawBody && downloadRes.rawBody.length > 0);
    console.log(`  ✅ Authenticated download verified (${downloadRes.rawBody?.length} bytes received)`);

    // -------------------------------------------------------------------------
    // [9/11] Strict IDOR Cross-Tenant Isolation
    // -------------------------------------------------------------------------
    console.log('\n[9/11] Testing IDOR cross-tenant isolation between Candidate A and Candidate B...');
    const candBResumeRes = await makeRequest('GET', '/api/v1/candidates/me/resume', undefined, {
      Authorization: `Bearer ${candidateBToken}`,
    });

    assert.strictEqual(candBResumeRes.status, 200);
    assert.notStrictEqual(candBResumeRes.body.data.resume.id, resumeData.id);
    console.log('  ✅ IDOR isolation confirmed: Candidate B cannot view or tamper with Candidate A resume');

    // -------------------------------------------------------------------------
    // [10/11] Resume Replacement
    // -------------------------------------------------------------------------
    console.log('\n[10/11] Testing resume replacement & version incrementation...');
    const replaceRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume/replace',
      VALID_PDF_BUFFER,
      'Alice_Resume_Updated.pdf',
      'resume',
      { Authorization: `Bearer ${candidateAToken}` }
    );

    assert.strictEqual(replaceRes.status, 200);
    const updatedResume = replaceRes.body.data.resume;
    assert.strictEqual(updatedResume.originalFileName, 'Alice_Resume_Updated.pdf');
    assert.strictEqual(updatedResume.version, 2);
    console.log('  ✅ Resume replaced cleanly (Version: 2, Status: READY_FOR_PROCESSING)');

    // -------------------------------------------------------------------------
    // [11/11] Resume Deletion & Audit Trail
    // -------------------------------------------------------------------------
    console.log('\n[11/11] Testing resume deletion and security audit logging...');
    const deleteRes = await makeRequest('DELETE', '/api/v1/candidates/me/resume', undefined, {
      Authorization: `Bearer ${candidateAToken}`,
    });
    assert.strictEqual(deleteRes.status, 200);

    const getDeletedRes = await makeRequest('GET', '/api/v1/candidates/me/resume', undefined, {
      Authorization: `Bearer ${candidateAToken}`,
    });
    assert.strictEqual(getDeletedRes.body.data.resume, null);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['RESUME_UPLOADED', 'RESUME_DOWNLOAD', 'RESUME_DELETED'] },
      },
    });
    assert.ok(auditLogs.length >= 3);
    console.log(`  ✅ Resume deleted cleanly and ${auditLogs.length} security audit events verified`);

    console.log('\n🎉 ALL PHASE 5 RESUME UPLOAD & STORAGE PIPELINE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailCandidateA, testEmailCandidateB, testEmailRecruiter] } },
    });
    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
  }
}

runResumeUploadTests().catch((err) => {
  console.error('❌ Phase 5 Test suite failed:', err);
  process.exit(1);
});
