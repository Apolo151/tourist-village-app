# Users API Documentation

This document describes the Users API endpoints for the Tourist Village Management System.

## Base URL
```
/api/users
```

## Endpoints

### 1. List Users
**GET** `/api/users`

Get all users with filtering, sorting, and pagination.

#### Query Parameters
- `search` (string, optional): Search by name, email, or phone number
- `role` (string, optional): Filter by role (`super_admin`, `admin`, `owner`, `renter`)
- `is_active` (boolean, optional): Filter by active status (`true`, `false`)
- `village_id` (number, optional): Filter users by village (checks both responsible_village and user_villages table)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `sort_by` (string, optional): Sort field (`name`, `email`, `role`, `created_at`) (default: `name`)
- `sort_order` (string, optional): Sort order (`asc`, `desc`) (default: `asc`)

#### Example Request
```http
GET /api/users?search=john&role=owner&is_active=true&village_id=5&page=1&limit=10&sort_by=name&sort_order=asc
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "role": "owner",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  },
  "message": "Found 1 users"
}
```

### 2. Get User by ID
**GET** `/api/users/:id`

Get detailed information about a specific user.

#### Path Parameters
- `id` (number, required): User ID

#### Example Request
```http
GET /api/users/1
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "owner",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "User retrieved successfully"
}
```

### 3. Create User
**POST** `/api/users`

Create a new user.

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone_number": "+1234567890",
  "role": "owner"
}
```

#### Required Fields
- `name` (string): User's full name (max 100 characters)
- `email` (string): Valid email address (unique)
- `role` (string): One of `super_admin`, `admin`, `owner`, `renter`

#### Optional Fields
- `phone_number` (string): Phone number (max 20 characters)

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "owner",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "User created successfully"
}
```

### 4. Update User
**PUT** `/api/users/:id`

Update an existing user. At least one field must be provided.

#### Path Parameters
- `id` (number, required): User ID

#### Request Body (at least one field required)
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone_number": "+0987654321",
  "role": "admin"
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phone_number": "+0987654321",
    "role": "admin",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:45:00.000Z"
  },
  "message": "User updated successfully"
}
```

### 5. Delete User
**DELETE** `/api/users/:id`

Delete a user. Will fail if user owns apartments, has bookings, or created other records.

#### Path Parameters
- `id` (number, required): User ID

#### Example Response
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 6. Get User Statistics
**GET** `/api/users/:id/stats`

Get statistics for a specific user.

#### Path Parameters
- `id` (number, required): User ID

#### Example Response
```json
{
  "success": true,
  "data": {
    "owned_apartments": 3,
    "total_bookings": 15,
    "active_bookings": 2,
    "created_records": 45
  },
  "message": "User statistics retrieved successfully"
}
```

### 7. Get Users by Role
**GET** `/api/users/by-role/:role`

Get all users with a specific role.

#### Path Parameters
- `role` (string, required): One of `super_admin`, `admin`, `owner`, `renter`

#### Example Request
```http
GET /api/users/by-role/owner
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "role": "owner",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "phone_number": "+1234567891",
      "role": "owner",
      "created_at": "2024-01-16T09:15:00.000Z",
      "updated_at": "2024-01-16T09:15:00.000Z"
    }
  ],
  "message": "Found 2 users with role: owner"
}
```

### 8. Get User by Email
**GET** `/api/users/search/by-email/:email`

Get a user by their email address.

#### Path Parameters
- `email` (string, required): User's email address

#### Example Request
```http
GET /api/users/search/by-email/john.doe@example.com
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "owner",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "User retrieved successfully"
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email must be in valid format"
    }
  ]
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Not found",
  "message": "User not found"
}
```

### Conflict (409)
```json
{
  "success": false,
  "error": "Conflict",
  "message": "Cannot delete user who owns apartments. Please reassign or delete all apartments first."
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to create user"
}
```

## Business Rules

### User Creation
- Email must be unique across all users
- Email format must be valid
- Phone number format is validated if provided
- Role must be one of the predefined values

### User Updates
- Email uniqueness is enforced when changing email
- All validation rules apply to updated fields
- At least one field must be provided for update

### User Deletion
- Cannot delete user who owns apartments
- Cannot delete user who has bookings
- Cannot delete user who created other records
- Must first reassign or delete related data

### User Roles
- **super_admin**: Full system access
- **admin**: Administrative access to manage system
- **owner**: Apartment owner with limited access
- **renter**: Regular user who can rent apartments

## Usage in UI Pages

Based on the UI requirements, these endpoints support:

### Settings Page (Admin Only)
- **Manage Users Menu**: Use CRUD operations to add/edit/delete users
- **User Privileges**: Determine user access by role

### General System Usage
- **Apartment Ownership**: Users with role `owner` can own apartments
- **Booking Management**: Users can be owners or renters in bookings
- **Service Assignments**: Users can be assigned to service types/requests
- **Audit Trail**: All entities track who created them via `created_by` field 