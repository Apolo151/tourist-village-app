#!/bin/bash

# Docker management script for Tourist Village Management System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    echo "Tourist Village Management System - Docker Management"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup           Initial setup (copy env files, build images)"
    echo "  dev             Start development environment"
    echo "  prod            Start production environment"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  logs            Show logs for all services"
    echo "  clean           Remove all containers and volumes"
    echo "  reset           Reset database (removes all data)"
    echo "  backup          Backup database"
    echo "  restore [file]  Restore database from backup"
    echo "  migrate         Run database migrations"
    echo "  seed            Seed database with initial data"
    echo "  test            Run tests"
    echo ""
    echo "Options:"
    echo "  -f, --follow    Follow logs (for logs command)"
    echo "  -v, --verbose   Verbose output"
    echo "  -h, --help      Show this help message"
}

# Check if Docker and Docker Compose are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Initial setup
setup() {
    print_status "Setting up Tourist Village Management System..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_warning "Created .env file from .env.example. Please update the values."
    fi
    
    # Copy backend environment file if it doesn't exist
    if [ ! -f "packages/backend/.env" ]; then
        cp packages/backend/env.example packages/backend/.env
        print_warning "Created backend .env file. Please update the values."
    fi
    
    # Build images
    print_status "Building Docker images..."
    docker-compose build
    
    print_success "Setup completed successfully"
    print_warning "Please update the .env files with your configuration before starting the services"
}

# Start development environment
start_dev() {
    print_status "Starting development environment..."
    docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Run migrations
    migrate
    
    # Seed database
    seed
    
    print_success "Development environment started successfully"
    print_status "Frontend: http://localhost:5173"
    print_status "Backend API: http://localhost:3001"
    print_status "PgAdmin: http://localhost:5050"
}

# Start production environment
start_prod() {
    print_status "Starting production environment..."
    docker-compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 15
    
    # Run migrations
    migrate
    
    print_success "Production environment started successfully"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:3001"
}

# Stop all services
stop() {
    print_status "Stopping all services..."
    docker-compose down
    print_success "All services stopped"
}

# Restart services
restart() {
    print_status "Restarting services..."
    stop
    sleep 5
    docker-compose up -d
    print_success "Services restarted"
}

# Show logs
show_logs() {
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        docker-compose logs -f
    else
        docker-compose logs
    fi
}

# Clean up everything
clean() {
    print_warning "This will remove all containers, networks, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Reset database
reset_db() {
    print_warning "This will delete all data in the database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Resetting database..."
        docker-compose exec backend npm run migrate:rollback
        docker-compose exec backend npm run migrate
        docker-compose exec backend npm run seed:run
        print_success "Database reset completed"
    else
        print_status "Database reset cancelled"
    fi
}

# Backup database
backup_db() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_status "Creating database backup: $backup_file"
    
    docker-compose exec -T db pg_dump -U postgres tourist_village_db > "backups/$backup_file"
    
    print_success "Database backup created: backups/$backup_file"
}

# Restore database
restore_db() {
    if [ -z "$1" ]; then
        print_error "Please specify backup file to restore"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        print_error "Backup file not found: $1"
        exit 1
    fi
    
    print_warning "This will replace all data in the database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Restoring database from: $1"
        docker-compose exec -T db psql -U postgres -d tourist_village_db < "$1"
        print_success "Database restored successfully"
    else
        print_status "Database restore cancelled"
    fi
}

# Run migrations
migrate() {
    print_status "Running database migrations..."
    docker-compose exec backend npm run migrate
    print_success "Migrations completed"
}

# Seed database
seed() {
    print_status "Seeding database with initial data..."
    docker-compose exec backend npm run seed:run
    print_success "Database seeded successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    docker-compose exec backend npm test
    print_success "Tests completed"
}

# Create backups directory if it doesn't exist
mkdir -p backups

# Main command handler
case "$1" in
    setup)
        check_prerequisites
        setup
        ;;
    dev)
        check_prerequisites
        start_dev
        ;;
    prod)
        check_prerequisites
        start_prod
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        show_logs "$2"
        ;;
    clean)
        clean
        ;;
    reset)
        reset_db
        ;;
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    migrate)
        migrate
        ;;
    seed)
        seed
        ;;
    test)
        run_tests
        ;;
    -h|--help|help)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
