# ADR 021: Kafka Event-Driven Backbone & Transactional Outbox Architecture

## Status
**ACCEPTED** (Phase 17)

## Context
As CareerForge AI expanded across complex multi-stage subsystems (Resume Storage & Parsing, 5-Signal Hybrid Job Matching, Skill Gap Analysis, Topological Learning Paths, 100-Point Personalized Recommendations, Application Lifecycles, and Grounded RAG Career Assistant), synchronous HTTP request/response lifecycles became a bottleneck and introduced operational coupling:
1. **Long-Running Workflows**: PDF extraction, vector embeddings, multi-job recommendation scoring, and gap evaluations degrade HTTP request latencies if performed synchronously.
2. **Dual-Write Hazards**: Mutating PostgreSQL tables and publishing messages to Kafka in separate operations risks inconsistency if Kafka is transiently unavailable or network partitions occur.
3. **Consumer Idempotency**: Kafka provides at-least-once delivery; consumers must be immune to message redeliveries and network rebalances.
4. **Resilience & DLQ**: Poison pills or unrecoverable payloads must not stall Kafka topic partitions.

## Decision Drivers
- **Transactional Authority**: PostgreSQL remains the transactional source of truth; Kafka operates as the asynchronous domain event backbone.
- **Transactional Outbox**: Atomic database transaction wraps business state mutations and `OutboxEvent` creation.
- **Consumer Isolation & Independent Scaling**: Separate consumer groups (`careerforge-resume-worker`, `careerforge-ai-worker`, `careerforge-notification-worker`).
- **Observability**: Admin telemetry dashboard for outbox states, topic distributions, and DLQ re-queuing.
- **Preserved Vector Search Layer**: FAISS remains the dedicated high-performance vector retrieval engine (no pgvector).

## Architectural Design

```text
                    CareerForge Express API
                              │
                    PostgreSQL Transaction
                     (Business + Outbox)
                              │
                              ▼
                    ┌───────────────────┐
                    │ Transactional     │
                    │   Outbox Event    │
                    └─────────┬─────────┘
                              │
                    Outbox Publisher Sweep
                              │
                              ▼
                    ┌───────────────────┐
                    │    Apache Kafka   │
                    │   Event Backbone  │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
        ▼                     ▼                      ▼
  Resume Worker           AI Worker          Notification Worker
 (careerforge-resume)    (careerforge-ai)    (careerforge-notification)
        │                     │                      │
        ▼                     ▼                      ▼
  Text Parsing           FAISS Vectors       PostgreSQL Notifications
  Metadata Updates       5-Signal Match      Candidate & Recruiter
                         Skill Gap Roadmap   Status Updates
                         Recommendations
```

### 1. Centralized Topics & Domain Events
- **Topics**: `careerforge.resume`, `careerforge.matching`, `careerforge.skill-gap`, `careerforge.learning-path`, `careerforge.application`, `careerforge.recommendation`, `careerforge.notification`, `careerforge.career-assistant`, `careerforge.dlq`.
- **Domain Event Envelope**:
  - `eventId`: UUID
  - `eventType`: String identifier (e.g., `resume.uploaded`, `match.requested`, `application.created`)
  - `version`: `"1.0"`
  - `occurredAt`: ISO Timestamp
  - `producer`: `"careerforge-api"` | `"careerforge-worker"`
  - `correlationId`: Distributed request correlation tracking
  - `causationId`: Upstream event ID
  - `aggregateType` & `aggregateId`: Entity identifier
  - `payload`: Strongly typed payload

### 2. Transactional Outbox Pattern (`OutboxService` & `OutboxPublisher`)
- Business logic writes state and `OutboxEvent` (`status: PENDING`) inside `prisma.$transaction`.
- `OutboxPublisher` sweeps pending outbox rows in chronological order, dispatches to Kafka with exponential backoff (1s, 2s, 4s, 8s), and marks rows `PUBLISHED`.

### 3. Idempotent Consumer Processing
- Every consumer validates and records `ProcessedEvent(eventId, consumerGroup)` with a compound unique key.
- Duplicate Kafka message deliveries are logged and skipped without re-executing business transactions.

### 4. Dead-Letter Queue (DLQ) & Bounded Retries
- Transient errors retry up to 3 times with exponential backoff.
- Permanent failures route to `DeadLetterEvent` in PostgreSQL and `careerforge.dlq` in Kafka.
- Admin APIs allow manual payload inspection and atomic re-queuing.

## Verification
- Comprehensive 11-scenario integration test suite (`tests/integration/kafka-events.test.ts`) passing with 100% success.
- Zero regressions across Phase 13 (Hybrid Matching), Phase 14 (Skill Gap & Learning Paths), Phase 15 (Recommendations), and Phase 16 (Grounded RAG Assistant).
- Production Next.js build compiled all 16 SaaS routes.
