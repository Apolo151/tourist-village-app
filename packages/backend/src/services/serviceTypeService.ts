import { db } from '../database/connection';
import {
  ServiceType,
  CreateServiceTypeRequest,
  UpdateServiceTypeRequest,
  ServiceTypeFilters,
  PaginatedResponse,
  PublicUser
} from '../types';

export class ServiceTypeService {
  
  /**
   * Get all service types with filtering, sorting, and pagination
   */
  async getServiceTypes(filters: ServiceTypeFilters = {}): Promise<PaginatedResponse<ServiceType & { default_assignee?: PublicUser; created_by_user?: PublicUser }>> {
    const {
      search,
      currency,
      min_cost,
      max_cost,
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'asc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('service_types as st')
      .leftJoin('users as assignee', 'st.default_assignee_id', 'assignee.id')
      .leftJoin('users as creator', 'st.created_by', 'creator.id')
      .select(
        'st.*',
        'assignee.name as assignee_name',
        'assignee.email as assignee_email',
        'assignee.phone_number as assignee_phone',
        'assignee.role as assignee_role',
        'assignee.is_active as assignee_is_active',
        'assignee.created_at as assignee_created_at',
        'assignee.updated_at as assignee_updated_at',
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      );

    // Apply filters
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.where(function() {
        this.where('st.name', 'ilike', `%${searchTerm}%`)
            .orWhere('st.description', 'ilike', `%${searchTerm}%`);
      });
    }

    if (currency) {
      query = query.where('st.currency', currency);
    }

    if (min_cost !== undefined) {
      query = query.where('st.cost', '>=', min_cost);
    }

    if (max_cost !== undefined) {
      query = query.where('st.cost', '<=', max_cost);
    }

    // Get total count for pagination
    const countQuery = query.clone().clearSelect().count('st.id as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['name', 'cost', 'currency', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    query = query.orderBy(`st.${sortField}`, validSortOrder);

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const serviceTypes = await query;

    // Transform data
    const transformedServiceTypes = serviceTypes.map((serviceType: any) => ({
      id: serviceType.id,
      name: serviceType.name,
      cost: parseFloat(serviceType.cost),
      currency: serviceType.currency,
      description: serviceType.description,
      default_assignee_id: serviceType.default_assignee_id,
      created_by: serviceType.created_by,
      created_at: new Date(serviceType.created_at),
      updated_at: new Date(serviceType.updated_at),
      default_assignee: serviceType.assignee_name ? {
        id: serviceType.default_assignee_id,
        name: serviceType.assignee_name,
        email: serviceType.assignee_email,
        phone_number: serviceType.assignee_phone || undefined,
        role: serviceType.assignee_role,
        is_active: Boolean(serviceType.assignee_is_active),
        created_at: new Date(serviceType.assignee_created_at),
        updated_at: new Date(serviceType.assignee_updated_at)
      } : undefined,
      created_by_user: serviceType.creator_name ? {
        id: serviceType.created_by,
        name: serviceType.creator_name,
        email: serviceType.creator_email,
        phone_number: serviceType.creator_phone || undefined,
        role: serviceType.creator_role,
        is_active: Boolean(serviceType.creator_is_active),
        created_at: new Date(serviceType.creator_created_at),
        updated_at: new Date(serviceType.creator_updated_at)
      } : undefined
    }));

    return {
      data: transformedServiceTypes,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get service type by ID
   */
  async getServiceTypeById(id: number): Promise<(ServiceType & { default_assignee?: PublicUser; created_by_user?: PublicUser }) | null> {
    if (!id || id <= 0) {
      return null;
    }

    const serviceType = await db('service_types as st')
      .leftJoin('users as assignee', 'st.default_assignee_id', 'assignee.id')
      .leftJoin('users as creator', 'st.created_by', 'creator.id')
      .select(
        'st.*',
        'assignee.name as assignee_name',
        'assignee.email as assignee_email',
        'assignee.phone_number as assignee_phone',
        'assignee.role as assignee_role',
        'assignee.is_active as assignee_is_active',
        'assignee.created_at as assignee_created_at',
        'assignee.updated_at as assignee_updated_at',
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      )
      .where('st.id', id)
      .first();

    if (!serviceType) {
      return null;
    }

    return {
      id: serviceType.id,
      name: serviceType.name,
      cost: parseFloat(serviceType.cost),
      currency: serviceType.currency,
      description: serviceType.description || undefined,
      default_assignee_id: serviceType.default_assignee_id || undefined,
      created_at: new Date(serviceType.created_at),
      updated_at: new Date(serviceType.updated_at),
      default_assignee: serviceType.assignee_name ? {
        id: serviceType.default_assignee_id,
        name: serviceType.assignee_name,
        email: serviceType.assignee_email,
        phone_number: serviceType.assignee_phone || undefined,
        role: serviceType.assignee_role,
        is_active: Boolean(serviceType.assignee_is_active),
        created_at: new Date(serviceType.assignee_created_at),
        updated_at: new Date(serviceType.assignee_updated_at)
      } : undefined,
      created_by_user: serviceType.creator_name ? {
        id: serviceType.created_by,
        name: serviceType.creator_name,
        email: serviceType.creator_email,
        phone_number: serviceType.creator_phone || undefined,
        role: serviceType.creator_role,
        is_active: Boolean(serviceType.creator_is_active),
        created_at: new Date(serviceType.creator_created_at),
        updated_at: new Date(serviceType.creator_updated_at)
      } : undefined
    };
  }

  /**
   * Create new service type
   */
  async createServiceType(data: CreateServiceTypeRequest, createdBy: number): Promise<ServiceType> {
    // Input validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Service type name is required');
    }

    if (!data.cost || data.cost <= 0) {
      throw new Error('Valid cost is required and must be greater than 0');
    }

    if (!data.currency || !['EGP', 'GBP'].includes(data.currency)) {
      throw new Error('Valid currency is required (EGP or GBP)');
    }

    // Validate default assignee if provided
    if (data.default_assignee_id) {
      const assignee = await db('users').where('id', data.default_assignee_id).first();
      if (!assignee) {
        throw new Error('Default assignee not found');
      }
      if (!['admin', 'super_admin'].includes(assignee.role)) {
        throw new Error('Default assignee must be an admin or super admin');
      }
    }

    try {
      const [serviceTypeId] = await db('service_types')
        .insert({
          name: data.name.trim(),
          cost: data.cost,
          currency: data.currency,
          description: data.description?.trim() || null,
          default_assignee_id: data.default_assignee_id || null,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof serviceTypeId === 'object' ? serviceTypeId.id : serviceTypeId;
      
      const serviceType = await this.getServiceTypeById(id);
      if (!serviceType) {
        throw new Error('Failed to create service type');
      }

      return serviceType;
    } catch (error: any) {
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Service type with this name already exists');
      }
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid assignee reference');
      }
      throw new Error(`Failed to create service type: ${error.message}`);
    }
  }

  /**
   * Update service type
   */
  async updateServiceType(id: number, data: UpdateServiceTypeRequest): Promise<ServiceType> {
    if (!id || id <= 0) {
      throw new Error('Invalid service type ID');
    }

    // Check if service type exists
    const existingServiceType = await this.getServiceTypeById(id);
    if (!existingServiceType) {
      throw new Error('Service type not found');
    }

    // Validate updates
    if (data.name !== undefined && (!data.name || !data.name.trim())) {
      throw new Error('Service type name cannot be empty');
    }

    if (data.cost !== undefined && data.cost <= 0) {
      throw new Error('Cost must be greater than 0');
    }

    if (data.currency !== undefined && !['EGP', 'GBP'].includes(data.currency)) {
      throw new Error('Currency must be EGP or GBP');
    }

    if (data.default_assignee_id !== undefined && data.default_assignee_id !== null) {
      const assignee = await db('users').where('id', data.default_assignee_id).first();
      if (!assignee) {
        throw new Error('Default assignee not found');
      }
      if (!['admin', 'super_admin'].includes(assignee.role)) {
        throw new Error('Default assignee must be an admin or super admin');
      }
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date() };

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.default_assignee_id !== undefined) updateData.default_assignee_id = data.default_assignee_id || null;

    try {
      await db('service_types').where('id', id).update(updateData);

      const updatedServiceType = await this.getServiceTypeById(id);
      if (!updatedServiceType) {
        throw new Error('Failed to update service type');
      }

      return updatedServiceType;
    } catch (error: any) {
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Service type with this name already exists');
      }
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid assignee reference');
      }
      throw new Error(`Failed to update service type: ${error.message}`);
    }
  }

  /**
   * Delete service type
   */
  async deleteServiceType(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid service type ID');
    }

    // Check if service type exists
    const serviceType = await this.getServiceTypeById(id);
    if (!serviceType) {
      throw new Error('Service type not found');
    }

    // Check if service type has related service requests
    const [serviceRequestsCount] = await db('service_requests')
      .where('type_id', id)
      .count('id as count');

    if (parseInt(serviceRequestsCount.count as string) > 0) {
      throw new Error('Cannot delete service type with existing service requests. Please remove all related service requests first.');
    }

    try {
      await db('service_types').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete service type: ${error.message}`);
    }
  }

  /**
   * Get service type statistics
   */
  async getServiceTypeStats(): Promise<{
    total_service_types: number;
    by_currency: { currency: string; count: number; avg_cost: number }[];
    most_used: { id: number; name: string; usage_count: number }[];
  }> {
    // Total service types
    const [{ count: totalServiceTypes }] = await db('service_types').count('id as count');

    // By currency with average cost
    const byCurrency = await db('service_types')
      .select('currency')
      .count('id as count')
      .avg('cost as avg_cost')
      .groupBy('currency');

    // Most used service types
    const mostUsed = await db('service_types as st')
      .leftJoin('service_requests as sr', 'st.id', 'sr.type_id')
      .select('st.id', 'st.name')
      .count('sr.id as usage_count')
      .groupBy('st.id', 'st.name')
      .orderBy('usage_count', 'desc')
      .limit(5);

    return {
      total_service_types: parseInt(totalServiceTypes as string),
      by_currency: byCurrency.map(item => ({
        currency: item.currency,
        count: parseInt(item.count as string),
        avg_cost: parseFloat(item.avg_cost as string) || 0
      })),
      most_used: mostUsed.map(item => ({
        id: Number(item.id),
        name: String(item.name),
        usage_count: parseInt(item.usage_count as string)
      }))
    };
  }
} 