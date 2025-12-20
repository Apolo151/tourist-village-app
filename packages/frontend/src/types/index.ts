// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
  last_login?: string;
  is_active: boolean;
  responsible_village?: number;
  created_at: string;
  updated_at: string;
}

// Utility Reading Types (Backend format)
export interface UtilityReading {
  id: number;
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: string;
  end_date: string;
  who_pays: "owner" | "renter" | "company";
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  apartment?: Apartment;
  booking?: Booking;
  created_by_user?: User;
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
  who_pays: "owner" | "renter" | "company";
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
  who_pays?: "owner" | "renter" | "company";
}

export interface UtilityReadingFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  who_pays?: "owner" | "renter" | "company";
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
  sort_order?: "asc" | "desc";
}

// Village Types  
export interface Village {
  id: number;
  name: string;
  electricity_price: number;
  water_price: number;
  phases: number;
  created_at: string;
  updated_at: string;
}

// Utility Reading Types (Backend format)
export interface UtilityReading {
  id: number;
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: string;
  end_date: string;
  who_pays: "owner" | "renter" | "company";
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  apartment?: Apartment;
  booking?: Booking;
  created_by_user?: User;
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
  who_pays: "owner" | "renter" | "company";
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
  who_pays?: "owner" | "renter" | "company";
}

export interface UtilityReadingFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  who_pays?: "owner" | "renter" | "company";
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
  sort_order?: "asc" | "desc";
}

// Payment Method Types
export interface PaymentMethod {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  };
}

// Utility Reading Types (Backend format)
export interface UtilityReading {
  id: number;
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: string;
  end_date: string;
  who_pays: "owner" | "renter" | "company";
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  apartment?: Apartment;
  booking?: Booking;
  created_by_user?: User;
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
  who_pays: "owner" | "renter" | "company";
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
  who_pays?: "owner" | "renter" | "company";
}

export interface UtilityReadingFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  who_pays?: "owner" | "renter" | "company";
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
  sort_order?: "asc" | "desc";
}

// Apartment Types
export interface Apartment {
  id: number;
  name: string;
  village_id: number;
  owner_id: number;
  phase: number;
  purchase_date: string;
  paying_status: 'paid_by_transfer' | 'paid_by_rent' | 'non_payer';
  created_by: number;
  created_at: string;
  updated_at: string;
  village?: Village;
  owner?: User;
}

// Booking Types
export interface Booking {
  id: number;
  apartment_id: number;
  user_id: number;
  user_type: 'owner' | 'renter';
  number_of_people: number;
  arrival_date: string;
  leaving_date: string;
  status: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  notes?: string;
  flight_details?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  apartment?: Apartment;
  user?: User;
}

// Service Types
export interface ServiceType {
  id: number;
  name: string;
  cost: number;
  currency: 'EGP' | 'GBP';
  description?: string;
  default_assignee_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  default_assignee?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  created_by_user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface ServiceRequest {
  id: number;
  type_id: number;
  apartment_id: number;
  booking_id?: number;
  requester_id: number;
  date_action?: string; // ISO string - when the service will be done
  date_created: string; // ISO string - when the request was created
  status: 'Created' | 'In Progress' | 'Done';
  who_pays: 'owner' | 'renter' | 'company';
  notes?: string;
  assignee_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  type?: ServiceType;
  apartment?: {
    id: number;
    name: string;
    phase?: number;
    village?: {
      id: number;
      name: string;
    };
  };
  booking?: {
    id: number;
    arrival_date: string;
    leaving_date: string;
    user?: {
      id: number;
      name: string;
    };
  };
  requester?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  created_by_user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

// Utility Types
export interface Utility {
  id: string;
  apartmentId: string;
  bookingId: string;
  utilityType: 'water' | 'electricity';
  startReading: number;
  endReading?: number;
  startDate: string;
  endDate?: string;
  startNotes?: string;
  endNotes?: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

// Form Types for creating/updating entities
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone_number?: string;
  role?: 'super_admin' | 'admin' | 'owner' | 'renter';
  is_active?: boolean;
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

export interface CreatePaymentMethodRequest {
  name: string;
  description?: string;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
  description?: string;
}

// Utility Reading Types (Backend format)
export interface UtilityReading {
  id: number;
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: string;
  end_date: string;
  who_pays: "owner" | "renter" | "company";
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  apartment?: Apartment;
  booking?: Booking;
  created_by_user?: User;
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
  who_pays: "owner" | "renter" | "company";
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
  who_pays?: "owner" | "renter" | "company";
}

export interface UtilityReadingFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  who_pays?: "owner" | "renter" | "company";
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
  sort_order?: "asc" | "desc";
}
