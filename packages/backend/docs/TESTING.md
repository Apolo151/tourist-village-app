# Testing Guide for Tourist Village Backend

This document provides a comprehensive guide for testing the Tourist Village Management System backend.

## Prerequisites

Before running tests, ensure you have the required testing dependencies installed:

```bash
# Install Jest and testing utilities
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Optional: Install additional testing utilities
npm install --save-dev @types/bcrypt
```

## Test Setup

### Database Configuration

Tests use a separate test database to avoid interfering with development data. The test setup automatically:

1. Creates a test database connection
2. Runs migrations for the test environment
3. Cleans up data between tests
4. Closes connections after tests complete

### Test Database Setup

Create a test database (optional - tests will attempt to create one):

```sql
CREATE DATABASE tourist_village_test;
```

Update your `.env` file or create a `.env.test` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/tourist_village_test
NODE_ENV=test
```

## Running Tests

### All Tests

```bash
# Run all tests once
npm test

# Run tests with detailed output
npm run test:verbose

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, coverage)
npm run test:ci
```

### Watch Mode

```bash
# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Specific Test Categories

```bash
# Run only service tests
npm run test:services

# Run only route/integration tests
npm run test:routes

# Run only middleware tests
npm run test:middleware
```

### Individual Test Files

```bash
# Run a specific test file
npx jest tests/services/paymentService.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="PaymentService"

# Run tests in a specific directory
npx jest tests/services/
```

## Test Structure

### Test Organization

```
tests/
├── setup.ts                           # Global test configuration and utilities
├── services/                          # Service layer unit tests
│   ├── paymentService.test.ts         # Payment service tests
│   ├── paymentMethodService.test.ts   # Payment method service tests
│   └── authService.test.ts            # Authentication service tests
├── routes/                            # Route/integration tests
│   └── payments.test.ts               # Payment route tests
└── middleware/                        # Middleware tests
    └── validation.test.ts             # Validation middleware tests
```

### Test Categories

#### 1. Service Layer Tests (`tests/services/`)

**Coverage:**
- CRUD operations
- Business logic validation
- Database interactions
- Error handling
- Edge cases

**Example Test Scenarios:**
- Creating, updating, deleting entities
- Input validation and sanitization
- Complex filtering and search functionality
- Statistics and aggregation operations
- Access control and permissions

#### 2. Route/Integration Tests (`tests/routes/`)

**Coverage:**
- HTTP endpoints
- Request/response handling
- Authentication and authorization
- Input validation middleware
- Error responses
- Status codes

**Example Test Scenarios:**
- GET, POST, PUT, DELETE endpoints
- Authentication requirements
- Role-based access control
- Query parameter handling
- Request body validation

#### 3. Middleware Tests (`tests/middleware/`)

**Coverage:**
- Input validation
- Authentication token verification
- Role-based authorization
- Error handling
- Data sanitization

**Example Test Scenarios:**
- Field validation rules
- Required field checking
- Data type validation
- Security checks
- Database constraint validation

## Test Utilities

### Test Data Generators

The `tests/setup.ts` file provides utility functions for creating test data:

```typescript
// Create test entities
const user = createTestUser({ role: 'admin' });
const village = createTestVillage({ name: 'Test Village' });
const apartment = createTestApartment({ village_id: villageId });
const payment = createTestPayment({ amount: 1000 });

// Create test tokens for authentication
const adminToken = createTestToken(userId, 'admin');
const ownerToken = createTestToken(userId, 'owner');
```

### Database Utilities

```typescript
// Get test database connection
const db = getTestDb();

// Clean database between tests
await cleanupDatabase();

// Create test data in correct dependency order
```

### Mock Utilities

Tests use mocking for:
- JWT token generation and verification
- External service calls
- Database errors
- Authentication middleware

## Test Coverage

### Coverage Reports

Generate coverage reports to understand test effectiveness:

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Goals

- **Services:** >90% line coverage
- **Routes:** >85% line coverage  
- **Middleware:** >95% line coverage
- **Overall:** >85% line coverage

### Coverage Analysis

The coverage report shows:
- **Lines:** Percentage of code lines executed
- **Functions:** Percentage of functions called
- **Branches:** Percentage of code branches taken
- **Statements:** Percentage of statements executed

## Test Data Management

### Database Cleanup

Tests automatically clean up data between test runs:

```typescript
beforeEach(async () => {
  await cleanupDatabase(); // Cleans all test data
});
```

### Test Isolation

Each test is isolated by:
- Using a separate test database
- Cleaning data between tests
- Using fresh database connections
- Mocking external dependencies

### Data Dependencies

Test data is created in the correct order to satisfy foreign key constraints:

1. Users
2. Villages  
3. Apartments
4. Bookings
5. Payment Methods
6. Payments
7. Service Types
8. Service Requests
9. Utility Readings
10. Emails

## Test Debugging

### Debug Specific Tests

```bash
# Run a single test with debug output
npx jest --no-coverage --verbose tests/services/paymentService.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="should create payment"
```

### Debug with VS Code

Add this to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Console Output

Enable/disable console logs in tests by modifying `tests/setup.ts`:

```typescript
global.console = {
  ...console,
  log: jest.fn(),    // Disable logs
  // log: console.log  // Enable logs
};
```

## Continuous Integration

### CI/CD Configuration

For GitHub Actions or similar CI systems:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: tourist_village_test
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### CI Test Commands

```bash
# Run tests suitable for CI (no watch, with coverage)
npm run test:ci

# Check if tests pass without generating coverage
npm test -- --passWithNoTests
```

## Performance Testing

### Test Performance

Monitor test execution time:

```bash
# Run tests with timing information
npx jest --verbose --detectOpenHandles

# Run tests with performance debugging
npx jest --logHeapUsage
```

### Optimization Tips

1. **Use beforeAll vs beforeEach appropriately**
   - `beforeAll`: Setup that can be shared across tests
   - `beforeEach`: Setup that needs to be fresh for each test

2. **Clean up resources**
   - Close database connections
   - Clear timeouts and intervals
   - Clean up mocks

3. **Parallel execution**
   - Jest runs tests in parallel by default
   - Use `--runInBand` for debugging

## Best Practices

### Writing Tests

1. **Test Structure (AAA Pattern)**
   ```typescript
   it('should create payment successfully', async () => {
     // Arrange
     const paymentData = createTestPayment();
     
     // Act
     const result = await paymentService.createPayment(paymentData, userId);
     
     // Assert
     expect(result).toBeDefined();
     expect(result.amount).toBe(1000);
   });
   ```

2. **Test Naming**
   - Use descriptive names
   - Include the expected behavior
   - Use "should" format

3. **Test Independence**
   - Each test should be independent
   - Clean up data between tests
   - Don't rely on test execution order

4. **Mock External Dependencies**
   - Mock JWT tokens
   - Mock external APIs
   - Mock file system operations

### Error Testing

```typescript
// Test error conditions
it('should reject invalid payment data', async () => {
  await expect(
    paymentService.createPayment(invalidData, userId)
  ).rejects.toThrow('Amount must be positive');
});
```

### Async Testing

```typescript
// Handle promises properly
it('should handle async operations', async () => {
  const result = await someAsyncOperation();
  expect(result).toBeDefined();
});
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database exists
   - Check connection string
   - Verify database permissions

2. **Test Timeouts**
   - Increase test timeout in Jest config
   - Check for unclosed database connections
   - Look for infinite loops

3. **Mock Issues**
   - Clear mocks between tests
   - Verify mock implementations
   - Check mock call counts

4. **Memory Leaks**
   - Close database connections
   - Clear event listeners
   - Clean up timers

### Debug Commands

```bash
# Find open handles that prevent Jest from exiting
npx jest --detectOpenHandles

# Run tests with detailed error output
npx jest --verbose --no-coverage

# Check for memory leaks
npx jest --logHeapUsage
```

## Test Examples

### Service Test Example

```typescript
describe('PaymentService', () => {
  describe('createPayment', () => {
    it('should create payment with valid data', async () => {
      const result = await paymentService.createPayment(validData, userId);
      expect(result.amount).toBe(1000);
    });
    
    it('should reject negative amounts', async () => {
      await expect(
        paymentService.createPayment({ ...validData, amount: -100 }, userId)
      ).rejects.toThrow('Amount must be positive');
    });
  });
});
```

### Route Test Example

```typescript
describe('GET /api/payments', () => {
  it('should return payments for authenticated user', async () => {
    const response = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

### Middleware Test Example

```typescript
describe('validateCreatePayment', () => {
  it('should pass with valid data', async () => {
    const req = { body: validPaymentData };
    const res = createMockResponse();
    const next = jest.fn();
    
    await ValidationMiddleware.validateCreatePayment(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
```

## Conclusion

This testing suite provides comprehensive coverage of the Tourist Village Management System backend, ensuring:

- **Reliability:** All critical functionality is tested
- **Maintainability:** Tests help prevent regressions
- **Documentation:** Tests serve as examples of how to use the API
- **Quality:** High test coverage ensures code quality

Regular testing helps maintain a stable, reliable system that can be safely deployed and maintained over time. 