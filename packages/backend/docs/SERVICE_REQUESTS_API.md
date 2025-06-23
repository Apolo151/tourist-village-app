# Service Requests API Documentation

This document describes the API endpoints for managing service requests in the Tourist Village Management System.

## Base URL

```
http://localhost:3000/api/service-requests
```

## Authentication

All endpoints require authentication using Bearer tokens in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Permission Requirements

- **Admin/Super Admin**: Full access to all service requests
- **Owner**: Can create, view, and update service requests for their apartments
- **Renter**: Can create, view, and update service requests they created
- **Assignee**: Can view and update service requests assigned to them

---

## Endpoints

### 1. Get All Service Requests

**GET** `/api/service-requests`

Retrieve all service requests with filtering, sorting, and pagination.

#### Access Control
- **Admins/Super Admins**: See all service requests
- **Owners**: Only see requests for their apartments or that they created
- **Renters**: Only see requests they created

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `type_id` | number | Filter by service type ID | `type_id=1` |
| `apartment_id` | number | Filter by apartment ID | `apartment_id=5` |
| `booking_id` | number | Filter by booking ID | `booking_id=10` |
| `requester_id` | number | Filter by requester user ID | `requester_id=3` |
| `assignee_id` | number | Filter by assignee user ID | `assignee_id=2` |
| `status` | string | Filter by status | `status=pending` |
| `who_pays` | string | Filter by who pays (owner/renter/company) | `who_pays=owner` |
| `date_action_start` | string | Filter by action date (start) | `date_action_start=2024-01-01` |
| `date_action_end` | string | Filter by action date (end) | `date_action_end=2024-01-31` |
| `date_created_start` | string | Filter by creation date (start) | `date_created_start=2024-01-01` |
| `date_created_end` | string | Filter by creation date (end) | `date_created_end=2024-01-31` |
| `village_id` | number | Filter by village ID | `village_id=1` |
| `search` | string | Search in service type, apartment, village, notes, or user names | `search=cleaning` |
| `page` | number | Page number (default: 1) | `page=2` |
| `limit` | number | Items per page (default: 10, max: 100) | `limit=20` |
| `sort_by` | string | Sort field (date_created, date_action, status, service_type_name, apartment_name, village_name) | `sort_by=date_created` |
| `sort_order` | string | Sort order (asc/desc, default: desc) | `sort_order=asc` |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/service-requests?status=pending&village_id=1&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type_id": 1,
      "apartment_id": 5,
      "booking_id": 10,
      "requester_id": 3,
      "date_action": "2024-01-20T14:00:00.000Z",
      "date_created": "2024-01-15T10:00:00.000Z",
      "status": "pending",
      "who_pays": "owner",
      "notes": "Need deep cleaning before next booking",
      "assignee_id": 2,
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z",
      "service_type": {
        "id": 1,
        "name": "Apartment Cleaning",
        "cost": 150.00,
        "currency": "EGP",
        "description": "Deep cleaning service for apartments"
      },
      "apartment": {
        "id": 5,
        "name": "A101",
        "phase": 1,
        "paying_status": "transfer",
        "village": {
          "id": 1,
          "name": "Sunset Village",
          "electricity_price": 1.2,
          "water_price": 5.0,
          "phases": 3
        },
        "owner": {
          "id": 4,
          "name": "John Doe",
          "email": "john@example.com",
          "role": "owner",
          "is_active": true
        }
      },
      "booking": {
        "id": 10,
        "arrival_date": "2024-01-25T14:00:00.000Z",
        "leaving_date": "2024-02-01T11:00:00.000Z",
        "status": "not_arrived",
        "user_type": "renter"
      },
      "requester": {
        "id": 3,
        "name": "Jane Smith",
        "email": "jane@example.com",
        "role": "renter",
        "is_active": true
      },
      "assignee": {
        "id": 2,
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin",
        "is_active": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

---

### 2. Get Service Request by ID

**GET** `/api/service-requests/:id`

Retrieve a specific service request by its ID.

#### Access Control
- **Admins/Super Admins**: Can view any service request
- **Users**: Can only view requests they created, are assigned to, or are apartment owners

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/service-requests/1" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "type_id": 1,
    "apartment_id": 5,
    "booking_id": 10,
    "requester_id": 3,
    "date_action": "2024-01-20T14:00:00.000Z",
    "date_created": "2024-01-15T10:00:00.000Z",
    "status": "pending",
    "who_pays": "owner",
    "notes": "Need deep cleaning before next booking",
    "assignee_id": 2,
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T10:00:00.000Z",
    "service_type": {
      "id": 1,
      "name": "Apartment Cleaning",
      "cost": 150.00,
      "currency": "EGP",
      "description": "Deep cleaning service for apartments"
    },
    "apartment": {
      "id": 5,
      "name": "A101",
      "village_id": 1,
      "phase": 1,
      "owner_id": 4,
      "paying_status": "transfer",
      "village": {
        "id": 1,
        "name": "Sunset Village",
        "electricity_price": 1.2,
        "water_price": 5.0,
        "phases": 3
      },
      "owner": {
        "id": 4,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "owner",
        "is_active": true
      }
    }
  }
}
```

---

### 3. Create Service Request

**POST** `/api/service-requests`

Create a new service request.

#### Access Control
- **All authenticated users**: Can create service requests
- **Non-admin users**: Can only create requests for themselves (requester_id is forced to current user)

#### Request Body

```json
{
  "type_id": 1,
  "apartment_id": 5,
  "booking_id": 10,
  "requester_id": 3,
  "date_action": "2024-01-20T14:00:00.000Z",
  "status": "pending",
  "who_pays": "owner",
  "notes": "Need deep cleaning before next booking",
  "assignee_id": 2
}
```

#### Required Fields

- `type_id` (number): Service type ID (must exist)
- `apartment_id` (number): Apartment ID (must exist)
- `requester_id` (number): Requester user ID (must exist)
- `who_pays` (string): Who pays for the service (owner/renter/company)

#### Optional Fields

- `booking_id` (number): Related booking ID (must belong to the apartment)
- `date_action` (string): When the service should be performed (ISO date string)
- `status` (string): Request status (default: "pending")
- `notes` (string): Additional notes (max 2000 characters)
- `assignee_id` (number): Assigned user ID (must be admin/super_admin)

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/service-requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type_id": 1,
    "apartment_id": 5,
    "booking_id": 10,
    "requester_id": 3,
    "date_action": "2024-01-20T14:00:00.000Z",
    "who_pays": "owner",
    "notes": "Need deep cleaning before next booking"
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 2,
    "type_id": 1,
    "apartment_id": 5,
    "booking_id": 10,
    "requester_id": 3,
    "date_action": "2024-01-20T14:00:00.000Z",
    "date_created": "2024-01-15T11:00:00.000Z",
    "status": "pending",
    "who_pays": "owner",
    "notes": "Need deep cleaning before next booking",
    "assignee_id": 2,
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  },
  "message": "Service request created successfully"
}
```

---

### 4. Update Service Request

**PUT** `/api/service-requests/:id`

Update an existing service request.

#### Access Control
- **Admins/Super Admins**: Can update any field of any service request
- **Other users**: Can only update requests they created, are assigned to, or are apartment owners
- **Non-admin users**: Can only update `notes` and `status` fields

#### Request Body

```json
{
  "status": "in_progress",
  "notes": "Cleaning started, estimated completion in 2 hours",
  "date_action": "2024-01-20T16:00:00.000Z"
}
```

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/service-requests/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "notes": "Cleaning completed successfully"
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "type_id": 1,
    "apartment_id": 5,
    "booking_id": 10,
    "requester_id": 3,
    "date_action": "2024-01-20T14:00:00.000Z",
    "date_created": "2024-01-15T10:00:00.000Z",
    "status": "completed",
    "who_pays": "owner",
    "notes": "Cleaning completed successfully",
    "assignee_id": 2,
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-20T16:30:00.000Z"
  },
  "message": "Service request updated successfully"
}
```

---

### 5. Delete Service Request

**DELETE** `/api/service-requests/:id`

Delete a service request.

#### Access Control
- **Admins/Super Admins**: Can delete any service request
- **Other users**: Can only delete requests they created

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/service-requests/1" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "message": "Service request deleted successfully"
}
```

---

### 6. Get Service Request Statistics

**GET** `/api/service-requests/stats`

Get statistics about service requests.

#### Access Control
- **Admin/Super Admin only**

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/service-requests/stats" \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "total_requests": 150,
    "by_status": [
      {
        "status": "pending",
        "count": 45
      },
      {
        "status": "in_progress",
        "count": 20
      },
      {
        "status": "completed",
        "count": 80
      },
      {
        "status": "cancelled",
        "count": 5
      }
    ],
    "by_who_pays": [
      {
        "who_pays": "owner",
        "count": 90
      },
      {
        "who_pays": "renter",
        "count": 35
      },
      {
        "who_pays": "company",
        "count": 25
      }
    ],
    "by_service_type": [
      {
        "type_name": "Apartment Cleaning",
        "count": 60
      },
      {
        "type_name": "Maintenance Service",
        "count": 40
      },
      {
        "type_name": "Garden Care",
        "count": 30
      }
    ],
    "total_cost_estimate": {
      "EGP": 25750.00,
      "GBP": 850.50
    }
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
      "field": "type_id",
      "message": "Service type ID is required and must be a positive number"
    },
    {
      "field": "who_pays",
      "message": "Who pays is required and must be owner, renter, or company"
    }
  ]
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "Service request not found"
}
```

```json
{
  "success": false,
  "message": "Service type not found"
}
```

### Forbidden (403)

```json
{
  "success": false,
  "message": "You do not have permission to view this service request"
}
```

```json
{
  "success": false,
  "message": "You can only update the following fields: notes, status"
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

### Server Error (500)

```json
{
  "success": false,
  "message": "Failed to create service request",
  "error": "Database connection error"
}
```

---

## Notes

1. **Access Control**: Service requests have role-based and ownership-based access control
2. **Auto-Assignment**: If no assignee is specified, the default assignee from the service type is used
3. **Booking Validation**: If a booking_id is provided, it must belong to the specified apartment
4. **Status Management**: Common statuses include "pending", "in_progress", "completed", "cancelled"
5. **Date Filtering**: All date filters accept ISO date strings (YYYY-MM-DD or full ISO datetime)
6. **Search Functionality**: Searches across service type names, apartment names, village names, notes, and user names
7. **Cost Estimation**: Statistics include total estimated costs based on service type prices
8. **Pagination**: Default limit is 10, maximum is 100 items per page
9. **Field Restrictions**: Non-admin users can only update specific fields (notes, status)
10. **Relationship Integrity**: All foreign key references are validated before creation/update 