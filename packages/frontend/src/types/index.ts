// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'renter';
  phone?: string;
  permissions?: {
    villageAccess: string[]; // IDs of villages the user can access
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
  };
}

// Apartment Types
export interface Apartment {
  id: string;
  name: string;
  ownerId: string;
  ownerName?: string;
  village: 'Sharm' | 'Luxor' | 'International Resort';
  phase: string;
  status?: 'Available' | 'Occupied by Owner' | 'Occupied By Renter';
  payingStatus?: 'Payed By Transfer' | 'Payed By Rent' | 'Non-Payer';
  purchaseDate: string;
  description?: string;
  images?: string[];
  amenities?: string[];
  city?: string;
  address?: string;
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
  currency: 'EGP' | 'GBP';
  description: string;
  assigneeId?: string;
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
  bookingId?: string;
  assigneeId?: string;
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
  bookingId?: string;
  emailType: 'Complaint' | 'Booking Request' | 'Service Request' | 'Inquiry';
  createdById: string;
}

// Settings Types
export interface Settings {
  electricityPrice: number;
  gasPrice: number;
  waterPrice: number;
}

export interface Village {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  electricityPrice: number;
  gasPrice: number;
  waterPrice: number;
  numberOfPhases: number;
  contactEmail: string;
  contactPhone: string;
  description: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
} 