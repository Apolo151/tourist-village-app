import { db } from '../database/connection';
import {
  PaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  PaymentMethodFilters,
  PaginatedResponse,
  PublicUser
} from '../types';

export class PaymentMethodService {
  
  /**
   * Get all payment methods with filtering, sorting, and pagination
   */
  async getPaymentMethods(filters: PaymentMethodFilters = {}): Promise<PaginatedResponse<PaymentMethod & { 
    created_by_user?: PublicUser;
    usage_count?: number;
  }>> {
    const {
      created_by,
      search,
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'asc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('payment_methods as pm')
      .leftJoin('users as creator', 'pm.created_by', 'creator.id')
      .select(
        'pm.*',
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      );

    // Apply filters
    if (created_by) {
      query = query.where('pm.created_by', created_by);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.where(function() {
        this.where('pm.name', 'ilike', `%${searchTerm}%`)
            .orWhere('creator.name', 'ilike', `%${searchTerm}%`);
      });
    }

    // Get total count for pagination
    const countQuery = db('payment_methods as pm')
      .leftJoin('users as creator', 'pm.created_by', 'creator.id');

    // Apply the same filters to count query
    if (created_by) countQuery.where('pm.created_by', created_by);
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery.where(function() {
        this.where('pm.name', 'ilike', `%${searchTerm}%`)
            .orWhere('creator.name', 'ilike', `%${searchTerm}%`);
      });
    }

    const [{ count }] = await countQuery.count('pm.id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['name', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    query = query.orderBy(`pm.${sortField}`, validSortOrder);

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const paymentMethods = await query;

    // Get usage count for each payment method
    const paymentMethodIds = paymentMethods.map(pm => pm.id);
    let usageCounts: any[] = [];
    
    if (paymentMethodIds.length > 0) {
      usageCounts = await db('payments')
        .select('method_id')
        .count('id as usage_count')
        .whereIn('method_id', paymentMethodIds)
        .groupBy('method_id');
    }

    const usageCountMap = usageCounts.reduce((acc, item) => {
      acc[item.method_id] = parseInt(item.usage_count as string);
      return acc;
    }, {} as Record<number, number>);

    // Transform data
    const transformedPaymentMethods = paymentMethods.map((pm: any) => ({
      id: pm.id,
      name: pm.name,
      created_by: pm.created_by,
      created_at: new Date(pm.created_at),
      updated_at: new Date(pm.updated_at),
      usage_count: usageCountMap[pm.id] || 0,
      created_by_user: pm.creator_name ? {
        id: pm.created_by,
        name: pm.creator_name,
        email: pm.creator_email,
        phone_number: pm.creator_phone || undefined,
        role: pm.creator_role,
        is_active: Boolean(pm.creator_is_active),
        created_at: new Date(pm.creator_created_at),
        updated_at: new Date(pm.creator_updated_at)
      } : undefined
    }));

    return {
      data: transformedPaymentMethods,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get payment method by ID
   */
  async getPaymentMethodById(id: number): Promise<(PaymentMethod & { 
    created_by_user?: PublicUser;
    usage_count?: number;
  }) | null> {
    if (!id || id <= 0) {
      return null;
    }

    const paymentMethod = await db('payment_methods as pm')
      .leftJoin('users as creator', 'pm.created_by', 'creator.id')
      .select(
        'pm.*',
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      )
      .where('pm.id', id)
      .first();

    if (!paymentMethod) {
      return null;
    }

    // Get usage count
    const [{ count: usageCount }] = await db('payments')
      .where('method_id', id)
      .count('id as count');

    return {
      id: paymentMethod.id,
      name: paymentMethod.name,
      created_by: paymentMethod.created_by,
      created_at: new Date(paymentMethod.created_at),
      updated_at: new Date(paymentMethod.updated_at),
      usage_count: parseInt(usageCount as string),
      created_by_user: paymentMethod.creator_name ? {
        id: paymentMethod.created_by,
        name: paymentMethod.creator_name,
        email: paymentMethod.creator_email,
        phone_number: paymentMethod.creator_phone || undefined,
        role: paymentMethod.creator_role,
        is_active: Boolean(paymentMethod.creator_is_active),
        created_at: new Date(paymentMethod.creator_created_at),
        updated_at: new Date(paymentMethod.creator_updated_at)
      } : undefined
    };
  }

  /**
   * Create new payment method
   */
  async createPaymentMethod(data: CreatePaymentMethodRequest, createdBy: number): Promise<PaymentMethod> {
    // Input validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Payment method name is required and must be a non-empty string');
    }

    if (data.name.trim().length > 100) {
      throw new Error('Payment method name must not exceed 100 characters');
    }

    const name = data.name.trim();

    // Check if payment method with same name already exists
    const existingPaymentMethod = await db('payment_methods')
      .where('name', 'ilike', name)
      .first();

    if (existingPaymentMethod) {
      throw new Error('Payment method with this name already exists');
    }

    try {
      const [paymentMethodId] = await db('payment_methods')
        .insert({
          name,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof paymentMethodId === 'object' ? paymentMethodId.id : paymentMethodId;
      
      const paymentMethod = await this.getPaymentMethodById(id);
      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      return paymentMethod;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw error;
      }
      throw new Error(`Failed to create payment method: ${error.message}`);
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(id: number, data: UpdatePaymentMethodRequest): Promise<PaymentMethod> {
    if (!id || id <= 0) {
      throw new Error('Invalid payment method ID');
    }

    // Check if payment method exists
    const existingPaymentMethod = await this.getPaymentMethodById(id);
    if (!existingPaymentMethod) {
      throw new Error('Payment method not found');
    }

    // Validate updates
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw new Error('Payment method name must be a non-empty string');
      }

      if (data.name.trim().length > 100) {
        throw new Error('Payment method name must not exceed 100 characters');
      }

      const name = data.name.trim();

      // Check if another payment method with same name already exists
      const existingWithSameName = await db('payment_methods')
        .where('name', 'ilike', name)
        .whereNot('id', id)
        .first();

      if (existingWithSameName) {
        throw new Error('Payment method with this name already exists');
      }
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date() };

    if (data.name !== undefined) updateData.name = data.name.trim();

    try {
      await db('payment_methods').where('id', id).update(updateData);

      const updatedPaymentMethod = await this.getPaymentMethodById(id);
      if (!updatedPaymentMethod) {
        throw new Error('Failed to update payment method');
      }

      return updatedPaymentMethod;
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('not found')) {
        throw error;
      }
      throw new Error(`Failed to update payment method: ${error.message}`);
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid payment method ID');
    }

    // Check if payment method exists
    const paymentMethod = await this.getPaymentMethodById(id);
    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Check if payment method is being used in any payments
    const [{ count: paymentCount }] = await db('payments')
      .where('method_id', id)
      .count('id as count');

    if (parseInt(paymentCount as string) > 0) {
      throw new Error('Cannot delete payment method that is being used in payments');
    }

    try {
      await db('payment_methods').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete payment method: ${error.message}`);
    }
  }

  /**
   * Get payment method statistics
   */
  async getPaymentMethodStats(): Promise<{
    total_methods: number;
    most_used: { id: number; name: string; usage_count: number }[];
    least_used: { id: number; name: string; usage_count: number }[];
    unused_methods: { id: number; name: string }[];
  }> {
    // Total payment methods
    const [{ count: totalMethods }] = await db('payment_methods').count('id as count');

    // Payment methods with usage counts
    const methodsWithUsage = await db('payment_methods as pm')
      .leftJoin('payments as p', 'pm.id', 'p.method_id')
      .select('pm.id', 'pm.name')
      .count('p.id as usage_count')
      .groupBy('pm.id', 'pm.name')
      .orderBy('usage_count', 'desc');

    const mostUsed = methodsWithUsage.slice(0, 5).map(item => ({
      id: Number(item.id),
      name: String(item.name),
      usage_count: parseInt(item.usage_count as string)
    }));

    const leastUsed = methodsWithUsage.slice(-5).reverse().map(item => ({
      id: Number(item.id),
      name: String(item.name),
      usage_count: parseInt(item.usage_count as string)
    }));

    const unusedMethods = methodsWithUsage
      .filter(item => parseInt(item.usage_count as string) === 0)
      .map(item => ({
        id: Number(item.id),
        name: String(item.name)
      }));

    return {
      total_methods: parseInt(totalMethods as string),
      most_used: mostUsed,
      least_used: leastUsed,
      unused_methods: unusedMethods
    };
  }
} 