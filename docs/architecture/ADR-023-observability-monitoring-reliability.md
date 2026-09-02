# ADR-023: Production-Grade Observability, Monitoring & Reliability Architecture

## Status
Accepted

## Context
As CareerForge AI grew into a distributed event-driven system with Express REST APIs, FastAPI AI microservices, Kafka event streaming, and background workers, comprehensive cross-service observability was necessary to ensure high availability, detect performance regressions, and trace requests.

## Decision
1. **Multi-Service Health Probing**: Implement deep health checks across PostgreSQL, Redis, Kafka, AI Service, FAISS, and Background Workers, persisting periodic snapshots to `ServiceHealthCheck` and `ServiceHealthSnapshot`.
2. **Deterministic Metric & Alert Engine**: Maintain real-time latency percentiles (P50, P90, P95, P99) and automated alert evaluation for latency spikes (>1000ms warning, >3000ms critical), elevated error rates (>5% warning, >15% critical), and Kafka DLQ events.
3. **Distributed Trace Propagation**: Propagate `X-Request-ID`, `X-Correlation-ID`, `causationId`, and `eventId` across HTTP requests and Kafka event payloads, providing an interactive Trace Timeline Explorer in the Admin Dashboard.
4. **FAISS & AI Telemetry**: Expose index size, dimensions, search latency, and empty query rates via the AI service `/metrics` endpoint.

## Consequences
- **Positive**: Operators have instant visibility into system bottlenecks, error spikes, and distributed event flows with zero candidate-facing information leakage.
- **Negative**: Adds lightweight memory overhead for in-memory percentiles and trace buffering.
