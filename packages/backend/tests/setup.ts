import { Knex } from 'knex';
import knex from 'knex';
import knexConfig from '../knexfile';
import app from '../src/app';

// Export test app for integration tests
export const testApp = app;

// Test database connection
let testDb: Knex;

export const getTestDb = (): Knex => {
  if (!testDb) {
    // Use test database configuration
    const baseConfig = knexConfig.test || knexConfig.development;
    const config = {
      ...baseConfig,
      connection: {
        ...(baseConfig.connection as any),
        database: 'tourist_village_test'
      }
    };
    testDb = knex(config);
  }
  return testDb;
};

// Test data generators
export const createTestUser = (overrides: any = {}) => ({
  name: 'Test User',
  email: 'test@example.com',
  phone_number: '+1234567890',
  role: 'owner',
  password_hash: '$2b$12$test.hash.for.testing',
  is_active: true,
  ...overrides
});

export const createTestVillage = (overrides: any = {}) => ({
  name: 'Test Village',
  electricity_price: 1.5,
  water_price: 2.0,
  phases: 3,
  created_by: 1,
  ...overrides
});

export const createTestApartment = (overrides: any = {}) => ({
  name: 'Test Apartment',
  village_id: 1,
  phase: 1,
  owner_id: 1,
  purchase_date: '2024-01-01',
  paying_status: 'rent',
  created_by: 1,
  ...overrides
});

export const createTestBooking = (overrides: any = {}) => ({
  apartment_id: 1,
  user_id: 1,
  user_type: 'owner',
  arrival_date: '2024-01-10',
  leaving_date: '2024-01-20',
  status: 'not_arrived',
  created_by: 1,
  ...overrides
});

export const createTestPaymentMethod = (overrides: any = {}) => ({
  name: 'Test Payment Method',
  created_by: 1,
  ...overrides
});

export const createTestPayment = (overrides: any = {}) => ({
  apartment_id: 1,
  created_by: 1,
  amount: 1000.00,
  currency: 'EGP',
  method_id: 1,
  user_type: 'owner',
  date: '2024-01-15',
  description: 'Test payment',
  ...overrides
});

export const createTestServiceType = (overrides: any = {}) => ({
  name: 'Test Service',
  cost: 100.0,
  currency: 'EGP',
  description: 'Test service description',
  ...overrides
});

export const createTestEmail = (overrides: any = {}) => ({
  apartment_id: 1,
  date: '2024-01-15',
  from: 'test@example.com',
  to: 'recipient@example.com',
  subject: 'Test Email',
  content: 'Test email content',
  type: 'inquiry',
  created_by: 1,
  ...overrides
});

export const createTestUtilityReading = (overrides: any = {}) => ({
  apartment_id: 1,
  booking_id: 1,
  water_start_reading: 100,
  water_end_reading: 150,
  electricity_start_reading: 200,
  electricity_end_reading: 280,
  start_date: '2024-01-10',
  end_date: '2024-01-20',
  who_pays: 'owner',
  created_by: 1,
  ...overrides
});

// Cleanup utilities
export const cleanupDatabase = async () => {
  const db = getTestDb();
  
  // Clean up in reverse dependency order
  await db('emails').del();
  await db('payments').del();
  await db('payment_methods').del();
  await db('utility_readings').del();
  await db('service_requests').del();
  await db('service_types').del();
  await db('bookings').del();
  await db('apartments').del();
  await db('villages').del();
  await db('users').del();
};

// Mock JWT token for testing
export const createTestToken = (userId = 1, role = 'admin') => {
  // In real tests, you'd generate actual JWT tokens
  // For now, return a mock token structure
  return {
    id: userId,
    email: 'test@example.com',
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };
};

// Global test setup
beforeAll(async () => {
  // Initialize test database if needed
  const db = getTestDb();
  
  // Run migrations for test database
  try {
    await db.migrate.latest();
    console.log('Test database migrations completed');
  } catch (error) {
    console.warn('Test database migration failed, continuing anyway:', error);
  }
});

beforeEach(async () => {
  // Clean database before each test
  await cleanupDatabase();
});

afterAll(async () => {
  // Clean up and close connections
  await cleanupDatabase();
  const db = getTestDb();
  await db.destroy();
});

// Jest global setup
global.console = {
  ...console,
  // Uncomment to silence console logs in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}; 