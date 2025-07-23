import { db } from '../database/connection';
import {
  ServiceType,
  ServiceTypeVillagePrice,
  CreateServiceTypeRequest,
  UpdateServiceTypeRequest,
  ServiceTypeFilters,
  PaginatedResponse,
  PublicUser,
  Village
} from '../types';

export class ServiceTypeService {
  
  /**
   * Get all service types with village-specific pricing, filtering, sorting, and pagination
   */
  async getServiceTypes(filters: ServiceTypeFilters = {}): Promise<PaginatedResponse<ServiceType>> {
    const {
      search,
      village_id,
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
      .leftJoin('users as creator', 'st.created_by', 'creator.id')
      .select(
        'st.*',
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

    // Filter by village pricing if specified
    if (village_id || currency || min_cost !== undefined || max_cost !== undefined) {
      query = query.join('service_type_village_prices as stvp', 'st.id', 'stvp.service_type_id');
      
      if (village_id) {
        query = query.where('stvp.village_id', village_id);
      }
      
      if (currency) {
        query = query.where('stvp.currency', currency);
      }
      
      if (min_cost !== undefined) {
        query = query.where('stvp.cost', '>=', min_cost);
      }
      
      if (max_cost !== undefined) {
        query = query.where('stvp.cost', '<=', max_cost);
      }
      
      // Ensure distinct results when joining with pricing table
      query = query.distinct();
    }

    // Get total count for pagination
    const countQuery = query.clone().clearSelect().count('st.id as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['name', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    query = query.orderBy(`st.${sortField}`, validSortOrder);

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const serviceTypes = await query;

    // Load village prices for each service type
    const serviceTypeIds = serviceTypes.map((st: any) => st.id);
    const villagePrices = await this.getVillagePricesForServiceTypes(serviceTypeIds);

    // Transform data
    const transformedServiceTypes = serviceTypes.map((serviceType: any) => {
      const prices = villagePrices.filter(vp => vp.service_type_id === serviceType.id);
      
      // For backward compatibility, set cost and currency based on context
      let contextualCost: number | undefined;
      let contextualCurrency: 'EGP' | 'GBP' | undefined;
      
      if (village_id) {
        const villagePrice = prices.find(p => p.village_id === village_id);
        contextualCost = villagePrice?.cost;
        contextualCurrency = villagePrice?.currency;
      } else if (prices.length > 0) {
        // Use first price as default
        contextualCost = prices[0].cost;
        contextualCurrency = prices[0].currency;
      }

      return {
        id: serviceType.id,
        name: serviceType.name,
        description: serviceType.description || undefined,
        created_by: serviceType.created_by,
        created_at: new Date(serviceType.created_at),
        updated_at: new Date(serviceType.updated_at),
        cost: contextualCost,
        currency: contextualCurrency,
        village_prices: prices,
        created_by_user: serviceType.creator_name ? {
          id: serviceType.created_by,
          name: serviceType.creator_name,
          email: serviceType.creator_email,
          phone_number: serviceType.creator_phone || undefined,
          role: serviceType.creator_role,
          is_active: Boolean(serviceType.creator_is_active),
          created_at: serviceType.creator_created_at ? new Date(serviceType.creator_created_at) : new Date(0),
          updated_at: serviceType.creator_updated_at ? new Date(serviceType.creator_updated_at) : new Date(0)
        } : undefined
      };
    });

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
   * Get service type by ID with all village pricing
   */
  async getServiceTypeById(id: number): Promise<ServiceType | null> {
    if (!id || id <= 0) {
      return null;
    }

    const serviceType = await db('service_types as st')
      .leftJoin('users as creator', 'st.created_by', 'creator.id')
      .select(
        'st.*',
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

    // Load village prices
    const villagePrices = await this.getVillagePricesForServiceTypes([id]);

    return {
      id: serviceType.id,
      name: serviceType.name,
      description: serviceType.description || undefined,
      created_by: serviceType.created_by,
      created_at: new Date(serviceType.created_at),
      updated_at: new Date(serviceType.updated_at),
      cost: villagePrices[0]?.cost, // First price as default
      currency: villagePrices[0]?.currency, // First currency as default
      village_prices: villagePrices,
      created_by_user: serviceType.creator_name ? {
        id: serviceType.created_by,
        name: serviceType.creator_name,
        email: serviceType.creator_email,
        phone_number: serviceType.creator_phone || undefined,
        role: serviceType.creator_role,
        is_active: Boolean(serviceType.creator_is_active),
        created_at: serviceType.creator_created_at ? new Date(serviceType.creator_created_at) : new Date(0),
        updated_at: serviceType.creator_updated_at ? new Date(serviceType.creator_updated_at) : new Date(0)
      } : undefined
    };
  }

  /**
   * Create new service type with village-specific pricing
   */
  async createServiceType(data: CreateServiceTypeRequest, createdBy: number): Promise<ServiceType> {
    // Input validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Service type name is required');
    }

    if (!data.village_prices || data.village_prices.length === 0) {
      throw new Error('At least one village pricing is required');
    }

    // Validate village prices
    for (const price of data.village_prices) {
      if (!price.village_id || price.cost <= 0) {
        throw new Error('Valid village ID and cost are required for all village prices');
      }
      
      if (!['EGP', 'GBP'].includes(price.currency)) {
        throw new Error('Currency must be EGP or GBP for all village prices');
      }
      
      // Validate village exists
      const village = await db('villages').where('id', price.village_id).first();
      if (!village) {
        throw new Error(`Village with ID ${price.village_id} not found`);
      }
    }

    const trx = await db.transaction();
    
    try {
      // Create service type
      const [serviceTypeId] = await trx('service_types')
        .insert({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof serviceTypeId === 'object' ? serviceTypeId.id : serviceTypeId;

      // Create village prices
      const villagePriceInserts = data.village_prices.map(price => ({
        service_type_id: id,
        village_id: price.village_id,
        cost: price.cost,
        currency: price.currency,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await trx('service_type_village_prices').insert(villagePriceInserts);

      await trx.commit();

      const serviceType = await this.getServiceTypeById(id);
      if (!serviceType) {
        throw new Error('Failed to create service type');
      }

      return serviceType;
    } catch (error: any) {
      await trx.rollback();
      
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Service type with this name already exists');
      }
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to village or assignee');
      }
      throw new Error(`Failed to create service type: ${error.message}`);
    }
  }

  /**
   * Update service type with village-specific pricing
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

    if (data.village_prices) {
      // Validate village prices
      for (const price of data.village_prices) {
        if (!price.village_id || price.cost <= 0) {
          throw new Error('Valid village ID and cost are required for all village prices');
        }
        
        if (!['EGP', 'GBP'].includes(price.currency)) {
          throw new Error('Currency must be EGP or GBP for all village prices');
        }
        
        // Validate village exists
        const village = await db('villages').where('id', price.village_id).first();
        if (!village) {
          throw new Error(`Village with ID ${price.village_id} not found`);
        }
      }
    }

    const trx = await db.transaction();

    try {
      // Prepare update data for service type
      const updateData: any = { updated_at: new Date() };

      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;

      // Update service type
      if (Object.keys(updateData).length > 1) { // More than just updated_at
        await trx('service_types').where('id', id).update(updateData);
      }

      // Update village prices if provided
      if (data.village_prices) {
        // Delete existing prices
        await trx('service_type_village_prices').where('service_type_id', id).del();
        
        // Insert new prices
        const villagePriceInserts = data.village_prices.map(price => ({
          service_type_id: id,
          village_id: price.village_id,
          cost: price.cost,
          currency: price.currency,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await trx('service_type_village_prices').insert(villagePriceInserts);
      }

      await trx.commit();

      const updatedServiceType = await this.getServiceTypeById(id);
      if (!updatedServiceType) {
        throw new Error('Failed to update service type');
      }

      return updatedServiceType;
    } catch (error: any) {
      await trx.rollback();
      
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Service type with this name already exists');
      }
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to village or assignee');
      }
      throw new Error(`Failed to update service type: ${error.message}`);
    }
  }

  /**
   * Delete service type (also deletes village prices due to CASCADE)
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
   * Get village prices for multiple service types
   */
  private async getVillagePricesForServiceTypes(serviceTypeIds: number[]): Promise<ServiceTypeVillagePrice[]> {
    if (serviceTypeIds.length === 0) return [];

    const prices = await db('service_type_village_prices as stvp')
      .leftJoin('villages as v', 'stvp.village_id', 'v.id')
      .select(
        'stvp.*',
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'v.created_at as village_created_at',
        'v.updated_at as village_updated_at'
      )
      .whereIn('stvp.service_type_id', serviceTypeIds)
      .orderBy(['stvp.service_type_id', 'v.name']);

    return prices.map((price: any) => ({
      id: price.id,
      service_type_id: price.service_type_id,
      village_id: price.village_id,
      cost: parseFloat(price.cost),
      currency: price.currency,
      created_at: new Date(price.created_at),
      updated_at: new Date(price.updated_at),
      village: price.village_name ? {
        id: price.village_id,
        name: price.village_name,
        electricity_price: parseFloat(price.village_electricity_price || '0'),
        water_price: parseFloat(price.village_water_price || '0'),
        phases: price.village_phases || 1,
        created_at: new Date(price.village_created_at),
        updated_at: new Date(price.village_updated_at)
      } : undefined
    }));
  }

  /**
   * Get service type statistics
   */
  async getServiceTypeStats(): Promise<{
    total_service_types: number;
    by_currency: { currency: string; count: number; avg_cost: number }[];
    most_used: { id: number; name: string; usage_count: number }[];
    by_village: { village_name: string; service_count: number; avg_cost: number }[];
  }> {
    // Total service types
    const [{ count: totalServiceTypes }] = await db('service_types').count('id as count');

    // By currency with average cost (from village prices)
    const byCurrency = await db('service_type_village_prices')
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

    // By village statistics
    const byVillage = await db('service_type_village_prices as stvp')
      .join('villages as v', 'stvp.village_id', 'v.id')
      .select('v.name as village_name')
      .count('stvp.id as service_count')
      .avg('stvp.cost as avg_cost')
      .groupBy('v.name')
      .orderBy('service_count', 'desc');

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
      })),
      by_village: byVillage.map(item => ({
        village_name: String(item.village_name),
        service_count: parseInt(item.service_count as string),
        avg_cost: parseFloat(item.avg_cost as string) || 0
      }))
    };
  }
} 