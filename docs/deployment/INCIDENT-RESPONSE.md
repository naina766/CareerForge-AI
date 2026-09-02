# Security Incident Response Plan (SOP)

## Incident Lifecycle Phases
```text
1. Detection & Triaging → 2. Containment → 3. Investigation → 4. Remediation → 5. Post-Incident Review
```

## Outage Procedures

### 1. Database Outage
1. Inspect health probe: `curl -s http://localhost/ready`
2. Check container logs: `docker compose -f docker-compose.prod.yml logs postgres`
3. If database is corrupted, restore latest verified backup via `pnpm db:restore <snapshot.sql.gz>`.

### 2. Kafka Event Streaming Degradation
1. Express API automatically falls back to PostgreSQL Transactional Outbox.
2. Restart Kafka broker: `docker compose -f docker-compose.prod.yml restart kafka`
3. Replay unprocessed events from the outbox table.

### 3. FAISS Vector Retrieval Outage
1. FastAPI AI microservice automatically flags semantic search as DEGRADED.
2. CareerForge falls back to deterministic keyword matching without crashing.
3. Restore FAISS index from `backups/faiss/` via `faiss_backup.py`.
