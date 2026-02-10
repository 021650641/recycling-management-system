#!/bin/bash

############################################
# Recycling Management System Deployment Script
# Automated VPS deployment for Ubuntu/Debian
############################################

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

log_info "==========================================="
log_info "Recycling Management System Deployment"
log_info "==========================================="
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

# Detect if this is an upgrade
IS_UPGRADE=false
if [ -d "$INSTALL_DIR" ]; then
    log_warning "Installation directory already exists at $INSTALL_DIR"
    
    # Check if it looks like our application
    if [ -d "$INSTALL_DIR/backend" ] && [ -d "$INSTALL_DIR/frontend" ]; then
        log_info "Detected existing Recycling Management System installation"
        read -p "Upgrade existing installation? (y/n) [y]: " UPGRADE_CONFIRM
        UPGRADE_CONFIRM=${UPGRADE_CONFIRM:-y}
        
        if [[ $UPGRADE_CONFIRM =~ ^[Yy]$ ]]; then
            IS_UPGRADE=true
            log_info "Upgrade mode enabled. Existing configuration will be preserved."
        else
            log_error "Upgrade declined. Exiting."
            exit 1
        fi
    else
        log_error "Directory exists but doesn't appear to be our application."
        read -p "Remove directory and proceed with fresh install? (y/n): " REMOVE_CONFIRM
        if [[ $REMOVE_CONFIRM =~ ^[Yy]$ ]]; then
            log_warning "Backing up existing directory..."
            BACKUP_DIR="${INSTALL_DIR}_old_$(date +%Y%m%d_%H%M%S)"
            sudo mv "$INSTALL_DIR" "$BACKUP_DIR"
            log_success "Old directory moved to $BACKUP_DIR"
        else
            log_error "Cannot proceed. Please remove the directory manually or choose a different path."
            exit 1
        fi
    fi
fi

echo ""
log_info "Configuration Summary:"
echo "  Domain: $DOMAIN_NAME"
echo "  Install Directory: $INSTALL_DIR"
echo "  Database: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  API Port: $API_PORT"
echo "  SSL: $INSTALL_SSL"
echo "  Mode: $([ "$IS_UPGRADE" = true ] && echo "UPGRADE" || echo "NEW INSTALL")"
echo ""
read -p "Proceed with installation? (y/n): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    log_info "Installation cancelled."
    exit 0
fi

############################################
# 1. System Update & Dependencies
############################################
log_info "Step 1: Updating system and installing dependencies..."

sudo apt update
sudo apt upgrade -y

log_info "Installing Node.js 20.x (LTS)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

log_info "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

log_info "Installing Nginx..."
sudo apt install -y nginx

log_info "Installing additional tools..."
sudo apt install -y git curl build-essential certbot python3-certbot-nginx

log_success "Dependencies installed successfully!"

############################################
# 2. PostgreSQL Setup
############################################
if [ "$IS_UPGRADE" = false ]; then
    log_info "Step 2: Setting up PostgreSQL database..."
    
    sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

    log_success "PostgreSQL database configured!"
else
    log_info "Step 2: Skipping database setup (upgrade mode)..."
fi

############################################
# 3. Application Setup
############################################
log_info "Step 3: Setting up application..."

if [ "$IS_UPGRADE" = true ]; then
    log_info "Backing up existing installation..."
    BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    sudo cp -r "$INSTALL_DIR" "$BACKUP_DIR"
    log_success "Backup created at $BACKUP_DIR"
    
    # Preserve .env file
    if [ -f "$INSTALL_DIR/backend/.env" ]; then
        log_info "Preserving existing .env configuration..."
        sudo cp "$INSTALL_DIR/backend/.env" "/tmp/.env.backup"
    fi
fi

# Create installation directory
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR

# Clone repository
log_info "Cloning repository..."
if [ "$IS_UPGRADE" = true ]; then
    cd $INSTALL_DIR
    git fetch origin
    git reset --hard origin/main
    git pull origin main
else
    git clone https://github.com/021650641/recycling-management-system.git $INSTALL_DIR
    cd $INSTALL_DIR
fi

############################################
# 4. Backend Setup
############################################
log_info "Step 4: Setting up backend..."

cd $INSTALL_DIR/backend

# Restore .env if upgrading, otherwise create new
if [ "$IS_UPGRADE" = true ] && [ -f "/tmp/.env.backup" ]; then
    log_info "Restoring previous .env configuration..."
    sudo cp "/tmp/.env.backup" .env
    sudo rm "/tmp/.env.backup"
else
    log_info "Creating backend .env file..."
    cat > .env <<EOF
# Server Configuration
NODE_ENV=production
PORT=$API_PORT

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://$DOMAIN_NAME

# Email Configuration (configure later)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
EOF
fi

log_info "Installing backend dependencies..."
npm install --production

log_info "Running database migrations..."
npm run migrate

log_success "Backend configured successfully!"

############################################
# 5. Frontend Setup
############################################
log_info "Step 5: Setting up frontend..."

cd $INSTALL_DIR/frontend

# Create or update .env
log_info "Creating frontend .env file..."
cat > .env <<EOF
VITE_API_URL=https://$DOMAIN_NAME/api
VITE_APP_NAME=Recycling Management System
EOF

log_info "Installing frontend dependencies..."
npm install

log_info "Building frontend..."
npm run build

log_success "Frontend built successfully!"

############################################
# 6. Systemd Service Setup
############################################
log_info "Step 6: Setting up systemd service..."

# Stop existing service if upgrading
if [ "$IS_UPGRADE" = true ]; then
    log_info "Stopping existing application..."
    sudo systemctl stop recycling-api.service || true
fi

# Create deploy user if it doesn't exist
if ! id -u deploy &>/dev/null 2>&1; then
    log_info "Creating deploy user..."
    sudo useradd --system --no-create-home --shell /usr/sbin/nologin deploy
fi

# Install systemd service unit
log_info "Installing systemd service unit..."
sudo cp $INSTALL_DIR/deployment/recycling-api.service /etc/systemd/system/recycling-api.service

# Update the service file with actual paths and user
sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=$INSTALL_DIR/backend|" /etc/systemd/system/recycling-api.service
sudo sed -i "s|EnvironmentFile=.*|EnvironmentFile=$INSTALL_DIR/backend/.env|" /etc/systemd/system/recycling-api.service
sudo sed -i "s|ReadWritePaths=.*|ReadWritePaths=$INSTALL_DIR/backend/uploads $INSTALL_DIR/backend/logs|" /etc/systemd/system/recycling-api.service
sudo sed -i "s|User=deploy|User=$USER|" /etc/systemd/system/recycling-api.service
sudo sed -i "s|Group=deploy|Group=$USER|" /etc/systemd/system/recycling-api.service

# Install the recycling target
sudo cp $INSTALL_DIR/deployment/recycling.target /etc/systemd/system/recycling.target

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable recycling-api.service
sudo systemctl start recycling-api.service

# Wait for the service to start
sleep 3

# Verify service is running
if sudo systemctl is-active --quiet recycling-api.service; then
    log_success "Systemd service configured and running!"
else
    log_error "Service failed to start. Checking logs..."
    sudo journalctl -u recycling-api.service --no-pager -n 20
    exit 1
fi

############################################
# 7. Nginx Configuration
############################################
log_info "Step 7: Configuring Nginx..."

sudo tee /etc/nginx/sites-available/$DOMAIN_NAME <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Frontend
    location / {
        root $INSTALL_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
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
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # File upload size
    client_max_body_size 10M;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/

# Remove default site if this is a new install
if [ "$IS_UPGRADE" = false ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

log_success "Nginx configured successfully!"

############################################
# 8. SSL Certificate (Optional)
############################################
if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
    log_info "Step 8: Installing SSL certificate..."
    
    sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $SSL_EMAIL --redirect
    
    # Set up auto-renewal
    sudo systemctl enable certbot.timer
    sudo systemctl start certbot.timer
    
    log_success "SSL certificate installed and auto-renewal configured!"
else
    log_info "Step 8: Skipping SSL installation."
fi

############################################
# 9. Firewall Configuration
############################################
log_info "Step 9: Configuring firewall..."

if command -v ufw &> /dev/null; then
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    sudo ufw --force enable
    log_success "Firewall configured!"
else
    log_warning "UFW not installed. Please configure your firewall manually."
fi

############################################
# 10. Final Steps
############################################
log_info "Step 10: Final configuration..."

# Create upload directories
mkdir -p $INSTALL_DIR/backend/uploads/{profiles,documents}

# Set permissions
sudo chown -R $USER:www-data $INSTALL_DIR
sudo chmod -R 755 $INSTALL_DIR

log_success "Permissions configured!"

############################################
# Deployment Complete
############################################
echo ""
echo "==========================================="
log_success "Deployment Complete!"
echo "==========================================="
echo ""
log_info "Application Details:"
echo "  URL: https://$DOMAIN_NAME"
echo "  Installation Path: $INSTALL_DIR"
echo "  Backend Port: $API_PORT"
echo "  Database: $DB_NAME"
echo ""
log_info "Useful Commands:"
echo "  View backend logs: sudo journalctl -u recycling-api -f"
echo "  Restart backend: sudo systemctl restart recycling-api"
echo "  View service status: sudo systemctl status recycling-api"
echo "  View Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""

if [ "$IS_UPGRADE" = true ]; then
    log_info "Backup Location: $BACKUP_DIR"
    log_warning "If everything works correctly, you can remove the backup with:"
    echo "  sudo rm -rf $BACKUP_DIR"
    echo ""
fi

log_info "Next Steps:"
echo "  1. Configure email settings in $INSTALL_DIR/backend/.env"
echo "  2. Set up regular backups"
echo "  3. Configure monitoring"
echo "  4. Review security settings"
echo ""
log_success "Your Recycling Management System is now deployed and running!"
