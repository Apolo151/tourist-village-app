import { db } from '../database/connection';
import bcrypt from 'bcrypt';
import {
  User,
  PublicUser,
  UserFilters,
  CreateUserRequest,
  UpdateUserRequest,
  PaginatedResponse
} from '../types';

export class UserService {
  
  /**
   * Get all users with filtering, sorting, and pagination
   */
  async getUsers(filters: UserFilters): Promise<PaginatedResponse<PublicUser>> {
    const {
      search,
      role,
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'asc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Cap at 100

    // Start with base query (no select yet)
    let baseQuery = db('users').where('is_active', true); // Only return active users by default

    // Apply search filter (search in name and email)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      baseQuery = baseQuery.where(function() {
        this.where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('email', 'ilike', `%${searchTerm}%`);
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
      'last_login', 'is_active', 'created_at', 'updated_at'
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
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    }));

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
        'last_login', 'is_active', 'created_at', 'updated_at'
      ])
      .where('id', id)
      .first();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };
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
        'last_login', 'is_active', 'created_at', 'updated_at'
      ])
      .where('email', email.toLowerCase().trim())
      .first();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };
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
        'password_hash', 'last_login', 'is_active', 
        'refresh_token_hash', 'refresh_token_expires_at',
        'created_at', 'updated_at'
      ])
      .where('email', email.toLowerCase().trim())
      .first();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || undefined,
      role: user.role,
      password_hash: user.password_hash,
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      is_active: Boolean(user.is_active),
      refresh_token_hash: user.refresh_token_hash || undefined,
      refresh_token_expires_at: user.refresh_token_expires_at ? new Date(user.refresh_token_expires_at) : undefined,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };
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

    // Generate a default password if not provided (for admin-created users)
    const defaultPassword = data.password || this.generateDefaultPassword();
    const passwordHash = await this.hashPassword(defaultPassword);

    try {
      const [result] = await db('users')
        .insert({
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          phone_number: data.phone_number?.trim() || null,
          role: data.role,
          password_hash: passwordHash,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const userId = typeof result === 'object' ? result.id : result;
      
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

    try {
      await db('users')
        .where('id', id)
        .update(updateData);

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
      .whereIn('status', ['not_arrived', 'in_village'])
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

    // Get active bookings (in_village)
    const [{ count: activeBookings }] = await db('bookings')
      .where('user_id', id)
      .where('status', 'in_village')
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
   * Get users by role
   */
  async getUsersByRole(role: 'super_admin' | 'admin' | 'owner' | 'renter'): Promise<PublicUser[]> {
    const users = await db('users')
      .select([
        'id', 'name', 'email', 'phone_number', 'role', 
        'last_login', 'is_active', 'created_at', 'updated_at'
      ])
      .where('role', role)
      .orderBy('name', 'asc');

    return users.map((user: any) => ({
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      last_login: user.last_login ? new Date(user.last_login) : undefined
    }));
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