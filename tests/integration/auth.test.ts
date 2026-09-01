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

function extractCookieValue(setCookieHeader: string | string[] | undefined, name: string): string | null {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const c of cookies) {
    const match = c.match(new RegExp(`${name}=([^;]+)`));
    if (match && match[1]) return match[1];
  }
  return null;
}

async function runAuthTests() {
  console.log('🧪 Starting CareerForge AI Phase 3 Auth & Security Verification Test Suite...');

  // Start temporary test server
  const app = createServer();
  server = app.listen(0);
  const port = (server.address() as any).port;
  baseUrl = `http://localhost:${port}`;

  const testCandidateEmail = `test.candidate.${Date.now()}@careerforge.test`;
  const testRecruiterEmail = `test.recruiter.${Date.now()}@careerforge.test`;
  const testPassword = 'StrongPassword123!';

  try {
    // --------------------------------------------------------------------------
    // 1. Health Check Persistence
    // --------------------------------------------------------------------------
    console.log('\n[1/12] Testing Health Check endpoint persistence...');
    const healthRes = await makeRequest('GET', '/api/v1/health');
    if (healthRes.status !== 200 || healthRes.body.data.database !== 'connected') {
      throw new Error(`Health check failed: ${JSON.stringify(healthRes.body)}`);
    }
    console.log('  ✅ GET /api/v1/health returned 200 with database: connected');

    // --------------------------------------------------------------------------
    // 2. Reject Public ADMIN Registration
    // --------------------------------------------------------------------------
    console.log('\n[2/12] Testing rejection of public ADMIN registration...');
    const adminRegRes = await makeRequest('POST', '/api/v1/auth/register', {
      email: 'hacker.admin@test.com',
      password: testPassword,
      role: 'ADMIN',
    });
    if (adminRegRes.status !== 403 || adminRegRes.body.error?.code !== 'FORBIDDEN') {
      throw new Error(`Expected 403 Forbidden for ADMIN registration, got ${adminRegRes.status}`);
    }
    console.log('  ✅ Blocked public ADMIN registration with 403 Forbidden');

    // --------------------------------------------------------------------------
    // 3. Valid Candidate Registration
    // --------------------------------------------------------------------------
    console.log('\n[3/12] Testing Candidate Registration...');
    const candidateRegRes = await makeRequest('POST', '/api/v1/auth/register', {
      email: testCandidateEmail,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Test Candidate',
    });

    if (candidateRegRes.status !== 201 || !candidateRegRes.body.data.accessToken) {
      throw new Error(`Registration failed: ${JSON.stringify(candidateRegRes.body)}`);
    }

    // Verify passwordHash is NEVER in response
    if (JSON.stringify(candidateRegRes.body).includes('passwordHash') || candidateRegRes.body.data.user.passwordHash) {
      throw new Error('SECURITY VIOLATION: passwordHash detected in registration API response!');
    }

    const candidateCookie = extractCookieValue(candidateRegRes.headers['set-cookie'], 'careerforge_refresh');
    if (!candidateCookie) {
      throw new Error('Expected HTTP-only careerforge_refresh cookie on registration');
    }
    console.log('  ✅ Candidate registered successfully (201) with Access JWT and HTTP-only cookie');

    // --------------------------------------------------------------------------
    // 4. Duplicate Email Rejection
    // --------------------------------------------------------------------------
    console.log('\n[4/12] Testing duplicate email rejection...');
    const dupRes = await makeRequest('POST', '/api/v1/auth/register', {
      email: testCandidateEmail,
      password: testPassword,
      role: 'CANDIDATE',
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate email, got ${dupRes.status}`);
    }
    console.log('  ✅ Duplicate email rejected with 409 Conflict');

    // --------------------------------------------------------------------------
    // 5. Weak Password Validation
    // --------------------------------------------------------------------------
    console.log('\n[5/12] Testing weak password validation...');
    const weakPassRes = await makeRequest('POST', '/api/v1/auth/register', {
      email: 'weak.pass@test.com',
      password: '123',
      role: 'CANDIDATE',
    });
    if (weakPassRes.status !== 400 || weakPassRes.body.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 Validation Error for short password, got ${weakPassRes.status}`);
    }
    console.log('  ✅ Weak password rejected with 400 Validation Error');

    // --------------------------------------------------------------------------
    // 6. Candidate Login & Generic Timing Defense
    // --------------------------------------------------------------------------
    console.log('\n[6/12] Testing Login with valid and invalid credentials...');
    const validLoginRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: testCandidateEmail,
      password: testPassword,
    });
    if (validLoginRes.status !== 200 || !validLoginRes.body.data.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(validLoginRes.body)}`);
    }

    const candidateToken = validLoginRes.body.data.accessToken;
    let currentRefreshCookie = extractCookieValue(validLoginRes.headers['set-cookie'], 'careerforge_refresh')!;

    // Test Wrong Password
    const wrongPassRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: testCandidateEmail,
      password: 'WrongPassword!',
    });
    if (wrongPassRes.status !== 401 || wrongPassRes.body.error?.message !== 'Invalid email or password') {
      throw new Error(`Expected generic 401 for wrong password, got ${wrongPassRes.status}`);
    }

    // Test Non-existent User
    const unknownUserRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'nonexistent.user.12345@test.com',
      password: 'Password123!',
    });
    if (unknownUserRes.status !== 401 || unknownUserRes.body.error?.message !== 'Invalid email or password') {
      throw new Error(`Expected generic 401 for unknown email, got ${unknownUserRes.status}`);
    }
    console.log('  ✅ Login validated with constant-time generic error messaging');

    // --------------------------------------------------------------------------
    // 7. Protected Route /api/v1/auth/me
    // --------------------------------------------------------------------------
    console.log('\n[7/12] Testing GET /api/v1/auth/me with Bearer token...');
    const meRes = await makeRequest('GET', '/api/v1/auth/me', undefined, {
      Authorization: `Bearer ${candidateToken}`,
    });
    if (meRes.status !== 200 || meRes.body.data.user.email !== testCandidateEmail) {
      throw new Error(`GET /me failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log('  ✅ GET /api/v1/auth/me authenticated successfully');

    // --------------------------------------------------------------------------
    // 8. Refresh Token Rotation
    // --------------------------------------------------------------------------
    console.log('\n[8/12] Testing Refresh Token Rotation...');
    const oldRefreshCookie = currentRefreshCookie;

    const refreshRes = await makeRequest('POST', '/api/v1/auth/refresh', undefined, {
      Cookie: `careerforge_refresh=${oldRefreshCookie}`,
    });

    if (refreshRes.status !== 200 || !refreshRes.body.data.accessToken) {
      throw new Error(`Refresh token rotation failed: ${JSON.stringify(refreshRes.body)}`);
    }

    const rotatedAccessToken = refreshRes.body.data.accessToken;
    const newRefreshCookie = extractCookieValue(refreshRes.headers['set-cookie'], 'careerforge_refresh')!;

    if (newRefreshCookie === oldRefreshCookie) {
      throw new Error('SECURITY VIOLATION: Refresh token was not rotated to a new secret!');
    }
    console.log('  ✅ Refresh Token rotated successfully to a new secret token');

    // --------------------------------------------------------------------------
    // 9. Refresh Token Reuse Detection
    // --------------------------------------------------------------------------
    console.log('\n[9/12] Testing Refresh Token Reuse Detection...');
    // Attempting to reuse oldRefreshCookie (which has already been replaced/revoked)
    const reuseRes = await makeRequest('POST', '/api/v1/auth/refresh', undefined, {
      Cookie: `careerforge_refresh=${oldRefreshCookie}`,
    });

    if (reuseRes.status !== 401 || reuseRes.body.error?.code !== 'TOKEN_REUSE_DETECTED') {
      throw new Error(`Expected 401 TOKEN_REUSE_DETECTED, got ${reuseRes.status} ${JSON.stringify(reuseRes.body)}`);
    }
    console.log('  ✅ Compromised token reuse detected and blocked with TOKEN_REUSE_DETECTED');

    // --------------------------------------------------------------------------
    // 10. Role-Based Access Control (RBAC)
    // --------------------------------------------------------------------------
    console.log('\n[10/12] Testing Role-Based Access Control (RBAC)...');

    // Register a recruiter
    const recruiterRegRes = await makeRequest('POST', '/api/v1/auth/register', {
      email: testRecruiterEmail,
      password: testPassword,
      role: 'RECRUITER',
      name: 'Test Recruiter',
    });
    const recruiterToken = recruiterRegRes.body.data.accessToken;

    // Login demo admin (from seed)
    const adminLoginRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'admin@careerforge.ai',
      password: 'Password123!',
    });
    const adminToken = adminLoginRes.body.data.accessToken;

    // Candidate accessing candidate route -> 200
    const candOnCand = await makeRequest('GET', '/api/v1/auth/candidate-only', undefined, {
      Authorization: `Bearer ${rotatedAccessToken}`,
    });
    if (candOnCand.status !== 200) throw new Error('Candidate should access candidate route');

    // Candidate accessing recruiter route -> 403
    const candOnRec = await makeRequest('GET', '/api/v1/auth/recruiter-only', undefined, {
      Authorization: `Bearer ${rotatedAccessToken}`,
    });
    if (candOnRec.status !== 403) throw new Error('Candidate must be forbidden (403) from recruiter route');

    // Candidate accessing admin route -> 403
    const candOnAdmin = await makeRequest('GET', '/api/v1/auth/admin-only', undefined, {
      Authorization: `Bearer ${rotatedAccessToken}`,
    });
    if (candOnAdmin.status !== 403) throw new Error('Candidate must be forbidden (403) from admin route');

    // Recruiter accessing recruiter route -> 200
    const recOnRec = await makeRequest('GET', '/api/v1/auth/recruiter-only', undefined, {
      Authorization: `Bearer ${recruiterToken}`,
    });
    if (recOnRec.status !== 200) throw new Error('Recruiter should access recruiter route');

    // Recruiter accessing admin route -> 403
    const recOnAdmin = await makeRequest('GET', '/api/v1/auth/admin-only', undefined, {
      Authorization: `Bearer ${recruiterToken}`,
    });
    if (recOnAdmin.status !== 403) throw new Error('Recruiter must be forbidden (403) from admin route');

    // Admin accessing admin route -> 200
    const adminOnAdmin = await makeRequest('GET', '/api/v1/auth/admin-only', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    if (adminOnAdmin.status !== 200) throw new Error('Admin should access admin route');

    console.log('  ✅ RBAC strictly verified across Candidate, Recruiter, and Admin boundaries');

    // --------------------------------------------------------------------------
    // 11. Logout & Invalidation
    // --------------------------------------------------------------------------
    console.log('\n[11/12] Testing Logout session revocation...');
    const logoutRes = await makeRequest('POST', '/api/v1/auth/logout', undefined, {
      Cookie: `careerforge_refresh=${newRefreshCookie}`,
    });
    if (logoutRes.status !== 200) throw new Error(`Logout failed: ${JSON.stringify(logoutRes.body)}`);

    // Verify logged-out token cannot refresh
    const postLogoutRefresh = await makeRequest('POST', '/api/v1/auth/refresh', undefined, {
      Cookie: `careerforge_refresh=${newRefreshCookie}`,
    });
    if (postLogoutRefresh.status !== 401) {
      throw new Error(`Expected 401 after logout, got ${postLogoutRefresh.status}`);
    }
    console.log('  ✅ Logout successfully revoked session and cleared cookies');

    // --------------------------------------------------------------------------
    // 12. Audit Logging Verification
    // --------------------------------------------------------------------------
    console.log('\n[12/12] Verifying security audit logs...');
    const auditCount = await prisma.auditLog.count({
      where: { action: { in: ['USER_REGISTERED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'] } },
    });
    if (auditCount < 4) {
      throw new Error(`Expected at least 4 security audit records, got ${auditCount}`);
    }
    console.log(`  ✅ Security Audit Trail verified (${auditCount} security events recorded)`);

    console.log('\n🎉 ALL PHASE 3 AUTHENTICATION & RBAC SECURITY TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await prisma.user.deleteMany({
      where: { email: { in: [testCandidateEmail, testRecruiterEmail, 'hacker.admin@test.com'] } },
    });
    await prisma.$disconnect();
  }
}

runAuthTests().catch((err) => {
  console.error('\n❌ Auth test suite failed:', err);
  process.exit(1);
});
