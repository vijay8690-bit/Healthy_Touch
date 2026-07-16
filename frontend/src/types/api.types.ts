export type UserRole = 'patient' | 'provider' | 'admin' | 'doctor' | 'nurse' | 'caretaker' | 'physiotherapy';

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  coins?: number;
  referralCode?: string;
  coinHistory?: Array<{
    amount: number;
    type: string;
    description: string;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
    createdAt: string;
  }>;
  providerCategory?: string; // For providers: 'Doctor', 'Nurse', 'Physiotherapist', 'Lab Technician'
  category?: string;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  resetToken?: string;
  resetUrl?: string;
  userId?: string;
  email?: string;
  mobile?: string;
  isNew?: boolean;
  needsProfileCompletion?: boolean;
  profileToken?: string;
  requiresEmail?: boolean;
  otp?: string;
  user?: User;
  data?: {
    token?: string;
    user?: User;
    userId?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface LoginCredentials {
  email?: string;
  mobile?: string;
  password: string;
  role?: string; // Optional: For role validation
  category?: string; // Optional: For provider category validation
}

export interface RegisterData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: UserRole;
  category?: string; // Provider category: Doctor, Nurse, Physiotherapist, Lab Technician, Ambulance, Caretaker
  specialization?: string; // Provider specialization
  aadharImages?: File[];
  documentation?: File[];
  
  // Ambulance specific fields
  ambulanceType?: string;
  medicalEquipment?: string[];
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  driverLicenseNumber?: string;
  driverName?: string;
  driverMobileNo?: string;
  serviceArea?: string;
  availabilityType?: string;
  baseCharges?: string;
  perKmCharge?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  policeVerificationStatus?: string;
  profileImage?: File;
  fees?: string;
  experience?: string;
  caretakerServiceType?: string;
  gender?: string;
  age?: string;
  qualification?: string;
  languagesKnown?: string;
  availableServiceArea?: string;
  availabilityDays?: string;
  availabilityStartTime?: string;
  availabilityEndTime?: string;
  
  // Lab Technician fields
  labServiceType?: string;
  labName?: string;
  availableTests?: string[];
  homeSampleCollection?: string;
  labExperience?: string;
  labServiceArea?: string;
  reportDeliveryTime?: string;
  certificationStatus?: string;
  contactPersonName?: string;
  labContactNumber?: string;
  labEmergencyContactNumber?: string;
  labRegistrationCertificate?: File;
  nablCertificate?: File[];

  rcDocument?: File;
  driverLicenseDocument?: File;
  ambulancePhoto?: File;
  panCardPhoto?: File;
  cancelledChequePhoto?: File;
  policeVerificationDocument?: File;
  latitude?: number;
  longitude?: number;
  address?: string;
  referralCode?: string;
  acceptedLegalDocumentIds?: string[];
}

// Payment Types
export interface Payment {
  _id: string;
  patientId: {
    _id: string;
    name: string;
    email: string;
    mobile?: string;
  };
  providerId: {
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    category: string;
    specialization: string;
    fees: number;
  };
  appointmentId: {
    _id: string;
    date: string;
    timeSlot: string;
    status: string;
  };
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  baseAmount: number;
  platformCommission: number;
  gstAmount: number;
  travelFare?: number;
  totalAmount: number;
  providerAmount: number;
  platformRevenue: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  isTestPayment: boolean;
  payoutStatus: 'pending' | 'processing' | 'completed' | 'failed';
  refundReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentStats {
  totalRevenue: number;
  platformRevenue: number;
  completedPayments: number;
  pendingPayments: number;
  refundedPayments: number;
}
