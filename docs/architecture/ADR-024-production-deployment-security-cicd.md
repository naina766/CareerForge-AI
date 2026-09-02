# ADR-024: Production Deployment, Security Hardening & CI/CD Platform

## Status
Accepted

## Context
Transitioning CareerForge AI into a production-grade SaaS system required containerization, security hardening, automated CI/CD pipelines, database backup/recovery procedures, and resilient graceful degradation patterns.

## Decision
1. **Container Orchestration**: Standardize on Docker Compose with multi-stage non-root Dockerfiles for all microservices and workers. Nginx serves as the single public reverse proxy terminating SSL, applying security headers, and enforcing request limits.
2. **Architectural Invariant**: Retain **PostgreSQL** as the transactional ground truth, **FAISS** as the semantic vector retrieval layer (do not use pgvector), **Kafka** as the event backbone, and **Redis** for distributed caching and rate limiting.
3. **OWASP API & File Security**: Enforce MIME type, magic bytes (%PDF, PK\x03\x04), and filename sanitization on resume uploads. Apply brute-force login lockouts and multi-tiered rate limiting.
4. **Automated CI/CD**: Implement GitHub Actions workflows for continuous integration (`ci.yml`), automated security audits & secret leakage scans (`security.yml`), and Dependabot version management.
5. **Disaster Recovery**: Maintain automated PostgreSQL backup/restore tooling (`backup-db.sh`) with gzip integrity tests and separate FAISS index backup mechanisms (`faiss_backup.py`).

## Consequences
- **Positive**: Hardened, reproducible production architecture with automated quality gates and disaster recovery capabilities.
- **Negative**: Requires operational maintenance of Docker clusters and backup storage.
