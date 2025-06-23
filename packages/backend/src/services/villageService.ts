import { db } from '../database/connection';
import {
  Village,
  VillageFilters,
  CreateVillageRequest,
  UpdateVillageRequest,
  PaginatedResponse
} from '../types';

export class VillageService {
  
  /**
   * Get all villages with filtering, sorting, and pagination
   */
  async getVillages(filters: VillageFilters): Promise<PaginatedResponse<Village>> {
    const {
      search,
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'asc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Cap at 100

    let query = db('villages');

    // Apply search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.where('name', 'ilike', `%${searchTerm}%`);
    }

    // Get total count for pagination
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['name', 'electricity_price', 'water_price', 'phases', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(sortField, validSortOrder);

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const villages = await query;

    // Transform data
    const transformedVillages = villages.map((village: any) => ({
      ...village,
      electricity_price: parseFloat(village.electricity_price),
      water_price: parseFloat(village.water_price),
      created_by: village.created_by || undefined,
      created_at: new Date(village.created_at),
      updated_at: new Date(village.updated_at)
    }));

    return {
      data: transformedVillages,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get village by ID
   */
  async getVillageById(id: number): Promise<Village | null> {
    if (!id || id <= 0) {
      return null;
    }

    const village = await db('villages')
      .where('id', id)
      .first();

    if (!village) {
      return null;
    }

    return {
      ...village,
      electricity_price: parseFloat(village.electricity_price),
      water_price: parseFloat(village.water_price),
      created_by: village.created_by || undefined,
      created_at: new Date(village.created_at),
      updated_at: new Date(village.updated_at)
    };
  }

  /**
   * Create new village
   */
  async createVillage(data: CreateVillageRequest, createdBy?: number): Promise<Village> {
    // Input validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Village name is required');
    }

    if (typeof data.electricity_price !== 'number') {
      throw new Error('Electricity price must be a number');
    }

    if (typeof data.water_price !== 'number') {
      throw new Error('Water price must be a number');
    }

    if (typeof data.phases !== 'number' || !Number.isInteger(data.phases)) {
      throw new Error('Phases must be an integer');
    }

    // Validate unique name
    const existingVillage = await db('villages')
      .where('name', data.name.trim())
      .first();

    if (existingVillage) {
      throw new Error('Village with this name already exists');
    }

    // Validate numeric values
    if (data.electricity_price < 0) {
      throw new Error('Electricity price must be non-negative');
    }

    if (data.water_price < 0) {
      throw new Error('Water price must be non-negative');
    }

    if (data.phases < 1) {
      throw new Error('Number of phases must be at least 1');
    }

    try {
      const [villageId] = await db('villages')
        .insert({
          name: data.name.trim(),
          electricity_price: data.electricity_price,
          water_price: data.water_price,
          phases: data.phases,
          created_by: createdBy || null,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const userId = typeof villageId === 'object' ? villageId.id : villageId;
      
      const village = await this.getVillageById(userId);
      if (!village) {
        throw new Error('Failed to create village');
      }

      return village;
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Village with this name already exists');
      }
      throw new Error(`Failed to create village: ${error.message}`);
    }
  }

  /**
   * Update village
   */
  async updateVillage(id: number, data: UpdateVillageRequest): Promise<Village> {
    if (!id || id <= 0) {
      throw new Error('Invalid village ID');
    }

    // Check if village exists
    const existingVillage = await this.getVillageById(id);
    if (!existingVillage) {
      throw new Error('Village not found');
    }

    // Validate unique name if provided
    if (data.name && data.name !== existingVillage.name) {
      const duplicateName = await db('villages')
        .where('name', data.name)
        .where('id', '!=', id)
        .first();

      if (duplicateName) {
        throw new Error('Village with this name already exists');
      }
    }

    // Validate numeric values if provided
    if (data.electricity_price !== undefined && data.electricity_price < 0) {
      throw new Error('Electricity price must be non-negative');
    }

    if (data.water_price !== undefined && data.water_price < 0) {
      throw new Error('Water price must be non-negative');
    }

    if (data.phases !== undefined && data.phases < 1) {
      throw new Error('Number of phases must be at least 1');
    }

    // If phases are being reduced, check if there are apartments in higher phases
    if (data.phases !== undefined && data.phases < existingVillage.phases) {
      const highPhaseApartments = await db('apartments')
        .where('village_id', id)
        .where('phase', '>', data.phases)
        .first();

      if (highPhaseApartments) {
        throw new Error(`Cannot reduce phases to ${data.phases}. There are apartments in higher phases.`);
      }
    }

    const updateData: any = {
      updated_at: new Date()
    };

    // Only update provided fields
    if (data.name !== undefined && data.name.trim()) {
      updateData.name = data.name.trim();
    }

    if (data.electricity_price !== undefined) {
      updateData.electricity_price = data.electricity_price;
    }

    if (data.water_price !== undefined) {
      updateData.water_price = data.water_price;
    }

    if (data.phases !== undefined) {
      updateData.phases = data.phases;
    }

    try {
      await db('villages')
        .where('id', id)
        .update(updateData);

      const village = await this.getVillageById(id);
      if (!village) {
        throw new Error('Failed to update village');
      }

      return village;
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('Village with this name already exists');
      }
      throw new Error(`Failed to update village: ${error.message}`);
    }
  }

  /**
   * Delete village
   */
  async deleteVillage(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid village ID');
    }

    // Check if village exists
    const existingVillage = await this.getVillageById(id);
    if (!existingVillage) {
      throw new Error('Village not found');
    }

    // Check if there are any apartments in this village
    const apartmentCount = await db('apartments')
      .where('village_id', id)
      .count('id as count')
      .first();

    if (apartmentCount && parseInt(apartmentCount.count as string) > 0) {
      throw new Error('Cannot delete village with existing apartments. Please move or delete all apartments first.');
    }

    try {
      await db('villages')
        .where('id', id)
        .del();
    } catch (error: any) {
      throw new Error(`Failed to delete village: ${error.message}`);
    }
  }

  /**
   * Get villages with apartment counts
   */
  async getVillagesWithStats(): Promise<(Village & { apartment_count: number })[]> {
    const villages = await db('villages')
      .leftJoin('apartments', 'villages.id', 'apartments.village_id')
      .select(
        'villages.*',
        db.raw('COUNT(apartments.id) as apartment_count')
      )
      .groupBy('villages.id')
      .orderBy('villages.name', 'asc');

    return villages.map((village: any) => ({
      id: village.id,
      name: village.name,
      electricity_price: parseFloat(village.electricity_price),
      water_price: parseFloat(village.water_price),
      phases: village.phases,
      created_by: village.created_by || undefined,
      created_at: new Date(village.created_at),
      updated_at: new Date(village.updated_at),
      apartment_count: parseInt(village.apartment_count as string)
    }));
  }

  /**
   * Get village statistics
   */
  async getVillageStats(id: number): Promise<{
    total_apartments: number;
    apartments_by_phase: { phase: number; count: number }[];
    apartments_by_status: { status: string; count: number }[];
  }> {
    // Check if village exists
    const village = await this.getVillageById(id);
    if (!village) {
      throw new Error('Village not found');
    }

    // Get total apartments
    const [{ count: totalApartments }] = await db('apartments')
      .where('village_id', id)
      .count('id as count');

    // Get apartments by phase
    const apartmentsByPhase = await db('apartments')
      .where('village_id', id)
      .groupBy('phase')
      .select('phase')
      .count('id as count')
      .orderBy('phase');

    // Get apartments by paying status
    const apartmentsByStatus = await db('apartments')
      .where('village_id', id)
      .groupBy('paying_status')
      .select('paying_status as status')
      .count('id as count');

    return {
      total_apartments: parseInt(totalApartments as string),
      apartments_by_phase: apartmentsByPhase.map(item => ({
        phase: Number(item.phase),
        count: parseInt(item.count as string)
      })),
      apartments_by_status: apartmentsByStatus.map(item => ({
        status: String(item.status),
        count: parseInt(item.count as string)
      }))
    };
  }
} 