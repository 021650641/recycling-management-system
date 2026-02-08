# Recycling Management System API Documentation

Comprehensive REST API for managing recycling operations.

## Base URL
```
http://localhost:3000/api
```

## Authentication

All API endpoints (except login and register) require JWT authentication.

Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "fullName": "Admin User"
  }
}
```

#### POST /auth/register
Register a new user (admin only).

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "fullName": "New User",
  "role": "operator"
}
```

### Transactions

#### GET /transactions
Retrieve all transactions with optional filters.

**Query Parameters:**
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `locationId` (optional): Filter by location
- `materialId` (optional): Filter by material
- `wastePickerId` (optional): Filter by waste picker
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
[
  {
    "id": 1,
    "transactionDate": "2024-01-15T10:30:00Z",
    "locationId": 1,
    "materialId": 2,
    "wastePickerId": 5,
    "apartmentId": 3,
    "clientId": null,
    "weightKg": 25.5,
    "pricePerKg": 15.00,
    "totalAmount": 382.50,
    "paymentStatus": "paid",
    "paymentMethod": "cash",
    "notes": "Good quality plastic",
    "createdBy": 1
  }
]
```

#### POST /transactions
Create a new transaction.

**Request Body:**
```json
{
  "locationId": 1,
  "materialId": 2,
  "wastePickerId": 5,
  "apartmentId": 3,
  "weightKg": 25.5,
  "pricePerKg": 15.00,
  "paymentStatus": "paid",
  "paymentMethod": "cash",
  "notes": "Good quality plastic"
}
```

#### GET /transactions/:id
Retrieve a specific transaction.

#### PUT /transactions/:id
Update a transaction.

#### DELETE /transactions/:id
Delete a transaction (soft delete).

### Inventory

#### GET /inventory
Retrieve current inventory levels.

**Query Parameters:**
- `locationId` (optional): Filter by location
- `materialId` (optional): Filter by material

**Response:**
```json
[
  {
    "id": 1,
    "locationId": 1,
    "materialId": 2,
    "currentQuantityKg": 150.5,
    "lastUpdated": "2024-01-15T14:30:00Z",
    "location": {
      "id": 1,
      "name": "Main Collection Center"
    },
    "material": {
      "id": 2,
      "name": "Plastic Bottles",
      "category": "Plastic"
    }
  }
]
```

#### POST /inventory/adjustment
Manually adjust inventory levels.

**Request Body:**
```json
{
  "locationId": 1,
  "materialId": 2,
  "adjustmentType": "removal",
  "quantityKg": 50.0,
  "reason": "Sold to recycling facility",
  "notes": "Batch #1234"
}
```

### Materials

#### GET /materials
Retrieve all materials.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Plastic Bottles",
    "category": "Plastic",
    "currentPricePerKg": 15.00,
    "description": "PET plastic bottles",
    "isActive": true
  }
]
```

#### POST /materials
Create a new material.

#### PUT /materials/:id
Update a material.

#### PUT /materials/:id/price
Update material pricing.

**Request Body:**
```json
{
  "newPrice": 18.00,
  "effectiveDate": "2024-02-01T00:00:00Z"
}
```

### Locations

#### GET /locations
Retrieve all locations.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main Collection Center",
    "address": "123 Main Street",
    "contactPerson": "John Doe",
    "contactPhone": "+1234567890",
    "isActive": true
  }
]
```

#### POST /locations
Create a new location.

#### PUT /locations/:id
Update a location.

### Waste Pickers

#### GET /waste-pickers
Retrieve all waste pickers.

**Response:**
```json
[
  {
    "id": 1,
    "fullName": "Maria Santos",
    "phone": "+1234567890",
    "email": "maria@example.com",
    "idNumber": "ID12345",
    "address": "456 Oak Street",
    "isActive": true,
    "registrationDate": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /waste-pickers
Register a new waste picker.

#### PUT /waste-pickers/:id
Update waste picker information.

### Apartments

#### GET /apartments
Retrieve all apartment complexes.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Sunset Apartments",
    "address": "789 Park Avenue",
    "contactPerson": "Jane Smith",
    "contactPhone": "+1234567890",
    "numberOfUnits": 50,
    "isActive": true
  }
]
```

#### POST /apartments
Register a new apartment complex.

#### PUT /apartments/:id
Update apartment information.

### Clients

#### GET /clients
Retrieve all clients (businesses buying recycled materials).

**Response:**
```json
[
  {
    "id": 1,
    "name": "Green Recycling Inc",
    "contactPerson": "Bob Johnson",
    "phone": "+1234567890",
    "email": "bob@greenrecycling.com",
    "address": "321 Industrial Road",
    "isActive": true
  }
]
```

### Reports

#### GET /reports/transactions-summary
Generate transaction summary report.

**Query Parameters:**
- `startDate` (required): Start date (ISO 8601)
- `endDate` (required): End date (ISO 8601)
- `locationId` (optional): Filter by location
- `materialId` (optional): Filter by material

**Response:**
```json
{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "summary": {
    "totalTransactions": 150,
    "totalWeightKg": 3250.5,
    "totalAmount": 48757.50,
    "averageWeightPerTransaction": 21.67,
    "averageAmountPerTransaction": 325.05
  },
  "byMaterial": [
    {
      "materialId": 1,
      "materialName": "Plastic Bottles",
      "transactions": 75,
      "weightKg": 1875.0,
      "amount": 28125.00
    }
  ],
  "byLocation": [
    {
      "locationId": 1,
      "locationName": "Main Center",
      "transactions": 100,
      "weightKg": 2150.0,
      "amount": 32250.00
    }
  ]
}
```

#### GET /reports/inventory-status
Generate inventory status report.

**Response:**
```json
[
  {
    "locationId": 1,
    "locationName": "Main Center",
    "materialId": 1,
    "materialName": "Plastic Bottles",
    "currentQuantityKg": 250.5,
    "lastUpdated": "2024-01-15T14:30:00Z",
    "monthlyChange": 125.0
  }
]
```

#### GET /reports/waste-picker-performance
Generate waste picker performance report.

**Query Parameters:**
- `startDate` (required)
- `endDate` (required)
- `wastePickerId` (optional)

**Response:**
```json
[
  {
    "wastePickerId": 1,
    "wastePicker Name": "Maria Santos",
    "totalTransactions": 45,
    "totalWeightKg": 982.5,
    "totalEarned": 14737.50,
    "averageWeightPerTransaction": 21.83
  }
]
```

### Sync

#### POST /sync/upload
Upload offline changes for synchronization.

**Request Body:**
```json
{
  "deviceId": "device-uuid-123",
  "lastSync": "2024-01-15T10:00:00Z",
  "changes": [
    {
      "table": "transactions",
      "operation": "insert",
      "data": { ... },
      "clientTimestamp": "2024-01-15T10:05:00Z",
      "clientId": "temp-id-1"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "applied": 5,
  "conflicts": [],
  "idMappings": {
    "temp-id-1": 123
  }
}
```

#### GET /sync/download
Download server changes since last sync.

**Query Parameters:**
- `deviceId` (required)
- `lastSync` (required): Last sync timestamp (ISO 8601)

**Response:**
```json
{
  "serverTimestamp": "2024-01-15T14:30:00Z",
  "changes": [
    {
      "table": "transactions",
      "operation": "update",
      "id": 123,
      "data": { ... },
      "serverTimestamp": "2024-01-15T14:25:00Z"
    }
  ]
}
```

### Users

#### GET /users
Retrieve all users (admin only).

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "fullName": "Admin User",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /users
Create a new user (admin only).

#### PUT /users/:id
Update user information (admin only).

#### DELETE /users/:id
Deactivate a user (admin only, soft delete).

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Data conflict (e.g., duplicate)
- `500 Internal Server Error`: Server error

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated endpoints

## Pagination

Endpoints returning lists support pagination:
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Number of results to skip

**Response Headers:**
```
X-Total-Count: 250
X-Page-Limit: 50
X-Page-Offset: 0
```

## Versioning

The API version is included in the URL path:
```
/api/v1/...
```

Current version: v1

## Support

For API support, contact: support@example.com