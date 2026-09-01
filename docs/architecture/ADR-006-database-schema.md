# ADR-006: Relational Data Modeling, pgvector Embeddings & Integrity Constraints

## Status
Accepted

## Context
CareerForge AI requires a relational schema to manage users, candidate profiles, work histories, educations, resumes, job postings, skills taxonomy, application tracking with audit trails, subscriptions, and AI usage metrics. In addition, it requires high-dimensional vector embeddings (1536-dimensional) for semantic resume chunking and explainable candidate-job matching.

## Decision
We defined our complete domain schema in `prisma/schema.prisma` with PostgreSQL as the single source of truth, leveraging `pgvector` for vector columns.

### 1. Key Schema Architecture
- **Unified Relational & Vector Store**: `ResumeChunk` utilizes `embedding Unsupported("vector(1536)")` alongside structured chunk metadata (`section`, `chunkType`, `page`).
- **Normalized Canonical Taxonomy**: `Skill` model enforces unique canonical names with alias mapping in JSONB (e.g. `['React.js', 'ReactJS'] -> 'React'`). Many-to-many relationships via explicit join models `ResumeSkill` and `JobSkill`.
- **Application Lifecycle Tracking**: `Application` uses composite unique constraint `@@unique([candidateId, jobId])` to prevent duplicate submissions, and links to `ApplicationStatusHistory` for an immutable timeline.
- **Explainable Match Reports**: `MatchReport` stores the deterministic sub-scores (`skillScore`, `semanticScore`, `experienceScore`, `educationScore`, `locationScore`) and structured JSON arrays for `matchedSkills`, `missingSkills`, and `experienceGaps`.
- **Audit & Observability**: `AuditLog`, `AIAnalysis`, and `AIUsage` models record security events, LLM model versions, token counts, and request latencies.

### 2. Cascading Strategy
- **User / Candidate / Recruiter**: Deleting a `User` cascades to its `CandidateProfile` or `RecruiterProfile`, and subsequently to their owned records (resumes, educations, experiences, jobs).
- **Audit Logs**: Deleting a `User` sets `userId` in `AuditLog` to `NULL` (`onDelete: SetNull`) to retain permanent security records for compliance and audit investigations.
- **Match Reports**: `applicationId` is set to `NULL` upon application deletion, preserving candidate match telemetry.

### 3. Indexing Strategy
- **High-frequency filter fields**: `User.email`, `Job.status`, `Job.location`, `Job.workMode`, `Application.status`, `Application.createdAt`.
- **Foreign keys**: Indexed across all child tables (`candidateId`, `jobId`, `resumeId`, `userId`, `sessionId`).
- **Vector search**: pgvector cosine distance operations (`<=>`).

## Consequences
### Positive
- Strict relational integrity and ACID compliance across full application lifecycles.
- Single database engine for both relational and vector operations.
- Zero duplicate applications or ambiguous skill records.
