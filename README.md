# CIVICycle - Recycling Management System

A comprehensive multi-user recycling management and traceability platform with offline support, real-time inventory tracking, delivery logistics, and advanced reporting.

## Features

- **Multi-Location Support** - Manage multiple recycling stations under one cooperative
- **Complete Traceability** - Track material from apartment source through waste picker collection to client sale and delivery
- **Offline-First PWA** - Full offline capability with background sync via IndexedDB
- **Real-time Inventory** - Automatic stock updates via database triggers
- **Delivery Logistics** - Track vehicles, drivers, and delivery confirmations with reusable records
- **Configurable Email Confirmations** - Templated emails for purchases, sales, and deliveries
- **Advanced Reporting** - Analytics with PDF and Excel export, scheduled report generation
- **Role-Based Access Control** - Admin, Manager, Operator, and Viewer roles
- **Daily Pricing** - Per-location, time-of-day material pricing
- **Payment Tracking** - Full payment lifecycle with voiding/reversal support
- **Bilingual** - English and Spanish interface

## Tech Stack

- **Backend**: Node.js 20, Express 4, TypeScript, PostgreSQL 14+
- **Frontend**: React 18, Vite 6, TypeScript, Tailwind CSS 3, Zustand
- **Offline**: Dexie (IndexedDB) with bidirectional sync
- **Auth**: JWT tokens with bcrypt password hashing
- **Infrastructure**: systemd, Nginx, Let's Encrypt SSL
- **Alternative**: Docker Compose for containerized deployments

## Quick Start

### Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 14+
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/021650641/recycling-management-system.git
cd recycling-management-system

# Backend setup
cd backend
cp env.example .env              # Configure database credentials
npm install
npx tsc                          # Compile TypeScript

# Run database migrations
chmod +x migrations/run-migrations.sh
./migrations/run-migrations.sh

# Start backend (development)
npm run dev                      # Runs on http://localhost:3001

# Frontend setup (in a separate terminal)
cd ../frontend
npm install
npm run dev                      # Runs on http://localhost:3000
```

### Docker Setup

```bash
docker compose up -d
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

### Production Deployment

See **[deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)** for complete VPS installation guide.

## Project Structure

```
recycling-management-system/
|-- backend/                    # Node.js + Express + TypeScript API
|   |-- src/
|   |   |-- routes/            # 16 API route modules
|   |   |-- middleware/        # JWT auth and role-based access
|   |   |-- services/         # Email, logging, scheduling
|   |   |-- config.ts         # Environment configuration
|   |   |-- db.ts             # PostgreSQL connection pool
|   |   +-- server.ts         # Express app and startup
|   |-- migrations/            # SQL schema migrations (001-009)
|   +-- package.json
|-- frontend/                   # React 18 + Vite SPA
|   |-- src/
|   |   |-- pages/            # 12 page components
|   |   |-- components/       # Layout and shared UI
|   |   |-- lib/              # API client, offline DB, sync
|   |   |-- store/            # Zustand state (auth, settings)
|   |   +-- i18n/             # English and Spanish translations
|   +-- package.json
|-- deployment/                 # Production deployment scripts
|   |-- deploy.sh             # Automated first-time deployment
|   |-- update.sh             # Pull updates and restart
|   |-- backup.sh             # Database and file backups
|   |-- recycling-api.service # systemd service unit
|   +-- nginx.conf.template   # Nginx reverse proxy config
|-- docker-compose.yml          # Container orchestration
|-- TECHNICAL.md                # Technical architecture document
+-- DEPLOYMENT.md               # Quick deployment reference
```

## Default Credentials

After running migrations (which include seed data):

| Role     | Email                      | Password    |
|----------|----------------------------|-------------|
| Admin    | admin@recycling.coop       | admin123    |
| Manager  | manager@recycling.coop     | manager123  |
| Operator | operator@recycling.coop    | operator123 |

**Change these immediately in production.**

## Documentation

| Document                                          | Description                              |
|---------------------------------------------------|------------------------------------------|
| [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) | Full installation and deployment guide |
| [TECHNICAL.md](TECHNICAL.md)                      | Technical architecture and stack details |
| [API.md](API.md)                                  | REST API endpoint documentation          |
| [DEPLOYMENT.md](DEPLOYMENT.md)                    | Quick deployment reference               |

## License

MIT
