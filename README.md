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

## 🚀 Local Setup

### Prerequisites

- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 12 or higher
- **npm** or **yarn**: Package manager

### 📦 Direct Installation Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Apolo151/tourist-village-app.git
cd tourist-village-app
```

#### 2. Backend Setup
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

#### 3. Database Setup
```bash
# Create database
createdb tourist_village_db

# Run migrations
npm run migrate

# Seed initial data
npm run seed:run
```

#### 4. Start Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

#### 5. Frontend Setup
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

### 🐳 Docker Setup

#### Prerequisites for Docker
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

#### 1. Clone Repository
```bash
git clone https://github.com/Apolo151/tourist-village-app.git
cd tourist-village-app
```

#### 2. Environment Configuration
```bash
# Backend environment
cp packages/backend/env.example packages/backend/.env
```

Update the backend `.env` file for Docker:
```bash
# Database Configuration (Docker)
DATABASE_URL=postgresql://postgres:password@db:5432/tourist_village_db
DB_HOST=db
DB_PORT=5432
DB_NAME=tourist_village_db
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
```

#### 3. Build and Run with Docker Compose
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build
```

#### 4. Initialize Database
```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed initial data
docker-compose exec backend npm run seed:run
```

#### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432

#### Docker Management Commands
```bash
# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose up --build backend

# Access backend container
docker-compose exec backend bash
```

### 🧪 Testing

#### Backend Tests
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

#### Frontend Tests
```bash
cd packages/frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### 📝 Development Notes

#### Default Admin Account
After seeding the database, use these credentials to log in:
- **Email**: `admin@example.com`
- **Password**: `admin123`

#### API Documentation
The backend includes comprehensive API documentation available at `http://localhost:3000/api-docs` when running in development mode.

#### Database Migrations
```bash
# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

#### Environment Variables
Critical environment variables that must be configured:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: Refresh token secret
- `FRONTEND_URL`: Frontend URL for CORS configuration

### 🔒 Security Considerations

- Change default JWT secrets in production
- Use environment-specific database credentials
- Enable HTTPS in production environments
- Regularly update dependencies for security patches
- Follow proper backup procedures for production data

### 📚 Additional Resources

- **Backend Documentation**: `/packages/backend/docs/`
- **API Reference**: Available at runtime via Swagger UI
- **Database Schema**: `/docs/ERD.md`
- **UI Specifications**: `/docs/UI-Pages.md` 
