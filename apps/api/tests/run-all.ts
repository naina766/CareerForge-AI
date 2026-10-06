/**
 * Master E2E Integration Test Runner for CareerForge AI API
 * Executes all integration test suites sequentially and outputs an aggregated summary.
 */
import { runAuthTests } from './auth.test.js';
import { runCandidateTests } from './candidate.test.js';
import { runResumeTests } from './resume.test.js';
import { runJobsTests } from './jobs.test.js';
import { runMatchingTests } from './matching.test.js';
import { runRecommendationsTests } from './recommendations.test.js';
import { runApplicationsTests } from './applications.test.js';
import { runRecruiterTests } from './recruiter.test.js';
import { runAdminTests } from './admin.test.js';
import { runIdorTests } from './isolation.test.js';
import { runSecurityTests } from './security.test.js';
import { runAiAssistantTests } from './ai-assistant.test.js';
import { runCompleteCandidateLifecycleTests } from './candidate-lifecycle.test.js';
import { closeConnections } from './helpers/test-setup.js';

interface SuiteResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: any;
}

async function runAllSuites() {
  console.log('===============================================================');
  console.log('🚀 CAREERFORGE AI — API / INTEGRATION E2E TEST RUNNER');
  console.log('===============================================================');

  const suites: Array<{ name: string; runner: () => Promise<void> }> = [
    { name: '1. Authentication & RBAC', runner: runAuthTests },
    { name: '2. Candidate Profile & Skills', runner: runCandidateTests },
    { name: '3. Resume Upload & Magic Bytes', runner: runResumeTests },
    { name: '4. Jobs Discovery & Filters', runner: runJobsTests },
    { name: '5. Matching Engine & Determinism', runner: runMatchingTests },
    { name: '6. Recommendations & Scoring', runner: runRecommendationsTests },
    { name: '7. Applications & Workflow', runner: runApplicationsTests },
    { name: '8. Recruiter Workspace & Pipeline', runner: runRecruiterTests },
    { name: '9. Admin & Observability Telemetry', runner: runAdminTests },
    { name: '10. IDOR & Tenant Boundaries', runner: runIdorTests },
    { name: '11. Security & Body Sanitization', runner: runSecurityTests },
    { name: '12. AI Career Assistant & RAG', runner: runAiAssistantTests },
    { name: '13. Full 14-Step Candidate Lifecycle', runner: runCompleteCandidateLifecycleTests },
  ];

  const results: SuiteResult[] = [];
  const globalStart = Date.now();

  for (const suite of suites) {
    const start = Date.now();
    try {
      await suite.runner();
      results.push({ name: suite.name, passed: true, durationMs: Date.now() - start });
    } catch (err: any) {
      console.error(`\n❌ Suite Failed: ${suite.name}\n`, err);
      results.push({ name: suite.name, passed: false, durationMs: Date.now() - start, error: err });
    }
  }

  const totalDuration = ((Date.now() - globalStart) / 1000).toFixed(2);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log('📊 E2E INTEGRATION TEST EXECUTION SUMMARY');
  console.log('===============================================================');
  for (const r of results) {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${icon} | ${r.name} (${r.durationMs}ms)`);
  }
  console.log('---------------------------------------------------------------');
  console.log(`Total Suites: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount} | Total Duration: ${totalDuration}s`);
  console.log('===============================================================\n');

  await closeConnections();

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllSuites().catch(async (err) => {
  console.error('Fatal test runner failure:', err);
  await closeConnections();
  process.exit(1);
});
