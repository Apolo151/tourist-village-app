# Service Types API Documentation

This document describes the API endpoints for managing service types in the Tourist Village Management System.

## Base URL

```
http://localhost:3000/api/service-types
```

## Authentication

All endpoints require authentication using Bearer tokens in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Permission Requirements

- **Admin/Super Admin**: Full access to all service type operations
- **Other roles**: No access to service type management

---

## Endpoints

### 1. Get All Service Types

**GET** `/api/service-types`

Retrieve all service types with filtering, sorting, and pagination.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Search in name or description | `search=cleaning` |
| `currency` | string | Filter by currency (EGP/GBP) | `currency=EGP` |
| `min_cost` | number | Minimum cost filter | `min_cost=100` |
| `max_cost` | number | Maximum cost filter | `max_cost=500` |
| `page` | number | Page number (default: 1) | `page=2` |
| `limit` | number | Items per page (default: 10, max: 100) | `limit=20` |
| `sort_by` | string | Sort field (name, cost, currency, created_at, updated_at) | `sort_by=cost` |
| `sort_order` | string | Sort order (asc/desc, default: asc) | `sort_order=desc` |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/service-types?search=cleaning&currency=EGP&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Apartment Cleaning",
      "cost": 150.00,
      "currency": "EGP",
      "description": "Deep cleaning service for apartments",
      "default_assignee_id": 2,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z",
      "default_assignee": {
        "id": 2,
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin",
        "is_active": true
      },
      "created_by_user": {
        "id": 1,
        "name": "Super Admin",
        "email": "superadmin@example.com",
        "role": "super_admin",
        "is_active": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "total_pages": 1
  }
}
```

---

### 2. Get Service Type by ID

**GET** `/api/service-types/:id`

Retrieve a specific service type by its ID.

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/service-types/1" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Apartment Cleaning",
    "cost": 150.00,
    "currency": "EGP",
    "description": "Deep cleaning service for apartments",
    "default_assignee_id": 2,
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T10:00:00.000Z",
    "default_assignee": {
      "id": 2,
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "is_active": true
    }
  }
}
```

---

### 3. Create Service Type

**POST** `/api/service-types`

Create a new service type.

#### Request Body

```json
{
  "name": "Maintenance Service",
  "cost": 200.50,
  "currency": "EGP",
  "description": "General maintenance and repair service",
  "default_assignee_id": 3
}
```

#### Required Fields

- `name` (string): Service type name (max 100 characters)
- `cost` (number): Service cost (positive number, max 999,999.99)
- `currency` (string): Currency code (EGP or GBP)

#### Optional Fields

- `description` (string): Service description (max 1000 characters)
- `default_assignee_id` (number): Default assignee user ID (must be admin/super_admin)

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/service-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maintenance Service",
    "cost": 200.50,
    "currency": "EGP",
    "description": "General maintenance and repair service",
    "default_assignee_id": 3
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Maintenance Service",
    "cost": 200.50,
    "currency": "EGP",
    "description": "General maintenance and repair service",
    "default_assignee_id": 3,
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  },
  "message": "Service type created successfully"
}
```

---

### 4. Update Service Type

**PUT** `/api/service-types/:id`

Update an existing service type.

#### Request Body

```json
{
  "name": "Premium Cleaning Service",
  "cost": 175.00,
  "description": "Premium deep cleaning with additional services"
}
```

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/service-types/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Cleaning Service",
    "cost": 175.00,
    "description": "Premium deep cleaning with additional services"
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Premium Cleaning Service",
    "cost": 175.00,
    "currency": "EGP",
    "description": "Premium deep cleaning with additional services",
    "default_assignee_id": 2,
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T11:30:00.000Z"
  },
  "message": "Service type updated successfully"
}
```

---

### 5. Delete Service Type

**DELETE** `/api/service-types/:id`

Delete a service type. Cannot delete if there are existing service requests using this type.

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/service-types/1" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "message": "Service type deleted successfully"
}
```

---

### 6. Get Service Type Statistics

**GET** `/api/service-types/stats`

Get statistics about service types.

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/service-types/stats" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "total_service_types": 5,
    "by_currency": [
      {
        "currency": "EGP",
        "count": 3,
        "avg_cost": 175.50
      },
      {
        "currency": "GBP",
        "count": 2,
        "avg_cost": 25.75
      }
    ],
    "most_used": [
      {
        "id": 1,
        "name": "Apartment Cleaning",
        "usage_count": 15
      },
      {
        "id": 2,
        "name": "Maintenance Service",
        "usage_count": 8
      }
    ]
  }
}
```

---

## Error Responses

### Validation Errors (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Service type name is required and must be a non-empty string"
    },
    {
      "field": "cost",
      "message": "Cost is required and must be a positive number"
    }
  ]
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "Service type not found"
}
```

### Conflict (409)

```json
{
  "success": false,
  "message": "Service type with this name already exists"
}
```

```json
{
  "success": false,
  "message": "Cannot delete service type with existing service requests. Please remove all related service requests first."
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Access token is required"
}
```

### Forbidden (403)

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied. Required role: admin or super_admin"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Failed to create service type",
  "error": "Database connection error"
}
```

---

## Notes

1. **Permissions**: Only admins and super admins can manage service types
2. **Deletion Constraints**: Service types cannot be deleted if they have related service requests
3. **Default Assignee**: Must be a user with admin or super_admin role
4. **Cost Validation**: Must be a positive number with up to 2 decimal places
5. **Currency**: Currently supports EGP (Egyptian Pound) and GBP (British Pound)
6. **Pagination**: Default limit is 10, maximum is 100 items per page
7. **Search**: Searches in both name and description fields (case-insensitive) 