import { db } from '../database/connection';
import bcrypt from 'bcrypt';
import {
  User,
  PublicUser,
  UserFilters,
  CreateUserRequest,
  UpdateUserRequest,
  PaginatedResponse,
  Village
} from '../types';

export class UserService {
  
  /**
   * Get all users with filtering, sorting, and pagination
   */
  async getUsers(filters: UserFilters, villageFilter?: number): Promise<PaginatedResponse<PublicUser>> {
    const {
      search,
      role,
      is_active,
      village_id,
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'asc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Cap at 100

    // Start with base query (no select yet)
    let baseQuery = db('users');

    // Apply is_active filter - only if explicitly specified
    // If not specified, show all users (admins may need to see inactive users)
    if (is_active !== undefined) {
      baseQuery = baseQuery.where('is_active', is_active);
    }

    // Apply village filter if provided (for admin users with responsible_village)
    // Support both the new village_id filter and the legacy villageFilter parameter
    const effectiveVillageFilter = village_id !== undefined ? village_id : villageFilter;
    if (effectiveVillageFilter !== undefined) {
      baseQuery = baseQuery.where(function() {
        // Check responsible_village for backward compatibility
        this.where('responsible_village', effectiveVillageFilter)
          // Also check user_villages junction table for admin users with multiple villages
          .orWhereExists(function() {
            this.select('*')
              .from('user_villages')
              .whereRaw('user_villages.user_id = users.id')
              .where('user_villages.village_id', effectiveVillageFilter);
          });
      });
    }

    // Apply search filter (search in name, email, and phone_number)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      baseQuery = baseQuery.where(function() {
        this.where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('email', 'ilike', `%${searchTerm}%`)
            .orWhere('phone_number', 'ilike', `%${searchTerm}%`);
      });
    }

    // Apply role filter
    if (role) {
      baseQuery = baseQuery.where('role', role);
    }

    // Get total count for pagination (clone base query before adding select)
    const totalQuery = baseQuery.clone();
    const [{ count }] = await totalQuery.count('id as count');
    const total = parseInt(count as string);

    // Now add select to the main query
    let query = baseQuery.select([
      'id', 'name', 'email', 'phone_number', 'role', 
      'last_login', 'is_active', 'responsible_village',
      'passport_number', 'passport_expiry_date', 'address',
      'next_of_kin_name', 'next_of_kin_address', 'next_of_kin_email', 'next_of_kin_phone',
      'next_of_kin_will',
      'created_at', 'updated_at'
    ]);

    // Apply sorting
    const validSortFields = ['name', 'email', 'role', 'created_at', 'last_login', 'is_active'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(sortField, validSortOrder);

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const users = await query;

    // Transform data with proper type handling
    const transformedUsers: PublicUser[] = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      responsible_village: user.responsible_village || undefined,
      passport_number: user.passport_number || undefined,
      passport_expiry_date: user.passport_expiry_date ? new Date(user.passport_expiry_date) : undefined,
      address: user.address || undefined,
      next_of_kin_name: user.next_of_kin_name || undefined,
      next_of_kin_address: user.next_of_kin_address || undefined,
      next_of_kin_email: user.next_of_kin_email || undefined,
      next_of_kin_phone: user.next_of_kin_phone || undefined,
      next_of_kin_will: user.next_of_kin_will || undefined,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    }));

    // Fetch villages for admin users
    const adminUsers = transformedUsers.filter(user => user.role === 'admin');
    if (adminUsers.length > 0) {
      await Promise.all(
        adminUsers.map(async (user) => {
          const villages = await this.getUserVillages(user.id);
          if (villages.length > 0) {
            user.villages = villages;
          }
        })
      );
    }

    return {
      data: transformedUsers,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get user by ID (public version - no sensitive data)
   */
  async getUserById(id: number): Promise<PublicUser | null> {
    if (!id || id <= 0) {
      return null;
    }

    const user = await db('users')
      .select([
        'id', 'name', 'email', 'phone_number', 'role', 
        'last_login', 'is_active', 'responsible_village',
        'passport_number', 'passport_expiry_date', 'address',
        'next_of_kin_name', 'next_of_kin_address', 'next_of_kin_email', 'next_of_kin_phone',
        'next_of_kin_will',
        'created_at', 'updated_at'
      ])
      .where('id', id)
      .first();

    if (!user) {
      return null;
    }

    const userObj: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      responsible_village: user.responsible_village || undefined,
      passport_number: user.passport_number || undefined,
      passport_expiry_date: user.passport_expiry_date ? new Date(user.passport_expiry_date) : undefined,
      address: user.address || undefined,
      next_of_kin_name: user.next_of_kin_name || undefined,
      next_of_kin_address: user.next_of_kin_address || undefined,
      next_of_kin_email: user.next_of_kin_email || undefined,
      next_of_kin_phone: user.next_of_kin_phone || undefined,
      next_of_kin_will: user.next_of_kin_will || undefined,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };

    // Fetch user villages if the user is an admin
    if (user.role === 'admin') {
      const villages = await this.getUserVillages(user.id);
      userObj.villages = villages.length > 0 ? villages : undefined;
    }

    return userObj;
  }

  /**
   * Get user by email (public version)
   */
  async getUserByEmail(email: string): Promise<PublicUser | null> {
    if (!email || !email.trim()) {
      return null;
    }

    const user = await db('users')
      .select([
        'id', 'name', 'email', 'phone_number', 'role', 
        'last_login', 'is_active', 'responsible_village',
        'passport_number', 'passport_expiry_date', 'address',
        'next_of_kin_name', 'next_of_kin_address', 'next_of_kin_email', 'next_of_kin_phone',
        'next_of_kin_will',
        'created_at', 'updated_at'
      ])
      .where('email', email.toLowerCase().trim())
      .first();

    if (!user) {
      return null;
    }

    const userObj: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      responsible_village: user.responsible_village || undefined,
      passport_number: user.passport_number || undefined,
      passport_expiry_date: user.passport_expiry_date ? new Date(user.passport_expiry_date) : undefined,
      address: user.address || undefined,
      next_of_kin_name: user.next_of_kin_name || undefined,
      next_of_kin_address: user.next_of_kin_address || undefined,
      next_of_kin_email: user.next_of_kin_email || undefined,
      next_of_kin_phone: user.next_of_kin_phone || undefined,
      next_of_kin_will: user.next_of_kin_will || undefined,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };

    // Fetch user villages if the user is an admin
    if (user.role === 'admin') {
      const villages = await this.getUserVillages(user.id);
      userObj.villages = villages.length > 0 ? villages : undefined;
    }

    return userObj;
  }

  /**
   * Get user by email including sensitive data (for auth purposes)
   */
  async getUserByEmailWithAuth(email: string): Promise<User | null> {
    if (!email || !email.trim()) {
      return null;
    }

    const user = await db('users')
      .select([
        'id', 'name', 'email', 'phone_number', 'role', 
        'password_hash', 'last_login', 'is_active', 'responsible_village',
        'refresh_token_hash', 'refresh_token_expires_at',
        'passport_number', 'passport_expiry_date', 'address',
        'next_of_kin_name', 'next_of_kin_address', 'next_of_kin_email', 'next_of_kin_phone',
        'next_of_kin_will',
        'created_at', 'updated_at'
      ])
      .where('email', email.toLowerCase().trim())
      .first();

    if (!user) {
      return null;
    }

    const userObj: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      password_hash: user.password_hash,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      responsible_village: user.responsible_village || undefined,
      refresh_token_hash: user.refresh_token_hash || undefined,
      refresh_token_expires_at: user.refresh_token_expires_at ? new Date(user.refresh_token_expires_at) : undefined,
      passport_number: user.passport_number || undefined,
      passport_expiry_date: user.passport_expiry_date ? new Date(user.passport_expiry_date) : undefined,
      address: user.address || undefined,
      next_of_kin_name: user.next_of_kin_name || undefined,
      next_of_kin_address: user.next_of_kin_address || undefined,
      next_of_kin_email: user.next_of_kin_email || undefined,
      next_of_kin_phone: user.next_of_kin_phone || undefined,
      next_of_kin_will: user.next_of_kin_will || undefined,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };

    // Fetch user villages if the user is an admin
    if (user.role === 'admin') {
      const villages = await this.getUserVillages(user.id);
      userObj.villages = villages.length > 0 ? villages : undefined;
    }

    return userObj;
  }

  /**
   * Create new user (Admin only - includes password)
   */
  async createUser(data: CreateUserRequest & { password?: string }): Promise<PublicUser> {
    // Input validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Name is required');
    }

    if (!data.email || !data.email.trim()) {
      throw new Error('Email is required');
    }

    if (!data.role) {
      throw new Error('Role is required');
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'owner', 'renter'];
    if (!validRoles.includes(data.role)) {
      throw new Error('Invalid role specified');
    }

    // Validate unique email
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate email format
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone number format if provided
    if (data.phone_number && !this.isValidPhoneNumber(data.phone_number)) {
      throw new Error('Invalid phone number format');
    }

    try {
      let userId = 0; // Initialize userId

      // Use a transaction for creating user and setting villages
      await db.transaction(async (trx) => {
        // Generate a default password if not provided (for admin-created users)
        const defaultPassword = data.password || this.generateDefaultPassword();
        const passwordHash = await this.hashPassword(defaultPassword);

        const [result] = await trx('users')
          .insert({
            name: data.name.trim(),
            email: data.email.toLowerCase().trim(),
            phone_number: data.phone_number?.trim() || null,
            role: data.role,
            responsible_village: data.responsible_village || null,
            password_hash: passwordHash,
            is_active: true,
            passport_number: data.passport_number?.trim() || null,
            passport_expiry_date: data.passport_expiry_date ? new Date(data.passport_expiry_date) : null,
            address: data.address?.trim() || null,
            next_of_kin_name: data.next_of_kin_name?.trim() || null,
            next_of_kin_address: data.next_of_kin_address?.trim() || null,
            next_of_kin_email: data.next_of_kin_email?.trim() || null,
            next_of_kin_phone: data.next_of_kin_phone?.trim() || null,
            next_of_kin_will: data.next_of_kin_will || null,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('id');

        userId = typeof result === 'object' ? result.id : result;

        // Add village associations if provided
        if (data.role === 'admin' && data.village_ids && data.village_ids.length > 0) {
          const villageRows = data.village_ids.map(villageId => ({
            user_id: userId,
            village_id: villageId,
            created_at: new Date(),
            updated_at: new Date()
          }));

          await trx('user_villages').insert(villageRows);
        }
      });
      
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('Failed to create user');
      }

      return user;
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('User with this email already exists');
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UpdateUserRequest): Promise<PublicUser> {
    if (!id || id <= 0) {
      throw new Error('Invalid user ID');
    }

    // Check if user exists
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Validate unique email if provided and different from current
    if (data.email && data.email.trim() !== existingUser.email) {
      const duplicateEmail = await this.getUserByEmail(data.email);
      if (duplicateEmail && duplicateEmail.id !== id) {
        throw new Error('User with this email already exists');
      }

      // Validate email format
      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Validate phone number format if provided
    if (data.phone_number && !this.isValidPhoneNumber(data.phone_number)) {
      throw new Error('Invalid phone number format');
    }

    // Validate role if provided
    if (data.role) {
      const validRoles = ['super_admin', 'admin', 'owner', 'renter'];
      if (!validRoles.includes(data.role)) {
        throw new Error('Invalid role specified');
      }
    }

    try {
      // Handle password hashing outside of transaction to avoid potential issues
      let passwordHash: string | undefined;
      if (data.password && data.password.trim()) {
        try {
          // Pre-hash the password before the transaction
          passwordHash = await this.hashPassword(data.password.trim());
        } catch (hashError: any) {
          console.error('Password hashing error:', hashError);
          throw new Error('Failed to process password update');
        }
      }

      await db.transaction(async (trx) => {
        const updateData: any = {
          updated_at: new Date()
        };

        // Only update provided fields
        if (data.name !== undefined && data.name.trim()) {
          updateData.name = data.name.trim();
        }

        if (data.email !== undefined && data.email.trim()) {
          updateData.email = data.email.toLowerCase().trim();
        }

        if (data.phone_number !== undefined) {
          updateData.phone_number = data.phone_number ? data.phone_number.trim() : null;
        }

        if (data.role !== undefined) {
          updateData.role = data.role;
        }

        if (data.responsible_village !== undefined) {
          updateData.responsible_village = data.responsible_village || null;
        }

        // Handle new fields
        if (data.passport_number !== undefined) {
          updateData.passport_number = data.passport_number ? data.passport_number.trim() : null;
        }

        if (data.passport_expiry_date !== undefined) {
          updateData.passport_expiry_date = data.passport_expiry_date ? new Date(data.passport_expiry_date) : null;
        }

        if (data.address !== undefined) {
          updateData.address = data.address ? data.address.trim() : null;
        }

        if (data.next_of_kin_name !== undefined) {
          updateData.next_of_kin_name = data.next_of_kin_name ? data.next_of_kin_name.trim() : null;
        }

        if (data.next_of_kin_address !== undefined) {
          updateData.next_of_kin_address = data.next_of_kin_address ? data.next_of_kin_address.trim() : null;
        }

        if (data.next_of_kin_email !== undefined) {
          updateData.next_of_kin_email = data.next_of_kin_email ? data.next_of_kin_email.trim() : null;
        }

        if (data.next_of_kin_phone !== undefined) {
          updateData.next_of_kin_phone = data.next_of_kin_phone ? data.next_of_kin_phone.trim() : null;
        }

        if (data.next_of_kin_will !== undefined) {
          updateData.next_of_kin_will = data.next_of_kin_will || null;
        }

        // Add password_hash directly to the update if we have it
        if (passwordHash) {
          updateData.password_hash = passwordHash;
        }

        // Update user data
        await trx('users')
          .where('id', id)
          .update(updateData);

        // Update village associations if provided and user is an admin
        const existingUserRole = await trx('users').select('role').where('id', id).first();
        
        if (existingUserRole && existingUserRole.role === 'admin' && data.village_ids !== undefined) {
          // Remove existing associations
          await trx('user_villages')
            .where('user_id', id)
            .del();

          // Add new associations if any
          if (data.village_ids && data.village_ids.length > 0) {
            const villageRows = data.village_ids.map(villageId => ({
              user_id: id,
              village_id: villageId,
              created_at: new Date(),
              updated_at: new Date()
            }));

            await trx('user_villages').insert(villageRows);
          }
        }
      });

      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('Failed to update user');
      }

      return user;
    } catch (error: any) {
      // Handle database constraint errors
      if (error.code === '23505' || error.message?.includes('unique')) {
        throw new Error('User with this email already exists');
      }
      console.error('User update error:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Update user password and auth fields (used by auth service)
   */
  async updateUserAuth(id: number, authData: {
    password_hash?: string;
    last_login?: Date;
    refresh_token_hash?: string | null;
    refresh_token_expires_at?: Date | null;
  }): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid user ID');
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (authData.password_hash !== undefined) {
      updateData.password_hash = authData.password_hash;
    }

    if (authData.last_login !== undefined) {
      updateData.last_login = authData.last_login;
    }

    if (authData.refresh_token_hash !== undefined) {
      updateData.refresh_token_hash = authData.refresh_token_hash;
    }

    if (authData.refresh_token_expires_at !== undefined) {
      updateData.refresh_token_expires_at = authData.refresh_token_expires_at;
    }

    await db('users')
      .where('id', id)
      .update(updateData);
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid user ID');
    }

    // Check if user exists
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Prevent deletion of super admin users
    if (existingUser.role === 'super_admin') {
      throw new Error('Cannot delete super admin users');
    }

    // Check if user owns any apartments
    const apartmentCount = await db('apartments')
      .where('owner_id', id)
      .count('id as count')
      .first();

    if (apartmentCount && parseInt(apartmentCount.count as string) > 0) {
      throw new Error('Cannot delete user who owns apartments. Please reassign or delete all apartments first.');
    }

    // Check if user has any active bookings
    const activeBookingCount = await db('bookings')
      .where('user_id', id)
      .whereIn('status', ['Booked', 'Checked In'])
      .count('id as count')
      .first();

    if (activeBookingCount && parseInt(activeBookingCount.count as string) > 0) {
      throw new Error('Cannot delete user who has active bookings. Please complete or cancel all active bookings first.');
    }

    // Check if user created any records (created_by)
    const createdRecords = await this.checkCreatedRecords(id);
    if (createdRecords > 0) {
      throw new Error('Cannot delete user who created other records. Please reassign created records first.');
    }

    try {
      await db('users')
        .where('id', id)
        .del();
    } catch (error: any) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(id: number): Promise<{
    owned_apartments: number;
    total_bookings: number;
    active_bookings: number;
    created_records: number;
  }> {
    // Check if user exists
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Get owned apartments
    const [{ count: ownedApartments }] = await db('apartments')
      .where('owner_id', id)
      .count('id as count');

    // Get total bookings
    const [{ count: totalBookings }] = await db('bookings')
      .where('user_id', id)
      .count('id as count');

    // Get active bookings (Checked In)
    const [{ count: activeBookings }] = await db('bookings')
      .where('user_id', id)
      .where('status', 'Checked In')
      .count('id as count');

    // Get records created by this user
    const createdRecords = await this.checkCreatedRecords(id);

    return {
      owned_apartments: parseInt(ownedApartments as string),
      total_bookings: parseInt(totalBookings as string),
      active_bookings: parseInt(activeBookings as string),
      created_records: createdRecords
    };
  }

  /**
   * Get global user counts by role
   */
  async getGlobalUserCounts(): Promise<{
    total: number;
    active: number;
    admins: number;
    owners: number;
    renters: number;
  }> {
    // Get total users count
    const [{ count: totalCount }] = await db('users').count('id as count');
    
    // Get active users count
    const [{ count: activeCount }] = await db('users')
      .where('is_active', true)
      .count('id as count');
    
    // Get count by role
    const roleCounts = await db('users')
      .select('role')
      .count('id as count')
      .groupBy('role');
    
    // Initialize counts
    let admins = 0;
    let owners = 0;
    let renters = 0;
    
    // Process role counts
    roleCounts.forEach(item => {
      const count = parseInt(item.count as string);
      
      if (item.role === 'admin' || item.role === 'super_admin') {
        admins += count;
      } else if (item.role === 'owner') {
        owners = count;
      } else if (item.role === 'renter') {
        renters = count;
      }
    });
    
    return {
      total: parseInt(totalCount as string),
      active: parseInt(activeCount as string),
      admins,
      owners,
      renters
    };
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: 'super_admin' | 'admin' | 'owner' | 'renter'): Promise<PublicUser[]> {
    const users = await db('users')
      .select([
        'id', 'name', 'email', 'phone_number', 'role', 
        'last_login', 'is_active', 'responsible_village', 'created_at', 'updated_at'
      ])
      .where('role', role)
      .orderBy('name', 'asc');

    const transformedUsers: PublicUser[] = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      responsible_village: user.responsible_village || undefined,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    }));

    // Fetch villages for admin users
    if (role === 'admin') {
      await Promise.all(
        transformedUsers.map(async (user) => {
          const villages = await this.getUserVillages(user.id);
          if (villages.length > 0) {
            user.villages = villages;
          }
        })
      );
    }

    return transformedUsers;
  }

  /**
   * Activate/Deactivate user (Admin only)
   */
  async setUserActiveStatus(id: number, isActive: boolean): Promise<PublicUser> {
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    await db('users')
      .where('id', id)
      .update({
        is_active: isActive,
        updated_at: new Date()
      });

    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('Failed to update user status');
    }

    return user;
  }

  /**
   * Get user villages
   */
  async getUserVillages(userId: number): Promise<Village[]> {
    if (!userId || userId <= 0) {
      return [];
    }

    const villages = await db('user_villages as uv')
      .join('villages as v', 'uv.village_id', 'v.id')
      .where('uv.user_id', userId)
      .select(
        'v.id', 
        'v.name', 
        'v.electricity_price', 
        'v.water_price',
        'v.phases',
        'v.created_by',
        'v.created_at',
        'v.updated_at'
      );

    return villages.map(village => ({
      id: village.id,
      name: village.name,
      electricity_price: village.electricity_price,
      water_price: village.water_price,
      phases: village.phases,
      created_by: village.created_by,
      created_at: new Date(village.created_at),
      updated_at: new Date(village.updated_at)
    }));
  }

  /**
   * Set user villages (replaces existing associations)
   */
  async setUserVillages(userId: number, villageIds: number[]): Promise<void> {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    // Start a transaction to ensure data consistency
    await db.transaction(async (trx) => {
      // Remove existing associations
      await trx('user_villages')
        .where('user_id', userId)
        .del();

      // Add new associations if any
      if (villageIds && villageIds.length > 0) {
        const rows = villageIds.map(villageId => ({
          user_id: userId,
          village_id: villageId,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await trx('user_villages').insert(rows);
      }
    });
  }

  /**
   * Check how many records this user has created
   */
  private async checkCreatedRecords(userId: number): Promise<number> {
    const tables = [
      'villages', 'apartments', 'bookings', 'service_types', 
      'service_requests', 'utility_readings', 'payment_methods', 
      'payments', 'emails'
    ];

    let totalCount = 0;

    for (const table of tables) {
      try {
        const [{ count }] = await db(table)
          .where('created_by', userId)
          .count('id as count');
        totalCount += parseInt(count as string);
      } catch (error) {
        // Some tables might not have created_by field, ignore errors
        console.warn(`Table ${table} might not have created_by field`);
      }
    }

    return totalCount;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation - check all chars are numbers
    return /^\d+$/.test(phone);
  }

  /**
   * Generate a default password for admin-created users
   */
  private generateDefaultPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }
}