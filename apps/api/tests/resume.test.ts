import assert from 'node:assert';
import { supertest, createTestCandidate, createTestRecruiter, cleanupUsers } from './helpers/test-setup.js';

export async function runResumeTests() {
  console.log('\n--- 🧪 RUNNING RESUME E2E INTEGRATION TESTS ---');
  const candidateA = await createTestCandidate('cand-resume-a');
  const candidateB = await createTestCandidate('cand-resume-b');
  const recruiter = await createTestRecruiter('rec-resume');

  try {
    // 1. Initial State: No active resume
    const initialRes = await supertest
      .get('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(initialRes.status, 200, `Expected 200, got ${initialRes.status}`);
    assert.strictEqual(initialRes.body.data.resume, null);
    console.log('  ✅ Initial candidate resume check returns null');

    // 2. Unauthenticated Upload Attempt -> 401
    const unauthUploadRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .attach('resume', Buffer.from('%PDF-1.4 synthetic test file'), 'resume.pdf');
    assert.strictEqual(unauthUploadRes.status, 401, `Unauthenticated upload should return 401, got ${unauthUploadRes.status}`);
    console.log('  ✅ Unauthenticated resume upload rejected with 401');

    // 3. Recruiter Upload Attempt -> 403 (Role mismatch)
    const recruiterUploadRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', recruiter.authHeader)
      .attach('resume', Buffer.from('%PDF-1.4 synthetic test file'), 'resume.pdf');
    assert.strictEqual(recruiterUploadRes.status, 403, `Recruiter upload should return 403, got ${recruiterUploadRes.status}`);
    console.log('  ✅ Recruiter uploading to candidate route rejected with 403');

    // 4. Invalid File Extension (.txt instead of .pdf) -> 400
    const invalidExtRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader)
      .attach('resume', Buffer.from('Plain text content'), 'resume.txt');
    assert.strictEqual(invalidExtRes.status, 400, `Invalid extension should return 400, got ${invalidExtRes.status}`);
    console.log('  ✅ Non-PDF extension rejected with 400');

    // 5. Invalid Magic Bytes (Spoofed .pdf extension with non-PDF binary) -> 400
    const spoofedPdfRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader)
      .attach('resume', Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), {
        filename: 'malicious.pdf',
        contentType: 'application/pdf',
      });
    assert.strictEqual(spoofedPdfRes.status, 400, `Spoofed PDF magic bytes should return 400, got ${spoofedPdfRes.status}`);
    console.log('  ✅ Magic-byte inspection prevented spoofed PDF');

    // 6. Empty File Upload -> 400
    const emptyFileRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader)
      .attach('resume', Buffer.alloc(0), {
        filename: 'empty.pdf',
        contentType: 'application/pdf',
      });
    assert.strictEqual(emptyFileRes.status, 400, `Empty file should return 400, got ${emptyFileRes.status}`);
    console.log('  ✅ Empty file rejected with 400');

    // 7. Valid PDF Upload with %PDF- header
    const validPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Title (Synthetic Candidate Resume) /Author (Candidate A) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );
    const uploadRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader)
      .attach('resume', validPdfBuffer, {
        filename: 'candidate_a_resume.pdf',
        contentType: 'application/pdf',
      });
    assert.strictEqual(uploadRes.status, 201, `Valid upload should return 201, got ${uploadRes.status}`);
    assert.strictEqual(uploadRes.body.data.resume.originalFileName, 'candidate_a_resume.pdf');
    assert.strictEqual(uploadRes.body.data.resume.mimeType, 'application/pdf');
    assert.strictEqual(uploadRes.body.data.resume.isActive, true);
    const resumeAId = uploadRes.body.data.resume.id;
    console.log('  ✅ Valid PDF upload processed, stored, and marked active');

    // 8. Candidate A retrieves own active resume
    const activeRes = await supertest
      .get('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(activeRes.status, 200, `Expected 200, got ${activeRes.status}`);
    assert.strictEqual(activeRes.body.data.resume.id, resumeAId);
    console.log('  ✅ Candidate retrieved own active resume metadata');

    // 9. Candidate B must NOT see Candidate A's resume (Candidate Isolation)
    const candidateBResumeRes = await supertest
      .get('/api/v1/candidates/me/resume')
      .set('Authorization', candidateB.authHeader);
    assert.strictEqual(candidateBResumeRes.status, 200, `Expected 200, got ${candidateBResumeRes.status}`);
    assert.strictEqual(candidateBResumeRes.body.data.resume, null);
    console.log('  ✅ Candidate B cannot see Candidate A active resume (Candidate Isolation)');

    // 10. Replace Resume with new version
    const replacePdfBuffer = Buffer.from(
      '%PDF-1.5\n1 0 obj\n<< /Title (Candidate Resume v2) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );
    const replaceRes = await supertest
      .post('/api/v1/candidates/me/resume/replace')
      .set('Authorization', candidateA.authHeader)
      .attach('resume', replacePdfBuffer, {
        filename: 'candidate_a_resume_v2.pdf',
        contentType: 'application/pdf',
      });
    assert.strictEqual(replaceRes.status, 200, `Expected 200 from replaceResume, got ${replaceRes.status}`);
    assert.strictEqual(replaceRes.body.data.resume.originalFileName, 'candidate_a_resume_v2.pdf');
    assert.strictEqual(replaceRes.body.data.resume.version >= 2, true);
    console.log('  ✅ Candidate replaced active resume with incremented version');

    // 11. Delete Resume
    const deleteRes = await supertest
      .delete('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(deleteRes.status, 200, `Expected 200 from deleteResume, got ${deleteRes.status}`);
    console.log('  ✅ Candidate successfully deleted active resume');

    console.log('🎉 Resume integration test suite passed!');
  } finally {
    await cleanupUsers([candidateA.id, candidateB.id, recruiter.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('resume.test.ts') || process.argv[1]?.endsWith('resume.test.js')) {
  runResumeTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Resume integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
