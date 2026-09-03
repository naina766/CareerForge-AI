# CareerForge AI

> Enterprise-grade, AI-powered Career & Job Intelligence Platform with Explainable Matching, ATS Analysis, Grounded RAG Career Assistant, Kafka Event Streaming, FAISS Semantic Retrieval, Production Observability, and Hardened Security.

---

## 🏛️ Production Architecture Overview

```text
                               ┌─────────────────────────┐
                               │      Nginx Ingress      │ (Port 80/443, SSL/TLS, Rate Limiting)
                               └────────────┬────────────┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                 ┌──────▼──────┐                         ┌──────▼──────┐
                 │ Next.js Web │                         │ Express API │
                 │ (Port 3000) │                         │ (Port 4000) │
                 └──────┬──────┘                         └──────┬──────┘
                        │                                       │
                        │           ┌───────────────────────────┼───────────────────────────┐
                        │           │                           │                           │
                        │     ┌─────▼──────┐              ┌─────▼──────┐              ┌─────▼──────┐
                        │     │ PostgreSQL │              │   Redis    │              │   Kafka    │
                        │     │  (Source)  │              │ (Cache/RL) │              │  Backbone  │
                        │     └────────────┘              └────────────┘              └─────┬──────┘
                        │                                                                   │
                        │                     ┌─────────────────────────┬───────────────────┤
                        │                     │                         │                   │
                        │               ┌─────▼──────┐            ┌─────▼──────┐      ┌─────▼──────┐
                        │               │   Resume   │            │     AI     │      │Notification│
                        │               │   Worker   │            │   Worker   │      │   Worker   │
                        │               └─────┬──────┘            └─────┬──────┘      └────────────┘
                        │                     │                         │
                        │                     └────────────┬────────────┘
                        │                                  │
                        │                            ┌─────▼──────┐
                        │                            │ FastAPI AI │
                        │                            │  Service   │ (Port 8000)
                        │                            └─────┬──────┘
                        │                                  │
                        │                            ┌─────▼──────┐
                        │                            │   FAISS    │
                        │                            │ (384-Dim)  │
                        │                            └────────────┘
                        └───────────────────────────────────────────────────────────────────
```

### Key Architectural Invariants
- **PostgreSQL**: Transactional ground truth for candidates, jobs, applications, preferences, metrics, and alerts.
- **FastAPI AI Service**: High-performance Python microservice handling ONNX FastEmbed embeddings (`BAAI/bge-small-en-v1.5`), FAISS `IndexFlatIP` vector search, and Gemini/OpenAI LLMs.
- **Kafka**: Asynchronous event streaming backbone for non-blocking worker execution.
- **Redis**: Distributed caching, token blacklists, and multi-tier rate limiting with in-memory fallback.
- **Next.js 14**: Dark-first SaaS App Router interface with in-memory access token security.

---

## 📁 Monorepo Layout

```text
careerforge-ai/
├── apps/
│   ├── web/                     # Next.js 14 App Router client (Dark SaaS UI, Port 3000)
│   ├── api/                     # Node.js / Express TypeScript REST API (Port 4000)
│   └── ai-service/              # Python FastAPI AI & FAISS vector microservice (Port 8000)
├── workers/
│   ├── resume-worker/           # Resume PDF extraction & taxonomy worker
│   ├── ai-worker/               # AI matching, skill gaps & recommendations worker
│   └── notification-worker/     # Real-time event notifications & alerts worker
├── packages/
│   ├── types/                   # Shared TypeScript models, envelopes, event schemas
│   ├── database/                # Prisma client & database repositories
│   └── config/                  # Centralized Zod-validated environment config
├── infra/
│   └── nginx/                   # Nginx reverse proxy configuration & security headers
├── docs/
│   ├── architecture/            # Architecture Decision Records (ADR-001 to ADR-028)
│   ├── deployment/              # Production deployment & incident response guides
│   ├── operations/              # Database backup and recovery SOPs
│   └── portfolio/               # Recruiter demo guide and evaluation scorecard
├── tests/
│   └── integration/             # Comprehensive multi-phase integration test suites
├── docker-compose.prod.yml      # Production multi-container orchestration
└── .github/workflows/           # CI/CD, security audit, and dependabot automation
```

---

## 🚀 How to Run the Project

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` (`npm install -g pnpm`)
- **Python**: `3.11` or higher
- **Docker & Docker Compose**: (Required for PostgreSQL, Redis, Kafka)

---

### 2. Option A: Run with Docker Compose (Recommended)

This starts all infrastructure services (PostgreSQL, Redis, Kafka, Zookeeper, Nginx, API, AI Service, Web, and Workers) with one command:

```bash
# 1. Clone repository and copy production environment template
cp .env.prod.example .env.prod

# 2. Build and launch all containers
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 3. View status and verify all health checks are passing
docker compose -f docker-compose.prod.yml ps

# 4. Open in browser:
# Web Application: http://localhost
# API Liveness:    http://localhost/live
# API Readiness:   http://localhost/ready
# AI Service:      http://localhost:8000/live
```

---

### 3. Option B: Run in Local Development Mode

#### Step 1: Install Dependencies
```bash
# Install Node.js workspace dependencies
pnpm install

# Setup Python virtual environment for AI Service
cd apps/ai-service
python -m venv .venv

# Activate virtual environment (Windows PowerShell: .venv\Scripts\Activate.ps1 | Linux/macOS: source .venv/bin/activate)
.venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

#### Step 2: Configure Environment Variables
```bash
cp .env.example .env
```

#### Step 3: Start Infrastructure (Postgres & Redis)
```bash
# Start Postgres & Redis containers
docker compose up -d postgres redis
```

#### Step 4: Setup Database & Seed Synthetic Demo Data
```bash
# Push Prisma schema to PostgreSQL
pnpm exec prisma db push

# Seed taxonomy, jobs, and synthetic demo users
pnpm --filter "@careerforge/database" seed
```

#### Step 5: Start Development Servers
You can run all services concurrently or in separate terminals:

```bash
# Concurrently start Web, API, and Workers:
pnpm dev

# In another terminal (with Python .venv active), start the AI Service:
cd apps/ai-service
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Frontend Web**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **FastAPI AI Service**: [http://localhost:8000](http://localhost:8000)

---

## 🔑 Demo Login Credentials

The database seed provides isolated synthetic accounts for demonstration:

| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| **Candidate** | `candidate.alex@careerforge.ai` | `Password123!` | Dashboard, Grounded AI Career Assistant, Resume Lab, Skill Gap, Learning Roadmap |
| **Candidate** | `candidate.priya@careerforge.ai` | `Password123!` | Senior AI/ML Systems Engineer Profile |
| **Recruiter** | `recruiter.techcorp@careerforge.ai` | `Password123!` | Job Posting, Candidate Pipeline, Applicant Review |
| **Admin** | `admin@careerforge.ai` | `Password123!` | System Telemetry, Health Probes, Metrics, Distributed Traces |

---

## 🧪 Running Automated Test Suites

```bash
# 1. TypeScript Static Typecheck
pnpm typecheck

# 2. ESLint Static Analysis
pnpm lint

# 3. Next.js Production Build Validation
pnpm build

# 4. Python AI Evaluation & RAG Quality Tests
apps\ai-service\.venv\Scripts\pytest apps/ai-service/tests

# 5. Security & Circuit Breaker Integration Tests
pnpm tsx tests/integration/security-resilience.test.ts

# 6. Live Redis Integration & Fallback Tests
pnpm tsx tests/integration/redis-live-integration.test.ts

# 7. Observability & Telemetry Tests
pnpm tsx tests/integration/observability.test.ts

# 8. Full Production Readiness & Security Tests
pnpm tsx tests/integration/production-readiness.test.ts
```

---

## 📊 Implementation & Readiness Status Matrix

| Component | Status | Details |
|---|---|---|
| **Real Semantic Embeddings** | **IMPLEMENTED — REAL** | FastEmbed ONNX runtime (`BAAI/bge-small-en-v1.5`), 384-dim dense float32 L2-normalized vectors. `MockEmbeddingProvider` retained strictly for offline unit tests. |
| **FAISS Vector Retrieval** | **IMPLEMENTED — REAL** | Inverted inner product (`IndexFlatIP`) matching normalized dense embeddings for cosine similarity search with Top-K and document filtering. |
| **Real LLM Providers** | **IMPLEMENTED — REAL** | Google Gemini (`gemini-1.5-flash`) and OpenAI (`gpt-4o-mini`) via async HTTP (`httpx.AsyncClient`) with bounded retries, 10s timeouts, safe logging, and JSON schema validation. |
| **Grounded RAG Pipeline** | **IMPLEMENTED — REAL** | Candidate Profile → Real Embeddings → FAISS Top-K Search → Untrusted Document Context Sanitization (`<<<UNTRUSTED_DOCUMENT_CONTEXT>>>`) → Grounded Prompt → Real LLM → Grounded Output + Citations. |
| **Prompt Injection Defense** | **IMPLEMENTED — REAL** | Multi-layer defense: adversarial pattern filtering + untrusted context boundary encapsulation ensuring retrieved documents cannot hijack system directives. |
| **Hallucination Resistance** | **IMPLEMENTED — REAL** | Explicit `INSUFFICIENT_CONTEXT` fallback status when context is absent or query asks for speculative/unsupported predictions. Zero fake PII or fabricated URLs. |
| **Career Intelligence Engine** | **IMPLEMENTED — REAL** | Grounded skill-gap analysis, candidate trajectory career-role recommendations, and prioritized sequential learning roadmaps. |
| **Live Redis Integration** | **IMPLEMENTED — REAL** | Verified against live host Redis instance (`127.0.0.1:6379`, `family: 4`): PING, SET/GET/TTL, atomic INCR, sliding-window rate limiting, brute-force lockout/reset, and seamless in-memory fallback. |
| **Frontend Authentication** | **IMPLEMENTED — REAL** | HTTP-only cookie refresh rotation with in-memory access tokens; zero localStorage token leaks. |
| **API Security & RBAC** | **IMPLEMENTED — REAL** | Role-based access control (`CANDIDATE`, `RECRUITER`, `ADMIN`), IDOR scoping, input sanitization. |
| **AI Client Resilience** | **IMPLEMENTED — REAL** | 10s request timeout (`AbortController`), bounded retry with exponential backoff on 5xx, stateful Circuit Breaker (`CLOSED`/`OPEN`/`HALF_OPEN`). |
| **Observability & Health Probes** | **IMPLEMENTED — REAL** | Deep health checks (PostgreSQL, live Redis ping latency, Kafka, AI service, workers), distributed tracing, metric counters & gauges. |
| **Production Career UI/UX** | **IMPLEMENTED — REAL** | Unified dark-first design system (`#030712`), responsive app shell (`DashboardShell`), grounded AI Career Assistant with citation drawer, deterministic resume ingestion pipeline, and real-time skill-gap analysis. |
| **Production Deployment & Probes** | **IMPLEMENTED — REAL** | Multi-stage Dockerfiles, non-root users, hardened Nginx ingress with rate limits & security headers, deep `/ready` and `/live` health probes, and CI/CD validation. |
| **AI Quality & Evaluation Baseline** | **IMPLEMENTED — REAL** | Deterministic test suites for multi-domain semantic retrieval, RAG grounding faithfulness, zero hallucination on unknown credentials, prompt injection resistance, and citation traceability. |

---

## 📜 Architecture Decision Records (ADRs) & Guides
- [ADR-001 to ADR-021: Core Domain, AI, Search & Event Backbone](docs/architecture/)
- [ADR-022: Observability, Notifications & Reliability Platform](docs/architecture/ADR-022-observability-notifications-reliability.md)
- [ADR-023: Observability, Monitoring & Reliability Architecture](docs/architecture/ADR-023-observability-monitoring-reliability.md)
- [ADR-024: Production Deployment, Security Hardening & CI/CD Platform](docs/architecture/ADR-024-production-deployment-security-cicd.md)
- [ADR-025: Real AI Semantic Embeddings, LLM Integration & Grounded RAG Architecture](docs/architecture/ADR-025-real-ai-llm-rag-embeddings.md)
- [ADR-026: Production Career Intelligence UI/UX Architecture](docs/architecture/ADR-026-production-ui-ux-career-intelligence.md)
- [ADR-027: Production Deployment, Observability & Readiness Architecture](docs/architecture/ADR-027-production-deployment-observability-readiness.md)
- [ADR-028: AI Quality Evaluation, RAG Verification & Portfolio Readiness](docs/architecture/ADR-028-ai-quality-evaluation-portfolio-readiness.md)
- [3-Minute Recruiter Demo & Evaluation Guide](docs/portfolio/RECRUITER-DEMO-GUIDE.md)
- [Production Deployment Guide](docs/deployment/production-deployment-guide.md)
