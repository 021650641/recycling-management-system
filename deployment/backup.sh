#!/bin/bash

#######################################
# Backup Script
# Creates backups of database and application files
#######################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect install directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="$(dirname "$SCRIPT_DIR")"

# Default backup directory
BACKUP_DIR="$HOME/backups/recycling"
DATE=$(date +%Y%m%d_%H%M%S)

log_info "========================================"
log_info "     Recycling System Backup Tool       "
log_info "========================================"
echo ""

# Parse command line arguments
BACKUP_TYPE="full"
RETENTION_DAYS=7

while [[ $# -gt 0 ]]; do
    case $1 in
        --db-only)
            BACKUP_TYPE="database"
            shift
            ;;
        --files-only)
            BACKUP_TYPE="files"
            shift
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --output)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --db-only           Backup database only"
            echo "  --files-only        Backup application files only"
            echo "  --retention DAYS    Number of days to keep backups (default: 7)"
            echo "  --output DIR        Custom backup directory"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Full backup with default settings"
            echo "  $0 --db-only                 # Database backup only"
            echo "  $0 --retention 30            # Keep backups for 30 days"
            echo "  $0 --output /mnt/backups     # Custom backup location"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Backup Configuration:"
echo "  Type: $BACKUP_TYPE"
echo "  Destination: $BACKUP_DIR"
echo "  Retention: $RETENTION_DAYS days"
echo "  Timestamp: $DATE"
echo ""

#######################################
# Database Backup
#######################################
if [[ "$BACKUP_TYPE" == "full" || "$BACKUP_TYPE" == "database" ]]; then
    log_info "Step 1: Backing up database..."
    
    # Get database name from backend .env
    if [ -f "$INSTALL_DIR/backend/.env" ]; then
        source <(grep DATABASE_URL "$INSTALL_DIR/backend/.env" | sed 's/^/export /')
        
        # Parse DATABASE_URL (postgresql://user:pass@host:port/dbname)
        DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*postgresql://[^@]*@[^/]*/\([^?]*\).*|\1|p')
        
        if [ -z "$DB_NAME" ]; then
            log_error "Could not determine database name from .env file"
            exit 1
        fi
        
        log_info "Database: $DB_NAME"
        
        # Create database backup
        DB_BACKUP_FILE="$BACKUP_DIR/db_${DATE}.sql.gz"
        
        if sudo -u postgres pg_dump "$DB_NAME" | gzip > "$DB_BACKUP_FILE"; then
            DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
            log_success "Database backup created: $DB_BACKUP_FILE ($DB_SIZE)"
        else
            log_error "Database backup failed!"
            exit 1
        fi
        
        # Create database schema-only backup (for reference)
        SCHEMA_BACKUP_FILE="$BACKUP_DIR/schema_${DATE}.sql"
        if sudo -u postgres pg_dump "$DB_NAME" --schema-only > "$SCHEMA_BACKUP_FILE"; then
            log_success "Schema backup created: $SCHEMA_BACKUP_FILE"
        fi
        
    else
        log_error "Backend .env file not found at $INSTALL_DIR/backend/.env"
        exit 1
    fi
fi

#######################################
# Application Files Backup
#######################################
if [[ "$BACKUP_TYPE" == "full" || "$BACKUP_TYPE" == "files" ]]; then
    log_info "Step 2: Backing up application files..."
    
    APP_BACKUP_FILE="$BACKUP_DIR/app_${DATE}.tar.gz"
    
    # Create exclusion list
    EXCLUDE_LIST=$(cat <<EOF
--exclude=node_modules
--exclude=.git
--exclude=dist
--exclude=build
--exclude=logs
--exclude=*.log
--exclude=.env.backup.*
--exclude=tmp
EOF
)
    
    if tar -czf "$APP_BACKUP_FILE" -C "$(dirname "$INSTALL_DIR")" $(basename "$INSTALL_DIR") $EXCLUDE_LIST 2>/dev/null; then
        APP_SIZE=$(du -h "$APP_BACKUP_FILE" | cut -f1)
        log_success "Application backup created: $APP_BACKUP_FILE ($APP_SIZE)"
    else
        log_error "Application backup failed!"
        exit 1
    fi
    
    # Backup .env files separately (encrypted)
    ENV_BACKUP_FILE="$BACKUP_DIR/env_${DATE}.tar.gz.gpg"
    
    if [ -f "$INSTALL_DIR/backend/.env" ] || [ -f "$INSTALL_DIR/frontend/.env" ]; then
        log_info "Backing up environment files (encrypted)..."
        
        # Create temporary tar
        TEMP_ENV_TAR=$(mktemp)
        tar -czf "$TEMP_ENV_TAR" -C "$INSTALL_DIR" backend/.env frontend/.env 2>/dev/null || true
        
        # Encrypt with password
        read -sp "Enter encryption password (optional, press Enter to skip): " ENCRYPT_PASS
        echo ""
        
        if [ -n "$ENCRYPT_PASS" ]; then
            echo "$ENCRYPT_PASS" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 -o "$ENV_BACKUP_FILE" "$TEMP_ENV_TAR"
            rm "$TEMP_ENV_TAR"
            log_success "Environment files backed up (encrypted): $ENV_BACKUP_FILE"
        else
            mv "$TEMP_ENV_TAR" "$BACKUP_DIR/env_${DATE}.tar.gz"
            log_warning "Environment files backed up (unencrypted): $BACKUP_DIR/env_${DATE}.tar.gz"
        fi
    fi
fi

#######################################
# Create backup manifest
#######################################
log_info "Creating backup manifest..."

MANIFEST_FILE="$BACKUP_DIR/backup_${DATE}_manifest.txt"

cat > "$MANIFEST_FILE" <<EOF
Recycling Management System Backup
==================================

Backup Date: $(date)
Backup Type: $BACKUP_TYPE
Hostname: $(hostname)
User: $USER

Installation Directory: $INSTALL_DIR
Backup Directory: $BACKUP_DIR

Files Created:
EOF

if [[ "$BACKUP_TYPE" == "full" || "$BACKUP_TYPE" == "database" ]]; then
    echo "  Database: $DB_BACKUP_FILE ($(du -h "$DB_BACKUP_FILE" | cut -f1))" >> "$MANIFEST_FILE"
    echo "  Schema: $SCHEMA_BACKUP_FILE ($(du -h "$SCHEMA_BACKUP_FILE" | cut -f1))" >> "$MANIFEST_FILE"
fi

if [[ "$BACKUP_TYPE" == "full" || "$BACKUP_TYPE" == "files" ]]; then
    echo "  Application: $APP_BACKUP_FILE ($(du -h "$APP_BACKUP_FILE" | cut -f1))" >> "$MANIFEST_FILE"
fi

cat >> "$MANIFEST_FILE" <<EOF

Git Information:
EOF

if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    echo "  Branch: $(git rev-parse --abbrev-ref HEAD)" >> "$MANIFEST_FILE"
    echo "  Commit: $(git rev-parse HEAD)" >> "$MANIFEST_FILE"
    echo "  Last Commit: $(git log -1 --format=%cd)" >> "$MANIFEST_FILE"
fi

cat >> "$MANIFEST_FILE" <<EOF

Restoration Instructions:
=========================

Database Restoration:
  gunzip -c $DB_BACKUP_FILE | sudo -u postgres psql $DB_NAME

Application Restoration:
  tar -xzf $APP_BACKUP_FILE -C $(dirname "$INSTALL_DIR")

Environment Files Restoration (if encrypted):
  gpg --decrypt $ENV_BACKUP_FILE | tar -xz -C $INSTALL_DIR
EOF

log_success "Backup manifest created: $MANIFEST_FILE"

#######################################
# Cleanup old backups
#######################################
log_info "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."

# Count backups before cleanup
BEFORE_COUNT=$(ls -1 "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | wc -l)

# Remove old database backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "schema_*.sql" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Remove old application backups
find "$BACKUP_DIR" -name "app_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Remove old environment backups
find "$BACKUP_DIR" -name "env_*.tar.gz*" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Remove old manifests
find "$BACKUP_DIR" -name "backup_*_manifest.txt" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

AFTER_COUNT=$(ls -1 "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | wc -l)
REMOVED=$((BEFORE_COUNT - AFTER_COUNT))

if [ $REMOVED -gt 0 ]; then
    log_success "Removed $REMOVED old backup(s)"
else
    log_info "No old backups to remove"
fi

#######################################
# Summary
#######################################
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
log_success "========================================"
log_success "      Backup Completed Successfully!    "
log_success "========================================"
echo ""
log_info "Backup Summary:"
echo "  Location: $BACKUP_DIR"
echo "  Total Size: $TOTAL_SIZE"
echo "  Files: $(ls -1 "$BACKUP_DIR" | wc -l)"
echo ""
log_info "Recent Backups:"
ls -lht "$BACKUP_DIR" | head -10
echo ""
log_info "Backup Manifest: $MANIFEST_FILE"
echo ""
log_success "Backup completed at $(date)"
