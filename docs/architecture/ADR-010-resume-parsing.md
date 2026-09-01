# ADR-010: Resume Parsing Service, Text Processing, and Structured Intelligence

## Status
Accepted

## Context
In CareerForge AI, candidates upload resume documents in PDF format. To enable ATS scoring, semantic embedding generation, explainable job matching, and RAG career assistants, the raw PDF document must be reliably converted into structured resume intelligence (personal details, summary, explicit technical skills, work experience history, education, and technical projects).

Key architectural requirements:
1. **Service Boundary Separation**:
   - **Express API**: Handles authentication, candidate RBAC, ownership verification, database storage (`Resume`, `ParsedResume`), and orchestration.
   - **FastAPI AI Service**: Handles compute-heavy text operations: PDF text extraction (`pypdf`), text cleaning/normalization, deterministic section detection, and structured entity extraction.
2. **No Hallucination Rule**: The parser must extract only explicit, verifiable information present in the resume text. Missing fields default to `null` or `[]`. Missing skills (e.g. AWS) must never be hallucinated or assumed.
3. **Prompt Injection & Untrusted Content Containment**: The resume text is untrusted external user input. System prompts explicitly isolate untrusted resume content within delimiter blocks (`<<<RESUME_START>>>` ... `<<<RESUME_END>>>`) and instruct models to treat instructions contained within resumes as plain literal text.
4. **Deterministic Fallback & Mock Support**: In local development, testing, or offline environments, a regex-based deterministic parser extracts contact details, skills, and timeline blocks without requiring paid LLM APIs.
5. **Separation of Profile vs. Parsed Resume**:
   - `CandidateProfile`: The candidate's manually curated career identity and source of truth.
   - `ParsedResume`: Machine-extracted resume metadata linked 1-to-1 with `Resume`. The parser never automatically overwrites `CandidateProfile` without explicit candidate review.
6. **Strict IDOR & Multi-Tenant Security**: Parsing endpoints (`/api/v1/candidates/me/resume/parse` and `/api/v1/candidates/me/resume/parsed`) resolve candidate identity strictly through authenticated session tokens (`req.user.id`).

## Decision

### 1. Resume Parsing Pipeline
```text
Candidate (Web Dashboard)
      ↓
POST /api/v1/candidates/me/resume/parse
      ↓
Express API (Verify Candidate Ownership & retrieve Storage Buffer)
      ↓
POST /api/v1/resume/parse (FastAPI AI Service)
      ↓
PDFTextExtractor (pypdf) ──> TextCleaner ──> SectionDetector
      ↓
Structured Entity Extraction (Deterministic / LLMProvider)
      ↓
Pydantic Validation (ResumeExtraction)
      ↓
Express API (Persist in PostgreSQL `ParsedResume` table)
      ↓
Resume status updated to `PARSED`
```

### 2. Database Schema Model
```prisma
model ParsedResume {
  id            String   @id @default(uuid())
  resumeId      String   @unique
  rawText       String
  parsedData    Json
  parserVersion String   @default("1.0.0")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  resume Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@index([resumeId])
}
```

### 3. Downstream Hand-Off
- Phase 6 intentionally **does not** perform ATS scoring, vector embeddings, or job matching.
- The structured `ParsedResume` output provides the clean input data required for:
  - **Phase 7**: Skill Taxonomy & Synonym Normalization
  - **Phase 8**: pgvector Embeddings Generation
  - **Phase 9**: ATS Compatibility Analysis
  - **Phase 13**: Explainable Job Matching

## Consequences
### Positive
- Strict separation between microservices (I/O & Auth in Node vs. Python NLP/LLM orchestration).
- Robust defense against prompt injection and zero hallucinated skill attributes.
- Local development works 100% free with mock/deterministic fallback.
- Clear relational persistence with isolated multi-tenant access.
