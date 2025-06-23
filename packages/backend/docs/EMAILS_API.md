# Emails API Documentation

This document describes the API endpoints for managing emails in the tourist village management system.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Permission System](#permission-system)
- [Endpoints](#endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)

## Overview

The Emails API allows users to manage email communications related to apartments and bookings. It includes features for:
- Creating and managing email records
- Tracking email communications
- Role-based access control
- Email type categorization
- Statistics and reporting

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Permission System

### Role-Based Access Control

1. **Super Admin & Admin**
   - Full access to all emails
   - Can create, read, update, delete any email
   - Access to statistics endpoints

2. **Owner**
   - Can manage emails for their own apartments only
   - Can create, read, update, delete emails for owned apartments
   - Cannot access emails for other owners' apartments

3. **Renter**
   - Can create emails for apartments they have active bookings for
   - Can only read, update, delete emails they created
   - Limited access based on booking status

## Endpoints

### 1. Get All Emails

**GET** `/api/emails`

Retrieve emails with filtering, sorting, and pagination.

#### Query Parameters
- `apartment_id` (number, optional): Filter by apartment ID
- `booking_id` (number, optional): Filter by booking ID  
- `village_id` (number, optional): Filter by village ID
- `type` (string, optional): Filter by email type (`complaint`, `inquiry`, `other`)
- `date_from` (string, optional): Filter emails from date (ISO format)
- `date_to` (string, optional): Filter emails to date (ISO format)
- `from` (string, optional): Filter by sender email (partial match)
- `to` (string, optional): Filter by recipient email (partial match)
- `created_by` (number, optional): Filter by creator user ID
- `search` (string, optional): Search in from, to, subject, content, apartment name, village name
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `sort_by` (string, optional): Sort field (`date`, `type`, `from`, `to`, `subject`, `apartment_name`, `village_name`, `created_at`)
- `sort_order` (string, optional): Sort order (`asc`, `desc`, default: `desc`)

#### Example Request
```bash
GET /api/emails?apartment_id=1&type=complaint&page=1&limit=20&sort_by=date&sort_order=desc
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "apartment_id": 1,
      "booking_id": 5,
      "date": "2024-01-15T00:00:00.000Z",
      "from": "john@example.com",
      "to": "support@village.com",
      "subject": "Water pressure issue in apartment",
      "content": "Hi, I'm experiencing low water pressure in the bathroom of apartment A1. Could someone please look into this?",
      "type": "complaint",
      "created_by": 3,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
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
      "booking": {
        "id": 5,
        "apartment_id": 1,
        "user_id": 3,
        "user_type": "guest",
        "arrival_date": "2024-01-10T00:00:00.000Z",
        "leaving_date": "2024-01-20T00:00:00.000Z",
        "status": "confirmed",
        "user": {
          "id": 3,
          "name": "Sarah Johnson",
          "email": "sarah@example.com",
          "role": "renter"
        }
      },
      "created_by_user": {
        "id": 3,
        "name": "Sarah Johnson",
        "email": "sarah@example.com",
        "role": "renter"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "total_pages": 5
  }
}
```

### 2. Get Email Statistics

**GET** `/api/emails/stats`

Get email statistics and analytics. **Admin/Super Admin only**.

#### Example Response
```json
{
  "success": true,
  "data": {
    "total_emails": 250,
    "by_type": [
      {
        "type": "complaint",
        "count": 120
      },
      {
        "type": "inquiry",
        "count": 95
      },
      {
        "type": "other",
        "count": 35
      }
    ],
    "by_village": [
      {
        "village_name": "Sharm Village",
        "count": 150
      },
      {
        "village_name": "Luxor Resort",
        "count": 100
      }
    ],
    "recent_activity": [
      {
        "date": "2024-01-20",
        "count": 8
      },
      {
        "date": "2024-01-19",
        "count": 12
      },
      {
        "date": "2024-01-18",
        "count": 6
      }
    ],
    "top_senders": [
      {
        "from": "john@example.com",
        "count": 15
      },
      {
        "from": "sarah@example.com",
        "count": 12
      }
    ],
    "top_recipients": [
      {
        "to": "support@village.com",
        "count": 180
      },
      {
        "to": "maintenance@village.com",
        "count": 70
      }
    ]
  }
}
```

### 3. Get Email by ID

**GET** `/api/emails/:id`

Retrieve a specific email by ID.

#### Path Parameters
- `id` (number, required): Email ID

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "apartment_id": 1,
    "booking_id": 5,
    "date": "2024-01-15T00:00:00.000Z",
    "from": "john@example.com",
    "to": "support@village.com",
    "subject": "Water pressure issue in apartment",
    "content": "Hi, I'm experiencing low water pressure in the bathroom of apartment A1. Could someone please look into this? It's been going on for 2 days now.",
    "type": "complaint",
    "created_by": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "apartment": { /* apartment details */ },
    "booking": { /* booking details */ },
    "created_by_user": { /* creator details */ }
  }
}
```

### 4. Create Email

**POST** `/api/emails`

Create a new email record.

#### Request Body
```json
{
  "apartment_id": 1,
  "booking_id": 5,
  "date": "2024-01-15",
  "from": "john@example.com",
  "to": "support@village.com",
  "subject": "Water pressure issue in apartment",
  "content": "Hi, I'm experiencing low water pressure in the bathroom of apartment A1. Could someone please look into this?",
  "type": "complaint"
}
```

#### Required Fields
- `apartment_id`: Must be a positive number, apartment must exist
- `date`: ISO date string
- `from`: Valid email address
- `to`: Valid email address
- `subject`: Non-empty string (max 255 characters)
- `content`: Non-empty string (max 10,000 characters)
- `type`: Must be `complaint`, `inquiry`, or `other`

#### Optional Fields
- `booking_id`: Must belong to the specified apartment

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 51,
    "apartment_id": 1,
    "booking_id": 5,
    "date": "2024-01-15T00:00:00.000Z",
    "from": "john@example.com",
    "to": "support@village.com",
    "subject": "Water pressure issue in apartment",
    "content": "Hi, I'm experiencing low water pressure in the bathroom of apartment A1. Could someone please look into this?",
    "type": "complaint",
    "created_by": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "Email created successfully"
}
```

### 5. Update Email

**PUT** `/api/emails/:id`

Update an existing email.

#### Path Parameters
- `id` (number, required): Email ID

#### Request Body
All fields are optional for updates:
```json
{
  "subject": "Updated: Water pressure issue resolved",
  "content": "The water pressure issue has been resolved. Thank you for the quick response!",
  "type": "other"
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "apartment_id": 1,
    "booking_id": 5,
    "date": "2024-01-15T00:00:00.000Z",
    "from": "john@example.com",
    "to": "support@village.com",
    "subject": "Updated: Water pressure issue resolved",
    "content": "The water pressure issue has been resolved. Thank you for the quick response!",
    "type": "other",
    "created_by": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-16T14:45:00.000Z"
  },
  "message": "Email updated successfully"
}
```

### 6. Delete Email

**DELETE** `/api/emails/:id`

Delete an email record.

#### Path Parameters
- `id` (number, required): Email ID

#### Example Response
```json
{
  "success": true,
  "message": "Email deleted successfully"
}
```

## Data Models

### Email Object
```typescript
interface Email {
  id: number;
  apartment_id: number;
  booking_id?: number;
  date: Date;
  from: string;
  to: string;
  subject: string;
  content: string;
  type: 'complaint' | 'inquiry' | 'other';
  created_by: number;
  created_at: Date;
  updated_at: Date;
  // Related data
  apartment?: Apartment;
  booking?: Booking;
  created_by_user?: PublicUser;
}
```

### Email Types
- **complaint**: Issues, problems, or complaints about the apartment or service
- **inquiry**: Questions or requests for information
- **other**: General communications or other types of emails

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
  "message": "Subject must not exceed 255 characters",
  "details": [
    {
      "field": "subject",
      "message": "Subject must not exceed 255 characters"
    }
  ]
}
```

### Common Error Messages

#### Validation Errors (400)
- "Apartment ID is required and must be a positive number"
- "Date is required and must be a valid date"
- "From email is required and must be a valid email address"
- "To email is required and must be a valid email address"
- "Subject is required and must be a non-empty string"
- "Subject must not exceed 255 characters"
- "Content is required and must be a non-empty string"
- "Content must not exceed 10,000 characters"
- "Type is required and must be complaint, inquiry, or other"
- "Apartment not found"
- "Booking not found or does not belong to the specified apartment"

#### Permission Errors (403)
- "You can only access emails for your own apartments"
- "You can only access emails you created"
- "You can only create emails for your own apartments"
- "You can only create emails for apartments you have bookings for"

#### Not Found Errors (404)
- "Email not found"

### Email Validation

#### Email Address Format
- Must follow standard email format: `user@domain.com`
- Automatically converted to lowercase for storage
- Trimmed of whitespace

#### Content Limitations
- **Subject**: Maximum 255 characters
- **Content**: Maximum 10,000 characters
- Both subject and content are trimmed of leading/trailing whitespace

### Business Rules

1. **Date Validation**: Email date must be a valid date
2. **Email Format**: Both from and to must be valid email addresses
3. **Booking Validation**: If booking_id is provided, it must belong to the specified apartment
4. **Permission Checks**: Users can only access emails based on their role and ownership
5. **Apartment Access**: Renters need active bookings to create emails for apartments
6. **Type Categorization**: All emails must be categorized as complaint, inquiry, or other

### Search Functionality

The search parameter performs case-insensitive partial matching across:
- From email address
- To email address  
- Subject line
- Email content
- Associated apartment name
- Associated village name
- Associated owner name
- Associated booking user name

### Statistics and Reporting

Email statistics include:
- **Total count** of all emails
- **Distribution by type** (complaint, inquiry, other)
- **Distribution by village**
- **Recent activity** (last 30 days)
- **Top senders** (most active email addresses)
- **Top recipients** (most contacted addresses)

Statistics are only accessible to admin and super admin users for privacy and security reasons. 