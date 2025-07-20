export interface Village {
  id: number;
  name: string;
  electricity_price: number;
  water_price: number;
  phases: number;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserVillage {
  id: number;
  user_id: number;
  village_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
  password_hash?: string; // Optional for security - don't always include
  last_login?: Date;
  is_active: boolean;
  refresh_token_hash?: string;
  refresh_token_expires_at?: Date;
  /** @deprecated Use villages instead */
  responsible_village?: number;
  villages?: Village[]; // Added for multiple villages support
  // New fields
  passport_number?: string;
  passport_expiry_date?: Date;
  address?: string;
  next_of_kin_name?: string;
  next_of_kin_address?: string;
  next_of_kin_email?: string;
  next_of_kin_phone?: string;
  next_of_kin_will?: string; // New field
  created_at: Date;
  updated_at: Date;
}

// Public user interface (without sensitive fields)
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
  last_login?: Date;
  is_active: boolean;
  /** @deprecated Use villages instead */
  responsible_village?: number;
  villages?: Village[]; // Added for multiple villages support
  // New fields
  passport_number?: string;
  passport_expiry_date?: Date;
  address?: string;
  next_of_kin_name?: string;
  next_of_kin_address?: string;
  next_of_kin_email?: string;
  next_of_kin_phone?: string;
  next_of_kin_will?: string; // New field
  created_at: Date;
  updated_at: Date;
}

export interface Apartment {
  id: number;
  name: string;
  village_id: number;
  phase: number;
  owner_id: number;
  purchase_date?: Date;
  paying_status: 'transfer' | 'rent' | 'non-payer';
  created_by: number;
  created_at: Date;
  updated_at: Date;
  sales_status: 'for sale' | 'not for sale';
  
  // Computed fields (not in DB)
  village?: Village;
  owner?: PublicUser;
  created_by_user?: PublicUser;
  status?: 'Available' | 'Occupied by Owner' | 'Occupied By Renter';
  current_booking?: Booking;
}

export interface Booking {
  id: number;
  apartment_id: number;
  user_id: number;
  user_type: 'owner' | 'renter';
  number_of_people: number;
  arrival_date: Date;
  leaving_date: Date;
  status: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  notes?: string;
  person_name?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  // Alias for frontend display
  reservation_date?: Date; // Alias for created_at
  user?: User;
  apartment?: Apartment;
  created_by_user?: PublicUser;
}

export interface ServiceRequest {
  id: number;
  type_id: number;
  apartment_id: number;
  booking_id?: number;
  requester_id: number;
  date_action?: Date;
  date_created: Date;
  status: 'Created' | 'In Progress' | 'Done';
  who_pays: 'owner' | 'renter' | 'company';
  notes?: string;
  assignee_id?: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields for API responses
  type?: ServiceType;
  apartment?: Apartment;
  booking?: Booking;
  requester?: PublicUser;
  assignee?: PublicUser;
  created_by_user?: PublicUser;
}

export interface ServiceType {
  id: number;
  name: string;
  cost: number;
  currency: 'EGP' | 'GBP';
  description?: string;
  default_assignee_id?: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields for API responses
  default_assignee?: PublicUser;
  created_by_user?: PublicUser;
}

export interface Payment {
  id: number;
  apartment_id: number;
  booking_id?: number;
  created_by: number;
  amount: number;
  currency: 'EGP' | 'GBP';
  method_id: number;
  user_type: 'owner' | 'renter';
  date: Date;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApartmentFinancialSummary {
  apartment_id: number;
  total_money_spent: {
    EGP: number;
    GBP: number;
  };
  total_money_requested: {
    EGP: number;
    GBP: number;
  };
  net_money: {
    EGP: number;
    GBP: number;
  };
}

export interface ApartmentFilters {
  village_id?: number;
  phase?: number;
  status?: string;
  paying_status?: string;
  sales_status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface VillageFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateApartmentRequest {
  name: string;
  village_id: number;
  phase: number;
  owner_id: number;
  purchase_date?: string;
  paying_status: 'transfer' | 'rent' | 'non-payer';
  sales_status?: 'for sale' | 'not for sale';
}

export interface UpdateApartmentRequest {
  name?: string;
  village_id?: number;
  phase?: number;
  owner_id?: number;
  purchase_date?: string;
  paying_status?: 'transfer' | 'rent' | 'non-payer';
  sales_status?: 'for sale' | 'not for sale';
}

export interface CreateVillageRequest {
  name: string;
  electricity_price: number;
  water_price: number;
  phases: number;
}

export interface UpdateVillageRequest {
  name?: string;
  electricity_price?: number;
  water_price?: number;
  phases?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UserFilters {
  search?: string;
  role?: 'super_admin' | 'admin' | 'owner' | 'renter';
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
  /** @deprecated Use village_ids instead */
  responsible_village?: number;
  village_ids?: number[]; // Added for multiple villages support
  // New fields
  passport_number?: string;
  passport_expiry_date?: string; // ISO date string
  address?: string;
  next_of_kin_name?: string;
  next_of_kin_address?: string;
  next_of_kin_email?: string;
  next_of_kin_phone?: string;
  next_of_kin_will?: string; // New field
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone_number?: string;
  role?: 'super_admin' | 'admin' | 'owner' | 'renter';
  /** @deprecated Use village_ids instead */
  responsible_village?: number;
  village_ids?: number[]; // Added for multiple villages support
  password?: string;
  // New fields
  passport_number?: string;
  passport_expiry_date?: string; // ISO date string
  address?: string;
  next_of_kin_name?: string;
  next_of_kin_address?: string;
  next_of_kin_email?: string;
  next_of_kin_phone?: string;
  next_of_kin_will?: string; // New field
}

// Auth-related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  role: 'owner' | 'renter'; // Only allow these roles for self-registration
  // New fields
  passport_number?: string;
  passport_expiry_date?: string; // ISO date string
  address?: string;
  next_of_kin_name?: string;
  next_of_kin_address?: string;
  next_of_kin_email?: string;
  next_of_kin_phone?: string;
}

export interface AuthResponse {
  user: PublicUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  success?: boolean;
  message?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface TokenPayload {
  user_id: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extended Request interface with user
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
      villageFilter?: number;
    }
  }
}

// Extend Express Request type
declare module 'express' {
  interface Request {
    user?: PublicUser;
    villageFilter?: number;
    villageFilters?: number[];
  }
}

export interface CreateBookingRequest {
  apartment_id: number;
  user_id?: number;
  user_name?: string;
  user_type?: 'owner' | 'renter';
  number_of_people?: number;
  arrival_date: string;
  leaving_date: string;
  status?: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  notes?: string;
  person_name?: string;
}

export interface UpdateBookingRequest {
  apartment_id?: number;
  user_id?: number;
  user_type?: 'owner' | 'renter';
  number_of_people?: number;
  arrival_date?: string;
  leaving_date?: string;
  status?: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  notes?: string;
  person_name?: string;
}

// Service Type related interfaces
export interface CreateServiceTypeRequest {
  name: string;
  cost: number;
  currency: 'EGP' | 'GBP';
  description?: string;
  default_assignee_id?: number;
}

export interface UpdateServiceTypeRequest {
  name?: string;
  cost?: number;
  currency?: 'EGP' | 'GBP';
  description?: string;
  default_assignee_id?: number;
}

export interface ServiceTypeFilters {
  search?: string;
  currency?: 'EGP' | 'GBP';
  min_cost?: number;
  max_cost?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Service Request related interfaces
export interface CreateServiceRequestRequest {
  type_id: number;
  apartment_id: number;
  booking_id?: number;
  requester_id: number;
  date_action?: string; // ISO string - when the service will be done
  status?: 'Created' | 'In Progress' | 'Done';
  who_pays: 'owner' | 'renter' | 'company';
  notes?: string;
  assignee_id?: number; // Optional - will default to service type assignee
}

export interface UpdateServiceRequestRequest {
  type_id?: number;
  apartment_id?: number;
  booking_id?: number;
  requester_id?: number;
  date_action?: string; // ISO string
  status?: 'Created' | 'In Progress' | 'Done';
  who_pays?: 'owner' | 'renter' | 'company';
  notes?: string;
  assignee_id?: number;
}

export interface ServiceRequestFilters {
  type_id?: number;
  apartment_id?: number;
  booking_id?: number;
  requester_id?: number;
  assignee_id?: number;
  status?: 'Created' | 'In Progress' | 'Done';
  who_pays?: 'owner' | 'renter' | 'company';
  date_action_start?: string;
  date_action_end?: string;
  date_created_start?: string;
  date_created_end?: string;
  village_id?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Utility Reading related interfaces
export interface UtilityReading {
  id: number;
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: Date;
  end_date: Date;
  who_pays: 'owner' | 'renter' | 'company';
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUtilityReadingRequest {
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  who_pays: 'owner' | 'renter' | 'company';
}

export interface UpdateUtilityReadingRequest {
  booking_id?: number;
  apartment_id?: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  who_pays?: 'owner' | 'renter' | 'company';
}

export interface UtilityReadingFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  who_pays?: 'owner' | 'renter' | 'company';
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  has_water_readings?: boolean;
  has_electricity_readings?: boolean;
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Email related interfaces
export interface Email {
  id: number;
  apartment_id: number;
  booking_id?: number;
  date: Date;
  from: string;
  to: string;
  subject: string;
  content: string;
  type: 'complaint' | 'inquiry' | 'other';
  status: 'pending' | 'completed';
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmailRequest {
  apartment_id: number;
  booking_id?: number;
  date: string; // ISO date string
  from: string;
  to: string;
  subject: string;
  content: string;
  type: 'complaint' | 'inquiry' | 'other';
  status?: 'pending' | 'completed';
}

export interface UpdateEmailRequest {
  apartment_id?: number;
  booking_id?: number;
  date?: string; // ISO date string
  from?: string;
  to?: string;
  subject?: string;
  content?: string;
  type?: 'complaint' | 'inquiry' | 'other';
  status?: 'pending' | 'completed';
}

export interface EmailFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  type?: 'complaint' | 'inquiry' | 'other';
  status?: 'pending' | 'completed';
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Payment Method related interfaces
export interface PaymentMethod {
  id: number;
  name: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  usage_count?: number;
}

export interface CreatePaymentMethodRequest {
  name: string;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
}

export interface PaymentMethodFilters {
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreatePaymentRequest {
  apartment_id: number;
  booking_id?: number;
  amount: number;
  currency: 'EGP' | 'GBP';
  method_id: number;
  user_type: 'owner' | 'renter';
  date: string; // ISO date string
  description?: string;
}

export interface UpdatePaymentRequest {
  apartment_id?: number;
  booking_id?: number;
  amount?: number;
  currency?: 'EGP' | 'GBP';
  method_id?: number;
  user_type?: 'owner' | 'renter';
  date?: string; // ISO date string
  description?: string;
}

export interface PaymentFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  currency?: 'EGP' | 'GBP';
  method_id?: number;
  user_type?: 'owner' | 'renter';
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BookingFilters {
  apartment_id?: number;
  user_id?: number;
  user_type?: 'owner' | 'renter';
  village_id?: number;
  phase?: number;
  status?: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  arrival_date_start?: string;
  arrival_date_end?: string;
  leaving_date_start?: string;
  leaving_date_end?: string;
  search?: string;
}

export interface BookingStats {
  total_bookings: number;
  current_bookings: number;
  upcoming_bookings: number;
  past_bookings: number;
  by_status: {
    Booked: number;
    'Checked In': number;
    'Checked Out': number;
    Cancelled: number;
  };
  by_user_type: {
    owner: number;
    renter: number;
  };
}

