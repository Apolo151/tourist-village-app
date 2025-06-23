import { PaymentService } from '../../src/services/paymentService';
import { 
  getTestDb, 
  createTestUser, 
  createTestVillage, 
  createTestApartment,
  createTestBooking,
  createTestPaymentMethod,
  createTestPayment,
  cleanupDatabase 
} from '../setup';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let testUser: any;
  let testVillage: any;
  let testApartment: any;
  let testBooking: any;
  let testPaymentMethod: any;

  beforeAll(() => {
    paymentService = new PaymentService();
  });

  beforeEach(async () => {
    const db = getTestDb();
    
    // Create test data in correct order
    const [userId] = await db('users')
      .insert(createTestUser())
      .returning('id');
    testUser = { id: typeof userId === 'object' ? userId.id : userId };

    const [villageId] = await db('villages')
      .insert(createTestVillage({ created_by: testUser.id }))
      .returning('id');
    testVillage = { id: typeof villageId === 'object' ? villageId.id : villageId };

    const [apartmentId] = await db('apartments')
      .insert(createTestApartment({ 
        village_id: testVillage.id, 
        owner_id: testUser.id,
        created_by: testUser.id 
      }))
      .returning('id');
    testApartment = { id: typeof apartmentId === 'object' ? apartmentId.id : apartmentId };

    const [bookingId] = await db('bookings')
      .insert(createTestBooking({ 
        apartment_id: testApartment.id,
        user_id: testUser.id,
        created_by: testUser.id 
      }))
      .returning('id');
    testBooking = { id: typeof bookingId === 'object' ? bookingId.id : bookingId };

    const [methodId] = await db('payment_methods')
      .insert(createTestPaymentMethod({ created_by: testUser.id }))
      .returning('id');
    testPaymentMethod = { id: typeof methodId === 'object' ? methodId.id : methodId };
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        booking_id: testBooking.id,
        method_id: testPaymentMethod.id
      });

      const result = await paymentService.createPayment(paymentData, testUser.id);

      expect(result).toBeDefined();
      expect(result.apartment_id).toBe(testApartment.id);
      expect(result.amount).toBe(1000.00);
      expect(result.currency).toBe('EGP');
      expect(result.created_by).toBe(testUser.id);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        amount: 1000,
        currency: 'EGP' as const
      };

      await expect(
        paymentService.createPayment(invalidData as any, testUser.id)
      ).rejects.toThrow('Apartment, amount, currency, payment method, user type, and date are required');
    });

    it('should validate currency values', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        method_id: testPaymentMethod.id,
        currency: 'USD' as any
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Currency must be EGP or GBP');
    });

    it('should validate positive amounts', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        method_id: testPaymentMethod.id,
        amount: -100
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate apartment existence', async () => {
      const paymentData = createTestPayment({
        apartment_id: 99999,
        method_id: testPaymentMethod.id
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Apartment not found');
    });

    it('should validate payment method existence', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        method_id: 99999
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Payment method not found');
    });

    it('should validate booking-apartment relationship', async () => {
      // Create another apartment
      const [anotherApartmentId] = await getTestDb()('apartments')
        .insert(createTestApartment({ 
          name: 'Another Apartment',
          village_id: testVillage.id, 
          owner_id: testUser.id,
          created_by: testUser.id 
        }))
        .returning('id');

      const paymentData = createTestPayment({
        apartment_id: typeof anotherApartmentId === 'object' ? anotherApartmentId.id : anotherApartmentId,
        booking_id: testBooking.id, // This booking belongs to different apartment
        method_id: testPaymentMethod.id
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Booking not found or does not belong to the specified apartment');
    });
  });

  describe('getPayments', () => {
    let payment1: any;
    let payment2: any;

    beforeEach(async () => {
      // Create test payments
      payment1 = await paymentService.createPayment(
        createTestPayment({
          apartment_id: testApartment.id,
          method_id: testPaymentMethod.id,
          amount: 1000,
          currency: 'EGP'
        }), 
        testUser.id
      );

      payment2 = await paymentService.createPayment(
        createTestPayment({
          apartment_id: testApartment.id,
          method_id: testPaymentMethod.id,
          amount: 500,
          currency: 'GBP',
          date: '2024-01-20'
        }), 
        testUser.id
      );
    });

    it('should get all payments with pagination', async () => {
      const result = await paymentService.getPayments({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter by currency', async () => {
      const result = await paymentService.getPayments({ currency: 'EGP' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].currency).toBe('EGP');
      expect(result.data[0].amount).toBe(1000);
    });

    it('should filter by amount range', async () => {
      const result = await paymentService.getPayments({ 
        amount_min: 600,
        amount_max: 1200 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toBe(1000);
    });

    it('should filter by apartment', async () => {
      const result = await paymentService.getPayments({ 
        apartment_id: testApartment.id 
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(p => p.apartment_id === testApartment.id)).toBe(true);
    });

    it('should search across related fields', async () => {
      const result = await paymentService.getPayments({ 
        search: 'Test Apartment' 
      });

      expect(result.data).toHaveLength(2);
    });

    it('should sort by amount', async () => {
      const result = await paymentService.getPayments({ 
        sort_by: 'amount',
        sort_order: 'desc'
      });

      expect(result.data[0].amount).toBe(1000);
      expect(result.data[1].amount).toBe(500);
    });

    it('should include related data', async () => {
      const result = await paymentService.getPayments({});

      expect(result.data[0].apartment).toBeDefined();
      expect(result.data[0].apartment?.name).toBe('Test Apartment');
      expect(result.data[0].payment_method).toBeDefined();
      expect(result.data[0].payment_method?.name).toBe('Test Payment Method');
    });
  });

  describe('getPaymentById', () => {
    let payment: any;

    beforeEach(async () => {
      payment = await paymentService.createPayment(
        createTestPayment({
          apartment_id: testApartment.id,
          booking_id: testBooking.id,
          method_id: testPaymentMethod.id
        }), 
        testUser.id
      );
    });

    it('should get payment by valid ID', async () => {
      const result = await paymentService.getPaymentById(payment.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(payment.id);
      expect(result?.amount).toBe(1000);
      expect(result?.apartment).toBeDefined();
      expect(result?.booking).toBeDefined();
      expect(result?.payment_method).toBeDefined();
    });

    it('should return null for invalid ID', async () => {
      const result = await paymentService.getPaymentById(99999);
      expect(result).toBeNull();
    });

    it('should return null for zero or negative ID', async () => {
      const result1 = await paymentService.getPaymentById(0);
      const result2 = await paymentService.getPaymentById(-1);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('updatePayment', () => {
    let payment: any;

    beforeEach(async () => {
      payment = await paymentService.createPayment(
        createTestPayment({
          apartment_id: testApartment.id,
          method_id: testPaymentMethod.id
        }), 
        testUser.id
      );
    });

    it('should update payment successfully', async () => {
      const result = await paymentService.updatePayment(payment.id, {
        amount: 1500,
        currency: 'GBP',
        description: 'Updated payment'
      });

      expect(result.amount).toBe(1500);
      expect(result.currency).toBe('GBP');
      expect(result.description).toBe('Updated payment');
    });

    it('should validate updated amount', async () => {
      await expect(
        paymentService.updatePayment(payment.id, { amount: -100 })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate updated currency', async () => {
      await expect(
        paymentService.updatePayment(payment.id, { currency: 'USD' as any })
      ).rejects.toThrow('Currency must be EGP or GBP');
    });

    it('should reject update for non-existent payment', async () => {
      await expect(
        paymentService.updatePayment(99999, { amount: 1500 })
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('deletePayment', () => {
    let payment: any;

    beforeEach(async () => {
      payment = await paymentService.createPayment(
        createTestPayment({
          apartment_id: testApartment.id,
          method_id: testPaymentMethod.id
        }), 
        testUser.id
      );
    });

    it('should delete payment successfully', async () => {
      await paymentService.deletePayment(payment.id);

      const result = await paymentService.getPaymentById(payment.id);
      expect(result).toBeNull();
    });

    it('should reject deletion of non-existent payment', async () => {
      await expect(
        paymentService.deletePayment(99999)
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getPaymentStats', () => {
    beforeEach(async () => {
      // Create diverse test data for statistics
      await paymentService.createPayment(
        createTestPayment({
          apartment_id: testApartment.id,
          method_id: testPaymentMethod.id,
          amount: 1000,
          currency: 'EGP',
          user_type: 'owner'
        }), 
        testUser.id
      );

      await paymentService.createPayment(
        createTestPayment({
          apartment_id: testApartment.id,
          method_id: testPaymentMethod.id,
          amount: 500,
          currency: 'GBP',
          user_type: 'renter'
        }), 
        testUser.id
      );
    });

    it('should return comprehensive payment statistics', async () => {
      const stats = await paymentService.getPaymentStats();

      expect(stats).toBeDefined();
      expect(stats.total_payments).toBe(2);
      expect(stats.total_amounts).toBeDefined();
      expect(stats.total_amounts.EGP).toBe(1000);
      expect(stats.total_amounts.GBP).toBe(500);
      expect(stats.by_currency).toHaveLength(2);
      expect(stats.by_user_type).toHaveLength(2);
      expect(stats.by_village).toHaveLength(1);
      expect(stats.by_payment_method).toHaveLength(1);
    });

    it('should group statistics by currency correctly', async () => {
      const stats = await paymentService.getPaymentStats();

      const egpStats = stats.by_currency.find(c => c.currency === 'EGP');
      const gbpStats = stats.by_currency.find(c => c.currency === 'GBP');

      expect(egpStats?.count).toBe(1);
      expect(egpStats?.total_amount).toBe(1000);
      expect(gbpStats?.count).toBe(1);
      expect(gbpStats?.total_amount).toBe(500);
    });

    it('should group statistics by user type correctly', async () => {
      const stats = await paymentService.getPaymentStats();

      const ownerStats = stats.by_user_type.find(u => u.user_type === 'owner');
      const renterStats = stats.by_user_type.find(u => u.user_type === 'renter');

      expect(ownerStats?.count).toBe(1);
      expect(ownerStats?.total_amount_egp).toBe(1000);
      expect(renterStats?.count).toBe(1);
      expect(renterStats?.total_amount_gbp).toBe(500);
    });
  });

  describe('Input Validation', () => {
    it('should handle maximum amount limits', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        method_id: testPaymentMethod.id,
        amount: 1000000000 // Too large
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Amount is too large');
    });

    it('should validate date format', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        method_id: testPaymentMethod.id,
        date: 'invalid-date'
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Invalid date format');
    });

    it('should validate description length', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        method_id: testPaymentMethod.id,
        description: 'a'.repeat(1001) // Too long
      });

      await expect(
        paymentService.createPayment(paymentData, testUser.id)
      ).rejects.toThrow('Description must not exceed 1,000 characters');
    });
  });

  describe('Edge Cases', () => {
    it('should handle payments without bookings', async () => {
      const paymentData = createTestPayment({
        apartment_id: testApartment.id,
        method_id: testPaymentMethod.id,
        booking_id: undefined // No booking
      });

      const result = await paymentService.createPayment(paymentData, testUser.id);

      expect(result).toBeDefined();
      expect(result.booking_id).toBeUndefined();
    });

    it('should handle empty search results', async () => {
      const result = await paymentService.getPayments({ 
        search: 'non-existent-term' 
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle pagination beyond available data', async () => {
      const result = await paymentService.getPayments({ 
        page: 100,
        limit: 10 
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.page).toBe(100);
      expect(result.pagination.total).toBe(0);
    });
  });
}); 