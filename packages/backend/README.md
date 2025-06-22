# Tourist Village Management System - Backend

This is the backend API for the Tourist Village Management System, built with Node.js, TypeScript, Express.js, Knex.js, and PostgreSQL.

## Features

- **Villages Management**: Manage different tourist villages with their settings
- **User Management**: Handle admin, owner, and renter users
- **Apartment Management**: Track apartments, owners, and phases
- **Booking System**: Manage bookings for owners and renters
- **Service Requests**: Handle service types and service requests
- **Utility Readings**: Track water and electricity usage
- **Payment Management**: Handle payments and billing
- **Email Communication**: Manage email correspondence
- **Health Checks**: Built-in health monitoring endpoints

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

3. **Environment Setup:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tourist_village_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup:**
   
   Create the database:
   ```sql
   CREATE DATABASE tourist_village_db;
   ```

5. **Run Migrations:**
   ```bash
   npm run migrate:latest
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

### Health Check Endpoints

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
│   └── health.ts           # Health check routes
├── types/                  # TypeScript type definitions
├── middleware/             # Express middleware
├── services/               # Business logic services
└── index.ts               # Application entry point
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
