# CIVICycle - Deployment and Installation Guide

Complete guide for deploying the CIVICycle Recycling Management System on a fresh VM or VPS.

## Table of Contents

- [Server Requirements](#server-requirements)
- [Architecture Overview](#architecture-overview)
- [Quick Start (Automated)](#quick-start-automated)
- [Step-by-Step Manual Installation](#step-by-step-manual-installation)
  - [1. System Preparation](#1-system-preparation)
  - [2. PostgreSQL Setup](#2-postgresql-setup)
  - [3. Application Installation](#3-application-installation)
  - [4. Backend Configuration](#4-backend-configuration)
  - [5. Frontend Configuration](#5-frontend-configuration)
  - [6. Database Initialization](#6-database-initialization)
  - [7. systemd Service Setup](#7-systemd-service-setup)
  - [8. Nginx Configuration](#8-nginx-configuration)
  - [9. SSL Certificate](#9-ssl-certificate)
  - [10. Firewall](#10-firewall)
- [Post-Installation Verification](#post-installation-verification)
- [Environment Variables Reference](#environment-variables-reference)
- [Maintenance and Operations](#maintenance-and-operations)
  - [Updating the Application](#updating-the-application)
  - [Database Migrations](#database-migrations)
  - [Backups](#backups)
  - [Log Management](#log-management)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)
- [Security Hardening](#security-hardening)
- [Multi-VM / Scaling Considerations](#multi-vm--scaling-considerations)

---

## Server Requirements

| Resource     | Minimum         | Recommended     |
|--------------|-----------------|-----------------|
| OS           | Ubuntu 20.04 LTS or Debian 11 | Ubuntu 22.04 LTS |
| CPU          | 1 core          | 2+ cores        |
| RAM          | 2 GB            | 4 GB            |
| Disk         | 20 GB           | 40 GB           |
| Network      | Public IP       | Public IP + domain |

### Software Prerequisites

The installation will set up:

- **Node.js 20.x** (LTS) - JavaScript runtime
- **PostgreSQL 14+** - Relational database
- **Nginx** - Reverse proxy and static file server
- **Git** - Source code management
- **Certbot** - SSL certificate management (optional)

### DNS Requirements

Before starting, create an A record pointing your domain to the server's public IP:

```
A    yourdomain.com    ->  YOUR_SERVER_IP
```

Allow 5-30 minutes for DNS propagation. You can verify with:

```bash
dig +short yourdomain.com
```

---

## Architecture Overview

```
                          Internet
                            |
                            | HTTPS (443) / HTTP (80)
                            v
                    +---------------+
                    |     Nginx     |
                    | - SSL termination
                    | - Static files (frontend/dist)
                    | - Reverse proxy for /api/*
                    +-------+-------+
                            |
              +-------------+-------------+
              |                           |
         /api/* proxy              /* static files
         port 5000
              v                           v
     +----------------+     +------------------------+
     |  Backend API   |     |   Frontend (Static)    |
     |  Node.js       |     |   React SPA            |
     |  Express       |     |   Vite build output    |
     |  systemd       |     |   PWA + offline        |
     +-------+--------+     +------------------------+
              |
              | TCP 5432
              v
     +----------------+
     |  PostgreSQL    |
     |  recycling_db  |
     |  systemd       |
     +----------------+
```

All three services (PostgreSQL, Backend API, Nginx) run on the same VM and are managed by systemd.

---

## Quick Start (Automated)

For a fully automated deployment on a fresh VM:

```bash
# 1. Clone the repository
git clone https://github.com/021650641/recycling-management-system.git
cd recycling-management-system/deployment

# 2. Make scripts executable
chmod +x *.sh

# 3. Run the automated deployment
./deploy.sh
```

The script interactively prompts for:
- Domain name
- Installation directory (default: `/var/www/recycling`)
- PostgreSQL credentials
- JWT secret
- API port (default: 5000)
- SSL certificate email

The script handles system updates, dependency installation, database creation, application builds, Nginx configuration, systemd service setup, SSL, and firewall configuration.

> **Note:** Do not run `deploy.sh` as root. Run as a regular user with sudo privileges.

---

## Step-by-Step Manual Installation

Use this approach when you need full control over each step, or when the automated script doesn't fit your environment.

### 1. System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx and other tools
sudo apt install -y nginx git curl build-essential certbot python3-certbot-nginx
```

### 2. PostgreSQL Setup

#### Option A: Use the interactive script

```bash
cd deployment
chmod +x init-database.sh
./init-database.sh
```

This creates the database, user, enables required extensions (`uuid-ossp`, `pg_trgm`), and tunes PostgreSQL for available RAM.

#### Option B: Manual setup

```bash
sudo -u postgres psql <<'EOF'
-- Create application user
CREATE USER recycling_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';

-- Create database owned by the app user
CREATE DATABASE recycling_db WITH OWNER recycling_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE recycling_db TO recycling_user;

-- Connect to the new database
\c recycling_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO recycling_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO recycling_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO recycling_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOF
```

#### Verify the connection

```bash
PGPASSWORD='YOUR_SECURE_PASSWORD' psql -h localhost -U recycling_user -d recycling_db -c "SELECT version();"
```

### 3. Application Installation

```bash
# Create installation directory
sudo mkdir -p /var/www/recycling
sudo chown -R $USER:$USER /var/www/recycling

# Clone repository
git clone https://github.com/021650641/recycling-management-system.git /var/www/recycling

# Navigate to installation
cd /var/www/recycling
```

### 4. Backend Configuration

#### Create the environment file

```bash
cat > /var/www/recycling/backend/.env << 'ENVEOF'
# Server
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1

# Database (individual variables - NOT a DATABASE_URL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recycling_db
DB_USER=recycling_user
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_MAX_CONNECTIONS=20

# Authentication
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_64_CHAR_STRING
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS (must match your domain exactly)
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info

# File uploads
MAX_FILE_SIZE=10485760

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (optional - configure for confirmation emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Encryption key for sensitive data (optional)
ENCRYPTION_KEY=
ENVEOF
```

**Important:** Generate a secure JWT secret:

```bash
openssl rand -base64 48
```

Replace `CHANGE_THIS_TO_A_RANDOM_64_CHAR_STRING` with the output.

#### Build the backend

```bash
cd /var/www/recycling/backend

# Install all dependencies (including dev dependencies for TypeScript compilation)
npm ci

# Compile TypeScript to JavaScript
npx tsc

# Verify the build
ls dist/server.js  # Should exist
```

> **Note:** The build step requires dev dependencies (TypeScript compiler). The compiled output in `dist/` is what runs in production.

#### Create required directories

```bash
mkdir -p /var/www/recycling/backend/uploads
mkdir -p /var/www/recycling/backend/logs
```

### 5. Frontend Configuration

```bash
cd /var/www/recycling/frontend

# Create frontend environment
cat > .env << 'ENVEOF'
VITE_API_URL=https://yourdomain.com/api
ENVEOF

# Install dependencies
npm ci

# Build the production bundle
npx vite build

# Verify the build
ls dist/index.html  # Should exist
ls -lh dist/assets/*.css  # CSS should be ~15-25 KB (not a few hundred bytes)
```

### 6. Database Initialization

Run all SQL migrations in order:

```bash
cd /var/www/recycling/backend

# Option A: Use the migration runner (recommended)
chmod +x migrations/run-migrations.sh
./migrations/run-migrations.sh

# Option B: Run migrations manually
sudo -u postgres psql -d recycling_db -f migrations/001_initial_schema.sql
sudo -u postgres psql -d recycling_db -f migrations/002_triggers_and_functions.sql
sudo -u postgres psql -d recycling_db -f migrations/003_views_and_reports.sql
sudo -u postgres psql -d recycling_db -f migrations/004_seed.sql
sudo -u postgres psql -d recycling_db -f migrations/005_apartment_units.sql
sudo -u postgres psql -d recycling_db -f migrations/006_fix_transaction_constraints.sql
sudo -u postgres psql -d recycling_db -f migrations/007_price_time_validity.sql
sudo -u postgres psql -d recycling_db -f migrations/008_add_encryption.sql
sudo -u postgres psql -d recycling_db -f migrations/009_delivery_details.sql
```

If running migrations manually with `sudo -u postgres`, grant permissions to the app user afterward:

```bash
sudo -u postgres psql -d recycling_db -c "
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO recycling_user;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO recycling_user;
"
```

The migration runner (`run-migrations.sh`) handles this automatically.

#### Seed initial data

Migration 004 seeds the database with:
- Default cooperative organization
- Default locations
- Material categories (Plastic, Cardboard, Glass, Metal, Paper, Organic, E-Waste)
- Default admin user

### 7. systemd Service Setup

```bash
# Copy the service file
sudo cp /var/www/recycling/deployment/recycling-api.service /etc/systemd/system/

# Edit to match your user and paths
sudo nano /etc/systemd/system/recycling-api.service
```

Key fields to verify/update in the service file:

| Field              | Default Value                            | Change To                    |
|--------------------|------------------------------------------|------------------------------|
| `User`             | `deploy`                                 | Your Linux username          |
| `Group`            | `deploy`                                 | Your Linux group             |
| `WorkingDirectory` | `/var/www/recycling/backend`             | Your installation path       |
| `EnvironmentFile`  | `/var/www/recycling/backend/.env`        | Your .env path               |

Also update the `ExecStartPre` lines to reference the correct paths and user.

```bash
# Optionally install the systemd target for grouped service management
sudo cp /var/www/recycling/deployment/recycling.target /etc/systemd/system/

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable recycling-api.service
sudo systemctl start recycling-api.service

# Verify it's running
sudo systemctl status recycling-api.service

# Test the health endpoint
curl http://localhost:5000/health
```

Expected health response:

```json
{"status":"healthy","timestamp":"...","uptime":5.123,"database":"connected"}
```

### 8. Nginx Configuration

```bash
# Copy the template
sudo cp /var/www/recycling/deployment/nginx.conf.template \
        /etc/nginx/sites-available/recycling

# Replace placeholders with actual values
sudo sed -i 's|{{DOMAIN_NAME}}|yourdomain.com|g' /etc/nginx/sites-available/recycling
sudo sed -i 's|{{INSTALL_DIR}}|/var/www/recycling|g' /etc/nginx/sites-available/recycling
sudo sed -i 's|{{API_PORT}}|5000|g' /etc/nginx/sites-available/recycling

# Enable the site
sudo ln -sf /etc/nginx/sites-available/recycling /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 9. SSL Certificate

```bash
# Install SSL with Let's Encrypt (requires domain pointed at this server)
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email you@email.com --redirect

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify auto-renewal works
sudo certbot renew --dry-run
```

### 10. Firewall

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw --force enable
sudo ufw status
```

---

## Post-Installation Verification

Run through this checklist after installation:

```bash
# 1. All services running
sudo systemctl status postgresql      # Active
sudo systemctl status recycling-api   # Active
sudo systemctl status nginx           # Active

# 2. Health check
curl -s https://yourdomain.com/health | python3 -m json.tool

# 3. API accessible
curl -s https://yourdomain.com/api/v1/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@recycling.coop","password":"admin123"}'

# 4. Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/
# Should return 200

# 5. CSS compiled correctly (should be 15+ KB, not a few hundred bytes)
ls -lh /var/www/recycling/frontend/dist/assets/*.css
```

### Default Login Credentials

| Role     | Email                      | Password    |
|----------|----------------------------|-------------|
| Admin    | admin@recycling.coop       | admin123    |
| Manager  | manager@recycling.coop     | manager123  |
| Operator | operator@recycling.coop    | operator123 |

**Change these passwords immediately after first login.**

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable                  | Required | Default               | Description                           |
|---------------------------|----------|-----------------------|---------------------------------------|
| `NODE_ENV`                | Yes      | `development`         | `production` for deployed instances   |
| `PORT`                    | Yes      | `3001`                | API server port (use `5000` in prod)  |
| `API_PREFIX`              | No       | `/api/v1`             | API URL prefix                        |
| `DB_HOST`                 | Yes      | `localhost`           | PostgreSQL host                       |
| `DB_PORT`                 | Yes      | `5432`                | PostgreSQL port                       |
| `DB_NAME`                 | Yes      | `recycling_db`        | Database name                         |
| `DB_USER`                 | Yes      | `recycling_user`      | Database user                         |
| `DB_PASSWORD`             | Yes      | (empty)               | Database password                     |
| `DB_MAX_CONNECTIONS`      | No       | `20`                  | Connection pool size                  |
| `JWT_SECRET`              | Yes      | (insecure default)    | Min 32 chars, use `openssl rand -base64 48` |
| `JWT_EXPIRES_IN`          | No       | `7d`                  | Token expiry (e.g., `7d`, `24h`)     |
| `JWT_REFRESH_EXPIRES_IN`  | No       | `30d`                 | Refresh token expiry                  |
| `CORS_ORIGIN`             | Yes      | `http://localhost:3000` | Frontend URL (exact match)           |
| `LOG_LEVEL`               | No       | `info`                | `error`, `warn`, `info`, or `debug`  |
| `MAX_FILE_SIZE`           | No       | `10485760`            | Max upload size in bytes (10 MB)      |
| `RATE_LIMIT_WINDOW_MS`    | No       | `900000`              | Rate limit window (15 min)            |
| `RATE_LIMIT_MAX_REQUESTS` | No       | `100`                 | Max requests per window               |
| `SMTP_HOST`               | No       | (empty)               | SMTP server for emails                |
| `SMTP_PORT`               | No       | `587`                 | SMTP port                             |
| `SMTP_USER`               | No       | (empty)               | SMTP username                         |
| `SMTP_PASSWORD`           | No       | (empty)               | SMTP password                         |
| `SMTP_FROM`               | No       | (empty)               | Sender email address                  |
| `ENCRYPTION_KEY`          | No       | (empty)               | Base64 encryption key for sensitive data |

> **Important:** The backend reads individual `DB_*` variables, not a `DATABASE_URL` connection string.

### Frontend (`frontend/.env`)

| Variable        | Required | Default                         | Description              |
|-----------------|----------|---------------------------------|--------------------------|
| `VITE_API_URL`  | Yes      | `http://localhost:3001/api/v1`  | Backend API base URL     |

In production, set to `https://yourdomain.com/api` (Nginx proxies `/api` to the backend).

---

## Maintenance and Operations

### Updating the Application

#### Option A: Automated update

```bash
cd /var/www/recycling/deployment
./update.sh
```

This script:
1. Creates a backup (unless `--skip-backup`)
2. Pulls latest code from `origin/main`
3. Rebuilds backend (npm install + TypeScript compile)
4. Rebuilds frontend (npm install + Vite build)
5. Runs pending database migrations
6. Restarts the systemd service
7. Verifies the health check

#### Option B: Manual update

```bash
cd /var/www/recycling

# Pull latest code
git pull origin main

# Rebuild backend
cd backend
npm ci
npx tsc

# Run migrations
chmod +x migrations/run-migrations.sh
./migrations/run-migrations.sh

# Rebuild frontend
cd ../frontend
npm ci
npx vite build

# Restart service
sudo systemctl restart recycling-api.service

# Verify
curl http://localhost:5000/health
```

### Database Migrations

The project includes a migration runner at `backend/migrations/run-migrations.sh` that:

- Reads database credentials from `backend/.env`
- Falls back to `sudo -u postgres` peer auth if no password is set
- Creates a `schema_migrations` tracking table
- Applies only unapplied migrations in numeric order (001, 002, ..., 009)
- Grants table permissions to the app user when run as postgres superuser

**Run migrations:**

```bash
cd /var/www/recycling/backend
./migrations/run-migrations.sh
```

**Check which migrations have been applied:**

```bash
sudo -u postgres psql -d recycling_db -c "SELECT * FROM schema_migrations ORDER BY applied_at;"
```

### Backups

#### Create a backup

```bash
cd /var/www/recycling/deployment
./backup.sh                    # Full backup (database + files)
./backup.sh --db-only          # Database only
./backup.sh --files-only       # Application files only
./backup.sh --retention 30     # Keep backups for 30 days
./backup.sh --output /mnt/ext  # Custom backup directory
```

Backups are stored in `~/backups/recycling/` by default and include:
- Compressed database dump (`db_YYYYMMDD_HHMMSS.sql.gz`)
- Schema-only dump for reference (`schema_YYYYMMDD_HHMMSS.sql`)
- Application files (`app_YYYYMMDD_HHMMSS.tar.gz`)
- Optionally encrypted `.env` files
- Manifest file with restoration instructions

#### Restore from backup

```bash
# Restore database
gunzip -c ~/backups/recycling/db_20260212_020000.sql.gz | sudo -u postgres psql recycling_db

# Restore application files
tar -xzf ~/backups/recycling/app_20260212_020000.tar.gz -C /var/www/
```

#### Schedule automatic backups

```bash
# Add to crontab - daily at 2:00 AM
crontab -e
# Add this line:
0 2 * * * /var/www/recycling/deployment/backup.sh --db-only >> /var/log/recycling-backup.log 2>&1
```

### Log Management

**View live backend logs:**

```bash
sudo journalctl -u recycling-api -f
```

**View last 100 lines:**

```bash
sudo journalctl -u recycling-api --no-pager -n 100
```

**View logs from a specific time range:**

```bash
sudo journalctl -u recycling-api --since "2026-02-12 08:00" --until "2026-02-12 12:00"
```

**Nginx logs:**

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**Application-level logs** are written to `backend/logs/` via Winston.

---

## Troubleshooting

### Backend service won't start

```bash
# Check service logs
sudo journalctl -u recycling-api --no-pager -n 50

# Common causes:
# 1. Port already in use
sudo lsof -i :5000

# 2. Missing .env file
ls -la /var/www/recycling/backend/.env

# 3. TypeScript not compiled
ls /var/www/recycling/backend/dist/server.js

# 4. Database not reachable
PGPASSWORD=yourpass psql -h localhost -U recycling_user -d recycling_db -c "SELECT 1;"
```

### 502 Bad Gateway from Nginx

The backend is not responding. Check:

```bash
# Is the service running?
sudo systemctl status recycling-api

# Is it listening on the configured port?
curl http://localhost:5000/health

# Restart if needed
sudo systemctl restart recycling-api
```

### Database permission errors (500 on specific endpoints)

If migrations were run via `sudo -u postgres`, the app user may lack permissions on the new tables:

```bash
sudo -u postgres psql -d recycling_db -c "
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO recycling_user;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO recycling_user;
"
sudo systemctl restart recycling-api
```

### Frontend loads but has no styling

The Tailwind CSS build may have failed:

```bash
cd /var/www/recycling/frontend
ls -lh dist/assets/*.css
# If CSS file is < 1 KB, rebuild:
npm ci
npx vite build
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Manual renewal
sudo certbot renew

# Verify auto-renewal timer
sudo systemctl status certbot.timer
```

### Connection refused on port 5432

PostgreSQL may not be running or not accepting connections:

```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Check pg_hba.conf allows local connections
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

---

## Rollback Procedures

### Rollback to previous code version

```bash
cd /var/www/recycling

# See recent commits
git log --oneline -10

# Roll back one commit
git revert HEAD

# Or reset to a specific commit
git checkout <commit-hash> -- .

# Rebuild
cd backend && npm ci && npx tsc
cd ../frontend && npm ci && npx vite build
sudo systemctl restart recycling-api
```

### Rollback database migration

Database migrations use `IF NOT EXISTS` / `IF EXISTS` guards and are additive. To roll back, manually reverse the changes:

```bash
# Example: remove delivery columns added by migration 009
sudo -u postgres psql -d recycling_db <<'SQL'
ALTER TABLE sale DROP COLUMN IF EXISTS delivery_person_id;
ALTER TABLE sale DROP COLUMN IF EXISTS delivery_vehicle_id;
ALTER TABLE sale DROP COLUMN IF EXISTS delivery_notes;
DROP TABLE IF EXISTS delivery_vehicle;
DROP TABLE IF EXISTS delivery_person;
DELETE FROM schema_migrations WHERE filename = '009_delivery_details.sql';
SQL
```

### Full rollback from backup

```bash
# Stop services
sudo systemctl stop recycling-api

# Restore database
gunzip -c ~/backups/recycling/db_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql recycling_db

# Restore files
tar -xzf ~/backups/recycling/app_YYYYMMDD_HHMMSS.tar.gz -C /var/www/

# Rebuild and restart
cd /var/www/recycling/backend && npm ci && npx tsc
sudo systemctl start recycling-api
```

---

## Security Hardening

### Immediate post-installation

1. **Change default admin password** - Login and change via the profile menu
2. **Set a strong JWT secret** - At least 48 random bytes
3. **Restrict CORS origin** - Set `CORS_ORIGIN` to your exact domain
4. **Disable SSH password auth** - Use SSH keys only

### systemd security features (already configured)

The `recycling-api.service` includes:

- `NoNewPrivileges=true` - Prevents privilege escalation
- `ProtectSystem=full` - Read-only access to `/usr`, `/boot`, `/etc`
- `ProtectHome=true` - No access to home directories
- `PrivateTmp=true` - Isolated temporary directory
- `MemoryMax=512M` - Memory limit prevents runaway processes
- `TasksMax=256` - Limits spawned processes

### PostgreSQL

```bash
# Ensure PostgreSQL only listens on localhost
sudo grep listen_addresses /etc/postgresql/*/main/postgresql.conf
# Should show: listen_addresses = 'localhost'
```

### Automatic security updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Rotate JWT secret

When rotating the JWT secret, all existing user sessions are invalidated:

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 48)

# Update .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" /var/www/recycling/backend/.env

# Restart service
sudo systemctl restart recycling-api
```

---

## Multi-VM / Scaling Considerations

The default deployment runs all services on a single VM. For higher availability or load:

### Separate database server

1. Install PostgreSQL on a dedicated VM
2. Update `pg_hba.conf` to allow connections from the app server's IP
3. Update `postgresql.conf`: `listen_addresses = '*'`
4. In the backend `.env`, set `DB_HOST` to the database server's IP
5. Ensure the firewall allows port 5432 only from the app server

### Multiple application servers

1. Deploy the backend on multiple VMs behind a load balancer
2. All instances must share the same `JWT_SECRET` and point to the same database
3. File uploads (`backend/uploads/`) should use shared storage (NFS or S3)
4. Use a load balancer (e.g., Nginx, HAProxy, or cloud LB) for traffic distribution

### Docker deployment (alternative)

A `docker-compose.yml` is provided for containerized deployments:

```bash
cd /var/www/recycling
docker compose up -d
```

This starts PostgreSQL, backend, and frontend containers with an Nginx reverse proxy.

---

## Deployment Scripts Reference

| Script              | Purpose                                        | Usage                              |
|---------------------|------------------------------------------------|------------------------------------|
| `deploy.sh`         | Full automated first-time deployment           | `./deploy.sh`                      |
| `update.sh`         | Pull updates, rebuild, restart services        | `./update.sh [--skip-backup] [--force]` |
| `backup.sh`         | Database and file backups with rotation        | `./backup.sh [--db-only] [--retention N]` |
| `configure-env.sh`  | Interactive .env file creation                 | `./configure-env.sh`               |
| `init-database.sh`  | PostgreSQL database and user setup             | `./init-database.sh`               |
| `run-migrations.sh` | Apply pending SQL migrations (in `backend/migrations/`) | `./migrations/run-migrations.sh` |

---

## File Layout on a Deployed Server

```
/var/www/recycling/                    # Installation root
|-- backend/
|   |-- .env                           # Backend environment (secrets)
|   |-- dist/                          # Compiled JavaScript (production)
|   |   +-- server.js                  # Entry point
|   |-- migrations/                    # SQL migration files
|   |   +-- run-migrations.sh          # Migration runner
|   |-- node_modules/                  # Dependencies
|   |-- uploads/                       # User uploads
|   +-- logs/                          # Application logs
|-- frontend/
|   |-- .env                           # Frontend environment
|   +-- dist/                          # Built static files (served by Nginx)
|       |-- index.html
|       +-- assets/
|-- deployment/                        # Deployment scripts
+-- .git/                              # Git repository

/etc/systemd/system/
|-- recycling-api.service              # Backend service unit
+-- recycling.target                   # Service group target

/etc/nginx/sites-available/
+-- recycling                          # Nginx site config

~/backups/recycling/                   # Backup storage
```
