import { db } from '../database/connection';
import {
  Payment,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  PaymentFilters,
  PaginatedResponse,
  PublicUser,
  Apartment,
  Booking,
  PaymentMethod
} from '../types';

export class PaymentService {
  
  /**
   * Get all payments with filtering, sorting, and pagination
   */
  async getPayments(filters: PaymentFilters = {}, villageFilter?: number): Promise<PaginatedResponse<Payment & { 
    apartment?: Apartment; 
    booking?: Booking;
    payment_method?: PaymentMethod;
    created_by_user?: PublicUser;
  }>> {
    const {
      apartment_id,
      booking_id,
      village_id,
      currency,
      method_id,
      user_type,
      date_from,
      date_to,
      amount_min,
      amount_max,
      created_by,
      search,
      page = 1,
      limit = 10,
      sort_by = 'date',
      sort_order = 'desc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('payments as p')
      .leftJoin('apartments as a', 'p.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'p.booking_id', 'b.id')
      .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
      .leftJoin('users as creator', 'p.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
      .select(
        'p.*',
        // Apartment details
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'a.owner_id as apartment_owner_id',
        'a.paying_status as apartment_paying_status',
        'a.created_by as apartment_created_by',
        'a.created_at as apartment_created_at',
        'a.updated_at as apartment_updated_at',
        // Village details
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'v.created_at as village_created_at',
        'v.updated_at as village_updated_at',
        // Apartment owner details
        'owner.name as owner_name',
        'owner.email as owner_email',
        'owner.phone_number as owner_phone',
        'owner.role as owner_role',
        'owner.is_active as owner_is_active',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
        // Booking details (if exists)
        'b.user_id as booking_user_id',
        'b.user_type as booking_user_type',
        'b.arrival_date as booking_arrival_date',
        'b.leaving_date as booking_leaving_date',
        'b.status as booking_status',
        'b.notes as booking_notes',
        'b.created_by as booking_created_by',
        'b.created_at as booking_created_at',
        'b.updated_at as booking_updated_at',
        // Booking user details
        'booking_user.name as booking_user_name',
        'booking_user.email as booking_user_email',
        'booking_user.phone_number as booking_user_phone',
        'booking_user.role as booking_user_role',
        'booking_user.is_active as booking_user_is_active',
        // Payment method details
        'pm.name as payment_method_name',
        'pm.created_by as payment_method_created_by',
        'pm.created_at as payment_method_created_at',
        'pm.updated_at as payment_method_updated_at',
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
    if (apartment_id) {
      query = query.where('p.apartment_id', apartment_id);
    }

    if (booking_id) {
      query = query.where('p.booking_id', booking_id);
    }

    if (village_id) {
      query = query.where('a.village_id', village_id);
    }

    if (currency) {
      query = query.where('p.currency', currency);
    }

    if (method_id) {
      query = query.where('p.method_id', method_id);
    }

    if (user_type) {
      query = query.where('p.user_type', user_type);
    }

    if (created_by) {
      query = query.where('p.created_by', created_by);
    }

    if (date_from) {
      query = query.where('p.date', '>=', new Date(date_from));
    }

    if (date_to) {
      query = query.where('p.date', '<=', new Date(date_to));
    }

    if (amount_min !== undefined) {
      query = query.where('p.amount', '>=', amount_min);
    }

    if (amount_max !== undefined) {
      query = query.where('p.amount', '<=', amount_max);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.where(function() {
        this.where('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('owner.name', 'ilike', `%${searchTerm}%`)
            .orWhere('booking_user.name', 'ilike', `%${searchTerm}%`)
            .orWhere('pm.name', 'ilike', `%${searchTerm}%`)
            .orWhere('p.description', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply village filter if provided (for admin users with responsible_village)
    if (villageFilter) {
      query = query.where('a.village_id', villageFilter);
    }

    // Get total count for pagination
    const countQuery = db('payments as p')
      .leftJoin('apartments as a', 'p.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'p.booking_id', 'b.id')
      .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id');

    // Apply the same filters to count query
    if (apartment_id) countQuery.where('p.apartment_id', apartment_id);
    if (booking_id) countQuery.where('p.booking_id', booking_id);
    if (village_id) countQuery.where('a.village_id', village_id);
    if (currency) countQuery.where('p.currency', currency);
    if (method_id) countQuery.where('p.method_id', method_id);
    if (user_type) countQuery.where('p.user_type', user_type);
    if (created_by) countQuery.where('p.created_by', created_by);
    if (date_from) countQuery.where('p.date', '>=', new Date(date_from));
    if (date_to) countQuery.where('p.date', '<=', new Date(date_to));
    if (amount_min !== undefined) countQuery.where('p.amount', '>=', amount_min);
    if (amount_max !== undefined) countQuery.where('p.amount', '<=', amount_max);
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery.where(function() {
        this.where('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('owner.name', 'ilike', `%${searchTerm}%`)
            .orWhere('booking_user.name', 'ilike', `%${searchTerm}%`)
            .orWhere('pm.name', 'ilike', `%${searchTerm}%`)
            .orWhere('p.description', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply village filter to count query if provided
    if (villageFilter) {
      countQuery.where('a.village_id', villageFilter);
    }

    const [{ count }] = await countQuery.count('p.id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['date', 'amount', 'currency', 'user_type', 'apartment_name', 'village_name', 'payment_method_name', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'date';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    if (sortField === 'apartment_name') {
      query = query.orderBy('a.name', validSortOrder);
    } else if (sortField === 'village_name') {
      query = query.orderBy('v.name', validSortOrder);
    } else if (sortField === 'payment_method_name') {
      query = query.orderBy('pm.name', validSortOrder);
    } else {
      query = query.orderBy(`p.${sortField}`, validSortOrder);
    }

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const payments = await query;

    // Transform data
    const transformedPayments = payments.map((payment: any) => ({
      id: payment.id,
      apartment_id: payment.apartment_id,
      booking_id: payment.booking_id || undefined,
      created_by: payment.created_by,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      method_id: payment.method_id,
      user_type: payment.user_type,
      date: new Date(payment.date),
      description: payment.description || undefined,
      created_at: new Date(payment.created_at),
      updated_at: new Date(payment.updated_at),
      apartment: {
        id: payment.apartment_id,
        name: payment.apartment_name,
        village_id: payment.apartment_village_id,
        phase: payment.apartment_phase,
        owner_id: payment.apartment_owner_id,
        paying_status: payment.apartment_paying_status,
        created_by: payment.apartment_created_by,
        created_at: new Date(payment.apartment_created_at),
        updated_at: new Date(payment.apartment_updated_at),
        sales_status: 'for sale' as 'for sale' | 'not for sale',
        village: {
          id: payment.apartment_village_id,
          name: payment.village_name,
          electricity_price: parseFloat(payment.village_electricity_price || '0'),
          water_price: parseFloat(payment.village_water_price || '0'),
          phases: payment.village_phases,
          created_at: new Date(payment.village_created_at),
          updated_at: new Date(payment.village_updated_at)
        },
        owner: payment.owner_name ? {
          id: payment.apartment_owner_id,
          name: payment.owner_name,
          email: payment.owner_email,
          phone_number: payment.owner_phone || undefined,
          role: payment.owner_role,
          is_active: Boolean(payment.owner_is_active),
          created_at: new Date(payment.owner_created_at),
          updated_at: new Date(payment.owner_updated_at)
        } : undefined
      },
      booking: payment.booking_arrival_date ? {
        id: payment.booking_id,
        apartment_id: payment.apartment_id,
        user_id: payment.booking_user_id,
        user_type: payment.booking_user_type,
        arrival_date: new Date(payment.booking_arrival_date),
        leaving_date: new Date(payment.booking_leaving_date),
        status: payment.booking_status,
        notes: payment.booking_notes || undefined,
        created_by: payment.booking_created_by,
        created_at: new Date(payment.booking_created_at),
        updated_at: new Date(payment.booking_updated_at),
        number_of_people: payment.booking_number_of_people || 0,
        user: payment.booking_user_name ? {
          id: payment.booking_user_id,
          name: payment.booking_user_name,
          email: payment.booking_user_email,
          phone_number: payment.booking_user_phone || undefined,
          role: payment.booking_user_role,
          is_active: Boolean(payment.booking_user_is_active),
          created_at: payment.booking_user_created_at ? new Date(payment.booking_user_created_at) : new Date(0),
          updated_at: payment.booking_user_updated_at ? new Date(payment.booking_user_updated_at) : new Date(0)
        } : undefined
      } : undefined,
      payment_method: {
        id: payment.method_id,
        name: payment.payment_method_name,
        created_by: payment.payment_method_created_by,
        created_at: new Date(payment.payment_method_created_at),
        updated_at: new Date(payment.payment_method_updated_at)
      },
      created_by_user: payment.creator_name ? {
        id: payment.created_by,
        name: payment.creator_name,
        email: payment.creator_email,
        phone_number: payment.creator_phone || undefined,
        role: payment.creator_role,
        is_active: Boolean(payment.creator_is_active),
        created_at: payment.creator_created_at ? new Date(payment.creator_created_at) : new Date(0),
        updated_at: payment.creator_updated_at ? new Date(payment.creator_updated_at) : new Date(0)
      } : undefined
    }));

    return {
      data: transformedPayments,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: number): Promise<(Payment & { 
    apartment?: Apartment; 
    booking?: Booking;
    payment_method?: PaymentMethod;
    created_by_user?: PublicUser;
  }) | null> {
    if (!id || id <= 0) {
      return null;
    }

    const payment = await db('payments as p')
      .leftJoin('apartments as a', 'p.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'p.booking_id', 'b.id')
      .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
      .leftJoin('users as creator', 'p.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
      .select(
        'p.*',
        // Apartment details
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'a.owner_id as apartment_owner_id',
        'a.paying_status as apartment_paying_status',
        'a.created_by as apartment_created_by',
        'a.created_at as apartment_created_at',
        'a.updated_at as apartment_updated_at',
        // Village details
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'v.created_at as village_created_at',
        'v.updated_at as village_updated_at',
        // Apartment owner details
        'owner.name as owner_name',
        'owner.email as owner_email',
        'owner.phone_number as owner_phone',
        'owner.role as owner_role',
        'owner.is_active as owner_is_active',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
        // Booking details (if exists)
        'b.user_id as booking_user_id',
        'b.user_type as booking_user_type',
        'b.arrival_date as booking_arrival_date',
        'b.leaving_date as booking_leaving_date',
        'b.status as booking_status',
        'b.notes as booking_notes',
        'b.created_by as booking_created_by',
        'b.created_at as booking_created_at',
        'b.updated_at as booking_updated_at',
        // Booking user details
        'booking_user.name as booking_user_name',
        'booking_user.email as booking_user_email',
        'booking_user.phone_number as booking_user_phone',
        'booking_user.role as booking_user_role',
        'booking_user.is_active as booking_user_is_active',
        // Payment method details
        'pm.name as payment_method_name',
        'pm.created_by as payment_method_created_by',
        'pm.created_at as payment_method_created_at',
        'pm.updated_at as payment_method_updated_at',
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      )
      .where('p.id', id)
      .first();

    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      apartment_id: payment.apartment_id,
      booking_id: payment.booking_id || undefined,
      created_by: payment.created_by,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      method_id: payment.method_id,
      user_type: payment.user_type,
      date: new Date(payment.date),
      description: payment.description || undefined,
      created_at: new Date(payment.created_at),
      updated_at: new Date(payment.updated_at),
      apartment: {
        id: payment.apartment_id,
        name: payment.apartment_name,
        village_id: payment.apartment_village_id,
        phase: payment.apartment_phase,
        owner_id: payment.apartment_owner_id,
        paying_status: payment.apartment_paying_status,
        created_by: payment.apartment_created_by,
        created_at: new Date(payment.apartment_created_at),
        updated_at: new Date(payment.apartment_updated_at),
        sales_status: 'for sale' as 'for sale' | 'not for sale',
        village: {
          id: payment.apartment_village_id,
          name: payment.village_name,
          electricity_price: parseFloat(payment.village_electricity_price || '0'),
          water_price: parseFloat(payment.village_water_price || '0'),
          phases: payment.village_phases,
          created_at: new Date(payment.village_created_at),
          updated_at: new Date(payment.village_updated_at)
        },
        owner: payment.owner_name ? {
          id: payment.apartment_owner_id,
          name: payment.owner_name,
          email: payment.owner_email,
          phone_number: payment.owner_phone || undefined,
          role: payment.owner_role,
          is_active: Boolean(payment.owner_is_active),
          created_at: new Date(payment.owner_created_at),
          updated_at: new Date(payment.owner_updated_at)
        } : undefined
      },
      booking: payment.booking_arrival_date ? {
        id: payment.booking_id,
        apartment_id: payment.apartment_id,
        user_id: payment.booking_user_id,
        user_type: payment.booking_user_type,
        arrival_date: new Date(payment.booking_arrival_date),
        leaving_date: new Date(payment.booking_leaving_date),
        status: payment.booking_status,
        notes: payment.booking_notes || undefined,
        created_by: payment.booking_created_by,
        created_at: new Date(payment.booking_created_at),
        updated_at: new Date(payment.booking_updated_at),
        number_of_people: payment.booking_number_of_people || 0,
        user: payment.booking_user_name ? {
          id: payment.booking_user_id,
          name: payment.booking_user_name,
          email: payment.booking_user_email,
          phone_number: payment.booking_user_phone || undefined,
          role: payment.booking_user_role,
          is_active: Boolean(payment.booking_user_is_active),
          created_at: payment.booking_user_created_at ? new Date(payment.booking_user_created_at) : new Date(0),
          updated_at: payment.booking_user_updated_at ? new Date(payment.booking_user_updated_at) : new Date(0)
        } : undefined
      } : undefined,
      payment_method: {
        id: payment.method_id,
        name: payment.payment_method_name,
        created_by: payment.payment_method_created_by,
        created_at: new Date(payment.payment_method_created_at),
        updated_at: new Date(payment.payment_method_updated_at)
      },
      created_by_user: payment.creator_name ? {
        id: payment.created_by,
        name: payment.creator_name,
        email: payment.creator_email,
        phone_number: payment.creator_phone || undefined,
        role: payment.creator_role,
        is_active: Boolean(payment.creator_is_active),
        created_at: payment.creator_created_at ? new Date(payment.creator_created_at) : new Date(0),
        updated_at: payment.creator_updated_at ? new Date(payment.creator_updated_at) : new Date(0)
      } : undefined
    };
  }

  /**
   * Create new payment
   */
  async createPayment(data: CreatePaymentRequest, createdBy: number): Promise<Payment> {
    // Input validation
    if (!data.apartment_id || !data.amount || !data.currency || !data.method_id || !data.user_type || !data.date) {
      throw new Error('Apartment, amount, currency, payment method, user type, and date are required');
    }

    if (!['EGP', 'GBP'].includes(data.currency)) {
      throw new Error('Currency must be EGP or GBP');
    }

    if (!['owner', 'renter'].includes(data.user_type)) {
      throw new Error('User type must be owner or renter');
    }

    if (data.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (data.amount > 999999999.99) {
      throw new Error('Amount is too large');
    }

    // Validate date
    const paymentDate = new Date(data.date);
    if (isNaN(paymentDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Validate apartment exists
    const apartment = await db('apartments').where('id', data.apartment_id).first();
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Validate payment method exists
    const paymentMethod = await db('payment_methods').where('id', data.method_id).first();
    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Validate booking if provided
    if (data.booking_id) {
      const booking = await db('bookings')
        .where('id', data.booking_id)
        .where('apartment_id', data.apartment_id)
        .first();
      if (!booking) {
        throw new Error('Booking not found or does not belong to the specified apartment');
      }
    }

    // Validate description length
    if (data.description && data.description.length > 1000) {
      throw new Error('Description must not exceed 1,000 characters');
    }

    try {
      const [paymentId] = await db('payments')
        .insert({
          apartment_id: data.apartment_id,
          booking_id: data.booking_id || null,
          created_by: createdBy,
          amount: data.amount,
          currency: data.currency,
          method_id: data.method_id,
          user_type: data.user_type,
          date: paymentDate,
          description: data.description ? data.description.trim() : null,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof paymentId === 'object' ? paymentId.id : paymentId;
      
      const payment = await this.getPaymentById(id);
      if (!payment) {
        throw new Error('Failed to create payment');
      }

      return payment;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to apartment, booking, or payment method');
      }
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Update payment
   */
  async updatePayment(id: number, data: UpdatePaymentRequest): Promise<Payment> {
    if (!id || id <= 0) {
      throw new Error('Invalid payment ID');
    }

    // Check if payment exists
    const existingPayment = await this.getPaymentById(id);
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    // Validate updates
    if (data.apartment_id !== undefined) {
      const apartment = await db('apartments').where('id', data.apartment_id).first();
      if (!apartment) {
        throw new Error('Apartment not found');
      }
    }

    if (data.method_id !== undefined) {
      const paymentMethod = await db('payment_methods').where('id', data.method_id).first();
      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }
    }

    if (data.booking_id !== undefined && data.booking_id !== null) {
      const apartmentId = data.apartment_id || existingPayment.apartment_id;
      const booking = await db('bookings')
        .where('id', data.booking_id)
        .where('apartment_id', apartmentId)
        .first();
      if (!booking) {
        throw new Error('Booking not found or does not belong to the specified apartment');
      }
    }

    if (data.currency !== undefined && !['EGP', 'GBP'].includes(data.currency)) {
      throw new Error('Currency must be EGP or GBP');
    }

    if (data.user_type !== undefined && !['owner', 'renter'].includes(data.user_type)) {
      throw new Error('User type must be owner or renter');
    }

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (data.amount > 999999999.99) {
        throw new Error('Amount is too large');
      }
    }

    // Validate date
    let paymentDate: Date | undefined;
    if (data.date !== undefined) {
      paymentDate = new Date(data.date);
      if (isNaN(paymentDate.getTime())) {
        throw new Error('Invalid date format');
      }
    }

    // Validate description length
    if (data.description !== undefined && data.description && data.description.length > 1000) {
      throw new Error('Description must not exceed 1,000 characters');
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date() };

    if (data.apartment_id !== undefined) updateData.apartment_id = data.apartment_id;
    if (data.booking_id !== undefined) updateData.booking_id = data.booking_id || null;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.method_id !== undefined) updateData.method_id = data.method_id;
    if (data.user_type !== undefined) updateData.user_type = data.user_type;
    if (paymentDate) updateData.date = paymentDate;
    if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;

    try {
      await db('payments').where('id', id).update(updateData);

      const updatedPayment = await this.getPaymentById(id);
      if (!updatedPayment) {
        throw new Error('Failed to update payment');
      }

      return updatedPayment;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to apartment, booking, or payment method');
      }
      throw new Error(`Failed to update payment: ${error.message}`);
    }
  }

  /**
   * Delete payment
   */
  async deletePayment(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid payment ID');
    }

    // Check if payment exists
    const payment = await this.getPaymentById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    try {
      await db('payments').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete payment: ${error.message}`);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<{
    total_payments: number;
    total_amounts: { EGP: number; GBP: number };
    by_currency: { currency: string; count: number; total_amount: number }[];
    by_user_type: { user_type: string; count: number; total_amount_egp: number; total_amount_gbp: number }[];
    by_village: { village_name: string; count: number; total_amount_egp: number; total_amount_gbp: number }[];
    by_payment_method: { method_name: string; count: number; total_amount_egp: number; total_amount_gbp: number }[];
    recent_activity: { date: string; count: number; total_amount: number }[];
  }> {
    // Total payments
    const [{ count: totalPayments }] = await db('payments').count('id as count');

    // Total amounts by currency
    const totalAmounts = await db('payments')
      .select('currency')
      .sum('amount as total_amount')
      .groupBy('currency');

    const totalAmountsMap = totalAmounts.reduce((acc, item) => {
      acc[item.currency] = parseFloat(item.total_amount) || 0;
      return acc;
    }, { EGP: 0, GBP: 0 });

    // By currency
    const byCurrency = await db('payments')
      .select('currency')
      .count('id as count')
      .sum('amount as total_amount')
      .groupBy('currency');

    // By user type
    const byUserType = await db('payments')
      .select('user_type')
      .count('id as count')
      .sum(db.raw("CASE WHEN currency = 'EGP' THEN amount ELSE 0 END as total_amount_egp"))
      .sum(db.raw("CASE WHEN currency = 'GBP' THEN amount ELSE 0 END as total_amount_gbp"))
      .groupBy('user_type');

    // By village
    const byVillage = await db('payments as p')
      .leftJoin('apartments as a', 'p.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .select('v.name as village_name')
      .count('p.id as count')
      .sum(db.raw("CASE WHEN p.currency = 'EGP' THEN p.amount ELSE 0 END as total_amount_egp"))
      .sum(db.raw("CASE WHEN p.currency = 'GBP' THEN p.amount ELSE 0 END as total_amount_gbp"))
      .groupBy('v.id', 'v.name')
      .orderBy('count', 'desc');

    // By payment method
    const byPaymentMethod = await db('payments as p')
      .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
      .select('pm.name as method_name')
      .count('p.id as count')
      .sum(db.raw("CASE WHEN p.currency = 'EGP' THEN p.amount ELSE 0 END as total_amount_egp"))
      .sum(db.raw("CASE WHEN p.currency = 'GBP' THEN p.amount ELSE 0 END as total_amount_gbp"))
      .groupBy('pm.id', 'pm.name')
      .orderBy('count', 'desc');

    // Recent activity (last 30 days)
    const recentActivity = await db('payments')
      .select(db.raw('DATE(date) as date'))
      .count('id as count')
      .sum('amount as total_amount')
      .where('date', '>=', db.raw("CURRENT_DATE - INTERVAL '30 days'"))
      .groupBy(db.raw('DATE(date)'))
      .orderBy('date', 'desc')
      .limit(30);

    return {
      total_payments: parseInt(totalPayments as string),
      total_amounts: {
        EGP: Number(totalAmountsMap.EGP || 0),
        GBP: Number(totalAmountsMap.GBP || 0)
      },
      by_currency: byCurrency.map(item => ({
        currency: String(item.currency),
        count: parseInt(item.count as string),
        total_amount: parseFloat(item.total_amount) || 0
      })),
      by_user_type: byUserType.map(item => ({
        user_type: String(item.user_type),
        count: parseInt(item.count as string),
        total_amount_egp: parseFloat(String(item.total_amount_egp)) || 0,
        total_amount_gbp: parseFloat(String(item.total_amount_gbp)) || 0
      })),
      by_village: byVillage.map(item => ({
        village_name: String(item.village_name || 'Unknown'),
        count: parseInt(item.count as string),
        total_amount_egp: parseFloat(String(item.total_amount_egp)) || 0,
        total_amount_gbp: parseFloat(String(item.total_amount_gbp)) || 0
      })),
      by_payment_method: byPaymentMethod.map(item => ({
        method_name: String(item.method_name),
        count: parseInt(item.count as string),
        total_amount_egp: parseFloat(String(item.total_amount_egp)) || 0,
        total_amount_gbp: parseFloat(String(item.total_amount_gbp)) || 0
      })),
      recent_activity: recentActivity.map((item: any) => ({
        date: String(item.date),
        count: parseInt(item.count as string),
        total_amount: parseFloat(item.total_amount) || 0
      }))
    };
  }
} 