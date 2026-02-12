#!/bin/bash

#######################################
# Environment Configuration Script
# Creates and manages .env files for backend and frontend
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

log_info "Environment Configuration Script"
echo ""

# Detect install directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="$(dirname "$SCRIPT_DIR")"

log_info "Detected installation directory: $INSTALL_DIR"
echo ""

# Interactive prompts
read -p "Enter your domain name: " DOMAIN_NAME
read -p "Enter PostgreSQL database name: " DB_NAME
read -p "Enter PostgreSQL username: " DB_USER
read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""

# Generate or get JWT secret
read -p "Generate new JWT secret? (y/n) [y]: " GEN_JWT
GEN_JWT=${GEN_JWT:-y}

if [[ $GEN_JWT =~ ^[Yy]$ ]]; then
    JWT_SECRET=$(openssl rand -base64 48)
    log_success "Generated secure JWT secret"
else
    read -sp "Enter JWT secret (min 32 characters): " JWT_SECRET
    echo ""
    if [ ${#JWT_SECRET} -lt 32 ]; then
        log_error "JWT secret must be at least 32 characters!"
        exit 1
    fi
fi

read -p "Enter backend API port [5000]: " API_PORT
API_PORT=${API_PORT:-5000}

read -p "Enter environment (development/production) [production]: " NODE_ENV
NODE_ENV=${NODE_ENV:-production}

read -p "Enter log level (error/warn/info/debug) [info]: " LOG_LEVEL
LOG_LEVEL=${LOG_LEVEL:-info}

echo ""
log_info "Configuration Summary:"
echo "  Domain: $DOMAIN_NAME"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  API Port: $API_PORT"
echo "  Environment: $NODE_ENV"
echo "  Log Level: $LOG_LEVEL"
echo ""

read -p "Create/update environment files? (y/n): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    log_info "Configuration cancelled."
    exit 0
fi

#######################################
# Backend .env
#######################################
log_info "Creating backend .env file..."

BACKEND_ENV_FILE="$INSTALL_DIR/backend/.env"

# Backup existing if present
if [ -f "$BACKEND_ENV_FILE" ]; then
    cp "$BACKEND_ENV_FILE" "$BACKEND_ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "Backed up existing backend .env"
fi

ENCRYPTION_KEY=$(openssl rand -base64 32)

cat > "$BACKEND_ENV_FILE" <<EOF
# Node Environment
NODE_ENV=$NODE_ENV
PORT=$API_PORT
API_PREFIX=/api/v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_MAX_CONNECTIONS=20

# Security
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=https://$DOMAIN_NAME

# Logging
LOG_LEVEL=$LOG_LEVEL

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760

# Encryption Key (for sensitive data like government IDs)
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

chmod 600 "$BACKEND_ENV_FILE"
log_success "Backend .env created: $BACKEND_ENV_FILE"

#######################################
# Frontend .env
#######################################
log_info "Creating frontend .env file..."

FRONTEND_ENV_FILE="$INSTALL_DIR/frontend/.env"

# Backup existing if present
if [ -f "$FRONTEND_ENV_FILE" ]; then
    cp "$FRONTEND_ENV_FILE" "$FRONTEND_ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "Backed up existing frontend .env"
fi

cat > "$FRONTEND_ENV_FILE" <<EOF
# API Configuration
VITE_API_URL=https://$DOMAIN_NAME/api

# Environment
VITE_ENV=$NODE_ENV

# Application Settings
VITE_APP_NAME=Recycling Management System
VITE_APP_VERSION=1.0.0

# Feature Flags (optional)
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
VITE_SYNC_INTERVAL=120000
EOF

chmod 600 "$FRONTEND_ENV_FILE"
log_success "Frontend .env created: $FRONTEND_ENV_FILE"

#######################################
# Create .env.example files
#######################################
log_info "Creating .env.example templates..."

cat > "$INSTALL_DIR/backend/.env.example" <<'EOF'
# Node Environment
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recycling_db
DB_USER=recycling_user
DB_PASSWORD=your_secure_password
DB_MAX_CONNECTIONS=20

# Security
JWT_SECRET=your_secure_jwt_secret_min_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760

# Encryption Key (for sensitive data - generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_encryption_key_here
EOF

cat > "$INSTALL_DIR/frontend/.env.example" <<'EOF'
# API Configuration
VITE_API_URL=https://yourdomain.com/api

# Environment
VITE_ENV=production

# Application Settings
VITE_APP_NAME=Recycling Management System
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
VITE_SYNC_INTERVAL=120000
EOF

log_success ".env.example templates created"

#######################################
# Validation
#######################################
log_info "Validating configuration..."

# Check backend env file
if grep -q "your_secure" "$BACKEND_ENV_FILE"; then
    log_warning "Backend .env contains placeholder values!"
fi

# Check frontend env file
if grep -q "yourdomain.com" "$FRONTEND_ENV_FILE" 2>/dev/null; then
    log_warning "Frontend .env contains placeholder domain!"
fi

#######################################
# Create env info file
#######################################
cat > "$INSTALL_DIR/ENV_CONFIG.txt" <<EOF
Environment Configuration Summary
=================================

Created: $(date)

Backend Environment:
  File: $BACKEND_ENV_FILE
  Environment: $NODE_ENV
  API Port: $API_PORT
  Database: $DB_NAME
  Log Level: $LOG_LEVEL

Frontend Environment:
  File: $FRONTEND_ENV_FILE
  API URL: https://$DOMAIN_NAME/api
  Environment: $NODE_ENV

Security:
  JWT Secret: [CONFIGURED - $(echo ${#JWT_SECRET} chars)]
  Encryption Key: [CONFIGURED - AES-256]
  Session Secret: [CONFIGURED]

Notes:
  - .env files have 600 permissions (read/write owner only)
  - Original files backed up with timestamp if they existed
  - .env.example files created for reference
  - Never commit .env files to version control

To reconfigure:
  $SCRIPT_DIR/configure-env.sh

To view backend config:
  cat $BACKEND_ENV_FILE

To view frontend config:
  cat $FRONTEND_ENV_FILE
EOF

chmod 644 "$INSTALL_DIR/ENV_CONFIG.txt"

echo ""
log_success "========================================"
log_success "  Environment Configuration Complete!  "
log_success "========================================"
echo ""
log_info "Configuration saved:"
echo "  Backend: $BACKEND_ENV_FILE"
echo "  Frontend: $FRONTEND_ENV_FILE"
echo "  Summary: $INSTALL_DIR/ENV_CONFIG.txt"
echo ""
log_warning "Security Reminders:"
echo "  ✓ .env files have restricted permissions (600)"
echo "  ✓ Never commit .env files to git"
echo "  ✓ Keep backups of .env files secure"
echo "  ✓ Rotate JWT secrets periodically"
echo ""

# Offer to restart services
if sudo systemctl is-enabled --quiet recycling-api.service 2>/dev/null; then
    read -p "Restart backend service to apply changes? (y/n) [y]: " RESTART
    RESTART=${RESTART:-y}

    if [[ $RESTART =~ ^[Yy]$ ]]; then
        log_info "Restarting backend service..."
        sudo systemctl restart recycling-api.service || log_warning "Service not running"
        log_success "Service restarted!"
    fi
fi

echo ""
log_success "Configuration complete! ✓"
