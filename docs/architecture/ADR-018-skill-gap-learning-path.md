# ADR-018: Deterministic Skill Gap Analysis & Topological Personalized Learning Path Engine

## Status
Accepted (Phase 14)

## Context
Candidates reviewing job postings frequently find that their current skill profile does not meet 100% of the job's stated requirements. While traditional platforms simply display a rejection score or recommend generic courses via ungrounded LLM completions, candidates need an actionable, structured, and explainable career development path:
1. Which missing skills are critical blockers vs nice-to-haves?
2. In what sequence should missing skills be acquired, respecting foundational prerequisites?
3. Where can candidates find verified learning resources without hallucinated links?
4. How can candidates track their progress as they learn?

## Decision & Architecture

### 1. Source of Truth & Hybrid Separation
- **PostgreSQL**: Stores relational models for `SkillGapAnalysis`, `SkillGap`, `SkillDependency`, `LearningResource`, `LearningPath`, and `LearningPathItem`.
- **FAISS**: Exclusively used for vector search / semantic retrieval. No `pgvector` is used.
- **Phase 13 Integration**: Skill gaps consume the grounded outputs of Phase 13 `MatchReport` (`missingRequiredSkills`, `missingPreferredSkills`, `skills.required`, `skills.preferred`).

### 2. Deterministic Priority Scoring
Each missing skill is assigned an explainable priority score:
$$\text{priorityScore} = \text{requiredComponent} + \text{jobRelevance} + \text{dependencyImportance} + \text{semanticRelevance}$$
- `requiredComponent`: `REQUIRED = 50`, `PREFERRED = 25`
- `jobRelevance`: `0–25` (defaults to 20 for required, 15 for preferred)
- `dependencyImportance`: `0–15` (15 if it serves as a prerequisite to another missing skill, else 0)
- `semanticRelevance`: `0–10` (scaled from semantic similarity relevance)
- **Categorization**:
  - `HIGH`: $\ge 75$
  - `MEDIUM`: $50 - 74$
  - `LOW`: $< 50$

### 3. Edge-Case Safe Job Readiness Formula
$$\text{readinessScore} = \text{reqScore} + \text{prefScore}$$
- If `totalRequired > 0`: $\text{reqScore} = \left(\frac{\text{matchedRequired}}{\text{totalRequired}}\right) \times 80$, else $80$.
- If `totalPreferred > 0`: $\text{prefScore} = \left(\frac{\text{matchedPreferred}}{\text{totalPreferred}}\right) \times 20$, else $20$.
- **Readiness Levels**:
  - `JOB_READY`: $90 - 100$
  - `NEARLY_READY`: $75 - 89$
  - `DEVELOPING`: $60 - 74$
  - `SIGNIFICANT_GAPS`: $40 - 59$
  - `EARLY_STAGE`: $0 - 39$

### 4. Kahn's Topological Sort with Prerequisite Filtering
- Prerequisite dependencies (e.g. JavaScript $\rightarrow$ Node.js $\rightarrow$ Express, Docker $\rightarrow$ Kubernetes) are sequenced using Kahn's algorithm with priority tie-breaking.
- **Prerequisite Filtering**: Only skills missing from the candidate's profile are sequenced in the roadmap; existing skills are not added as gaps.
- **Cycle Resilience**: Circular dependencies are caught gracefully without infinite loops or errors.

### 5. Database-Grounded Learning Catalog (Zero Hallucination)
- Resources are strictly queried from PostgreSQL (`LearningResource`).
- The LLM is never permitted to invent course URLs or providers.

### 6. Candidate Privacy & RBAC
- Learning paths are private career assets owned by candidates (`/api/v1/jobs/:jobId/learning-path`). Recruiters cannot access candidate learning roadmaps.

## Consequences
- Clean, deterministic explainability for technical job matching and career development.
- Zero risk of LLM hallucinations in course recommendations.
- Resilient progress tracking with live status transitions (`NOT_STARTED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`).
