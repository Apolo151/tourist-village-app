// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'renter';
  phone?: string;
}

// Apartment Types
export interface Apartment {
  id: string;
  name: string;
  city: string;
  address: string;
  ownerId: string;
  purchaseDate: string;
  description?: string;
  images?: string[];
  amenities?: string[];
  size?: number;
  bedrooms?: number;
  bathrooms?: number;
}

// Booking Types
export interface Booking {
  id: string;
  apartmentId: string;
  userId: string;
  arrivalDate: string;
  leavingDate: string;
  state: 'notArrived' | 'inVillage' | 'left';
  createdAt: string;
}

// Service Types
export interface ServiceType {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export interface ServiceRequest {
  id: string;
  serviceTypeId: string;
  apartmentId: string;
  requestDate: string;
  serviceDate: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  userId: string;
}

// Utility Types
export type UtilityType = 'water' | 'electricity' | 'gas';
export type ReadingType = 'start' | 'end';

export interface UtilityReading {
  id: string;
  apartmentId: string;
  bookingId?: string;
  type: ReadingType;
  utilityType: UtilityType;
  value: number;
  date: string;
  notes?: string;
  createdById: string;
}

// Payment Types
export interface Payment {
  id: string;
  cost: number;
  currency: string;
  description: string;
  placeOfPayment: string;
  userType: 'owner' | 'renter';
  userId: string;
  apartmentId: string;
  bookingId?: string;
  createdById: string;
  createdAt: string;
}

// Email Types
export interface Email {
  id: string;
  date: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  apartmentId: string;
  createdById: string;
}

// Settings Types
export interface Settings {
  electricityPrice: number;
  gasPrice: number;
  waterPrice: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
} 