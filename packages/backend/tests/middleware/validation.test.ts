import { Request, Response, NextFunction } from 'express';
import { ValidationMiddleware } from '../../src/middleware/validation';
import { getTestDb, createTestUser, createTestPaymentMethod } from '../setup';

// Mock response object
const createMockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const createMockNext = () => jest.fn() as NextFunction;

describe('ValidationMiddleware', () => {
  describe('validateCreatePaymentMethod', () => {
    it('should pass validation with valid data', async () => {
      const req = {
        body: { name: 'Credit Card' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject empty name', async () => {
      const req = {
        body: { name: '' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Payment method name is required and must be a non-empty string'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject missing name', async () => {
      const req = {
        body: {}
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject name that is too long', async () => {
      const req = {
        body: { name: 'a'.repeat(101) }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Payment method name must not exceed 100 characters'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should trim whitespace from name', async () => {
      const req = {
        body: { name: '  Credit Card  ' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(req.body.name).toBe('Credit Card');
      expect(next).toHaveBeenCalled();
    });

    it('should reject duplicate names', async () => {
      const db = getTestDb();
      
      // Create a user and payment method
      const [userId] = await db('users')
        .insert(createTestUser())
        .returning('id');
      
      await db('payment_methods')
        .insert({ name: 'Existing Method', created_by: typeof userId === 'object' ? userId.id : userId });

      const req = {
        body: { name: 'Existing Method' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Payment method with this name already exists'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject duplicate names case-insensitively', async () => {
      const db = getTestDb();
      
      // Create a user and payment method
      const [userId] = await db('users')
        .insert(createTestUser())
        .returning('id');
      
      await db('payment_methods')
        .insert({ name: 'Cash', created_by: typeof userId === 'object' ? userId.id : userId });

      const req = {
        body: { name: 'CASH' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateUpdatePaymentMethod', () => {
    let existingMethodId: number;

    beforeEach(async () => {
      const db = getTestDb();
      const [userId] = await db('users')
        .insert(createTestUser())
        .returning('id');
      
      const [methodId] = await db('payment_methods')
        .insert({ name: 'Existing Method', created_by: typeof userId === 'object' ? userId.id : userId })
        .returning('id');
      
      existingMethodId = typeof methodId === 'object' ? methodId.id : methodId;
    });

    it('should pass validation with valid update data', async () => {
      const req = {
        params: { id: existingMethodId.toString() },
        body: { name: 'Updated Method' }
      } as any;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePaymentMethod(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should require at least one field to update', async () => {
      const req = {
        params: { id: existingMethodId.toString() },
        body: {}
      } as any;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'general',
              message: 'At least one field is required for update'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate name length in updates', async () => {
      const req = {
        params: { id: existingMethodId.toString() },
        body: { name: 'a'.repeat(101) }
      } as any;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow updating to the same name (case variations)', async () => {
      const req = {
        params: { id: existingMethodId.toString() },
        body: { name: 'EXISTING METHOD' }
      } as any;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePaymentMethod(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateCreatePayment', () => {
    let testApartmentId: number;
    let testBookingId: number;
    let testPaymentMethodId: number;

    beforeEach(async () => {
      const db = getTestDb();
      
      // Create test data
      const [userId] = await db('users')
        .insert(createTestUser())
        .returning('id');
      
      const [villageId] = await db('villages')
        .insert({
          name: 'Test Village',
          electricity_price: 1.5,
          water_price: 2.0,
          phases: 3,
          created_by: typeof userId === 'object' ? userId.id : userId
        })
        .returning('id');
      
      const [apartmentId] = await db('apartments')
        .insert({
          name: 'Test Apartment',
          village_id: typeof villageId === 'object' ? villageId.id : villageId,
          phase: 1,
          owner_id: typeof userId === 'object' ? userId.id : userId,
          paying_status: 'rent',
          created_by: typeof userId === 'object' ? userId.id : userId
        })
        .returning('id');
      
      const [bookingId] = await db('bookings')
        .insert({
          apartment_id: typeof apartmentId === 'object' ? apartmentId.id : apartmentId,
          user_id: typeof userId === 'object' ? userId.id : userId,
          user_type: 'owner',
          arrival_date: '2024-01-10',
          leaving_date: '2024-01-20',
          status: 'Booked',
          created_by: typeof userId === 'object' ? userId.id : userId
        })
        .returning('id');
      
      const [methodId] = await db('payment_methods')
        .insert({
          name: 'Test Method',
          created_by: typeof userId === 'object' ? userId.id : userId
        })
        .returning('id');
      
      testApartmentId = typeof apartmentId === 'object' ? apartmentId.id : apartmentId;
      testBookingId = typeof bookingId === 'object' ? bookingId.id : bookingId;
      testPaymentMethodId = typeof methodId === 'object' ? methodId.id : methodId;
    });

    it('should pass validation with valid payment data', async () => {
      const req = {
        body: {
          apartment_id: testApartmentId,
          booking_id: testBookingId,
          amount: 1000,
          currency: 'EGP',
          method_id: testPaymentMethodId,
          user_type: 'owner',
          date: '2024-01-15',
          description: 'Test payment'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
      const testCases = [
        { field: 'apartment_id', data: { amount: 1000, currency: 'EGP', method_id: testPaymentMethodId, user_type: 'owner', date: '2024-01-15' } },
        { field: 'amount', data: { apartment_id: testApartmentId, currency: 'EGP', method_id: testPaymentMethodId, user_type: 'owner', date: '2024-01-15' } },
        { field: 'currency', data: { apartment_id: testApartmentId, amount: 1000, method_id: testPaymentMethodId, user_type: 'owner', date: '2024-01-15' } },
        { field: 'method_id', data: { apartment_id: testApartmentId, amount: 1000, currency: 'EGP', user_type: 'owner', date: '2024-01-15' } },
        { field: 'user_type', data: { apartment_id: testApartmentId, amount: 1000, currency: 'EGP', method_id: testPaymentMethodId, date: '2024-01-15' } },
        { field: 'date', data: { apartment_id: testApartmentId, amount: 1000, currency: 'EGP', method_id: testPaymentMethodId, user_type: 'owner' } }
      ];

      for (const testCase of testCases) {
        const req = { body: testCase.data } as Request;
        const res = createMockResponse();
        const next = createMockNext();

        await ValidationMiddleware.validateCreatePayment(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Validation failed'
          })
        );
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should validate amount is positive', async () => {
      const testCases = [0, -100, -0.01];

      for (const amount of testCases) {
        const req = {
          body: {
            apartment_id: testApartmentId,
            amount: amount,
            currency: 'EGP',
            method_id: testPaymentMethodId,
            user_type: 'owner',
            date: '2024-01-15'
          }
        } as Request;
        const res = createMockResponse();
        const next = createMockNext();

        await ValidationMiddleware.validateCreatePayment(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'amount',
                message: 'Amount must be greater than 0'
              })
            ])
          })
        );
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should validate amount is not too large', async () => {
      const req = {
        body: {
          apartment_id: testApartmentId,
          amount: 1000000000, // 1 billion
          currency: 'EGP',
          method_id: testPaymentMethodId,
          user_type: 'owner',
          date: '2024-01-15'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'amount',
              message: 'Amount is too large (maximum: 999,999,999.99)'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate currency values', async () => {
      const invalidCurrencies = ['USD', 'EUR', 'invalid', '', null];

      for (const currency of invalidCurrencies) {
        const req = {
          body: {
            apartment_id: testApartmentId,
            amount: 1000,
            currency: currency,
            method_id: testPaymentMethodId,
            user_type: 'owner',
            date: '2024-01-15'
          }
        } as Request;
        const res = createMockResponse();
        const next = createMockNext();

        await ValidationMiddleware.validateCreatePayment(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'currency',
                message: 'Currency must be EGP or GBP'
              })
            ])
          })
        );
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should validate user_type values', async () => {
      const invalidUserTypes = ['admin', 'invalid', '', null];

      for (const userType of invalidUserTypes) {
        const req = {
          body: {
            apartment_id: testApartmentId,
            amount: 1000,
            currency: 'EGP',
            method_id: testPaymentMethodId,
            user_type: userType,
            date: '2024-01-15'
          }
        } as Request;
        const res = createMockResponse();
        const next = createMockNext();

        await ValidationMiddleware.validateCreatePayment(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'user_type',
                message: 'User type must be owner or renter'
              })
            ])
          })
        );
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should validate date format', async () => {
      const invalidDates = ['invalid-date', '2024-13-01', '2024-01-32', '', null];

      for (const date of invalidDates) {
        const req = {
          body: {
            apartment_id: testApartmentId,
            amount: 1000,
            currency: 'EGP',
            method_id: testPaymentMethodId,
            user_type: 'owner',
            date: date
          }
        } as Request;
        const res = createMockResponse();
        const next = createMockNext();

        await ValidationMiddleware.validateCreatePayment(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'date',
                message: 'Date must be in valid ISO format (YYYY-MM-DD)'
              })
            ])
          })
        );
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should validate description length', async () => {
      const req = {
        body: {
          apartment_id: testApartmentId,
          amount: 1000,
          currency: 'EGP',
          method_id: testPaymentMethodId,
          user_type: 'owner',
          date: '2024-01-15',
          description: 'a'.repeat(1001)
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'description',
              message: 'Description must not exceed 1,000 characters'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate apartment exists', async () => {
      const req = {
        body: {
          apartment_id: 99999,
          amount: 1000,
          currency: 'EGP',
          method_id: testPaymentMethodId,
          user_type: 'owner',
          date: '2024-01-15'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'apartment_id',
              message: 'Apartment not found'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate payment method exists', async () => {
      const req = {
        body: {
          apartment_id: testApartmentId,
          amount: 1000,
          currency: 'EGP',
          method_id: 99999,
          user_type: 'owner',
          date: '2024-01-15'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'method_id',
              message: 'Payment method not found'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate booking-apartment relationship when booking is provided', async () => {
      // Create another apartment
      const db = getTestDb();
      const [anotherApartmentId] = await db('apartments')
        .insert({
          name: 'Another Apartment',
          village_id: testApartmentId, // Use existing village
          phase: 2,
          owner_id: testApartmentId, // Use existing user
          paying_status: 'rent',
          created_by: testApartmentId
        })
        .returning('id');

      const req = {
        body: {
          apartment_id: typeof anotherApartmentId === 'object' ? anotherApartmentId.id : anotherApartmentId,
          booking_id: testBookingId, // This booking belongs to different apartment
          amount: 1000,
          currency: 'EGP',
          method_id: testPaymentMethodId,
          user_type: 'owner',
          date: '2024-01-15'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'booking_id',
              message: 'Booking not found or does not belong to the specified apartment'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow optional booking_id', async () => {
      const req = {
        body: {
          apartment_id: testApartmentId,
          // booking_id: undefined
          amount: 1000,
          currency: 'EGP',
          method_id: testPaymentMethodId,
          user_type: 'owner',
          date: '2024-01-15'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validateUpdatePayment', () => {
    it('should pass validation with valid update data', async () => {
      const req = {
        body: {
          amount: 1500,
          currency: 'GBP',
          description: 'Updated payment'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePayment(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should require at least one field for update', async () => {
      const req = {
        body: {}
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'general',
              message: 'At least one field is required for update'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate amount in updates', async () => {
      const req = {
        body: { amount: -100 }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'amount',
              message: 'Amount must be greater than 0'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate currency in updates', async () => {
      const req = {
        body: { currency: 'USD' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'currency',
              message: 'Currency must be EGP or GBP'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate date format in updates', async () => {
      const req = {
        body: { date: 'invalid-date' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
                        expect.objectContaining({
              field: 'date',
              message: 'Date must be in valid ISO format (YYYY-MM-DD)'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate description length in updates', async () => {
      const req = {
        body: { description: 'a'.repeat(1001) }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateUpdatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'description',
              message: 'Description must not exceed 1,000 characters'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalDb = getTestDb();
      jest.spyOn(originalDb, 'select').mockRejectedValue(new Error('Database connection failed'));

      const req = {
        body: { name: 'Test Method' }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error'
        })
      );
      expect(next).not.toHaveBeenCalled();

      // Restore the mock
      jest.restoreAllMocks();
    });

    it('should handle multiple validation errors', async () => {
      const req = {
        body: {
          apartment_id: 99999, // Invalid apartment
          amount: -100, // Invalid amount
          currency: 'USD', // Invalid currency
          method_id: 99999, // Invalid method
          user_type: 'invalid', // Invalid user type
          date: 'invalid-date', // Invalid date
          description: 'a'.repeat(1001) // Too long description
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'amount' }),
            expect.objectContaining({ field: 'currency' }),
            expect.objectContaining({ field: 'user_type' }),
            expect.objectContaining({ field: 'date' }),
            expect.objectContaining({ field: 'description' })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should sanitize input data', async () => {
      const req = {
        body: {
          name: '  <script>alert("xss")</script>Credit Card  ',
          description: '<img src="x" onerror="alert(1)">Payment description'
        }
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await ValidationMiddleware.validateCreatePaymentMethod(req, res, next);

      // Should have trimmed whitespace and potentially sanitized HTML
      expect(req.body.name).not.toContain('<script>');
      expect(req.body.name).toBe('Credit Card'); // Should be trimmed
    });
  });
}); 