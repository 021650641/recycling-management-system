#!/bin/bash

#######################################
# Recycling Management System Deployment Script
# Automated VPS deployment for Ubuntu/Debian
#######################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log functions
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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root. Run as a regular user with sudo privileges."
   exit 1
fi

# Check for sudo privileges
if ! sudo -n true 2>/dev/null; then
    log_error "This script requires sudo privileges. Please run with a user that has sudo access."
    exit 1
fi

log_info "========================================"
log_info "Recycling Management System Deployment"
log_info "========================================"
echo ""

# Interactive prompts
read -p "Enter your domain name (e.g., recycling.example.com): " DOMAIN_NAME
read -p "Enter installation directory [/var/www/recycling]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/var/www/recycling}

read -p "Enter PostgreSQL database name [recycling_db]: " DB_NAME
DB_NAME=${DB_NAME:-recycling_db}

read -p "Enter PostgreSQL username [recycling_user]: " DB_USER
DB_USER=${DB_USER:-recycling_user}

read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""

read -sp "Enter JWT secret (min 32 characters): " JWT_SECRET
echo ""

if [ ${#JWT_SECRET} -lt 32 ]; then
    log_warning "JWT secret too short. Generating secure random secret..."
    JWT_SECRET=$(openssl rand -base64 48)
fi

read -p "Enter backend API port [5000]: " API_PORT
API_PORT=${API_PORT:-5000}

read -p "Install SSL certificate with Let's Encrypt? (y/n) [y]: " INSTALL_SSL
INSTALL_SSL=${INSTALL_SSL:-y}

read -p "Enter email for SSL certificate (required for Let's Encrypt): " SSL_EMAIL

echo ""
log_info "Configuration Summary:"
echo "  Domain: $DOMAIN_NAME"
echo "  Install Directory: $INSTALL_DIR"
echo "  Database: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  API Port: $API_PORT"
echo "  SSL: $INSTALL_SSL"
echo ""
read -p "Proceed with installation? (y/n): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    log_info "Installation cancelled."
    exit 0
fi

#######################################
# 1. System Update & Dependencies
#######################################
log_info "Step 1: Updating system and installing dependencies..."

sudo apt update
sudo apt upgrade -y

log_info "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

log_info "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

log_info "Installing Nginx..."
sudo apt install -y nginx

log_info "Installing additional tools..."
sudo apt install -y git curl wget ufw certbot python3-certbot-nginx

log_info "Installing PM2 globally..."
sudo npm install -g pm2

log_success "Dependencies installed successfully!"

#######################################
# 2. PostgreSQL Setup
#######################################
log_info "Step 2: Setting up PostgreSQL database..."

sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

log_success "PostgreSQL database created!"

#######################################
# 3. Clone Repository
#######################################
log_info "Step 3: Cloning application repository..."

sudo mkdir -p $(dirname $INSTALL_DIR)
sudo git clone https://github.com/021650641/recycling-management-system.git $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR

log_success "Repository cloned!"

#######################################
# 4. Backend Setup
#######################################
log_info "Step 4: Setting up backend..."

cd $INSTALL_DIR/backend

log_info "Installing backend dependencies..."
npm install

log_info "Creating backend .env file..."
cat > .env <<EOF
NODE_ENV=production
PORT=$API_PORT
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
JWT_SECRET=$JWT_SECRET
CORS_ORIGIN=https://$DOMAIN_NAME
LOG_LEVEL=info
EOF

log_info "Running database migrations..."
if [ -f "migrations/run-migrations.sh" ]; then
    chmod +x migrations/run-migrations.sh
    ./migrations/run-migrations.sh
else
    npm run migrate 2>/dev/null || log_warning "No migration script found, skipping..."
fi

log_info "Building backend..."
npm run build

log_info "Setting up PM2 for backend..."
pm2 delete recycling-api 2>/dev/null || true
pm2 start dist/server.js --name recycling-api --time
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

log_success "Backend setup complete!"

#######################################
# 5. Frontend Setup
#######################################
log_info "Step 5: Setting up frontend..."

cd $INSTALL_DIR/frontend

log_info "Installing frontend dependencies..."
npm install

log_info "Creating frontend .env file..."
cat > .env <<EOF
VITE_API_URL=https://$DOMAIN_NAME/api
VITE_ENV=production
EOF

log_info "Building frontend..."
npm run build

log_success "Frontend built successfully!"

#######################################
# 6. Nginx Configuration
#######################################
log_info "Step 6: Configuring Nginx..."

sudo tee /etc/nginx/sites-available/recycling-app > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    root $INSTALL_DIR/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # API proxy
    location /api {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/recycling-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl restart nginx

log_success "Nginx configured!"

#######################################
# 7. Firewall Configuration
#######################################
log_info "Step 7: Configuring firewall..."

sudo ufw --force enable
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

log_success "Firewall configured!"

#######################################
# 8. SSL Certificate
#######################################
if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
    log_info "Step 8: Installing SSL certificate..."
    
    if [ -z "$SSL_EMAIL" ]; then
        log_warning "No email provided. Skipping SSL installation."
    else
        sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $SSL_EMAIL --redirect
        log_success "SSL certificate installed!"
        
        # Setup auto-renewal
        sudo systemctl enable certbot.timer
        sudo systemctl start certbot.timer
        log_success "SSL auto-renewal configured!"
    fi
else
    log_warning "Skipping SSL installation. You can install it later with: sudo certbot --nginx -d $DOMAIN_NAME"
fi

#######################################
# 9. Create Management Scripts
#######################################
log_info "Step 9: Creating management scripts..."

# Create update script
cat > $INSTALL_DIR/update.sh <<'EOFSCRIPT'
#!/bin/bash
set -e

INSTALL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Updating Recycling Management System..."

cd $INSTALL_DIR
git pull

echo "Updating backend..."
cd backend
npm install
npm run build
pm2 restart recycling-api

echo "Updating frontend..."
cd ../frontend
npm install
npm run build

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Update complete!"
pm2 logs recycling-api --lines 20
EOFSCRIPT

chmod +x $INSTALL_DIR/update.sh

# Create backup script
cat > $INSTALL_DIR/backup.sh <<EOFSCRIPT
#!/bin/bash
set -e

BACKUP_DIR="\$HOME/backups/recycling"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

echo "Creating backup..."

# Database backup
sudo -u postgres pg_dump $DB_NAME | gzip > \$BACKUP_DIR/db_\$DATE.sql.gz

# Application backup
tar -czf \$BACKUP_DIR/app_\$DATE.tar.gz -C $INSTALL_DIR .

# Keep only last 7 backups
ls -t \$BACKUP_DIR/db_*.sql.gz | tail -n +8 | xargs -r rm
ls -t \$BACKUP_DIR/app_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup completed: \$BACKUP_DIR"
ls -lh \$BACKUP_DIR | tail -5
EOFSCRIPT

chmod +x $INSTALL_DIR/backup.sh

# Create status script
cat > $INSTALL_DIR/status.sh <<EOFSCRIPT
#!/bin/bash

echo "===== Recycling Management System Status ====="
echo ""
echo "Backend API:"
pm2 status recycling-api
echo ""
echo "Recent Logs:"
pm2 logs recycling-api --lines 10 --nostream
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "Database Status:"
sudo -u postgres psql -c "SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE datname='$DB_NAME';"
echo ""
echo "Disk Usage:"
df -h $INSTALL_DIR
EOFSCRIPT

chmod +x $INSTALL_DIR/status.sh

log_success "Management scripts created!"

#######################################
# 10. Setup Cron Jobs
#######################################
log_info "Step 10: Setting up automated tasks..."

# Add backup cron job (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh >> $INSTALL_DIR/logs/backup.log 2>&1") | crontab -

mkdir -p $INSTALL_DIR/logs

log_success "Automated backup scheduled!"

#######################################
# Final Steps
#######################################
log_info "Performing final checks..."

# Test API
sleep 3
if curl -f http://localhost:$API_PORT/api/health > /dev/null 2>&1; then
    log_success "Backend API is responding!"
else
    log_warning "Backend API health check failed. Check logs with: pm2 logs recycling-api"
fi

# Create deployment info file
cat > $INSTALL_DIR/DEPLOYMENT_INFO.txt <<EOF
Recycling Management System - Deployment Information
====================================================

Deployed: $(date)
Domain: $DOMAIN_NAME
Installation Directory: $INSTALL_DIR

Database:
  Name: $DB_NAME
  User: $DB_USER
  
API:
  Port: $API_PORT
  URL: https://$DOMAIN_NAME/api

Management Commands:
  Status: $INSTALL_DIR/status.sh
  Update: $INSTALL_DIR/update.sh
  Backup: $INSTALL_DIR/backup.sh
  
  PM2 Commands:
    - pm2 status
    - pm2 logs recycling-api
    - pm2 restart recycling-api
    
  Nginx Commands:
    - sudo systemctl status nginx
    - sudo systemctl restart nginx
    - sudo nginx -t
    
Default Admin Credentials:
  Email: admin@example.com
  Password: admin123
  
  ⚠️  IMPORTANT: Change the default admin password immediately after first login!

Application URLs:
  Frontend: https://$DOMAIN_NAME
  API: https://$DOMAIN_NAME/api
  Health Check: https://$DOMAIN_NAME/api/health

Logs Location:
  Application: pm2 logs recycling-api
  Nginx Access: /var/log/nginx/access.log
  Nginx Error: /var/log/nginx/error.log
  Backup Logs: $INSTALL_DIR/logs/backup.log

Backup Location: $HOME/backups/recycling
Backup Schedule: Daily at 2:00 AM

SSL Certificate: $([ "$INSTALL_SSL" = "y" ] && echo "Installed (Let's Encrypt)" || echo "Not installed")
Auto-renewal: $([ "$INSTALL_SSL" = "y" ] && echo "Enabled" || echo "N/A")
EOF

echo ""
echo ""
log_success "========================================"
log_success "   DEPLOYMENT COMPLETED SUCCESSFULLY!   "
log_success "========================================"
echo ""
log_info "Deployment Information:"
cat $INSTALL_DIR/DEPLOYMENT_INFO.txt
echo ""
log_info "Next Steps:"
echo "  1. Visit https://$DOMAIN_NAME to access the application"
echo "  2. Login with default credentials (see above)"
echo "  3. Change the default admin password immediately"
echo "  4. Configure materials, locations, and pricing in the Admin Panel"
echo ""
log_info "Useful Commands:"
echo "  - View status: $INSTALL_DIR/status.sh"
echo "  - Update app: $INSTALL_DIR/update.sh"
echo "  - Create backup: $INSTALL_DIR/backup.sh"
echo "  - View logs: pm2 logs recycling-api"
echo ""
log_success "Happy recycling! 🌍♻️"
