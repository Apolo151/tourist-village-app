import { db } from '../database/connection';
import { Booking, CreateBookingRequest, UpdateBookingRequest, User, Apartment } from '../types';
import { UserService } from './userService';

export interface BookingFilters {
  apartment_id?: number;
  user_id?: number;
  user_type?: 'owner' | 'renter';
  village_id?: number;
  phase?: number;
  status?: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  arrival_date_start?: string;
  arrival_date_end?: string;
  leaving_date_start?: string;
  leaving_date_end?: string;
  search?: string;
}

export interface BookingQueryOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BookingStats {
  total_bookings: number;
  current_bookings: number;
  upcoming_bookings: number;
  past_bookings: number;
  by_status: {
    Booked: number;
    'Checked In': number;
    'Checked Out': number;
    Cancelled: number;
  };
  by_user_type: {
    owner: number;
    renter: number;
  };
}

export class BookingService {
  
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get bookings with filtering, pagination, and sorting
   */
  async getBookings(
    filters: BookingFilters = {},
    options: BookingQueryOptions & { villageFilter?: number } = {}
  ): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const { page = 1, limit = 10, sort_by = 'arrival_date', sort_order = 'desc', villageFilter } = options;
    
    // Validate pagination
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    let query = db('bookings as b')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .leftJoin('apartments as a', 'b.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .select(
        'b.*',
        'u.name as user_name',
        'u.email as user_email',
        'u.phone_number as user_phone',
        'u.role as user_role',
        'u.is_active as user_is_active',
        'u.last_login as user_last_login',
        'u.created_at as user_created_at',
        'u.updated_at as user_updated_at',
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'a.paying_status as apartment_paying_status',
        'v.name as village_name'
      );

    // Apply filters
    if (filters.apartment_id) {
      query = query.where('b.apartment_id', filters.apartment_id);
    }

    if (filters.user_id) {
      query = query.where('b.user_id', filters.user_id);
    }

    if (filters.user_type) {
      query = query.where('b.user_type', filters.user_type);
    }

    if (filters.village_id) {
      query = query.where('a.village_id', filters.village_id);
    }

    // Only filter by phase if both village_id and phase are set
    if (filters.phase !== undefined && filters.phase !== null && filters.village_id) {
      query = query.where('a.phase', Number(filters.phase));
    }

    if (filters.status) {
      query = query.where('b.status', filters.status);
    }

    if (filters.arrival_date_start) {
      query = query.where('b.arrival_date', '>=', filters.arrival_date_start);
    }

    if (filters.arrival_date_end) {
      query = query.where('b.arrival_date', '<=', filters.arrival_date_end);
    }

    if (filters.leaving_date_start) {
      query = query.where('b.leaving_date', '>=', filters.leaving_date_start);
    }

    if (filters.leaving_date_end) {
      query = query.where('b.leaving_date', '<=', filters.leaving_date_end);
    }

    if (filters.search) {
      query = query.where(function() {
        this.orWhere('u.name', 'ilike', `%${filters.search}%`)
            .orWhere('a.name', 'ilike', `%${filters.search}%`)
            .orWhere('v.name', 'ilike', `%${filters.search}%`)
            .orWhere('b.notes', 'ilike', `%${filters.search}%`);
      });
    }

    if (villageFilter) {
      query = query.where('a.village_id', villageFilter);
    }

    // Get total count for pagination
    const countQuery = query.clone().clearSelect().clearOrder().count('b.id as total');
    const [{ total }] = await countQuery;

    // Apply sorting
    const validSortFields = ['arrival_date', 'leaving_date', 'status', 'user_type', 'created_at', 'apartment_name', 'user_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'arrival_date';
    
    if (sortField === 'apartment_name') {
      query = query.orderBy('a.name', sort_order);
    } else if (sortField === 'user_name') {
      query = query.orderBy('u.name', sort_order);
    } else {
      query = query.orderBy(`b.${sortField}`, sort_order);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const results = await query;

    const bookings: Booking[] = results.map((row: any) => ({
      id: row.id,
      apartment_id: row.apartment_id,
      user_id: row.user_id,
      user_type: row.user_type,
      number_of_people: row.number_of_people,
      arrival_date: new Date(row.arrival_date),
      leaving_date: new Date(row.leaving_date),
      status: row.status,
      notes: row.notes || undefined,
      created_by: row.created_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      reservation_date: new Date(row.created_at),
      user: row.user_name ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        phone_number: row.user_phone || undefined,
        role: row.user_role,
        is_active: Boolean(row.user_is_active),
        last_login: row.user_last_login ? new Date(row.user_last_login) : undefined,
        created_at: new Date(row.user_created_at),
        updated_at: new Date(row.user_updated_at)
      } : undefined,
      apartment: row.apartment_name ? {
        id: row.apartment_id,
        name: row.apartment_name,
        village_id: row.apartment_village_id,
        phase: row.apartment_phase,
        owner_id: 0, // Not fetched in this query
        paying_status: row.apartment_paying_status,
        created_by: 0, // Not fetched in this query
        created_at: new Date(), // Not fetched in this query
        updated_at: new Date(), // Not fetched in this query
        village: row.village_name ? {
          id: row.apartment_village_id,
          name: row.village_name,
          electricity_price: parseFloat(row.village_electricity_price || '0'),
          water_price: parseFloat(row.village_water_price || '0'),
          phases: row.village_phases,
          created_at: new Date(), // Not fetched in this query
          updated_at: new Date() // Not fetched in this query
        } : undefined,
        sales_status: 'for sale',
        purchase_date: row.apartment_purchase_date ? new Date(row.apartment_purchase_date) : undefined
      } : undefined
    }));

    return {
      bookings,
      total: parseInt(total as string),
      page,
      limit,
      total_pages: Math.ceil(parseInt(total as string) / limit)
    };
  }

  /**
   * Get booking by ID with full details
   */
  async getBookingById(id: number): Promise<Booking | null> {
    if (!id || id <= 0) {
      return null;
    }

    const result = await db('bookings as b')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .leftJoin('apartments as a', 'b.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('users as creator', 'b.created_by', 'creator.id')
      .select(
        'b.*',
        'u.name as user_name',
        'u.email as user_email',
        'u.phone_number as user_phone',
        'u.role as user_role',
        'u.is_active as user_is_active',
        'u.last_login as user_last_login',
        'u.created_at as user_created_at',
        'u.updated_at as user_updated_at',
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'a.owner_id as apartment_owner_id',
        'a.purchase_date as apartment_purchase_date',
        'a.paying_status as apartment_paying_status',
        'a.created_by as apartment_created_by',
        'a.created_at as apartment_created_at',
        'a.updated_at as apartment_updated_at',
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'creator.name as creator_name'
      )
      .where('b.id', id)
      .first();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      apartment_id: result.apartment_id,
      user_id: result.user_id,
      user_type: result.user_type,
      number_of_people: result.number_of_people,
      arrival_date: new Date(result.arrival_date),
      leaving_date: new Date(result.leaving_date),
      status: result.status,
      notes: result.notes || undefined,
      created_by: result.created_by,
      created_at: new Date(result.created_at),
      updated_at: new Date(result.updated_at),
      reservation_date: new Date(result.created_at),
      user: result.user_name ? {
        id: result.user_id,
        name: result.user_name,
        email: result.user_email,
        phone_number: result.user_phone || undefined,
        role: result.user_role,
        is_active: Boolean(result.user_is_active),
        last_login: result.user_last_login ? new Date(result.user_last_login) : undefined,
        created_at: new Date(result.user_created_at),
        updated_at: new Date(result.user_updated_at)
      } : undefined,
      apartment: result.apartment_name ? {
        id: result.apartment_id,
        name: result.apartment_name,
        village_id: result.apartment_village_id,
        phase: result.apartment_phase,
        owner_id: result.apartment_owner_id,
        paying_status: result.apartment_paying_status,
        created_by: result.apartment_created_by,
        created_at: new Date(result.apartment_created_at),
        updated_at: new Date(result.apartment_updated_at),
        village: result.village_name ? {
          id: result.apartment_village_id,
          name: result.village_name,
          electricity_price: parseFloat(result.village_electricity_price || '0'),
          water_price: parseFloat(result.village_water_price || '0'),
          phases: result.village_phases,
          created_at: new Date(), // Not fetched in this query
          updated_at: new Date() // Not fetched in this query
        } : undefined,
        sales_status: 'for sale',
        purchase_date: result.apartment_purchase_date ? new Date(result.apartment_purchase_date) : undefined
      } : undefined,
      created_by_user: result.creator_name ? {
        id: result.created_by,
        name: result.creator_name,
        email: '', // Not fetched in this query
        phone_number: undefined,
        role: 'admin', // Default assumption
        is_active: true,
        created_at: new Date(), // Not fetched in this query
        updated_at: new Date() // Not fetched in this query
      } : undefined
    };
  }

  /**
   * Create a new booking with conflict detection
   */
  async createBooking(data: CreateBookingRequest, createdBy: number): Promise<Booking> {
    // Validate required fields
    if (!data.apartment_id || !data.arrival_date || !data.leaving_date) {
      throw new Error('Missing required fields');
    }

    // Validate that either user_id or user_name is provided
    if (!data.user_id && !data.user_name) {
      throw new Error('Either user_id or user_name must be provided');
    }

    // Validate dates
    const arrivalDate = new Date(data.arrival_date);
    const leavingDate = new Date(data.leaving_date);

    if (isNaN(arrivalDate.getTime()) || isNaN(leavingDate.getTime())) {
      throw new Error('Invalid date format');
    }

    if (arrivalDate >= leavingDate) {
      throw new Error('Leaving date must be after arrival date');
    }

    // Check if apartment exists and get apartment details
    const apartment = await db('apartments').where('id', data.apartment_id).first();
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    let userId: number;
    let userType: 'owner' | 'renter';

    // Handle user creation/lookup
    if (data.user_id) {
      // Use existing user
      const user = await db('users').where('id', data.user_id).first();
      if (!user) {
        throw new Error('User not found');
      }
      userId = data.user_id;
      
      // Determine user_type based on apartment ownership
      userType = data.user_id === apartment.owner_id ? 'owner' : 'renter';
    } else if (data.user_name) {
      // Create booking with non-existing user (renters only)
      if (data.user_type === 'owner') {
        throw new Error('Cannot create booking with non-existing user for owner type. Owners must be existing users.');
      }
      
      userType = 'renter';
      
      // Check if user with this name already exists
      const existingUser = await db('users')
        .where('name', data.user_name.trim())
        .where('role', 'renter')
        .first();
      
      if (existingUser) {
        // Use existing user
        userId = existingUser.id;
      } else {
        // Create new user with default values
        const newUser = await this.userService.createUser({
          name: data.user_name.trim(),
          email: await this.generateRenterEmail(data.user_name.trim()),
          role: 'renter',
          password: 'renterpassword' // Use default password
        });
        
        userId = newUser.id;
      }
    } else {
      throw new Error('Either user_id or user_name must be provided');
    }

    // If user_type was provided, validate it matches the determined type
    if (data.user_type && data.user_type !== userType) {
      const expectedType = userType === 'owner' ? 'Owner (owns this apartment)' : 'renter (does not own this apartment)';
      throw new Error(`User type mismatch. User should have user_type '${userType}' for this apartment (${expectedType}), but '${data.user_type}' was provided.`);
    }

    // Check for booking conflicts
    await this.checkBookingConflicts(data.apartment_id, arrivalDate, leavingDate);

    // Create booking with auto-determined user_type
    const [booking] = await db('bookings').insert({
      apartment_id: data.apartment_id,
      user_id: userId,
      user_type: userType, // Use apartment-ownership-based user_type
      number_of_people: data.number_of_people || 1,
      arrival_date: arrivalDate,
      leaving_date: leavingDate,
      status: data.status || 'Booked',
      notes: data.notes || null,
      created_by: createdBy
    }).returning('*');

    return this.getBookingById(booking.id) as Promise<Booking>;
  }

  /**
   * Update a booking with conflict detection
   */
  async updateBooking(id: number, data: UpdateBookingRequest, updatedBy: number): Promise<Booking> {
    if (!id || id <= 0) {
      throw new Error('Invalid booking ID');
    }

    // Check if booking exists
    const existingBooking = await this.getBookingById(id);
    if (!existingBooking) {
      throw new Error('Booking not found');
    }

    // Validate date updates
    let arrivalDate = existingBooking.arrival_date;
    let leavingDate = existingBooking.leaving_date;

    if (data.arrival_date) {
      arrivalDate = new Date(data.arrival_date);
      if (isNaN(arrivalDate.getTime())) {
        throw new Error('Invalid arrival date format');
      }
    }

    if (data.leaving_date) {
      leavingDate = new Date(data.leaving_date);
      if (isNaN(leavingDate.getTime())) {
        throw new Error('Invalid leaving date format');
      }
    }

    if (arrivalDate >= leavingDate) {
      throw new Error('Leaving date must be after arrival date');
    }

    // Check apartment if being updated
    if (data.apartment_id && data.apartment_id !== existingBooking.apartment_id) {
      const apartment = await db('apartments').where('id', data.apartment_id).first();
      if (!apartment) {
        throw new Error('Apartment not found');
      }
    }

    // Check user if being updated
    if (data.user_id && data.user_id !== existingBooking.user_id) {
      const user = await db('users').where('id', data.user_id).first();
      if (!user) {
        throw new Error('User not found');
      }

      // Validate user type
      const userType = data.user_type || existingBooking.user_type;
      if (userType === 'owner' && user.role !== 'owner') {
        throw new Error('Selected user is not an owner');
      }
      if (userType === 'renter' && !['renter', 'admin', 'super_admin'].includes(user.role)) {
        throw new Error('Selected user cannot make renter bookings');
      }
    }

    // Check for conflicts if dates or apartment changed
    const apartmentId = data.apartment_id || existingBooking.apartment_id;
    if (data.apartment_id !== undefined || data.arrival_date !== undefined || data.leaving_date !== undefined) {
      await this.checkBookingConflicts(apartmentId, arrivalDate, leavingDate, id);
    }

    // Update booking
    const updateData: any = {};
    if (data.apartment_id !== undefined) updateData.apartment_id = data.apartment_id;
    if (data.user_id !== undefined) updateData.user_id = data.user_id;
    if (data.user_type !== undefined) updateData.user_type = data.user_type;
    if (data.number_of_people !== undefined) updateData.number_of_people = data.number_of_people;
    if (data.arrival_date !== undefined) updateData.arrival_date = arrivalDate;
    if (data.leaving_date !== undefined) updateData.leaving_date = leavingDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    updateData.updated_at = new Date();

    await db('bookings').where('id', id).update(updateData);

    return this.getBookingById(id) as Promise<Booking>;
  }

  /**
   * Delete a booking
   */
  async deleteBooking(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid booking ID');
    }

    // Check if booking exists
    const booking = await this.getBookingById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check for related records that would prevent deletion
    const [utilityReadings] = await db('utility_readings').where('booking_id', id).count('id as count');
    const [serviceRequests] = await db('service_requests').where('booking_id', id).count('id as count');
    const [payments] = await db('payments').where('booking_id', id).count('id as count');
    const [emails] = await db('emails').where('booking_id', id).count('id as count');

    const dependencies = [];
    if (parseInt(utilityReadings.count as string) > 0) dependencies.push('utility readings');
    if (parseInt(serviceRequests.count as string) > 0) dependencies.push('service requests');
    if (parseInt(payments.count as string) > 0) dependencies.push('payments');
    if (parseInt(emails.count as string) > 0) dependencies.push('emails');

    if (dependencies.length > 0) {
      throw new Error(`Cannot delete booking. It has related ${dependencies.join(', ')}.`);
    }

    await db('bookings').where('id', id).del();
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(): Promise<BookingStats> {
    const now = new Date();

    // Total bookings
    const [totalBookings] = await db('bookings').count('id as count');

    // Current bookings (Checked In status)
    const [currentBookings] = await db('bookings')
      .where('status', 'Checked In')
      .count('id as count');

    // Upcoming bookings (Booked and arrival_date in future)
    const [upcomingBookings] = await db('bookings')
      .where('status', 'Booked')
      .where('arrival_date', '>', now)
      .count('id as count');

    // Past bookings (Checked Out status)
    const [pastBookings] = await db('bookings')
      .where('status', 'Checked Out')
      .count('id as count');

    // By status
    const statusStats = await db('bookings')
      .select('status')
      .count('id as count')
      .groupBy('status');

    const byStatus = {
      Booked: 0,
      'Checked In': 0,
      'Checked Out': 0,
      Cancelled: 0
    };

    statusStats.forEach(stat => {
      byStatus[stat.status as keyof typeof byStatus] = parseInt(stat.count as string);
    });

    // By user type
    const userTypeStats = await db('bookings')
      .select('user_type')
      .count('id as count')
      .groupBy('user_type');

    const byUserType = {
      owner: 0,
      renter: 0
    };

    userTypeStats.forEach(stat => {
      byUserType[stat.user_type as keyof typeof byUserType] = parseInt(stat.count as string);
    });

    return {
      total_bookings: parseInt(totalBookings.count as string),
      current_bookings: parseInt(currentBookings.count as string),
      upcoming_bookings: parseInt(upcomingBookings.count as string),
      past_bookings: parseInt(pastBookings.count as string),
      by_status: byStatus,
      by_user_type: byUserType
    };
  }

  /**
   * Get bookings by apartment ID
   */
  async getBookingsByApartment(apartmentId: number, options: BookingQueryOptions = {}): Promise<Booking[]> {
    const filters: BookingFilters = { apartment_id: apartmentId };
    const result = await this.getBookings(filters, options);
    return result.bookings;
  }

  /**
   * Get current booking for an apartment
   */
  async getCurrentBookingForApartment(apartmentId: number): Promise<Booking | null> {
    const now = new Date();

    const result = await db('bookings as b')
      .leftJoin('users as u', 'b.user_id', 'u.id')
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
      .where('b.apartment_id', apartmentId)
      .where('b.arrival_date', '<=', now)
      .where('b.leaving_date', '>=', now)
      .where('b.status', '!=', 'Checked Out')
      .orderBy('b.arrival_date', 'desc')
      .first();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      apartment_id: result.apartment_id,
      user_id: result.user_id,
      user_type: result.user_type,
      number_of_people: result.number_of_people,
      arrival_date: new Date(result.arrival_date),
      leaving_date: new Date(result.leaving_date),
      status: result.status,
      notes: result.notes || undefined,
      created_by: result.created_by,
      created_at: new Date(result.created_at),
      updated_at: new Date(result.updated_at),
      reservation_date: new Date(result.created_at),
      user: result.user_name ? {
        id: result.user_id,
        name: result.user_name,
        email: result.user_email,
        phone_number: result.user_phone || undefined,
        role: result.user_role,
        is_active: Boolean(result.user_is_active),
        last_login: result.user_last_login ? new Date(result.user_last_login) : undefined,
        created_at: new Date(result.user_created_at),
        updated_at: new Date(result.user_updated_at)
      } : undefined
    };
  }

  /**
   * Get bookings for a specific user
   */
  async getBookingsByUser(userId: number, options: BookingQueryOptions = {}): Promise<Booking[]> {
    const filters: BookingFilters = { user_id: userId };
    const result = await this.getBookings(filters, options);
    return result.bookings;
  }

  /**
   * Get booking related data
   */
  async getBookingRelatedData(bookingId: number): Promise<{
    payments: any[];
    service_requests: any[];
    emails: any[];
    utility_readings: any[];
  }> {
    if (!bookingId || bookingId <= 0) {
      throw new Error('Invalid booking ID');
    }

    // Check if booking exists
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Get related payments
    const payments = await db('payments as p')
      .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
      .select('p.*', 'pm.name as method_name')
      .where('p.booking_id', bookingId)
      .orderBy('p.date', 'desc');

    // Get related service requests
    const serviceRequests = await db('service_requests as sr')
      .leftJoin('service_types as st', 'sr.type_id', 'st.id')
      .leftJoin('users as assignee', 'sr.assignee_id', 'assignee.id')
      .select(
        'sr.*',
        'st.name as service_type_name',
        'st.cost as service_type_cost',
        'st.currency as service_type_currency',
        'assignee.name as assignee_name'
      )
      .where('sr.booking_id', bookingId)
      .orderBy('sr.date_created', 'desc');

    // Get related emails
    const emails = await db('emails')
      .where('booking_id', bookingId)
      .orderBy('date', 'desc');

    // Get related utility readings
    const utilityReadings = await db('utility_readings')
      .where('booking_id', bookingId)
      .orderBy('start_date', 'desc');

    return {
      payments,
      service_requests: serviceRequests,
      emails,
      utility_readings: utilityReadings
    };
  }

  /**
   * Check for booking conflicts
   * 
   * Rules:
   * - A booking cannot overlap with existing bookings for the same apartment
   * - Exception: A new booking can start on the same day another booking ends (back-to-back bookings allowed)
   * - Comparison is done using date comparison (not datetime) to allow same-day transitions
   */
  private async checkBookingConflicts(
    apartmentId: number,
    arrivalDate: Date,
    leavingDate: Date,
    excludeBookingId?: number
  ): Promise<void> {
    // Convert to UTC date-only string (YYYY-MM-DD) for comparison
    const toUTCDateString = (d: Date) => d.toISOString().split('T')[0];
    const newArrivalDateStr = toUTCDateString(arrivalDate);
    const newLeavingDateStr = toUTCDateString(leavingDate);

    let query = db('bookings')
      .where('apartment_id', apartmentId)
      .where(function() {
        this.where(function() {
          // Overlap if: existing.arrival < newLeaving AND existing.leaving > newArrival
          this.whereRaw('DATE(arrival_date AT TIME ZONE \'UTC\') < ?', [newLeavingDateStr])
              .whereRaw('DATE(leaving_date AT TIME ZONE \'UTC\') > ?', [newArrivalDateStr]);
        });
      });

    if (excludeBookingId !== undefined && excludeBookingId !== null) {
      query = query.where('id', '!=', excludeBookingId);
    }

    const conflicts = await query.select('id', 'arrival_date', 'leaving_date');
    // Debug log for troubleshooting
    // console.log('Booking conflict check:', { apartmentId, newArrivalDateStr, newLeavingDateStr, excludeBookingId, conflicts });

    if (conflicts.length > 0) {
      // Build detailed conflict information
      const conflictDetails = conflicts.map(conflict => {
        const conflictArrival = new Date(conflict.arrival_date).toDateString();
        const conflictLeaving = new Date(conflict.leaving_date).toDateString();
        return `Booking ID ${conflict.id} (${conflictArrival} to ${conflictLeaving})`;
      }).join(', ');

      throw new Error(
        `Booking conflict detected. The apartment is already booked during the selected dates. ` +
        `Conflicting with: ${conflictDetails}. ` +
        `Note: Back-to-back bookings are allowed (a new booking can start on the same day another ends).`
      );
    }
  }

  private async generateRenterEmail(name: string): Promise<string> {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const baseEmail = `${cleanName}${timestamp}${random}@domain.com`;
    
    // Check if email already exists and generate a new one if needed
    const existingUser = await db('users').where('email', baseEmail).first();
    if (existingUser) {
      // If email exists, add more randomness
      const extraRandom = Math.floor(Math.random() * 10000);
      return `${cleanName}${timestamp}${random}${extraRandom}@domain.com`;
    }
    
    return baseEmail;
  }
}

export const bookingService = new BookingService(); 