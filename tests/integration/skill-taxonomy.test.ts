import assert from 'assert';
import http from 'http';
import { createServer } from '../../apps/api/src/server.js';
import { prisma } from '@careerforge/database';
import { normalizeSkillName, stringSimilarity } from '../../apps/api/src/modules/skill/skill.normalizer.js';
import { SkillService } from '../../apps/api/src/modules/skill/skill.service.js';

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
          const raw = Buffer.concat(chunks).toString('utf-8');
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
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
    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

async function runSkillTaxonomyTests() {
  console.log('🧪 Starting Phase 7 Skill Taxonomy & Normalization Engine integration test suite...\n');

  // Start API server
  const app = createServer();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4000;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const testEmailCandidate = `cand_taxonomy_${Date.now()}@example.com`;
  const testEmailAdmin = `admin_taxonomy_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let candidateToken = '';
  let adminToken = '';

  try {
    // -------------------------------------------------------------------------
    // [1/8] Deterministic Normalizer & String Similarity Unit Verification
    // -------------------------------------------------------------------------
    console.log('[1/8] Verifying deterministic normalization and distance metrics...');
    assert.strictEqual(normalizeSkillName('  Node.JS  '), 'nodejs');
    assert.strictEqual(normalizeSkillName('React-JS'), 'reactjs');
    assert.strictEqual(normalizeSkillName('Postgre_SQL'), 'postgresql');
    assert.strictEqual(normalizeSkillName('.NET Core'), 'dotnetcore');
    assert.strictEqual(normalizeSkillName('C++'), 'c++');
    assert.strictEqual(normalizeSkillName('C#'), 'c#');

    // Negative distinction checks
    assert.notStrictEqual(normalizeSkillName('Java'), normalizeSkillName('JavaScript'));
    assert.notStrictEqual(normalizeSkillName('React'), normalizeSkillName('React Native'));
    assert.notStrictEqual(normalizeSkillName('C'), normalizeSkillName('C++'));
    assert.notStrictEqual(normalizeSkillName('C++'), normalizeSkillName('C#'));
    console.log('  ✅ Deterministic normalizer preserve tokens and meaningful distinctions');

    // -------------------------------------------------------------------------
    // [2/8] Taxonomy Resolution Logic
    // -------------------------------------------------------------------------
    console.log('\n[2/8] Verifying canonical and alias skill resolution in SkillService...');
    const resJS = await SkillService.resolveSkill('JS');
    assert.strictEqual(resJS.canonicalName, 'JavaScript');
    assert.strictEqual(resJS.matchType, 'ALIAS');
    assert.strictEqual(resJS.confidence, 1.0);

    const resNode = await SkillService.resolveSkill('NodeJS');
    assert.strictEqual(resNode.canonicalName, 'Node.js');
    assert.strictEqual(resNode.matchType, 'ALIAS');

    const resPostgres = await SkillService.resolveSkill('Postgres');
    assert.strictEqual(resPostgres.canonicalName, 'PostgreSQL');
    assert.strictEqual(resPostgres.matchType, 'ALIAS');

    const resReact = await SkillService.resolveSkill('react.js');
    assert.strictEqual(resReact.canonicalName, 'React');
    assert.strictEqual(resReact.matchType, 'ALIAS');

    const resK8s = await SkillService.resolveSkill('k8s');
    assert.strictEqual(resK8s.canonicalName, 'Kubernetes');
    assert.strictEqual(resK8s.matchType, 'ALIAS');
    console.log('  ✅ Skill alias resolution verified for JS, NodeJS, Postgres, React.js, K8s');

    // -------------------------------------------------------------------------
    // [3/8] Batch Resolution API & Deduplication
    // -------------------------------------------------------------------------
    console.log('\n[3/8] Testing batch skill resolution (POST /api/v1/skills/resolve)...');
    const batchRes = await makeRequest('POST', '/api/v1/skills/resolve', {
      skills: ['JS', 'JavaScript', 'Javascript', 'NodeJS', 'Node', 'Postgres', 'PostgreSQL'],
    });

    assert.strictEqual(batchRes.status, 200);
    const results = batchRes.body.data.results;
    assert.strictEqual(results.length, 3); // Deduplicated to JavaScript, Node.js, PostgreSQL
    const names = results.map((r: any) => r.canonicalName);
    assert.ok(names.includes('JavaScript'));
    assert.ok(names.includes('Node.js'));
    assert.ok(names.includes('PostgreSQL'));
    console.log('  ✅ Batch resolution and duplicate elimination verified (7 aliases -> 3 canonical skills)');

    // -------------------------------------------------------------------------
    // [4/8] Public Skill Search & Filtering
    // -------------------------------------------------------------------------
    console.log('\n[4/8] Testing skill search and category filtering (GET /api/v1/skills)...');
    const searchRes = await makeRequest('GET', '/api/v1/skills?query=react');
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.data.skills.length >= 1);
    assert.ok(searchRes.body.data.skills.some((s: any) => s.name === 'React'));

    const catRes = await makeRequest('GET', '/api/v1/skills?category=FRONTEND');
    assert.strictEqual(catRes.status, 200);
    assert.ok(catRes.body.data.skills.length >= 2);
    console.log('  ✅ Search by query and category filtering verified');

    // -------------------------------------------------------------------------
    // [5/8] Setup Accounts (Candidate and Admin)
    // -------------------------------------------------------------------------
    console.log('\n[5/8] Provisioning test accounts...');
    const candReg = await makeRequest('POST', '/api/v1/auth/register', {
      email: testEmailCandidate,
      password: testPassword,
      role: 'CANDIDATE',
      name: 'Taxonomy Candidate',
    });
    assert.strictEqual(candReg.status, 201);
    candidateToken = candReg.body.data.accessToken;

    const adminLogin = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'admin@careerforge.ai',
      password: testPassword,
    });
    assert.strictEqual(adminLogin.status, 200);
    adminToken = adminLogin.body.data.accessToken;
    console.log('  ✅ Accounts provisioned (Candidate registered, Admin authenticated)');

    // -------------------------------------------------------------------------
    // [6/8] Candidate Skill Addition & Canonical Mapping
    // -------------------------------------------------------------------------
    console.log('\n[6/8] Testing Candidate Skill creation with alias normalization...');
    const addSkillRes = await makeRequest(
      'POST',
      '/api/v1/candidates/me/skills',
      { name: 'ReactJS', proficiency: 'EXPERT' },
      { Authorization: `Bearer ${candidateToken}` }
    );
    assert.strictEqual(addSkillRes.status, 201);
    assert.strictEqual(addSkillRes.body.data.skill.name, 'React'); // Saved canonical name
    assert.strictEqual(addSkillRes.body.data.proficiency, 'EXPERT');

    // Attempting to add 'React' again must be rejected as duplicate
    const dupSkillRes = await makeRequest(
      'POST',
      '/api/v1/candidates/me/skills',
      { name: 'React', proficiency: 'INTERMEDIATE' },
      { Authorization: `Bearer ${candidateToken}` }
    );
    assert.strictEqual(dupSkillRes.status, 409);
    console.log("  ✅ Candidate alias 'ReactJS' correctly saved as canonical 'React' and duplicates prevented");

    // -------------------------------------------------------------------------
    // [7/8] Admin Taxonomy Management & RBAC Protection
    // -------------------------------------------------------------------------
    console.log('\n[7/8] Testing Admin taxonomy routes and Candidate RBAC protection...');
    // Candidate attempting admin creation should get 403
    const candAdminAttempt = await makeRequest(
      'POST',
      '/api/v1/admin/skills',
      { name: 'Rust Analyzer', category: 'TOOLS' },
      { Authorization: `Bearer ${candidateToken}` }
    );
    assert.strictEqual(candAdminAttempt.status, 403);

    // Admin creating a new canonical skill
    const adminCreateSkill = await makeRequest(
      'POST',
      '/api/v1/admin/skills',
      { name: 'Rust Analyzer', category: 'TOOLS', aliases: ['ra', 'rust-analyzer'] },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(adminCreateSkill.status, 201);
    assert.strictEqual(adminCreateSkill.body.data.skill.name, 'Rust Analyzer');

    // Admin adding an alias
    const skillId = adminCreateSkill.body.data.skill.id;
    const addAliasRes = await makeRequest(
      'POST',
      `/api/v1/admin/skills/${skillId}/aliases`,
      { alias: 'rust lsp' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(addAliasRes.status, 201);

    // Resolve newly created alias
    const resolveNew = await SkillService.resolveSkill('rust lsp');
    assert.strictEqual(resolveNew.canonicalName, 'Rust Analyzer');
    assert.strictEqual(resolveNew.matchType, 'ALIAS');
    console.log('  ✅ Admin taxonomy RBAC and dynamic alias registration verified');

    // -------------------------------------------------------------------------
    // [8/8] Audit Log Verification
    // -------------------------------------------------------------------------
    console.log('\n[8/8] Verifying Security Audit Logs for skill operations...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { action: 'SKILL_ADDED' },
    });
    assert.ok(auditLogs.length >= 1);
    console.log(`  ✅ Security Audit Trail verified (${auditLogs.length} SKILL_ADDED event recorded)`);

    console.log('\n🎉 ALL PHASE 7 SKILL TAXONOMY & NORMALIZATION ENGINE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    // Cleanup test users and test skills
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailCandidate, testEmailAdmin] } },
    });
    await prisma.skill.deleteMany({
      where: { name: 'Rust Analyzer' },
    });
    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
  }
}

runSkillTaxonomyTests().catch((err) => {
  console.error('❌ Phase 7 Test suite failed:', err);
  process.exit(1);
});
