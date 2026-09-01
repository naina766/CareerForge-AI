# ADR-012: Embeddings + FAISS Vector Search & Semantic Retrieval

## Status
Accepted

## Context
In CareerForge AI, semantic retrieval enables semantic search across candidate resumes, future job matching, candidate recommendations, recruiter search, and skill-gap analysis.

### Critical Architecture Decision: PostgreSQL + FAISS Separation
We intentionally decouple transactional persistence from vector similarity search:
1. **PostgreSQL as Transactional Source of Truth**:
   - Stores authoritative metadata, user entities, candidate profiles, resumes, and section-level `ResumeChunk` relational records.
   - Authoritative source for RBAC, IDOR security, and metadata filtering.
2. **FAISS as Derived Vector Index**:
   - High-performance, dedicated C++/Python vector similarity search engine running inside FastAPI AI Service.
   - Uses `IndexFlatIP` on L2-normalized vectors (Inner Product $\equiv$ Cosine Similarity).
   - Vectors are mapped to PostgreSQL `ResumeChunk.id` UUIDs via a persistent ID mapping file (`resume_chunk_ids.json`).
   - If FAISS index is deleted, it is 100% reconstructible/rebuildable from PostgreSQL source chunks.

## Decision

### 1. Section-Aware Resume Chunking
Rather than naive arbitrary character splitting, the `ResumeChunker` produces semantic boundaries with SHA-256 content hashes:
- `summary`
- `skills`
- `experience` (one chunk per experience entry)
- `education` (one chunk per degree/institution entry)
- `projects` (one chunk per project entry)

### 2. Embedding Model & Provider Abstraction
- Model: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions).
- `EmbeddingProvider` interface with `MockEmbeddingProvider` (deterministic harmonic vector projection for offline unit testing with zero external API dependency) and `LocalEmbeddingProvider`.
- Vectors are L2-normalized: $\hat{v} = \frac{v}{\|v\|_2}$, allowing inner product search on `faiss.IndexFlatIP` to equal exact cosine similarity.

### 3. API Contract
- Internal FastAPI:
  - `POST /internal/v1/vector/index/resume`
  - `POST /internal/v1/vector/search`
  - `POST /internal/v1/vector/rebuild`
  - `GET /internal/v1/vector/stats`
- External Express:
  - `POST /api/v1/candidates/me/resume/index`
  - `GET /api/v1/candidates/me/resume/index-status`
  - `POST /api/v1/candidates/me/resume/search`

## Consequences
### Positive
- Fully self-hosted, free-first, local-first with zero paid API lock-in.
- Clear separation of concerns: relational database is not burdened with vector indexing overhead.
- Safe IDOR protection: Express API strictly bounds semantic search to candidate's own active resume.
- Reproducible, versioned, and rebuildable.
