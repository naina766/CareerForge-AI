#!/usr/bin/env bash
# ==============================================================================
# CareerForge AI — PostgreSQL Automated Backup & Recovery Tool
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/careerforge}"
BACKUP_FILE="${BACKUP_DIR}/careerforge_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

usage() {
  echo "Usage: $0 {backup|restore <file>|verify <file>}"
  exit 1
}

backup() {
  echo "📦 Starting PostgreSQL database backup..."
  pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges | gzip > "${BACKUP_FILE}"
  
  CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
  echo "✅ Backup created successfully: ${BACKUP_FILE}"
  echo "🔒 SHA-256 Checksum: ${CHECKSUM}"
  
  # Retention: keep last 14 backups
  find "${BACKUP_DIR}" -type f -name "careerforge_backup_*.sql.gz" -mtime +14 -delete
}

restore() {
  TARGET_FILE="${1:-}"
  if [[ -z "${TARGET_FILE}" || ! -f "${TARGET_FILE}" ]]; then
    echo "❌ Error: Backup file not found: ${TARGET_FILE}"
    exit 1
  fi

  echo "⚠️ Warning: Restoring database will overwrite current state."
  echo "Restoring from: ${TARGET_FILE}..."
  gunzip -c "${TARGET_FILE}" | psql "${DATABASE_URL}"
  echo "✅ Database restored successfully from ${TARGET_FILE}"
}

verify() {
  TARGET_FILE="${1:-}"
  if [[ -z "${TARGET_FILE}" || ! -f "${TARGET_FILE}" ]]; then
    echo "❌ Error: Backup file not found: ${TARGET_FILE}"
    exit 1
  fi

  echo "🔍 Verifying backup integrity: ${TARGET_FILE}..."
  if gzip -t "${TARGET_FILE}"; then
    echo "✅ Backup archive integrity verified (gzip test passed)."
  else
    echo "❌ Backup archive corrupted!"
    exit 1
  fi
}

case "${1:-}" in
  backup) backup ;;
  restore) restore "${2:-}" ;;
  verify) verify "${2:-}" ;;
  *) usage ;;
esac
