#!/bin/bash

#######################################
# Update & Maintenance Script
# Updates application from git and restarts services
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

log_info "========================================"
log_info "  Recycling Management System Update   "
log_info "========================================"
echo ""
log_info "Installation directory: $INSTALL_DIR"
echo ""

# Check if git repo
if [ ! -d "$INSTALL_DIR/.git" ]; then
    log_error "Not a git repository. Cannot update."
    exit 1
fi

# Parse command line arguments
SKIP_BACKUP=false
FORCE_UPDATE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-backup    Skip automatic backup before update"
            echo "  --force          Force update even if there are local changes"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

#######################################
# Pre-update checks
#######################################
log_info "Step 1: Pre-update checks..."

cd "$INSTALL_DIR"

# Check for local changes
if git diff-index --quiet HEAD --; then
    log_success "No local changes detected"
else
    log_warning "Local changes detected!"
    
    if [ "$FORCE_UPDATE" = false ]; then
        git status --short
        echo ""
        read -p "Continue with update? This may overwrite local changes (y/n): " CONFIRM
        if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
            log_info "Update cancelled"
            exit 0
        fi
    fi
fi

# Check for updates
log_info "Fetching updates from remote..."
git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log_success "Already up to date!"
    read -p "Rebuild and restart anyway? (y/n) [n]: " REBUILD
    if [[ ! $REBUILD =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    log_info "Updates available"
    git log --oneline HEAD..origin/main | head -5
    echo ""
fi

#######################################
# Backup
#######################################
if [ "$SKIP_BACKUP" = false ]; then
    log_info "Step 2: Creating backup..."
    
    if [ -f "$INSTALL_DIR/backup.sh" ]; then
        "$INSTALL_DIR/backup.sh"
    else
        log_warning "Backup script not found, skipping backup"
    fi
else
    log_warning "Skipping backup (--skip-backup flag used)"
fi

#######################################
# Update code
#######################################
log_info "Step 3: Updating code from git..."

# Stash any local changes
if ! git diff-index --quiet HEAD --; then
    log_info "Stashing local changes..."
    git stash
fi

# Pull updates
git pull origin main

log_success "Code updated successfully!"

#######################################
# Update backend
#######################################
log_info "Step 4: Updating backend..."

cd "$INSTALL_DIR/backend"

# Check if package.json changed
if git diff HEAD@{1} --name-only | grep -q "backend/package.json"; then
    log_info "Dependencies changed, running npm install..."
    npm install --production
else
    log_info "No dependency changes detected"
fi

# Build backend
log_info "Building backend..."
npm run build

log_success "Backend updated!"

#######################################
# Update frontend
#######################################
log_info "Step 5: Updating frontend..."

cd "$INSTALL_DIR/frontend"

# Check if package.json changed
if git diff HEAD@{1} --name-only | grep -q "frontend/package.json"; then
    log_info "Dependencies changed, running npm install..."
    npm install --production
else
    log_info "No dependency changes detected"
fi

# Build frontend
log_info "Building frontend..."
npm run build

log_success "Frontend updated!"

#######################################
# Database migrations
#######################################
log_info "Step 6: Running database migrations..."

cd "$INSTALL_DIR/backend"

if [ -f "migrations/run-migrations.sh" ]; then
    log_info "Running migrations..."
    chmod +x migrations/run-migrations.sh
    ./migrations/run-migrations.sh || log_warning "Migration script returned non-zero"
else
    log_warning "No migration script found"
fi

#######################################
# Restart services
#######################################
log_info "Step 7: Restarting services..."

# Restart PM2
if command -v pm2 &> /dev/null; then
    log_info "Restarting PM2 process..."
    pm2 restart recycling-api
    
    # Wait for app to be ready
    sleep 3
    
    # Check if app is running
    if pm2 status recycling-api | grep -q "online"; then
        log_success "Backend service restarted successfully!"
    else
        log_error "Backend service failed to start!"
        pm2 logs recycling-api --lines 20
        exit 1
    fi
else
    log_warning "PM2 not found, skipping backend restart"
fi

# Reload Nginx
if command -v nginx &> /dev/null; then
    log_info "Reloading Nginx..."
    sudo systemctl reload nginx
    log_success "Nginx reloaded!"
else
    log_warning "Nginx not found, skipping nginx reload"
fi

#######################################
# Post-update verification
#######################################
log_info "Step 8: Verifying update..."

# Check API health
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    log_success "API health check passed!"
else
    log_error "API health check failed!"
    log_info "Checking logs..."
    pm2 logs recycling-api --lines 30
fi

# Show current version
cd "$INSTALL_DIR"
CURRENT_VERSION=$(git rev-parse --short HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo ""
log_success "========================================"
log_success "       Update Completed Successfully!   "
log_success "========================================"
echo ""
log_info "Version Information:"
echo "  Branch: $CURRENT_BRANCH"
echo "  Commit: $CURRENT_VERSION"
echo "  Updated: $(date)"
echo ""
log_info "Service Status:"
pm2 status recycling-api
echo ""
log_info "Recent Logs (last 10 lines):"
pm2 logs recycling-api --lines 10 --nostream
echo ""
log_info "Useful Commands:"
echo "  View logs:    pm2 logs recycling-api"
echo "  Full status:  $INSTALL_DIR/status.sh"
echo "  Rollback:     cd $INSTALL_DIR && git checkout HEAD@{1} && $0"
echo ""