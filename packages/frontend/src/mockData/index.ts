import type { Apartment, Bill, Booking, Email, Payment, ServiceRequest, ServiceType, User, Utility, PaymentMethod, Settings, Village } from '../types';

export const mockUsers: User[] = [
  { id: 'user1', name: 'Admin User', email: 'admin@example.com', role: 'admin', phone: '+201234567890' },
  { id: 'user2', name: 'John Owner', email: 'john@example.com', role: 'owner', phone: '+201234567891' },
  { id: 'user3', name: 'Sarah Renter', email: 'sarah@example.com', role: 'renter', phone: '+201234567892' },
  { id: 'user4', name: 'Ahmed Owner', email: 'ahmed@example.com', role: 'owner', phone: '+201234567893' },
];

export const mockApartments: Apartment[] = [
  { 
    id: 'apt1', 
    name: 'Sea View Villa', 
    village: 'Sharm',
    phase: 'Phase 1',
    status: 'Occupied By Renter',
    payingStatus: 'Payed By Transfer',
    city: 'Alexandria', 
    address: '123 Beach Road, Alexandria', 
    ownerId: 'user2',
    ownerName: 'John Owner',
    purchaseDate: '2022-01-15',
    description: 'Beautiful villa with sea view',
    images: ['/assets/apt1-1.jpg', '/assets/apt1-2.jpg'],
    amenities: ['Pool', 'Beach access', 'WiFi'],
    size: 120,
    bedrooms: 3,
    bathrooms: 2
  },
  { 
    id: 'apt2', 
    name: 'Mountain Retreat', 
    village: 'Luxor',
    phase: 'Phase 2',
    status: 'Occupied by Owner',
    payingStatus: 'Payed By Rent',
    city: 'Cairo', 
    address: '45 Mountain View, Cairo', 
    ownerId: 'user2',
    ownerName: 'John Owner',
    purchaseDate: '2021-06-20',
    description: 'Peaceful mountain retreat',
    images: ['/assets/apt2-1.jpg'],
    amenities: ['Garden', 'BBQ', 'Parking'],
    size: 90,
    bedrooms: 2,
    bathrooms: 1
  },
  { 
    id: 'apt3', 
    name: 'Downtown Condo', 
    village: 'International Resort',
    phase: 'Phase 3',
    status: 'Available',
    payingStatus: 'Non-Payer',
    city: 'Cairo', 
    address: '78 Downtown St, Cairo', 
    ownerId: 'user4',
    ownerName: 'Ahmed Owner',
    purchaseDate: '2022-03-10',
    description: 'Modern condo in downtown',
    images: ['/assets/apt3-1.jpg', '/assets/apt3-2.jpg'],
    amenities: ['Gym', 'Security', '24/7 Reception'],
    size: 75,
    bedrooms: 1,
    bathrooms: 1
  },
];

export const mockBookings: Booking[] = [
  { 
    id: 'booking1', 
    apartmentId: 'apt1', 
    userId: 'user3', 
    arrivalDate: '2023-07-15', 
    leavingDate: '2023-07-25', 
    state: 'left',
    createdAt: '2023-06-10'
  },
  { 
    id: 'booking2', 
    apartmentId: 'apt2', 
    userId: 'user3', 
    arrivalDate: '2023-08-01', 
    leavingDate: '2023-08-10', 
    state: 'inVillage',
    createdAt: '2023-07-05'
  },
  { 
    id: 'booking3', 
    apartmentId: 'apt1', 
    userId: 'user3', 
    arrivalDate: '2023-09-05', 
    leavingDate: '2023-09-15', 
    state: 'notArrived',
    createdAt: '2023-08-01'
  },
];

export const mockServiceTypes: ServiceType[] = [
  { id: 'service1', name: 'Cleaning', cost: 50, currency: 'EGP', description: 'Full apartment cleaning service', assigneeId: 'user1' },
  { id: 'service2', name: 'Maintenance', cost: 100, currency: 'EGP', description: 'General maintenance and repairs', assigneeId: 'user1' },
  { id: 'service3', name: 'Pool Service', cost: 75, currency: 'GBP', description: 'Pool cleaning and maintenance' },
];

export const mockServiceRequests: ServiceRequest[] = [
  { 
    id: 'request1', 
    serviceTypeId: 'service1', 
    apartmentId: 'apt1', 
    requestDate: '2023-07-10', 
    serviceDate: '2023-07-20', 
    status: 'completed',
    userId: 'user2',
    bookingId: 'booking1',
    assigneeId: 'user1'
  },
  { 
    id: 'request2', 
    serviceTypeId: 'service2', 
    apartmentId: 'apt2', 
    requestDate: '2023-08-02', 
    serviceDate: '2023-08-05', 
    notes: 'Fix kitchen sink',
    status: 'pending',
    userId: 'user2',
    bookingId: 'booking2'
  },
  { 
    id: 'request3', 
    serviceTypeId: 'service3', 
    apartmentId: 'apt3', 
    requestDate: '2023-09-01', 
    serviceDate: '2023-09-05', 
    notes: 'Regular pool maintenance',
    status: 'completed',
    userId: 'user4',
    assigneeId: 'user1'
  }
];

export const mockUtilities: Utility[] = [
  
  { 
    id: 'utility1', 
    apartmentId: 'apt1', 
    bookingId: 'booking1', 
    utilityType: 'electricity', 
    startReading: 1200, 
    endReading: 1350,
    startDate: '2023-07-15',
    endDate: '2023-07-25',
    startNotes: 'Initial reading at check-in',
    endNotes: 'Final reading at check-out',
    createdById: 'user1',
    createdAt: '2023-07-15T10:00:00Z',
    updatedAt: '2023-07-25T10:00:00Z'
  },
  { 
    id: 'utility2', 
    apartmentId: 'apt1', 
    bookingId: 'booking1', 
    utilityType: 'water', 
    startReading: 500, 
    endReading: 550,
    startDate: '2023-07-15',
    endDate: '2023-07-25',
    startNotes: 'Initial reading taken at check-in',
    endNotes: 'Final reading taken at check-out',
    createdById: 'user1',
    createdAt: '2023-07-15T10:00:00Z',
    updatedAt: '2023-07-25T10:00:00Z'
  },
  { 
    id: 'utility3', 
    apartmentId: 'apt2', 
    bookingId: 'booking2', 
    utilityType: 'electricity', 
    startReading: 2000,
    endReading: 2075,
    startDate: '2023-08-01',
    endDate: '2023-08-10',
    startNotes: 'Initial reading by admin',
    endNotes: 'Final reading by maintenance',
    createdById: 'user1',
    createdAt: '2023-08-01T10:00:00Z',
    updatedAt: '2023-08-10T16:30:00Z'
  },
  { 
    id: 'utility4', 
    apartmentId: 'apt2', 
    bookingId: 'booking2', 
    utilityType: 'water', 
    startReading: 1000, 
    endReading: 1080,
    startDate: '2023-08-01',
    endDate: '2023-08-10',
    startNotes: 'Initial water meter reading',
    endNotes: 'Final water meter reading',
    createdById: 'user1',
    createdAt: '2023-08-01T09:30:00Z',
    updatedAt: '2023-08-10T15:45:00Z'
  },
  { 
    id: 'utility5', 
    apartmentId: 'apt3', 
    bookingId: 'booking3', 
    utilityType: 'electricity', 
    startReading: 3500, 
    endReading: 3650,
    startDate: '2023-09-05',
    endDate: '2023-09-15',
    startNotes: 'Initial electricity reading for booking',
    endNotes: 'Final electricity reading at departure',
    createdById: 'user1',
    createdAt: '2023-09-05T11:00:00Z',
    updatedAt: '2023-09-15T14:00:00Z'
  },
  { 
    id: 'utility6', 
    apartmentId: 'apt3', 
    bookingId: 'booking3', 
    utilityType: 'water', 
    startReading: 750, 
    endReading: 825,
    startDate: '2023-09-05',
    endDate: '2023-09-15',
    startNotes: 'Initial water reading for Downtown Condo',
    endNotes: 'Final water reading recorded by admin',
    createdById: 'user1',
    createdAt: '2023-09-05T11:15:00Z',
    updatedAt: '2023-09-15T14:15:00Z'
  }

];

export const mockPayments: Payment[] = [
  { 
    id: 'payment1', 
    cost: 5000, 
    currency: 'EGP', 
    description: 'Monthly maintenance fee', 
    placeOfPayment: 'Bank transfer', 
    userType: 'owner', 
    userId: 'user2', 
    apartmentId: 'apt1',
    createdById: 'user1',
    createdAt: '2023-07-05'
  },
  { 
    id: 'payment2', 
    cost: 3000, 
    currency: 'EGP', 
    description: 'Booking payment', 
    placeOfPayment: 'Cash', 
    userType: 'renter', 
    userId: 'user3', 
    apartmentId: 'apt1',
    bookingId: 'booking1',
    createdById: 'user1',
    createdAt: '2023-07-10'
  },
];

export const mockEmails: Email[] = [
  { 
    id: 'email1', 
    date: '2023-06-15', 
    from: 'admin@example.com', 
    to: 'john@example.com', 
    subject: 'Upcoming Maintenance', 
    content: 'Dear John, we would like to inform you about the upcoming maintenance schedule for your apartment.', 
    apartmentId: 'apt1',
    emailType: 'Service Request',
    createdById: 'user1'
  },
  { 
    id: 'email2', 
    date: '2023-07-02', 
    from: 'john@example.com', 
    to: 'admin@example.com', 
    subject: 'Maintenance Request', 
    content: 'Hello, I would like to request maintenance for the air conditioning unit in my apartment.', 
    apartmentId: 'apt1',
    emailType: 'Complaint',
    createdById: 'user2'
  },
  { 
    id: 'email3', 
    date: '2023-07-10', 
    from: 'sarah@example.com', 
    to: 'admin@example.com', 
    subject: 'Booking Inquiry', 
    content: 'Hello, I am interested in booking an apartment for the summer holiday. Could you please provide information about availability and rates?', 
    apartmentId: 'apt2',
    emailType: 'Booking Request',
    createdById: 'user3'
  },
  { 
    id: 'email4', 
    date: '2023-07-15', 
    from: 'admin@example.com', 
    to: 'sarah@example.com', 
    subject: 'Booking Confirmation', 
    content: 'Dear Sarah, we are happy to confirm your booking for apartment "Mountain Retreat" from August 1 to August 10, 2023.', 
    apartmentId: 'apt2',
    bookingId: 'booking2',
    emailType: 'Booking Request',
    createdById: 'user1'
  },
  { 
    id: 'email5', 
    date: '2023-08-05', 
    from: 'ahmed@example.com', 
    to: 'admin@example.com', 
    subject: 'General Inquiry', 
    content: 'Hello, I have a question about the amenities available in the Downtown Condo. Does it have a gym?', 
    apartmentId: 'apt3',
    emailType: 'Inquiry',
    createdById: 'user4'
  }
];

export const mockPaymentMethods: PaymentMethod[] = [
  { id: 'method1', name: 'Cash', description: 'Cash payment on site' },
  { id: 'method2', name: 'Bank Transfer', description: 'Bank transfer to company account' },
  { id: 'method3', name: 'Credit Card', description: 'Credit card payment' },
];

export const mockSettings: Settings = {
  electricityPrice: 1.5,
  gasPrice: 1.2,
  waterPrice: 0.75
};

export const mockVillages: Village[] = [
  {
    id: 'village1',
    name: 'Sharm',
    address: '123 Sharm El-Sheikh Road',
    city: 'Sharm El-Sheikh',
    country: 'Egypt',
    electricityPrice: 1.5,
    gasPrice: 1.2,
    waterPrice: 0.75,
    numberOfPhases: 3,
    contactEmail: 'info@sharm-village.com',
    contactPhone: '+20123456789',
    description: 'A beautiful resort village in Sharm El-Sheikh with beach access and modern amenities.'
  },
  {
    id: 'village2',
    name: 'Luxor',
    address: '45 Luxor Temple Road',
    city: 'Luxor',
    country: 'Egypt',
    electricityPrice: 1.6,
    gasPrice: 1.3,
    waterPrice: 0.8,
    numberOfPhases: 2,
    contactEmail: 'info@luxor-village.com',
    contactPhone: '+20123456790',
    description: 'A historic village near the ancient temples of Luxor with beautiful gardens and pools.'
  },
  {
    id: 'village3',
    name: 'International Resort',
    address: '78 International Road',
    city: 'Cairo',
    country: 'Egypt',
    electricityPrice: 1.7,
    gasPrice: 1.4,
    waterPrice: 0.85,
    numberOfPhases: 4,
    contactEmail: 'info@international-resort.com',
    contactPhone: '+20123456791',
    description: 'A luxury international resort with world-class facilities and services.'
  }
];

export const mockBills: Bill[] = [
  {
    id: 'bill1',
    billNumber: 'INV-2023-001',
    apartmentId: 'apt1',
    userId: 'user2',
    userType: 'owner',
    billDate: '2023-06-15',
    dueDate: '2023-07-15',
    isPaid: true,
    paidDate: '2023-07-10',
    totalAmountEGP: 5500,
    totalAmountGBP: 0,
    description: 'Annual maintenance fee',
    items: [
      { description: 'Annual maintenance fee', amount: 5000, currency: 'EGP' },
      { description: 'Admin fee', amount: 500, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-06-15',
    paymentId: 'payment1'
  },
  {
    id: 'bill2',
    billNumber: 'INV-2023-002',
    apartmentId: 'apt1',
    userId: 'user3',
    userType: 'renter',
    billDate: '2023-07-10',
    dueDate: '2023-07-25',
    isPaid: true,
    paidDate: '2023-07-12',
    totalAmountEGP: 3000,
    totalAmountGBP: 0,
    description: 'Booking payment for Sea View Villa',
    items: [
      { description: 'Booking payment', amount: 3000, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-07-10',
    paymentId: 'payment2',
    bookingId: 'booking1'
  },
  {
    id: 'bill3',
    billNumber: 'INV-2023-003',
    apartmentId: 'apt2',
    userId: 'user2',
    userType: 'owner',
    billDate: '2023-07-15',
    dueDate: '2023-08-15',
    isPaid: false,
    totalAmountEGP: 4500,
    totalAmountGBP: 0,
    description: 'Property tax and service charges',
    items: [
      { description: 'Property tax', amount: 2000, currency: 'EGP' },
      { description: 'Service charges', amount: 2500, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-07-15'
  },
  {
    id: 'bill4',
    billNumber: 'INV-2023-004',
    apartmentId: 'apt2',
    userId: 'user3',
    userType: 'renter',
    billDate: '2023-08-02',
    dueDate: '2023-08-16',
    isPaid: true,
    paidDate: '2023-08-05',
    totalAmountEGP: 4500,
    totalAmountGBP: 0,
    description: 'Booking payment and utility deposit for Mountain Retreat',
    items: [
      { description: 'Booking payment', amount: 4000, currency: 'EGP' },
      { description: 'Utility deposit', amount: 500, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-08-02',
    bookingId: 'booking2'
  },
  {
    id: 'bill5',
    billNumber: 'INV-2023-005',
    apartmentId: 'apt3',
    userId: 'user4',
    userType: 'owner',
    billDate: '2023-08-10',
    dueDate: '2023-09-10',
    isPaid: false,
    totalAmountEGP: 6500,
    totalAmountGBP: 0,
    description: 'Annual maintenance and community fee',
    items: [
      { description: 'Annual maintenance', amount: 5000, currency: 'EGP' },
      { description: 'Community fee', amount: 1500, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-08-10'
  },
  {
    id: 'bill6',
    billNumber: 'INV-2023-006',
    apartmentId: 'apt1',
    userId: 'user2',
    userType: 'owner',
    billDate: '2023-08-15',
    dueDate: '2023-09-15',
    isPaid: false,
    totalAmountEGP: 750,
    totalAmountGBP: 0,
    description: 'Cleaning service fee',
    items: [
      { description: 'Cleaning service', amount: 500, currency: 'EGP' },
      { description: 'Materials', amount: 250, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-08-15',
    serviceRequestId: 'request1'
  },
  {
    id: 'bill7',
    billNumber: 'INV-2023-007',
    apartmentId: 'apt2',
    userId: 'user2',
    userType: 'owner',
    billDate: '2023-08-20',
    dueDate: '2023-09-20',
    isPaid: true,
    paidDate: '2023-09-01',
    totalAmountEGP: 1000,
    totalAmountGBP: 0,
    description: 'Maintenance service fee',
    items: [
      { description: 'Kitchen sink repair', amount: 800, currency: 'EGP' },
      { description: 'Parts', amount: 200, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-08-20',
    serviceRequestId: 'request2'
  },
  {
    id: 'bill8',
    billNumber: 'INV-2023-008',
    apartmentId: 'apt3',
    userId: 'user3',
    userType: 'renter',
    billDate: '2023-09-06',
    dueDate: '2023-09-20',
    isPaid: true,
    paidDate: '2023-09-10',
    totalAmountEGP: 5000,
    totalAmountGBP: 0,
    description: 'Booking payment for Downtown Condo',
    items: [
      { description: 'Booking payment', amount: 4500, currency: 'EGP' },
      { description: 'Security deposit', amount: 500, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-09-06',
    bookingId: 'booking3'
  },
  {
    id: 'bill9',
    billNumber: 'INV-2023-009',
    apartmentId: 'apt1',
    userId: 'user3',
    userType: 'renter',
    billDate: '2023-07-25',
    dueDate: '2023-08-01',
    isPaid: true,
    paidDate: '2023-07-30',
    totalAmountEGP: 225,
    totalAmountGBP: 0,
    description: 'Utility bill for Sea View Villa',
    items: [
      { description: 'Electricity', amount: 150, currency: 'EGP' },
      { description: 'Water', amount: 75, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-07-25',
    bookingId: 'booking1',
    utilityId: ['utility1', 'utility2']
  },
  {
    id: 'bill10',
    billNumber: 'INV-2023-010',
    apartmentId: 'apt2',
    userId: 'user3',
    userType: 'renter',
    billDate: '2023-08-10',
    dueDate: '2023-08-17',
    isPaid: true,
    paidDate: '2023-08-15',
    totalAmountEGP: 150,
    totalAmountGBP: 0,
    description: 'Utility bill for Mountain Retreat',
    items: [
      { description: 'Electricity', amount: 75, currency: 'EGP' },
      { description: 'Water', amount: 75, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-08-10',
    bookingId: 'booking2',
    utilityId: ['utility3', 'utility4']
  },
  {
    id: 'bill11',
    billNumber: 'INV-2023-011',
    apartmentId: 'apt3',
    userId: 'user4',
    userType: 'owner',
    billDate: '2023-09-01',
    dueDate: '2023-10-01',
    isPaid: false,
    totalAmountGBP: 75,
    totalAmountEGP: 0,
    description: 'Pool service fee',
    items: [
      { description: 'Pool cleaning service', amount: 75, currency: 'GBP' }
    ],
    createdById: 'user1',
    createdAt: '2023-09-01',
    serviceRequestId: 'request3'
  },
  {
    id: 'bill12',
    billNumber: 'INV-2023-012',
    apartmentId: 'apt3',
    userId: 'user3',
    userType: 'renter',
    billDate: '2023-09-15',
    dueDate: '2023-09-22',
    isPaid: true,
    paidDate: '2023-09-20',
    totalAmountEGP: 225,
    totalAmountGBP: 0,
    description: 'Utility bill for Downtown Condo',
    items: [
      { description: 'Electricity', amount: 150, currency: 'EGP' },
      { description: 'Water', amount: 75, currency: 'EGP' }
    ],
    createdById: 'user1',
    createdAt: '2023-09-15',
    bookingId: 'booking3',
    utilityId: ['utility5', 'utility6']
  }
]; 

// Function to generate bill numbers for different bill types
export function generateBillNumber(type: 'service' | 'payment' | 'utility' | 'other', id: string): string {
  const prefix = type === 'service' ? 'SRV' : 
                 type === 'payment' ? 'PMT' : 
                 type === 'utility' ? 'UTL' : 'BIL';
  
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${id.substring(0, 4).toUpperCase()}-${new Date().getFullYear()}-${randomNum}`;
} 
