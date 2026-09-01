# CareerForge AI

> Enterprise-grade, AI-powered Career & Job Intelligence Platform with Explainable Matching, ATS Analysis, Grounded RAG Career Assistant, Kafka Event Streaming, and Asynchronous Workers.

---

## 🏛️ Architecture Overview

```text
                         ┌───────────────────┐
                         │   Next.js 14+ Web │ (Tailwind, TanStack Query, Lucide)
                         └─────────┬─────────┘
                                   │ HTTP (X-Correlation-ID)
                         ┌─────────▼─────────┐
                         │   Express REST    │ (TypeScript, Zod, Winston)
                         │       API         │
                         └─────────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
        PostgreSQL 16            Redis 7              Kafka
         + pgvector              Cache &             (KRaft Mode)
       (Source of Truth)       Rate Limiter             │
                                                        ▼
                                                  Domain Events
                                             (resume.uploaded, etc.)
                                                        │
                                                        ▼
                                               Asynchronous Workers
                                             (Resume / AI / Notify)
                                                        │
                                                        ▼
                                                FastAPI AI Service
                                             (Pydantic, pgvector, LLM)
```

---

## 📁 Repository Monorepo Layout

```text
careerforge-ai/
├── apps/
│   ├── web/                     # Next.js 14 App Router client
│   ├── api/                     # Node.js / Express TypeScript REST API
│   └── ai-service/              # Python FastAPI AI & LLM microservice
├── workers/                     # Asynchronous background worker processes
├── packages/
│   ├── types/                   # Shared TypeScript models, envelopes, event schemas
│   ├── config/                  # Centralized Zod-validated environment config
│   └── eslint-config/           # Shared linting & code styling configs
├── prisma/                      # Database schema & seeders (Milestone 1)
├── infrastructure/
│   ├── docker/                  # Multi-stage production container definitions
│   └── kubernetes/              # Production K8s manifests & HPA (Milestone 6)
├── docs/
│   ├── architecture/            # Architecture Decision Records (ADRs)
│   ├── api/                     # API contracts & OpenAPI specs
│   └── security/                # Security policies & RAG isolation rules
├── tests/                       # Integration & E2E test suites
└── docker-compose.yml           # PostgreSQL (pgvector), Redis, Kafka (KRaft mode)
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20+` or `v22+`
- **pnpm**: `pnpm@9+` (or run `npx pnpm`)
- **Python**: `3.11+`
- **Docker & Docker Compose**

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Start Core Infrastructure (PostgreSQL, Redis, Kafka KRaft)
```bash
docker compose up -d
```

### 4. Install Dependencies
```bash
npx pnpm install
```

### 5. Start TypeScript Services (Web & API)
```bash
# In one terminal:
npx pnpm dev
```
- Web Client: [http://localhost:3000](http://localhost:3000)
- REST API: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

### 6. Start Python AI Service
```bash
cd apps/ai-service
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- AI Service Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- AI Service Health: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧭 Phased Build Progress

- [x] **Phase 1: Repository Foundation, Monorepo Setup, Docker Compose (KRaft) & Core Scaffolding**
- [x] **Phase 2: PostgreSQL + Prisma Foundation & Data Modeling**
- [x] **Phase 3: Secure Authentication + JWT Rotation + Multi-Tenant RBAC Middleware**
- [x] **Phase 4: Candidate Profile Management, Work Experience & Education Modeling**
- [x] **Phase 5: Secure Resume Upload, S3/Local Storage Engine & Cryptographic Integrity**
- [x] **Phase 6: Resume Parsing Service, PDF Text Extraction & Structured Intelligence**
- [x] **Phase 7: Skill Taxonomy, Canonical Aliasing & Deterministic Normalization Engine**
- [x] **Phase 8: Dense Vector Embeddings + FAISS Semantic Search Engine**
- [x] **Phase 9: Deterministic + Explainable ATS Resume Scoring Engine**
- [x] **Phase 10: Recruiter Job Lifecycle Management, State Machine & Multi-Tenant RBAC**
- [x] **Phase 11: Candidate Job Discovery, Faceted Search, Skill Normalization & Pagination**
- [x] **Phase 12: Job Applications & Application Lifecycle State Machine**
- [x] **Phase 13: Hybrid AI Job Matching & Explainable Scoring Engine**
- [x] **Phase 14: Skill Gap Analysis & Personalized Learning Path Engine**
- [x] **Phase 15: Personalized Candidate Job Recommendation Engine**
- [x] **Phase 16: Grounded RAG Career Assistant & Multi-Source Copilot**

---

## ⚡ Personalized Candidate Job Recommendation Engine (Phase 15)

- **Deterministic Multi-Signal Scoring**: $0.40 \times \text{Skills} + 0.25 \times \text{FAISS Semantic} + 0.15 \times \text{Experience} + 0.15 \times \text{Preferences} + 0.05 \times \text{Freshness}$.
- **Categorical Match Bands**: `TOP_MATCH` ($\ge 90$), `EXCELLENT_MATCH` ($80–89$), `STRONG_MATCH` ($70–79$), `GOOD_MATCH` ($60–69$), `POSSIBLE_MATCH` ($50–59$), and `LOW_MATCH` ($< 50$).
- **PostgreSQL Caching & Provenance**: Caches results in `JobRecommendation` with automatic invalidation on candidate updates, version bumps (`engineVersion = "1.0"`), or manual refresh.
- **Application Exclusion & Hard Filtering**: Excludes applied/withdrawn vacancies and expired deadlines.

---

## 🤖 Grounded RAG Career Assistant (Phase 16)

- **Candidate-Isolated Context**: Multi-source retrieval querying PostgreSQL candidate facts, skills, match reports, skill gaps, learning roadmaps, and FAISS resume vector chunks strictly scoped to `candidateId`.
- **PromptGuard Pre-Retrieval Defense**: Intercepts jailbreaks, instruction overrides, system prompt exfiltration, and cross-candidate data snooping (`status: "BLOCKED"`).
- **Structured Relational Citations**: Answers return verifiable `CareerMessageSource` records (Resume snippets, Vacancies, Gap reports, Learning catalogs) with relevance scoring.
- **Hallucination Protection & Speculative Handling**: Ensures scores and learning recommendations conform strictly to database ground truth. Speculative questions return `status: "INSUFFICIENT_CONTEXT"`.
- **Interactive Chat SaaS UI**: Full chat interface at `/dashboard/career-assistant` with multi-chat drawer, quick prompts, Markdown rendering, source drawer, and feedback loop (`👍 / 👎`).

---

## 📐 Key Architecture Decisions

- **[ADR-001: Monorepo Architecture](docs/architecture/ADR-001-monorepo-polyglot-structure.md)**
- **[ADR-002: PostgreSQL + FAISS Vector Separation](docs/architecture/ADR-002-postgresql-pgvector-unified-store.md)**
- **[ADR-003: Apache Kafka in KRaft Mode for Domain Event Streaming](docs/architecture/ADR-003-kafka-kraft-event-streaming.md)**
- **[ADR-004: Distributed Tracing with Request & Correlation IDs](docs/architecture/ADR-004-distributed-tracing-correlation-ids.md)**
- **[ADR-005: Hybrid Deterministic & LLM-Enriched Match Architecture](docs/architecture/ADR-005-hybrid-deterministic-llm-matching.md)**
- **[ADR-012: FAISS Vector Similarity Retrieval](docs/architecture/ADR-012-faiss-vector-search.md)**
- **[ADR-014: Recruiter Job Lifecycle Management](docs/architecture/ADR-014-recruiter-job-lifecycle.md)**
- **[ADR-015: Candidate Job Discovery & Faceted Search](docs/architecture/ADR-015-candidate-job-search.md)**
- **[ADR-016: Job Applications & Application Lifecycle](docs/architecture/ADR-016-application-lifecycle.md)**
- **[ADR-017: Hybrid AI Job Matching Engine](docs/architecture/ADR-017-hybrid-job-matching.md)**
- **[ADR-018: Skill Gap Analysis & Personalized Learning Path](docs/architecture/ADR-018-skill-gap-learning-path.md)**
- **[ADR-019: Personalized Candidate Job Recommendation Engine](docs/architecture/ADR-019-job-recommendation-engine.md)**
- **[ADR-020: Grounded RAG Career Assistant Architecture](docs/architecture/ADR-020-grounded-rag-career-assistant.md)**


