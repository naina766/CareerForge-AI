# CareerForge AI

> Enterprise-grade, AI-powered Career & Job Intelligence Platform with Explainable Matching, ATS Analysis, Grounded RAG Career Assistant, Kafka Event Streaming, FAISS Semantic Retrieval, Production Observability, and Hardened Security.

---

## 🏛️ Production Architecture Overview

```text
                    ┌─────────────────────────┐
                    │      Nginx Ingress      │ (Port 80/443, SSL, Rate Limiting)
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┴───────────────────┐
             │                                       │
      ┌──────▼──────┐                         ┌──────▼──────┐
      │ Next.js Web │                         │ Express API │
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
             │                            │  Service   │
             │                            └─────┬──────┘
             │                                  │
             │                            ┌─────▼──────┐
             │                            │   FAISS    │
             │                            │  (Vectors) │
             │                            └────────────┘
             └───────────────────────────────────────────────────────────────────
```

### Architectural Invariants
- **PostgreSQL**: Transactional ground truth for candidates, jobs, applications, preferences, metrics, and alerts.
- **FAISS**: High-performance dense vector similarity retrieval engine in FastAPI AI microservice.
- **Kafka**: Asynchronous event streaming backbone for non-blocking worker execution.
- **Redis**: Distributed caching, token blacklists, and multi-tier rate limiting.
- **Next.js**: Modern, high-performance Dark SaaS interface.

---

## 📁 Monorepo Layout

```text
careerforge-ai/
├── apps/
│   ├── web/                     # Next.js 14 App Router client (Dark SaaS UI)
│   ├── api/                     # Node.js / Express TypeScript REST API
│   └── ai-service/              # Python FastAPI AI & FAISS vector microservice
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
│   ├── architecture/            # Architecture Decision Records (ADR-001 to ADR-024)
│   ├── deployment/              # Production deployment & incident response guides
│   └── operations/              # Database backup and recovery SOPs
├── tests/
│   └── integration/             # Comprehensive multi-phase integration test suites
├── docker-compose.prod.yml      # Production multi-container orchestration
└── .github/workflows/           # CI/CD, security audit, and dependabot automation
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20+`
- **pnpm**: `v9+`
- **Docker & Docker Compose**
- **Python**: `3.11+`

### 2. Environment Setup
```bash
cp .env.example .env
pnpm install
pnpm exec prisma db push
```

### 3. Start Infrastructure & Development Servers
```bash
docker compose up -d
pnpm dev
```

---

## 🚢 Production Deployment

```bash
# Validate production compose config
docker compose -f docker-compose.prod.yml config

# Launch production cluster
docker compose -f docker-compose.prod.yml up -d --build

# Run automated tests
pnpm tsx tests/integration/production-readiness.test.ts
pnpm tsx tests/integration/observability.test.ts
```

---

---

## 📊 Implementation & Readiness Status Matrix

| Component | Status | Details |
|---|---|---|
| **Frontend Authentication** | **IMPLEMENTED** | HTTP-only cookie refresh rotation with in-memory access tokens; zero localStorage token leaks. |
| **API Security & RBAC** | **IMPLEMENTED** | Role-based access control (`CANDIDATE`, `RECRUITER`, `ADMIN`), IDOR scoping, input sanitization. |
| **Brute-Force & Rate Limiting** | **IMPLEMENTED** | Redis-backed sliding window rate limiter and account lockout protection with seamless in-memory fallback. |
| **AI Client Resilience** | **IMPLEMENTED** | 10s request timeout (`AbortController`), bounded retry with exponential backoff on 5xx, stateful Circuit Breaker (`CLOSED`/`OPEN`/`HALF_OPEN`). |
| **Resume Data Integrity** | **IMPLEMENTED** | Zero fake/fabricated candidate PII or experience fallback data. Explicit `422/400/503` error propagation. |
| **Observability & Health Probes** | **IMPLEMENTED** | Deep health checks (PostgreSQL, live Redis ping latency, Kafka, AI service, workers), distributed tracing, metric counters & gauges. |
| **Kafka Event Streaming** | **IMPLEMENTED** | Producer with timeout racing and in-memory offline fallback buffer for resilient local execution. |
| **Transactional Outbox / Worker Poller** | **PARTIALLY IMPLEMENTED / OFFLINE** | Schema and model definitions present; background event dispatcher runs in in-memory buffered mode during local test scenarios. |
| **FAISS Vector Intelligence** | **IMPLEMENTED (MOCK/LOCAL)** | Dense vector indexing and similarity search with `all-MiniLM-L6-v2` / mock pipeline in FastAPI AI microservice. |
| **Real LLM / OpenAI / Anthropic Integration** | **PLANNED (Phase 2)** | Provider abstraction architecture in place (`mock` active; real LLM streaming, live vector embedding sync planned for Phase 2). |

---

## 📜 Architecture Decision Records (ADRs)
- [ADR-001 to ADR-021: Core Domain, AI, Search & Event Backbone](docs/architecture/)
- [ADR-022: Observability, Notifications & Reliability Platform](docs/architecture/ADR-022-observability-notifications-reliability.md)
- [ADR-023: Observability, Monitoring & Reliability Architecture](docs/architecture/ADR-023-observability-monitoring-reliability.md)
- [ADR-024: Production Deployment, Security Hardening & CI/CD Platform](docs/architecture/ADR-024-production-deployment-security-cicd.md)

