# Recycling Management System

A comprehensive multi-user recycling management system with offline support, real-time tracking, and advanced reporting.

## Features

- **Multi-Location Support**: Manage multiple recycling stations
- **Complete Traceability**: Track material from apartment → waste picker → location → client
- **Offline Operation**: Full offline capability with automatic sync
- **Real-time Inventory**: Automatic inventory updates and stock tracking
- **Advanced Reporting**: Instant analytics on volumes, sources, and financials
- **Role-Based Access**: Admin, Manager, Operator, and Viewer roles
- **Daily Pricing**: Set and override prices per location
- **Payment Tracking**: Full payment lifecycle management

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Frontend**: React, TypeScript, Vite, TanStack Query
- **Database**: PostgreSQL 14+ with partitioning and materialized views
- **Offline**: IndexedDB with bidirectional sync
- **Auth**: JWT tokens with refresh
- **Deployment**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Using Docker (Recommended)

```bash
# Clone and navigate to project
cd recycling-app

# Start all services
npm run docker:up

# The application will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:5000
```

### Manual Setup

```bash
# Install dependencies
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env with your database credentials

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development servers
npm run dev
```

## Project Structure

```
recycling-app/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── controllers/ # Business logic
│   │   ├── models/      # Database models
│   │   ├── middleware/  # Auth, validation
│   │   └── services/    # Sync, pricing logic
│   ├── db/
│   │   ├── migrations/  # Database schema
│   │   └── seeds/       # Initial data
│   └── package.json
├── frontend/             # React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── services/    # API calls, offline sync
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Helpers
│   └── package.json
├── docker-compose.yml    # Docker configuration
└── package.json          # Root workspace
```

## Default Credentials

After seeding the database, you can log in with:

- **Admin**: admin@recycling.coop / admin123
- **Manager**: manager@recycling.coop / manager123
- **Operator**: operator@recycling.coop / operator123

## API Documentation

Full API documentation is available at `http://localhost:5000/api/docs` when running the backend.

## Database Schema

See `docs/recycling-management-system-spec.md` for complete database schema and architecture details.

## Development

```bash
# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend

# Build for production
npm run build

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## Deployment

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

## License

MIT
