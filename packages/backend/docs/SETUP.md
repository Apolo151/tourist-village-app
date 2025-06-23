# Tourist Village Backend Setup Guide

## Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

### 1. Install Dependencies

```bash
# Core dependencies
npm install bcrypt jsonwebtoken

# Development dependencies  
npm install --save-dev @types/bcrypt @types/jsonwebtoken
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp env.example .env
```

Edit `.env` and configure the following **REQUIRED** variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/tourist_village_db

# JWT Authentication (CRITICAL - Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Server
NODE_ENV=development
PORT=3000
```

**⚠️ Security Warning**: The default JWT secrets are for development only. **NEVER** use them in production!

### 3. Database Setup

```bash
# Run all migrations (including auth fields)
npm run migrate:latest

# Create super admin user (REQUIRED)
npm run seed:run -- --specific=001_create_super_admin.ts

# Optional: Create sample data for development
npm run seed:run
```

### 4. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

## Authentication System Features

✅ **JWT Token Authentication**
- Access tokens (15min lifespan)
- Refresh tokens (7 day lifespan)
- Automatic token rotation

✅ **Password Security**
- Bcrypt hashing (12 rounds)
- Strong password requirements
- Secure password change flow

✅ **Role-Based Authorization**
- super_admin: Full system access
- admin: Administrative access
- owner: Apartment owner access
- renter: Basic user access

✅ **Security Features**
- Rate limiting (5 attempts per 15min)
- Account deactivation
- Token invalidation on logout
- Input validation and sanitization

✅ **API Protection**
- All user endpoints require authentication
- Role-based access control
- Resource ownership verification

## Testing Authentication

### 1. Login with Super Admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@touristvillage.com",
    "password": "SuperAdmin123!"
  }'
```

### 2. Change Default Password (IMPORTANT!)
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "SuperAdmin123!",
    "new_password": "YourNewSecurePassword123!"
  }'
```

### 3. Or Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com", 
    "password": "TestPassword123!",
    "role": "owner"
  }'
```

### 3. Use Access Token
```bash
# Replace {token} with the access_token from login response
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer {token}"
```

## Common Issues

### JWT Secret Errors
**Error**: "WARNING: Using default JWT secrets in production!"
**Solution**: Set proper JWT_SECRET and JWT_REFRESH_SECRET in your .env file

### Database Connection Errors  
**Error**: Connection issues
**Solution**: Verify DATABASE_URL and ensure PostgreSQL is running

### Migration Errors
**Error**: Migration failures
**Solution**: Ensure database exists and user has proper permissions

### Authentication Failures
**Error**: Token validation errors
**Solution**: Check that JWT secrets match between token creation and validation

## API Documentation

- **Authentication API**: See `AUTH_API.md` for complete endpoint documentation
- **Users API**: See `USERS_API.md` for user management
- **Apartments API**: See `APARTMENTS_API.md` for apartment management

## Security Recommendations

### Development
- Use provided default secrets
- Enable detailed error logging
- Test with various user roles

### Production
- **Generate strong JWT secrets** (32+ characters)
- **Use HTTPS only**
- **Set NODE_ENV=production**
- **Configure proper CORS**
- **Enable rate limiting**
- **Monitor failed login attempts**
- **Regular security audits**

### JWT Secret Generation
Generate secure secrets using:
```bash
# Method 1: OpenSSL
openssl rand -base64 64

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Method 3: Online (use with caution)
# Visit: https://generate-secret.vercel.app/64
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | dev-default | Access token signing key |
| `JWT_REFRESH_SECRET` | ✅ | dev-default | Refresh token signing key |
| `JWT_EXPIRES_IN` | ❌ | 15m | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | 7d | Refresh token lifetime |
| `BCRYPT_ROUNDS` | ❌ | 12 | Password hashing rounds |
| `NODE_ENV` | ❌ | development | Environment mode |
| `PORT` | ❌ | 3000 | Server port |
| `API_KEY` | ❌ | - | Service-to-service auth |

## Development Workflow

1. **Start with auth setup** - Users and authentication first
2. **Test authentication** - Verify login/register works
3. **Implement protected routes** - Add business logic
4. **Test authorization** - Verify role-based access
5. **Frontend integration** - Connect with React app

## Troubleshooting

### Check Service Health
```bash
curl http://localhost:3000/api/auth/health
curl http://localhost:3000/api/health
```

### Verify Database Connection
```bash
npm run migrate:status
```

### Check Available Endpoints
The server logs all available endpoints on startup.

For more detailed information, see the individual API documentation files. 