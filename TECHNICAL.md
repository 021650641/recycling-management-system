# CIVICycle - Technical Architecture Document

Version 1.2.0 | February 2026

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Technology Stack](#2-technology-stack)
- [3. Backend Architecture](#3-backend-architecture)
  - [3.1 Application Structure](#31-application-structure)
  - [3.2 API Design](#32-api-design)
  - [3.3 Authentication and Authorization](#33-authentication-and-authorization)
  - [3.4 Database Layer](#34-database-layer)
  - [3.5 Services](#35-services)
  - [3.6 Middleware](#36-middleware)
- [4. Frontend Architecture](#4-frontend-architecture)
  - [4.1 Application Structure](#41-application-structure)
  - [4.2 State Management](#42-state-management)
  - [4.3 Routing](#43-routing)
  - [4.4 Internationalization](#44-internationalization)
  - [4.5 Progressive Web App](#45-progressive-web-app)
  - [4.6 Offline Support](#46-offline-support)
- [5. Database Schema](#5-database-schema)
  - [5.1 Core Tables](#51-core-tables)
  - [5.2 Transactional Tables](#52-transactional-tables)
  - [5.3 Supporting Tables](#53-supporting-tables)
  - [5.4 Views](#54-views)
  - [5.5 Triggers and Functions](#55-triggers-and-functions)
  - [5.6 Migration Strategy](#56-migration-strategy)
- [6. API Endpoints](#6-api-endpoints)
- [7. Security Architecture](#7-security-architecture)
- [8. Email and Notifications](#8-email-and-notifications)
- [9. Reporting and Analytics](#9-reporting-and-analytics)
- [10. Infrastructure](#10-infrastructure)
  - [10.1 Production Architecture](#101-production-architecture)
  - [10.2 Process Management](#102-process-management)
  - [10.3 Reverse Proxy](#103-reverse-proxy)
  - [10.4 Docker Support](#104-docker-support)
- [11. Build and Deployment Pipeline](#11-build-and-deployment-pipeline)
- [12. Logging and Monitoring](#12-logging-and-monitoring)
- [13. Performance Considerations](#13-performance-considerations)

---

## 1. System Overview

CIVICycle is a full-stack recycling management and traceability platform designed for cooperatives that collect, process, and sell recyclable materials. The system tracks the complete lifecycle of materials from source (apartment complexes) through collection (waste pickers) to sale (clients/buyers), with full inventory management, financial tracking, and delivery logistics.

### Key Capabilities

- **Multi-location inventory management** across recycling stations
- **Full material traceability** from apartment source to final buyer
- **Role-based access control** (Admin, Manager, Operator, Viewer)
- **Offline-first PWA** with background sync
- **Configurable confirmation emails** for purchases, sales, and deliveries
- **Automated reporting** with PDF and Excel export
- **Scheduled report generation** via cron-like scheduling
- **Bilingual interface** (English and Spanish)
- **Delivery logistics tracking** with reusable driver/vehicle records

---

## 2. Technology Stack

### Backend

| Component        | Technology                  | Version  | Purpose                           |
|------------------|-----------------------------|----------|-----------------------------------|
| Runtime          | Node.js                     | 20.x LTS | JavaScript server runtime         |
| Framework        | Express                     | 4.18     | HTTP server and routing           |
| Language         | TypeScript                  | 5.3      | Type safety (compiled to CommonJS)|
| Database         | PostgreSQL                  | 14+      | Relational data storage           |
| DB Driver        | pg (node-postgres)          | 8.11     | PostgreSQL client                 |
| Authentication   | jsonwebtoken                | 9.0      | JWT token generation/verification |
| Password Hashing | bcrypt                      | 6.0      | Secure password storage           |
| Email            | Nodemailer                  | 8.0      | SMTP email delivery               |
| PDF Generation   | PDFKit                      | 0.17     | Report PDF export                 |
| Excel Export     | ExcelJS                     | 4.4      | Report spreadsheet export         |
| Scheduling       | node-cron                   | 4.2      | Periodic task execution           |
| Logging          | Winston                     | 3.19     | Structured application logging    |
| Security         | Helmet                      | 7.1      | HTTP security headers             |
| Compression      | compression                 | 1.7      | Gzip response compression         |
| HTTP Logging     | Morgan                      | 1.10     | Request/response logging          |

### Frontend

| Component        | Technology                  | Version  | Purpose                           |
|------------------|-----------------------------|----------|-----------------------------------|
| UI Framework     | React                       | 18.3     | Component-based UI                |
| Build Tool       | Vite                        | 6.0      | Dev server and production bundler |
| Language         | TypeScript                  | 5.7      | Type-safe components              |
| CSS Framework    | Tailwind CSS                | 3.4      | Utility-first styling             |
| State Management | Zustand                     | 5.0      | Lightweight global state          |
| HTTP Client      | Axios                       | 1.7      | API communication                 |
| Routing          | React Router                | 6.28     | Client-side page routing          |
| Charts           | Recharts                    | 2.15     | Data visualization                |
| Icons            | Lucide React                | 0.469    | SVG icon library                  |
| Offline DB       | Dexie                       | 4.0      | IndexedDB wrapper                 |
| i18n             | i18next + react-i18next     | 25.8     | Internationalization              |
| Notifications    | react-hot-toast             | 2.4      | Toast messages                    |
| PWA              | vite-plugin-pwa             | 0.21     | Service worker and manifest       |
| Date Utilities   | date-fns                    | 4.1      | Date formatting and manipulation  |

### Infrastructure

| Component        | Technology                  | Purpose                           |
|------------------|-----------------------------|-----------------------------------|
| Process Manager  | systemd                     | Service lifecycle management      |
| Reverse Proxy    | Nginx                       | SSL, static files, API proxy      |
| SSL              | Let's Encrypt / Certbot     | TLS certificate automation        |
| Containers       | Docker / Docker Compose     | Alternative deployment method     |
| Firewall         | UFW                         | Network access control            |

---

## 3. Backend Architecture

### 3.1 Application Structure

```
backend/src/
|-- config.ts              # Environment variable parsing with defaults
|-- db.ts                  # PostgreSQL connection pool, query helpers, transactions
|-- server.ts              # Express app setup, middleware, route registration, startup
|-- middleware/
|   +-- auth.ts            # JWT verification, role-based authorization
|-- routes/                # 16 route modules (one per domain entity)
|   |-- auth.ts            # Login, register, profile, password change
|   |-- transactions.ts    # Material purchase receipts (CRUD + void/reverse)
|   |-- inventory.ts       # Stock levels, adjustments
|   |-- reports.ts         # Analytics, summary, export (PDF/Excel)
|   |-- locations.ts       # Recycling station management
|   |-- materials.ts       # Material categories and daily pricing
|   |-- wastePickers.ts    # Vendor/collector management
|   |-- apartments.ts      # Source apartment complexes and units
|   |-- clients.ts         # Buyer/customer management
|   |-- sales.ts           # Material sales, payment, delivery
|   |-- delivery.ts        # Delivery person and vehicle lookups
|   |-- sync.ts            # Offline data synchronization
|   |-- users.ts           # User CRUD (admin only)
|   |-- settings.ts        # Application settings (key-value store)
|   |-- logs.ts            # Activity log viewer
|   +-- schedules.ts       # Scheduled report configuration
|-- services/
|   |-- logger.ts          # Winston logger configuration
|   |-- scheduler.ts       # node-cron scheduled task runner
|   +-- confirmationService.ts  # Email template rendering and sending
+-- utils/                 # Shared utility functions
```

### 3.2 API Design

- **RESTful** resource-based endpoints
- **URL prefix**: `/api/v1` (configurable via `API_PREFIX`)
- **Health check**: `GET /health` (outside API prefix for load balancer probes)
- **Content type**: JSON (`application/json`)
- **Error format**: `{ error: string, message: string, stack?: string }`
- **Pagination**: `?limit=50&offset=0` with response including `total` count

The Express app registers 16 route modules under the API prefix:

```typescript
apiRouter.use('/auth', authRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/materials', materialRoutes);
apiRouter.use('/waste-pickers', wastePickerRoutes);
apiRouter.use('/apartments', apartmentRoutes);
apiRouter.use('/clients', clientRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/logs', logRoutes);
apiRouter.use('/schedules', scheduleRoutes);
apiRouter.use('/delivery', deliveryRoutes);
```

### 3.3 Authentication and Authorization

**Authentication flow:**

1. User submits `POST /api/v1/auth/login` with `{ email, password }`
2. Server verifies password against bcrypt hash in database
3. Server returns JWT token with payload: `{ id, email, role, locationId }`
4. Client includes `Authorization: Bearer <token>` on all subsequent requests
5. The `authenticate` middleware verifies the JWT and attaches `req.user`

**Authorization:**

- The `authorize(...roles)` middleware restricts endpoints to specific roles
- Four roles: `admin`, `manager`, `operator`, `viewer`
- Role hierarchy is enforced per-endpoint (e.g., user management is admin-only)

**Token configuration:**

| Parameter         | Default | Description              |
|-------------------|---------|--------------------------|
| Access token      | 7 days  | Main authentication token|
| Refresh token     | 30 days | Token renewal            |
| Algorithm         | HS256   | HMAC-SHA256 signing      |

### 3.4 Database Layer

**Connection management** (`db.ts`):

- Uses `pg.Pool` with configurable max connections (default: 20)
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds
- Exports helper functions:
  - `query(text, params)` - Execute a parameterized query
  - `transaction(callback)` - Run queries in a transaction (BEGIN/COMMIT/ROLLBACK)
  - `getClient()` - Acquire a dedicated client for complex operations
  - `healthCheck()` - Test database connectivity

**Configuration** reads individual environment variables, not a connection URL:

```typescript
db: {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'recycling_db',
  user: process.env.DB_USER || 'recycling_user',
  password: process.env.DB_PASSWORD || '',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
}
```

### 3.5 Services

**Confirmation Service** (`confirmationService.ts`):

Sends templated emails for purchases, sales, and deliveries. Templates use `{{placeholder}}` syntax and are stored in the `app_settings` table. Each confirmation type has configurable:
- Enable/disable toggle
- Recipient field (from transaction data) or custom email
- Subject template
- Body template (HTML)

**Scheduler** (`scheduler.ts`):

Uses `node-cron` to execute periodic tasks such as scheduled report generation. Schedules are stored in the database and loaded at startup.

**Logger** (`logger.ts`):

Winston-based logging with:
- Console transport (colorized in development)
- File transport for persistent logs (`backend/logs/`)
- Configurable log level via `LOG_LEVEL` environment variable

### 3.6 Middleware

| Middleware    | Purpose                                              |
|---------------|------------------------------------------------------|
| `helmet`      | Sets security-related HTTP headers                   |
| `cors`        | Cross-Origin Resource Sharing (single origin)        |
| `compression` | Gzip compression for responses                       |
| `morgan`      | HTTP request logging (`dev` or `combined` format)    |
| `express.json`| JSON body parsing (10 MB limit)                      |
| `authenticate`| JWT token verification                               |
| `authorize`   | Role-based endpoint access control                   |

---

## 4. Frontend Architecture

### 4.1 Application Structure

```
frontend/src/
|-- main.tsx                # React entry point, renders App
|-- App.tsx                 # Router setup, protected routes, auth guard
|-- components/
|   +-- Layout.tsx          # Sidebar navigation, header, profile modal,
|                           # password change, version display
|-- pages/
|   |-- Login.tsx           # Authentication page
|   |-- Dashboard.tsx       # Overview metrics, recent transactions, low stock
|   |-- Transactions.tsx    # Purchase receipt management (CRUD + print)
|   |-- NewTransaction.tsx  # Create new purchase transaction
|   |-- Inventory.tsx       # Stock levels by location and material
|   |-- Reports.tsx         # Analytics with charts, PDF/Excel export
|   |-- Vendors.tsx         # Waste picker management
|   |-- Clients.tsx         # Client/buyer management
|   |-- Sources.tsx         # Apartment complex and unit management
|   |-- Traceability.tsx    # Material flow tracking (admin/manager)
|   |-- AdminPanel.tsx      # System settings: users, locations, materials,
|   |                       # pricing, prefixes, confirmations, logs, schedules
|   +-- Help.tsx            # User documentation and FAQ
|-- lib/
|   |-- api.ts              # Axios instance with JWT interceptor,
|   |                       # API client objects per domain
|   |-- db.ts               # Dexie IndexedDB schema for offline storage
|   |-- syncService.ts      # Offline/online synchronization logic
|   +-- dateFormat.ts       # Date formatting utilities
|-- store/
|   |-- authStore.ts        # Zustand: user session, login/logout, persist
|   +-- settingsStore.ts    # Zustand: app settings (theme, language)
|-- i18n/
|   |-- index.ts            # i18next configuration
|   +-- locales/
|       |-- en.json         # English translations
|       +-- es.json         # Spanish translations
+-- utils/                  # Shared helper functions
```

### 4.2 State Management

**Zustand** is used for global state with two stores:

**Auth Store** (`authStore.ts`):
- Persists to localStorage via Zustand's `persist` middleware
- Stores: `user` (id, email, firstName, lastName, role, locationId), `token`
- Actions: `login()`, `logout()`, `setUser()`, `isAuthenticated()`
- The `User` interface matches the API response fields (`firstName`, `lastName`, not `fullName`)

**Settings Store** (`settingsStore.ts`):
- Application preferences (language, theme)
- Persisted to localStorage

**API Client** (`lib/api.ts`):
- Axios instance with base URL from `VITE_API_URL`
- Request interceptor attaches `Authorization: Bearer <token>` header
- Response interceptor handles 401 (token expired) by triggering logout
- Exports domain-specific API objects: `authAPI`, `transactionAPI`, `inventoryAPI`, `salesAPI`, `deliveryAPI`, `settingsAPI`, etc.

### 4.3 Routing

React Router v6 with route protection in `App.tsx`:

| Path               | Component         | Access                 |
|--------------------|-------------------|------------------------|
| `/login`           | Login             | Public                 |
| `/`                | Dashboard         | Authenticated          |
| `/transactions`    | Transactions      | Authenticated          |
| `/new-transaction` | NewTransaction    | Authenticated          |
| `/inventory`       | Inventory         | Authenticated          |
| `/reports`         | Reports           | Authenticated          |
| `/vendors`         | Vendors           | Authenticated          |
| `/clients`         | Clients           | Authenticated          |
| `/sources`         | Sources           | Authenticated          |
| `/traceability`    | Traceability      | Admin, Manager         |
| `/admin`           | AdminPanel        | Admin, Manager         |
| `/help`            | Help              | Authenticated          |

The `Layout` component wraps all authenticated routes and provides:
- Collapsible sidebar with navigation links
- Header bar with welcome message (user's first name) and dropdown menu
- Profile view/edit modal
- Password change modal
- Version display in sidebar footer

### 4.4 Internationalization

Uses `i18next` with `react-i18next` for bilingual support:

- **Languages**: English (`en`), Spanish (`es`)
- **Namespace**: Single `translation` namespace
- **Detection**: Browser language preference with localStorage persistence
- **Fallback**: English
- **Translation files**: `frontend/src/i18n/locales/{en,es}.json`
- **Usage**: `const { t } = useTranslation(); t('key.subkey')`

Translation keys are organized by domain:
- `common.*` - Shared labels (save, cancel, welcome, etc.)
- `dashboard.*` - Dashboard-specific text
- `transactions.*` - Transaction management
- `inventory.*` - Inventory management
- `sales.*` - Sales, delivery details
- `admin.*` - Admin panel sections
- `reports.*` - Report labels

### 4.5 Progressive Web App

Configured via `vite-plugin-pwa`:

- **Registration**: Auto-update service worker
- **Manifest**: App name "CIVICycle", theme color `#10b981` (green)
- **Icons**: 192x192 and 512x512 PNG
- **Workbox**: Precaches static assets (`js`, `css`, `html`, `ico`, `png`, `svg`)
- **Runtime caching**: API requests cached with NetworkFirst strategy (24-hour max age, 100 max entries)
- **Installable**: Meets PWA install criteria for mobile/desktop

### 4.6 Offline Support

**IndexedDB** (via Dexie) stores local copies of:
- Transactions
- Materials
- Locations
- Inventory
- Waste pickers
- Clients
- Apartments

**Sync service** (`syncService.ts`):
- Detects online/offline status
- Queues mutations made while offline
- On reconnection, uploads pending changes to `POST /api/v1/sync/upload`
- Downloads server changes via `GET /api/v1/sync/download`
- Handles conflict resolution with server-wins strategy
- Tracks device ID for deduplication

---

## 5. Database Schema

PostgreSQL 14+ with UUID primary keys and timestamp tracking on all tables.

### 5.1 Core Tables

**`coop`** - The cooperative organization
- Fields: id, name, address, phone, email, registration_number
- One record per installation

**`location`** - Recycling stations/centers
- Fields: id, coop_id (FK), name, address, phone, manager_name, is_active
- Multiple locations per cooperative

**`app_user`** - System users
- Fields: id, email, password_hash, first_name, last_name, role, location_id (FK), is_active, last_login, created_at
- Roles: `admin`, `manager`, `operator`, `viewer`
- Passwords hashed with bcrypt (cost factor 10)

### 5.2 Transactional Tables

**`transaction`** - Material purchase receipts
- Fields: id, transaction_number, location_id, material_category_id, waste_picker_id, apartment_complex_id, apartment_unit, weight_kg, unit_price, total_amount, payment_status, payment_method, notes, created_by, created_at
- Auto-generated transaction numbers with configurable prefix (default: `TR`)
- Triggers automatically update inventory on insert
- Supports void/reversal via negative-value reversal records (prefixed `REV-`)

**`sale`** - Material sales to clients
- Fields: id, sale_number, client_id, location_id, material_category_id, weight_kg, unit_price, total_amount, payment_status, payment_method, paid_amount, paid_at, payment_reference, delivery_status, delivered_at, delivery_person_id, delivery_vehicle_id, delivery_notes, notes, created_by, created_at
- Sale numbers with configurable prefix (default: `SL`)
- Triggers automatically reduce inventory on insert
- Delivery tracking with linked driver and vehicle records

**`inventory`** - Current stock levels
- Fields: id, location_id, material_category_id, quantity_kg, updated_at
- Unique constraint on (location_id, material_category_id)
- Updated automatically by transaction and sale triggers

**`daily_price`** - Material pricing
- Fields: id, material_category_id, location_id (nullable), purchase_price_per_kg, sale_price_per_kg, date, time_valid_from, time_valid_to
- Location-specific prices override global prices
- Time-of-day validity ranges for dynamic pricing

### 5.3 Supporting Tables

**`material_category`** - Types of recyclable materials
- Fields: id, name, description, is_active
- Seeded with: Plastic, Cardboard, Glass, Metal, Paper, Organic, E-Waste

**`waste_picker`** - Material collectors/vendors
- Fields: id, name, phone, email, id_number, address, is_active

**`apartment_complex`** - Source locations
- Fields: id, name, address, contact_person, contact_phone, number_of_units, is_active

**`client`** - Material buyers
- Fields: id, name, contact_person, phone, email, address, is_active

**`delivery_person`** - Reusable driver records
- Fields: id, full_name, id_card_number, created_at
- Unique index on (full_name, id_card_number)
- Populated via upsert during delivery creation

**`delivery_vehicle`** - Reusable vehicle records
- Fields: id, vehicle_type, registration_number, created_at
- Unique index on (registration_number)
- Populated via upsert during delivery creation

**`app_settings`** - Key-value configuration store
- Fields: id, category, key, value
- Categories: `prefixes`, `confirmations`, `general`
- Stores configurable transaction/sale prefixes, email templates, feature flags

**`schedule`** - Scheduled report configurations
- Fields: id, name, cron_expression, report_type, parameters, is_active

### 5.4 Views

Database views provide pre-joined data for common queries:

- **`v_transaction_details`** - Transactions joined with location, material, waste picker, apartment, and creator
- **`v_sale_details`** - Sales joined with client, location, material, and creator
- **`v_inventory_status`** - Inventory joined with location and material names
- **Report views** for aggregated analytics by material, location, time period

### 5.5 Triggers and Functions

**`update_inventory_on_transaction()`**
- Fires after INSERT on `transaction`
- Upserts into `inventory`, adding the transaction weight to current stock
- Handles both positive (purchase) and negative (reversal) quantities

**`reduce_inventory_on_sale()`**
- Fires after INSERT on `sale`
- Reduces inventory by the sale weight
- Validates sufficient stock is available

**`update_timestamps()`**
- Fires before UPDATE on any table with `updated_at`
- Automatically sets `updated_at = CURRENT_TIMESTAMP`

### 5.6 Migration Strategy

Migrations are sequential SQL files in `backend/migrations/`:

| File                              | Purpose                              |
|-----------------------------------|--------------------------------------|
| `001_initial_schema.sql`          | Core tables, extensions, base schema |
| `002_triggers_and_functions.sql`  | Inventory triggers, update functions |
| `003_views_and_reports.sql`       | Analytical views                     |
| `004_seed.sql`                    | Initial data (org, materials, admin) |
| `005_apartment_units.sql`         | Unit-level tracking for apartments   |
| `006_fix_transaction_constraints.sql` | Constraint corrections           |
| `007_price_time_validity.sql`     | Time-of-day price ranges             |
| `008_add_encryption.sql`          | Encrypted field support              |
| `009_delivery_details.sql`        | Delivery person/vehicle tables       |

All migrations use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency. A `schema_migrations` table tracks which migrations have been applied. The `run-migrations.sh` script automates the process.

---

## 6. API Endpoints

### Authentication

| Method | Endpoint                     | Auth | Roles      | Description                    |
|--------|------------------------------|------|------------|--------------------------------|
| POST   | `/auth/login`                | No   | All        | Login, returns JWT token       |
| POST   | `/auth/register`             | Yes  | Admin      | Create new user                |
| GET    | `/auth/me`                   | Yes  | All        | Current user profile           |
| PUT    | `/auth/profile`              | Yes  | All        | Update own profile             |
| POST   | `/auth/change-password`      | Yes  | All        | Change own password            |

### Transactions (Purchases)

| Method | Endpoint                     | Auth | Roles              | Description                    |
|--------|------------------------------|------|--------------------|--------------------------------|
| GET    | `/transactions`              | Yes  | All                | List with filters and pagination|
| POST   | `/transactions`              | Yes  | Admin/Mgr/Op       | Create new purchase            |
| GET    | `/transactions/:id`          | Yes  | All                | Get single transaction         |
| PUT    | `/transactions/:id`          | Yes  | Admin/Mgr          | Update transaction             |
| POST   | `/transactions/:id/void`     | Yes  | Admin/Mgr          | Void/reverse a transaction     |

### Sales

| Method | Endpoint                     | Auth | Roles              | Description                    |
|--------|------------------------------|------|--------------------|--------------------------------|
| GET    | `/sales`                     | Yes  | All                | List sales                     |
| POST   | `/sales`                     | Yes  | Admin/Mgr/Op       | Create new sale                |
| GET    | `/sales/:id`                 | Yes  | All                | Get single sale                |
| PATCH  | `/sales/:id/payment`         | Yes  | Admin/Mgr          | Update payment status          |
| PATCH  | `/sales/:id/delivery`        | Yes  | Admin/Mgr          | Update delivery with details   |
| PATCH  | `/sales/:id/notes`           | Yes  | Admin/Mgr/Op       | Update sale notes              |
| POST   | `/sales/:id/void`            | Yes  | Admin/Mgr          | Void/reverse a sale            |

### Inventory

| Method | Endpoint                     | Auth | Roles              | Description                    |
|--------|------------------------------|------|--------------------|--------------------------------|
| GET    | `/inventory`                 | Yes  | All                | Current stock levels           |
| POST   | `/inventory/adjustment`      | Yes  | Admin/Mgr          | Manual stock adjustment        |

### Delivery

| Method | Endpoint                     | Auth | Roles      | Description                    |
|--------|------------------------------|------|------------|--------------------------------|
| GET    | `/delivery/persons`          | Yes  | All        | List saved delivery persons    |
| GET    | `/delivery/vehicles`         | Yes  | All        | List saved delivery vehicles   |

### Master Data

| Method | Endpoint                     | Auth | Roles              | Description                    |
|--------|------------------------------|------|--------------------|--------------------------------|
| GET    | `/locations`                 | Yes  | All                | List locations                 |
| POST   | `/locations`                 | Yes  | Admin               | Create location               |
| PUT    | `/locations/:id`             | Yes  | Admin               | Update location               |
| GET    | `/materials`                 | Yes  | All                | List materials                 |
| POST   | `/materials`                 | Yes  | Admin               | Create material               |
| PUT    | `/materials/:id`             | Yes  | Admin               | Update material               |
| PUT    | `/materials/:id/price`       | Yes  | Admin/Mgr          | Set daily price                |
| GET    | `/waste-pickers`             | Yes  | All                | List waste pickers             |
| POST   | `/waste-pickers`             | Yes  | Admin/Mgr/Op       | Create waste picker            |
| PUT    | `/waste-pickers/:id`         | Yes  | Admin/Mgr          | Update waste picker            |
| GET    | `/apartments`                | Yes  | All                | List apartment complexes       |
| POST   | `/apartments`                | Yes  | Admin/Mgr          | Create apartment complex       |
| PUT    | `/apartments/:id`            | Yes  | Admin/Mgr          | Update apartment complex       |
| GET    | `/clients`                   | Yes  | All                | List clients                   |
| POST   | `/clients`                   | Yes  | Admin/Mgr/Op       | Create client                  |
| PUT    | `/clients/:id`               | Yes  | Admin/Mgr          | Update client                  |

### Administration

| Method | Endpoint                     | Auth | Roles      | Description                    |
|--------|------------------------------|------|------------|--------------------------------|
| GET    | `/users`                     | Yes  | Admin      | List all users                 |
| POST   | `/users`                     | Yes  | Admin      | Create user                    |
| PUT    | `/users/:id`                 | Yes  | Admin      | Update user                    |
| DELETE | `/users/:id`                 | Yes  | Admin      | Deactivate user                |
| GET    | `/settings`                  | Yes  | Admin/Mgr  | Get app settings               |
| PUT    | `/settings`                  | Yes  | Admin      | Update app settings            |
| GET    | `/logs`                      | Yes  | Admin      | View activity logs             |
| GET    | `/schedules`                 | Yes  | Admin/Mgr  | List scheduled tasks           |
| POST   | `/schedules`                 | Yes  | Admin      | Create scheduled task          |
| PUT    | `/schedules/:id`             | Yes  | Admin      | Update scheduled task          |
| DELETE | `/schedules/:id`             | Yes  | Admin      | Delete scheduled task          |

### Reports

| Method | Endpoint                           | Auth | Description                    |
|--------|------------------------------------|------|--------------------------------|
| GET    | `/reports/transactions-summary`    | Yes  | Aggregated transaction stats   |
| GET    | `/reports/inventory-status`        | Yes  | Stock levels across locations  |
| GET    | `/reports/waste-picker-performance`| Yes  | Collector performance metrics  |

### Sync

| Method | Endpoint                     | Auth | Description                    |
|--------|------------------------------|------|--------------------------------|
| POST   | `/sync/upload`               | Yes  | Upload offline changes         |
| GET    | `/sync/download`             | Yes  | Download server changes        |

---

## 7. Security Architecture

### Transport Security

- HTTPS enforced via Nginx with Let's Encrypt SSL certificates
- HTTP-to-HTTPS redirect configured by Certbot
- Auto-renewal via `certbot.timer` systemd timer

### HTTP Security Headers (via Helmet)

- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-XSS-Protection: 1; mode=block` - XSS filter
- `Referrer-Policy: no-referrer-when-downgrade`
- Content Security Policy configured for application needs

### Authentication Security

- Passwords hashed with **bcrypt** (cost factor 10)
- JWT tokens signed with **HMAC-SHA256**
- Token expiry: 7 days (access), 30 days (refresh)
- Failed login attempts are logged

### CORS

- Single-origin CORS policy (exact domain match)
- Credentials allowed for cookie-based auth flows
- Configured via `CORS_ORIGIN` environment variable

### Rate Limiting

- Default: 100 requests per 15-minute window
- Configurable via `RATE_LIMIT_*` environment variables

### Data Encryption

- Optional field-level encryption via `ENCRYPTION_KEY`
- Used for sensitive data fields (configurable per use case)
- AES-based encryption

### Process Security (systemd)

- `NoNewPrivileges=true` - No privilege escalation
- `ProtectSystem=full` - Read-only system directories
- `ProtectHome=true` - No home directory access
- `PrivateTmp=true` - Isolated /tmp
- `MemoryMax=512M` - Memory ceiling
- `TasksMax=256` - Process limit

---

## 8. Email and Notifications

### Configuration

Email is sent via SMTP using Nodemailer. Configuration via environment variables:

- `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

### Confirmation Types

Three types of configurable confirmation emails:

| Type       | Trigger                        | Template Variables                        |
|------------|--------------------------------|-------------------------------------------|
| Purchase   | New transaction created        | `{{transaction_number}}`, `{{material}}`, `{{weight}}`, `{{amount}}`, `{{waste_picker}}`, `{{location}}` |
| Sale       | New sale created               | `{{sale_number}}`, `{{material}}`, `{{weight}}`, `{{amount}}`, `{{client}}`, `{{location}}` |
| Delivery   | Sale marked as delivered       | `{{sale_number}}`, `{{vehicle_type}}`, `{{registration_number}}`, `{{driver_name}}`, `{{driver_id_card}}`, `{{delivery_notes}}` |

### Template System

- Templates stored in `app_settings` table (category: `confirmations`)
- Placeholder syntax: `{{variable_name}}`
- Each type has: enable/disable toggle, recipient field, subject template, body template
- Configurable via Admin Panel > Confirmations tab

---

## 9. Reporting and Analytics

### Dashboard Metrics

The Dashboard (`Dashboard.tsx`) displays:
- Total transactions count and weight
- Revenue summary
- Recent transactions (with material name, transaction number, weight, amount, status)
- Low stock alerts (materials below 10 kg threshold, aggregated across locations)

### Report Types

- **Transaction Summary** - Aggregated by material, location, and time period
- **Inventory Status** - Current stock levels with location breakdown
- **Waste Picker Performance** - Collection volumes and earnings per collector

### Export Formats

- **PDF** - Generated server-side via PDFKit
- **Excel** - Generated server-side via ExcelJS
- **Print** - Browser print via CSS `@media print` rules

### Scheduled Reports

- Configured via Admin Panel > Schedules tab
- Uses cron expression syntax (e.g., `0 8 * * 1` for Mondays at 8 AM)
- Executed by `node-cron` scheduler in the backend
- Reports can be emailed to configured recipients

---

## 10. Infrastructure

### 10.1 Production Architecture

Single-VM deployment with three systemd-managed services:

1. **PostgreSQL** (`postgresql.service`) - Database
2. **Recycling API** (`recycling-api.service`) - Backend Node.js process
3. **Nginx** (`nginx.service`) - Reverse proxy and static file server

A systemd target (`recycling.target`) groups all services for unified management:
```bash
sudo systemctl start recycling.target   # Start all
sudo systemctl stop recycling.target    # Stop all
```

### 10.2 Process Management

The `recycling-api.service` systemd unit provides:

- **Auto-restart**: Restarts on failure with 5-second delay
- **Start limit**: Max 10 restarts in 120 seconds
- **Port cleanup**: `ExecStartPre` kills any process on port 5000 before starting
- **Dependency ordering**: Starts after PostgreSQL is ready
- **Graceful shutdown**: `SIGTERM` with 10-second timeout, then `SIGKILL`
- **Environment**: Loads from `.env` file via `EnvironmentFile`

The Node.js application handles `SIGTERM` and `SIGINT` for graceful shutdown, closing the HTTP server and database pool.

### 10.3 Reverse Proxy

Nginx handles:

- **SSL termination** with Let's Encrypt certificates
- **Static file serving** from `frontend/dist/` with cache headers:
  - Static assets (JS, CSS, images): 1-year cache with `immutable`
  - JSON/manifest files: 1-day cache
  - HTML: no-cache (for SPA updates)
- **API proxy** to `http://localhost:5000` for `/api/*` requests
- **SPA fallback**: `try_files $uri $uri/ /index.html`
- **Gzip compression**: Level 6 for text, CSS, JS, JSON
- **Security headers**: Frame options, content type, XSS protection
- **Upload limit**: 10 MB `client_max_body_size`

### 10.4 Docker Support

A `docker-compose.yml` provides an alternative containerized deployment:

**Services:**
- `postgres` (postgres:15-alpine) - Database with persistent volume
- `backend` (custom multi-stage build) - API server
- `frontend` (custom build with nginx:alpine) - Static file server
- `nginx` (nginx:alpine, optional) - Reverse proxy

The backend Dockerfile uses a two-stage build:
1. **Builder**: Full `npm ci` (with devDeps) + TypeScript compilation
2. **Production**: `npm ci --only=production` + compiled `dist/`

---

## 11. Build and Deployment Pipeline

### Backend Build

```
TypeScript source (src/) --> tsc --> JavaScript (dist/) --> node dist/server.js
```

- **Module system**: CommonJS (for Node.js compatibility)
- **Target**: ES2020
- **Strict mode**: Enabled
- **Source maps**: Generated for debugging

### Frontend Build

```
TSX/CSS source (src/) --> Vite --> Optimized bundle (dist/) --> Served by Nginx
```

- **Module system**: ESNext (browser ES modules)
- **Target**: ES2020
- **Code splitting**: Automatic per-route chunks
- **CSS**: Tailwind CSS compiled and purged
- **PWA assets**: Service worker and manifest generated
- **Path aliases**: `@/` maps to `./src/`

### Deployment Scripts

| Script              | Trigger           | Actions                                          |
|---------------------|-------------------|--------------------------------------------------|
| `deploy.sh`         | First install     | System setup, DB creation, app build, service install |
| `update.sh`         | Code update       | Backup, git pull, rebuild, migrate, restart      |
| `backup.sh`         | Manual/cron       | DB dump, file archive, rotation                  |
| `run-migrations.sh` | Part of update    | Track and apply pending SQL migrations           |

---

## 12. Logging and Monitoring

### Application Logging

**Winston** with multiple transports:

| Transport | Output          | Level    | Format              |
|-----------|-----------------|----------|---------------------|
| Console   | stdout/stderr   | Configurable | Colorized (dev), JSON (prod) |
| File      | `backend/logs/` | info+    | Timestamped JSON    |

**HTTP Request Logging** via Morgan:
- Development: `dev` format (concise, colorized)
- Production: `combined` format (Apache-style)

### systemd Journal

All stdout/stderr from the backend process goes to journald:

```bash
sudo journalctl -u recycling-api -f           # Live tail
sudo journalctl -u recycling-api --since today # Today's logs
```

### Health Monitoring

`GET /health` returns:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T10:30:00.000Z",
  "uptime": 86400.123,
  "database": "connected"
}
```

This endpoint is outside the `/api/v1` prefix for easy load balancer probing.

---

## 13. Performance Considerations

### Database

- **Connection pooling**: pg.Pool with 20 max connections (configurable)
- **Indexed queries**: UUID primary keys, unique indexes on lookup fields
- **Views**: Pre-joined views for common read paths avoid N+1 queries
- **Triggers**: Inventory updates are automatic (no application round-trips)
- **PostgreSQL tuning**: `init-database.sh` auto-configures based on available RAM (shared_buffers, effective_cache_size, work_mem)

### Backend

- **Gzip compression**: All JSON responses compressed
- **Streaming exports**: PDF and Excel reports generated on-the-fly
- **Memory limits**: systemd enforces 512 MB ceiling
- **Graceful shutdown**: In-flight requests complete before process exits
- **EADDRINUSE retry**: Backend retries port binding up to 3 times with 2-second delays

### Frontend

- **Code splitting**: Vite automatically splits per-route chunks
- **Tree shaking**: Dead code eliminated during build
- **Asset caching**: 1-year cache with content-hash filenames
- **PWA caching**: Service worker precaches static assets
- **API caching**: NetworkFirst strategy with 24-hour fallback
- **Lazy state**: Zustand stores are lightweight with minimal re-renders
