import { db } from '../database/connection';
import {
  Apartment,
  ApartmentFilters,
  CreateApartmentRequest,
  UpdateApartmentRequest,
  ApartmentFinancialSummary,
  PaginatedResponse,
  Booking,
  ServiceRequest,
  ServiceType,
  Payment,
  PublicUser,
  Village
} from '../types';

export class ApartmentService {
  
  /**
   * Get all apartments with filtering, sorting, and pagination
   */
  async getApartments(filters: ApartmentFilters, villageFilter?: number): Promise<PaginatedResponse<Apartment>> {
    const {
      village_id,
      phase,
      status,
      paying_status,
      search,
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'asc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('apartments as a')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('users as u', 'a.owner_id', 'u.id')
      .select(
        'a.*',
        'v.name as village_name',
        'v.electricity_price',
        'v.water_price',
        'v.phases as village_phases',
        'u.name as owner_name',
        'u.email as owner_email',
        'u.phone_number as owner_phone',
        'u.role as owner_role',
        'u.is_active as owner_is_active'
      );

    // Build a separate count query without joins for better performance
    let countQuery = db('apartments as a');

    // Apply village filter if provided (for admin users with responsible_village)
    if (villageFilter) {
      query = query.where('a.village_id', villageFilter);
      countQuery = countQuery.where('a.village_id', villageFilter);
    }

    // Apply filters to both queries
    if (village_id) {
      query = query.where('a.village_id', village_id);
      countQuery = countQuery.where('a.village_id', village_id);
    }

    if (phase) {
      query = query.where('a.phase', phase);
      countQuery = countQuery.where('a.phase', phase);
    }

    if (paying_status) {
      query = query.where('a.paying_status', paying_status);
      countQuery = countQuery.where('a.paying_status', paying_status);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // For main query, need to join with users for search
      query = query.where(function() {
        this.where('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('u.name', 'ilike', `%${searchTerm}%`);
      });

      // For count query, need to join with users for search
      countQuery = countQuery
        .leftJoin('users as u', 'a.owner_id', 'u.id')
        .where(function() {
          this.where('a.name', 'ilike', `%${searchTerm}%`)
              .orWhere('u.name', 'ilike', `%${searchTerm}%`);
        });
    }

    // Get total count for pagination
    const [{ count }] = await countQuery.count('a.id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['name', 'phase', 'purchase_date', 'paying_status', 'owner_name', 'village_name', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    if (sortField === 'owner_name') {
      query = query.orderBy('u.name', validSortOrder);
    } else if (sortField === 'village_name') {
      query = query.orderBy('v.name', validSortOrder);
    } else {
      query = query.orderBy(`a.${sortField}`, validSortOrder);
    }

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const apartments = await query;

    // Transform and add computed fields
    const transformedApartments = await Promise.all(
      apartments.map(async (apt: any) => {
        const apartment = this.transformApartmentData(apt);
        
        // Add current occupancy status
        apartment.status = await this.calculateApartmentStatus(apartment.id);
        
        return apartment;
      })
    );

    return {
      data: transformedApartments,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get apartment by ID with related data
   */
  async getApartmentById(id: number): Promise<Apartment | null> {
    if (!id || id <= 0) {
      return null;
    }

    const apartmentData = await db('apartments as a')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('users as u', 'a.owner_id', 'u.id')
      .leftJoin('users as cb', 'a.created_by', 'cb.id')
      .select(
        'a.*',
        'v.name as village_name',
        'v.electricity_price',
        'v.water_price',
        'v.phases as village_phases',
        'v.created_by as village_created_by',
        'v.created_at as village_created_at',
        'v.updated_at as village_updated_at',
        'u.name as owner_name',
        'u.email as owner_email',
        'u.phone_number as owner_phone',
        'u.role as owner_role',
        'u.is_active as owner_is_active',
        'u.last_login as owner_last_login',
        'u.created_at as owner_created_at',
        'u.updated_at as owner_updated_at',
        'cb.name as created_by_name',
        'cb.email as created_by_email',
        'cb.phone_number as created_by_phone',
        'cb.role as created_by_role',
        'cb.is_active as created_by_is_active',
        'cb.created_at as created_by_created_at',
        'cb.updated_at as created_by_updated_at'
      )
      .where('a.id', id)
      .first();

    if (!apartmentData) {
      return null;
    }

    const apartment = this.transformApartmentData(apartmentData);
    
    // Add current occupancy status
    apartment.status = await this.calculateApartmentStatus(id);
    
    // Add current booking if any
    const currentBooking = await this.getCurrentBooking(id);
    apartment.current_booking = currentBooking || undefined;

    return apartment;
  }

  /**
   * Create new apartment
   */
  async createApartment(data: CreateApartmentRequest, createdBy: number): Promise<Apartment> {
    // Input validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Apartment name is required');
    }

    if (!data.village_id || data.village_id <= 0) {
      throw new Error('Valid village ID is required');
    }

    if (!data.owner_id || data.owner_id <= 0) {
      throw new Error('Valid owner ID is required');
    }

    if (!data.phase || data.phase <= 0) {
      throw new Error('Valid phase number is required');
    }

    // Validate village and owner exist
    await this.validateVillageExists(data.village_id);
    await this.validateOwnerExists(data.owner_id);
    
    // Validate phase is within village phases
    await this.validatePhaseForVillage(data.village_id, data.phase);

    try {
      const [apartmentId] = await db('apartments')
        .insert({
          name: data.name.trim(),
          village_id: data.village_id,
          phase: data.phase,
          owner_id: data.owner_id,
          purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
          paying_status: data.paying_status,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const userId = typeof apartmentId === 'object' ? apartmentId.id : apartmentId;
      
      const apartment = await this.getApartmentById(userId);
      if (!apartment) {
        throw new Error('Failed to create apartment');
      }

      return apartment;
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Apartment with this name already exists in this village');
      }
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid village or owner reference');
      }
      throw new Error(`Failed to create apartment: ${error.message}`);
    }
  }

  /**
   * Update apartment
   */
  async updateApartment(id: number, data: UpdateApartmentRequest): Promise<Apartment> {
    if (!id || id <= 0) {
      throw new Error('Invalid apartment ID');
    }

    // Check if apartment exists
    const existingApartment = await this.getApartmentById(id);
    if (!existingApartment) {
      throw new Error('Apartment not found');
    }

    // Validate if new values are provided
    if (data.village_id) {
      await this.validateVillageExists(data.village_id);
    }
    
    if (data.owner_id) {
      await this.validateOwnerExists(data.owner_id);
    }

    if (data.village_id && data.phase) {
      await this.validatePhaseForVillage(data.village_id, data.phase);
    } else if (data.phase && !data.village_id) {
      await this.validatePhaseForVillage(existingApartment.village_id, data.phase);
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.name !== undefined && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (data.village_id !== undefined) updateData.village_id = data.village_id;
    if (data.phase !== undefined) updateData.phase = data.phase;
    if (data.owner_id !== undefined) updateData.owner_id = data.owner_id;
    if (data.purchase_date !== undefined) {
      updateData.purchase_date = data.purchase_date ? new Date(data.purchase_date) : null;
    }
    if (data.paying_status !== undefined) updateData.paying_status = data.paying_status;

    try {
      await db('apartments')
        .where('id', id)
        .update(updateData);

      const updatedApartment = await this.getApartmentById(id);
      if (!updatedApartment) {
        throw new Error('Failed to update apartment');
      }

      return updatedApartment;
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Apartment with this name already exists in this village');
      }
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid village or owner reference');
      }
      throw new Error(`Failed to update apartment: ${error.message}`);
    }
  }

  /**
   * Delete apartment
   */
  async deleteApartment(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid apartment ID');
    }

    // Check if apartment exists
    const apartment = await this.getApartmentById(id);
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Check if apartment has related bookings
    const bookingsCount = await db('bookings')
      .where('apartment_id', id)
      .count('id as count')
      .first();

    if (bookingsCount && parseInt(bookingsCount.count as string) > 0) {
      throw new Error('Cannot delete apartment with existing bookings. Please remove all bookings first.');
    }

    // Check if apartment has related service requests
    const serviceRequestsCount = await db('service_requests')
      .where('apartment_id', id)
      .count('id as count')
      .first();

    if (serviceRequestsCount && parseInt(serviceRequestsCount.count as string) > 0) {
      throw new Error('Cannot delete apartment with existing service requests. Please remove all service requests first.');
    }

    // Check if apartment has related payments
    const paymentsCount = await db('payments')
      .where('apartment_id', id)
      .count('id as count')
      .first();

    if (paymentsCount && parseInt(paymentsCount.count as string) > 0) {
      throw new Error('Cannot delete apartment with existing payments. Please remove all payments first.');
    }

    try {
      await db('apartments').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete apartment: ${error.message}`);
    }
  }

  /**
   * Get apartment financial summary
   */
  async getApartmentFinancialSummary(id: number): Promise<ApartmentFinancialSummary> {
    // Check if apartment exists
    const apartment = await this.getApartmentById(id);
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Calculate total money spent (payments)
    const payments = await db('payments')
      .where('apartment_id', id)
      .select('amount', 'currency');

    const totalMoneySpent = payments.reduce(
      (acc, payment) => {
        const amount = parseFloat(payment.amount);
        if (payment.currency === 'EGP') {
          acc.EGP += amount;
        } else if (payment.currency === 'GBP') {
          acc.GBP += amount;
        }
        return acc;
      },
      { EGP: 0, GBP: 0 }
    );

    // Calculate total money requested (service requests)
    const serviceRequests = await db('service_requests as sr')
      .join('service_types as st', 'sr.type_id', 'st.id')
      .where('sr.apartment_id', id)
      .select('st.cost', 'st.currency');

    const totalMoneyRequested = serviceRequests.reduce(
      (acc, request) => {
        const cost = parseFloat(request.cost);
        if (request.currency === 'EGP') {
          acc.EGP += cost;
        } else if (request.currency === 'GBP') {
          acc.GBP += cost;
        }
        return acc;
      },
      { EGP: 0, GBP: 0 }
    );

    // Calculate net money
    const netMoney = {
      EGP: totalMoneyRequested.EGP - totalMoneySpent.EGP,
      GBP: totalMoneyRequested.GBP - totalMoneySpent.GBP
    };

    return {
      apartment_id: id,
      total_money_spent: totalMoneySpent,
      total_money_requested: totalMoneyRequested,
      net_money: netMoney
    };
  }

  /**
   * Get apartment bookings
   */
  async getApartmentBookings(id: number): Promise<Booking[]> {
    if (!id || id <= 0) {
      throw new Error('Invalid apartment ID');
    }

    const bookings = await db('bookings as b')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .where('b.apartment_id', id)
      .select(
        'b.*',
        'u.name as user_name',
        'u.email as user_email',
        'u.phone_number as user_phone',
        'u.role as user_role',
        'u.is_active as user_is_active',
        'u.last_login as user_last_login',
        'u.created_at as user_created_at',
        'u.updated_at as user_updated_at'
      )
      .orderBy('b.arrival_date', 'desc');

    return bookings.map((booking: any) => ({
      id: booking.id,
      apartment_id: booking.apartment_id,
      user_id: booking.user_id,
      user_type: booking.user_type,
      arrival_date: new Date(booking.arrival_date),
      leaving_date: new Date(booking.leaving_date),
      status: booking.status,
      number_of_people: booking.number_of_people || 1,
      notes: booking.notes,
      created_by: booking.created_by,
      created_at: new Date(booking.created_at),
      updated_at: new Date(booking.updated_at),
      user: booking.user_name ? {
        id: booking.user_id,
        name: booking.user_name,
        email: booking.user_email,
        phone_number: booking.user_phone || undefined,
        role: booking.user_role,
        is_active: Boolean(booking.user_is_active),
        created_at: new Date(booking.user_created_at),
        updated_at: new Date(booking.user_updated_at)
      } : undefined
    }));
  }

  /**
   * Get apartment status with current booking
   */
  async getApartmentStatus(id: number): Promise<{ status: string; current_booking?: Booking }> {
    const status = await this.calculateApartmentStatus(id);
    const currentBooking = await this.getCurrentBooking(id);

    return {
      status,
      current_booking: currentBooking || undefined
    };
  }

  /**
   * Get apartments by village with stats
   */
  async getApartmentsByVillage(villageId: number): Promise<Apartment[]> {
    if (!villageId || villageId <= 0) {
      throw new Error('Invalid village ID');
    }

    const filters: ApartmentFilters = {
      village_id: villageId,
      page: 1,
      limit: 1000 // Get all apartments for the village
    };

    const result = await this.getApartments(filters);
    return result.data;
  }

  /**
   * Get apartment statistics
   */
  async getApartmentStats(id: number): Promise<{
    total_bookings: number;
    active_bookings: number;
    service_requests: number;
    payments: number;
    financial_summary: ApartmentFinancialSummary;
  }> {
    if (!id || id <= 0) {
      throw new Error('Invalid apartment ID');
    }

    // Check if apartment exists
    const apartment = await this.getApartmentById(id);
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Get statistics
    const [totalBookings] = await db('bookings')
      .where('apartment_id', id)
      .count('id as count');

    const [activeBookings] = await db('bookings')
      .where('apartment_id', id)
      .whereIn('status', ['not_arrived', 'in_village'])
      .count('id as count');

    const [serviceRequests] = await db('service_requests')
      .where('apartment_id', id)
      .count('id as count');

    const [payments] = await db('payments')
      .where('apartment_id', id)
      .count('id as count');

    const financialSummary = await this.getApartmentFinancialSummary(id);

    return {
      total_bookings: parseInt(totalBookings.count as string),
      active_bookings: parseInt(activeBookings.count as string),
      service_requests: parseInt(serviceRequests.count as string),
      payments: parseInt(payments.count as string),
      financial_summary: financialSummary
    };
  }

  // Private helper methods

  private transformApartmentData(data: any): Apartment {
    return {
      id: data.id,
      name: data.name,
      village_id: data.village_id,
      phase: data.phase,
      owner_id: data.owner_id,
      purchase_date: data.purchase_date ? new Date(data.purchase_date) : undefined,
      paying_status: data.paying_status,
      created_by: data.created_by,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      village: data.village_name ? {
        id: data.village_id,
        name: data.village_name,
        electricity_price: parseFloat(data.electricity_price),
        water_price: parseFloat(data.water_price),
        phases: data.village_phases,
        created_by: data.village_created_by || undefined,
        created_at: new Date(data.village_created_at || data.created_at),
        updated_at: new Date(data.village_updated_at || data.updated_at)
      } : undefined,
      owner: data.owner_name ? {
        id: data.owner_id,
        name: data.owner_name,
        email: data.owner_email,
        phone_number: data.owner_phone || undefined,
        role: data.owner_role || 'owner',
        is_active: Boolean(data.owner_is_active),
        last_login: data.owner_last_login ? new Date(data.owner_last_login) : undefined,
        created_at: new Date(data.owner_created_at || data.created_at),
        updated_at: new Date(data.owner_updated_at || data.updated_at)
      } : undefined,
      created_by_user: data.created_by_name ? {
        id: data.created_by,
        name: data.created_by_name,
        email: data.created_by_email,
        phone_number: data.created_by_phone || undefined,
        role: data.created_by_role || 'admin',
        is_active: Boolean(data.created_by_is_active),
        created_at: new Date(data.created_by_created_at || data.created_at),
        updated_at: new Date(data.created_by_updated_at || data.updated_at)
      } : undefined
    };
  }

  private async calculateApartmentStatus(apartmentId: number): Promise<'Available' | 'Occupied by Owner' | 'Occupied By Renter'> {
    const now = new Date();
    
    const currentBooking = await db('bookings')
      .where('apartment_id', apartmentId)
      .where('arrival_date', '<=', now)
      .where('leaving_date', '>=', now)
      .where('status', '!=', 'left')
      .first();

    if (!currentBooking) {
      return 'Available';
    }

    return currentBooking.user_type === 'owner' ? 'Occupied by Owner' : 'Occupied By Renter';
  }

  private async getCurrentBooking(apartmentId: number): Promise<Booking | null> {
    const now = new Date();
    
    const booking = await db('bookings as b')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .where('b.apartment_id', apartmentId)
      .where('b.arrival_date', '<=', now)
      .where('b.leaving_date', '>=', now)
      .where('b.status', '!=', 'left')
      .select(
        'b.*',
        'u.name as user_name',
        'u.email as user_email',
        'u.phone_number as user_phone',
        'u.role as user_role',
        'u.is_active as user_is_active',
        'u.last_login as user_last_login',
        'u.created_at as user_created_at',
        'u.updated_at as user_updated_at'
      )
      .first();

    if (!booking) {
      return null;
    }

    return {
      id: booking.id,
      apartment_id: booking.apartment_id,
      user_id: booking.user_id,
      user_type: booking.user_type,
      arrival_date: new Date(booking.arrival_date),
      leaving_date: new Date(booking.leaving_date),
      status: booking.status,
      number_of_people: booking.number_of_people || 1,
      notes: booking.notes,
      created_by: booking.created_by,
      created_at: new Date(booking.created_at),
      updated_at: new Date(booking.updated_at),
      user: booking.user_name ? {
        id: booking.user_id,
        name: booking.user_name,
        email: booking.user_email,
        phone_number: booking.user_phone || undefined,
        role: booking.user_role,
        is_active: Boolean(booking.user_is_active),
        created_at: new Date(booking.user_created_at),
        updated_at: new Date(booking.user_updated_at)
      } : undefined
    };
  }

  private async validateVillageExists(villageId: number): Promise<void> {
    const village = await db('villages').where('id', villageId).first();
    if (!village) {
      throw new Error('Village not found');
    }
  }

  private async validateOwnerExists(ownerId: number): Promise<void> {
    const owner = await db('users').where('id', ownerId).where('role', 'owner').first();
    if (!owner) {
      throw new Error('Owner not found');
    }
  }

  private async validatePhaseForVillage(villageId: number, phase: number): Promise<void> {
    const village = await db('villages').where('id', villageId).first();
    if (!village) {
      throw new Error('Village not found');
    }
    
    if (phase < 1 || phase > village.phases) {
      throw new Error(`Phase must be between 1 and ${village.phases} for this village`);
    }
  }
} 