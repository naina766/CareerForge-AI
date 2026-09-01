# ADR-002: PostgreSQL as Relational Source of Truth + FAISS as Vector Similarity Engine

## Status
Updated / Superseded in Phase 8

## Context
CareerForge AI requires storage for complex relational domain entities (Users, Profiles, Resumes, Jobs, Applications, Subscriptions, Audit Logs) as well as high-performance vector embeddings for semantic search, candidate-job matching, and RAG retrieval.

## Decision
We chose **PostgreSQL as the authoritative transactional source of truth** combined with **FAISS (`faiss-cpu`) as the dedicated vector similarity engine** hosted inside the FastAPI AI service.

```text
PostgreSQL (Source of Truth: Metadata & Relational Entities)
    ↓
FAISS (Derived Vector Similarity Index with Persistent ID Mapping)
```

## Rationale
- **Decoupled Architecture**: Keeps the primary relational database fast, lightweight, and focused on transactions, ACID guarantees, and strict relational integrity.
- **Dedicated Vector Performance**: FAISS utilizes optimized C++ inner-product indexing (`IndexFlatIP` with L2 normalization) for vector math.
- **Rebuildability**: FAISS is treated as a derived search index. If index files are lost or corrupted, the system can rebuild the FAISS vector index from PostgreSQL `ResumeChunk` source records.
- **Explicit ID Mapping**: Vector positions in FAISS map directly to PostgreSQL UUIDs via persistent JSON mappings (`resume_chunk_ids.json`).

## Consequences
### Positive
- Zero cloud vector SaaS fees (100% self-hosted and free-first).
- Clean separation of concerns between transactional metadata and AI vector retrieval.
- Easy to upgrade or migrate vector engines in the future (e.g. Qdrant, Milvus) without modifying database schemas.
