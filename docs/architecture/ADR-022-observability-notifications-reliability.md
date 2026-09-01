# ADR-022: Production Observability, Notifications & Reliability Platform

## Status
Accepted

## Context
CareerForge AI relies on a hybrid architecture:
- **PostgreSQL** as the transactional ground truth.
- **Kafka** as the asynchronous domain event backbone.
- **FAISS** as the semantic retrieval layer.
- **FastAPI / Local Python Workers** for AI vector operations.

To guarantee carrier-grade production reliability, we required an integrated platform answering:
1. **Health & Latency**: Real-time status and latency of all services (PostgreSQL, Redis, Kafka, FastAPI, Workers).
2. **Event & Worker Reliability**: Tracking worker execution lifecycle (`STARTED` $\rightarrow$ `SUCCESS` / `FAILED` / `RETRYING` / `DLQ`), processing durations, and retry counts.
3. **Failure Isolation & Fallbacks**: Preventing cascading crashes using Circuit Breakers and fallback execution.
4. **User Engagement & Notifications**: Real-time multi-channel notification engine (In-App, Email) responding to domain events with deduplication and preference controls.
5. **Observability RBAC**: Restricted administrator access to system telemetry, metrics percentiles (P50, P90, P95), and distributed error traces.

## Decisions

### 1. Unified Observability & Telemetry Architecture
- Implemented `StructuredLogger` outputting standardized JSON logs with correlation IDs (`correlationId`, `requestId`).
- Implemented `MetricsService` calculating real-time request counts, error rates, and route latency percentiles (P50, P90, P95).
- Created `HealthCheckService` for non-blocking multi-service probing.
- Created `KafkaHealthService` for consumer lag, broker connectivity, and dead-letter queue (DLQ) telemetry.

### 2. Worker Lifecycle & Execution Tracking
- Introduced `WorkerExecution` model in PostgreSQL to log every job lifecycle step:
  - `STARTED` $\rightarrow$ Records start timestamp, worker name, event ID, event type, attempt number.
  - `SUCCESS` $\rightarrow$ Records duration in milliseconds and completion timestamp.
  - `FAILED` / `RETRYING` $\rightarrow$ Logs error message, stack trace, and updates attempt counter.
  - `DLQ` $\rightarrow$ Routes unrecoverable poison pill events to dead-letter storage.

### 3. Circuit Breaker & Fallback Protection
- Implemented `CircuitBreaker` pattern (`CLOSED`, `OPEN`, `HALF_OPEN`) with configurable failure thresholds, timeout limits, and fallback routines to prevent external service degradation from propagating.

### 4. Domain Event-Driven Notification Engine
- Created `NotificationService` & `NotificationPreferenceService` in PostgreSQL.
- Handled Kafka domain events in background workers:
  - `match.completed` $\rightarrow$ Match report notification
  - `skill-gap.analyzed` $\rightarrow$ Skill gap & roadmap notification
  - `recommendation.refresh.completed` $\rightarrow$ Recommended jobs notification
  - `application.created` & `application.status.changed` $\rightarrow$ Application alerts
- Enforced deduplication window (60s suppression for identical event payloads) to eliminate alert fatigue.

### 5. Candidate Privacy & Multi-Tenancy
- Notifications and preferences are strictly isolated per candidate profile ID.
- Recruiter notifications are segregated from candidate alerts.
- Admin observability dashboards are strictly restricted via `requireRole('ADMIN')` RBAC.

## Consequences
- **Positive**: Complete distributed observability, zero-data-loss execution logging, real-time candidate notifications, resilient fallback protection, and full admin transparency.
- **Trade-offs**: Additional telemetry writes to PostgreSQL, managed with asynchronous non-blocking error handling.
