import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../database/connection';
import {
  User,
  PublicUser,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenPayload,
  RefreshTokenRequest
} from '../types';

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly JWT_REFRESH_EXPIRES_IN: string;
  private readonly BCRYPT_ROUNDS: number;

  constructor() {
    // Environment variables for JWT configuration
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '60m'; // 60 minutes
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days
    this.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

    // Warn if using default secrets in production
    if (process.env.NODE_ENV === 'production') {
      if (this.JWT_SECRET.includes('change-this') || this.JWT_REFRESH_SECRET.includes('change-this')) {
        console.error('WARNING: Using default JWT secrets in production! Please set JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
      }
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate email format
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    this.validatePassword(data.password);

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const [userId] = await db('users')
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

    const user = await this.getUserById(userId.id);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Generate tokens
    return await this.generateAuthResponse(user);
  }

  /**
   * Login user with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    // Get user by email
    const user = await this.getUserByEmail(data.email, true); // Include password hash
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(data.password, user.password_hash!);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db('users')
      .where('id', user.id)
      .update({
        last_login: new Date(),
        updated_at: new Date()
      });

    // Generate tokens
    return await this.generateAuthResponse(user);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(data.refresh_token, this.JWT_REFRESH_SECRET) as TokenPayload;
      
      // Get user
      const user = await this.getUserById(decoded.user_id, true);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Verify stored refresh token hash
      if (!user.refresh_token_hash) {
        throw new Error('No refresh token found');
      }

      const isRefreshTokenValid = await bcrypt.compare(data.refresh_token, user.refresh_token_hash);
      if (!isRefreshTokenValid) {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token is expired
      if (user.refresh_token_expires_at && new Date() > user.refresh_token_expires_at) {
        throw new Error('Refresh token expired');
      }

      // Generate new tokens
      return await this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(userId: number): Promise<void> {
    await db('users')
      .where('id', userId)
      .update({
        refresh_token_hash: null,
        refresh_token_expires_at: null,
        updated_at: new Date()
      });
  }

  /**
   * Verify JWT access token
   */
  async verifyAccessToken(token: string): Promise<PublicUser> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      const user = await this.getUserById(decoded.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with password hash
    const user = await this.getUserById(userId, true);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash!);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password and invalidate refresh tokens
    await db('users')
      .where('id', userId)
      .update({
        password_hash: newPasswordHash,
        refresh_token_hash: null,
        refresh_token_expires_at: null,
        updated_at: new Date()
      });
  }

  /**
   * Generate authentication response with tokens
   */
  private async generateAuthResponse(user: User): Promise<AuthResponse> {
    const publicUser = this.toPublicUser(user);
    
    // Generate access token
    const accessTokenPayload: TokenPayload = {
      user_id: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = jwt.sign(
      accessTokenPayload, 
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Generate refresh token
    const refreshTokenPayload: TokenPayload = {
      user_id: user.id,
      email: user.email,
      role: user.role
    };

    const refreshToken = jwt.sign(
      refreshTokenPayload, 
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    // Hash and store refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, this.BCRYPT_ROUNDS);
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 days from now

    await db('users')
      .where('id', user.id)
      .update({
        refresh_token_hash: refreshTokenHash,
        refresh_token_expires_at: refreshTokenExpiresAt,
        updated_at: new Date()
      });

    // Parse expires_in from JWT_EXPIRES_IN
    const expiresIn = this.parseExpiresIn(this.JWT_EXPIRES_IN);

    return {
      user: publicUser,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn
    };
  }

  /**
   * Get user by ID
   */
  private async getUserById(id: number, includePassword = false): Promise<User | null> {
    const query = db('users').where('id', id);
    
    if (!includePassword) {
      query.select([
        'id', 'name', 'email', 'phone_number', 'role', 
        'last_login', 'is_active', 'responsible_village', 'created_at', 'updated_at'
      ]);
    }

    const user = await query.first();
    
    if (!user) {
      return null;
    }

    return {
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      refresh_token_expires_at: user.refresh_token_expires_at ? new Date(user.refresh_token_expires_at) : undefined
    };
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(email: string, includePassword = false): Promise<User | null> {
    const query = db('users').where('email', email.toLowerCase());
    
    if (!includePassword) {
      query.select([
        'id', 'name', 'email', 'phone_number', 'role', 
        'last_login', 'is_active', 'responsible_village', 'created_at', 'updated_at'
      ]);
    }

    const user = await query.first();
    
    if (!user) {
      return null;
    }

    return {
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      last_login: user.last_login ? new Date(user.last_login) : undefined,
      refresh_token_expires_at: user.refresh_token_expires_at ? new Date(user.refresh_token_expires_at) : undefined
    };
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Convert User to PublicUser (removing sensitive fields)
   */
  private toPublicUser(user: User): PublicUser {
    const { password_hash, refresh_token_hash, refresh_token_expires_at, ...publicUser } = user;
    return publicUser;
  }

  /**
   * Parse expires_in string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900; // Default 15 minutes
    }
  }
} 