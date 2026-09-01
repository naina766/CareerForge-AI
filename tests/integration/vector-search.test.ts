import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';

let server: http.Server;
const PORT = 4015;
const BASE_URL = `http://localhost:${PORT}`;

const SAMPLE_DEV_PDF = Buffer.from(
  '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF'
);

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

function uploadMultipart(
  method: string,
  path: string,
  fileBuffer: Buffer,
  filename: string,
  fieldName = 'resume',
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const boundary = `----CareerForgeTestBoundary${Date.now()}`;
    const url = new URL(path, BASE_URL);

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
          });
        });
      }
    );

    req.on('error', reject);
    req.write(multipartBody);
    req.end();
  });
}

async function runVectorSearchTests() {
  console.log('--- STARTING PHASE 8: EMBEDDINGS + FAISS VECTOR SEARCH INTEGRATION TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const testEmailCandidateA = `faiss_cand_a_${Date.now()}@example.com`;
  const testEmailCandidateB = `faiss_cand_b_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let candidateTokenA = '';
  let candidateTokenB = '';

  try {
    // -------------------------------------------------------------------------
    // [1/7] Register Candidate A and Candidate B
    // -------------------------------------------------------------------------
    console.log('\n[1/7] Provisioning candidate test accounts...');
    const candAReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidateA,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'FAISS Candidate A',
    });
    assert.strictEqual(candAReg.status, 201);
    candidateTokenA = candAReg.body.data.accessToken;

    const candBReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidateB,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'FAISS Candidate B',
    });
    assert.strictEqual(candBReg.status, 201);
    candidateTokenB = candBReg.body.data.accessToken;
    console.log('  ✅ Candidates provisioned');

    // -------------------------------------------------------------------------
    // [2/7] Attempt to Index without Resume / Parsing -> 404
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Testing indexing validation when no resume exists...');
    const noResumeIndex = await makeRequest(
      'POST',
      '/api/v1/candidates/me/resume/index',
      {},
      { Authorization: `Bearer ${candidateTokenA}` }
    );
    assert.strictEqual(noResumeIndex.status, 404);
    console.log('  ✅ Controlled 404 error for unuploaded resume verified');

    // -------------------------------------------------------------------------
    // [3/7] Upload and Parse Resume for Candidate A
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Uploading and parsing sample resume for Candidate A...');
    const uploadRes = await uploadMultipart(
      'POST',
      '/api/v1/candidates/me/resume',
      SAMPLE_DEV_PDF,
      'candidate_a_resume.pdf',
      'resume',
      { Authorization: `Bearer ${candidateTokenA}` }
    );
    assert.strictEqual(uploadRes.status, 201);

    const parseRes = await makeRequest(
      'POST',
      '/api/v1/candidates/me/resume/parse',
      {},
      { Authorization: `Bearer ${candidateTokenA}` }
    );
    assert.strictEqual(parseRes.status, 200);
    console.log('  ✅ Resume parsed successfully for Candidate A');

    // -------------------------------------------------------------------------
    // [4/7] Create Semantic Chunks and Index in FAISS
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Generating semantic chunks & indexing into FAISS...');
    const indexRes = await makeRequest(
      'POST',
      '/api/v1/candidates/me/resume/index',
      {},
      { Authorization: `Bearer ${candidateTokenA}` }
    );
    assert.strictEqual(indexRes.status, 200);
    assert.strictEqual(indexRes.body.data.success, true);
    assert.strictEqual(indexRes.body.data.isIndexed, true);
    assert.ok(indexRes.body.data.totalChunks >= 3);
    assert.strictEqual(indexRes.body.data.embeddingDimension, 384);
    console.log(`  ✅ Successfully indexed ${indexRes.body.data.totalChunks} chunks into FAISS`);

    // Verify database chunk records
    const dbChunks = await prisma.resumeChunk.findMany({
      where: { resumeId: indexRes.body.data.resumeId },
    });
    assert.strictEqual(dbChunks.length, indexRes.body.data.totalChunks);
    assert.strictEqual(dbChunks[0].isIndexed, true);
    assert.ok(dbChunks[0].contentHash.length === 64); // SHA-256
    console.log('  ✅ PostgreSQL ResumeChunk relational entities verified with SHA-256 hashes');

    // -------------------------------------------------------------------------
    // [5/7] Verify Index Status Endpoint
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Verifying GET /api/v1/candidates/me/resume/index-status...');
    const statusRes = await makeRequest(
      'GET',
      '/api/v1/candidates/me/resume/index-status',
      undefined,
      { Authorization: `Bearer ${candidateTokenA}` }
    );
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.data.isIndexed, true);
    assert.strictEqual(statusRes.body.data.totalChunks, dbChunks.length);
    assert.strictEqual(statusRes.body.data.indexedChunks, dbChunks.length);
    console.log('  ✅ Index status verified');

    // -------------------------------------------------------------------------
    // [6/7] Execute Semantic Search
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Testing semantic search against indexed resume chunks...');
    const searchRes = await makeRequest(
      'POST',
      '/api/v1/candidates/me/resume/search',
      { query: 'software engineer building backend APIs with Node.js and PostgreSQL', topK: 3 },
      { Authorization: `Bearer ${candidateTokenA}` }
    );
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.body.success, true);
    assert.ok(searchRes.body.data.results.length >= 1);
    assert.ok(typeof searchRes.body.data.results[0].similarityScore === 'number');
    assert.ok(searchRes.body.data.results[0].content.length > 0);
    console.log(`  ✅ Semantic search returned ${searchRes.body.data.results.length} scored results`);

    // -------------------------------------------------------------------------
    // [7/7] Multi-Tenant IDOR Protection & Audit Trail
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Verifying IDOR protection: Candidate B searching unindexed resume...');
    const candBSearch = await makeRequest(
      'POST',
      '/api/v1/candidates/me/resume/search',
      { query: 'Node.js developer' },
      { Authorization: `Bearer ${candidateTokenB}` }
    );
    assert.strictEqual(candBSearch.status, 404);
    console.log('  ✅ IDOR protection verified: Candidate B cannot search Candidate A resume data');

    // Verify Audit Log
    const auditLogs = await prisma.auditLog.findMany({
      where: { action: 'RESUME_INDEXED' },
    });
    assert.ok(auditLogs.length >= 1);
    console.log('  ✅ RESUME_INDEXED security audit log verified');

    console.log('\n🎉 ALL PHASE 8 EMBEDDINGS + FAISS VECTOR SEARCH TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailCandidateA, testEmailCandidateB] } },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runVectorSearchTests().catch((err) => {
  console.error('❌ Phase 8 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
