# ADR-027: Production Deployment, Observability & Demo Readiness Architecture

## Status
Accepted

## Context
CareerForge-AI required a robust, observable, and hardened deployment architecture that unifies Next.js 14, Node.js/Express, Python/FastAPI AI Service with FAISS, PostgreSQL, Redis, Kafka, and Nginx.

## Decision
1. **Liveness vs Readiness Probes**:
   - `/live`: Returns HTTP 200 immediately to signify process liveness.
   - `/ready`: Deep probe that validates database connectivity and Redis operational state before routing ingress traffic.
   - AI Service `/ready`: Validates that the FAISS index and dense 384-dim embedding model are initialized.
2. **Containerization & Ingress**:
   - Multi-stage Docker builds running under non-root users (`nextjs`, `careerforge`).
   - Nginx reverse proxy configured with rate limiting (`limit_req_zone`), 10MB payload max for PDF uploads, security headers (CSP, HSTS, X-Frame-Options, nosniff), and proxy timeouts.
3. **AI Cost & Abuse Guardrails**:
   - Request-level timeouts (10s), bounded retries (2 attempts), Circuit Breaker protection, and sliding-window rate limiting per candidate.
   - Strict candidate context isolation: vector search filters chunks by candidate ID to prevent cross-tenant data leakage.
4. **CI/CD Pipeline**:
   - Automated GitHub Actions workflow testing TypeScript types, ESLint, Next.js build, Pytest AI evaluation suite, Prisma validation, and integration test suites.

## Consequences
- **Positive**: Resilient, observable, containerized stack ready for multi-container production deployments.
- **Negative**: Requires orchestration setup for distributed Kafka and PostgreSQL in production cloud clusters.
