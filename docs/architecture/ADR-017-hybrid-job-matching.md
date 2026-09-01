# ADR 017: Hybrid AI Job Matching & Explainable Candidate Scoring Engine

## Status
Accepted

## Context
Candidates and recruiters need a trustworthy, explainable, and deterministic method to evaluate candidate-to-job fit. Conventional AI matching approaches often rely on prompt-engineered LLM scoring, which yields arbitrary, non-reproducible, and ungrounded numeric scores. CareerForge AI requires a multi-signal hybrid matching architecture combining deterministic skill taxonomy resolution, FAISS vector retrieval, and concrete career criteria.

## Decisions

1. **Deterministic 100-Point Weighted Scoring Formula**:
   - **Skill Match (40%)**: Taxonomy-normalized canonical skill coverage using 80/20 required vs preferred weighting.
   - **FAISS Semantic Similarity (25%)**: L2-normalized cosine similarity vector search over candidate resume chunks ($0-0.85$ scale mapped to $0-100$). Missing embeddings safely fallback to 0 without system crashes.
   - **Experience Compatibility (20%)**: Candidate total experience years compared against job `experienceMin` and `experienceMax`, computing exact gap metrics.
   - **Education Compatibility (10%)**: Degree level and STEM field qualification evaluation.
   - **Location & Work Mode (5%)**: Remote compatibility non-penalization and onsite/hybrid proximity checks.
   - Formula:
     $$\text{finalScore} = \text{round}(\text{skillScore} \times 0.40 + \text{semanticScore} \times 0.25 + \text{experienceScore} \times 0.20 + \text{educationScore} \times 0.10 + \text{locationScore} \times 0.05, 2)$$

2. **Database Caching & Invalidation Strategy**:
   - Persisted in `MatchReport` model with compound unique constraint `@@unique([candidateId, jobId])`.
   - Stale detection checks timestamps (`candidate.updatedAt`, `job.updatedAt`, `resume.updatedAt`) and `engineVersion === "1.0"`.

3. **RBAC & Multi-Tenant IDOR Protection**:
   - `GET /api/v1/jobs/:jobId/match`: Authenticated candidate views own match.
   - `GET /api/v1/recruiter/jobs/:jobId/candidates/:candidateId/match`: Recruiter owning the job (or Admin) views applicant match.

4. **Grounded Explainability**:
   - Structured factual explanation generated directly from the match results. LLMs are strictly prohibited from modifying scores or hallucinating facts.

## Consequences
- 100% reproducible and verifiable match scores across candidates and recruiters.
- Seamless feeding into Phase 14 Skill Gap Analysis and Personalized Learning Paths.
