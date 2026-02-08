#!/bin/bash

#######################################
# Database Initialization Script
# Sets up PostgreSQL database with optimal configuration
#######################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as correct user
if [[ $EUID -eq 0 ]] && [[ "$USER" != "postgres" ]]; then
   log_error "This script should be run as a regular user with sudo privileges, not as root."
   exit 1
fi

log_info "Database Initialization Script"
echo ""

# Get database configuration
read -p "Enter database name [recycling_db]: " DB_NAME
DB_NAME=${DB_NAME:-recycling_db}

read -p "Enter database user [recycling_user]: " DB_USER
DB_USER=${DB_USER:-recycling_user}

read -sp "Enter database password: " DB_PASSWORD
echo ""

read -p "Drop existing database if exists? (y/n) [n]: " DROP_EXISTING
DROP_EXISTING=${DROP_EXISTING:-n}

echo ""
log_info "Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Drop existing: $DROP_EXISTING"
echo ""

read -p "Proceed? (y/n): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    exit 0
fi

# Drop existing database if requested
if [[ $DROP_EXISTING =~ ^[Yy]$ ]]; then
    log_info "Dropping existing database..."
    sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
EOF
    log_success "Existing database dropped!"
fi

# Create database and user
log_info "Creating database and user..."
sudo -u postgres psql <<EOF
-- Create user
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE $DB_NAME WITH OWNER $DB_USER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to database and grant schema privileges
\c $DB_NAME

GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

log_success "Database created successfully!"

# Optimize PostgreSQL configuration
log_info "Optimizing PostgreSQL configuration..."

# Backup original config
sudo cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup

# Calculate optimal settings based on available RAM
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
SHARED_BUFFERS=$((TOTAL_RAM * 256))MB
EFFECTIVE_CACHE=$((TOTAL_RAM * 512))MB

log_info "Detected ${TOTAL_RAM}GB RAM, configuring PostgreSQL..."

sudo -u postgres psql <<EOF
-- Performance tuning
ALTER SYSTEM SET shared_buffers = '${SHARED_BUFFERS}';
ALTER SYSTEM SET effective_cache_size = '${EFFECTIVE_CACHE}';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Connection settings
ALTER SYSTEM SET max_connections = 100;

-- Logging (for production troubleshooting)
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
EOF

# Restart PostgreSQL
log_info "Restarting PostgreSQL..."
sudo systemctl restart postgresql

log_success "PostgreSQL optimized and restarted!"

# Test connection
log_info "Testing database connection..."
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    log_success "Database connection successful!"
else
    log_error "Database connection failed!"
    exit 1
fi

# Save connection details
cat > ~/recycling-db-config.txt <<EOF
Database Configuration
=====================

Database Name: $DB_NAME
Username: $DB_USER
Password: $DB_PASSWORD
Host: localhost
Port: 5432

Connection String:
postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

Connection Test:
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME
EOF

chmod 600 ~/recycling-db-config.txt

echo ""
log_success "Database initialization complete!"
log_info "Connection details saved to: ~/recycling-db-config.txt"
log_info "Connection string: postgresql://$DB_USER:****@localhost:5432/$DB_NAME"
echo ""