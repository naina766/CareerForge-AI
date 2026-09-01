# ADR-014: Recruiter Job Lifecycle Management & Canonical Skill Taxonomy

## Status
Accepted (Phase 10)

## Context
In CareerForge AI, recruiters require a robust, enterprise-grade job posting and lifecycle management subsystem. Vacancy postings must not simply be static text records, but stateful domain entities governed by a deterministic lifecycle state machine (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`, `ARCHIVED`), strict role-based access controls (RBAC), multi-tenant ownership isolation, and structured relational ties to canonical skill entities (established in Phase 7).

## Architectural Decisions

### 1. Job State Machine & Transition Rules
Direct arbitrary status manipulation in the database is strictly rejected. Status changes must adhere to a deterministic state graph:
- `DRAFT` $\rightarrow$ `PUBLISHED`, `ARCHIVED`
- `PUBLISHED` $\rightarrow$ `PAUSED`, `CLOSED`
- `PAUSED` $\rightarrow$ `PUBLISHED` (Reopen), `CLOSED`
- `CLOSED` $\rightarrow$ `ARCHIVED`
- `ARCHIVED` $\rightarrow$ No transitions (terminal state)

Any unauthorized transition attempts (e.g. `CLOSED` $\rightarrow$ `PUBLISHED` or `ARCHIVED` $\rightarrow$ `PUBLISHED`) result in a `400 Bad Request` (`INVALID_STATUS_TRANSITION`).

### 2. Multi-Tenant Recruiter Ownership Isolation
- Recruiter identity is derived strictly from the authenticated JWT session context (`req.user.id`).
- All mutation endpoints (`PATCH /recruiter/jobs/:jobId`, `PATCH /recruiter/jobs/:jobId/status`, `POST /recruiter/jobs/:jobId/duplicate`, `PATCH /recruiter/jobs/:jobId/archive`) verify that `job.recruiterId === authenticatedRecruiter.id`. Cross-tenant manipulation returns `403 Forbidden`.
- Candidates attempting to access recruiter endpoints are blocked with `403 Forbidden` at the route middleware boundary.

### 3. Canonical Skill Normalization & Deduplication
- Rather than persisting arbitrary unstructured strings, skill inputs provided by recruiters are resolved via the Phase 7 canonical taxonomy engine (`SkillService.resolveSkill`).
- Variations such as `"ReactJS"` and `"React"` are deduplicated to a single canonical `Skill` record with configurable importance (`REQUIRED` vs `PREFERRED`) and minimum experience requirements.

### 4. Transactional Job & Skill Management
- Job creation and updates execute inside PostgreSQL transactions (`prisma.$transaction`) to guarantee that `Job` records and their relational `JobSkill` dependencies remain strictly atomic and consistent.

### 5. URL-Safe Unique Slugs
- Every job generates a URL-safe, SEO-friendly slug (e.g., `senior-full-stack-engineer-apex-cloud-solutions`).
- Automatic collision detection appends incremental numeric counters to guarantee uniqueness across the platform.

### 6. Event-Driven Architecture & Audit Trail
- Recruiter mutations record structured `AuditLog` entries (`JOB_CREATED`, `JOB_UPDATED`, `JOB_PUBLISHED`, `JOB_PAUSED`, `JOB_CLOSED`, `JOB_ARCHIVED`).
- Domain event contracts are staged for downstream event streaming pipelines.

## Consequences
- **Positive**: Eliminates invalid vacancy states, guarantees recruiter tenant isolation, enforces canonical skill consistency across future matching phases (Phase 11-13), and provides full auditability.
- **Trade-off**: Requires strict validation on all status transitions and duplicate skill payloads, which is handled gracefully by Zod validation schemas and comprehensive unit/integration test suites.
