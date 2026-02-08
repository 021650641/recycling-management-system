# VPS Deployment Guide

Complete guide for deploying the Recycling Management System on a dedicated VPS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB
- **CPU**: 2+ cores recommended
- **Domain**: A domain name pointing to your server's IP

### Required Software

The deployment script will install these automatically:
- Node.js 18.x
- PostgreSQL 14+
- Nginx
- PM2
- Git
- Certbot (for SSL)

### DNS Configuration

Before deployment, point your domain to your VPS:

```
A Record: yourdomain.com → YOUR_SERVER_IP
```

Wait for DNS propagation (5-30 minutes).

## Quick Start

### One-Command Deployment

```bash
# Clone repository
git clone https://github.com/021650641/recycling-management-system.git
cd recycling-management-system/deployment

# Make scripts executable
chmod +x *.sh

# Run automated deployment
./deploy.sh
```

The script will prompt you for:
- Domain name
- Database credentials
- JWT secret
- SSL certificate email

**Deployment time**: 10-15 minutes

### What Gets Installed

1. ✓ System updates and dependencies
2. ✓ PostgreSQL database with optimized configuration
3. ✓ Node.js backend API
4. ✓ React frontend (built)
5. ✓ Nginx web server
6. ✓ SSL certificate (Let's Encrypt)
7. ✓ PM2 process manager
8. ✓ Firewall configuration
9. ✓ Automated backup cron job

## Manual Installation

If you prefer step-by-step control:

### 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install other tools
sudo apt install -y git curl ufw certbot python3-certbot-nginx
```

### 2. Database Setup

```bash
# Run database initialization script
./init-database.sh
```

Or manually:

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE recycling_db;
CREATE USER recycling_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE recycling_db TO recycling_user;
EOF
```

### 3. Clone and Configure

```bash
# Clone repository
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/021650641/recycling-management-system.git recycling
sudo chown -R $USER:$USER recycling

# Configure environment
cd recycling/deployment
./configure-env.sh
```

### 4. Build Backend

```bash
cd /var/www/recycling/backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run migrations
npm run migrate
```

### 5. Build Frontend

```bash
cd /var/www/recycling/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 6. Configure Nginx

```bash
# Copy nginx configuration
sudo cp /var/www/recycling/deployment/nginx.conf.template /etc/nginx/sites-available/recycling-app

# Edit with your domain
sudo nano /etc/nginx/sites-available/recycling-app

# Enable site
sudo ln -s /etc/nginx/sites-available/recycling-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Start Backend with PM2

```bash
cd /var/www/recycling/backend
pm2 start dist/server.js --name recycling-api
pm2 save
pm2 startup
```

### 8. Configure SSL

```bash
sudo certbot --nginx -d yourdomain.com
```

### 9. Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Configuration

### Environment Variables

**Backend** (`backend/.env`):
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/recycling_db
JWT_SECRET=your_secret_here
CORS_ORIGIN=https://yourdomain.com
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=https://yourdomain.com/api
VITE_ENV=production
```

### Database Connection

Test connection:
```bash
PGPASSWORD=your_password psql -h localhost -U recycling_user -d recycling_db
```

### PM2 Configuration

The `ecosystem.config.js` file configures:
- Cluster mode (uses all CPU cores)
- Auto-restart on crash
- Memory limit (500MB)
- Log rotation

View configuration:
```bash
pm2 ecosystem
```

## Maintenance

### Management Scripts

All scripts are in `/var/www/recycling/deployment/`:

#### Update Application

```bash
./update.sh
```

Options:
- `--skip-backup` - Skip automatic backup
- `--force` - Force update with local changes

#### Backup

```bash
./backup.sh
```

Options:
- `--db-only` - Backup database only
- `--files-only` - Backup files only
- `--retention 30` - Keep backups for 30 days
- `--output /path` - Custom backup directory

#### Reconfigure Environment

```bash
./configure-env.sh
```

### Daily Operations

**View logs:**
```bash
pm2 logs recycling-api
```

**Restart backend:**
```bash
pm2 restart recycling-api
```

**Check status:**
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

**Monitor resources:**
```bash
pm2 monit
```

### Automated Backups

Backups run daily at 2:00 AM (configured in cron):

```bash
# View backup schedule
crontab -l

# Manual backup
/var/www/recycling/backup.sh

# View recent backups
ls -lh ~/backups/recycling/
```

### Database Maintenance

**Vacuum database:**
```bash
sudo -u postgres psql recycling_db -c "VACUUM ANALYZE;"
```

**Check database size:**
```bash
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('recycling_db'));"
```

**Backup database manually:**
```bash
sudo -u postgres pg_dump recycling_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Restore database:**
```bash
gunzip -c backup.sql.gz | sudo -u postgres psql recycling_db
```

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs recycling-api --lines 50

# Check if port is in use
sudo lsof -i :5000

# Restart
pm2 restart recycling-api
```

### Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep recycling

# Test connection
PGPASSWORD=your_pass psql -h localhost -U recycling_user -d recycling_db
```

### Nginx Errors

```bash
# Check configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --dry-run

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

### High Memory Usage

```bash
# Check PM2 processes
pm2 list

# Restart with memory limit
pm2 restart recycling-api --max-memory-restart 300M

# Monitor memory
pm2 monit
```

### Frontend Not Loading

```bash
# Check if files exist
ls -lh /var/www/recycling/frontend/dist/

# Rebuild frontend
cd /var/www/recycling/frontend
npm run build

# Check Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Slow Performance

```bash
# Check system resources
htop

# Check PostgreSQL performance
sudo -u postgres psql recycling_db -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Restart services
pm2 restart recycling-api
sudo systemctl restart postgresql
```

## Security

### Best Practices

1. **Change default admin password immediately** after first login
2. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Enable automatic security updates:**
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

4. **Rotate JWT secret periodically:**
   ```bash
   cd /var/www/recycling/deployment
   ./configure-env.sh
   ```

5. **Monitor logs regularly:**
   ```bash
   pm2 logs recycling-api
   sudo tail -f /var/log/nginx/access.log
   ```

### Firewall Configuration

```bash
# Check firewall status
sudo ufw status

# Allow specific IP only (optional)
sudo ufw allow from YOUR_IP to any port 22

# Block all other SSH
sudo ufw deny 22/tcp
```

### SSL Certificate Renewal

Auto-renewal is configured. To test:

```bash
sudo certbot renew --dry-run
```

Check renewal timer:
```bash
sudo systemctl status certbot.timer
```

### Database Security

```bash
# Restrict PostgreSQL to localhost
sudo nano /etc/postgresql/*/main/postgresql.conf
# Set: listen_addresses = 'localhost'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Backup Encryption

Encrypt sensitive backups:

```bash
./backup.sh
# Enter encryption password when prompted
```

Decrypt:
```bash
gpg --decrypt backup_file.tar.gz.gpg | tar -xz
```

## Monitoring

### Health Checks

**API Health:**
```bash
curl https://yourdomain.com/api/health
```

**PM2 Status:**
```bash
pm2 status
pm2 monit
```

**System Resources:**
```bash
free -h
df -h
top
```

### Log Locations

- **Application Logs:** `pm2 logs recycling-api`
- **Nginx Access:** `/var/log/nginx/access.log`
- **Nginx Error:** `/var/log/nginx/error.log`
- **PostgreSQL:** `/var/log/postgresql/`
- **Backup Logs:** `/var/www/recycling/logs/backup.log`

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# PostgreSQL queries
sudo -u postgres psql recycling_db -c "
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start DESC;
"
```

## Default Credentials

After deployment, login with:

- **Email:** admin@example.com
- **Password:** admin123

⚠️ **IMPORTANT:** Change these immediately after first login!

## Useful Commands

```bash
# View full status
/var/www/recycling/status.sh

# Update application
/var/www/recycling/update.sh

# Create backup
/var/www/recycling/backup.sh

# View deployment info
cat /var/www/recycling/DEPLOYMENT_INFO.txt

# Restart everything
pm2 restart recycling-api
sudo systemctl restart nginx
```

## Support

For issues or questions:

- **Repository:** https://github.com/021650641/recycling-management-system
- **Issues:** https://github.com/021650641/recycling-management-system/issues

## License

See LICENSE file in repository.