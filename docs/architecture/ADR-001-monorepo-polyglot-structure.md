# ADR-001: Monorepo Architecture & Polyglot Service Structure

## Status
Accepted

## Context
CareerForge AI requires high-velocity full-stack features (Next.js frontend, Express API) combined with specialized AI and vector workloads (Python FastAPI, Pydantic, embeddings). We needed a structure that enables rapid development, shared contracts across TypeScript services, clean separation of concerns, and independent scalability.

## Decision
We adopted a **pnpm monorepo structure**:
- `apps/web`: Next.js 14+ (App Router) for user interfaces.
- `apps/api`: Node.js + Express + TypeScript for core business logic, relational operations, and authentication.
- `apps/ai-service`: Python FastAPI for LLM orchestration, structured Pydantic extraction, chunking, and embedding generation.
- `packages/types`: Shared TypeScript interfaces and API contracts for Node and Web services.
- `packages/config`: Centralized environment variable validation.
- `workers/*`: Dedicated background workers for long-running asynchronous jobs.

We explicitly maintain API contracts (OpenAPI / JSON schemas) at the boundary between Node.js and FastAPI rather than attempting cross-language shared binary libraries.

## Consequences
### Positive
- Unified version control, single commit history, and coordinated pull requests.
- Strict type-safety across Frontend, Backend API, and Workers via `@careerforge/types`.
- AI service leverages Python's rich ecosystem (pypdf, pdfplumber, numpy, asyncpg) without forcing Python on web endpoints.
- Isolated test suites and build steps.

### Trade-offs
- Multiple language runtimes (Node.js + Python) in local development and CI/CD.
- Contract updates between API and AI service require schema updates in both TypeScript DTOs and Pydantic models.
