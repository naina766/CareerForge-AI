import assert from 'node:assert';
import { supertest, createTestCandidate, cleanupUsers } from './helpers/test-setup.js';

export async function runCandidateTests() {
  console.log('\n--- 🧪 RUNNING CANDIDATE E2E INTEGRATION TESTS ---');
  const candidate = await createTestCandidate('cand-flow');
  let skillId = '';
  let expId = '';
  let eduId = '';

  try {
    // 1. Get Candidate Profile
    const profileRes = await supertest
      .get('/api/v1/candidates/me/profile')
      .set('Authorization', candidate.authHeader);
    assert.strictEqual(profileRes.status, 200, `Expected 200 from getProfile, got ${profileRes.status}`);
    assert.strictEqual(profileRes.body.data.profile.name, 'Candidate cand-flow');
    console.log('  ✅ Candidate retrieved own profile');

    // 2. Update Candidate Profile
    const updateRes = await supertest
      .patch('/api/v1/candidates/me/profile')
      .set('Authorization', candidate.authHeader)
      .send({
        headline: 'Lead Cloud & Systems Architect',
        experienceYears: 6,
        summary: 'Experienced distributed systems engineer with cloud-native focus.',
        location: 'Seattle, WA',
        city: 'Seattle',
        country: 'USA',
        workMode: 'REMOTE',
        githubUrl: 'https://github.com/testcandidate',
      });
    assert.strictEqual(updateRes.status, 200, `Expected 200 from updateProfile, got ${updateRes.status}`);
    assert.strictEqual(updateRes.body.data.profile.headline, 'Lead Cloud & Systems Architect');
    assert.strictEqual(updateRes.body.data.profile.workMode, 'REMOTE');
    console.log('  ✅ Candidate updated profile fields');

    // 3. Add Candidate Skill
    const addSkillRes = await supertest
      .post('/api/v1/candidates/me/skills')
      .set('Authorization', candidate.authHeader)
      .send({
        name: 'TypeScript',
        proficiency: 'EXPERT',
      });
    assert.strictEqual(addSkillRes.status, 201, `Expected 201 from addSkill, got ${addSkillRes.status}`);
    assert.strictEqual(addSkillRes.body.data.skill.name, 'TypeScript');
    assert.strictEqual(addSkillRes.body.data.proficiency, 'EXPERT');
    const candidateSkillId = addSkillRes.body.data.id;
    console.log('  ✅ Candidate added normalized skill (TypeScript)');

    // 4. Update Candidate Skill Proficiency
    const updateSkillRes = await supertest
      .patch(`/api/v1/candidates/me/skills/${candidateSkillId}`)
      .set('Authorization', candidate.authHeader)
      .send({
        proficiency: 'ADVANCED',
      });
    assert.strictEqual(updateSkillRes.status, 200, `Expected 200 from updateSkill, got ${updateSkillRes.status}`);
    assert.strictEqual(updateSkillRes.body.data.proficiency, 'ADVANCED');
    console.log('  ✅ Candidate updated skill proficiency');

    // 5. Add Work Experience
    const expRes = await supertest
      .post('/api/v1/candidates/me/experience')
      .set('Authorization', candidate.authHeader)
      .send({
        company: 'Cloud Scale Inc.',
        title: 'Senior Infrastructure Engineer',
        location: 'Remote',
        employmentType: 'FULL_TIME',
        startDate: '2021-01-01',
        current: true,
        description: 'Led migration to KRaft Kafka clusters and containerized services.',
      });
    assert.strictEqual(expRes.status, 201, `Expected 201 from addExperience, got ${expRes.status}`);
    assert.strictEqual(expRes.body.data.company, 'Cloud Scale Inc.');
    expId = expRes.body.data.id;
    console.log('  ✅ Candidate added work experience record');

    // 6. Add Education
    const eduRes = await supertest
      .post('/api/v1/candidates/me/education')
      .set('Authorization', candidate.authHeader)
      .send({
        institution: 'University of Washington',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2015-09-01',
        endDate: '2019-06-01',
        grade: '3.8 GPA',
        description: 'Focus on distributed systems and algorithm analysis.',
      });
    assert.strictEqual(eduRes.status, 201, `Expected 201 from addEducation, got ${eduRes.status}`);
    assert.strictEqual(eduRes.body.data.institution, 'University of Washington');
    eduId = eduRes.body.data.id;
    console.log('  ✅ Candidate added education history');

    // 7. Update Career Preferences
    const prefRes = await supertest
      .put('/api/v1/candidates/me/preferences')
      .set('Authorization', candidate.authHeader)
      .send({
        desiredJobTitles: ['Principal Engineer', 'Staff Systems Engineer'],
        preferredLocations: ['Remote', 'Seattle, WA'],
        preferredWorkModes: ['REMOTE'],
        preferredEmploymentTypes: ['FULL_TIME'],
        minimumSalary: 160000,
        maximumSalary: 220000,
        currency: 'USD',
        willingToRelocate: false,
        preferredIndustries: ['Cloud Computing', 'AI / ML Infrastructure'],
      });
    assert.strictEqual(prefRes.status, 200, `Expected 200 from updatePreferences, got ${prefRes.status}`);
    assert.strictEqual(prefRes.body.data.minimumSalary, 160000);
    console.log('  ✅ Candidate updated career preferences');

    // 8. Retrieve Full Profile Summary
    const summaryRes = await supertest
      .get('/api/v1/candidates/me/profile/summary')
      .set('Authorization', candidate.authHeader);
    assert.strictEqual(summaryRes.status, 200, `Expected 200 from getProfileSummary, got ${summaryRes.status}`);
    assert.strictEqual(summaryRes.body.data.skillsCount >= 1, true);
    assert.strictEqual(summaryRes.body.data.experiencesCount >= 1, true);
    assert.strictEqual(summaryRes.body.data.educationsCount >= 1, true);
    assert.strictEqual(summaryRes.body.data.hasPreferences, true);
    assert.strictEqual(summaryRes.body.data.completeness.percentage > 0, true);
    console.log('  ✅ Full profile summary aggregation validated');

    console.log('🎉 Candidate integration test suite passed!');
  } finally {
    await cleanupUsers([candidate.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('candidate.test.ts') || process.argv[1]?.endsWith('candidate.test.js')) {
  runCandidateTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Candidate integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
