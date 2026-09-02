# PostgreSQL Database Backup & Disaster Recovery SOP

## 1. Objectives & Metrics
- **Recovery Point Objective (RPO)**: < 1 hour (daily automated snapshots + transaction logs)
- **Recovery Time Objective (RTO)**: < 15 minutes for full database restoration
- **Retention Period**: 14 days rotating local/cold snapshots

---

## 2. Automated Backup Execution
The automated backup utility is located at `scripts/backup-db.sh`.

```bash
# Execute standard backup
pnpm db:backup

# Output:
# 📦 Starting PostgreSQL database backup...
# ✅ Backup created successfully: backups/postgres/careerforge_backup_20260902_120000.sql.gz
# 🔒 SHA-256 Checksum: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

---

## 3. Disaster Recovery Restoration Procedure
In the event of database corruption or hardware failure:

1. Identify the latest valid snapshot:
   ```bash
   pnpm db:verify backups/postgres/careerforge_backup_YYYYMMDD_HHMMSS.sql.gz
   ```
2. Put the Express API in maintenance mode.
3. Execute recovery:
   ```bash
   pnpm db:restore backups/postgres/careerforge_backup_YYYYMMDD_HHMMSS.sql.gz
   ```
4. Verify database connectivity and schema integrity:
   ```bash
   pnpm exec prisma db push
   pnpm exec prisma validate
   ```
5. Resume API server and check `/ready` health probe.

---

## 4. FAISS Vector Index Recovery
FAISS semantic indexes are persisted separately from PostgreSQL to avoid pgvector coupling.
- Backup location: `backups/faiss/`
- Restoration mechanism: `apps/ai-service/app/infrastructure/faiss_backup.py`
- In the event of index corruption, the AI microservice continues operating in keyword-fallback degraded mode without crashing primary applicant workflows.
