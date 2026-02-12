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

# Build connection details from individual vars (matching config.ts defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-recycling_db}"
DB_USER="${DB_USER:-recycling_user}"

# Determine how to invoke psql:
# - If DB_PASSWORD is set, use it via PGPASSWORD env var
# - Otherwise, use sudo -u postgres for local peer authentication
if [ -n "$DB_PASSWORD" ]; then
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    export PGPASSWORD="$DB_PASSWORD"
    echo "[migrations] Connecting to $DB_NAME@$DB_HOST:$DB_PORT as $DB_USER (password auth)"
else
    PSQL_CMD="sudo -u postgres psql -d $DB_NAME"
    echo "[migrations] Connecting to $DB_NAME via sudo -u postgres (peer auth)"
fi

# Test connection
if ! $PSQL_CMD -c "SELECT 1" > /dev/null 2>&1; then
    echo "[migrations] ERROR: Cannot connect to database $DB_NAME"
    echo "[migrations] Check your .env file at $BACKEND_DIR/.env"
    exit 1
fi

# Create migrations tracking table if it doesn't exist
$PSQL_CMD -q <<'SQL'
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
    already=$($PSQL_CMD -tAq -c "SELECT COUNT(*) FROM schema_migrations WHERE filename = '$filename'")

    if [ "$already" -gt 0 ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    echo "[migrations] Applying $filename ..."
    $PSQL_CMD -q -f "$migration"
    $PSQL_CMD -q -c "INSERT INTO schema_migrations (filename) VALUES ('$filename')"
    APPLIED=$((APPLIED + 1))
    echo "[migrations] Applied $filename"
done

# When running as postgres superuser, ensure the app user has access to all tables
if [ -z "$DB_PASSWORD" ] && [ "$APPLIED" -gt 0 ]; then
    echo "[migrations] Granting table permissions to $DB_USER ..."
    $PSQL_CMD -q -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
    $PSQL_CMD -q -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
fi

echo "[migrations] Done. Applied: $APPLIED, Skipped (already applied): $SKIPPED"
