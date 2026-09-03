# CareerForge-AI Production Deployment Guide

## 1. Production Architecture Overview

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
                 └─────────────┘                         └──────┬──────┘
                                                                │
                        ┌───────────────────────────────────────┼───────────────────────────────────────┐
                        │                                       │                                       │
                 ┌──────▼──────┐                         ┌──────▼──────┐                         ┌──────▼──────┐
                 │ PostgreSQL  │                         │    Redis    │                         │    Kafka    │
                 │ (Port 5432) │                         │ (Port 6379) │                         │ (Port 9092) │
                 └─────────────┘                         └─────────────┘                         └──────┬──────┘
                                                                                                        │
                                                ┌─────────────────────────┬─────────────────────────────┤
                                                │                         │                             │
                                          ┌─────▼──────┐            ┌─────▼──────┐                ┌─────▼──────┐
                                          │   Resume   │            │     AI     │                │Notification│
                                          │   Worker   │            │   Worker   │                │   Worker   │
                                          └─────┬──────┘            └─────┬──────┘                └────────────┘
                                                │                         │
                                                └────────────┬────────────┘
                                                             │
                                                      ┌──────▼──────┐
                                                      │ FastAPI AI  │ (Port 8000)
                                                      │  Service    │
                                                      └──────┬──────┘
                                                             │
                                                      ┌──────▼──────┐
                                                      │    FAISS    │
                                                      │  (384-Dim)  │
                                                      └─────────────┘
```

---

## 2. Environment Preparation

1. Copy `.env.prod.example` to `.env.prod`:
   ```bash
   cp .env.prod.example .env.prod
   ```

2. Generate secure 32+ character secrets for JWTs:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Configure AI Service LLM Provider:
   - **Gemini**: Set `LLM_PROVIDER=gemini` and provide `GEMINI_API_KEY`.
   - **OpenAI**: Set `LLM_PROVIDER=openai` and provide `OPENAI_API_KEY`.
   - **Embeddings**: Set `EMBEDDING_PROVIDER=fastembed` (384-dim BGE Small ONNX runtime).

---

## 3. Production Start Commands

### A. Docker Compose Stack
```bash
# Build and launch all production services with health checks
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# View container status and health probes
docker compose -f docker-compose.prod.yml ps

# Tail unified service logs
docker compose -f docker-compose.prod.yml logs -f api ai-service web
```

### B. Database Migrations
```bash
# Apply Prisma migrations to the production database
pnpm --filter "@careerforge/database" prisma migrate deploy
```

---

## 4. Health & Readiness Verification

- **Liveness Probes**:
  - API: `GET http://localhost/live` (HTTP 200)
  - AI Service: `GET http://localhost:8000/live` (HTTP 200)
- **Deep Readiness Probes**:
  - API: `GET http://localhost/ready` (Verifies DB connection and Redis status)
  - AI Service: `GET http://localhost:8000/ready` (Verifies FAISS index and embedding dimension)
- **System Telemetry**:
  - `GET http://localhost/api/v1/health/system`

---

## 5. Security Invariants
- **Access Tokens**: Strictly held in memory on the client; never persisted to `localStorage` or `sessionStorage`.
- **Refresh Tokens**: Stored in HTTP-only, `SameSite=Lax`, `Secure` cookies with automatic rotation.
- **RAG Sandboxing**: Retrieved chunks are strictly wrapped in `<<<UNTRUSTED_DOCUMENT_CONTEXT>>>` boundaries to prevent prompt injection.
- **Circuit Breaker**: API to AI Service calls are guarded with 3-failure threshold, 10s reset timeouts, and graceful in-memory fallbacks.
