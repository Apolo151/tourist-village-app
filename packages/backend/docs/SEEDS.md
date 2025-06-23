# Database Seeds Guide

This guide explains how to use the database seeds to set up initial data for the Tourist Village Management System.

## Available Seeds

### 1. Super Admin Seed (`001_create_super_admin.ts`)
Creates a super administrator account for system management.

### 2. Sample Data Seed (`002_sample_data.ts`)  
Creates sample users, villages, apartments, and services for development/testing.

## Quick Start

### Create Super Admin Only
```bash
# Run only the super admin seed
npm run seed:run -- --specific=001_create_super_admin.ts
```

### Create All Sample Data
```bash
# Run all seeds (super admin + sample data)
npm run seed:run
```

### Reset and Recreate Database
```bash
# Reset database and create fresh data
npm run migrate:rollback
npm run migrate:latest
npm run seed:run
```

## Super Admin Account

After running the super admin seed:

**📧 Email:** `admin@touristvillage.com`  
**🔒 Password:** `SuperAdmin123!`  
**👤 Role:** `super_admin`

### First Login Steps

1. **Login via API:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@touristvillage.com",
    "password": "SuperAdmin123!"
  }'
```

2. **Change Password Immediately:**
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "SuperAdmin123!",
    "new_password": "YourNewSecurePassword123!"
  }'
```

## Sample Data (Development Only)

The sample data seed creates:

### 👥 Sample Users
| Name | Email | Role | Password |
|------|-------|------|----------|
| Admin User | admin.user@example.com | admin | SampleUser123! |
| John Smith | john.smith@example.com | owner | SampleUser123! |
| Sarah Johnson | sarah.johnson@example.com | owner | SampleUser123! |
| Mike Wilson | mike.wilson@example.com | renter | SampleUser123! |

### 🏘️ Sample Villages
- **Sunset Beach Village** (3 phases)
  - Electricity: 0.125 EGP/unit
  - Gas: 0.075 EGP/unit
- **Mountain View Resort** (2 phases)
  - Electricity: 0.130 EGP/unit  
  - Gas: 0.080 EGP/unit

### 🏠 Sample Apartments
- **Beachfront Villa A1** (Sunset Beach, Phase 1, Owner: John Smith)
- **Ocean View Apartment B2** (Sunset Beach, Phase 2, Owner: John Smith)
- **Sunset Cottage C3** (Sunset Beach, Phase 3, Owner: Sarah Johnson)
- **Mountain Cabin M1** (Mountain View, Phase 1, Owner: Sarah Johnson)

### 💰 Payment Methods
- Cash
- Bank Transfer
- Credit Card

### 🔧 Service Types
- **Cleaning Service** (50 EGP)
- **Maintenance** (100 EGP)
- **Airport Transfer** (25 GBP)

## Testing with Sample Data

### Test Different User Roles

```bash
# Login as Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.user@example.com","password":"SampleUser123!"}'

# Login as Owner
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.smith@example.com","password":"SampleUser123!"}'

# Login as Renter
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mike.wilson@example.com","password":"SampleUser123!"}'
```

### Test API Endpoints

```bash
# Get all villages (Admin only)
curl -X GET http://localhost:3000/api/villages \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get all apartments
curl -X GET http://localhost:3000/api/apartments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get user profile
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Seed File Structure

### Super Admin Seed
```typescript
// Checks if super admin exists
// Hashes password securely with bcrypt
// Creates super_admin user
// Provides login credentials
```

### Sample Data Seed
```typescript
// Only runs in development (NODE_ENV !== 'production')
// Checks if sample data exists
// Creates users with different roles
// Creates villages with realistic data
// Creates apartments with ownership
// Creates payment methods and service types
// Links data with proper foreign keys
```

## Environment Considerations

### Development
- ✅ Both seeds available
- ✅ Sample data includes test users
- ✅ All features can be tested

### Production
- ✅ Super admin seed available
- ❌ Sample data seed **automatically skipped**
- 🔒 Only essential admin account created

## Security Notes

### ⚠️ Important Security Reminders

1. **Change default passwords immediately**
2. **Sample data is for development only**
3. **Super admin has full system access**
4. **Use strong passwords in production**
5. **Regular security audits recommended**

### Production Setup
```bash
# Production environment
export NODE_ENV=production

# Only super admin will be created
npm run seed:run

# Change password immediately after first login
```

## Troubleshooting

### Seed Already Exists
```bash
# Seeds are idempotent - they check for existing data
# To force recreate, reset the database first:
npm run migrate:rollback
npm run migrate:latest
npm run seed:run
```

### Permission Errors
```bash
# Ensure database user has INSERT permissions
# Check database connection in .env file
npm run migrate:latest  # Should work if seeds fail
```

### Password Issues
```bash
# If you forget the super admin password:
# 1. Reset database and re-run seeds, OR
# 2. Manually update password hash in database
```

## Advanced Usage

### Run Specific Seeds
```bash
# Run only super admin seed
npx knex seed:run --specific=001_create_super_admin.ts

# Run only sample data seed
npx knex seed:run --specific=002_sample_data.ts
```

### Create Custom Seeds
```bash
# Generate new seed file
npm run seed:make your_custom_seed_name

# Edit the generated file in src/database/seeds/
# Follow the pattern of existing seeds
```

### Development Workflow
```bash
# Complete fresh start
npm run migrate:rollback
npm run migrate:latest
npm run seed:run

# Start development server
npm run dev

# Test with sample users
# Develop new features
# Test authentication and authorization
```

This seed system provides a solid foundation for both development and production environments! 