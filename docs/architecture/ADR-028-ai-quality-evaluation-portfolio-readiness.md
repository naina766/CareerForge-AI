# ADR-028: AI Quality Evaluation, RAG Verification & Portfolio Readiness

## Status
Accepted

## Context
To ensure CareerForge-AI's GenAI and RAG subsystems deliver dependable, explainable, and production-grade intelligence, a formal AI Quality Evaluation framework was required. This framework deterministically validates semantic vector retrieval, grounding faithfulness, citation traceability, prompt injection neutralization, and hallucination resistance.

## Decision
1. **Multi-Domain Semantic Retrieval Evaluation**:
   - Automated pytest suites validate that dense 384-dimensional embeddings (`FastEmbedEmbeddingProvider`) maintain clear vector separation between distinct engineering domains (Python/Backend, React/Frontend, Java/Distributed Systems).
   - Candidate context isolation ensures vector queries strictly scope to candidate ID partitions.
2. **Deterministic Grounding & Fact Traceability**:
   - RAG responses are strictly derived from retrieved candidate document chunks.
   - Retrieved chunks are encapsulated in `<<<UNTRUSTED_DOCUMENT_CONTEXT>>>` blocks to neutralize indirect prompt injection attempts.
3. **Hallucination Resistance Invariants**:
   - Queries requesting speculative hiring predictions, unknown compensation numbers, or unmentioned credentials strictly return the deterministic `INSUFFICIENT_CONTEXT` status.
4. **Citation Verifiability**:
   - Every citation must map to an indexed document chunk ID. The system strictly forbids generating fabricated external web URLs or unattributed claims.
5. **Observability & Privacy Safeguards**:
   - AI telemetry logs request IDs, active model/provider, retrieval counts, and step latencies (vector search vs LLM generation) while redacting raw prompt texts and candidate PII.

## Consequences
- **Positive**: Verifiable AI accuracy, zero hallucinated facts, robust security posture against adversarial manipulation, and clear demonstration flows for technical evaluators.
- **Negative**: Strict grounding requires candidate context to be populated in the vector index prior to consultation.
