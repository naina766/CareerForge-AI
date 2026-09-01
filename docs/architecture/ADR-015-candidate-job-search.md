# ADR-015: Candidate Job Discovery, Faceted Search & Canonical Skill Filtering

## Status
Accepted (Phase 11)

## Context
Candidates on CareerForge AI require a fast, deterministic, and faceted discovery system to search, filter, sort, and paginate active job vacancies. This discovery system must operate as a public, non-authenticated interface while maintaining strict security boundaries (excluding non-published jobs, private recruiter data, and expired vacancies). Basic faceted discovery must be decoupled from the upcoming Phase 13 AI/vector candidate-job matching engine to ensure sub-50ms query latency and transparent deterministic filtering.

## Architectural Decisions

### 1. Published-Only & Server-Side Expiration Boundary
The public discovery endpoint (`GET /api/v1/jobs`) strictly filters by:
- `status IN ('PUBLISHED', 'ACTIVE')`
- `applicationDeadline IS NULL OR applicationDeadline >= CURRENT_TIMESTAMP`

Vacancies in `DRAFT`, `PAUSED`, `CLOSED`, or `ARCHIVED` statuses—as well as published vacancies with past deadlines—are excluded at the PostgreSQL database level. Fetching private vacancies via direct slug or ID lookup returns a safe `404 Not Found`.

### 2. PostgreSQL-Backed Relational Filtering (No FAISS for Faceting)
- Faceted filtering (work mode, employment type, location, experience range, salary, and date sorting) is executed directly in PostgreSQL using parameterized Prisma queries.
- FAISS is reserved for semantic vector similarity retrieval (Phases 8 & 13) rather than keyword faceting.

### 3. Canonical Skill Normalization & ANY/ALL Matching
- Candidate search inputs for skills (e.g. `ReactJS`, `NodeJS`) are normalized to canonical skill IDs using the Phase 7 `SkillService.resolveSkill` engine before database execution.
- Filtering supports both `ANY` matching (matching jobs with at least one target skill) and `ALL` matching (matching jobs requiring all target skills via relational intersection).

### 4. Experience Range Overlap Logic
Candidate experience filters `[expMin, expMax]` evaluate potential role compatibility using overlapping bounds:
- `job.experienceMin <= filter.experienceMax`
- `job.experienceMax IS NULL OR job.experienceMax >= filter.experienceMin`

### 5. Server-Side Pagination & Safe Sorting Whitelist
- Pagination parameters (`page` default 1, `limit` default 20, max 50) return structured metadata (`total`, `totalPages`, `hasNextPage`, `hasPreviousPage`) calculated via atomic database count operations.
- Sort parameters are validated against a strict whitelist: `newest` (`createdAt DESC`), `oldest` (`createdAt ASC`), `salary` (`salaryMin DESC`), `deadline` (`applicationDeadline ASC`).

### 6. Client URL Synchronization
Search inputs, active filter selections, pagination, and sort order are bidirectionally synchronized with browser URL query parameters (`/jobs?search=react&workMode=REMOTE...`), enabling refresh persistence, shareable links, and native browser navigation history.

### 7. Recruiter Privacy & Public Envelopes
Public job endpoints sanitize sensitive recruiter metadata, returning only public organization details, job specifications, and canonical skill requirements without exposing recruiter user IDs or contact information.

## Consequences
- **Positive**: High query performance, deterministic and explainable results, zero leakage of draft/expired vacancies, and seamless URL state synchronization.
- **Trade-off**: Requires database index optimization on `status`, `applicationDeadline`, `workMode`, `employmentType`, and `createdAt` for high-concurrency public traffic.
