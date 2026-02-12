#!/bin/bash

#######################################
# Database Migration Runner
# Applies SQL migrations in sequential order,
# tracking which have already been applied.
#######################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Load env vars from backend/.env
if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

# Build connection string from individual vars (matching config.ts defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-recycling_db}"
DB_USER="${DB_USER:-recycling_user}"

export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGDATABASE="$DB_NAME"
export PGUSER="$DB_USER"
export PGPASSWORD="$DB_PASSWORD"

echo "[migrations] Connecting to $DB_NAME@$DB_HOST:$DB_PORT as $DB_USER"

# Create migrations tracking table if it doesn't exist
psql -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
SQL

# Apply each numbered migration in order
APPLIED=0
SKIPPED=0

for migration in "$SCRIPT_DIR"/[0-9]*.sql; do
    [ -f "$migration" ] || continue
    filename=$(basename "$migration")

    # Check if already applied
    already=$(psql -tAq -c "SELECT COUNT(*) FROM schema_migrations WHERE filename = '$filename'")

    if [ "$already" -gt 0 ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    echo "[migrations] Applying $filename ..."
    psql -q -f "$migration"
    psql -q -c "INSERT INTO schema_migrations (filename) VALUES ('$filename')"
    APPLIED=$((APPLIED + 1))
    echo "[migrations] Applied $filename"
done

echo "[migrations] Done. Applied: $APPLIED, Skipped (already applied): $SKIPPED"
