# Booking Conflict Testing Scenarios

This document outlines test scenarios to verify the booking conflict detection logic.

## Test Setup

Before running tests, ensure you have:
1. A running backend server
2. Valid authentication token
3. At least one apartment and user in the system

## Test Scenarios

### Scenario 1: Back-to-Back Bookings (Should Succeed)

**Description**: Test that a booking can start on the same day another booking ends.

**Steps**:
1. Create first booking (Jan 1-7)
2. Create second booking starting on Jan 7
3. Both should be created successfully

**Expected Result**: ✅ Both bookings created without conflict

```bash
# Step 1: Create first booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-01-01T14:00:00.000Z",
    "leaving_date": "2024-01-07T11:00:00.000Z",
    "notes": "First booking"
  }'

# Step 2: Create back-to-back booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-07T15:00:00.000Z",
    "leaving_date": "2024-01-14T10:00:00.000Z",
    "notes": "Back-to-back booking"
  }'
```

### Scenario 2: Overlapping Bookings (Should Fail)

**Description**: Test that overlapping bookings are rejected.

**Steps**:
1. Create first booking (Jan 1-10)
2. Try to create overlapping booking (Jan 5-15)
3. Second booking should be rejected

**Expected Result**: ❌ Second booking rejected with 409 Conflict

```bash
# Step 1: Create first booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-01-01T14:00:00.000Z",
    "leaving_date": "2024-01-10T11:00:00.000Z",
    "notes": "First booking"
  }'

# Step 2: Try to create overlapping booking (should fail)
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-05T15:00:00.000Z",
    "leaving_date": "2024-01-15T10:00:00.000Z",
    "notes": "Overlapping booking"
  }'
```

### Scenario 3: Booking Within Another Booking (Should Fail)

**Description**: Test that a booking completely within another is rejected.

**Steps**:
1. Create long booking (Jan 1-20)
2. Try to create booking within it (Jan 5-10)
3. Second booking should be rejected

**Expected Result**: ❌ Second booking rejected with 409 Conflict

```bash
# Step 1: Create long booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-01-01T14:00:00.000Z",
    "leaving_date": "2024-01-20T11:00:00.000Z",
    "notes": "Long booking"
  }'

# Step 2: Try to create booking within (should fail)
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-05T15:00:00.000Z",
    "leaving_date": "2024-01-10T10:00:00.000Z",
    "notes": "Booking within another"
  }'
```

### Scenario 4: Non-Overlapping Bookings (Should Succeed)

**Description**: Test that bookings with gaps between them are allowed.

**Steps**:
1. Create first booking (Jan 1-7)
2. Create second booking with gap (Jan 10-17)
3. Both should be created successfully

**Expected Result**: ✅ Both bookings created without conflict

```bash
# Step 1: Create first booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-01-01T14:00:00.000Z",
    "leaving_date": "2024-01-07T11:00:00.000Z",
    "notes": "First booking"
  }'

# Step 2: Create non-overlapping booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-10T15:00:00.000Z",
    "leaving_date": "2024-01-17T10:00:00.000Z",
    "notes": "Non-overlapping booking"
  }'
```

### Scenario 5: Update Booking to Create Conflict (Should Fail)

**Description**: Test that updating a booking to create a conflict is rejected.

**Steps**:
1. Create two non-overlapping bookings
2. Try to update one to overlap with the other
3. Update should be rejected

**Expected Result**: ❌ Update rejected with 409 Conflict

```bash
# Step 1: Create first booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 2,
    "arrival_date": "2024-01-01T14:00:00.000Z",
    "leaving_date": "2024-01-07T11:00:00.000Z",
    "notes": "First booking"
  }'

# Step 2: Create second booking
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 1,
    "user_id": 3,
    "arrival_date": "2024-01-10T15:00:00.000Z",
    "leaving_date": "2024-01-17T10:00:00.000Z",
    "notes": "Second booking"
  }'

# Step 3: Try to update second booking to overlap (should fail)
curl -X PUT "http://localhost:3000/api/bookings/SECOND_BOOKING_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arrival_date": "2024-01-05T15:00:00.000Z",
    "leaving_date": "2024-01-12T10:00:00.000Z"
  }'
```

## Expected Error Response Format

When a conflict is detected, you should receive a response like this:

```json
{
  "success": false,
  "error": "Conflict",
  "message": "Booking conflict detected. The apartment is already booked during the selected dates. Conflicting with: Booking ID 123 (Mon Jan 01 2024 to Sun Jan 07 2024). Note: Back-to-back bookings are allowed (a new booking can start on the same day another ends)."
}
```

## Time Zone Considerations

- All dates are compared at the date level (ignoring time)
- This allows for same-day transitions regardless of specific times
- Example: A booking ending at 11:00 AM and another starting at 3:00 PM on the same day is allowed

## Cleanup After Testing

After testing, clean up the test bookings:

```bash
# Delete test bookings
curl -X DELETE "http://localhost:3000/api/bookings/BOOKING_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
``` 