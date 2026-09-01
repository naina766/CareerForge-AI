# ADR-004: Distributed Tracing with Request & Correlation IDs

## Status
Accepted

## Context
When a user uploads a resume, creates a job, or asks an AI question, the lifecycle spans the Next.js frontend, Express API, Kafka event broker, background workers, and the FastAPI AI service. Debugging distributed asynchronous processing without unified trace context is difficult.

## Decision
We implemented a strict **Correlation ID & Request ID contract**:
1. **HTTP Ingestion**: Every incoming request to Express API or FastAPI checks for `X-Correlation-ID` (or `X-Request-ID`). If absent, a unique correlation ID is minted (e.g. `req_7a8f9c...`).
2. **Response Header**: Services always echo `X-Correlation-ID` in outgoing HTTP response headers.
3. **Structured Logging**: All Winston (Node) and standard logger (Python) entries include `correlationId`.
4. **Event Envelope**: All Kafka messages wrap their payload in a standard `DomainEvent<T>` envelope containing `eventId`, `eventType`, `correlationId`, `timestamp`, and `producer`.
5. **Worker Context**: Workers inherit the `correlationId` from consumed Kafka messages and forward it when invoking AI service endpoints.

## Schema
```json
{
  "eventId": "evt_99f8a7",
  "eventType": "resume.uploaded",
  "correlationId": "req_8a3d1c",
  "timestamp": "2026-09-01T12:00:00.000Z",
  "producer": "api",
  "version": "1.0",
  "payload": {
    "resumeId": "res_12345",
    "candidateId": "cand_67890"
  }
}
```

## Consequences
### Positive
- Full distributed request observability across all microservices and async consumers.
- Simplified log correlation in observability platforms.
