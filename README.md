# CareerForge AI

CareerForge AI is an AI-powered career intelligence, job matching, and talent analytics platform built as a TypeScript and Python monorepo. It combines deterministic skill-gap analysis, explainable job matching, semantic resume retrieval, and candidate-scoped conversational career mentoring.

---

## Overview

CareerForge AI provides candidates and recruiters with actionable career intelligence. Instead of relying on opaque scoring models or manual resume screening, the platform couples deterministic evaluation algorithms with grounded semantic search. Candidates receive clear breakdowns of skill gaps, personalized learning paths, and an AI mentor capable of answering career questions with direct citations to their resume. Recruiters manage requisitions, review structured match reports, and track candidates across a multi-stage hiring pipeline.

---

## Core Product Capabilities

- **Deterministic Skill-Gap Analysis**: Automated comparison of candidate profiles against job requirements, identifying missing proficiencies and generating sequenced learning recommendations.
- **Explainable Job Matching**: Weighted, multi-criteria scoring combining deterministic skill overlap, experience calibration, semantic similarity, and candidate preferences.
- **Resume Intelligence**: Fast multi-format PDF parsing, text sanitization, section extraction, and candidate-scoped dense embedding generation.
- **Grounded AI Career Mentor**: Interactive conversational guidance powered by LangGraph and FAISS, strictly grounded in candidate resume data with verifiable citations.
- **Recruiter Requisition & Pipeline Management**: End-to-end job requisition lifecycle, automated candidate evaluation, and application status transitions.
- **Enterprise Observability**: Distributed tracing via LangSmith, health monitoring across backing services, and domain event streaming via Apache Kafka.

---

## Architecture

CareerForge AI uses a polyglot microservice architecture designed for transactional consistency, event-driven decoupling, and isolated vector retrieval.

### System Diagram

```
[ Browser / Next.js Client ]
             |
             v (HTTP / REST)
     [ Express API Gateway ]
        |                 |
        | (Prisma)        | (Internal REST)
        v                 v
[ PostgreSQL 16 ]   [ FastAPI AI Service ]
  (Source of Truth)       |
        |                 +--> [ FAISS Vector Store ] (FastEmbed 384-dim)
        v                 |
[ Redis 7 ]               +--> [ LangGraph Workflow ]
  (Cache & Limits)        |
        |                 +--> [ LLM Provider (OpenRouter / Fallback) ]
        v
[ Apache Kafka 3.7 (KRaft) ]
        |
        +---> [ Resume Worker ]
        +---> [ AI Worker ]
        +---> [ Notification Worker ]
```

### Architectural Decisions & Invariants
- **PostgreSQL 16**: Primary transactional source of truth for users, profiles, jobs, applications, and domain events.
- **FAISS Vector Store**: In-memory cosine similarity search (`IndexFlatIP`) with disk persistence, isolated within the Python AI microservice.
- **pgvector is not used**: Vector operations are completely decoupled from relational transactions.
- **Apache Kafka 3.7 (KRaft Mode)**: Distributed event bus operating without ZooKeeper for background worker orchestration.
- **Redis 7**: High-performance key-value caching, rate limiting, and distributed state management.
- **Multi-Tenant Isolation**: Candidate data is strictly isolated across relational tables (foreign key constraints) and FAISS vector indices (candidate-scoped metadata filtering).

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend API** | Node.js 22 LTS, Express 4, TypeScript, Prisma ORM, Winston, Zod |
| **AI Microservice** | Python 3.11, FastAPI, LangGraph, LangChain, FAISS (CPU), FastEmbed, Pydantic v2 |
| **Databases & Cache** | PostgreSQL 16 Alpine, Redis 7 Alpine |
| **Event Streaming** | Apache Kafka 3.7 (KRaft Mode) |
| **Testing** | Supertest (API integration), pytest & pytest-asyncio (Python), synthetic evaluation gates |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions, pnpm Workspaces |

---

## AI Architecture

The AI service (`apps/ai-service`) is built with FastAPI, LangGraph, and FAISS:

- **LangGraph StateGraph**: Orchestrates the Career Mentor workflow through discrete nodes: intent classification, candidate-scoped context retrieval, LLM response generation, and output grounding validation.
- **FastEmbed (`BAAI/bge-small-en-v1.5`)**: Generates 384-dimensional dense embeddings with L2 normalization.
- **FAISS Vector Store**: In-memory cosine similarity search backed by atomic disk persistence, scoped strictly to candidate resume chunks.
- **Grounding & Citation Enforcement**: Generated answers must cite candidate resume chunks; responses containing unsupported claims trigger fallback paths.
- **Safety & PromptGuard**: Multi-layer input sanitization rejects adversarial prompt injections, system prompt override attempts, and payload tampering.
- **Dual Provider Architecture**: Primary OpenRouter integration with automated zero-dependency fallback providers for resilient offline operation.

---

## Candidate Workflow

1. **Registration & Profile Setup**: Candidate signs up, configures career preferences, target roles, and self-reported proficiencies.
2. **Resume Upload**: Candidate uploads a PDF resume, processed asynchronously through Kafka to extract structured text and generate vector embeddings.
3. **Job Discovery**: Candidate browses active listings filtered by location, work mode, and role category.
4. **Match Analysis**: Candidate views detailed match reports showing exact skill alignment, missing skills, and estimated readiness.
5. **Application Lifecycle**: Candidate applies to requisitions and tracks submission status across pipeline stages.
6. **Career Mentoring**: Candidate engages with the AI mentor to ask tailored questions regarding resume strengths, career trajectory, and interview preparation.

---

## Recruiter Workflow

1. **Company & Role Setup**: Recruiter registers an organization profile and defines team member permissions.
2. **Requisition Authoring**: Recruiter publishes job listings specifying required skills, preferred competencies, experience ranges, and employment terms.
3. **Candidate Review**: Recruiter evaluates applicant match scores, inspects verified skills, and reviews deterministic match breakdowns.
4. **Pipeline Progression**: Recruiter moves applicants through workflow stages: Applied, Screening, Interview, Offer, or Rejected.

---

## Matching and Recommendation

The platform calculates match and recommendation quality using deterministic, reproducible scoring formulas:

### 1. Hybrid Job Match Score (0–100)
Calculated across five weighted dimensions:
- **Skill Overlap (40%)**: Ratio of required and preferred skills matched against candidate skills.
- **Semantic Vector Similarity (25%)**: Cosine similarity between candidate resume chunks and job requirements via FAISS.
- **Experience Match (20%)**: Alignment between candidate years of experience and target job range.
- **Education Alignment (10%)**: Verification of degree level against position requirements.
- **Location Alignment (5%)**: Match between candidate location preferences and job location.

$$\text{Final Score} = 0.40 \times \text{Skills} + 0.25 \times \text{Semantic} + 0.20 \times \text{Experience} + 0.10 \times \text{Education} + 0.05 \times \text{Location}$$

### 2. Job Recommendation Score (0–100)
Prioritizes discoverability for active positions:
- **Base Match (40%)**: Core skill compatibility.
- **Semantic Fit (25%)**: Vector alignment with job requisition.
- **Experience Level (15%)**: Seniority fit.
- **Candidate Preferences (15%)**: Work mode and compensation expectations.
- **Posting Freshness (5%)**: Recency weighting for newly published openings.

$$\text{Recommendation Score} = 0.40 \times \text{Skills} + 0.25 \times \text{Semantic} + 0.15 \times \text{Experience} + 0.15 \times \text{Preferences} + 0.05 \times \text{Freshness}$$

---

## Resume Intelligence

- **Parsing Pipeline**: Extracts clean textual content from PDF documents while rejecting malformed or unsupported file structures.
- **Text Normalization**: Strips control characters, normalizes whitespace, and parses distinct sections (Work History, Education, Skills, Projects).
- **Chunking & Indexing**: Segments resume text into overlapping token windows and generates 384-dimensional embeddings via FastEmbed.
- **Scoped Persistence**: Embeddings are stored in candidate-isolated FAISS indices with atomic snapshot persistence to disk.

---

## AI Career Mentor

- **Conversational Guidance**: Provides structured career advice tailored to candidate experience and market demand.
- **Resume Grounding**: Every factual claim about candidate qualifications is linked to specific resume segments.
- **Safety & Prompt Defense**: Input filters intercept prompt injection payloads before graph execution.
- **Offline Fallback**: Operates seamlessly in local evaluation environments without external API keys.

---

## Security

- **Authentication**: Bcrypt password hashing (work factor 12), short-lived access JWTs, secure HTTP-only refresh cookies, and token replay prevention with SHA-256 token hashing.
- **Authorization & IDOR Protection**: Server-side ownership verification on all resource routes (`/candidates/:id`, `/resumes/:id`, `/applications/:id`, `/recruiter/jobs/:id`).
- **File Upload Security**: Magic-byte signature verification, strict MIME type validation (PDF only), 5 MB payload limit, path traversal defense, and isolated storage.
- **Vector Isolation**: All FAISS queries enforce candidate-specific scoping; cross-candidate retrieval is strictly prohibited.
- **PII Protection**: Personal identifiable information is masked before telemetry or logging exports.

---

## Observability

- **LangSmith Tracing**: Non-intrusive distributed tracing of LangGraph workflows with candidate PII pseudonymization and a dead-man kill switch.
- **Health Checks**: Standardized `/health` and readiness endpoints across API gateway, AI service, and background workers.
- **Audit Logging**: Asynchronous domain event logging and transactional outbox monitoring via Apache Kafka.
- **System Metrics**: Latency distribution, error rate tracking, and backing store connectivity statuses displayed in administrative dashboards.

---

## Testing

CareerForge AI maintains a comprehensive, deterministic test strategy:

- **API Integration Suite**: 13 Supertest suites validating authentication, candidate management, job matching, applications, and security controls against real databases.
- **AI Service Unit & Integration**: 125 pytest cases testing FAISS indexing, PromptGuard filters, LangGraph graph execution, and schema validation.
- **AI Quality & Safety Evaluation**: Automated evaluation runner executing 20 synthetic test cases against strict thresholds for grounding, injection defense, and latency.

```bash
# Run API integration test suites (Supertest)
pnpm test

# Run Python AI service test suites (pytest)
pnpm ai:test

# Run AI quality, safety, and evaluation gates
pnpm ai:evaluate

# Run monorepo typechecking
pnpm typecheck

# Run monorepo linting
pnpm lint

# Validate Prisma schema
pnpm prisma:validate
```

---

## Local Development

### Prerequisites
- **Node.js**: 22.x LTS
- **pnpm**: 11.25.0 (`corepack enable && corepack prepare pnpm@11.25.0 --activate`)
- **Python**: 3.11+
- **Docker & Docker Compose**: For local infrastructure services

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/naina766/CareerForge-AI.git
cd CareerForge-AI

# Install monorepo dependencies
pnpm install --frozen-lockfile
```

### 2. Python AI Service Setup

```bash
cd apps/ai-service
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
cd ../..
```

### 3. Start Infrastructure Services

```bash
docker compose up -d postgres redis kafka
```

### 4. Initialize the Database

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run schema migrations
pnpm prisma:migrate

# Seed canonical demo data
pnpm prisma:seed

# Validate seeded data consistency
pnpm demo:validate
```

### 5. Start Development Servers

```bash
# Run web and API concurrently
pnpm dev

# In a separate terminal, start the AI service:
cd apps/ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Service URLs:
- Web Application: `http://localhost:3000`
- Express API Gateway: `http://localhost:4000`
- FastAPI AI Microservice: `http://localhost:8000`
- API Documentation (Swagger): `http://localhost:8000/docs`

---

## Environment Configuration

Copy the example environment template and configure local settings:

```bash
cp .env.example .env
```

Key environment settings:
- `DATABASE_URL`: PostgreSQL connection string (`postgresql://postgres:postgres@localhost:5432/careerforge_dev`).
- `REDIS_URL`: Redis connection string (`redis://localhost:6379`).
- `KAFKA_BROKERS`: Kafka broker list (`localhost:9092`).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: Cryptographic secrets for access and refresh tokens.
- `AI_SERVICE_URL`: Internal endpoint for the AI service (`http://localhost:8000`).
- `OPENROUTER_API_KEY`: API key for LLM provider (optional in local development when using fallback mock).

---

## Production Architecture

- **Multi-Stage Docker Containers**: Minimal Alpine and Slim base images with non-root security contexts (`UID 10001`).
- **Process Isolation**: API gateway, AI service, Next.js frontend, and Kafka workers run in independent container sandboxes.
- **Health Probes**: Liveness and readiness probes on all HTTP services.
- **Orchestration**: Production Compose configuration in `docker-compose.prod.yml` with health checks, restart policies, and persistent named volumes.

---

## Repository Structure

```
CareerForgeAi/
├── apps/
│   ├── web/                    # Next.js 14 frontend application
│   ├── api/                    # Express REST API gateway and business logic
│   └── ai-service/             # FastAPI AI microservice, LangGraph, FAISS store
├── packages/
│   ├── config/                 # Shared environment and configuration validation
│   ├── database/               # Prisma schema, migrations, seed scripts, client
│   └── types/                  # Shared TypeScript interfaces and domain schemas
├── workers/
│   ├── resume-worker/          # Kafka consumer: background resume processing
│   ├── ai-worker/              # Kafka consumer: asynchronous embeddings & indexing
│   └── notification-worker/    # Kafka consumer: email and in-app notifications
├── scripts/                    # Validation, audit, and helper scripts
├── docker-compose.yml          # Local development infrastructure
├── docker-compose.prod.yml     # Production container orchestration
└── package.json                # Monorepo root package manifest
```

---

## Project Status

- **Build & Types**: Passing across all TypeScript packages and Next.js frontend.
- **Test Coverage**: 13 Supertest API integration suites and 125 Python AI test cases fully operational.
- **Evaluation Gates**: Automated CI evaluation suite with 100% pass rate on safety, grounding, and deterministic formulas.
- **Security Compliance**: Zero high/critical vulnerabilities in direct dependencies; candidate data isolation enforced at database and vector tiers.

---

## Project Links

- **Repository**: [CareerForge-AI on GitHub](https://github.com/naina766/CareerForge-AI)


