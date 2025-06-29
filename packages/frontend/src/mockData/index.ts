// Mock data for development (temporary exports to prevent import errors)
export const mockSettings = {
  electricityPrice: 1.5,
  gasPrice: 1.2,
  waterPrice: 0.75,
};

export const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockVillages = [
  {
    id: 1,
    name: 'Sharm Village',
    electricity_price: 1.5,
    water_price: 0.75,
    phases: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockApartments = [
  {
    id: 1,
    name: 'Apartment 1',
    village: 'Sharm',
    city: 'Sharm El Sheikh',
    apartmentId: '1',
    ownerId: '1',
    ownerName: 'Owner 1',
    phase: '1',
    purchaseDate: '2024-01-01'
  }
];

export const mockBookings = [
  {
    id: 1,
    apartmentId: '1',
    userId: '1',
    apartment_id: 1,
    user_id: 1,
    user_type: 'owner',
    number_of_people: 2,
    arrival_date: '2024-01-01',
    leaving_date: '2024-01-07',
    status: 'Checked In',
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockPayments = [
  {
    id: 1,
    apartmentId: '1',
    bookingId: '1',
    placeOfPayment: 'Cash',
    cost: 1000,
    apartment_id: 1,
    amount: 1000,
    currency: 'EGP',
    description: 'Monthly payment',
    payment_method_id: 1,
    user_id: 1,
    booking_id: 1,
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockServiceTypes = [
  {
    id: 1,
    name: 'Cleaning',
    cost: 100,
    currency: 'EGP',
    description: 'Apartment cleaning service'
  }
];

export const mockServiceRequests = [
  {
    id: 1,
    apartmentId: '1',
    bookingId: '1',
    userId: '1',
    apartment_id: 1,
    service_type_id: 1,
    booking_id: 1,
    request_date: '2024-01-01',
    wanted_service_date: '2024-01-02',
    status: 'pending',
    notes: 'Standard cleaning'
  }
];

export const mockUtilities = [
  {
    id: 1,
    apartment_id: 1,
    booking_id: 1,
    utility_type: 'electricity',
    start_reading: 100,
    end_reading: 150,
    start_date: '2024-01-01',
    end_date: '2024-01-07',
    notes: 'Standard reading'
  }
];

export const mockPaymentMethods = [
  {
    id: 1,
    name: 'Cash',
    description: 'Cash payment'
  },
  {
    id: 2,
    name: 'Bank Transfer',
    description: 'Bank transfer payment'
  }
];
