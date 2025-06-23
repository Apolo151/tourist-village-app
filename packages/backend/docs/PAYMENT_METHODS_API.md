# Payment Methods API Documentation

This document describes the Payment Methods API endpoints for the Tourist Village Management System.

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Error Responses](#error-responses)

## Overview

The Payment Methods API allows management of different payment methods that can be used for transactions in the system. Payment methods represent various ways payments can be made (e.g., Cash, Bank Transfer, Credit Card, etc.).

### Base URL
```
/api/payment-methods
```

### Content Type
All requests and responses use `application/json`.

## Authentication

All endpoints require authentication. Include the Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Role-based Access:
- **Admin/Super Admin**: Full access to all payment method operations
- **Owner/Renter**: No direct access to payment method management (read-only through payment creation)

## Endpoints

### 1. Get All Payment Methods

**GET** `/api/payment-methods`

Retrieve a paginated list of payment methods with filtering options.

**Access:** Admin, Super Admin only

**Query Parameters:**
- `created_by` (number, optional): Filter by creator user ID
- `search` (string, optional): Search in payment method name and creator name
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `sort_by` (string, optional): Sort field (name, created_at, updated_at) (default: name)
- `sort_order` (string, optional): Sort order (asc, desc) (default: asc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bank Transfer",
      "created_by": 1,
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z",
      "usage_count": 25,
      "created_by_user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com",
        "phone_number": null,
        "role": "admin",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  }
}
```

### 2. Get Payment Method Statistics

**GET** `/api/payment-methods/stats`

Get comprehensive statistics about payment methods and their usage.

**Access:** Admin, Super Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "total_methods": 5,
    "most_used": [
      {
        "id": 1,
        "name": "Bank Transfer",
        "usage_count": 25
      },
      {
        "id": 2,
        "name": "Cash",
        "usage_count": 18
      }
    ],
    "least_used": [
      {
        "id": 5,
        "name": "Crypto",
        "usage_count": 1
      },
      {
        "id": 4,
        "name": "PayPal",
        "usage_count": 3
      }
    ],
    "unused_methods": [
      {
        "id": 6,
        "name": "Check"
      }
    ]
  }
}
```

### 3. Get Payment Method by ID

**GET** `/api/payment-methods/{id}`

Retrieve a specific payment method by its ID.

**Access:** Admin, Super Admin only

**Path Parameters:**
- `id` (number): Payment method ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Bank Transfer",
    "created_by": 1,
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z",
    "usage_count": 25,
    "created_by_user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "phone_number": null,
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. Create Payment Method

**POST** `/api/payment-methods`

Create a new payment method.

**Access:** Admin, Super Admin only

**Request Body:**
```json
{
  "name": "Credit Card"
}
```

**Validation Rules:**
- `name`: Required, string, 1-100 characters, must be unique (case-insensitive)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Credit Card",
    "created_by": 1,
    "created_at": "2024-01-01T11:00:00.000Z",
    "updated_at": "2024-01-01T11:00:00.000Z",
    "usage_count": 0,
    "created_by_user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "phone_number": null,
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Payment method created successfully"
}
```

### 5. Update Payment Method

**PUT** `/api/payment-methods/{id}`

Update an existing payment method.

**Access:** Admin, Super Admin only

**Path Parameters:**
- `id` (number): Payment method ID

**Request Body:**
```json
{
  "name": "Updated Payment Method Name"
}
```

**Validation Rules:**
- `name`: Optional, string, 1-100 characters, must be unique (case-insensitive)
- At least one field must be provided

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Updated Payment Method Name",
    "created_by": 1,
    "created_at": "2024-01-01T11:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z",
    "usage_count": 5,
    "created_by_user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "phone_number": null,
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Payment method updated successfully"
}
```

### 6. Delete Payment Method

**DELETE** `/api/payment-methods/{id}`

Delete a payment method. Payment methods that are referenced by existing payments cannot be deleted.

**Access:** Admin, Super Admin only

**Path Parameters:**
- `id` (number): Payment method ID

**Response:**
```json
{
  "success": true,
  "message": "Payment method deleted successfully"
}
```

## Data Models

### PaymentMethod
```typescript
{
  id: number;
  name: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  usage_count?: number;
  created_by_user?: PublicUser;
}
```

### CreatePaymentMethodRequest
```typescript
{
  name: string;
}
```

### UpdatePaymentMethodRequest
```typescript
{
  name?: string;
}
```

### PaymentMethodFilters
```typescript
{
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Payment method name is required and must be a non-empty string"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Access token is required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Not found",
  "message": "Payment method not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Conflict",
  "message": "Cannot delete payment method that is being used in payments"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to create payment method"
}
```

## Usage Examples

### Create a Payment Method
```bash
curl -X POST http://localhost:3000/api/payment-methods \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile Wallet"
  }'
```

### Get Payment Methods with Search
```bash
curl -X GET "http://localhost:3000/api/payment-methods?search=bank&page=1&limit=10" \
  -H "Authorization: Bearer your-jwt-token"
```

### Update a Payment Method
```bash
curl -X PUT http://localhost:3000/api/payment-methods/1 \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bank Wire Transfer"
  }'
```

### Get Payment Method Statistics
```bash
curl -X GET http://localhost:3000/api/payment-methods/stats \
  -H "Authorization: Bearer your-jwt-token"
```

## Business Rules

1. **Name Uniqueness**: Payment method names must be unique (case-insensitive)
2. **Deletion Constraints**: Payment methods that are referenced by existing payments cannot be deleted
3. **Admin Only**: Only admins and super admins can manage payment methods
4. **Usage Tracking**: System tracks how many times each payment method has been used
5. **Search Functionality**: Search works across payment method names and creator names
6. **Audit Trail**: All payment methods track who created them and when they were last updated 