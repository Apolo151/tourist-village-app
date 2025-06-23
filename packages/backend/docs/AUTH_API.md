# Authentication API Documentation

This document describes the JWT Authentication and Authorization system for the Tourist Village Management System.

## Table of Contents
- [Authentication Overview](#authentication-overview)
- [Authentication Endpoints](#authentication-endpoints)
- [Authorization Middleware](#authorization-middleware)
- [Security Features](#security-features)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)

## Authentication Overview

The system implements JWT (JSON Web Token) based authentication with:
- **Access tokens**: Short-lived (15 minutes) for API access
- **Refresh tokens**: Long-lived (7 days) for token renewal
- **Password hashing**: Bcrypt with 12 rounds
- **Role-based authorization**: super_admin, admin, owner, renter
- **Rate limiting**: Protection against brute force attacks

## Authentication Endpoints

### Base URL
```
/api/auth
```

### 1. Register
**POST** `/api/auth/register`

Register a new user (only `owner` and `renter` roles allowed for self-registration).

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "StrongPassword123!",
  "phone_number": "+1234567890",
  "role": "owner"
}
```

#### Password Requirements
- At least 8 characters long
- Contains at least one lowercase letter
- Contains at least one uppercase letter
- Contains at least one number
- Contains at least one special character

#### Response (201)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "role": "owner",
      "is_active": true,
      "last_login": null,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  },
  "message": "User registered successfully"
}
```

### 2. Login
**POST** `/api/auth/login`

Authenticate user with email and password.

#### Request Body
```json
{
  "email": "john.doe@example.com",
  "password": "StrongPassword123!"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "role": "owner",
      "is_active": true,
      "last_login": "2024-01-15T11:30:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T11:30:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  },
  "message": "Login successful"
}
```

### 3. Refresh Token
**POST** `/api/auth/refresh`

Get new access token using refresh token.

#### Request Body
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "owner",
      "is_active": true,
      "last_login": "2024-01-15T11:30:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T11:30:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  },
  "message": "Token refreshed successfully"
}
```

### 4. Logout
**POST** `/api/auth/logout`

Invalidate user's refresh token.

#### Headers
```
Authorization: Bearer {access_token}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 5. Get Current User
**GET** `/api/auth/me`

Get current authenticated user information.

#### Headers
```
Authorization: Bearer {access_token}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "owner",
    "is_active": true,
    "last_login": "2024-01-15T11:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:30:00.000Z"
  },
  "message": "User information retrieved successfully"
}
```

### 6. Change Password
**POST** `/api/auth/change-password`

Change user's password.

#### Headers
```
Authorization: Bearer {access_token}
```

#### Request Body
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewStrongPassword456!"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Password changed successfully. Please login with your new password."
}
```

### 7. Verify Token
**POST** `/api/auth/verify-token`

Verify if an access token is valid.

#### Request Body
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "owner",
      "is_active": true
    },
    "valid": true
  },
  "message": "Token is valid"
}
```

### 8. Health Check
**GET** `/api/auth/health`

Check authentication service health.

#### Response (200)
```json
{
  "success": true,
  "data": {
    "service": "authentication",
    "status": "healthy",
    "timestamp": "2024-01-15T12:00:00.000Z"
  },
  "message": "Authentication service is healthy"
}
```

## Authorization Middleware

### Available Middleware Functions

#### `authenticateToken`
Verifies JWT access token and adds user to request object.

#### `requireRole(...roles)`
Checks if user has one of the specified roles.

#### `requireAdmin`
Shortcut for admin or super_admin access.

#### `requireSuperAdmin`
Requires super_admin role.

#### `requireOwnershipOrAdmin(userIdField)`
Allows access if user owns the resource or is admin.

#### `optionalAuth`
Adds user to request if valid token provided, but doesn't require it.

### Usage in Routes

```javascript
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin } from '../middleware/auth';

// Require authentication
router.get('/protected', authenticateToken, handler);

// Require admin role
router.get('/admin-only', authenticateToken, requireAdmin, handler);

// User can access own data or admin can access any
router.get('/users/:id', authenticateToken, requireOwnershipOrAdmin('id'), handler);

// Multiple roles
router.get('/special', authenticateToken, requireRole('admin', 'super_admin'), handler);
```

## Security Features

### Rate Limiting
- **Login/Register**: Maximum 5 attempts per IP per 15 minutes
- **Automatic cleanup**: Expired attempts are cleaned up automatically

### Password Security
- **Bcrypt hashing**: 12 rounds (configurable)
- **Strength validation**: Complex password requirements
- **No password exposure**: Passwords never returned in API responses

### Token Security
- **Short-lived access tokens**: 15 minutes (configurable)
- **Secure refresh tokens**: Hashed and stored securely
- **Token rotation**: New refresh token issued on each refresh
- **Automatic cleanup**: Expired tokens are invalidated

### Account Security
- **Account deactivation**: Users can be deactivated without deletion
- **Last login tracking**: Monitor user activity
- **Unique email enforcement**: Prevents duplicate accounts

## Role-Based Access Control

### Role Hierarchy
1. **super_admin**: Full system access
2. **admin**: Administrative access to manage system
3. **owner**: Apartment owner with limited access
4. **renter**: Regular user who can rent apartments

### Access Patterns
- **Public**: Registration, login, health checks
- **Authenticated**: Change password, get profile
- **Admin Only**: User management, system configuration
- **Owner/Admin**: Access to owned resources or admin override
- **Super Admin Only**: Critical system operations

## Usage Examples

### Frontend Integration

#### Login Flow
```javascript
const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (response.ok) {
    const { data } = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data.user;
  }
  throw new Error('Login failed');
};
```

#### API Calls with Authentication
```javascript
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshToken();
    // Retry request with new token
    return makeAuthenticatedRequest(url, options);
  }
  
  return response;
};
```

#### Token Refresh
```javascript
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  if (response.ok) {
    const { data } = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
  } else {
    // Refresh failed, redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  }
};
```

## Error Handling

### Common Error Responses

#### Unauthorized (401)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Access token is required"
}
```

#### Token Expired (401)
```json
{
  "success": false,
  "error": "Token expired",
  "message": "Access token has expired. Please refresh your token."
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied. Required role: admin or super_admin"
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

#### Rate Limited (429)
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Too many authentication attempts. Please try again later.",
  "retry_after": 847
}
```

## Environment Variables

Required environment variables for authentication:

```bash
# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Optional Configuration
JWT_EXPIRES_IN=15m          # Access token expiry (default: 15m)
JWT_REFRESH_EXPIRES_IN=7d   # Refresh token expiry (default: 7d)
BCRYPT_ROUNDS=12           # Password hashing rounds (default: 12)
API_KEY=service-api-key    # For service-to-service communication
```

## Installation Requirements

Add these packages to your package.json:

```bash
npm install bcrypt jsonwebtoken
npm install --save-dev @types/bcrypt @types/jsonwebtoken
```

## Best Practices

1. **Always use HTTPS** in production
2. **Set strong JWT secrets** (32+ character random strings)
3. **Implement token refresh** logic in frontend
4. **Store tokens securely** (httpOnly cookies preferred over localStorage)
5. **Validate user permissions** on every protected endpoint
6. **Monitor failed authentication attempts**
7. **Implement logout on all devices** functionality if needed
8. **Regular security audits** of authentication logic 