# ADR-005: Hybrid Deterministic & LLM-Enriched Match Architecture

## Status
Accepted

## Context
Pure LLM-based candidate matching suffers from non-determinism, hallucinations, latency, high cost, and unexplainability. Conversely, naive keyword matching misses semantic context and synonyms.

## Decision
We implement a **Hybrid Two-Stage Matching Engine**:

### Stage 1: Deterministic Weighted Computation (Mathematical Core)
The overall score is computed via reproducible mathematical formulas:
- **Skill Match (40%)**: Jaccard and normalized canonical taxonomy intersection.
- **Semantic Similarity (25%)**: Cosine similarity between resume and job description embeddings (`pgvector <=>`).
- **Experience Match (20%)**: Years of relevant experience compared against job minimum/maximum thresholds.
- **Education Match (10%)**: Degree level and field alignment.
- **Location/Work Mode Match (5%)**: Remote, hybrid, or geographic proximity.

### Stage 2: LLM Explanation & Reasoning (Narrative Layer)
The deterministic breakdown and missing skills are fed into the LLM Provider behind a strict Pydantic/Zod schema to produce:
- Transparent recruiter summary.
- Candidate-facing action items and learning pathways.
- Structured confidence metrics.

The LLM is forbidden from arbitrarily changing the deterministic mathematical score.

## Consequences
### Positive
- Fully reproducible, defensible scoring in technical interviews and production.
- Auditable and fair hiring intelligence with zero score drift between runs.
- High performance: scoring can be computed instantly without waiting for an LLM if only numerical ranking is needed.
