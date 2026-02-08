# Deployment Guide - Recycling Management System

## Quick Start with Docker

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space

### 1. Clone and Configure

```bash
git clone <repository-url>
cd recycling-app

# Create environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your settings
nano backend/.env
```

### 2. Start All Services

```bash
# Start database, backend, and frontend
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed initial data
docker-compose exec postgres psql -U recycling_user -d recycling_db -f /docker-entrypoint-initdb.d/seed.sql
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Health Check: http://localhost:3001/health

**Default Admin Credentials:**
- Email: admin@greenrecycle.org
- Password: admin123 (CHANGE IMMEDIATELY)

---

## Manual Deployment

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Run migrations
npm run migrate

# Seed database
psql -U recycling_user -d recycling_db -f migrations/seed.sql

# Start server
npm run dev  # Development
npm run build && npm start  # Production
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL
echo "REACT_APP_API_URL=http://localhost:3001/api/v1" > .env

# Start development server
npm start

# Build for production
npm run build
```

---

## Production Deployment

### 1. Server Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB SSD
- Ubuntu 20.04+ or Debian 11+

**Recommended:**
- 4 CPU cores
- 8GB RAM
- 50GB SSD
- Ubuntu 22.04 LTS

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Configure Environment

```bash
# Create production environment file
cat > backend/.env << EOF
NODE_ENV=production
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=recycling_db
DB_USER=recycling_user
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
CORS_ORIGIN=https://yourdomain.com
EOF
```

### 4. Setup SSL (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

### 5. Start Production Services

```bash
# Start with nginx reverse proxy
docker-compose --profile production up -d

# Enable auto-start on boot
sudo systemctl enable docker
```

### 6. Setup Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-recycling.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/var/backups/recycling
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U recycling_user recycling_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep last 30 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-recycling.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-recycling.sh") | crontab -
```

---

## Database Migrations

### Create New Migration

```bash
cd backend
npm run migrate:create <migration-name>
```

### Run Migrations

```bash
# Up (apply)
npm run migrate

# Down (rollback)
npm run migrate:down
```

---

## Monitoring & Maintenance

### Check Application Health

```bash
# Check all services
docker-compose ps

# Check backend health
curl http://localhost:3001/health

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Database Maintenance

```bash
# Connect to database
docker-compose exec postgres psql -U recycling_user -d recycling_db

# Vacuum database
docker-compose exec postgres psql -U recycling_user -d recycling_db -c "VACUUM ANALYZE;"

# Refresh materialized views
docker-compose exec postgres psql -U recycling_user -d recycling_db -c "SELECT refresh_reporting_views();"
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose build

# Restart services
docker-compose down
docker-compose up -d

# Run new migrations
docker-compose exec backend npm run migrate
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U recycling_user

# View PostgreSQL logs
docker-compose logs postgres
```

### Backend Not Starting

```bash
# Check environment variables
docker-compose exec backend env

# View backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Limit PostgreSQL memory
# Add to docker-compose.yml under postgres service:
# mem_limit: 2g
```

---

## Security Best Practices

1. **Change Default Passwords**: Update all default credentials immediately
2. **Use Strong JWT Secret**: Generate with `openssl rand -base64 64`
3. **Enable HTTPS**: Always use SSL in production
4. **Firewall**: Only expose ports 80 and 443
5. **Regular Updates**: Keep system and Docker images updated
6. **Backup Database**: Daily automated backups
7. **Monitor Logs**: Check logs regularly for suspicious activity
8. **Rate Limiting**: Already configured in the backend
9. **Input Validation**: Implemented in all API endpoints
10. **SQL Injection Protection**: Using parameterized queries

---

## Performance Optimization

### PostgreSQL Tuning

Edit `docker-compose.yml` postgres command:

```yaml
command: >
  -c shared_buffers=256MB
  -c effective_cache_size=1GB
  -c maintenance_work_mem=128MB
  -c checkpoint_completion_target=0.9
  -c wal_buffers=16MB
  -c default_statistics_target=100
  -c random_page_cost=1.1
  -c effective_io_concurrency=200
  -c work_mem=4MB
  -c min_wal_size=1GB
  -c max_wal_size=4GB
```

### Backend Optimization

- Enable compression (already configured)
- Use connection pooling (configured for 20 connections)
- Cache static responses
- Implement Redis for session storage (optional)

### Refresh Materialized Views

Schedule regular refreshes for better report performance:

```bash
# Add to crontab
0 */6 * * * docker-compose exec -T postgres psql -U recycling_user -d recycling_db -c "SELECT refresh_reporting_views();"
```

---

## Scaling

### Horizontal Scaling (Multiple Backend Instances)

```yaml
# In docker-compose.yml
backend:
  # ... existing config
  deploy:
    replicas: 3
```

### Load Balancer

Use nginx reverse proxy (already configured) or add external load balancer.

### Database Replication

Set up PostgreSQL streaming replication for read replicas.

---

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- GitHub Issues: <repository-url>/issues
- Email: support@yourdomain.com
