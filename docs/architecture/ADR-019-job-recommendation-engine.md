# ADR-019: Personalized Candidate Job Recommendation Engine

## Status
**ACCEPTED** (Phase 15 Implementation)

## Context
Candidates browsing job discovery platforms face cognitive fatigue when sorting through dozens of active listings. While Phase 13 provides an explainable `MatchReport` answering *"How well do I match this specific vacancy?"*, candidates need a prioritized discovery feed answering:
> **"Which currently open positions are the best fit for me across my technical skills, career preferences, experience level, and market recency?"**

Key engineering challenges:
1. Ensuring the recommendation engine is **deterministic, grounded, and explainable**, avoiding uncalibrated LLM hallucinations.
2. Maintaining strict architectural separation between **PostgreSQL (transactional truth, caching, and state management)** and **FAISS (high-dimensional resume chunk vector retrieval)** without introducing `pgvector`.
3. Avoiding continuous re-computation overhead by caching recommendations in PostgreSQL and invalidating them on profile/preference/resume updates or engine version bumps (`engineVersion = "1.0"`).
4. Strictly filtering out expired vacancies and vacancies the candidate has already applied to or withdrawn from.

---

## Decision

### 1. Architectural Separation: PostgreSQL vs FAISS
- **PostgreSQL**: Stores all candidate profiles, candidate skills, career preferences, applications, vacancies, and cached `JobRecommendation` rows.
- **FAISS**: Embeds resume chunks (`sentence-transformers/all-MiniLM-L6-v2`) in the FastAPI AI service and performs vector similarity search with safe zero fallback if offline. Zero pgvector dependency.

### 2. Multi-Signal 100-Point Recommendation Formula
Recommendations are computed via a calibrated, weighted deterministic formula:

$$\text{recommendationScore} = \text{round}(0.40 \times \text{Skill} + 0.25 \times \text{Semantic} + 0.15 \times \text{Experience} + 0.15 \times \text{Preference} + 0.05 \times \text{Freshness}, 2)$$

#### Sub-Signal Definitions:
1. **Skill Compatibility (40% Weight)**:
   - Uses Phase 7 Canonical Skill Taxonomy and Phase 13 `SkillMatcher`.
   - Formula: $(80 \times \text{matchedRequired} / \text{totalRequired}) + (20 \times \text{matchedPreferred} / \text{totalPreferred})$.
2. **FAISS Semantic Similarity (25% Weight)**:
   - Cosine similarity between job description text and indexed resume chunks.
   - Normalized: $\le 0.0 \rightarrow 0$, $\ge 0.85 \rightarrow 100$, linear scaling in $(0, 0.85)$.
   - Safe Fallback: If resume is unindexed or FAISS offline, defaults to 0.
3. **Experience Compatibility (15% Weight)**:
   - Evaluates candidate total experience against `experienceMin` and `experienceMax`.
   - Scaled from 0 to 100 points with partial credit.
4. **Preference Compatibility (15% Weight)**:
   - Work Mode (35 pts): Remote roles fully compatible; preferred mode match gives 35 pts.
   - Location & Relocation (35 pts): Preferred location, remote, or willingness to relocate awards points.
   - Employment Type (15 pts): Match with preferred employment types.
   - Compensation (15 pts): Vacancy meets or exceeds candidate minimum salary.
   - Safe Unspecified Rule: Unset preferences receive full points without artificial penalty.
5. **Freshness & Recency (5% Weight)**:
   - Deterministic publication decay: $\le 3$d: 100, $\le 7$d: 90, $\le 14$d: 80, $\le 30$d: 65, $\le 60$d: 40, $> 60$d: 20.

#### Recommendation Categorization Levels:
- $90 - 100 \rightarrow \text{TOP_MATCH}$
- $80 - 89 \rightarrow \text{EXCELLENT_MATCH}$
- $70 - 79 \rightarrow \text{STRONG_MATCH}$
- $60 - 69 \rightarrow \text{GOOD_MATCH}$
- $50 - 59 \rightarrow \text{POSSIBLE_MATCH}$
- $< 50 \rightarrow \text{LOW_MATCH}$

### 3. Recommendation Cache & Provenance
- `JobRecommendation` model in PostgreSQL stores `recommendationScore`, `recommendationLevel`, `breakdown`, `matchedSkills`, `missingSkills`, `reason`, `source = "HYBRID_ENGINE"`, `engineVersion = "1.0"`, and `generatedAt`.
- Cached results are automatically invalidated when `candidateProfile.updatedAt > generatedAt`, `careerPreference.updatedAt > generatedAt`, or via explicit refresh `POST /api/v1/recommendations/jobs/refresh`.

### 4. Hard Filtering and Security
- Considers only `status IN ['PUBLISHED', 'ACTIVE']` and `applicationDeadline >= now || null`.
- Automatically excludes any job where the candidate already has an `Application` record.
- Strict RBAC: Candidate-only access to their own personalized feed. Recruiter access is rejected with `403 Forbidden`.

---

## Consequences

### Positive
- **Deterministic & Grounded**: Scores and explanations are completely reproducible and explainable.
- **High Performance**: PostgreSQL cache avoids re-running expensive vector search on every page view.
- **Privacy & Security**: Zero IDOR vulnerabilities; recommendations are private to each candidate.
- **Full Monorepo Integration**: Directly connects to Phase 11 Jobs, Phase 13 Matching, and Phase 14 Learning Paths.

### Negative / Trade-offs
- In cases where candidate has not uploaded a resume or FAISS is offline, semantic similarity defaults to 0 points while other 4 signals continue to compute deterministically.
