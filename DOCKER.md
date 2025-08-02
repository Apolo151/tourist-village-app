# Tourist Village Management System - Docker Setup

## 🐳 Docker Compose Configuration

This directory contains comprehensive Docker Compose configurations for the Tourist Village Management System.

### 📁 Files Overview

- **`docker-compose.yaml`** - Main configuration with all services
- **`docker-compose.dev.yaml`** - Development environment overrides
- **`docker-compose.prod.yaml`** - Production environment overrides  
- **`docker-compose.monitoring.yaml`** - Optional monitoring and logging services
- **`docker-manage.sh`** - Management script for common operations
- **`.env.example`** - Environment variables template

### 🚀 Quick Start

#### 1. Initial Setup
```bash
# Copy environment files
cp .env.example .env
cp packages/backend/env.example packages/backend/.env

# Edit the environment files with your configuration
nano .env
nano packages/backend/.env

# Run setup (will build images)
./docker-manage.sh setup
```

#### 2. Development Environment
```bash
# Start development environment with hot reload
./docker-manage.sh dev

# Or manually:
docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
```

#### 3. Production Environment
```bash
# Start production environment
./docker-manage.sh prod

# Or manually:
docker-compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
```

### 🛠️ Management Commands

The `docker-manage.sh` script provides convenient commands:

```bash
# Basic operations
./docker-manage.sh setup     # Initial setup
./docker-manage.sh dev       # Start development
./docker-manage.sh prod      # Start production
./docker-manage.sh stop      # Stop all services
./docker-manage.sh restart   # Restart services
./docker-manage.sh logs      # View logs

# Database operations
./docker-manage.sh migrate   # Run migrations
./docker-manage.sh seed      # Seed database
./docker-manage.sh reset     # Reset database
./docker-manage.sh backup    # Backup database
./docker-manage.sh restore backup.sql  # Restore from backup

# Maintenance
./docker-manage.sh test      # Run tests
./docker-manage.sh clean     # Clean up containers/volumes
```

### 🌐 Service URLs

#### Development Environment
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432
- **PgAdmin**: http://localhost:5050
- **Redis**: localhost:6379

#### Production Environment
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432

### 📊 Optional Services

#### Monitoring Stack
```bash
# Start with monitoring
docker-compose -f docker-compose.yaml -f docker-compose.monitoring.yaml --profile monitoring up -d

# Access monitoring tools
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3003 (admin/admin123)
```

#### Database Administration
```bash
# Start PgAdmin
docker-compose --profile admin up pgadmin -d

# Access: http://localhost:5050
# Email: admin@touristvillage.com
# Password: admin123
```

### 🔧 Configuration

#### Environment Variables

**Main `.env` file:**
```bash
# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-32-chars-min
JWT_REFRESH_SECRET=your-refresh-secret-32-chars-min

# Database
POSTGRES_DB=tourist_village_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password

# API Configuration
VITE_API_URL=http://localhost:3001/api
```

**Backend `.env` file:**
```bash
# Database Connection
DATABASE_URL=postgresql://postgres:password@db:5432/tourist_village_db

# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
```

### 🗂️ Volumes and Data Persistence

The system uses named Docker volumes for data persistence:

- **`postgres_data`** - Database data
- **`redis_data`** - Redis cache data
- **`pgadmin_data`** - PgAdmin configuration

#### Backup and Restore

```bash
# Manual database backup
docker-compose exec -T db pg_dump -U postgres tourist_village_db > backup.sql

# Manual restore
docker-compose exec -T db psql -U postgres -d tourist_village_db < backup.sql

# Automated backups with script
./docker-manage.sh backup
```

### 🔒 Security Considerations

#### Development
- Default passwords are used (change in production)
- All services exposed on localhost
- Hot reload enabled for development

#### Production
- Use strong passwords and JWT secrets
- Configure SSL/TLS certificates
- Use reverse proxy for secure external access
- Regular security updates

#### SSL Configuration (Production)
```bash
# Place SSL certificates in ./ssl/ directory
./ssl/cert.pem
./ssl/key.pem

# Update nginx-proxy configuration
# Start with proxy profile
docker-compose --profile proxy up -d
```

### 🧪 Testing

```bash
# Run all tests
./docker-manage.sh test

# Run specific test suites
docker-compose exec backend npm run test:services
docker-compose exec backend npm run test:routes
docker-compose exec backend npm run test:coverage
```

### 🔍 Monitoring and Logging

#### Application Logs
```bash
# View all logs
./docker-manage.sh logs

# Follow logs in real-time
./docker-manage.sh logs -f

# Service-specific logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db
```

#### Health Checks
All services include health checks:
- **Database**: PostgreSQL connection test
- **Backend**: HTTP health endpoint
- **Frontend**: Nginx status
- **Redis**: Redis ping

### 🚨 Troubleshooting

#### Common Issues

**Port conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :3000
netstat -tulpn | grep :5432

# Change ports in docker-compose.yaml if needed
```

**Permission issues:**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x docker-manage.sh
```

**Database connection issues:**
```bash
# Check database logs
docker-compose logs db

# Reset database
./docker-manage.sh reset
```

**Build issues:**
```bash
# Clean rebuild
docker-compose down
docker system prune -f
docker-compose build --no-cache
```

#### Service Status
```bash
# Check service status
docker-compose ps

# Check service health
docker-compose exec backend curl -f http://localhost:3000/api/health
```

### 📝 Development Notes

#### Hot Reload
- Backend: Uses `ts-node-dev` for TypeScript hot reload
- Frontend: Uses Vite dev server with HMR
- Database: Schema changes require migrations

#### Database Schema Updates
```bash
# Create new migration
docker-compose exec backend npm run migrate:make migration_name

# Run migrations
./docker-manage.sh migrate

# Rollback migrations
docker-compose exec backend npm run migrate:rollback
```

#### Adding New Services
1. Add service definition to `docker-compose.yaml`
2. Configure networking and dependencies
3. Add health checks if applicable
4. Update management scripts if needed

### 🔄 CI/CD Integration

The Docker setup is designed for easy CI/CD integration:

```bash
# Build for CI
docker-compose build --parallel

# Run tests in CI
docker-compose -f docker-compose.yaml -f docker-compose.test.yaml run --rm test

# Deploy to production
docker-compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
```
