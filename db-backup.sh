#!/usr/bin/env bash
# ================================================================
# scripts/db-backup.sh — PostgreSQL production backup
# Runs via cron: 0 2 * * * /app/scripts/db-backup.sh
# ================================================================
set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/postgres}"

mkdir -p "$BACKUP_DIR"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "❌ BACKUP FAILED: $*" >&2; exit 1; }

# Parse DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL not set"
fi

BACKUP_FILE="$BACKUP_DIR/academy_${TIMESTAMP}.dump"

log "Starting PostgreSQL backup → $BACKUP_FILE"

# pg_dump with custom format (supports parallel restore)
pg_dump \
  --format=custom \
  --compress=9 \
  --no-password \
  --verbose \
  --file="$BACKUP_FILE" \
  "$DATABASE_URL" || fail "pg_dump failed"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup complete: $BACKUP_SIZE"

# Upload to S3
if [ -n "$S3_BUCKET" ]; then
  S3_KEY="${S3_PREFIX}/academy_${TIMESTAMP}.dump"
  log "Uploading to s3://${S3_BUCKET}/${S3_KEY}..."
  
  aws s3 cp \
    "$BACKUP_FILE" \
    "s3://${S3_BUCKET}/${S3_KEY}" \
    --storage-class STANDARD_IA \
    --sse AES256 || fail "S3 upload failed"

  log "✅ Uploaded to S3"

  # Set lifecycle (delete after retention)
  # S3 lifecycle rules handle this automatically via bucket config

  # Remove local copy after successful S3 upload
  rm -f "$BACKUP_FILE"
fi

# Clean up old local backups
find "$BACKUP_DIR" -name "academy_*.dump" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
log "Cleaned up backups older than ${RETENTION_DAYS} days"

# ── Restore instructions ──────────────────────────────────────────
# pg_restore --format=custom --no-owner --clean --if-exists \
#   --dbname="$DATABASE_URL" academy_20240101_020000.dump
# ─────────────────────────────────────────────────────────────────

log "✅ Backup process complete"
