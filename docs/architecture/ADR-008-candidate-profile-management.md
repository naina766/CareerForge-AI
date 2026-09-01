# ADR-008: Candidate Profile Management, Relational Career Identity & IDOR Security

## Status
Accepted

## Context
In CareerForge AI, candidates require a structured, relational career profile encompassing basic contact details, professional bio, canonical technical skills, work experience history, education records, and career preferences.

Key architectural requirements:
1. **Relational Data Integrity**: Avoid storing entire candidate profiles as unindexed, unstructured JSON blobs. Skills, experiences, educations, and preferences must exist as normalized relational tables for queryability and future vector & heuristic matching.
2. **Resume vs. Profile Separation**: The Candidate Profile serves as the structured source of truth for the candidate's career identity, while uploaded Resumes (introduced in Phase 5) remain dedicated documents parsed into text chunks and pgvector embeddings.
3. **Insecure Direct Object Reference (IDOR) Protection**: Candidate A must never be able to view, mutate, or delete Candidate B's profile, skills, education, or work experiences. All candidate endpoints must verify ownership on the server side by scoping queries to `candidateId === profile.id`.
4. **Deterministic Profile Completeness**: Transparent scoring function with zero LLM hallucinations or score drift.

## Decision

### 1. Relational Model Hierarchy
```text
User (1) ─── (1) CandidateProfile
                     ├── (Many) CandidateSkill ─── (1) Skill (Canonical Taxonomy)
                     ├── (Many) Experience
                     ├── (Many) Education
                     └── (1) CareerPreference
```

### 2. Candidate Ownership & Server-Side Security
- All candidate endpoints are mounted under `/api/v1/candidates/me/*`.
- Protected by `requireAuth` and `requireRole('CANDIDATE')`.
- The user's ID is derived strictly from `req.user.id` (extracted from the authenticated JWT), never from request parameters or request body.
- When mutating sub-resources (`/me/experience/:experienceId`, `/me/education/:educationId`, `/me/skills/:skillId`), the server verifies that the record's `candidateId` matches the authenticated candidate's profile ID before executing updates or deletes.

### 3. Basic Skill Normalization
- Raw skill inputs are normalized against canonical mappings (e.g. `js` -> `JavaScript`, `postgres` -> `PostgreSQL`, `node` -> `Node.js`).
- Duplicate skill assignments on a candidate profile are rejected with `409 Conflict`.
- Note: The full multi-category skill taxonomy engine and synonym graph will be introduced in Phase 7.

### 4. Deterministic Profile Completeness Algorithm
- **Basic Information** (15%): Name, Headline, Location/City/Country, Phone.
- **Professional Summary** (15%): Bio/Summary length >= 30 characters.
- **Technical Skills** (20%): At least 3 structured skills on profile.
- **Work Experience** (20%): At least 1 experience record.
- **Education** (15%): At least 1 education record.
- **Career Preferences** (15%): At least 1 desired job title and location/work mode.
- **Total**: 100% deterministic, returning completed and missing sections.

## Consequences
### Positive
- Strict server-side IDOR protection guarantees candidate isolation.
- Normalized relational structure enables efficient querying, filtering, and indexing.
- Clear separation between candidate profile identity and future resume parsing/embeddings.
- Transparent profile strength indicator guides candidates to complete all necessary sections.
