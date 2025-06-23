# Bookings API Testing Guide

This document provides curl commands to test all booking endpoints.

## Prerequisites

1. Start the backend server:
```bash
cd packages/backend
npm run dev
```

2. Get an authentication token by logging in:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

Save the `access_token` from the response and use it in the `Authorization` header for subsequent requests.

## Environment Variables
```bash
# Set these variables for easier testing
export API_BASE="http://localhost:3000/api"
export TOKEN="your_access_token_here"
```

## Booking Endpoints

### 1. Get All Bookings (with filtering and pagination)

**Basic request:**
```bash
curl -X GET "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN"
```

**With pagination:**
```bash
curl -X GET "$API_BASE/bookings?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

**With filters:**
```bash
# Filter by apartment
curl -X GET "$API_BASE/bookings?apartment_id=1" \
  -H "Authorization: Bearer $TOKEN"

# Filter by user type
curl -X GET "$API_BASE/bookings?user_type=renter" \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "$API_BASE/bookings?status=not_arrived" \
  -H "Authorization: Bearer $TOKEN"

# Filter by village
curl -X GET "$API_BASE/bookings?village_id=1" \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl -X GET "$API_BASE/bookings?arrival_date_start=2024-01-01&arrival_date_end=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"

# Search bookings
curl -X GET "$API_BASE/bookings?search=apartment" \
  -H "Authorization: Bearer $TOKEN"

# Combined filters with sorting
curl -X GET "$API_BASE/bookings?user_type=renter&status=in_village&sort_by=arrival_date&sort_order=asc&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Get Booking Statistics

```bash
curl -X GET "$API_BASE/bookings/stats" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Bookings by Apartment

```bash
curl -X GET "$API_BASE/bookings/apartment/1" \
  -H "Authorization: Bearer $TOKEN"

# With pagination
curl -X GET "$API_BASE/bookings/apartment/1?page=1&limit=5&sort_by=arrival_date&sort_order=desc" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Bookings by User

```bash
curl -X GET "$API_BASE/bookings/user/1" \
  -H "Authorization: Bearer $TOKEN"

# With pagination
curl -X GET "$API_BASE/bookings/user/1?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Get Booking by ID

```bash
curl -X GET "$API_BASE/bookings/1" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Get Booking with Related Data

```bash
curl -X GET "$API_BASE/bookings/1/related" \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Create a New Booking

**Note**: The `user_type` field is now **optional** when creating bookings. The system automatically determines the user type based on apartment ownership:
- If the `user_id` matches the apartment's `owner_id` → `user_type` is set to `"owner"`
- If the `user_id` does NOT match the apartment's `owner_id` → `user_type` is set to `"renter"`

This means that even users with "owner" role in the system will be treated as "renter" when booking someone else's apartment.

If you provide `user_type` explicitly, it will be validated against the apartment ownership to ensure consistency.

**Owner booking their own apartment (user_type automatically determined as "owner"):**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z",
    "status": "not_arrived",
    "notes": "Owner staying in their own apartment"
  }'
```

**Someone booking another person's apartment (user_type automatically determined as "renter"):**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-07-01T16:00:00.000Z",
    "leaving_date": "2024-07-10T10:00:00.000Z",
    "notes": "Renting someone else's apartment"
  }'
```

**Minimal booking (status defaults to "not_arrived", user_type auto-determined):**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 2,
    "user_id": 4,
    "arrival_date": "2024-08-01T15:00:00.000Z",
    "leaving_date": "2024-08-07T12:00:00.000Z"
  }'
```

**Optional: Explicit user_type (will be validated against apartment ownership):**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "owner",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z",
    "notes": "Explicit user_type example"
  }'
```

### 8. Update a Booking

**Update status:**
```bash
curl -X PUT "$API_BASE/bookings/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_village"
  }'
```

**Update dates:**
```bash
curl -X PUT "$API_BASE/bookings/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arrival_date": "2024-06-16T14:00:00.000Z",
    "leaving_date": "2024-06-26T11:00:00.000Z"
  }'
```

**Update multiple fields:**
```bash
curl -X PUT "$API_BASE/bookings/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "left",
    "notes": "Booking completed successfully"
  }'
```

**Change apartment:**
```bash
curl -X PUT "$API_BASE/bookings/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 2
  }'
```

### 9. Delete a Booking

```bash
curl -X DELETE "$API_BASE/bookings/1" \
  -H "Authorization: Bearer $TOKEN"
```

## Error Testing

### Test Validation Errors

**Missing required fields:**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1
  }'
```

**Invalid date format:**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "owner",
    "arrival_date": "invalid-date",
    "leaving_date": "2024-06-25T11:00:00.000Z"
  }'
```

**Leaving date before arrival date:**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "owner",
    "arrival_date": "2024-06-25T14:00:00.000Z",
    "leaving_date": "2024-06-15T11:00:00.000Z"
  }'
```

**Invalid user type:**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "invalid_type",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z"
  }'
```

**User type mismatch (providing user_type that doesn't match apartment ownership):**
```bash
# This will fail if user_id 2 is the owner of apartment_id 1
# but you try to set user_type as "renter"
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "renter",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z"
  }'

# Or this will fail if user_id 3 is NOT the owner of apartment_id 1
# but you try to set user_type as "owner"
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "user_type": "owner",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z"
  }'
```

### Test Not Found Errors

**Non-existent booking:**
```bash
curl -X GET "$API_BASE/bookings/99999" \
  -H "Authorization: Bearer $TOKEN"
```

**Non-existent apartment:**
```bash
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 99999,
    "user_id": 2,
    "user_type": "owner",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z"
  }'
```

### Test Booking Conflicts

**Test back-to-back bookings (should succeed):**
```bash
# Create first booking
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-06-01T14:00:00.000Z",
    "leaving_date": "2024-06-07T11:00:00.000Z"
  }'

# Create back-to-back booking (should succeed)
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-06-07T15:00:00.000Z",
    "leaving_date": "2024-06-14T10:00:00.000Z"
  }'
```

**Create overlapping bookings (should fail):**
```bash
# First booking
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "owner",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z"
  }'

# Conflicting booking (should fail)
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "user_type": "renter",
    "arrival_date": "2024-06-20T14:00:00.000Z",
    "leaving_date": "2024-06-30T11:00:00.000Z"
  }'
```

## Authentication Testing

**Test without token:**
```bash
curl -X GET "$API_BASE/bookings"
```

**Test with invalid token:**
```bash
curl -X GET "$API_BASE/bookings" \
  -H "Authorization: Bearer invalid_token"
```

## Admin-Only Endpoints Testing

**Test non-admin access to admin endpoints:**
```bash
# First login as a non-admin user, then try:
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $NON_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "owner",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z"
  }'
```

## Query Parameter Testing

**Test invalid query parameters:**
```bash
# Invalid page number
curl -X GET "$API_BASE/bookings?page=0" \
  -H "Authorization: Bearer $TOKEN"

# Invalid limit
curl -X GET "$API_BASE/bookings?limit=101" \
  -H "Authorization: Bearer $TOKEN"

# Invalid sort field
curl -X GET "$API_BASE/bookings?sort_by=invalid_field" \
  -H "Authorization: Bearer $TOKEN"

# Invalid date format
curl -X GET "$API_BASE/bookings?arrival_date_start=invalid-date" \
  -H "Authorization: Bearer $TOKEN"
```

## Expected Response Formats

### Successful Booking Creation Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "apartment_id": 1,
    "user_id": 2,
    "user_type": "owner",
    "arrival_date": "2024-06-15T14:00:00.000Z",
    "leaving_date": "2024-06-25T11:00:00.000Z",
    "status": "not_arrived",
    "notes": "Summer vacation booking",
    "created_by": 1,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": 2,
      "name": "John Owner",
      "email": "john@example.com",
      "role": "owner"
    },
    "apartment": {
      "id": 1,
      "name": "Apartment 1A",
      "village": {
        "name": "Sharm Resort"
      }
    }
  },
  "message": "Booking created successfully"
}
```

### Booking List Response:
```json
{
  "success": true,
  "data": {
    "bookings": [...],
    "total": 25,
    "page": 1,
    "limit": 10,
    "total_pages": 3
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "arrival_date",
      "message": "Arrival date is required and must be a valid ISO string"
    }
  ]
}
```

## Notes

1. All endpoints require authentication except for health checks
2. POST, PUT, DELETE operations require admin privileges
3. Dates should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
4. The system automatically prevents booking conflicts
5. Related data includes payments, service requests, emails, and utility readings
6. Bookings can be filtered by multiple criteria simultaneously
7. Pagination is supported on all list endpoints with a maximum limit of 100

## Booking Conflict Rules

The system implements strict booking conflict detection with the following rules:

### ✅ **Allowed Scenarios**

1. **Back-to-back bookings**: A new booking can start on the same day another booking ends
2. **Non-overlapping bookings**: Bookings that don't overlap in time
3. **Same apartment, different time periods**: Multiple bookings for the same apartment as long as they don't overlap

### ❌ **Prohibited Scenarios**

1. **Overlapping dates**: Any booking that overlaps with an existing booking
2. **Booking within another booking**: A booking that starts and ends within another booking's period
3. **Booking that contains another booking**: A booking that completely encompasses another booking

### **Examples**

**✅ Allowed: Back-to-back bookings**
```bash
# Existing booking: Jan 1-7
# New booking: Jan 7-14 (starts on the day the previous ends)
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-01-07T14:00:00.000Z",
    "leaving_date": "2024-01-14T11:00:00.000Z"
  }'
```

**✅ Allowed: Non-overlapping bookings**
```bash
# Existing booking: Jan 1-7
# New booking: Jan 10-17 (gap between bookings)
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-10T14:00:00.000Z",
    "leaving_date": "2024-01-17T11:00:00.000Z"
  }'
```

**❌ Prohibited: Overlapping bookings**
```bash
# Existing booking: Jan 1-7
# New booking: Jan 5-12 (overlaps with existing)
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-05T14:00:00.000Z",
    "leaving_date": "2024-01-12T11:00:00.000Z"
  }'
# Returns: 409 Conflict - Booking conflict detected
```

**❌ Prohibited: Booking within existing booking**
```bash
# Existing booking: Jan 1-14
# New booking: Jan 5-10 (completely within existing)
curl -X POST "$API_BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-05T14:00:00.000Z",
    "leaving_date": "2024-01-10T11:00:00.000Z"
  }'
# Returns: 409 Conflict - Booking conflict detected
``` 