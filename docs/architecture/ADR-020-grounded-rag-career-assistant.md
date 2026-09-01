# ADR-020: Grounded RAG Career Assistant Architecture

## Status
**ACCEPTED** (Phase 16 Implementation)

## Context
Candidates utilizing CareerForge AI need an interactive career copilot to answer complex, personalized career questions (e.g., *"What are my biggest skill gaps for this vacancy?"*, *"What should I learn before Kubernetes?"*, *"How does my resume match this backend position?"*).

Unrestricted LLMs present severe risks:
1. **Hallucination & Score Inconsistency**: LLMs inventing non-existent skills, speculative match percentages, or fake online courses.
2. **Prompt Injection & Data Exfiltration**: Malicious candidates attempting to override system instructions (`Ignore previous instructions`) or exfiltrate private database records of other candidates.
3. **Loss of Provenance**: Candidates receiving advice without knowing which verified document (Resume, Vacancy, Gap Analysis, Learning Catalog) informed the answer.
4. **Architectural Confusion**: Over-relying on LLMs as a source of truth instead of grounding in transactional PostgreSQL records and FAISS vector indices.

---

## Decision

### 1. Separation of Concerns & Authoritative Ground Truth
- **PostgreSQL**: Authoritative transactional source of truth for candidate profile, canonical skills, applications, match reports, skill gap analyses, and learning roadmaps.
- **FAISS**: Embeds resume chunks (`sentence-transformers/all-MiniLM-L6-v2`) in the FastAPI AI service for semantic chunk retrieval.
- **FastAPI / Local Grounded Generator**: Synthesizes natural-language explanations *strictly constrained* to retrieved database facts and FAISS snippets. The LLM is **never** permitted to invent scores, skills, or courses.

### 2. Multi-Layer Security Architecture
- **PromptGuard**: Evaluates user prompts *prior to retrieval*. Intercepts jailbreaks, system prompt exfiltration, database credential snooping, and cross-candidate data queries, returning `status: "BLOCKED"`.
- **Untrusted Context Delimiting**: All retrieved resume text and job descriptions are tagged as `UNTRUSTED CONTEXT DATA` within secure delimiters (`### UNTRUSTED CONTEXT DATA BEGIN ### ... ### UNTRUSTED CONTEXT DATA END ###`) to prevent indirect prompt injection.
- **Candidate Data Isolation**: Every database query strictly filters by `candidateId: candidate.id`. Cross-candidate queries return `404 Not Found` or `403 Forbidden`.

### 3. Structured RAG Citation Model
Every AI response persists and returns relational `CareerMessageSource` entities:
- `RESUME`: Resume experience/project vector chunks.
- `JOB`: Evaluated vacancy details and match reports.
- `SKILL_GAP`: Prioritized missing skill gaps.
- `LEARNING_PATH`: Sequential prerequisite roadmaps from vetted catalogs (MDN, Docker, Kubernetes).
- `PROFILE`: Verified candidate profile facts.
- `APPLICATION`: Submitted application stages.

### 4. Deterministic Response & Speculative Handling
- Speculative questions (e.g. *"Will I get hired by Google?"*) return `status: "INSUFFICIENT_CONTEXT"` explaining the scope of evaluation rather than fabricating probabilities.
- If the AI service is offline, the local deterministic grounded generator seamlessly answers questions with citations and zero downtime.

---

## Consequences

### Positive
- **Provable Grounding**: Every answer is backed by verifiable citations.
- **Zero Hallucinated Metrics**: Match scores and learning sequences reflect exact database state.
- **Robust Security**: Full defense against direct and indirect prompt injection.
- **High Observability**: Captures `AIUsage` tokens, latencies, and user feedback (`isHelpful`).

### Trade-offs
- Strict grounding restricts the assistant from offering creative speculation on unverified external companies.
