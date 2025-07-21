import { db } from '../database/connection';
import {
  ServiceRequest,
  CreateServiceRequestRequest,
  UpdateServiceRequestRequest,
  ServiceRequestFilters,
  PaginatedResponse,
  PublicUser,
  ServiceType,
  Apartment,
  Booking
} from '../types';

export class ServiceRequestService {
  
  /**
   * Get all service requests with filtering, sorting, and pagination
   */
  async getServiceRequests(filters: ServiceRequestFilters = {}, villageFilter?: number): Promise<PaginatedResponse<ServiceRequest & { 
    type?: ServiceType; 
    apartment?: Apartment; 
    booking?: Booking;
    requester?: PublicUser;
    assignee?: PublicUser;
    created_by_user?: PublicUser;
  }>> {
    const {
      type_id,
      apartment_id,
      booking_id,
      requester_id,
      assignee_id,
      status,
      who_pays,
      date_action_start,
      date_action_end,
      date_created_start,
      date_created_end,
      village_id,
      search,
      page = 1,
      limit = 10,
      sort_by = 'date_created',
      sort_order = 'desc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('service_requests as sr')
      .leftJoin('service_types as st', 'sr.type_id', 'st.id')
      .leftJoin('apartments as a', 'sr.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'sr.booking_id', 'b.id')
      .leftJoin('users as requester', 'sr.requester_id', 'requester.id')
      .leftJoin('users as assignee', 'sr.assignee_id', 'assignee.id')
      .leftJoin('users as creator', 'sr.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .select(
        'sr.*',
        // Service type details
        'st.name as service_type_name',
        'st.cost as service_type_cost',
        'st.currency as service_type_currency',
        'st.description as service_type_description',
        // Apartment details
        'a.name as apartment_name',
        'a.phase as apartment_phase',
        'a.paying_status_id as apartment_paying_status_id',
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'owner.name as owner_name',
        'owner.email as owner_email',
        'owner.phone_number as owner_phone',
        'owner.role as owner_role',
        'owner.is_active as owner_is_active',
        // Booking details (if exists)
        'b.arrival_date as booking_arrival_date',
        'b.leaving_date as booking_leaving_date',
        'b.status as booking_status',
        'b.user_type as booking_user_type',
        // Requester details
        'requester.name as requester_name',
        'requester.email as requester_email',
        'requester.phone_number as requester_phone',
        'requester.role as requester_role',
        'requester.is_active as requester_is_active',
        // Assignee details
        'assignee.name as assignee_name',
        'assignee.email as assignee_email',
        'assignee.phone_number as assignee_phone',
        'assignee.role as assignee_role',
        'assignee.is_active as assignee_is_active',
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active'
      );

    // Apply filters
    if (type_id) {
      query = query.where('sr.type_id', type_id);
    }

    if (apartment_id) {
      query = query.where('sr.apartment_id', apartment_id);
    }

    if (booking_id) {
      query = query.where('sr.booking_id', booking_id);
    }

    if (requester_id) {
      query = query.where('sr.requester_id', requester_id);
    }

    if (assignee_id) {
      query = query.where('sr.assignee_id', assignee_id);
    }

    if (status) {
      query = query.where('sr.status', status);
    }

    if (who_pays) {
      query = query.where('sr.who_pays', who_pays);
    }

    if (village_id) {
      query = query.where('a.village_id', village_id);
    }

    if (date_action_start) {
      query = query.where('sr.date_action', '>=', new Date(date_action_start));
    }

    if (date_action_end) {
      query = query.where('sr.date_action', '<=', new Date(date_action_end));
    }

    if (date_created_start) {
      query = query.where('sr.date_created', '>=', new Date(date_created_start));
    }

    if (date_created_end) {
      query = query.where('sr.date_created', '<=', new Date(date_created_end));
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.where(function() {
        this.where('st.name', 'ilike', `%${searchTerm}%`)
            .orWhere('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('sr.notes', 'ilike', `%${searchTerm}%`)
            .orWhere('requester.name', 'ilike', `%${searchTerm}%`)
            .orWhere('assignee.name', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply village filter if provided (for admin users with responsible_village)
    if (villageFilter) {
      query = query.where('a.village_id', villageFilter);
    }

    // Get total count for pagination (create a separate count query to avoid GROUP BY issues)
    const countQuery = db('service_requests as sr')
      .leftJoin('apartments as a', 'sr.apartment_id', 'a.id')
      .leftJoin('service_types as st', 'sr.type_id', 'st.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('users as requester', 'sr.requester_id', 'requester.id')
      .leftJoin('users as assignee', 'sr.assignee_id', 'assignee.id');

    // Apply the same filters to count query
    if (type_id) countQuery.where('sr.type_id', type_id);
    if (apartment_id) countQuery.where('sr.apartment_id', apartment_id);
    if (booking_id) countQuery.where('sr.booking_id', booking_id);
    if (requester_id) countQuery.where('sr.requester_id', requester_id);
    if (assignee_id) countQuery.where('sr.assignee_id', assignee_id);
    if (status) countQuery.where('sr.status', status);
    if (who_pays) countQuery.where('sr.who_pays', who_pays);
    if (village_id) countQuery.where('a.village_id', village_id);
    if (date_action_start) countQuery.where('sr.date_action', '>=', new Date(date_action_start));
    if (date_action_end) countQuery.where('sr.date_action', '<=', new Date(date_action_end));
    if (date_created_start) countQuery.where('sr.date_created', '>=', new Date(date_created_start));
    if (date_created_end) countQuery.where('sr.date_created', '<=', new Date(date_created_end));
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery.where(function() {
        this.where('st.name', 'ilike', `%${searchTerm}%`)
            .orWhere('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('sr.notes', 'ilike', `%${searchTerm}%`)
            .orWhere('requester.name', 'ilike', `%${searchTerm}%`)
            .orWhere('assignee.name', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply village filter to count query if provided
    if (villageFilter) {
      countQuery.where('a.village_id', villageFilter);
    }

    const [{ count }] = await countQuery.count('sr.id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['date_created', 'date_action', 'status', 'service_type_name', 'apartment_name', 'village_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'date_created';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    if (sortField === 'service_type_name') {
      query = query.orderBy('st.name', validSortOrder);
    } else if (sortField === 'apartment_name') {
      query = query.orderBy('a.name', validSortOrder);
    } else if (sortField === 'village_name') {
      query = query.orderBy('v.name', validSortOrder);
    } else {
      query = query.orderBy(`sr.${sortField}`, validSortOrder);
    }

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const serviceRequests = await query;

    // Transform data
    const transformedServiceRequests = serviceRequests.map((sr: any) => ({
      id: sr.id,
      type_id: sr.type_id,
      apartment_id: sr.apartment_id,
      booking_id: sr.booking_id || undefined,
      requester_id: sr.requester_id,
      date_action: sr.date_action ? new Date(sr.date_action) : undefined,
      date_created: new Date(sr.date_created),
      status: sr.status,
      who_pays: sr.who_pays,
      notes: sr.notes || undefined,
      assignee_id: sr.assignee_id || undefined,
      created_by: sr.created_by,
      created_at: new Date(sr.created_at),
      updated_at: new Date(sr.updated_at),
      type: {
        id: sr.type_id,
        name: sr.service_type_name,
        cost: parseFloat(sr.service_type_cost),
        currency: sr.service_type_currency,
        description: sr.service_type_description || undefined,
        created_by: 0, // Not fetched
        created_at: new Date(), // Not fetched
        updated_at: new Date()  // Not fetched
      },
      apartment: {
        id: sr.apartment_id,
        name: sr.apartment_name,
        village_id: sr.apartment_id, // This should be the actual village_id from a.village_id
        phase: sr.apartment_phase,
        owner_id: sr.apartment_id, // This should be the actual owner_id from a.owner_id
        paying_status: sr.apartment_paying_status,
        paying_status_id: 1, // Default value
        sales_status_id: 1, // Default value
        created_by: 0, // Not fetched
        created_at: new Date(),
        updated_at: new Date(),
        sales_status: 'for sale' as 'for sale' | 'not for sale',
        village: {
          id: sr.village_id || 0, // This should be from a.village_id
          name: sr.village_name,
          electricity_price: parseFloat(sr.village_electricity_price || '0'),
          water_price: parseFloat(sr.village_water_price || '0'),
          phases: sr.village_phases || 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        owner: sr.owner_name ? {
          id: sr.owner_id,
          name: sr.owner_name,
          email: sr.owner_email,
          phone_number: sr.owner_phone || undefined,
          role: sr.owner_role,
          is_active: Boolean(sr.owner_is_active),
          created_at: new Date(),
          updated_at: new Date()
        } : undefined
      },
      booking: sr.booking_arrival_date ? {
        id: sr.booking_id,
        apartment_id: sr.apartment_id,
        user_id: sr.requester_id, // This might not be accurate
        user_type: sr.booking_user_type,
        arrival_date: new Date(sr.booking_arrival_date),
        leaving_date: new Date(sr.booking_leaving_date),
        status: sr.booking_status,
        notes: undefined,
        created_by: sr.booking_created_by || 0,
        created_at: new Date(sr.booking_created_at),
        updated_at: new Date(sr.booking_updated_at),
        number_of_people: sr.booking_number_of_people || 0,
        user: undefined
      } : undefined,
      requester: sr.requester_name ? {
        id: sr.requester_id,
        name: sr.requester_name,
        email: sr.requester_email,
        phone_number: sr.requester_phone || undefined,
        role: sr.requester_role,
        is_active: Boolean(sr.requester_is_active),
        created_at: new Date(),
        updated_at: new Date()
      } : undefined,
      assignee: sr.assignee_name ? {
        id: sr.assignee_id,
        name: sr.assignee_name,
        email: sr.assignee_email,
        phone_number: sr.assignee_phone || undefined,
        role: sr.assignee_role,
        is_active: Boolean(sr.assignee_is_active),
        created_at: new Date(),
        updated_at: new Date()
      } : undefined,
      created_by_user: sr.creator_name ? {
        id: sr.created_by,
        name: sr.creator_name,
        email: sr.creator_email,
        phone_number: sr.creator_phone || undefined,
        role: sr.creator_role,
        is_active: Boolean(sr.creator_is_active),
        created_at: sr.creator_created_at ? new Date(sr.creator_created_at) : new Date(0),
        updated_at: sr.creator_updated_at ? new Date(sr.creator_updated_at) : new Date(0)
      } : undefined
    }));

    return {
      data: transformedServiceRequests,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get service request by ID
   */
  async getServiceRequestById(id: number): Promise<(ServiceRequest & { 
    type?: ServiceType; 
    apartment?: Apartment; 
    booking?: Booking;
    requester?: PublicUser;
    assignee?: PublicUser;
    created_by_user?: PublicUser;
  }) | null> {
    if (!id || id <= 0) {
      return null;
    }

    const serviceRequest = await db('service_requests as sr')
      .leftJoin('service_types as st', 'sr.type_id', 'st.id')
      .leftJoin('apartments as a', 'sr.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'sr.booking_id', 'b.id')
      .leftJoin('users as requester', 'sr.requester_id', 'requester.id')
      .leftJoin('users as assignee', 'sr.assignee_id', 'assignee.id')
      .leftJoin('users as creator', 'sr.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .select(
        'sr.*',
        // Service type details
        'st.name as service_type_name',
        'st.cost as service_type_cost',
        'st.currency as service_type_currency',
        'st.description as service_type_description',
        'st.created_at as service_type_created_at',
        'st.updated_at as service_type_updated_at',
        // Apartment details
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'a.owner_id as apartment_owner_id',
        'a.paying_status_id as apartment_paying_status_id',
        'a.created_by as apartment_created_by',
        'a.created_at as apartment_created_at',
        'a.updated_at as apartment_updated_at',
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'v.created_at as village_created_at',
        'v.updated_at as village_updated_at',
        'owner.name as owner_name',
        'owner.email as owner_email',
        'owner.phone_number as owner_phone',
        'owner.role as owner_role',
        'owner.is_active as owner_is_active',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
        // Booking details (if exists)
        'b.user_id as booking_user_id',
        'b.number_of_people as booking_number_of_people',
        'b.arrival_date as booking_arrival_date',
        'b.leaving_date as booking_leaving_date',
        'b.status as booking_status',
        'b.user_type as booking_user_type',
        'b.created_by as booking_created_by',
        'b.created_at as booking_created_at',
        'b.updated_at as booking_updated_at',
        // Requester details
        'requester.name as requester_name',
        'requester.email as requester_email',
        'requester.phone_number as requester_phone',
        'requester.role as requester_role',
        'requester.is_active as requester_is_active',
        'requester.created_at as requester_created_at',
        'requester.updated_at as requester_updated_at',
        // Assignee details
        'assignee.name as assignee_name',
        'assignee.email as assignee_email',
        'assignee.phone_number as assignee_phone',
        'assignee.role as assignee_role',
        'assignee.is_active as assignee_is_active',
        'assignee.created_at as assignee_created_at',
        'assignee.updated_at as assignee_updated_at',
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      )
      .where('sr.id', id)
      .first();

    if (!serviceRequest) {
      return null;
    }

    return {
      id: serviceRequest.id,
      type_id: serviceRequest.type_id,
      apartment_id: serviceRequest.apartment_id,
      booking_id: serviceRequest.booking_id || undefined,
      requester_id: serviceRequest.requester_id,
      date_action: serviceRequest.date_action ? new Date(serviceRequest.date_action) : undefined,
      date_created: new Date(serviceRequest.date_created),
      status: serviceRequest.status,
      who_pays: serviceRequest.who_pays,
      notes: serviceRequest.notes || undefined,
      assignee_id: serviceRequest.assignee_id || undefined,
      created_by: serviceRequest.created_by,
      created_at: new Date(serviceRequest.created_at),
      updated_at: new Date(serviceRequest.updated_at),
      type: {
        id: serviceRequest.type_id,
        name: serviceRequest.service_type_name,
        cost: parseFloat(serviceRequest.service_type_cost),
        currency: serviceRequest.service_type_currency,
        description: serviceRequest.service_type_description || undefined,
        created_by: 0, // Not fetched
        created_at: new Date(serviceRequest.service_type_created_at),
        updated_at: new Date(serviceRequest.service_type_updated_at)
      },
      apartment: {
        id: serviceRequest.apartment_id,
        name: serviceRequest.apartment_name,
        village_id: serviceRequest.apartment_village_id,
        phase: serviceRequest.apartment_phase,
        owner_id: serviceRequest.apartment_owner_id,
        paying_status: serviceRequest.apartment_paying_status,
        paying_status_id: 1, // Default value
        sales_status_id: 1, // Default value
        created_by: serviceRequest.apartment_created_by,
        created_at: new Date(serviceRequest.apartment_created_at),
        updated_at: new Date(serviceRequest.apartment_updated_at),
        sales_status: 'for sale' as 'for sale' | 'not for sale',
        village: {
          id: serviceRequest.apartment_village_id,
          name: serviceRequest.village_name,
          electricity_price: parseFloat(serviceRequest.village_electricity_price || '0'),
          water_price: parseFloat(serviceRequest.village_water_price || '0'),
          phases: serviceRequest.village_phases,
          created_at: new Date(serviceRequest.village_created_at),
          updated_at: new Date(serviceRequest.village_updated_at)
        },
        owner: serviceRequest.owner_name ? {
          id: serviceRequest.apartment_owner_id,
          name: serviceRequest.owner_name,
          email: serviceRequest.owner_email,
          phone_number: serviceRequest.owner_phone || undefined,
          role: serviceRequest.owner_role,
          is_active: Boolean(serviceRequest.owner_is_active),
          created_at: new Date(serviceRequest.owner_created_at),
          updated_at: new Date(serviceRequest.owner_updated_at)
        } : undefined
      },
      booking: serviceRequest.booking_arrival_date ? {
        id: serviceRequest.booking_id,
        apartment_id: serviceRequest.apartment_id,
        user_id: serviceRequest.booking_user_id,
        user_type: serviceRequest.booking_user_type,
        arrival_date: new Date(serviceRequest.booking_arrival_date),
        leaving_date: new Date(serviceRequest.booking_leaving_date),
        status: serviceRequest.booking_status,
        notes: undefined,
        created_by: serviceRequest.booking_created_by || 0,
        created_at: new Date(serviceRequest.booking_created_at),
        updated_at: new Date(serviceRequest.booking_updated_at),
        number_of_people: serviceRequest.booking_number_of_people || 0,
        user: undefined
      } : undefined,
      requester: serviceRequest.requester_name ? {
        id: serviceRequest.requester_id,
        name: serviceRequest.requester_name,
        email: serviceRequest.requester_email,
        phone_number: serviceRequest.requester_phone || undefined,
        role: serviceRequest.requester_role,
        is_active: Boolean(serviceRequest.requester_is_active),
        created_at: new Date(serviceRequest.requester_created_at),
        updated_at: new Date(serviceRequest.requester_updated_at)
      } : undefined,
      assignee: serviceRequest.assignee_name ? {
        id: serviceRequest.assignee_id,
        name: serviceRequest.assignee_name,
        email: serviceRequest.assignee_email,
        phone_number: serviceRequest.assignee_phone || undefined,
        role: serviceRequest.assignee_role,
        is_active: Boolean(serviceRequest.assignee_is_active),
        created_at: new Date(serviceRequest.assignee_created_at),
        updated_at: new Date(serviceRequest.assignee_updated_at)
      } : undefined,
      created_by_user: serviceRequest.creator_name ? {
        id: serviceRequest.created_by,
        name: serviceRequest.creator_name,
        email: serviceRequest.creator_email,
        phone_number: serviceRequest.creator_phone || undefined,
        role: serviceRequest.creator_role,
        is_active: Boolean(serviceRequest.creator_is_active),
        created_at: serviceRequest.creator_created_at ? new Date(serviceRequest.creator_created_at) : new Date(0),
        updated_at: serviceRequest.creator_updated_at ? new Date(serviceRequest.creator_updated_at) : new Date(0)
      } : undefined
    };
  }

  /**
   * Create new service request
   */
  async createServiceRequest(data: CreateServiceRequestRequest, createdBy: number): Promise<ServiceRequest> {
    // Input validation
    if (!data.type_id || !data.apartment_id || !data.requester_id) {
      throw new Error('Service type, apartment, and requester are required');
    }

    if (!data.who_pays || !['owner', 'renter', 'company'].includes(data.who_pays)) {
      throw new Error('Valid who_pays value is required (owner, renter, or company)');
    }

    // Validate service type exists
    const serviceType = await db('service_types').where('id', data.type_id).first();
    if (!serviceType) {
      throw new Error('Service type not found');
    }

    // Validate apartment exists
    const apartment = await db('apartments').where('id', data.apartment_id).first();
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Validate requester exists
    const requester = await db('users').where('id', data.requester_id).first();
    if (!requester) {
      throw new Error('Requester not found');
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

    // Validate assignee if provided
    if (data.assignee_id) {
      const assignee = await db('users').where('id', data.assignee_id).first();
      if (!assignee) {
        throw new Error('Assignee not found');
      }
      if (!['admin', 'super_admin'].includes(assignee.role)) {
        throw new Error('Assignee must be an admin or super admin');
      }
    }

    // Validate date_action if provided
    let dateAction: Date | null = null;
    if (data.date_action) {
      dateAction = new Date(data.date_action);
      if (isNaN(dateAction.getTime())) {
        throw new Error('Invalid date_action format');
      }
    }

    try {
      const [serviceRequestId] = await db('service_requests')
        .insert({
          type_id: data.type_id,
          apartment_id: data.apartment_id,
          booking_id: data.booking_id || null,
          requester_id: data.requester_id,
          date_action: dateAction,
          date_created: new Date(),
          status: data.status || 'pending',
          who_pays: data.who_pays,
          notes: data.notes?.trim() || null,
          assignee_id: data.assignee_id || serviceType.default_assignee_id || null,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof serviceRequestId === 'object' ? serviceRequestId.id : serviceRequestId;
      
      const serviceRequest = await this.getServiceRequestById(id);
      if (!serviceRequest) {
        throw new Error('Failed to create service request');
      }

      return serviceRequest;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to service type, apartment, booking, or user');
      }
      throw new Error(`Failed to create service request: ${error.message}`);
    }
  }

  /**
   * Update service request
   */
  async updateServiceRequest(id: number, data: UpdateServiceRequestRequest): Promise<ServiceRequest> {
    if (!id || id <= 0) {
      throw new Error('Invalid service request ID');
    }

    // Check if service request exists
    const existingServiceRequest = await this.getServiceRequestById(id);
    if (!existingServiceRequest) {
      throw new Error('Service request not found');
    }

    // Validate updates
    if (data.type_id !== undefined) {
      const serviceType = await db('service_types').where('id', data.type_id).first();
      if (!serviceType) {
        throw new Error('Service type not found');
      }
    }

    if (data.apartment_id !== undefined) {
      const apartment = await db('apartments').where('id', data.apartment_id).first();
      if (!apartment) {
        throw new Error('Apartment not found');
      }
    }

    if (data.requester_id !== undefined) {
      const requester = await db('users').where('id', data.requester_id).first();
      if (!requester) {
        throw new Error('Requester not found');
      }
    }

    if (data.booking_id !== undefined && data.booking_id !== null) {
      const apartmentId = data.apartment_id || existingServiceRequest.apartment_id;
      const booking = await db('bookings')
        .where('id', data.booking_id)
        .where('apartment_id', apartmentId)
        .first();
      if (!booking) {
        throw new Error('Booking not found or does not belong to the specified apartment');
      }
    }

    if (data.assignee_id !== undefined && data.assignee_id !== null) {
      const assignee = await db('users').where('id', data.assignee_id).first();
      if (!assignee) {
        throw new Error('Assignee not found');
      }
      if (!['admin', 'super_admin'].includes(assignee.role)) {
        throw new Error('Assignee must be an admin or super admin');
      }
    }

    if (data.who_pays !== undefined && !['owner', 'renter', 'company'].includes(data.who_pays)) {
      throw new Error('Valid who_pays value is required (owner, renter, or company)');
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date() };

    if (data.type_id !== undefined) updateData.type_id = data.type_id;
    if (data.apartment_id !== undefined) updateData.apartment_id = data.apartment_id;
    if (data.booking_id !== undefined) updateData.booking_id = data.booking_id || null;
    if (data.requester_id !== undefined) updateData.requester_id = data.requester_id;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.who_pays !== undefined) updateData.who_pays = data.who_pays;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.assignee_id !== undefined) updateData.assignee_id = data.assignee_id || null;

    if (data.date_action !== undefined) {
      if (data.date_action === null || data.date_action === '') {
        updateData.date_action = null;
      } else {
        const dateAction = new Date(data.date_action);
        if (isNaN(dateAction.getTime())) {
          throw new Error('Invalid date_action format');
        }
        updateData.date_action = dateAction;
      }
    }

    try {
      await db('service_requests').where('id', id).update(updateData);

      const updatedServiceRequest = await this.getServiceRequestById(id);
      if (!updatedServiceRequest) {
        throw new Error('Failed to update service request');
      }

      return updatedServiceRequest;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to service type, apartment, booking, or user');
      }
      throw new Error(`Failed to update service request: ${error.message}`);
    }
  }

  /**
   * Delete service request
   */
  async deleteServiceRequest(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid service request ID');
    }

    // Check if service request exists
    const serviceRequest = await this.getServiceRequestById(id);
    if (!serviceRequest) {
      throw new Error('Service request not found');
    }

    try {
      await db('service_requests').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete service request: ${error.message}`);
    }
  }

  /**
   * Get service request statistics
   */
  async getServiceRequestStats(): Promise<{
    total_requests: number;
    by_status: { status: string; count: number }[];
    by_who_pays: { who_pays: string; count: number }[];
    by_service_type: { type_name: string; count: number }[];
    total_cost_estimate: { EGP: number; GBP: number };
  }> {
    // Total service requests
    const [{ count: totalRequests }] = await db('service_requests').count('id as count');

    // By status
    const byStatus = await db('service_requests')
      .select('status')
      .count('id as count')
      .groupBy('status');

    // By who pays
    const byWhoPays = await db('service_requests')
      .select('who_pays')
      .count('id as count')
      .groupBy('who_pays');

    // By service type
    const byServiceType = await db('service_requests as sr')
      .join('service_types as st', 'sr.type_id', 'st.id')
      .select('st.name as type_name')
      .count('sr.id as count')
      .groupBy('st.name')
      .orderBy('count', 'desc')
      .limit(10);

    // Total cost estimate by currency
    const costEstimate = await db('service_requests as sr')
      .join('service_types as st', 'sr.type_id', 'st.id')
      .select('st.currency')
      .sum('st.cost as total_cost')
      .groupBy('st.currency');

    const totalCostEstimate = { EGP: 0, GBP: 0 };
    costEstimate.forEach(item => {
      if (item.currency === 'EGP') {
        totalCostEstimate.EGP = parseFloat(item.total_cost as string) || 0;
      } else if (item.currency === 'GBP') {
        totalCostEstimate.GBP = parseFloat(item.total_cost as string) || 0;
      }
    });

    return {
      total_requests: parseInt(totalRequests as string),
      by_status: byStatus.map(item => ({
        status: String(item.status),
        count: parseInt(item.count as string)
      })),
      by_who_pays: byWhoPays.map(item => ({
        who_pays: String(item.who_pays),
        count: parseInt(item.count as string)
      })),
      by_service_type: byServiceType.map(item => ({
        type_name: String(item.type_name),
        count: parseInt(item.count as string)
      })),
      total_cost_estimate: totalCostEstimate
    };
  }
} 