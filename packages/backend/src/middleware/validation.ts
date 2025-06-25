import { Request, Response, NextFunction } from 'express';
import { CreateApartmentRequest, UpdateApartmentRequest, CreateVillageRequest, UpdateVillageRequest, CreateUserRequest, UpdateUserRequest, LoginRequest, RegisterRequest, RefreshTokenRequest, CreateBookingRequest, UpdateBookingRequest, CreateServiceTypeRequest, UpdateServiceTypeRequest, CreateServiceRequestRequest, UpdateServiceRequestRequest } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationMiddleware {
  
  static validateCreateApartment(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as CreateApartmentRequest;

    // Required fields validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Apartment name is required and must be a non-empty string' });
    }

    if (!data.village_id || typeof data.village_id !== 'number' || data.village_id <= 0) {
      errors.push({ field: 'village_id', message: 'Village ID is required and must be a positive number' });
    }

    if (!data.phase || typeof data.phase !== 'number' || data.phase <= 0) {
      errors.push({ field: 'phase', message: 'Phase is required and must be a positive number' });
    }

    if (!data.owner_id || typeof data.owner_id !== 'number' || data.owner_id <= 0) {
      errors.push({ field: 'owner_id', message: 'Owner ID is required and must be a positive number' });
    }

    if (!data.paying_status || !['transfer', 'rent', 'non-payer'].includes(data.paying_status)) {
      errors.push({ field: 'paying_status', message: 'Paying status must be one of: transfer, rent, non-payer' });
    }

    // Optional fields validation
    if (data.purchase_date && !ValidationMiddleware.isValidDate(data.purchase_date)) {
      errors.push({ field: 'purchase_date', message: 'Purchase date must be a valid date in YYYY-MM-DD format' });
    }

    // Name length validation
    if (data.name && data.name.length > 100) {
      errors.push({ field: 'name', message: 'Apartment name must be less than 100 characters' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateUpdateApartment(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as UpdateApartmentRequest;

    // Check if at least one field is provided for update
    const providedFields = Object.keys(data).filter(key => data[key as keyof UpdateApartmentRequest] !== undefined);
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Apartment name must be a non-empty string' });
      } else if (data.name.length > 100) {
        errors.push({ field: 'name', message: 'Apartment name must be less than 100 characters' });
      }
    }

    if (data.village_id !== undefined) {
      if (typeof data.village_id !== 'number' || data.village_id <= 0) {
        errors.push({ field: 'village_id', message: 'Village ID must be a positive number' });
      }
    }

    if (data.phase !== undefined) {
      if (typeof data.phase !== 'number' || data.phase <= 0) {
        errors.push({ field: 'phase', message: 'Phase must be a positive number' });
      }
    }

    if (data.owner_id !== undefined) {
      if (typeof data.owner_id !== 'number' || data.owner_id <= 0) {
        errors.push({ field: 'owner_id', message: 'Owner ID must be a positive number' });
      }
    }

    if (data.paying_status !== undefined) {
      if (!['transfer', 'rent', 'non-payer'].includes(data.paying_status)) {
        errors.push({ field: 'paying_status', message: 'Paying status must be one of: transfer, rent, non-payer' });
      }
    }

    if (data.purchase_date !== undefined && data.purchase_date !== null) {
      if (!ValidationMiddleware.isValidDate(data.purchase_date)) {
        errors.push({ field: 'purchase_date', message: 'Purchase date must be a valid date in YYYY-MM-DD format' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateQueryParams(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const query = req.query;

    // Validate page
    if (query.page && (!ValidationMiddleware.isPositiveInteger(query.page as string))) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    }

    // Validate limit
    if (query.limit) {
      const limit = parseInt(query.limit as string);
      if (!ValidationMiddleware.isPositiveInteger(query.limit as string) || limit > 100) {
        errors.push({ field: 'limit', message: 'Limit must be a positive integer not greater than 100' });
      }
    }

    // Validate village_id
    if (query.village_id && !ValidationMiddleware.isPositiveInteger(query.village_id as string)) {
      errors.push({ field: 'village_id', message: 'Village ID must be a positive integer' });
    }

    // Validate phase
    if (query.phase && !ValidationMiddleware.isPositiveInteger(query.phase as string)) {
      errors.push({ field: 'phase', message: 'Phase must be a positive integer' });
    }

    // Validate paying_status
    if (query.paying_status && !['transfer', 'rent', 'non-payer'].includes(query.paying_status as string)) {
      errors.push({ field: 'paying_status', message: 'Paying status must be one of: transfer, rent, non-payer' });
    }

    // Validate status
    if (query.status && !['Available', 'Occupied by Owner', 'Occupied By Renter'].includes(query.status as string)) {
      errors.push({ field: 'status', message: 'Status must be one of: Available, Occupied by Owner, Occupied By Renter' });
    }

    // Validate sort_order
    if (query.sort_order && !['asc', 'desc'].includes(query.sort_order as string)) {
      errors.push({ field: 'sort_order', message: 'Sort order must be either asc or desc' });
    }

    // Validate sort_by
    const validSortFields = ['name', 'phase', 'purchase_date', 'paying_status', 'owner_name', 'village_name', 'created_at'];
    if (query.sort_by && !validSortFields.includes(query.sort_by as string)) {
      errors.push({ field: 'sort_by', message: `Sort by must be one of: ${validSortFields.join(', ')}` });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: errors
      });
    }

    next();
  }

  static validateIdParam(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id;
    
    if (!id || !ValidationMiddleware.isPositiveInteger(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'ID must be a positive integer'
      });
    }

    // Convert to number and attach to request
    req.params.id = id;
    next();
  }

  static validateCreateVillage(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as CreateVillageRequest;

    // Required fields validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Village name is required and must be a non-empty string' });
    }

    if (data.electricity_price === undefined || typeof data.electricity_price !== 'number' || data.electricity_price < 0) {
      errors.push({ field: 'electricity_price', message: 'Electricity price is required and must be a non-negative number' });
    }

    if (data.water_price === undefined || typeof data.water_price !== 'number' || data.water_price < 0) {
      errors.push({ field: 'water_price', message: 'Water price is required and must be a non-negative number' });
    }

    if (!data.phases || typeof data.phases !== 'number' || data.phases < 1 || !Number.isInteger(data.phases)) {
      errors.push({ field: 'phases', message: 'Phases is required and must be a positive integer' });
    }

    // Name length validation
    if (data.name && data.name.length > 100) {
      errors.push({ field: 'name', message: 'Village name must be less than 100 characters' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateUpdateVillage(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as UpdateVillageRequest;

    // Check if at least one field is provided for update
    const providedFields = Object.keys(data).filter(key => data[key as keyof UpdateVillageRequest] !== undefined);
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Village name must be a non-empty string' });
      } else if (data.name.length > 100) {
        errors.push({ field: 'name', message: 'Village name must be less than 100 characters' });
      }
    }

    if (data.electricity_price !== undefined) {
      if (typeof data.electricity_price !== 'number' || data.electricity_price < 0) {
        errors.push({ field: 'electricity_price', message: 'Electricity price must be a non-negative number' });
      }
    }

    if (data.water_price !== undefined) {
      if (typeof data.water_price !== 'number' || data.water_price < 0) {
        errors.push({ field: 'water_price', message: 'Water price must be a non-negative number' });
      }
    }

    if (data.phases !== undefined) {
      if (typeof data.phases !== 'number' || data.phases < 1 || !Number.isInteger(data.phases)) {
        errors.push({ field: 'phases', message: 'Phases must be a positive integer' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateCreateUser(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as CreateUserRequest;

    // Required fields validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'User name is required and must be a non-empty string' });
    }

    if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
      errors.push({ field: 'email', message: 'Email is required and must be a non-empty string' });
    }

    if (!data.role || !['super_admin', 'admin', 'owner', 'renter'].includes(data.role)) {
      errors.push({ field: 'role', message: 'Role must be one of: super_admin, admin, owner, renter' });
    }

    // Optional fields validation
    if (data.phone_number !== undefined && data.phone_number !== null) {
      if (typeof data.phone_number !== 'string') {
        errors.push({ field: 'phone_number', message: 'Phone number must be a string' });
      } else if (data.phone_number.length > 20) {
        errors.push({ field: 'phone_number', message: 'Phone number must be less than 20 characters' });
      }
    }

    // Responsible village validation (optional field)
    if (data.responsible_village !== undefined && data.responsible_village !== null) {
      if (typeof data.responsible_village !== 'number' || data.responsible_village <= 0) {
        errors.push({ field: 'responsible_village', message: 'Responsible village ID must be a positive number' });
      }
    }

    // Name length validation
    if (data.name && data.name.length > 100) {
      errors.push({ field: 'name', message: 'User name must be less than 100 characters' });
    }

    // Email format validation (basic)
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Email must be in valid format' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateUpdateUser(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as UpdateUserRequest;

    // Check if at least one field is provided for update
    const providedFields = Object.keys(data).filter(key => data[key as keyof UpdateUserRequest] !== undefined);
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'User name must be a non-empty string' });
      } else if (data.name.length > 100) {
        errors.push({ field: 'name', message: 'User name must be less than 100 characters' });
      }
    }

    if (data.email !== undefined) {
      if (typeof data.email !== 'string' || data.email.trim().length === 0) {
        errors.push({ field: 'email', message: 'Email must be a non-empty string' });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          errors.push({ field: 'email', message: 'Email must be in valid format' });
        }
      }
    }

    if (data.role !== undefined) {
      if (!['super_admin', 'admin', 'owner', 'renter'].includes(data.role)) {
        errors.push({ field: 'role', message: 'Role must be one of: super_admin, admin, owner, renter' });
      }
    }

    if (data.phone_number !== undefined && data.phone_number !== null) {
      if (typeof data.phone_number !== 'string') {
        errors.push({ field: 'phone_number', message: 'Phone number must be a string' });
      } else if (data.phone_number.length > 20) {
        errors.push({ field: 'phone_number', message: 'Phone number must be less than 20 characters' });
      }
    }

    // Responsible village validation (optional field)
    if (data.responsible_village !== undefined && data.responsible_village !== null) {
      if (typeof data.responsible_village !== 'number' || data.responsible_village <= 0) {
        errors.push({ field: 'responsible_village', message: 'Responsible village ID must be a positive number' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateUserQueryParams(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const query = req.query;

    // Validate page
    if (query.page && (!ValidationMiddleware.isPositiveInteger(query.page as string))) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    }

    // Validate limit
    if (query.limit) {
      const limit = parseInt(query.limit as string);
      if (!ValidationMiddleware.isPositiveInteger(query.limit as string) || limit > 100) {
        errors.push({ field: 'limit', message: 'Limit must be a positive integer not greater than 100' });
      }
    }

    // Validate role
    if (query.role && !['super_admin', 'admin', 'owner', 'renter'].includes(query.role as string)) {
      errors.push({ field: 'role', message: 'Role must be one of: super_admin, admin, owner, renter' });
    }

    // Validate sort_order
    if (query.sort_order && !['asc', 'desc'].includes(query.sort_order as string)) {
      errors.push({ field: 'sort_order', message: 'Sort order must be either asc or desc' });
    }

    // Validate sort_by
    const validSortFields = ['name', 'email', 'role', 'created_at'];
    if (query.sort_by && !validSortFields.includes(query.sort_by as string)) {
      errors.push({ field: 'sort_by', message: `Sort by must be one of: ${validSortFields.join(', ')}` });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: errors
      });
    }

    next();
  }

  static validateLogin(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as LoginRequest;

    // Required fields validation
    if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
      errors.push({ field: 'email', message: 'Email is required and must be a non-empty string' });
    }

    if (!data.password || typeof data.password !== 'string' || data.password.length === 0) {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    // Email format validation
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Email must be in valid format' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateRegister(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as RegisterRequest;

    // Required fields validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
    }

    if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
      errors.push({ field: 'email', message: 'Email is required and must be a non-empty string' });
    }

    if (!data.password || typeof data.password !== 'string' || data.password.length === 0) {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (!data.role || !['owner', 'renter'].includes(data.role)) {
      errors.push({ field: 'role', message: 'Role must be either owner or renter' });
    }

    // Optional fields validation
    if (data.phone_number !== undefined && data.phone_number !== null) {
      if (typeof data.phone_number !== 'string') {
        errors.push({ field: 'phone_number', message: 'Phone number must be a string' });
      } else if (data.phone_number.length > 20) {
        errors.push({ field: 'phone_number', message: 'Phone number must be less than 20 characters' });
      }
    }

    // Name length validation
    if (data.name && data.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must be less than 100 characters' });
    }

    // Email format validation
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Email must be in valid format' });
      }
    }

    // Password strength validation
    if (data.password) {
      if (data.password.length < 8) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
      }

      if (!/(?=.*[a-z])/.test(data.password)) {
        errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
      }

      if (!/(?=.*[A-Z])/.test(data.password)) {
        errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
      }

      if (!/(?=.*\d)/.test(data.password)) {
        errors.push({ field: 'password', message: 'Password must contain at least one number' });
      }

      if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(data.password)) {
        errors.push({ field: 'password', message: 'Password must contain at least one special character' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateRefreshToken(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as RefreshTokenRequest;

    if (!data.refresh_token || typeof data.refresh_token !== 'string' || data.refresh_token.trim().length === 0) {
      errors.push({ field: 'refresh_token', message: 'Refresh token is required and must be a non-empty string' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateChangePassword(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const { current_password, new_password } = req.body;

    if (!current_password || typeof current_password !== 'string' || current_password.length === 0) {
      errors.push({ field: 'current_password', message: 'Current password is required' });
    }

    if (!new_password || typeof new_password !== 'string' || new_password.length === 0) {
      errors.push({ field: 'new_password', message: 'New password is required' });
    }

    // New password strength validation
    if (new_password) {
      if (new_password.length < 8) {
        errors.push({ field: 'new_password', message: 'New password must be at least 8 characters long' });
      }

      if (!/(?=.*[a-z])/.test(new_password)) {
        errors.push({ field: 'new_password', message: 'New password must contain at least one lowercase letter' });
      }

      if (!/(?=.*[A-Z])/.test(new_password)) {
        errors.push({ field: 'new_password', message: 'New password must contain at least one uppercase letter' });
      }

      if (!/(?=.*\d)/.test(new_password)) {
        errors.push({ field: 'new_password', message: 'New password must contain at least one number' });
      }

      if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(new_password)) {
        errors.push({ field: 'new_password', message: 'New password must contain at least one special character' });
      }
    }

    // Check if new password is different from current
    if (current_password && new_password && current_password === new_password) {
      errors.push({ field: 'new_password', message: 'New password must be different from current password' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateCreateBooking(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as CreateBookingRequest;

    // Required fields validation
    if (!data.apartment_id || typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID is required and must be a positive number' });
    }

    // Validate that either user_id or user_name is provided
    if (!data.user_id && !data.user_name) {
      errors.push({ field: 'user', message: 'Either user_id or user_name must be provided' });
    } else {
      // If user_id is provided, validate it
      if (data.user_id !== undefined) {
        if (typeof data.user_id !== 'number' || data.user_id <= 0) {
          errors.push({ field: 'user_id', message: 'User ID must be a positive number' });
        }
      }
      
      // If user_name is provided, validate it
      if (data.user_name !== undefined) {
        if (typeof data.user_name !== 'string' || data.user_name.trim().length === 0) {
          errors.push({ field: 'user_name', message: 'User name must be a non-empty string' });
        } else if (data.user_name.length > 100) {
          errors.push({ field: 'user_name', message: 'User name must be less than 100 characters' });
        }
      }
    }

    // User type is now optional - will be auto-determined from user role
    if (data.user_type && !['owner', 'renter'].includes(data.user_type)) {
      errors.push({ field: 'user_type', message: 'User type must be either owner or renter (optional - will be auto-determined if not provided)' });
    }

    // Validate that user_name cannot be used for owner type
    if (data.user_name && data.user_type === 'owner') {
      errors.push({ field: 'user_type', message: 'Cannot create booking with non-existing user for owner type. Owners must be existing users.' });
    }

    if (!data.arrival_date || typeof data.arrival_date !== 'string') {
      errors.push({ field: 'arrival_date', message: 'Arrival date is required and must be a valid ISO string' });
    } else if (!ValidationMiddleware.isValidDatetime(data.arrival_date)) {
      errors.push({ field: 'arrival_date', message: 'Arrival date must be in valid ISO datetime format' });
    }

    if (!data.leaving_date || typeof data.leaving_date !== 'string') {
      errors.push({ field: 'leaving_date', message: 'Leaving date is required and must be a valid ISO string' });
    } else if (!ValidationMiddleware.isValidDatetime(data.leaving_date)) {
      errors.push({ field: 'leaving_date', message: 'Leaving date must be in valid ISO datetime format' });
    }

    // Validate dates relationship
    if (data.arrival_date && data.leaving_date && 
        ValidationMiddleware.isValidDatetime(data.arrival_date) && 
        ValidationMiddleware.isValidDatetime(data.leaving_date)) {
      const arrivalDate = new Date(data.arrival_date);
      const leavingDate = new Date(data.leaving_date);
      
      if (arrivalDate >= leavingDate) {
        errors.push({ field: 'leaving_date', message: 'Leaving date must be after arrival date' });
      }
    }

    // Optional fields validation
    if (data.status && !['not_arrived', 'in_village', 'left'].includes(data.status)) {
      errors.push({ field: 'status', message: 'Status must be one of: not_arrived, in_village, left' });
    }

    if (data.notes && typeof data.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string' });
    }

    if (data.notes && data.notes.length > 1000) {
      errors.push({ field: 'notes', message: 'Notes must be less than 1000 characters' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateUpdateBooking(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as UpdateBookingRequest;

    // Check if at least one field is provided for update
    const providedFields = Object.keys(data).filter(key => data[key as keyof UpdateBookingRequest] !== undefined);
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.apartment_id !== undefined) {
      if (typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
        errors.push({ field: 'apartment_id', message: 'Apartment ID must be a positive number' });
      }
    }

    if (data.user_id !== undefined) {
      if (typeof data.user_id !== 'number' || data.user_id <= 0) {
        errors.push({ field: 'user_id', message: 'User ID must be a positive number' });
      }
    }

    if (data.user_type !== undefined) {
      if (!['owner', 'renter'].includes(data.user_type)) {
        errors.push({ field: 'user_type', message: 'User type must be either owner or renter' });
      }
    }

    if (data.arrival_date !== undefined) {
      if (typeof data.arrival_date !== 'string' || !ValidationMiddleware.isValidDatetime(data.arrival_date)) {
        errors.push({ field: 'arrival_date', message: 'Arrival date must be in valid ISO datetime format' });
      }
    }

    if (data.leaving_date !== undefined) {
      if (typeof data.leaving_date !== 'string' || !ValidationMiddleware.isValidDatetime(data.leaving_date)) {
        errors.push({ field: 'leaving_date', message: 'Leaving date must be in valid ISO datetime format' });
      }
    }

    if (data.status !== undefined) {
      if (!['not_arrived', 'in_village', 'left'].includes(data.status)) {
        errors.push({ field: 'status', message: 'Status must be one of: not_arrived, in_village, left' });
      }
    }

    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push({ field: 'notes', message: 'Notes must be a string' });
      } else if (data.notes.length > 1000) {
        errors.push({ field: 'notes', message: 'Notes must be less than 1000 characters' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  static validateBookingQueryParams(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const query = req.query;

    // Validate page
    if (query.page && (!ValidationMiddleware.isPositiveInteger(query.page as string))) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    }

    // Validate limit
    if (query.limit) {
      const limit = parseInt(query.limit as string);
      if (!ValidationMiddleware.isPositiveInteger(query.limit as string) || limit > 100) {
        errors.push({ field: 'limit', message: 'Limit must be a positive integer not greater than 100' });
      }
    }

    // Validate apartment_id
    if (query.apartment_id && !ValidationMiddleware.isPositiveInteger(query.apartment_id as string)) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID must be a positive integer' });
    }

    // Validate user_id
    if (query.user_id && !ValidationMiddleware.isPositiveInteger(query.user_id as string)) {
      errors.push({ field: 'user_id', message: 'User ID must be a positive integer' });
    }

    // Validate village_id
    if (query.village_id && !ValidationMiddleware.isPositiveInteger(query.village_id as string)) {
      errors.push({ field: 'village_id', message: 'Village ID must be a positive integer' });
    }

    // Validate user_type
    if (query.user_type && !['owner', 'renter'].includes(query.user_type as string)) {
      errors.push({ field: 'user_type', message: 'User type must be either owner or renter' });
    }

    // Validate status
    if (query.status && !['not_arrived', 'in_village', 'left'].includes(query.status as string)) {
      errors.push({ field: 'status', message: 'Status must be one of: not_arrived, in_village, left' });
    }

    // Validate date filters
    if (query.arrival_date_start && !ValidationMiddleware.isValidDatetime(query.arrival_date_start as string)) {
      errors.push({ field: 'arrival_date_start', message: 'Arrival date start must be in valid ISO datetime format' });
    }

    if (query.arrival_date_end && !ValidationMiddleware.isValidDatetime(query.arrival_date_end as string)) {
      errors.push({ field: 'arrival_date_end', message: 'Arrival date end must be in valid ISO datetime format' });
    }

    if (query.leaving_date_start && !ValidationMiddleware.isValidDatetime(query.leaving_date_start as string)) {
      errors.push({ field: 'leaving_date_start', message: 'Leaving date start must be in valid ISO datetime format' });
    }

    if (query.leaving_date_end && !ValidationMiddleware.isValidDatetime(query.leaving_date_end as string)) {
      errors.push({ field: 'leaving_date_end', message: 'Leaving date end must be in valid ISO datetime format' });
    }

    // Validate sort_order
    if (query.sort_order && !['asc', 'desc'].includes(query.sort_order as string)) {
      errors.push({ field: 'sort_order', message: 'Sort order must be either asc or desc' });
    }

    // Validate sort_by
    const validSortFields = ['arrival_date', 'leaving_date', 'status', 'user_type', 'created_at', 'apartment_name', 'user_name'];
    if (query.sort_by && !validSortFields.includes(query.sort_by as string)) {
      errors.push({ field: 'sort_by', message: `Sort by must be one of: ${validSortFields.join(', ')}` });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: errors
      });
    }

    next();
  }

  /**
   * Validate service type creation request
   */
  static validateCreateServiceType(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as CreateServiceTypeRequest;

    // Required fields validation
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push({ field: 'name', message: 'Service type name is required and must be a non-empty string' });
    } else if (data.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Service type name must not exceed 100 characters' });
    }

    if (!data.cost || typeof data.cost !== 'number' || data.cost <= 0) {
      errors.push({ field: 'cost', message: 'Cost is required and must be a positive number' });
    } else if (data.cost > 999999.99) {
      errors.push({ field: 'cost', message: 'Cost must not exceed 999,999.99' });
    }

    if (!data.currency || !['EGP', 'GBP'].includes(data.currency)) {
      errors.push({ field: 'currency', message: 'Currency is required and must be either EGP or GBP' });
    }

    // Optional fields validation
    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string' });
      } else if (data.description.length > 1000) {
        errors.push({ field: 'description', message: 'Description must not exceed 1000 characters' });
      }
    }

    if (data.default_assignee_id !== undefined) {
      if (typeof data.default_assignee_id !== 'number' || data.default_assignee_id <= 0) {
        errors.push({ field: 'default_assignee_id', message: 'Default assignee ID must be a positive number' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  }

  /**
   * Validate service type update request
   */
  static validateUpdateServiceType(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as UpdateServiceTypeRequest;

    // At least one field should be provided for update
    const hasValidField = data.name !== undefined || 
                         data.cost !== undefined || 
                         data.currency !== undefined || 
                         data.description !== undefined || 
                         data.default_assignee_id !== undefined;

    if (!hasValidField) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        errors.push({ field: 'name', message: 'Service type name must be a non-empty string' });
      } else if (data.name.trim().length > 100) {
        errors.push({ field: 'name', message: 'Service type name must not exceed 100 characters' });
      }
    }

    if (data.cost !== undefined) {
      if (typeof data.cost !== 'number' || data.cost <= 0) {
        errors.push({ field: 'cost', message: 'Cost must be a positive number' });
      } else if (data.cost > 999999.99) {
        errors.push({ field: 'cost', message: 'Cost must not exceed 999,999.99' });
      }
    }

    if (data.currency !== undefined && !['EGP', 'GBP'].includes(data.currency)) {
      errors.push({ field: 'currency', message: 'Currency must be either EGP or GBP' });
    }

    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string' });
      } else if (data.description.length > 1000) {
        errors.push({ field: 'description', message: 'Description must not exceed 1000 characters' });
      }
    }

    if (data.default_assignee_id !== undefined && data.default_assignee_id !== null) {
      if (typeof data.default_assignee_id !== 'number' || data.default_assignee_id <= 0) {
        errors.push({ field: 'default_assignee_id', message: 'Default assignee ID must be a positive number' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  }

  /**
   * Validate service request creation request
   */
  static validateCreateServiceRequest(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as CreateServiceRequestRequest;

    // Required fields validation
    if (!data.type_id || typeof data.type_id !== 'number' || data.type_id <= 0) {
      errors.push({ field: 'type_id', message: 'Service type ID is required and must be a positive number' });
    }

    if (!data.apartment_id || typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID is required and must be a positive number' });
    }

    if (!data.requester_id || typeof data.requester_id !== 'number' || data.requester_id <= 0) {
      errors.push({ field: 'requester_id', message: 'Requester ID is required and must be a positive number' });
    }

    if (!data.who_pays || !['owner', 'renter', 'company'].includes(data.who_pays)) {
      errors.push({ field: 'who_pays', message: 'Who pays is required and must be owner, renter, or company' });
    }

    // Optional fields validation
    if (data.booking_id !== undefined && data.booking_id !== null) {
      if (typeof data.booking_id !== 'number' || data.booking_id <= 0) {
        errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number' });
      }
    }

    if (data.date_action !== undefined && data.date_action !== null) {
      if (typeof data.date_action !== 'string') {
        errors.push({ field: 'date_action', message: 'Date action must be a valid ISO date string' });
      } else {
        const dateAction = new Date(data.date_action);
        if (isNaN(dateAction.getTime())) {
          errors.push({ field: 'date_action', message: 'Date action must be a valid ISO date string' });
        }
      }
    }

    if (data.status !== undefined) {
      if (typeof data.status !== 'string' || !data.status.trim()) {
        errors.push({ field: 'status', message: 'Status must be a non-empty string' });
      } else if (data.status.length > 50) {
        errors.push({ field: 'status', message: 'Status must not exceed 50 characters' });
      }
    }

    if (data.notes !== undefined) {
      if (typeof data.notes !== 'string') {
        errors.push({ field: 'notes', message: 'Notes must be a string' });
      } else if (data.notes.length > 2000) {
        errors.push({ field: 'notes', message: 'Notes must not exceed 2000 characters' });
      }
    }

    if (data.assignee_id !== undefined && data.assignee_id !== null) {
      if (typeof data.assignee_id !== 'number' || data.assignee_id <= 0) {
        errors.push({ field: 'assignee_id', message: 'Assignee ID must be a positive number' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  }

  /**
   * Validate service request update request
   */
  static validateUpdateServiceRequest(req: Request, res: Response, next: NextFunction) {
    const errors: ValidationError[] = [];
    const data = req.body as UpdateServiceRequestRequest;

    // At least one field should be provided for update
    const hasValidField = data.type_id !== undefined || 
                         data.apartment_id !== undefined || 
                         data.booking_id !== undefined || 
                         data.requester_id !== undefined || 
                         data.date_action !== undefined || 
                         data.status !== undefined || 
                         data.who_pays !== undefined || 
                         data.notes !== undefined || 
                         data.assignee_id !== undefined;

    if (!hasValidField) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.type_id !== undefined) {
      if (typeof data.type_id !== 'number' || data.type_id <= 0) {
        errors.push({ field: 'type_id', message: 'Service type ID must be a positive number' });
      }
    }

    if (data.apartment_id !== undefined) {
      if (typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
        errors.push({ field: 'apartment_id', message: 'Apartment ID must be a positive number' });
      }
    }

    if (data.requester_id !== undefined) {
      if (typeof data.requester_id !== 'number' || data.requester_id <= 0) {
        errors.push({ field: 'requester_id', message: 'Requester ID must be a positive number' });
      }
    }

    if (data.who_pays !== undefined && !['owner', 'renter', 'company'].includes(data.who_pays)) {
      errors.push({ field: 'who_pays', message: 'Who pays must be owner, renter, or company' });
    }

    if (data.booking_id !== undefined && data.booking_id !== null) {
      if (typeof data.booking_id !== 'number' || data.booking_id <= 0) {
        errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number' });
      }
    }

    if (data.date_action !== undefined && data.date_action !== null && data.date_action !== '') {
      if (typeof data.date_action !== 'string') {
        errors.push({ field: 'date_action', message: 'Date action must be a valid ISO date string' });
      } else {
        const dateAction = new Date(data.date_action);
        if (isNaN(dateAction.getTime())) {
          errors.push({ field: 'date_action', message: 'Date action must be a valid ISO date string' });
        }
      }
    }

    if (data.status !== undefined) {
      if (typeof data.status !== 'string' || !data.status.trim()) {
        errors.push({ field: 'status', message: 'Status must be a non-empty string' });
      } else if (data.status.length > 50) {
        errors.push({ field: 'status', message: 'Status must not exceed 50 characters' });
      }
    }

    if (data.notes !== undefined) {
      if (typeof data.notes !== 'string') {
        errors.push({ field: 'notes', message: 'Notes must be a string' });
      } else if (data.notes.length > 2000) {
        errors.push({ field: 'notes', message: 'Notes must not exceed 2000 characters' });
      }
    }

    if (data.assignee_id !== undefined && data.assignee_id !== null) {
      if (typeof data.assignee_id !== 'number' || data.assignee_id <= 0) {
        errors.push({ field: 'assignee_id', message: 'Assignee ID must be a positive number' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  }

  /**
   * Validate create utility reading request body
   */
  static validateCreateUtilityReading(req: Request, res: Response, next: NextFunction): void {
    const data = req.body;
    const errors: ValidationError[] = [];

    // Required fields
    if (!data.apartment_id || typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID is required and must be a positive number' });
    }

    if (!data.start_date || typeof data.start_date !== 'string' || !data.start_date.trim()) {
      errors.push({ field: 'start_date', message: 'Start date is required and must be a non-empty string' });
    } else {
      const date = new Date(data.start_date);
      if (isNaN(date.getTime())) {
        errors.push({ field: 'start_date', message: 'Start date must be a valid date' });
      }
    }

    if (!data.end_date || typeof data.end_date !== 'string' || !data.end_date.trim()) {
      errors.push({ field: 'end_date', message: 'End date is required and must be a non-empty string' });
    } else {
      const date = new Date(data.end_date);
      if (isNaN(date.getTime())) {
        errors.push({ field: 'end_date', message: 'End date must be a valid date' });
      }
    }

    // Check date order if both are valid
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
        errors.push({ field: 'end_date', message: 'End date must be after start date' });
      }
    }

    if (!data.who_pays || !['owner', 'renter', 'company'].includes(data.who_pays)) {
      errors.push({ field: 'who_pays', message: 'Who pays is required and must be owner, renter, or company' });
    }

    // Optional fields
    if (data.booking_id !== undefined && (typeof data.booking_id !== 'number' || data.booking_id <= 0)) {
      errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number' });
    }

    if (data.water_start_reading !== undefined && (typeof data.water_start_reading !== 'number' || data.water_start_reading < 0)) {
      errors.push({ field: 'water_start_reading', message: 'Water start reading must be a non-negative number' });
    }

    if (data.water_end_reading !== undefined && (typeof data.water_end_reading !== 'number' || data.water_end_reading < 0)) {
      errors.push({ field: 'water_end_reading', message: 'Water end reading must be a non-negative number' });
    }

    if (data.electricity_start_reading !== undefined && (typeof data.electricity_start_reading !== 'number' || data.electricity_start_reading < 0)) {
      errors.push({ field: 'electricity_start_reading', message: 'Electricity start reading must be a non-negative number' });
    }

    if (data.electricity_end_reading !== undefined && (typeof data.electricity_end_reading !== 'number' || data.electricity_end_reading < 0)) {
      errors.push({ field: 'electricity_end_reading', message: 'Electricity end reading must be a non-negative number' });
    }

    // Check reading relationships
    if (data.water_start_reading !== undefined && data.water_end_reading !== undefined) {
      if (data.water_end_reading < data.water_start_reading) {
        errors.push({ field: 'water_end_reading', message: 'Water end reading must be greater than or equal to start reading' });
      }
    }

    if (data.electricity_start_reading !== undefined && data.electricity_end_reading !== undefined) {
      if (data.electricity_end_reading < data.electricity_start_reading) {
        errors.push({ field: 'electricity_end_reading', message: 'Electricity end reading must be greater than or equal to start reading' });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  }

  /**
   * Validate update utility reading request body
   */
  static validateUpdateUtilityReading(req: Request, res: Response, next: NextFunction): void {
    const data = req.body;
    const errors: ValidationError[] = [];

    // Check if at least one field is provided
    const allowedFields = ['apartment_id', 'booking_id', 'water_start_reading', 'water_end_reading', 'electricity_start_reading', 'electricity_end_reading', 'start_date', 'end_date', 'who_pays'];
    const providedFields = Object.keys(data).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.apartment_id !== undefined && (typeof data.apartment_id !== 'number' || data.apartment_id <= 0)) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID must be a positive number' });
    }

    if (data.booking_id !== undefined && data.booking_id !== null && (typeof data.booking_id !== 'number' || data.booking_id <= 0)) {
      errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number or null' });
    }

    if (data.start_date !== undefined) {
      if (typeof data.start_date !== 'string' || !data.start_date.trim()) {
        errors.push({ field: 'start_date', message: 'Start date must be a non-empty string' });
      } else {
        const date = new Date(data.start_date);
        if (isNaN(date.getTime())) {
          errors.push({ field: 'start_date', message: 'Start date must be a valid date' });
        }
      }
    }

    if (data.end_date !== undefined) {
      if (typeof data.end_date !== 'string' || !data.end_date.trim()) {
        errors.push({ field: 'end_date', message: 'End date must be a non-empty string' });
      } else {
        const date = new Date(data.end_date);
        if (isNaN(date.getTime())) {
          errors.push({ field: 'end_date', message: 'End date must be a valid date' });
        }
      }
    }

    if (data.who_pays !== undefined && !['owner', 'renter', 'company'].includes(data.who_pays)) {
      errors.push({ field: 'who_pays', message: 'Who pays must be owner, renter, or company' });
    }

    if (data.water_start_reading !== undefined && (typeof data.water_start_reading !== 'number' || data.water_start_reading < 0)) {
      errors.push({ field: 'water_start_reading', message: 'Water start reading must be a non-negative number' });
    }

    if (data.water_end_reading !== undefined && (typeof data.water_end_reading !== 'number' || data.water_end_reading < 0)) {
      errors.push({ field: 'water_end_reading', message: 'Water end reading must be a non-negative number' });
    }

    if (data.electricity_start_reading !== undefined && (typeof data.electricity_start_reading !== 'number' || data.electricity_start_reading < 0)) {
      errors.push({ field: 'electricity_start_reading', message: 'Electricity start reading must be a non-negative number' });
    }

    if (data.electricity_end_reading !== undefined && (typeof data.electricity_end_reading !== 'number' || data.electricity_end_reading < 0)) {
      errors.push({ field: 'electricity_end_reading', message: 'Electricity end reading must be a non-negative number' });
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  }

  /**
   * Validate create email request body
   */
  static validateCreateEmail(req: Request, res: Response, next: NextFunction): void {
    const data = req.body;
    const errors: ValidationError[] = [];

    // Required fields
    if (!data.apartment_id || typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID is required and must be a positive number' });
    }

    if (!data.date || typeof data.date !== 'string' || !data.date.trim()) {
      errors.push({ field: 'date', message: 'Date is required and must be a non-empty string' });
    } else {
      const date = new Date(data.date);
      if (isNaN(date.getTime())) {
        errors.push({ field: 'date', message: 'Date must be a valid date' });
      }
    }

    if (!data.from || typeof data.from !== 'string' || data.from.trim().length === 0) {
      errors.push({ field: 'from', message: 'From email is required and must be a non-empty string' });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.from)) {
        errors.push({ field: 'from', message: 'From must be a valid email address' });
      }
    }

    if (!data.to || typeof data.to !== 'string' || data.to.trim().length === 0) {
      errors.push({ field: 'to', message: 'To email is required and must be a non-empty string' });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.to)) {
        errors.push({ field: 'to', message: 'To must be a valid email address' });
      }
    }

    if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
      errors.push({ field: 'subject', message: 'Subject is required and must be a non-empty string' });
    } else if (data.subject.length > 255) {
      errors.push({ field: 'subject', message: 'Subject must not exceed 255 characters' });
    }

    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
      errors.push({ field: 'content', message: 'Content is required and must be a non-empty string' });
    } else if (data.content.length > 10000) {
      errors.push({ field: 'content', message: 'Content must not exceed 10,000 characters' });
    }

    if (!data.type || !['complaint', 'inquiry', 'other'].includes(data.type)) {
      errors.push({ field: 'type', message: 'Type is required and must be complaint, inquiry, or other' });
    }

    // Optional fields
    if (data.booking_id !== undefined && (typeof data.booking_id !== 'number' || data.booking_id <= 0)) {
      errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number' });
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  }

  /**
   * Validate update email request body
   */
  static validateUpdateEmail(req: Request, res: Response, next: NextFunction): void {
    const data = req.body;
    const errors: ValidationError[] = [];

    // Check if at least one field is provided
    const allowedFields = ['apartment_id', 'booking_id', 'date', 'from', 'to', 'subject', 'content', 'type'];
    const providedFields = Object.keys(data).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.apartment_id !== undefined && (typeof data.apartment_id !== 'number' || data.apartment_id <= 0)) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID must be a positive number' });
    }

    if (data.booking_id !== undefined && data.booking_id !== null && (typeof data.booking_id !== 'number' || data.booking_id <= 0)) {
      errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number or null' });
    }

    if (data.date !== undefined) {
      if (typeof data.date !== 'string' || !data.date.trim()) {
        errors.push({ field: 'date', message: 'Date must be a non-empty string' });
      } else {
        const date = new Date(data.date);
        if (isNaN(date.getTime())) {
          errors.push({ field: 'date', message: 'Date must be a valid date' });
        }
      }
    }

    if (data.from !== undefined) {
      if (typeof data.from !== 'string' || data.from.trim().length === 0) {
        errors.push({ field: 'from', message: 'From email must be a non-empty string' });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.from)) {
          errors.push({ field: 'from', message: 'From must be a valid email address' });
        }
      }
    }

    if (data.to !== undefined) {
      if (typeof data.to !== 'string' || data.to.trim().length === 0) {
        errors.push({ field: 'to', message: 'To email must be a non-empty string' });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.to)) {
          errors.push({ field: 'to', message: 'To must be a valid email address' });
        }
      }
    }

    if (data.subject !== undefined) {
      if (typeof data.subject !== 'string' || data.subject.trim().length === 0) {
        errors.push({ field: 'subject', message: 'Subject must be a non-empty string' });
      } else if (data.subject.length > 255) {
        errors.push({ field: 'subject', message: 'Subject must not exceed 255 characters' });
      }
    }

    if (data.content !== undefined) {
      if (typeof data.content !== 'string' || data.content.trim().length === 0) {
        errors.push({ field: 'content', message: 'Content must be a non-empty string' });
      } else if (data.content.length > 10000) {
        errors.push({ field: 'content', message: 'Content must not exceed 10,000 characters' });
      }
    }

    if (data.type !== undefined && !['complaint', 'inquiry', 'other'].includes(data.type)) {
      errors.push({ field: 'type', message: 'Type must be complaint, inquiry, or other' });
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  }

  /**
   * Validate create payment method request body
   */
  static validateCreatePaymentMethod(req: Request, res: Response, next: NextFunction): void {
    const data = req.body;
    const errors: ValidationError[] = [];

    // Required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Payment method name is required and must be a non-empty string' });
    } else if (data.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Payment method name must not exceed 100 characters' });
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  }

  /**
   * Validate update payment method request body
   */
  static validateUpdatePaymentMethod(req: Request, res: Response, next: NextFunction): void {
    const data = req.body;
    const errors: ValidationError[] = [];

    // Check if at least one field is provided
    const allowedFields = ['name'];
    const providedFields = Object.keys(data).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Payment method name must be a non-empty string' });
      } else if (data.name.trim().length > 100) {
        errors.push({ field: 'name', message: 'Payment method name must not exceed 100 characters' });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  }

  /**
   * Validate create payment request body
   */
  static validateCreatePayment(req: Request, res: Response, next: NextFunction): void {
    const data = req.body;
    const errors: ValidationError[] = [];

    // Required fields
    if (!data.apartment_id || typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
      errors.push({ field: 'apartment_id', message: 'Apartment ID is required and must be a positive number' });
    }

    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push({ field: 'amount', message: 'Amount is required and must be a positive number' });
    } else if (data.amount > 999999999.99) {
      errors.push({ field: 'amount', message: 'Amount is too large' });
    }

    if (!data.currency || !['EGP', 'GBP'].includes(data.currency)) {
      errors.push({ field: 'currency', message: 'Currency is required and must be EGP or GBP' });
    }

    if (!data.method_id || typeof data.method_id !== 'number' || data.method_id <= 0) {
      errors.push({ field: 'method_id', message: 'Payment method ID is required and must be a positive number' });
    }

    if (!data.user_type || !['owner', 'renter'].includes(data.user_type)) {
      errors.push({ field: 'user_type', message: 'User type is required and must be owner or renter' });
    }

    if (!data.date || typeof data.date !== 'string' || !data.date.trim()) {
      errors.push({ field: 'date', message: 'Date is required and must be a non-empty string' });
    } else {
      const date = new Date(data.date);
      if (isNaN(date.getTime())) {
        errors.push({ field: 'date', message: 'Date must be a valid date' });
      }
    }

    // Optional fields
    if (data.booking_id !== undefined && (typeof data.booking_id !== 'number' || data.booking_id <= 0)) {
      errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number' });
    }

    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (data.description && data.description.length > 1000) {
      errors.push({ field: 'description', message: 'Description must not exceed 1,000 characters' });
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  }

  /**
   * Validate update payment request body
   */
  static validateUpdatePayment(req: Request, res: Response, next: NextFunction): void {
    const errors: ValidationError[] = [];
    const data = req.body;

    // Check if at least one field is provided for update
    const providedFields = Object.keys(data).filter(key => data[key] !== undefined);
    if (providedFields.length === 0) {
      errors.push({ field: 'general', message: 'At least one field must be provided for update' });
    }

    // Validate provided fields
    if (data.apartment_id !== undefined) {
      if (typeof data.apartment_id !== 'number' || data.apartment_id <= 0) {
        errors.push({ field: 'apartment_id', message: 'Apartment ID must be a positive number' });
      }
    }

    if (data.booking_id !== undefined && data.booking_id !== null) {
      if (typeof data.booking_id !== 'number' || data.booking_id <= 0) {
        errors.push({ field: 'booking_id', message: 'Booking ID must be a positive number' });
      }
    }

    if (data.amount !== undefined) {
      if (typeof data.amount !== 'number' || data.amount <= 0) {
        errors.push({ field: 'amount', message: 'Amount must be a positive number' });
      }
    }

    if (data.currency !== undefined) {
      if (!['EGP', 'GBP'].includes(data.currency)) {
        errors.push({ field: 'currency', message: 'Currency must be either EGP or GBP' });
      }
    }

    if (data.method_id !== undefined) {
      if (typeof data.method_id !== 'number' || data.method_id <= 0) {
        errors.push({ field: 'method_id', message: 'Payment method ID must be a positive number' });
      }
    }

    if (data.user_type !== undefined) {
      if (!['owner', 'renter'].includes(data.user_type)) {
        errors.push({ field: 'user_type', message: 'User type must be either owner or renter' });
      }
    }

    if (data.date !== undefined) {
      if (!ValidationMiddleware.isValidDate(data.date)) {
        errors.push({ field: 'date', message: 'Date must be a valid date in YYYY-MM-DD format' });
      }
    }

    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string' });
      } else if (data.description.length > 500) {
        errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
      }
    }
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  }

  /**
   * Validate that a village ID exists in the database
   * This should be used after basic validation to ensure the village exists
   */
  static async validateVillageExists(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { responsible_village } = req.body;
    
    if (responsible_village !== undefined && responsible_village !== null) {
      try {
        const { db } = await import('../database/connection');
        const village = await db('villages').where('id', responsible_village).first();
        
        if (!village) {
          res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: [{ field: 'responsible_village', message: 'Village with this ID does not exist' }]
          });
          return;
        }
      } catch (error) {
        console.error('Error validating village existence:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to validate village existence'
        });
        return;
      }
    }
    
    next();
  }

  // Helper methods
  private static isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  }

  private static isValidDatetime(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private static isPositiveInteger(value: string): boolean {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num.toString() === value;
  }
}

// Error handling middleware
export const handleValidationError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: error.message
    });
  }
  next(error);
}; 