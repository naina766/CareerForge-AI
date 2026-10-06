import assert from 'node:assert';
import { supertest, generateTestEmail, cleanupUsers } from './helpers/test-setup.js';

export async function runAuthTests(): Promise<void> {
  console.log('\n--- [1/12] Testing Authentication & Session Lifecycle (Supertest) ---');
  const createdEmails: string[] = [];

  try {
    // 1. Valid Candidate Registration
    const candidateEmail = generateTestEmail('cand.auth');
    createdEmails.push(candidateEmail);
    const regRes = await supertest
      .post('/api/v1/auth/register')
      .send({
        email: candidateEmail,
        password: 'Password123!',
        role: 'CANDIDATE',
        name: 'Jane Candidate',
      });

    assert.strictEqual(regRes.status, 201, `Candidate registration should return 201, got ${regRes.status}`);
    assert.strictEqual(regRes.body.success, true);
    assert.ok(regRes.body.data.accessToken, 'Access token should be returned');
    assert.strictEqual(regRes.body.data.user.email, candidateEmail);
    assert.strictEqual(regRes.body.data.user.role, 'CANDIDATE');
    console.log('  ✅ Candidate registration successful');

    // 2. Duplicate Registration Rejection
    const dupRes = await supertest
      .post('/api/v1/auth/register')
      .send({
        email: candidateEmail,
        password: 'Password123!',
        role: 'CANDIDATE',
      });
    assert.strictEqual(dupRes.status, 409, `Duplicate email should return 409 Conflict, got ${dupRes.status}`);
    assert.strictEqual(dupRes.body.success, false);
    console.log('  ✅ Duplicate registration rejected with 409');

    // 3. Public Admin Registration Forbidden
    const adminRegRes = await supertest
      .post('/api/v1/auth/register')
      .send({
        email: generateTestEmail('fake.admin'),
        password: 'Password123!',
        role: 'ADMIN',
      });
    assert.strictEqual(adminRegRes.status, 403, `Public ADMIN registration should return 403, got ${adminRegRes.status}`);
    console.log('  ✅ Public ADMIN registration rejected with 403');

    // 4. Invalid Registration Input
    const invalidRegRes = await supertest
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
      });
    assert.strictEqual(invalidRegRes.status, 400, `Invalid input should return 400, got ${invalidRegRes.status}`);
    console.log('  ✅ Invalid registration inputs rejected with 400');

    // 5. Valid Login
    const loginRes = await supertest
      .post('/api/v1/auth/login')
      .send({
        email: candidateEmail,
        password: 'Password123!',
      });
    assert.strictEqual(loginRes.status, 200, `Login should return 200, got ${loginRes.status}`);
    assert.ok(loginRes.body.data.accessToken, 'Access token missing from login response');
    const token = loginRes.body.data.accessToken;
    const cookieHeader = loginRes.headers['set-cookie'];
    assert.ok(cookieHeader, 'Refresh token cookie should be set in response headers');
    console.log('  ✅ User login successful with access token & refresh cookie');

    // 6. Invalid Password Login
    const badPassRes = await supertest
      .post('/api/v1/auth/login')
      .send({
        email: candidateEmail,
        password: 'WrongPassword999!',
      });
    assert.strictEqual(badPassRes.status, 401, `Bad password should return 401, got ${badPassRes.status}`);
    console.log('  ✅ Bad password rejected with 401');

    // 7. Unknown Account Login
    const unknownRes = await supertest
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent.user.999@test.com',
        password: 'Password123!',
      });
    assert.strictEqual(unknownRes.status, 401, `Unknown account should return 401, got ${unknownRes.status}`);
    console.log('  ✅ Non-existent user rejected with 401');

    // 8. Authenticated /me Request
    const meRes = await supertest
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(meRes.status, 200, `GET /auth/me should return 200, got ${meRes.status}`);
    assert.strictEqual(meRes.body.data.user.email, candidateEmail);
    console.log('  ✅ Protected /auth/me returns authenticated user identity');

    // 9. Unauthenticated Request Rejection
    const noAuthRes = await supertest.get('/api/v1/auth/me');
    assert.strictEqual(noAuthRes.status, 401, `Missing token should return 401, got ${noAuthRes.status}`);
    console.log('  ✅ Unauthenticated request correctly rejected with 401');

    // 10. Malformed Token Rejection
    const malformedRes = await supertest
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.payload');
    assert.strictEqual(malformedRes.status, 401, `Malformed token should return 401, got ${malformedRes.status}`);
    console.log('  ✅ Malformed Bearer token rejected with 401');

    // 11. Role-Gated Endpoint Verification
    const candRoleRes = await supertest
      .get('/api/v1/auth/candidate-only')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(candRoleRes.status, 200, `Candidate token should access candidate-only route`);

    const adminRoleRes = await supertest
      .get('/api/v1/auth/admin-only')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(adminRoleRes.status, 403, `Candidate token should be denied from admin-only route with 403`);
    console.log('  ✅ RBAC role enforcement verified on auth endpoints');

    // 12. Logout
    const logoutRes = await supertest
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookieHeader);
    assert.strictEqual(logoutRes.status, 200, `Logout should return 200, got ${logoutRes.status}`);
    console.log('  ✅ Logout successfully cleared session');
  } finally {
    await cleanupUsers(createdEmails);
  }
}

if (process.argv[1]?.endsWith('auth.test.ts')) {
  runAuthTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ auth.test.ts failed:', err);
      process.exit(1);
    });
}
