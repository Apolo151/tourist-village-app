import { db } from '../database/connection';
import {
  SalesStatusType,
  CreateSalesStatusTypeRequest,
  UpdateSalesStatusTypeRequest,
  SalesStatusTypeFilters,
  PaginatedResponse,
  PublicUser
} from '../types';

export class SalesStatusTypeService {
  
  /**
   * Get all sales status types with filtering, sorting, and pagination
   */
  async getSalesStatusTypes(filters: SalesStatusTypeFilters = {}): Promise<PaginatedResponse<SalesStatusType & { creator?: PublicUser }>> {
    const {
      search,
      is_active,
      page = 1,
      limit = 10,
      sort_by = 'display_name',
      sort_order = 'asc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('sales_status_types as sst')
      .leftJoin('users as creator', 'sst.created_by', 'creator.id')
      .select(
        'sst.*',
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
        this.where('sst.name', 'ilike', `%${searchTerm}%`)
            .orWhere('sst.display_name', 'ilike', `%${searchTerm}%`)
            .orWhere('sst.description', 'ilike', `%${searchTerm}%`);
      });
    }

    if (typeof is_active === 'boolean') {
      query = query.where('sst.is_active', is_active);
    }

    // Get total count for pagination - use a separate clean query
    let countQuery = db('sales_status_types as sst');
    
    // Apply the same filters to count query
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery = countQuery.where(function() {
        this.where('sst.name', 'ilike', `%${searchTerm}%`)
            .orWhere('sst.display_name', 'ilike', `%${searchTerm}%`)
            .orWhere('sst.description', 'ilike', `%${searchTerm}%`);
      });
    }

    if (typeof is_active === 'boolean') {
      countQuery = countQuery.where('sst.is_active', is_active);
    }

    const [{ count }] = await countQuery.count('sst.id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['name', 'display_name', 'is_active', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'display_name';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';

    if (sortField === 'name' || sortField === 'display_name' || sortField === 'is_active') {
      query = query.orderBy(`sst.${sortField}`, validSortOrder);
    } else {
      query = query.orderBy(`sst.${sortField}`, validSortOrder);
    }

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    // Execute query
    const results = await query;

    // Transform data
    const data = results.map((row: any) => ({
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description || undefined,
      color: row.color || 'default',
      is_active: Boolean(row.is_active),
      created_by: row.created_by || undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      creator: row.creator_name ? {
        id: row.created_by,
        name: row.creator_name,
        email: row.creator_email,
        phone_number: row.creator_phone || undefined,
        role: row.creator_role,
        is_active: Boolean(row.creator_is_active),
        created_at: new Date(row.creator_created_at),
        updated_at: new Date(row.creator_updated_at)
      } : undefined
    }));

    const totalPages = Math.ceil(total / validatedLimit);

    return {
      data,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: totalPages
      }
    };
  }

  /**
   * Get sales status type by ID
   */
  async getSalesStatusTypeById(id: number): Promise<SalesStatusType | null> {
    if (!id || id <= 0) {
      return null;
    }

    const row = await db('sales_status_types as sst')
      .leftJoin('users as creator', 'sst.created_by', 'creator.id')
      .select(
        'sst.*',
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      )
      .where('sst.id', id)
      .first();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description || undefined,
      color: row.color || 'default',
      is_active: Boolean(row.is_active),
      created_by: row.created_by || undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      creator: row.creator_name ? {
        id: row.created_by,
        name: row.creator_name,
        email: row.creator_email,
        phone_number: row.creator_phone || undefined,
        role: row.creator_role,
        is_active: Boolean(row.creator_is_active),
        created_at: new Date(row.creator_created_at),
        updated_at: new Date(row.creator_updated_at)
      } : undefined
    };
  }

  /**
   * Get sales status type by name
   */
  async getSalesStatusTypeByName(name: string): Promise<SalesStatusType | null> {
    if (!name || !name.trim()) {
      return null;
    }

    const row = await db('sales_status_types')
      .where('name', name.trim())
      .first();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description || undefined,
      color: row.color || 'default',
      is_active: Boolean(row.is_active),
      created_by: row.created_by || undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Create new sales status type
   */
  async createSalesStatusType(data: CreateSalesStatusTypeRequest, createdBy: number): Promise<SalesStatusType> {
    // Input validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Status type name is required');
    }

    if (!data.display_name || !data.display_name.trim()) {
      throw new Error('Status type display name is required');
    }

    // Check if name already exists
    const existing = await this.getSalesStatusTypeByName(data.name);
    if (existing) {
      throw new Error('A sales status type with this name already exists');
    }

    try {
      const [statusTypeId] = await db('sales_status_types')
        .insert({
          name: data.name.trim(),
          display_name: data.display_name.trim(),
          description: data.description?.trim() || null,
          color: data.color || 'default',
          is_active: data.is_active !== undefined ? data.is_active : true,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof statusTypeId === 'object' ? statusTypeId.id : statusTypeId;
      
      const statusType = await this.getSalesStatusTypeById(id);
      if (!statusType) {
        throw new Error('Failed to create sales status type');
      }

      return statusType;
    } catch (error: any) {
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('A sales status type with this name already exists');
      }
      throw new Error(`Failed to create sales status type: ${error.message}`);
    }
  }

  /**
   * Update sales status type
   */
  async updateSalesStatusType(id: number, data: UpdateSalesStatusTypeRequest): Promise<SalesStatusType> {
    if (!id || id <= 0) {
      throw new Error('Invalid sales status type ID');
    }

    // Check if status type exists
    const existing = await this.getSalesStatusTypeById(id);
    if (!existing) {
      throw new Error('Sales status type not found');
    }

    // Check if new name conflicts with existing ones (if name is being changed)
    if (data.name && data.name.trim() !== existing.name) {
      const nameConflict = await this.getSalesStatusTypeByName(data.name);
      if (nameConflict) {
        throw new Error('A sales status type with this name already exists');
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.name !== undefined && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (data.display_name !== undefined && data.display_name.trim()) {
      updateData.display_name = data.display_name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.color !== undefined) {
      updateData.color = data.color;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    try {
      await db('sales_status_types')
        .where('id', id)
        .update(updateData);

      const updatedStatusType = await this.getSalesStatusTypeById(id);
      if (!updatedStatusType) {
        throw new Error('Failed to update sales status type');
      }

      return updatedStatusType;
    } catch (error: any) {
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('A sales status type with this name already exists');
      }
      throw new Error(`Failed to update sales status type: ${error.message}`);
    }
  }

  /**
   * Delete sales status type
   */
  async deleteSalesStatusType(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid sales status type ID');
    }

    // Check if status type exists
    const statusType = await this.getSalesStatusTypeById(id);
    if (!statusType) {
      throw new Error('Sales status type not found');
    }

    // Check if status type is being used by apartments
    const apartmentsCount = await db('apartments')
      .where('sales_status_id', id)
      .count('id as count')
      .first();

    if (apartmentsCount && parseInt(apartmentsCount.count as string) > 0) {
      throw new Error('Cannot delete sales status type that is being used by apartments');
    }

    try {
      await db('sales_status_types').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete sales status type: ${error.message}`);
    }
  }
}

export const salesStatusTypeService = new SalesStatusTypeService();