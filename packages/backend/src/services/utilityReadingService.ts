import { db } from '../database/connection';
import {
  UtilityReading,
  CreateUtilityReadingRequest,
  UpdateUtilityReadingRequest,
  UtilityReadingFilters,
  PaginatedResponse,
  PublicUser,
  Apartment,
  Booking
} from '../types';

export class UtilityReadingService {
  
  /**
   * Get all utility readings with filtering, sorting, and pagination
   */
  async getUtilityReadings(filters: UtilityReadingFilters = {}, villageFilter?: number): Promise<PaginatedResponse<UtilityReading & { 
    apartment?: Apartment; 
    booking?: Booking;
    created_by_user?: PublicUser;
    water_cost?: number;
    electricity_cost?: number;
    total_cost?: number;
  }>> {
    const {
      apartment_id,
      booking_id,
      village_id,
      who_pays,
      start_date_from,
      start_date_to,
      end_date_from,
      end_date_to,
      has_water_readings,
      has_electricity_readings,
      created_by,
      search,
      page = 1,
      limit = 10,
      sort_by = 'start_date',
      sort_order = 'desc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('utility_readings as ur')
      .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'ur.booking_id', 'b.id')
      .leftJoin('users as creator', 'ur.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
      .select(
        'ur.*',
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
        'b.number_of_people as booking_number_of_people',
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
      query = query.where('ur.apartment_id', apartment_id);
    }

    if (booking_id) {
      query = query.where('ur.booking_id', booking_id);
    }

    if (village_id) {
      query = query.where('a.village_id', village_id);
    }

    if (who_pays) {
      query = query.where('ur.who_pays', who_pays);
    }

    if (created_by) {
      query = query.where('ur.created_by', created_by);
    }

    if (start_date_from) {
      query = query.where('ur.start_date', '>=', new Date(start_date_from));
    }

    if (start_date_to) {
      query = query.where('ur.start_date', '<=', new Date(start_date_to));
    }

    if (end_date_from) {
      query = query.where('ur.end_date', '>=', new Date(end_date_from));
    }

    if (end_date_to) {
      query = query.where('ur.end_date', '<=', new Date(end_date_to));
    }

    if (has_water_readings !== undefined) {
      if (has_water_readings) {
        query = query.whereNotNull('ur.water_start_reading').whereNotNull('ur.water_end_reading');
      } else {
        query = query.where(function() {
          this.whereNull('ur.water_start_reading').orWhereNull('ur.water_end_reading');
        });
      }
    }

    if (has_electricity_readings !== undefined) {
      if (has_electricity_readings) {
        query = query.whereNotNull('ur.electricity_start_reading').whereNotNull('ur.electricity_end_reading');
      } else {
        query = query.where(function() {
          this.whereNull('ur.electricity_start_reading').orWhereNull('ur.electricity_end_reading');
        });
      }
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.where(function() {
        this.where('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('owner.name', 'ilike', `%${searchTerm}%`)
            .orWhere('booking_user.name', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply village filter if provided (for admin users with responsible_village)
    if (villageFilter) {
      query = query.where('a.village_id', villageFilter);
    }

    // Get total count for pagination
    const countQuery = db('utility_readings as ur')
      .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('bookings as b', 'ur.booking_id', 'b.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id');

    // Apply the same filters to count query
    if (apartment_id) countQuery.where('ur.apartment_id', apartment_id);
    if (booking_id) countQuery.where('ur.booking_id', booking_id);
    if (village_id) countQuery.where('a.village_id', village_id);
    if (who_pays) countQuery.where('ur.who_pays', who_pays);
    if (created_by) countQuery.where('ur.created_by', created_by);
    if (start_date_from) countQuery.where('ur.start_date', '>=', new Date(start_date_from));
    if (start_date_to) countQuery.where('ur.start_date', '<=', new Date(start_date_to));
    if (end_date_from) countQuery.where('ur.end_date', '>=', new Date(end_date_from));
    if (end_date_to) countQuery.where('ur.end_date', '<=', new Date(end_date_to));
    
    if (has_water_readings !== undefined) {
      if (has_water_readings) {
        countQuery.whereNotNull('ur.water_start_reading').whereNotNull('ur.water_end_reading');
      } else {
        countQuery.where(function() {
          this.whereNull('ur.water_start_reading').orWhereNull('ur.water_end_reading');
        });
      }
    }

    if (has_electricity_readings !== undefined) {
      if (has_electricity_readings) {
        countQuery.whereNotNull('ur.electricity_start_reading').whereNotNull('ur.electricity_end_reading');
      } else {
        countQuery.where(function() {
          this.whereNull('ur.electricity_start_reading').orWhereNull('ur.electricity_end_reading');
        });
      }
    }
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery.where(function() {
        this.where('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('owner.name', 'ilike', `%${searchTerm}%`)
            .orWhere('booking_user.name', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply village filter to count query if provided
    if (villageFilter) {
      countQuery.where('a.village_id', villageFilter);
    }

    const [{ count }] = await countQuery.count('ur.id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['start_date', 'end_date', 'apartment_name', 'village_name', 'who_pays', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'start_date';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    if (sortField === 'apartment_name') {
      query = query.orderBy('a.name', validSortOrder);
    } else if (sortField === 'village_name') {
      query = query.orderBy('v.name', validSortOrder);
    } else {
      query = query.orderBy(`ur.${sortField}`, validSortOrder);
    }

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const utilityReadings = await query;

    // Transform data and calculate costs
    const transformedUtilityReadings = utilityReadings.map((ur: any) => {
      // Calculate costs
      const waterUsage = (ur.water_end_reading && ur.water_start_reading) ? 
        ur.water_end_reading - ur.water_start_reading : 0;
      const electricityUsage = (ur.electricity_end_reading && ur.electricity_start_reading) ? 
        ur.electricity_end_reading - ur.electricity_start_reading : 0;
      
      const waterCost = waterUsage * (parseFloat(ur.village_water_price) || 0);
      const electricityCost = electricityUsage * (parseFloat(ur.village_electricity_price) || 0);
      const totalCost = waterCost + electricityCost;

      return {
        id: ur.id,
        booking_id: ur.booking_id || undefined,
        apartment_id: ur.apartment_id,
        water_start_reading: ur.water_start_reading ? parseFloat(ur.water_start_reading) : undefined,
        water_end_reading: ur.water_end_reading ? parseFloat(ur.water_end_reading) : undefined,
        electricity_start_reading: ur.electricity_start_reading ? parseFloat(ur.electricity_start_reading) : undefined,
        electricity_end_reading: ur.electricity_end_reading ? parseFloat(ur.electricity_end_reading) : undefined,
        start_date: new Date(ur.start_date),
        end_date: new Date(ur.end_date),
        who_pays: ur.who_pays,
        created_by: ur.created_by,
        created_at: new Date(ur.created_at),
        updated_at: new Date(ur.updated_at),
        water_cost: waterCost,
        electricity_cost: electricityCost,
        total_cost: totalCost,
        apartment: {
          id: ur.apartment_id,
          name: ur.apartment_name,
          village_id: ur.apartment_village_id,
          phase: ur.apartment_phase,
          owner_id: ur.apartment_owner_id,
          paying_status: ur.apartment_paying_status,
          created_by: ur.apartment_created_by,
          created_at: new Date(ur.apartment_created_at),
          updated_at: new Date(ur.apartment_updated_at),
          sales_status: 'for sale' as 'for sale' | 'not for sale',
          village: {
            id: ur.apartment_village_id,
            name: ur.village_name,
            electricity_price: parseFloat(ur.village_electricity_price),
            water_price: parseFloat(ur.village_water_price),
            phases: ur.village_phases,
            created_at: new Date(ur.village_created_at),
            updated_at: new Date(ur.village_updated_at)
          },
          owner: ur.owner_name ? {
            id: ur.apartment_owner_id,
            name: ur.owner_name,
            email: ur.owner_email,
            phone_number: ur.owner_phone || undefined,
            role: ur.owner_role,
            is_active: Boolean(ur.owner_is_active),
            created_at: new Date(ur.owner_created_at),
            updated_at: new Date(ur.owner_updated_at)
          } : undefined
        },
        booking: ur.booking_arrival_date ? {
          id: ur.booking_id,
          apartment_id: ur.apartment_id,
          user_id: ur.booking_user_id,
          user_type: ur.booking_user_type,
          number_of_people: ur.booking_number_of_people || 0,
          arrival_date: new Date(ur.booking_arrival_date),
          leaving_date: new Date(ur.booking_leaving_date),
          status: ur.booking_status,
          notes: ur.booking_notes || undefined,
          created_by: ur.booking_created_by,
          created_at: new Date(ur.booking_created_at),
          updated_at: new Date(ur.booking_updated_at),
          user: ur.booking_user_name ? {
            id: ur.booking_user_id,
            name: ur.booking_user_name,
            email: ur.booking_user_email,
            phone_number: ur.booking_user_phone || undefined,
            role: ur.booking_user_role,
            is_active: Boolean(ur.booking_user_is_active),
            created_at: new Date(),
            updated_at: new Date()
          } : undefined
        } : undefined,
        created_by_user: ur.creator_name ? {
          id: ur.created_by,
          name: ur.creator_name,
          email: ur.creator_email,
          phone_number: ur.creator_phone || undefined,
          role: ur.creator_role,
          is_active: Boolean(ur.creator_is_active),
          created_at: ur.creator_created_at ? new Date(ur.creator_created_at) : new Date(0),
          updated_at: ur.creator_updated_at ? new Date(ur.creator_updated_at) : new Date(0)
        } : undefined
      };
    });

    return {
      data: transformedUtilityReadings,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get utility reading by ID
   */
  async getUtilityReadingById(id: number): Promise<(UtilityReading & { 
    apartment?: Apartment; 
    booking?: Booking;
    created_by_user?: PublicUser;
    water_cost?: number;
    electricity_cost?: number;
    total_cost?: number;
  }) | null> {
    if (!id || id <= 0) {
      return null;
    }

    const utilityReading = await db('utility_readings as ur')
      .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'ur.booking_id', 'b.id')
      .leftJoin('users as creator', 'ur.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
      .select(
        'ur.*',
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
        'b.number_of_people as booking_number_of_people',
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
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      )
      .where('ur.id', id)
      .first();

    if (!utilityReading) {
      return null;
    }

    // Calculate costs
    const waterUsage = (utilityReading.water_end_reading && utilityReading.water_start_reading) ? 
      utilityReading.water_end_reading - utilityReading.water_start_reading : 0;
    const electricityUsage = (utilityReading.electricity_end_reading && utilityReading.electricity_start_reading) ? 
      utilityReading.electricity_end_reading - utilityReading.electricity_start_reading : 0;
    
    const waterCost = waterUsage * (parseFloat(utilityReading.village_water_price) || 0);
    const electricityCost = electricityUsage * (parseFloat(utilityReading.village_electricity_price) || 0);
    const totalCost = waterCost + electricityCost;

    return {
      id: utilityReading.id,
      booking_id: utilityReading.booking_id || undefined,
      apartment_id: utilityReading.apartment_id,
      water_start_reading: utilityReading.water_start_reading ? parseFloat(utilityReading.water_start_reading) : undefined,
      water_end_reading: utilityReading.water_end_reading ? parseFloat(utilityReading.water_end_reading) : undefined,
      electricity_start_reading: utilityReading.electricity_start_reading ? parseFloat(utilityReading.electricity_start_reading) : undefined,
      electricity_end_reading: utilityReading.electricity_end_reading ? parseFloat(utilityReading.electricity_end_reading) : undefined,
      start_date: new Date(utilityReading.start_date),
      end_date: new Date(utilityReading.end_date),
      who_pays: utilityReading.who_pays,
      created_by: utilityReading.created_by,
      created_at: new Date(utilityReading.created_at),
      updated_at: new Date(utilityReading.updated_at),
      water_cost: waterCost,
      electricity_cost: electricityCost,
      total_cost: totalCost,
      apartment: {
        id: utilityReading.apartment_id,
        name: utilityReading.apartment_name,
        village_id: utilityReading.apartment_village_id,
        phase: utilityReading.apartment_phase,
        owner_id: utilityReading.apartment_owner_id,
        paying_status: utilityReading.apartment_paying_status,
        created_by: utilityReading.apartment_created_by,
        created_at: new Date(utilityReading.apartment_created_at),
        updated_at: new Date(utilityReading.apartment_updated_at),
        sales_status: 'for sale' as 'for sale' | 'not for sale',
        village: {
          id: utilityReading.apartment_village_id,
          name: utilityReading.village_name,
          electricity_price: parseFloat(utilityReading.village_electricity_price),
          water_price: parseFloat(utilityReading.village_water_price),
          phases: utilityReading.village_phases,
          created_at: new Date(utilityReading.village_created_at),
          updated_at: new Date(utilityReading.village_updated_at)
        },
        owner: utilityReading.owner_name ? {
          id: utilityReading.apartment_owner_id,
          name: utilityReading.owner_name,
          email: utilityReading.owner_email,
          phone_number: utilityReading.owner_phone || undefined,
          role: utilityReading.owner_role,
          is_active: Boolean(utilityReading.owner_is_active),
          created_at: new Date(utilityReading.owner_created_at),
          updated_at: new Date(utilityReading.owner_updated_at)
        } : undefined
      },
      booking: utilityReading.booking_arrival_date ? {
        id: utilityReading.booking_id,
        apartment_id: utilityReading.apartment_id,
        user_id: utilityReading.booking_user_id,
        user_type: utilityReading.booking_user_type,
        number_of_people: utilityReading.booking_number_of_people || 0,
        arrival_date: new Date(utilityReading.booking_arrival_date),
        leaving_date: new Date(utilityReading.booking_leaving_date),
        status: utilityReading.booking_status,
        notes: utilityReading.booking_notes || undefined,
        created_by: utilityReading.booking_created_by,
        created_at: new Date(utilityReading.booking_created_at),
        updated_at: new Date(utilityReading.booking_updated_at),
        user: utilityReading.booking_user_name ? {
          id: utilityReading.booking_user_id,
          name: utilityReading.booking_user_name,
          email: utilityReading.booking_user_email,
          phone_number: utilityReading.booking_user_phone || undefined,
          role: utilityReading.booking_user_role,
          is_active: Boolean(utilityReading.booking_user_is_active),
          created_at: new Date(),
          updated_at: new Date()
        } : undefined
      } : undefined,
      created_by_user: utilityReading.creator_name ? {
        id: utilityReading.created_by,
        name: utilityReading.creator_name,
        email: utilityReading.creator_email,
        phone_number: utilityReading.creator_phone || undefined,
        role: utilityReading.creator_role,
        is_active: Boolean(utilityReading.creator_is_active),
        created_at: utilityReading.creator_created_at ? new Date(utilityReading.creator_created_at) : new Date(0),
        updated_at: utilityReading.creator_updated_at ? new Date(utilityReading.creator_updated_at) : new Date(0)
      } : undefined
    };
  }

  /**
   * Create new utility reading
   */
  async createUtilityReading(data: CreateUtilityReadingRequest, createdBy: number): Promise<UtilityReading> {
    // Input validation
    if (!data.apartment_id || !data.start_date || !data.end_date || !data.who_pays) {
      throw new Error('Apartment, start date, end date, and who pays are required');
    }

    if (!['owner', 'renter', 'company'].includes(data.who_pays)) {
      throw new Error('Who pays must be owner, renter, or company');
    }

    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    if (startDate >= endDate) {
      throw new Error('End date must be after start date');
    }

    // Validate apartment exists
    const apartment = await db('apartments').where('id', data.apartment_id).first();
    if (!apartment) {
      throw new Error('Apartment not found');
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

    // Validate readings
    if (data.water_start_reading !== undefined && data.water_end_reading !== undefined) {
      if (data.water_start_reading < 0 || data.water_end_reading < 0) {
        throw new Error('Water readings cannot be negative');
      }
      if (data.water_end_reading < data.water_start_reading) {
        throw new Error('Water end reading must be greater than or equal to start reading');
      }
    }

    if (data.electricity_start_reading !== undefined && data.electricity_end_reading !== undefined) {
      if (data.electricity_start_reading < 0 || data.electricity_end_reading < 0) {
        throw new Error('Electricity readings cannot be negative');
      }
      if (data.electricity_end_reading < data.electricity_start_reading) {
        throw new Error('Electricity end reading must be greater than or equal to start reading');
      }
    }

    try {
      const [utilityReadingId] = await db('utility_readings')
        .insert({
          booking_id: data.booking_id || null,
          apartment_id: data.apartment_id,
          water_start_reading: data.water_start_reading || null,
          water_end_reading: data.water_end_reading || null,
          electricity_start_reading: data.electricity_start_reading || null,
          electricity_end_reading: data.electricity_end_reading || null,
          start_date: startDate,
          end_date: endDate,
          who_pays: data.who_pays,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof utilityReadingId === 'object' ? utilityReadingId.id : utilityReadingId;
      
      const utilityReading = await this.getUtilityReadingById(id);
      if (!utilityReading) {
        throw new Error('Failed to create utility reading');
      }

      return utilityReading;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to apartment or booking');
      }
      throw new Error(`Failed to create utility reading: ${error.message}`);
    }
  }

  /**
   * Update utility reading
   */
  async updateUtilityReading(id: number, data: UpdateUtilityReadingRequest): Promise<UtilityReading> {
    if (!id || id <= 0) {
      throw new Error('Invalid utility reading ID');
    }

    // Check if utility reading exists
    const existingUtilityReading = await this.getUtilityReadingById(id);
    if (!existingUtilityReading) {
      throw new Error('Utility reading not found');
    }

    // Validate updates
    if (data.apartment_id !== undefined) {
      const apartment = await db('apartments').where('id', data.apartment_id).first();
      if (!apartment) {
        throw new Error('Apartment not found');
      }
    }

    if (data.booking_id !== undefined && data.booking_id !== null) {
      const apartmentId = data.apartment_id || existingUtilityReading.apartment_id;
      const booking = await db('bookings')
        .where('id', data.booking_id)
        .where('apartment_id', apartmentId)
        .first();
      if (!booking) {
        throw new Error('Booking not found or does not belong to the specified apartment');
      }
    }

    if (data.who_pays !== undefined && !['owner', 'renter', 'company'].includes(data.who_pays)) {
      throw new Error('Who pays must be owner, renter, or company');
    }

    // Validate dates
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (data.start_date !== undefined) {
      startDate = new Date(data.start_date);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date format');
      }
    }

    if (data.end_date !== undefined) {
      endDate = new Date(data.end_date);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date format');
      }
    }

    // Check date relationship
    const finalStartDate = startDate || existingUtilityReading.start_date;
    const finalEndDate = endDate || existingUtilityReading.end_date;
    
    if (finalStartDate >= finalEndDate) {
      throw new Error('End date must be after start date');
    }

    // Validate readings
    if (data.water_start_reading !== undefined && data.water_end_reading !== undefined) {
      if (data.water_start_reading < 0 || data.water_end_reading < 0) {
        throw new Error('Water readings cannot be negative');
      }
      if (data.water_end_reading < data.water_start_reading) {
        throw new Error('Water end reading must be greater than or equal to start reading');
      }
    }

    if (data.electricity_start_reading !== undefined && data.electricity_end_reading !== undefined) {
      if (data.electricity_start_reading < 0 || data.electricity_end_reading < 0) {
        throw new Error('Electricity readings cannot be negative');
      }
      if (data.electricity_end_reading < data.electricity_start_reading) {
        throw new Error('Electricity end reading must be greater than or equal to start reading');
      }
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date() };

    if (data.booking_id !== undefined) updateData.booking_id = data.booking_id || null;
    if (data.apartment_id !== undefined) updateData.apartment_id = data.apartment_id;
    if (data.water_start_reading !== undefined) updateData.water_start_reading = data.water_start_reading || null;
    if (data.water_end_reading !== undefined) updateData.water_end_reading = data.water_end_reading || null;
    if (data.electricity_start_reading !== undefined) updateData.electricity_start_reading = data.electricity_start_reading || null;
    if (data.electricity_end_reading !== undefined) updateData.electricity_end_reading = data.electricity_end_reading || null;
    if (startDate) updateData.start_date = startDate;
    if (endDate) updateData.end_date = endDate;
    if (data.who_pays !== undefined) updateData.who_pays = data.who_pays;

    try {
      await db('utility_readings').where('id', id).update(updateData);

      const updatedUtilityReading = await this.getUtilityReadingById(id);
      if (!updatedUtilityReading) {
        throw new Error('Failed to update utility reading');
      }

      return updatedUtilityReading;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to apartment or booking');
      }
      throw new Error(`Failed to update utility reading: ${error.message}`);
    }
  }

  /**
   * Delete utility reading
   */
  async deleteUtilityReading(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid utility reading ID');
    }

    // Check if utility reading exists
    const utilityReading = await this.getUtilityReadingById(id);
    if (!utilityReading) {
      throw new Error('Utility reading not found');
    }

    try {
      await db('utility_readings').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete utility reading: ${error.message}`);
    }
  }

  /**
   * Get utility reading statistics
   */
  async getUtilityReadingStats(): Promise<{
    total_readings: number;
    by_who_pays: { who_pays: string; count: number; total_cost: number }[];
    by_village: { village_name: string; count: number; total_cost: number }[];
    total_consumption: { water_usage: number; electricity_usage: number };
    total_costs: { water_cost: number; electricity_cost: number; total_cost: number };
  }> {
    // Total utility readings
    const [{ count: totalReadings }] = await db('utility_readings').count('id as count');

    // By who pays with total costs
    const byWhoPays = await db('utility_readings as ur')
      .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .select('ur.who_pays')
      .count('ur.id as count')
      .sum(db.raw(`
        CASE 
          WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL 
          THEN (ur.water_end_reading - ur.water_start_reading) * v.water_price 
          ELSE 0 
        END +
        CASE 
          WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL 
          THEN (ur.electricity_end_reading - ur.electricity_start_reading) * v.electricity_price 
          ELSE 0 
        END as total_cost
      `))
      .groupBy('ur.who_pays');

    // By village with total costs
    const byVillage = await db('utility_readings as ur')
      .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .select('v.name as village_name')
      .count('ur.id as count')
      .sum(db.raw(`
        CASE 
          WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL 
          THEN (ur.water_end_reading - ur.water_start_reading) * v.water_price 
          ELSE 0 
        END +
        CASE 
          WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL 
          THEN (ur.electricity_end_reading - ur.electricity_start_reading) * v.electricity_price 
          ELSE 0 
        END as total_cost
      `))
      .groupBy('v.id', 'v.name')
      .orderBy('total_cost', 'desc');

    // Total consumption and costs
    const [consumptionAndCosts] = await db('utility_readings as ur')
      .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .select(
        db.raw(`
          SUM(
            CASE 
              WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL 
              THEN ur.water_end_reading - ur.water_start_reading 
              ELSE 0 
            END
          ) as water_usage
        `),
        db.raw(`
          SUM(
            CASE 
              WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL 
              THEN ur.electricity_end_reading - ur.electricity_start_reading 
              ELSE 0 
            END
          ) as electricity_usage
        `),
        db.raw(`
          SUM(
            CASE 
              WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL 
              THEN (ur.water_end_reading - ur.water_start_reading) * v.water_price 
              ELSE 0 
            END
          ) as water_cost
        `),
        db.raw(`
          SUM(
            CASE 
              WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL 
              THEN (ur.electricity_end_reading - ur.electricity_start_reading) * v.electricity_price 
              ELSE 0 
            END
          ) as electricity_cost
        `),
        db.raw(`
          SUM(
            CASE 
              WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL 
              THEN (ur.water_end_reading - ur.water_start_reading) * v.water_price 
              ELSE 0 
            END +
            CASE 
              WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL 
              THEN (ur.electricity_end_reading - ur.electricity_start_reading) * v.electricity_price 
              ELSE 0 
            END
          ) as total_cost
        `)
      );

    return {
      total_readings: parseInt(totalReadings as string),
      by_who_pays: byWhoPays.map(item => ({
        who_pays: String(item.who_pays),
        count: parseInt(item.count as string),
        total_cost: parseFloat(item.total_cost as string) || 0
      })),
      by_village: byVillage.map(item => ({
        village_name: String(item.village_name),
        count: parseInt(item.count as string),
        total_cost: parseFloat(item.total_cost as string) || 0
      })),
      total_consumption: {
        water_usage: parseFloat(consumptionAndCosts.water_usage) || 0,
        electricity_usage: parseFloat(consumptionAndCosts.electricity_usage) || 0
      },
      total_costs: {
        water_cost: parseFloat(consumptionAndCosts.water_cost) || 0,
        electricity_cost: parseFloat(consumptionAndCosts.electricity_cost) || 0,
        total_cost: parseFloat(consumptionAndCosts.total_cost) || 0
      }
    };
  }
} 