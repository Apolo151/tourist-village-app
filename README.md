# 🏝️ Tourist Village Management System

A comprehensive full-stack application designed to manage tourist village operations, including apartment bookings, payment processing, service requests, utility monitoring, and financial reporting.

## 🌟 Project Overview

The Tourist Village Management System is a sophisticated property management solution tailored for tourist accommodations. It provides a complete ecosystem for managing multiple village properties, handling bookings from both owners and renters, tracking financial transactions, and maintaining detailed operational records.

### 🎯 Key Features

- **🏘️ Multi-Village Management**: Support for multiple tourist villages with configurable utility pricing and development phases
- **🏠 Property Management**: Comprehensive apartment tracking with owner assignment, status monitoring, and financial analytics
- **📅 Booking System**: Advanced reservation management with conflict detection, multi-user support, and automated status tracking
- **💰 Financial Management**: Multi-currency payment processing (EGP/GBP), automated billing, and detailed financial reporting
- **🔧 Service Management**: Service request system with predefined service types, cost tracking, and assignee management
- **⚡ Utility Monitoring**: Water and electricity usage tracking with automated billing calculations
- **📧 Communication Hub**: Email correspondence logging with categorization and search capabilities
- **👥 User Management**: Role-based access control supporting super admins, admins, owners, and renters
- **📊 Analytics Dashboard**: Interactive reports and visualizations for occupancy rates, financial summaries, and operational metrics

## 🏗️ Architecture

### Monorepo Structure

```
tourist-village/
├── packages/
│   ├── backend/          # Express.js + TypeScript API
│   └── frontend/         # React 19 + Vite SPA
├── docs/                 # Documentation (ERD, UI specs)
├── Dockerfile            # Unified production build
└── docker-compose.yaml   # Container orchestration
```

### Backend Components

- **🔗 API Layer**: Express.js REST API with TypeScript
- **🗄️ Database**: PostgreSQL with Knex.js query builder
- **🔐 Authentication**: JWT-based security with refresh tokens
- **🛡️ Authorization**: Role-based access control (RBAC)
- **✅ Validation**: Comprehensive input validation and business rule enforcement
- **🧪 Testing**: Jest testing framework with extensive coverage

### Frontend Components

- **⚛️ React Framework**: Modern React 19 with TypeScript
- **🎨 Material-UI**: Professional UI components and design system
- **📊 Data Visualization**: Chart.js for analytics and reporting
- **📅 Date Management**: Advanced date/time pickers for scheduling
- **📄 Document Generation**: PDF and Excel export capabilities
- **🔄 State Management**: Context API for authentication and global state

### Key Application Pages

#### Dashboard & Analytics
- **Home/Reports Page**: Interactive financial analytics with filtering by village, payment method, and apartment
- **Export Functionality**: Generate PDF and Excel reports for financial data

#### Property Management
- **Apartments Page**: Complete apartment listing with village filtering, status tracking, and owner management
- **Apartment Details**: Comprehensive property view showing financial summaries, bookings, payments, and service history
- **Quick Actions**: Streamlined workflows for adding bookings, payments, emails, and service requests

#### Booking Management
- **Bookings Page**: Advanced booking interface with date filtering, conflict detection, and status management
- **Booking Details**: Detailed booking view with related payments, service requests, and communication history
- **Smart Scheduling**: Automatic conflict prevention and availability checking

#### Financial Operations
- **Payments Management**: Multi-currency transaction processing with comprehensive filtering options
- **Billing System**: Automated invoice generation based on utility usage and service requests
- **Financial Reporting**: Detailed profit/loss statements and transaction histories

#### Service & Communication
- **Service Types & Requests**: Service catalog management with cost tracking and assignee workflows
- **Email Management**: Communication logging with apartment and booking associations
- **Utility Readings**: Water and electricity monitoring with automated billing calculations

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 12 or higher
- **npm** or **yarn**: Package manager

---

## 📦 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Apolo151/tourist-village-app.git
cd tourist-village-app
```

### 2. Backend Setup
```bash
cd packages/backend

# Install dependencies
npm install

# Environment configuration
cp env.example .env
```

Edit the `.env` file with your configuration:
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/tourist_village_db

# JWT Secrets (Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 3. Database Setup
```bash
# Create database
createdb tourist_village_db

# Run migrations
npm run migrate

# Seed initial data
npm run seed:run
```

### 4. Start Backend Server
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### 5. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

---

## 🐳 Docker Setup

The application uses a unified Docker image that serves both the frontend (statically) and backend API from a single container.

### Prerequisites for Docker
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

### Quick Start (Production Mode)

```bash
# Clone repository
git clone https://github.com/Apolo151/tourist-village-app.git
cd tourist-village-app

# Start all services (database + app)
docker compose up -d --build

# View logs
docker compose logs -f app
```

**Access the application at**: http://localhost:3000

### Environment Configuration

Create a `.env` file in the project root for production settings:

```bash
# Database
DB_PASSWORD=your-secure-password

# JWT Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret

# Optional
NODE_ENV=production
BCRYPT_ROUNDS=12
```

### Development Mode with Hot Reload

For development with hot reload on both frontend and backend:

```bash
# Start development services
docker compose --profile dev up -d

# View logs
docker compose --profile dev logs -f
```

**Development access points:**
- **Frontend (Vite HMR)**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **PgAdmin**: http://localhost:5050

### Docker Services Overview

| Service | Port | Description | Profile |
|---------|------|-------------|---------|
| `db` | 5432 | PostgreSQL database | default |
| `app` | 3000 | Unified app (API + static frontend) | default |
| `pgadmin` | 5050 | Database admin UI | dev, tools |
| `backend-dev` | 3001 | Backend with hot reload | dev |
| `frontend-dev` | 5173 | Vite dev server with HMR | dev |

### Docker Commands Reference

```bash
# Production
docker compose up -d              # Start in background
docker compose down               # Stop all services
docker compose logs -f app        # View app logs
docker compose restart app        # Restart app service

# Development
docker compose --profile dev up -d           # Start dev environment
docker compose --profile dev down            # Stop dev environment
docker compose --profile tools up -d pgadmin # Start only pgadmin

# Database operations
docker compose exec app npm run migrate      # Run migrations
docker compose exec app npm run seed:run     # Seed database

# Rebuild
docker compose build --no-cache app          # Rebuild app image
docker compose up -d --build                 # Rebuild and start
```

### Database Management with PgAdmin

```bash
# Start pgadmin
docker compose --profile tools up -d pgadmin
```

Access at http://localhost:5050 with:
- **Email**: admin@touristvillage.com
- **Password**: admin123

Connect to database:
- **Host**: db
- **Port**: 5432
- **Database**: tourist_village_db
- **User**: postgres
- **Password**: password (or your `DB_PASSWORD`)

---

## 🧪 Testing

### Backend Tests
```bash
cd packages/backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:services
npm run test:routes
npm run test:middleware
```

### Frontend Tests
```bash
cd packages/frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## 📝 Development Notes

### Default Admin Account
After seeding the database, use these credentials to log in:
- **Email**: `admin@example.com`
- **Password**: `admin123`

### API Documentation
The backend API is available at `/api` with endpoints documented at:
- **Health Check**: `GET /api/health`
- **API Info**: `GET /api`

### Database Migrations
```bash
cd packages/backend

# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `DB_PASSWORD` | Database password | password |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | 60m |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 7d |
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 3000 |
| `FRONTEND_URL` | Frontend URL for CORS | - |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |

---

## 🔒 Security Considerations

- **Change default JWT secrets** in production
- **Use strong database passwords** with environment-specific credentials
- **Enable HTTPS** in production environments
- **Regularly update dependencies** for security patches
- **Follow proper backup procedures** for production data
- **Never commit `.env` files** to version control

---

## 📚 Additional Resources

- **Backend Documentation**: `/packages/backend/docs/`
- **Database Schema**: `/docs/ERD.md`
- **UI Specifications**: `/docs/UI-Pages.md`
- **Docker Guide**: `/DOCKER.md`
