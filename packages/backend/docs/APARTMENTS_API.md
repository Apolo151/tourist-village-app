# Apartments API Documentation

## Overview

The Apartments API provides endpoints to manage apartments in the Tourist Village Management System. It supports CRUD operations, filtering, searching, sorting, pagination, and financial calculations.

## Base URL

```
http://localhost:3000/api/apartments
```

## Authentication

Currently, no authentication is required. Authentication will be added in future versions.

## Endpoints

### 1. List Apartments

**GET** `/api/apartments`

Retrieve a paginated list of apartments with optional filtering and sorting.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (default: 1) | `?page=2` |
| `limit` | integer | No | Items per page (default: 10, max: 100) | `?limit=20` |
| `village_id` | integer | No | Filter by village ID | `?village_id=1` |
| `phase` | integer | No | Filter by phase number | `?phase=2` |
| `status` | string | No | Filter by occupancy status | `?status=Available` |
| `paying_status` | string | No | Filter by paying status | `?paying_status=transfer` |
| `search` | string | No | Search in apartment name or owner name | `?search=apartment` |
| `sort_by` | string | No | Sort field (default: name) | `?sort_by=purchase_date` |
| `sort_order` | string | No | Sort order: asc/desc (default: asc) | `?sort_order=desc` |

#### Valid Values

- **status**: `Available`, `Occupied by Owner`, `Occupied By Renter`
- **paying_status**: `transfer`, `rent`, `non-payer`
- **sort_by**: `name`, `phase`, `purchase_date`, `paying_status`, `owner_name`, `village_name`, `created_at`

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "A101",
      "village_id": 1,
      "phase": 1,
      "owner_id": 2,
      "purchase_date": "2023-01-15T00:00:00.000Z",
      "paying_status": "transfer",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z",
      "village": {
        "id": 1,
        "name": "Sharm",
        "electricity_price": 0.75,
        "gas_price": 0.50,
        "phases": 3
      },
      "owner": {
        "id": 2,
        "name": "John Doe",
        "email": "john@example.com",
        "phone_number": "+1234567890",
        "role": "owner"
      },
      "status": "Available"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  },
  "message": "Found 25 apartments"
}
```

### 2. Get Apartment Details

**GET** `/api/apartments/:id`

Retrieve detailed information about a specific apartment.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Apartment ID |

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "A101",
    "village_id": 1,
    "phase": 1,
    "owner_id": 2,
    "purchase_date": "2023-01-15T00:00:00.000Z",
    "paying_status": "transfer",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z",
    "village": {
      "id": 1,
      "name": "Sharm",
      "electricity_price": 0.75,
      "gas_price": 0.50,
      "phases": 3
    },
    "owner": {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "role": "owner"
    },
    "status": "Occupied by Owner",
    "current_booking": {
      "id": 5,
      "apartment_id": 1,
      "user_id": 2,
      "user_type": "owner",
      "arrival": "2024-01-01T14:00:00.000Z",
      "leaving": "2024-01-07T12:00:00.000Z",
      "status": "in_village",
      "notes": "Family vacation"
    }
  },
  "message": "Apartment retrieved successfully"
}
```

### 3. Create Apartment

**POST** `/api/apartments`

Create a new apartment.

#### Request Body

```json
{
  "name": "A101",
  "village_id": 1,
  "phase": 1,
  "owner_id": 2,
  "purchase_date": "2023-01-15",
  "paying_status": "transfer"
}
```

#### Required Fields

- `name` (string): Apartment name/number
- `village_id` (integer): ID of the village
- `phase` (integer): Phase number within the village
- `owner_id` (integer): ID of the owner (must be a user with role 'owner')
- `paying_status` (string): One of 'transfer', 'rent', 'non-payer'

#### Optional Fields

- `purchase_date` (string): Purchase date in YYYY-MM-DD format

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "A101",
    "village_id": 1,
    "phase": 1,
    "owner_id": 2,
    "purchase_date": "2023-01-15T00:00:00.000Z",
    "paying_status": "transfer",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z",
    "village": { /* village details */ },
    "owner": { /* owner details */ },
    "status": "Available"
  },
  "message": "Apartment created successfully"
}
```

### 4. Update Apartment

**PUT** `/api/apartments/:id`

Update an existing apartment.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Apartment ID |

#### Request Body

```json
{
  "name": "A102",
  "phase": 2,
  "paying_status": "rent"
}
```

All fields are optional, but at least one field must be provided.

#### Response

```json
{
  "success": true,
  "data": {
    /* updated apartment details */
  },
  "message": "Apartment updated successfully"
}
```

### 5. Delete Apartment

**DELETE** `/api/apartments/:id`

Delete an apartment. Note: Cannot delete apartments with existing bookings.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Apartment ID |

#### Response

```json
{
  "success": true,
  "message": "Apartment deleted successfully"
}
```

### 6. Get Financial Summary

**GET** `/api/apartments/:id/financial-summary`

Get financial summary for an apartment including money spent, requested, and net balance.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Apartment ID |

#### Response

```json
{
  "success": true,
  "data": {
    "apartment_id": 1,
    "total_money_spent": {
      "EGP": 15000.00,
      "GBP": 500.00
    },
    "total_money_requested": {
      "EGP": 12000.00,
      "GBP": 300.00
    },
    "net_money": {
      "EGP": -3000.00,
      "GBP": -200.00
    }
  },
  "message": "Financial summary retrieved successfully"
}
```

### 7. Get Apartment Bookings

**GET** `/api/apartments/:id/bookings`

Get all bookings for a specific apartment.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Apartment ID |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "apartment_id": 1,
      "user_id": 2,
      "user_type": "owner",
      "arrival": "2024-01-01T14:00:00.000Z",
      "leaving": "2024-01-07T12:00:00.000Z",
      "status": "in_village",
      "notes": "Family vacation",
      "created_at": "2023-12-20T10:00:00.000Z",
      "updated_at": "2023-12-20T10:00:00.000Z",
      "user": {
        "id": 2,
        "name": "John Doe",
        "email": "john@example.com",
        "phone_number": "+1234567890"
      }
    }
  ],
  "message": "Found 1 bookings for apartment"
}
```

### 8. Get Apartment Status

**GET** `/api/apartments/:id/status`

Get current occupancy status of an apartment.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Apartment ID |

#### Response

```json
{
  "success": true,
  "data": {
    "status": "Occupied by Owner",
    "current_booking": {
      "id": 5,
      "apartment_id": 1,
      "user_id": 2,
      "user_type": "owner",
      "arrival": "2024-01-01T14:00:00.000Z",
      "leaving": "2024-01-07T12:00:00.000Z",
      "status": "in_village"
    }
  },
  "message": "Apartment status retrieved successfully"
}
```

## Error Responses

### Validation Errors (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Apartment name is required and must be a non-empty string"
    }
  ]
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": "Not found",
  "message": "Apartment not found"
}
```

### Conflict (409)

```json
{
  "success": false,
  "error": "Conflict",
  "message": "Cannot delete apartment with existing bookings"
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to fetch apartments"
}
```

## Example Usage

### Filter apartments by village and status

```bash
GET /api/apartments?village_id=1&status=Available&page=1&limit=10
```

### Search apartments

```bash
GET /api/apartments?search=john&sort_by=name&sort_order=asc
```

### Create a new apartment

```bash
POST /api/apartments
Content-Type: application/json

{
  "name": "B205",
  "village_id": 2,
  "phase": 2,
  "owner_id": 15,
  "purchase_date": "2024-01-15",
  "paying_status": "transfer"
}
```

### Update apartment paying status

```bash
PUT /api/apartments/1
Content-Type: application/json

{
  "paying_status": "rent"
}
```

## Notes

- All dates are returned in ISO 8601 format
- Apartment status is calculated dynamically based on current bookings
- Financial calculations include all payments and service requests for the apartment
- Phase validation ensures the phase number is within the village's phase range
- Owner validation ensures the user exists and has the 'owner' role 