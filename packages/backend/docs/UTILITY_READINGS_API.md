# Utility Readings API Documentation

This document describes the API endpoints for managing utility readings in the tourist village management system.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Permission System](#permission-system)
- [Endpoints](#endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)

## Overview

The Utility Readings API allows users to manage water and electricity readings for apartments. It includes features for:
- Creating and managing utility readings
- Tracking consumption and costs
- Role-based access control
- Cost calculations based on village pricing
- Statistics and reporting

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Permission System

### Role-Based Access Control

1. **Super Admin & Admin**
   - Full access to all utility readings
   - Can create, read, update, delete any reading
   - Access to statistics endpoints

2. **Owner**
   - Can manage readings for their own apartments only
   - Can create, read, update, delete readings for owned apartments
   - Cannot access readings for other owners' apartments

3. **Renter**
   - Can create readings for apartments they have active bookings for
   - Can only read, update, delete readings they created
   - Limited access based on booking status

## Endpoints

### 1. Get All Utility Readings

**GET** `/api/utility-readings`

Retrieve utility readings with filtering, sorting, and pagination.

#### Query Parameters
- `apartment_id` (number, optional): Filter by apartment ID
- `booking_id` (number, optional): Filter by booking ID  
- `village_id` (number, optional): Filter by village ID
- `who_pays` (string, optional): Filter by who pays (`owner`, `renter`, `company`)
- `start_date_from` (string, optional): Filter readings starting from date (ISO format)
- `start_date_to` (string, optional): Filter readings starting to date (ISO format)
- `end_date_from` (string, optional): Filter readings ending from date (ISO format)
- `end_date_to` (string, optional): Filter readings ending to date (ISO format)
- `has_water_readings` (boolean, optional): Filter by presence of water readings
- `has_electricity_readings` (boolean, optional): Filter by presence of electricity readings
- `created_by` (number, optional): Filter by creator user ID
- `search` (string, optional): Search in apartment name, village name, owner name
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `sort_by` (string, optional): Sort field (`start_date`, `end_date`, `apartment_name`, `village_name`, `who_pays`, `created_at`)
- `sort_order` (string, optional): Sort order (`asc`, `desc`, default: `desc`)

#### Example Request
```bash
GET /api/utility-readings?apartment_id=1&who_pays=owner&page=1&limit=20&sort_by=start_date&sort_order=desc
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "apartment_id": 1,
      "booking_id": null,
      "water_start_reading": 1000.50,
      "water_end_reading": 1150.75,
      "electricity_start_reading": 2500.00,
      "electricity_end_reading": 2650.50,
      "start_date": "2024-01-01T00:00:00.000Z",
      "end_date": "2024-01-31T00:00:00.000Z",
      "who_pays": "owner",
      "created_by": 1,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "water_cost": 301.50,
      "electricity_cost": 226.75,
      "total_cost": 528.25,
      "apartment": {
        "id": 1,
        "name": "Sunset Villa A1",
        "village_id": 1,
        "phase": 1,
        "owner_id": 2,
        "paying_status": "paid",
        "village": {
          "id": 1,
          "name": "Sharm Village",
          "electricity_price": 1.50,
          "water_price": 2.00,
          "phases": 3
        },
        "owner": {
          "id": 2,
          "name": "John Smith",
          "email": "john@example.com",
          "role": "owner"
        }
      },
      "created_by_user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3
  }
}
```

### 2. Get Utility Reading Statistics

**GET** `/api/utility-readings/stats`

Get utility reading statistics and analytics. **Admin/Super Admin only**.

#### Example Response
```json
{
  "success": true,
  "data": {
    "total_readings": 150,
    "by_who_pays": [
      {
        "who_pays": "owner",
        "count": 80,
        "total_cost": 15420.50
      },
      {
        "who_pays": "renter", 
        "count": 60,
        "total_cost": 8760.25
      },
      {
        "who_pays": "company",
        "count": 10,
        "total_cost": 2340.75
      }
    ],
    "by_village": [
      {
        "village_name": "Sharm Village",
        "count": 90,
        "total_cost": 18420.30
      },
      {
        "village_name": "Luxor Resort",
        "count": 60,
        "total_cost": 8101.20
      }
    ],
    "total_consumption": {
      "water_usage": 45620.75,
      "electricity_usage": 78450.25
    },
    "total_costs": {
      "water_cost": 91241.50,
      "electricity_cost": 117675.38,
      "total_cost": 208916.88
    }
  }
}
```

### 3. Get Utility Reading by ID

**GET** `/api/utility-readings/:id`

Retrieve a specific utility reading by ID.

#### Path Parameters
- `id` (number, required): Utility reading ID

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "apartment_id": 1,
    "booking_id": 5,
    "water_start_reading": 1000.50,
    "water_end_reading": 1150.75,
    "electricity_start_reading": 2500.00,
    "electricity_end_reading": 2650.50,
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": "2024-01-31T00:00:00.000Z",
    "who_pays": "renter",
    "created_by": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "water_cost": 301.50,
    "electricity_cost": 226.75,
    "total_cost": 528.25,
    "apartment": { /* apartment details */ },
    "booking": { /* booking details */ },
    "created_by_user": { /* creator details */ }
  }
}
```

### 4. Create Utility Reading

**POST** `/api/utility-readings`

Create a new utility reading.

#### Request Body
```json
{
  "apartment_id": 1,
  "booking_id": 5,
  "water_start_reading": 1000.50,
  "water_end_reading": 1150.75,
  "electricity_start_reading": 2500.00,
  "electricity_end_reading": 2650.50,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "who_pays": "renter"
}
```

#### Required Fields
- `apartment_id`: Must be a positive number, apartment must exist
- `start_date`: ISO date string
- `end_date`: ISO date string, must be after start_date
- `who_pays`: Must be `owner`, `renter`, or `company`

#### Optional Fields
- `booking_id`: Must belong to the specified apartment
- `water_start_reading`: Non-negative number
- `water_end_reading`: Must be >= water_start_reading
- `electricity_start_reading`: Non-negative number  
- `electricity_end_reading`: Must be >= electricity_start_reading

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 51,
    "apartment_id": 1,
    "booking_id": 5,
    "water_start_reading": 1000.50,
    "water_end_reading": 1150.75,
    "electricity_start_reading": 2500.00,
    "electricity_end_reading": 2650.50,
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": "2024-01-31T00:00:00.000Z",
    "who_pays": "renter",
    "created_by": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "water_cost": 301.50,
    "electricity_cost": 226.75,
    "total_cost": 528.25
  },
  "message": "Utility reading created successfully"
}
```

### 5. Update Utility Reading

**PUT** `/api/utility-readings/:id`

Update an existing utility reading.

#### Path Parameters
- `id` (number, required): Utility reading ID

#### Request Body
All fields are optional for updates:
```json
{
  "apartment_id": 2,
  "booking_id": null,
  "water_end_reading": 1200.00,
  "electricity_end_reading": 2700.00,
  "end_date": "2024-02-01",
  "who_pays": "owner"
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "apartment_id": 2,
    "booking_id": null,
    "water_start_reading": 1000.50,
    "water_end_reading": 1200.00,
    "electricity_start_reading": 2500.00,
    "electricity_end_reading": 2700.00,
    "start_date": "2024-01-01T00:00:00.000Z",
    "end_date": "2024-02-01T00:00:00.000Z",
    "who_pays": "owner",
    "created_by": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-20T14:45:00.000Z",
    "water_cost": 399.00,
    "electricity_cost": 300.00,
    "total_cost": 699.00
  },
  "message": "Utility reading updated successfully"
}
```

### 6. Delete Utility Reading

**DELETE** `/api/utility-readings/:id`

Delete a utility reading.

#### Path Parameters
- `id` (number, required): Utility reading ID

#### Example Response
```json
{
  "success": true,
  "message": "Utility reading deleted successfully"
}
```

## Data Models

### Utility Reading Object
```typescript
interface UtilityReading {
  id: number;
  apartment_id: number;
  booking_id?: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: Date;
  end_date: Date;
  who_pays: 'owner' | 'renter' | 'company';
  created_by: number;
  created_at: Date;
  updated_at: Date;
  // Calculated fields
  water_cost?: number;
  electricity_cost?: number;
  total_cost?: number;
  // Related data
  apartment?: Apartment;
  booking?: Booking;
  created_by_user?: PublicUser;
}
```

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "End date must be after start date",
  "details": [
    {
      "field": "end_date",
      "message": "End date must be after start date"
    }
  ]
}
```

### Common Error Messages

#### Validation Errors (400)
- "Apartment ID is required and must be a positive number"
- "Start date is required and must be a valid date"
- "End date must be after start date"
- "Who pays is required and must be owner, renter, or company"
- "Water end reading must be greater than or equal to start reading"
- "Electricity end reading must be greater than or equal to start reading"
- "Apartment not found"
- "Booking not found or does not belong to the specified apartment"

#### Permission Errors (403)
- "You can only access utility readings for your own apartments"
- "You can only access utility readings you created"
- "You can only create utility readings for your own apartments"
- "You can only create utility readings for apartments you have bookings for"

#### Not Found Errors (404)
- "Utility reading not found"

### Cost Calculation

Costs are automatically calculated based on:
- **Water Cost**: `(water_end_reading - water_start_reading) * village.water_price`
- **Electricity Cost**: `(electricity_end_reading - electricity_start_reading) * village.electricity_price`
- **Total Cost**: `water_cost + electricity_cost`

Missing readings are treated as 0 for calculations.

### Business Rules

1. **Date Validation**: End date must always be after start date
2. **Reading Validation**: End readings must be greater than or equal to start readings
3. **Booking Validation**: If booking_id is provided, it must belong to the specified apartment
4. **Permission Checks**: Users can only access readings based on their role and ownership
5. **Apartment Access**: Renters need active bookings to create readings for apartments
6. **Cost Updates**: Costs are recalculated automatically on any reading update 