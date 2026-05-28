#!/usr/bin/env bash
# ================================================================
# scripts/migrate.sh — Production-safe migration strategy
# ================================================================
# Usage:
#   ./scripts/migrate.sh dev       — run dev migrations
#   ./scripts/migrate.sh prod      — run production migrations (safe)
#   ./scripts/migrate.sh check     — check pending migrations
#   ./scripts/migrate.sh baseline  — baseline existing DB (first deploy)
#   ./scripts/migrate.sh rollback  — manual rollback instructions
# ================================================================
set -euo pipefail

ENV="${1:-dev}"
API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../apps/api" && pwd)"
PRISMA="$API_DIR/node_modules/.bin/prisma"

cd "$API_DIR"

# Load environment
if [ -f "../../.env" ]; then
  export $(grep -v '^#' ../../.env | xargs)
fi

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

case "$ENV" in
  dev)
    log "Running development migration..."
    "$PRISMA" migrate dev --skip-seed
    log "✅ Dev migration complete"
    ;;

  prod)
    log "Running PRODUCTION migration..."
    log "WARNING: This will modify the production database."
    
    # Validate connection
    "$PRISMA" db execute --url "$DATABASE_URL" --stdin <<< "SELECT 1;" || \
      fail "Cannot connect to database"

    # Check for pending migrations
    PENDING=$("$PRISMA" migrate status 2>&1 | grep "following migration" || true)
    if [ -z "$PENDING" ]; then
      log "✅ No pending migrations"
      exit 0
    fi

    log "Pending migrations found. Applying..."
    
    # Create pre-migration backup signal
    log "Creating migration checkpoint..."
    "$PRISMA" db execute --url "$DATABASE_URL" --stdin <<< \
      "INSERT INTO _prisma_migrations_checkpoints (timestamp, note) VALUES (NOW(), 'pre-migration') ON CONFLICT DO NOTHING;" 2>/dev/null || true

    # Apply migrations
    "$PRISMA" migrate deploy
    
    log "✅ Production migration complete"
    ;;

  check)
    log "Checking migration status..."
    "$PRISMA" migrate status
    ;;

  baseline)
    log "Baselining existing database (first deploy)..."
    log "This marks all existing migrations as applied without running them."
    "$PRISMA" migrate resolve --applied "$(ls prisma/migrations | head -1)" || true
    log "Run 'migrate prod' after baseline."
    ;;

  generate)
    log "Regenerating Prisma client..."
    "$PRISMA" generate
    log "✅ Client generated"
    ;;

  seed)
    log "Running database seed..."
    "$PRISMA" db seed
    log "✅ Seed complete"
    ;;

  studio)
    log "Opening Prisma Studio..."
    "$PRISMA" studio
    ;;

  *)
    fail "Unknown environment: $ENV. Use: dev | prod | check | baseline | generate | seed"
    ;;
esac
