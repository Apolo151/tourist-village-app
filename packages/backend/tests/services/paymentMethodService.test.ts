import { PaymentMethodService } from '../../src/services/paymentMethodService';
import { 
  getTestDb, 
  createTestUser,
  createTestPaymentMethod,
  cleanupDatabase 
} from '../setup';

describe('PaymentMethodService', () => {
  let paymentMethodService: PaymentMethodService;
  let testUser: any;

  beforeAll(() => {
    paymentMethodService = new PaymentMethodService();
  });

  beforeEach(async () => {
    const db = getTestDb();
    
    // Create test user
    const [userId] = await db('users')
      .insert(createTestUser())
      .returning('id');
    testUser = { id: typeof userId === 'object' ? userId.id : userId };
  });

  describe('createPaymentMethod', () => {
    it('should create a payment method successfully', async () => {
      const methodData = { name: 'Credit Card' };

      const result = await paymentMethodService.createPaymentMethod(methodData, testUser.id);

      expect(result).toBeDefined();
      expect(result.name).toBe('Credit Card');
      expect(result.created_by).toBe(testUser.id);
      expect(result.usage_count).toBe(0);
    });

    it('should validate required name field', async () => {
      await expect(
        paymentMethodService.createPaymentMethod({ name: '' }, testUser.id)
      ).rejects.toThrow('Payment method name is required and must be a non-empty string');

      await expect(
        paymentMethodService.createPaymentMethod({ name: null as any }, testUser.id)
      ).rejects.toThrow('Payment method name is required and must be a non-empty string');
    });

    it('should validate name length', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        paymentMethodService.createPaymentMethod({ name: longName }, testUser.id)
      ).rejects.toThrow('Payment method name must not exceed 100 characters');
    });

    it('should enforce unique names (case-insensitive)', async () => {
      await paymentMethodService.createPaymentMethod({ name: 'Cash' }, testUser.id);

      await expect(
        paymentMethodService.createPaymentMethod({ name: 'CASH' }, testUser.id)
      ).rejects.toThrow('Payment method with this name already exists');

      await expect(
        paymentMethodService.createPaymentMethod({ name: 'cash' }, testUser.id)
      ).rejects.toThrow('Payment method with this name already exists');
    });

    it('should trim whitespace from name', async () => {
      const result = await paymentMethodService.createPaymentMethod(
        { name: '  Bank Transfer  ' }, 
        testUser.id
      );

      expect(result.name).toBe('Bank Transfer');
    });
  });

  describe('getPaymentMethods', () => {
    beforeEach(async () => {
      // Create test payment methods
      await paymentMethodService.createPaymentMethod({ name: 'Cash' }, testUser.id);
      await paymentMethodService.createPaymentMethod({ name: 'Bank Transfer' }, testUser.id);
      await paymentMethodService.createPaymentMethod({ name: 'Credit Card' }, testUser.id);
    });

    it('should get all payment methods with pagination', async () => {
      const result = await paymentMethodService.getPaymentMethods({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter by creator', async () => {
      const result = await paymentMethodService.getPaymentMethods({ 
        created_by: testUser.id 
      });

      expect(result.data).toHaveLength(3);
      expect(result.data.every(pm => pm.created_by === testUser.id)).toBe(true);
    });

    it('should search by name', async () => {
      const result = await paymentMethodService.getPaymentMethods({ 
        search: 'Bank' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Bank Transfer');
    });

    it('should search by creator name', async () => {
      const result = await paymentMethodService.getPaymentMethods({ 
        search: 'Test User' 
      });

      expect(result.data).toHaveLength(3);
    });

    it('should sort by name ascending (default)', async () => {
      const result = await paymentMethodService.getPaymentMethods({});

      expect(result.data[0].name).toBe('Bank Transfer');
      expect(result.data[1].name).toBe('Cash');
      expect(result.data[2].name).toBe('Credit Card');
    });

    it('should sort by creation date descending', async () => {
      const result = await paymentMethodService.getPaymentMethods({ 
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      expect(result.data[0].name).toBe('Credit Card'); // Created last
      expect(result.data[2].name).toBe('Cash'); // Created first
    });

    it('should include creator user information', async () => {
      const result = await paymentMethodService.getPaymentMethods({});

      expect(result.data[0].created_by_user).toBeDefined();
      expect(result.data[0].created_by_user?.name).toBe('Test User');
      expect(result.data[0].created_by_user?.email).toBe('test@example.com');
    });

    it('should handle pagination correctly', async () => {
      const page1 = await paymentMethodService.getPaymentMethods({ 
        page: 1, 
        limit: 2 
      });

      expect(page1.data).toHaveLength(2);
      expect(page1.pagination.total_pages).toBe(2);

      const page2 = await paymentMethodService.getPaymentMethods({ 
        page: 2, 
        limit: 2 
      });

      expect(page2.data).toHaveLength(1);
    });
  });

  describe('getPaymentMethodById', () => {
    let paymentMethod: any;

    beforeEach(async () => {
      paymentMethod = await paymentMethodService.createPaymentMethod(
        { name: 'Test Method' }, 
        testUser.id
      );
    });

    it('should get payment method by valid ID', async () => {
      const result = await paymentMethodService.getPaymentMethodById(paymentMethod.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(paymentMethod.id);
      expect(result?.name).toBe('Test Method');
      expect(result?.usage_count).toBe(0);
      expect(result?.created_by_user).toBeDefined();
    });

    it('should return null for invalid ID', async () => {
      const result = await paymentMethodService.getPaymentMethodById(99999);
      expect(result).toBeNull();
    });

    it('should return null for zero or negative ID', async () => {
      const result1 = await paymentMethodService.getPaymentMethodById(0);
      const result2 = await paymentMethodService.getPaymentMethodById(-1);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('updatePaymentMethod', () => {
    let paymentMethod: any;

    beforeEach(async () => {
      paymentMethod = await paymentMethodService.createPaymentMethod(
        { name: 'Original Name' }, 
        testUser.id
      );
    });

    it('should update payment method successfully', async () => {
      const result = await paymentMethodService.updatePaymentMethod(paymentMethod.id, {
        name: 'Updated Name'
      });

      expect(result.id).toBe(paymentMethod.id);
      expect(result.name).toBe('Updated Name');
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should validate name uniqueness on update', async () => {
      await paymentMethodService.createPaymentMethod({ name: 'Another Method' }, testUser.id);

      await expect(
        paymentMethodService.updatePaymentMethod(paymentMethod.id, {
          name: 'Another Method'
        })
      ).rejects.toThrow('Payment method with this name already exists');
    });

    it('should allow updating to the same name (case-insensitive)', async () => {
      const result = await paymentMethodService.updatePaymentMethod(paymentMethod.id, {
        name: 'ORIGINAL NAME'
      });

      expect(result.name).toBe('ORIGINAL NAME');
    });

    it('should validate name length on update', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        paymentMethodService.updatePaymentMethod(paymentMethod.id, {
          name: longName
        })
      ).rejects.toThrow('Payment method name must not exceed 100 characters');
    });

    it('should reject update for non-existent payment method', async () => {
      await expect(
        paymentMethodService.updatePaymentMethod(99999, { name: 'New Name' })
      ).rejects.toThrow('Payment method not found');
    });

    it('should trim whitespace on update', async () => {
      const result = await paymentMethodService.updatePaymentMethod(paymentMethod.id, {
        name: '  Trimmed Name  '
      });

      expect(result.name).toBe('Trimmed Name');
    });
  });

  describe('deletePaymentMethod', () => {
    let paymentMethod: any;

    beforeEach(async () => {
      paymentMethod = await paymentMethodService.createPaymentMethod(
        { name: 'To Delete' }, 
        testUser.id
      );
    });

    it('should delete payment method successfully', async () => {
      await paymentMethodService.deletePaymentMethod(paymentMethod.id);

      const result = await paymentMethodService.getPaymentMethodById(paymentMethod.id);
      expect(result).toBeNull();
    });

    it('should reject deletion of non-existent payment method', async () => {
      await expect(
        paymentMethodService.deletePaymentMethod(99999)
      ).rejects.toThrow('Payment method not found');
    });

    it('should prevent deletion of payment method in use', async () => {
      const db = getTestDb();

      // Create dependencies to make payment method in use
      const [villageId] = await db('villages')
        .insert({
          name: 'Test Village',
          electricity_price: 1.5,
          water_price: 2.0,
          phases: 3,
          created_by: testUser.id
        })
        .returning('id');

      const [apartmentId] = await db('apartments')
        .insert({
          name: 'Test Apartment',
          village_id: typeof villageId === 'object' ? villageId.id : villageId,
          phase: 1,
          owner_id: testUser.id,
          paying_status: 'rent',
          created_by: testUser.id
        })
        .returning('id');

      // Create a payment using this method
      await db('payments')
        .insert({
          apartment_id: typeof apartmentId === 'object' ? apartmentId.id : apartmentId,
          created_by: testUser.id,
          amount: 1000,
          currency: 'EGP',
          method_id: paymentMethod.id,
          user_type: 'owner',
          date: '2024-01-15'
        });

      await expect(
        paymentMethodService.deletePaymentMethod(paymentMethod.id)
      ).rejects.toThrow('Cannot delete payment method that is being used in payments');
    });
  });

  describe('getPaymentMethodStats', () => {
    let method1: any;
    let method2: any;
    let method3: any;

    beforeEach(async () => {
      const db = getTestDb();

      // Create payment methods
      method1 = await paymentMethodService.createPaymentMethod({ name: 'Cash' }, testUser.id);
      method2 = await paymentMethodService.createPaymentMethod({ name: 'Bank' }, testUser.id);
      method3 = await paymentMethodService.createPaymentMethod({ name: 'Card' }, testUser.id);

      // Create dependencies for payments
      const [villageId] = await db('villages')
        .insert({
          name: 'Test Village',
          electricity_price: 1.5,
          water_price: 2.0,
          phases: 3,
          created_by: testUser.id
        })
        .returning('id');

      const [apartmentId] = await db('apartments')
        .insert({
          name: 'Test Apartment',
          village_id: typeof villageId === 'object' ? villageId.id : villageId,
          phase: 1,
          owner_id: testUser.id,
          paying_status: 'rent',
          created_by: testUser.id
        })
        .returning('id');

      const aptId = typeof apartmentId === 'object' ? apartmentId.id : apartmentId;

      // Create payments with different usage patterns
      await db('payments').insert([
        {
          apartment_id: aptId,
          created_by: testUser.id,
          amount: 1000,
          currency: 'EGP',
          method_id: method1.id,
          user_type: 'owner',
          date: '2024-01-15'
        },
        {
          apartment_id: aptId,
          created_by: testUser.id,
          amount: 500,
          currency: 'EGP',
          method_id: method1.id,
          user_type: 'owner',
          date: '2024-01-16'
        },
        {
          apartment_id: aptId,
          created_by: testUser.id,
          amount: 750,
          currency: 'EGP',
          method_id: method2.id,
          user_type: 'owner',
          date: '2024-01-17'
        }
        // method3 has no payments (unused)
      ]);
    });

    it('should return comprehensive payment method statistics', async () => {
      const stats = await paymentMethodService.getPaymentMethodStats();

      expect(stats).toBeDefined();
      expect(stats.total_methods).toBe(3);
      expect(stats.most_used).toHaveLength(3);
      expect(stats.least_used).toHaveLength(3);
      expect(stats.unused_methods).toHaveLength(1);
    });

    it('should identify most used methods correctly', async () => {
      const stats = await paymentMethodService.getPaymentMethodStats();

      expect(stats.most_used[0].name).toBe('Cash');
      expect(stats.most_used[0].usage_count).toBe(2);
      expect(stats.most_used[1].name).toBe('Bank');
      expect(stats.most_used[1].usage_count).toBe(1);
    });

    it('should identify unused methods correctly', async () => {
      const stats = await paymentMethodService.getPaymentMethodStats();

      expect(stats.unused_methods).toHaveLength(1);
      expect(stats.unused_methods[0].name).toBe('Card');
    });

    it('should handle empty statistics', async () => {
      // Clean up all payments
      await getTestDb()('payments').del();

      const stats = await paymentMethodService.getPaymentMethodStats();

      expect(stats.total_methods).toBe(3);
      expect(stats.unused_methods).toHaveLength(3);
      expect(stats.most_used.every(m => m.usage_count === 0)).toBe(true);
    });
  });

  describe('Usage Tracking', () => {
    let paymentMethod: any;

    beforeEach(async () => {
      paymentMethod = await paymentMethodService.createPaymentMethod(
        { name: 'Tracked Method' }, 
        testUser.id
      );
    });

    it('should track usage count accurately', async () => {
      const db = getTestDb();

      // Create dependencies
      const [villageId] = await db('villages')
        .insert({
          name: 'Test Village',
          electricity_price: 1.5,
          water_price: 2.0,
          phases: 3,
          created_by: testUser.id
        })
        .returning('id');

      const [apartmentId] = await db('apartments')
        .insert({
          name: 'Test Apartment',
          village_id: typeof villageId === 'object' ? villageId.id : villageId,
          phase: 1,
          owner_id: testUser.id,
          paying_status: 'rent',
          created_by: testUser.id
        })
        .returning('id');

      const aptId = typeof apartmentId === 'object' ? apartmentId.id : apartmentId;

      // Initially no usage
      let result = await paymentMethodService.getPaymentMethodById(paymentMethod.id);
      expect(result?.usage_count).toBe(0);

      // Create one payment
      await db('payments').insert({
        apartment_id: aptId,
        created_by: testUser.id,
        amount: 1000,
        currency: 'EGP',
        method_id: paymentMethod.id,
        user_type: 'owner',
        date: '2024-01-15'
      });

      result = await paymentMethodService.getPaymentMethodById(paymentMethod.id);
      expect(result?.usage_count).toBe(1);

      // Create another payment
      await db('payments').insert({
        apartment_id: aptId,
        created_by: testUser.id,
        amount: 500,
        currency: 'EGP',
        method_id: paymentMethod.id,
        user_type: 'owner',
        date: '2024-01-16'
      });

      result = await paymentMethodService.getPaymentMethodById(paymentMethod.id);
      expect(result?.usage_count).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const result = await paymentMethodService.getPaymentMethods({ 
        search: 'non-existent-method' 
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle pagination beyond available data', async () => {
      const result = await paymentMethodService.getPaymentMethods({ 
        page: 100,
        limit: 10 
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.page).toBe(100);
      expect(result.pagination.total).toBe(0);
    });

    it('should validate pagination limits', async () => {
      await paymentMethodService.createPaymentMethod({ name: 'Test' }, testUser.id);

      const result = await paymentMethodService.getPaymentMethods({ 
        page: 1,
        limit: 1000 // Exceeds maximum
      });

      expect(result.pagination.limit).toBe(100); // Should be capped at maximum
    });

    it('should handle invalid sort fields gracefully', async () => {
      await paymentMethodService.createPaymentMethod({ name: 'Test' }, testUser.id);

      const result = await paymentMethodService.getPaymentMethods({ 
        sort_by: 'invalid_field',
        sort_order: 'desc'
      });

      expect(result.data).toHaveLength(1); // Should still return data with default sort
    });
  });
}); 