import { db } from '../database/connection';
import { Booking, CreateBookingRequest, UpdateBookingRequest, User, Apartment } from '../types';
import { UserService } from './userService';
import { ApartmentService } from './apartmentService';
import { createLogger } from '../utils/logger';

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

/**
 * @deprecated This function is no longer used. Status is now stored directly 
 * in the database and not computed from dates. Kept for historical reference.
 * 
 * Previously computed booking status based on current time and booking dates:
 * - If cancelled: return 'Cancelled'
 * - If before arrival: return 'Booked'  
 * - If during stay: return 'Checked In'
 * - If after leaving: return 'Checked Out'
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function computeStatus(booking: { status: string; arrival_date: Date; leaving_date: Date }): string {
  if (booking.status === 'Cancelled') return 'Cancelled';
  const now = new Date();
  if (now < booking.arrival_date) return 'Booked';
  if (now >= booking.arrival_date && now < booking.leaving_date) return 'Checked In';
  if (now >= booking.leaving_date) return 'Checked Out';
  return booking.status;
}

const logger = createLogger('BookingService');

export class BookingService {
  
  private userService: UserService;
  private apartmentService: ApartmentService;

  constructor() {
    this.userService = new UserService();
    this.apartmentService = new ApartmentService();
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

    let query = this.buildBookingQuery(filters, villageFilter);

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
      person_name: row.person_name || undefined,
      user_type: row.user_type,
      number_of_people: row.number_of_people,
      arrival_date: new Date(row.arrival_date),
      leaving_date: new Date(row.leaving_date),
      status: row.status, // Previously used row.computed_status - now using stored value directly
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
        paying_status_id: 1, // Default value
        sales_status_id: 1, // Default value
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
   * Export bookings as array (all filtered, no pagination)
   */
  async exportBookings(filters: BookingFilters = {}, options: BookingQueryOptions & { villageFilter?: number } = {}) {
    const { sort_by = 'arrival_date', sort_order = 'desc', villageFilter } = options;

    const baseQuery = this.buildBookingQuery(filters, villageFilter);

    const countQuery = baseQuery.clone().clearSelect().clearOrder().count('b.id as total');
    const [{ total }] = await countQuery;
    const EXPORT_ROW_LIMIT = 50000;
    if (parseInt(total as string) > EXPORT_ROW_LIMIT) {
      const error: any = new Error(`Export limit of ${EXPORT_ROW_LIMIT} rows exceeded. Narrow your filters and try again.`);
      error.code = 'EXPORT_LIMIT_EXCEEDED';
      throw error;
    }

    const sortedQuery = this.applyBookingSorting(baseQuery, sort_by, sort_order);
    const rows = await sortedQuery;

    return rows.map((row: any) => ({
      id: row.id,
      apartment: row.apartment_name || 'Unknown',
      village: row.village_name || 'Unknown',
      phase: row.apartment_phase,
      user: row.user_name || row.person_name || 'Unknown',
      user_type: row.user_type,
      number_of_people: row.number_of_people,
      arrival_date: row.arrival_date,
      leaving_date: row.leaving_date,
      reservation_date: row.created_at,
      status: row.status,
      notes: row.notes || ''
    }));
  }

  private buildBookingQuery(filters: BookingFilters = {}, villageFilter?: number) {
    let query = db('bookings as b')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .join('apartments as a', 'b.apartment_id', 'a.id')
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
        'a.paying_status_id as apartment_paying_status_id',
        'v.name as village_name'
      );

    if (filters.apartment_id) {
      query = query.where('b.apartment_id', filters.apartment_id);
    }

    if (filters.user_id) {
      query = query.where('b.user_id', filters.user_id);
    }

    if (filters.user_type) {
      query = query.where('b.user_type', filters.user_type);
    }

    if (filters.village_id !== undefined && filters.village_id !== null) {
      query = query.where('a.village_id', Number(filters.village_id));
    }
    if (filters.phase !== undefined && filters.phase !== null) {
      query = query.whereRaw('a.phase = ?', [Number(filters.phase)]);
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

    return query;
  }

  private applyBookingSorting(query: any, sort_by?: string, sort_order?: 'asc' | 'desc') {
    const validSortFields = ['arrival_date', 'leaving_date', 'status', 'user_type', 'created_at', 'apartment_name', 'user_name'];
    const sortField = validSortFields.includes(sort_by || '') ? (sort_by as string) : 'arrival_date';
    const order = sort_order === 'asc' ? 'asc' : 'desc';

    if (sortField === 'apartment_name') {
      return query.orderBy('a.name', order);
    }
    if (sortField === 'user_name') {
      return query.orderBy('u.name', order);
    }
    return query.orderBy(`b.${sortField}`, order);
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
        'a.paying_status_id as apartment_paying_status_id',
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
      person_name: result.person_name || undefined,
      user_type: result.user_type,
      number_of_people: result.number_of_people,
      arrival_date: new Date(result.arrival_date),
      leaving_date: new Date(result.leaving_date),
      status: result.status, // Previously used computeStatus() - now using stored value directly
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
        paying_status_id: 1, // Default value
        sales_status_id: 1, // Default value
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
      person_name: data.person_name || null,
      created_by: createdBy
    }).returning('*');

    // Refresh the materialized view
    await this.apartmentService.refreshApartmentStatusView();

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
    }

    // Validate user_type based on apartment ownership (consistent with createBooking logic)
    // user_type 'owner' means the user owns THIS apartment, 'renter' means they don't
    if (data.user_type !== undefined) {
      const apartmentId = data.apartment_id || existingBooking.apartment_id;
      const userId = data.user_id || existingBooking.user_id;
      const apartment = await db('apartments').where('id', apartmentId).first();
      
      if (data.user_type === 'owner') {
        // Validate that user actually owns this apartment
        if (apartment && apartment.owner_id !== userId) {
          throw new Error('Cannot set user_type to owner: User does not own this apartment');
        }
      }
      // Note: Any user can be a 'renter' for any apartment they don't own
      // The user_type field indicates the booking type, not the user's system role
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
    if (data.person_name !== undefined) updateData.person_name = data.person_name;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    updateData.updated_at = new Date();

    await db('bookings').where('id', id).update(updateData);

    // Refresh the materialized view
    await this.apartmentService.refreshApartmentStatusView();

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

    // Refresh the materialized view
    await this.apartmentService.refreshApartmentStatusView();
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
      status: result.status, // Previously used computeStatus() - now using stored value directly
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
        'assignee.name as assignee_name'
      )
      .where('sr.booking_id', bookingId)
      .orderBy('sr.date_created', 'desc');

    // Get related emails
    const emails = await db('emails')
      .where('booking_id', bookingId)
      .orderBy('date', 'desc');

    // Get related utility readings with apartment and village data for cost calculation
    const utilityReadings = await db('utility_readings as ur')
      .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .select(
        'ur.*',
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'v.name as village_name',
        'v.electricity_price',
        'v.water_price'
      )
      .where('ur.booking_id', bookingId)
      .orderBy('ur.start_date', 'desc');

    // Transform utility readings to include calculated costs
    const transformedUtilityReadings = utilityReadings.map((ur: any) => {
      // Calculate water cost if readings exist
      let waterCost = null;
      if (ur.water_start_reading !== null && ur.water_start_reading !== undefined && 
          ur.water_end_reading !== null && ur.water_end_reading !== undefined) {
        const waterUsage = ur.water_end_reading - ur.water_start_reading;
        if (waterUsage > 0 && ur.water_price) {
          waterCost = waterUsage * parseFloat(ur.water_price);
        }
      }

      // Calculate electricity cost if readings exist
      let electricityCost = null;
      if (ur.electricity_start_reading !== null && ur.electricity_start_reading !== undefined &&
          ur.electricity_end_reading !== null && ur.electricity_end_reading !== undefined) {
        const electricityUsage = ur.electricity_end_reading - ur.electricity_start_reading;
        if (electricityUsage > 0 && ur.electricity_price) {
          electricityCost = electricityUsage * parseFloat(ur.electricity_price);
        }
      }

      return {
        ...ur,
        water_cost: waterCost,
        electricity_cost: electricityCost,
        apartment: {
          id: ur.apartment_id,
          name: ur.apartment_name,
          village_id: ur.apartment_village_id,
          phase: ur.apartment_phase
        },
        village: {
          id: ur.apartment_village_id,
          name: ur.village_name,
          water_price: ur.water_price ? parseFloat(ur.water_price) : 0,
          electricity_price: ur.electricity_price ? parseFloat(ur.electricity_price) : 0
        }
      };
    });

    return {
      payments,
      service_requests: serviceRequests,
      emails,
      utility_readings: transformedUtilityReadings
    };
  }

  /**
   * Get count of currently occupied apartments
   */
  async getCurrentlyOccupiedApartmentsCount(villageId?: number): Promise<number> {
    const now = new Date();

    let query = db('bookings as b')
      .join('apartments as a', 'b.apartment_id', 'a.id')
      .where('b.arrival_date', '<=', now)
      .where('b.leaving_date', '>=', now)
      .whereIn('b.status', ['Booked', 'Checked In'])
      .distinct('b.apartment_id');

    if (villageId) {
      query = query.where('a.village_id', villageId);
    }

    const occupiedApartments = await query.select('b.apartment_id');
    return occupiedApartments.length;
  }

  /**
   * Calculate occupancy rate for a given date range
   */
  async getOccupancyRate(
    startDate: Date,
    endDate: Date,
    villageId?: number
  ): Promise<{
    total_apartments: number;
    total_booked_days: number;
    total_days_in_period: number;
    occupancy_rate: number;
    by_apartment: Array<{
      apartment_id: number;
      apartment_name: string;
      village_name: string;
      booked_days: number;
      total_days: number;
      occupancy_rate: number;
    }>;
  }> {
    // Calculate total days in the period
    const totalDaysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Get all apartments (filtered by village if specified)
    let apartmentsQuery = db('apartments as a')
      .join('villages as v', 'a.village_id', 'v.id')
      .select('a.id as apartment_id', 'a.name as apartment_name', 'v.name as village_name');

    if (villageId) {
      apartmentsQuery = apartmentsQuery.where('a.village_id', villageId);
    }

    const apartments = await apartmentsQuery;
    const totalApartments = apartments.length;

    if (totalApartments === 0) {
      return {
        total_apartments: 0,
        total_booked_days: 0,
        total_days_in_period: totalDaysInPeriod,
        occupancy_rate: 0,
        by_apartment: []
      };
    }

    // Get all bookings that overlap with the date range
    let bookingsQuery = db('bookings as b')
      .join('apartments as a', 'b.apartment_id', 'a.id')
      .join('villages as v', 'a.village_id', 'v.id')
      .select(
        'b.apartment_id',
        'a.name as apartment_name',
        'v.name as village_name',
        'b.arrival_date',
        'b.leaving_date'
      )
      .whereIn('b.status', ['Booked', 'Checked In'])
      .where(function() {
        this.where(function() {
          // Booking overlaps with date range if:
          // (booking.arrival <= endDate AND booking.leaving >= startDate)
          this.where('b.arrival_date', '<=', endDate)
              .where('b.leaving_date', '>=', startDate);
        });
      });

    if (villageId) {
      bookingsQuery = bookingsQuery.where('a.village_id', villageId);
    }

    const bookings = await bookingsQuery;

    // Calculate booked days for each apartment
    const apartmentStats = new Map<number, {
      apartment_id: number;
      apartment_name: string;
      village_name: string;
      booked_days: number;
      total_days: number;
      occupancy_rate: number;
    }>();

    // Initialize all apartments with 0 booked days
    apartments.forEach(apt => {
      apartmentStats.set(apt.apartment_id, {
        apartment_id: apt.apartment_id,
        apartment_name: apt.apartment_name,
        village_name: apt.village_name,
        booked_days: 0,
        total_days: totalDaysInPeriod,
        occupancy_rate: 0
      });
    });

    // Group bookings by apartment
    const bookingsByApartment = new Map<number, Array<{start: Date, end: Date}>>();
    
    bookings.forEach(booking => {
      const bookingStart = new Date(booking.arrival_date);
      const bookingEnd = new Date(booking.leaving_date);

      // Calculate overlap between booking and date range
      const overlapStart = new Date(Math.max(bookingStart.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(bookingEnd.getTime(), endDate.getTime()));

      if (overlapStart <= overlapEnd) {
        if (!bookingsByApartment.has(booking.apartment_id)) {
          bookingsByApartment.set(booking.apartment_id, []);
        }
        bookingsByApartment.get(booking.apartment_id)!.push({
          start: overlapStart,
          end: overlapEnd
        });
      }
    });

    // Calculate actual booked days for each apartment by merging overlapping periods
    bookingsByApartment.forEach((periods, apartmentId) => {
      if (periods.length === 0) return;

      // Sort periods by start date
      periods.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Merge overlapping periods
      const mergedPeriods: Array<{start: Date, end: Date}> = [];
      let currentPeriod = periods[0];

      for (let i = 1; i < periods.length; i++) {
        const nextPeriod = periods[i];
        
        // If current period overlaps or is adjacent to next period, merge them
        if (currentPeriod.end >= nextPeriod.start) {
          currentPeriod.end = new Date(Math.max(currentPeriod.end.getTime(), nextPeriod.end.getTime()));
        } else {
          // No overlap, add current period to merged list and start new current period
          mergedPeriods.push(currentPeriod);
          currentPeriod = nextPeriod;
        }
      }
      
      // Add the last period
      mergedPeriods.push(currentPeriod);

      // Calculate total booked days from merged periods
      let totalBookedDays = 0;
      mergedPeriods.forEach(period => {
        const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalBookedDays += days;
      });

      const apartmentStat = apartmentStats.get(apartmentId);
      if (apartmentStat) {
        apartmentStat.booked_days = totalBookedDays;
      }
    });

    // Calculate occupancy rates
    let totalBookedDays = 0;
    apartmentStats.forEach(stat => {
      stat.occupancy_rate = (stat.booked_days / stat.total_days) * 100;
      totalBookedDays += stat.booked_days;
    });

    const overallOccupancyRate = (totalBookedDays / (totalApartments * totalDaysInPeriod)) * 100;

    return {
      total_apartments: totalApartments,
      total_booked_days: totalBookedDays,
      total_days_in_period: totalDaysInPeriod,
      occupancy_rate: overallOccupancyRate,
      by_apartment: Array.from(apartmentStats.values())
    };
  }

  /**
   * Check for booking conflicts
   * 
   * Rules:
   * - A booking cannot overlap with existing bookings for the same apartment
   * - Exception: A new booking can start on the same day another booking ends (back-to-back bookings allowed)
   * - Comparison is done using date comparison (not datetime) to allow same-day transitions
   * - Cancelled bookings are not considered for conflict detection
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
      .whereNot('status', 'Cancelled') // Exclude cancelled bookings from conflict detection
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

    const conflicts = await query.select('id', 'arrival_date', 'leaving_date', 'status');
    // Debug log for troubleshooting
    // console.log('Booking conflict check:', { apartmentId, newArrivalDateStr, newLeavingDateStr, excludeBookingId, conflicts });

    if (conflicts.length > 0) {
      // Build detailed conflict information
      const conflictDetails = conflicts.map(conflict => {
        const conflictArrival = new Date(conflict.arrival_date).toDateString();
        const conflictLeaving = new Date(conflict.leaving_date).toDateString();
        return `Booking ID ${conflict.id} (${conflictArrival} to ${conflictLeaving}, Status: ${conflict.status})`;
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