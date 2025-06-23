# Tourist Village Management System - Backend

This is the backend API for the Tourist Village Management System, built with Node.js, TypeScript, Express.js, Knex.js, and PostgreSQL.

## Features

- **🔐 JWT Authentication**: Secure login with access & refresh tokens
- **🛡️ Role-Based Authorization**: super_admin, admin, owner, renter roles
- **👥 User Management**: Complete user lifecycle with authentication
- **🏘️ Villages Management**: Manage different tourist villages with their settings
- **🏠 Apartment Management**: Track apartments, owners, and phases
- **📅 Booking System**: Manage bookings for owners and renters
- **🔧 Service Requests**: Handle service types and service requests
- **⚡ Utility Readings**: Track water and electricity usage
- **💰 Payment Management**: Handle payments and billing
- **📧 Email Communication**: Manage email correspondence
- **🔍 Health Checks**: Built-in health monitoring endpoints

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Query Builder**: Knex.js
- **Authentication**: JWT

## Database Schema

The system implements the following main entities:

- `villages` - Tourist village information
- `users` - System users (admin/owner/renter)
- `apartments` - Property management
- `bookings` - Booking management
- `service_types` - Available services
- `service_requests` - Service request tracking
- `utility_readings` - Utility consumption tracking
- `payment_methods` - Payment method options
- `payments` - Payment records
- `emails` - Email communication logs

## Setup

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Installation

1. **Clone the repository and navigate to backend:**
   ```bash
   cd packages/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Authentication Dependencies:**
   ```bash
   npm install bcrypt jsonwebtoken
   npm install --save-dev @types/bcrypt @types/jsonwebtoken
   ```

4. **Environment Setup:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/tourist_village_db
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
   PORT=3000
   NODE_ENV=development
   ```

5. **Database Setup:**
   
   Create the database:
   ```sql
   CREATE DATABASE tourist_village_db;
   ```

6. **Run Migrations (includes auth tables):**
   ```bash
   npm run migrate:latest
   ```

7. **Create Super Admin Account:**
   ```bash
   # Create super admin user
   npm run seed:run -- --specific=001_create_super_admin.ts
   
   # Or create all sample data (development)
   npm run seed:run
   ```

### Development

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Build for production:**
   ```bash
   npm run build
   ```

3. **Start production server:**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register new user (owner/renter)
- `POST /api/auth/login` - User login with email/password  
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate tokens
- `GET /api/auth/me` - Get current user information
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/verify-token` - Verify token validity
- `GET /api/auth/health` - Authentication service health

### Protected Endpoints (Require Authentication)

#### Users Management (Admin Only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID (own data or admin)
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user (own data or admin)
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/:id/stats` - Get user statistics
- `GET /api/users/by-role/:role` - Get users by role
- `GET /api/users/search/by-email/:email` - Find user by email

#### Villages Management (Admin Only)
- `GET /api/villages` - List villages with filtering
- `GET /api/villages/:id` - Get village details
- `POST /api/villages` - Create new village
- `PUT /api/villages/:id` - Update village
- `DELETE /api/villages/:id` - Delete village
- `GET /api/villages/:id/stats` - Get village statistics

#### Apartments Management (Role-based Access)
- `GET /api/apartments` - List apartments
- `GET /api/apartments/:id` - Get apartment details
- `POST /api/apartments` - Create apartment (Admin)
- `PUT /api/apartments/:id` - Update apartment (Owner/Admin)
- `DELETE /api/apartments/:id` - Delete apartment (Admin)
- `GET /api/apartments/:id/stats` - Get apartment statistics

### Public Endpoints

- `GET /` - Basic API info
- `GET /api/health` - Basic health check
- `GET /api/health/db` - Database connectivity check
- `GET /api/health/system` - Detailed system information

### Response Examples
 
**GET /api/health**
```json
{
  "status": "OK",
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

**GET /api/health/db**
```json
{
  "status": "OK",
  "message": "Database connection is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Database Migrations

### Available Commands

- `npm run migrate:latest` - Run all pending migrations
- `npm run migrate:rollback` - Rollback the last migration
- `npm run migrate:make <name>` - Create a new migration file

## Docker Support

The application includes Docker configuration for containerized deployment.

### Docker Build

```bash
docker build -t tourist-village-backend .
```

### Docker Run

```bash
docker run -p 3000:3000 tourist-village-backend
```

## Project Structure

```
src/
├── database/
│   ├── migrations/          # Database migration files
│   ├── seeds/              # Database seed files (optional)
│   └── connection.ts       # Database connection setup
├── routes/
│   ├── health.ts           # Health check routes
│   ├── auth.ts             # Authentication routes
│   ├── apartments.ts       # Apartment management
│   ├── payments.ts         # Payment processing
│   └── ...                 # Other route modules
├── services/               # Business logic services
├── middleware/             # Express middleware (auth, validation)
├── types/                  # TypeScript type definitions
├── app.ts                 # Express app configuration
└── server.ts              # Server startup and database connection
```

## Environment Variables

| Variable    | Description                  | Default     |
|-------------|------------------------------|-------------|
| `DB_HOST`   | Database host                | localhost   |
| `DB_PORT`   | Database port                | 5432        |
| `DB_NAME`   | Database name                | -           |
| `DB_USER`   | Database username            | postgres    |
| `DB_PASSWORD` | Database password          | -           |
| `PORT`      | Application port             | 3000        |
| `NODE_ENV`  | Environment                  | development |
| `JWT_SECRET` | JWT signing secret          | -           |
| `JWT_REFRESH_SECRET` | JWT refresh secret      | -           |
| `JWT_EXPIRES_IN` | Access token lifetime       | 15m         |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | 7d          |
| `BCRYPT_ROUNDS` | Password hashing rounds    | 12          |

## 📚 Detailed Documentation

For comprehensive information about each service:

- **[AUTH_API.md](AUTH_API.md)** - Complete authentication and authorization guide
- **[USERS_API.md](USERS_API.md)** - User management API reference  
- **[APARTMENTS_API.md](APARTMENTS_API.md)** - Apartment management API reference
- **[SETUP.md](SETUP.md)** - Detailed setup and installation guide
- **[SEEDS.md](SEEDS.md)** - Database seeds and sample data guide

## 🔐 Authentication Quick Start

```bash
# 1. Login with super admin (created by seed)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@touristvillage.com","password":"SuperAdmin123!"}'

# 2. Use access token for protected endpoints
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 3. Change default password (IMPORTANT!)
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"SuperAdmin123!","new_password":"YourNewPassword123!"}'
```

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with configurable rounds  
- **Rate Limiting**: Brute force protection
- **Role-Based Access**: Granular permission control
- **Token Rotation**: Automatic refresh token rotation
- **Account Management**: User activation/deactivation
- **Audit Trail**: `created_by` tracking on all entities
