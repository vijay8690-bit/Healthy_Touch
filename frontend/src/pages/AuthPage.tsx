import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Mail, Phone, Lock, ArrowRight, User, Stethoscope, UserCheck, Shield, Activity, Eye, EyeOff, Upload, FileText, CreditCard, X, MapPin, Loader2, Gift } from 'lucide-react';
import { LocationSearchInput } from '@/components/ui/LocationSearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/api.types';
import { authService } from '@/services';
import { RegisterData } from '@/types/api.types';
import { useLocation as useUserLocation } from '@/contexts/LocationContext';
import { getLegalDocumentPath, getProviderAgreementSlugs, getPublicLegalDocuments, type LegalDocument } from '@/services/legalDocument.service';
import { FEATURES } from '@/config/features';

type AuthMode = 'login' | 'register';
type ProviderType = 'doctor' | 'nurse' | 'Lab' | 'physiotherapy' | 'ambulance' | 'caretaker';
type AuthAudience = 'patient' | 'provider' | 'admin';
type PatientPasswordlessStep = 'identifier' | 'otp' | 'profile';

// const getRoleCards = (mode: AuthMode) => {
//   const cards = [
//     {
//       role: 'patient' as UserRole,
//       icon: User,
//       title: 'Patient',
//       description: 'Book appointments and manage your health records',
//     },
//     {
//       role: 'provider' as const,
//       icon: Stethoscope,
//       title: 'Provider',
//       description: 'Doctor, Nurse, Lab, Physiotherapy or Ambulance - Offer your services',
//     },
//   ];

//   // Add admin option only for login mode
//   if (mode === 'login') {
//     cards.push({
//       role: 'admin' as UserRole,
//       icon: Shield,
//       title: 'Admin',
//       description: 'Manage platform, users and providers',
//     });
//   }

//   return cards;
// };


const getRoleCards = (mode: AuthMode) => {
  return [
    {
      role: 'patient' as UserRole,
      icon: User,
      title: 'Patient',
      description: 'Book appointments and manage your health records',
    },
  ];
};



import { AmbulanceIcon } from 'lucide-react';

const providerTypes = [
  ...(FEATURES.DOCTOR_MODULE
    ? [{
      type: 'doctor' as ProviderType,
      icon: Stethoscope,
      title: 'Doctor',
      description: 'Medical consultations'
    }]
    : []),

  {
    type: 'nurse' as ProviderType,
    icon: Heart,
    title: 'Nurse',
    description: 'Nursing care services'
  },

  {
    type: 'caretaker' as ProviderType,
    icon: UserCheck,
    title: 'GDA Care Taker',
    description: 'Elder care, patient care and home assistance'
  },

  ...(FEATURES.LAB_MODULE
    ? [{
      type: 'Lab' as ProviderType,
      icon: UserCheck,
      title: 'Lab',
      description: 'Diagnostic & lab services'
    }]
    : []),

  {
    type: 'physiotherapy' as ProviderType,
    icon: Activity,
    title: 'Physiotherapy',
    description: 'Physical therapy services'
  },

  ...(FEATURES.AMBULANCE_MODULE
    ? [{
      type: 'ambulance' as ProviderType,
      icon: AmbulanceIcon,
      title: 'Ambulance',
      description: 'Emergency & Transport Services'
    }]
    : []),
];

interface AuthPageProps {
  audience?: AuthAudience;
  defaultMode?: AuthMode;
}

const getInitialStep = (audience?: AuthAudience) => {
  if (audience === 'provider') return 1.5;
  if (audience === 'patient' || audience === 'admin') return 2;
  return 1;
};

const getInitialRole = (audience?: AuthAudience): UserRole | 'provider' | null => {
  if (audience === 'patient') return 'patient';
  if (audience === 'provider') return 'provider';
  if (audience === 'admin') return 'admin';
  return null;
};

export default function AuthPage({ audience = 'patient', defaultMode }: AuthPageProps) {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken') || searchParams.get('token') || searchParams.get('reset_token') || '';
  const resolvedDefaultMode: AuthMode = audience === 'admin'
    ? 'login'
    : defaultMode || (searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [mode, setMode] = useState<AuthMode>(resolvedDefaultMode);
  const [step, setStep] = useState(getInitialStep(audience));
  const [selectedRole, setSelectedRole] = useState<UserRole | 'provider' | null>(getInitialRole(audience));
  const [selectedProviderType, setSelectedProviderType] = useState<ProviderType | null>(null);
  const [patientStep, setPatientStep] = useState<PatientPasswordlessStep>('identifier');
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [patientOtp, setPatientOtp] = useState(['', '', '', '', '', '']);
  const [patientUserId, setPatientUserId] = useState('');
  const [patientProfileToken, setPatientProfileToken] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const isAmbulanceProvider = selectedProviderType === 'ambulance';
  const isCaretakerProvider = selectedProviderType === 'caretaker';
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const [acceptedProviderAgreement, setAcceptedProviderAgreement] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: '',
    specialization: '',
    otp: ['', '', '', '', '', ''],
    // Ambulance Specific Fields
    ambulanceType: '',
    medicalEquipment: [] as string[],
    vehicleNumber: '',
    vehicleModel: '',
    vehicleYear: '',
    driverLicenseNumber: '',
    driverName: '',
    driverMobileNo: '',
    serviceArea: '',
    availabilityType: '',
    baseCharges: '',
    perKmCharge: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    policeVerificationStatus: '',
    // Lab Specific Fields
    labServiceType: '',
    labName: '',
    availableTests: [] as string[],
    homeSampleCollection: '',
    labExperience: '',
    labServiceArea: '',
    reportDeliveryTime: '',
    certificationStatus: '',
    contactPersonName: '',
    labContactNumber: '',
    labEmergencyContactNumber: '',
    fees: '',
    experience: '',
    caretakerServiceType: '',
    gender: '',
    age: '',
    qualification: '',
    languagesKnown: '',
    availableServiceArea: '',
    availabilityDays: '',
    availabilityStartTime: '',
    availabilityEndTime: '',
  });
  const [showOtp, setShowOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [heroImage, setHeroImage] = useState('/nursing-care.jpg');
  const [isLoading, setIsLoading] = useState(false);
  const showLabAvailableServices = formData.labServiceType === 'Radiology Centre (Lab)' || formData.labServiceType === 'Both';

  const { location: userLocation, hasLocation, setLocation } = useUserLocation();
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // File uploads for providers
  const [aadhaarFiles, setAadhaarFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [ambulanceFiles, setAmbulanceFiles] = useState<{
    rcDocument?: File;
    driverLicenseDocument?: File;
    ambulancePhoto?: File;
    panCardPhoto?: File;
    cancelledChequePhoto?: File;
    policeVerificationDocument?: File;
  }>({});

  const [labFiles, setLabFiles] = useState<{
    labRegistrationCertificate?: File;
    nablCertificate?: File[];
    panCardPhoto?: File;
    cancelledChequePhoto?: File;
    policeVerificationDocument?: File;
  }>({});

  const [caretakerFiles, setCaretakerFiles] = useState<{
    profileImage?: File;
    policeVerificationDocument?: File;
    panCardPhoto?: File;
    cancelledChequePhoto?: File;
  }>({});

  // Validation errors
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    aadhaar: '',
    document: '',
  });

  const { login, setUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const routerLocation = useLocation();
  const state = routerLocation.state as any;

  useEffect(() => {
    if (!state?.verified) return;

    setMode('login');
    setFormData((prev) => ({
      ...prev,
      email: state.email || prev.email,
    }));

    if (audience === 'provider' && state.providerType) {
      setSelectedRole('provider');
      setSelectedProviderType(state.providerType as ProviderType);
      setStep(2);
    }
  }, [audience, state?.email, state?.providerType, state?.verified]);

  const handleForgotPassword = async () => {
    const email = formData.email.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      toast({
        title: 'Email required',
        description: 'Please enter your registered email address first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setForgotLoading(true);
      const response = await authService.forgotPassword(email);
      toast({
        title: 'Password Reset',
        description: response.message || 'Password reset link has been sent to your email.',
      });

      if (response.resetUrl) {
        console.info('Password reset URL:', response.resetUrl);
      }
    } catch (error: any) {
      toast({
        title: 'Reset Failed',
        description: error?.message || 'Unable to send password reset email.',
        variant: 'destructive',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirm password must match.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setResetLoading(true);
      const response = await authService.resetPassword(resetToken, newPassword);
      toast({
        title: 'Password Updated',
        description: response.message || 'Please login with your new password.',
      });
      setNewPassword('');
      setConfirmPassword('');
      navigate('/auth', { replace: true });
    } catch (error: any) {
      toast({
        title: 'Reset Failed',
        description: error?.message || 'Password reset link is invalid or expired.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const captureAndSaveLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location Not Supported',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    setIsCapturingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);

        const payload = { latitude, longitude, address };
        setLocation(payload);
        sessionStorage.setItem('user_location_session', JSON.stringify({ ...payload, timestamp: Date.now() }));

        toast({
          title: 'Location Saved',
          description: address,
        });

        setIsCapturingLocation(false);
      },
      () => {
        toast({
          title: 'Location Required',
          description: 'Allow location access for Login/Register to proceed.',
          variant: 'destructive',
        });
        setIsCapturingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone number (10 digits)
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  // Validate password (minimum 8 characters)
  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  // Handle file upload for Aadhaar (multiple files)
  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
      const MAX_DOC_BYTES = 5 * 1024 * 1024;
      // Allow: image + PDF
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));

      const oversizeFiles = files.filter((file) => {
        const maxBytes = file.type?.startsWith('image/') ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
        return file.size > maxBytes;
      });

      if (invalidFiles.length > 0) {
        setErrors({ ...errors, aadhaar: 'Only JPG, JPEG, PNG, WEBP or PDF files are allowed' });
        return;
      }

      if (oversizeFiles.length > 0) {
        setErrors({ ...errors, aadhaar: 'Images must be 3MB or less, PDFs must be 5MB or less' });
        return;
      }

      setAadhaarFiles(files);
      setErrors({ ...errors, aadhaar: '' });
    }
  };

  // Handle file upload for Documents (multiple files)
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
      const MAX_DOC_BYTES = 5 * 1024 * 1024;
      // Allow: image + PDF (and keep DOC/DOCX support)
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));

      const oversizeFiles = files.filter((file) => {
        const maxBytes = file.type?.startsWith('image/') ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
        return file.size > maxBytes;
      });

      if (invalidFiles.length > 0) {
        setErrors({ ...errors, document: 'Only images, PDF, DOC, DOCX files are allowed' });
        return;
      }

      if (oversizeFiles.length > 0) {
        setErrors({ ...errors, document: 'Images must be 3MB or less, documents must be 5MB or less' });
        return;
      }

      setDocumentFiles(files);
      setErrors({ ...errors, document: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalRole: UserRole;
    if (selectedRole === 'provider' && selectedProviderType) {
      finalRole = selectedProviderType as UserRole;
    } else if (selectedRole === 'patient') {
      finalRole = 'patient';
    } else if (selectedRole === 'admin') {
      finalRole = 'admin';
    } else if (mode === 'login') {
      // For login mode, if no role is selected, we'll let backend determine the role
      // This allows direct login without role selection
      finalRole = '' as UserRole; // Will be ignored in login flow
    } else {
      toast({
        title: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    // Location is mandatory when a provider registers; login can proceed without forcing location.
    if (mode === 'register' && selectedRole === 'provider' && !hasLocation) {
      toast({
        title: 'Location Required',
        description: 'Allow location access or search your location before provider registration.',
        variant: 'destructive',
      });
      return;
    }

    // Validation for registration
    if (mode === 'register') {
      const newErrors = {
        name: '',
        email: '',
        password: '',
        phone: '',
        specialization: '',
        aadhaar: '',
        document: '',
      };

      // Validate name
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }

      // Validate email
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      // Validate password
      if (loginMethod === 'email') {
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (!validatePassword(formData.password)) {
          newErrors.password = 'Password must be at least 8 characters';
        }
      }

      // Validate phone
      if (!formData.phone) {
        newErrors.phone = 'Mobile number is required';
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'Mobile number must be exactly 10 digits';
      }

      // Validate file uploads for providers
      if (selectedRole === 'provider') {
        if (aadhaarFiles.length === 0) {
          newErrors.aadhaar = 'Aadhaar card file(s) are required';
        }
        if (documentFiles.length === 0) {
          newErrors.document = 'Document upload is required';
        }
        if (!acceptedProviderAgreement) {
          toast({
            title: 'Agreement required',
            description: 'Please accept the required legal documents before registering.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Check if there are any errors
      if (Object.values(newErrors).some((error) => error !== '')) {
        setErrors(newErrors);
        toast({
          title: 'Validation Error',
          description: 'Please fix all errors before proceeding',
          variant: 'destructive',
        });
        return;
      }

      // Call register API
      try {
        setIsLoading(true);

        // Map provider type to category (matching backend enum)
        const categoryMapping: Record<ProviderType, string> = {
          'doctor': 'Doctor',
          'nurse': 'Nurse',
          'physiotherapy': 'Physiotherapist',
          'Lab': 'Lab Technician',
          'ambulance': 'Ambulance',
          'caretaker': 'Caretaker',
        };

        // Prepare registration data
        const registrationData: RegisterData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          mobile: formData.phone,
          role: selectedRole === 'provider' ? 'provider' as UserRole : 'patient',
        };

        if (formData.referralCode.trim()) {
          registrationData.referralCode = formData.referralCode.trim().toUpperCase();
        }

        if (hasLocation && userLocation) {
          registrationData.latitude = userLocation.latitude;
          registrationData.longitude = userLocation.longitude;
          registrationData.address = userLocation.address || '';
        }

        // For providers, include category and files
        if (selectedRole === 'provider' && selectedProviderType) {
          registrationData.category = categoryMapping[selectedProviderType];
          registrationData.specialization = formData.specialization || categoryMapping[selectedProviderType]; // Use specialization or fallback to category
          registrationData.aadharImages = aadhaarFiles;
          registrationData.documentation = documentFiles;
          const requiredAgreementSlugs = getProviderAgreementSlugs(selectedProviderType);
          const acceptedAgreementIds = requiredAgreementSlugs
            .map((slug) => legalDocs.find((doc) => doc.slug === slug && doc.isActive)?._id)
            .filter(Boolean) as string[];
          registrationData.acceptedLegalDocumentIds =
            acceptedAgreementIds.length === requiredAgreementSlugs.length
              ? acceptedAgreementIds
              : requiredAgreementSlugs;

          if (selectedProviderType === 'ambulance') {
            Object.assign(registrationData, {
              ambulanceType: formData.ambulanceType,
              medicalEquipment: formData.medicalEquipment,
              vehicleNumber: formData.vehicleNumber,
              vehicleModel: formData.vehicleModel,
              vehicleYear: formData.vehicleYear,
              driverLicenseNumber: formData.driverLicenseNumber,
              driverName: formData.driverName,
              driverMobileNo: formData.driverMobileNo,
              serviceArea: formData.serviceArea,
              availabilityType: formData.availabilityType,
              baseCharges: formData.baseCharges,
              perKmCharge: formData.perKmCharge,
              bankAccountNumber: formData.bankAccountNumber,
              bankIfscCode: formData.bankIfscCode,
              policeVerificationStatus: formData.policeVerificationStatus,
              ...ambulanceFiles
            });
          }

          if (selectedProviderType === 'Lab') {
            Object.assign(registrationData, {
              labServiceType: formData.labServiceType,
              labName: formData.labName,
              availableTests: formData.availableTests,
              homeSampleCollection: formData.homeSampleCollection,
              labExperience: formData.labExperience,
              labServiceArea: formData.labServiceArea,
              reportDeliveryTime: formData.reportDeliveryTime,
              certificationStatus: formData.certificationStatus,
              contactPersonName: formData.contactPersonName,
              labContactNumber: formData.labContactNumber,
              labEmergencyContactNumber: formData.labEmergencyContactNumber,
              bankAccountNumber: formData.bankAccountNumber,
              bankIfscCode: formData.bankIfscCode,
              policeVerificationStatus: formData.policeVerificationStatus,
              ...labFiles
            });
          }

          if (selectedProviderType === 'caretaker') {
            Object.assign(registrationData, {
              specialization: formData.caretakerServiceType || 'GDA Care Taker',
              fees: formData.fees || 0,
              experience: formData.experience,
              caretakerServiceType: formData.caretakerServiceType,
              gender: formData.gender,
              age: formData.age,
              qualification: formData.qualification,
              languagesKnown: formData.languagesKnown,
              availableServiceArea: formData.availableServiceArea,
              serviceArea: formData.availableServiceArea,
              availabilityDays: formData.availabilityDays,
              availabilityStartTime: formData.availabilityStartTime,
              availabilityEndTime: formData.availabilityEndTime,
              bankAccountNumber: formData.bankAccountNumber,
              bankIfscCode: formData.bankIfscCode,
              policeVerificationStatus: formData.policeVerificationStatus,
              ...caretakerFiles
            });
          }
        }

        // Call the registration service
        const response = await authService.register(registrationData);

        toast({
          title: 'Account created!',
          description: 'Please verify your email to continue',
        });

        // Navigate to OTP verification with userId
        // Handle both response.userId and response.data.userId formats
        const userId = response.userId || response.data?.userId;

        navigate('/otp-verification', {
          state: {
            userId: userId,
            email: formData.email,
            role: finalRole,
            providerType: selectedRole === 'provider' ? selectedProviderType : undefined,
            name: formData.name,
          },
        });

      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // Login flow
    try {
      setIsLoading(true);

      // Prepare login credentials with role and category
      let loginRole: string | undefined;
      let loginCategory: string | undefined;

      // Set role based on selection
      if (selectedRole === 'provider') {
        loginRole = 'provider';

        // Map provider type to category
        if (selectedProviderType) {
          const categoryMapping: Record<ProviderType, string> = {
            'doctor': 'Doctor',
            'nurse': 'Nurse',
            'physiotherapy': 'Physiotherapist',
            'Lab': 'Lab Technician',
            'ambulance': 'Ambulance',
            'caretaker': 'Caretaker',
          };
          loginCategory = categoryMapping[selectedProviderType];
        }
      } else if (selectedRole === 'patient') {
        loginRole = 'patient';
      } else if (selectedRole === 'admin') {
        loginRole = 'admin';
      }

      // Call login with role and category for backend validation
      await login(formData.email || formData.phone, formData.password, loginRole, loginCategory);

      // The AuthContext will set the user, we can read it from localStorage
      const userStr = localStorage.getItem('healthytouch_user');
      if (userStr) {
        const user = JSON.parse(userStr);

        // If a specific role was selected, validate it matches
        if (selectedRole && selectedRole !== 'provider') {
          // For patient or admin, check exact match
          if (user.role !== selectedRole) {
            // Role mismatch - logout and show error
            localStorage.removeItem('healthytouch_token');
            localStorage.removeItem('healthytouch_user');

            toast({
              title: 'Login Failed',
              description: `This account is registered as ${user.role}. Please select the correct role.`,
              variant: 'destructive',
            });

            setIsLoading(false);
            return;
          }
        }

        // For providers, validate category if provider type was selected
        if (user.role === 'provider' && selectedProviderType) {
          const categoryMapping: Record<ProviderType, string> = {
            'doctor': 'Doctor',
            'nurse': 'Nurse',
            'physiotherapy': 'Physiotherapist',
            'Lab': 'Lab Technician',
            'ambulance': 'Ambulance',
            'caretaker': 'Caretaker',
          };

          const expectedCategory = categoryMapping[selectedProviderType];

          if (user.providerCategory && user.providerCategory !== expectedCategory) {
            // Category mismatch - logout and show error
            localStorage.removeItem('healthytouch_token');
            localStorage.removeItem('healthytouch_user');

            toast({
              title: 'Login Failed',
              description: `This provider account is registered as ${user.providerCategory}. Please select the correct provider type.`,
              variant: 'destructive',
            });

            setIsLoading(false);
            return;
          }
        }

        toast({
          title: 'Welcome back!',
          description: 'Redirecting to your dashboard...',
        });

        setTimeout(() => {
          const redirectTo = state?.redirectTo;

          if (user.role === 'patient') {
            navigate(redirectTo || '/patient/dashboard', {
              state: {
                openBooking: true,
                providerData: state?.providerData,
              },
            });

          } else if (user.role === 'provider') {
            navigate(user.needsProviderProfile ? '/provider/profile' : (redirectTo || '/provider/dashboard'));

          } else if (user.role === 'admin') {
            navigate(redirectTo || '/admin/dashboard');

          } else {

            navigate('/');

          }

        }, 500);
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const redirectPatient = () => {
    const redirectTo = state?.redirectTo;
    navigate(redirectTo || '/patient/dashboard', {
      state: {
        openBooking: true,
        providerData: state?.providerData,
      },
    });
  };

  const normalizePatientIdentifier = (value: string) => {
    return value.trim().toLowerCase();
  };

  const validatePatientIdentifier = (value: string) => {
    return validateEmail(value);
  };

  const handlePatientStart = async (event: React.FormEvent) => {
    event.preventDefault();

    const identifier = normalizePatientIdentifier(patientIdentifier);
    if (!identifier || !validatePatientIdentifier(identifier)) {
      toast({
        title: 'Enter email address',
        description: 'Use a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.startPatientPasswordless(identifier);
      setPatientUserId(response.userId || response.data?.userId || '');
      setPatientEmail(response.email || identifier);
      setPatientOtp(['', '', '', '', '', '']);
      setPatientStep('otp');
      toast({
        title: 'OTP Sent',
        description: response.message || 'OTP has been sent to your email.',
      });
    } catch (error: any) {
      toast({
        title: 'Unable to continue',
        description: error?.message || 'Could not send OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const nextOtp = [...patientOtp];
      nextOtp[index] = value;
      setPatientOtp(nextOtp);

      if (value && index < 5) {
        document.getElementById(`patient-otp-${index + 1}`)?.focus();
      }
    }
  };

  const handlePatientOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const nextOtp = [...patientOtp];

      if (nextOtp[index]) {
        nextOtp[index] = '';
        setPatientOtp(nextOtp);
        return;
      }

      if (index > 0) {
        nextOtp[index - 1] = '';
        setPatientOtp(nextOtp);
        document.getElementById(`patient-otp-${index - 1}`)?.focus();
      }
    }

    if (event.key === 'Delete' && patientOtp[index]) {
      event.preventDefault();
      const nextOtp = [...patientOtp];
      nextOtp[index] = '';
      setPatientOtp(nextOtp);
    }
  };

  const handlePatientVerify = async (event: React.FormEvent) => {
    event.preventDefault();

    const otpValue = patientOtp.join('');
    if (!patientUserId || otpValue.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6 digit OTP.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.verifyPatientPasswordless(patientUserId, otpValue);

      if (response.needsProfileCompletion && response.profileToken) {
        setPatientProfileToken(response.profileToken);
        setPatientEmail(response.email || patientEmail);
        setPatientStep('profile');
        toast({
          title: 'OTP Verified',
          description: 'Complete your profile to continue.',
        });
        return;
      }

      if (response.user) {
        setUser(response.user);
        toast({
          title: 'Welcome back!',
          description: 'Redirecting to your dashboard...',
        });
        redirectPatient();
      }
    } catch (error: any) {
      toast({
        title: 'OTP verification failed',
        description: error?.message || 'Please check the OTP and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientCompleteProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Full name required',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.trim())) {
      toast({
        title: 'Mobile number required',
        description: 'Please enter a valid 10 digit mobile number.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasLocation) {
      toast({
        title: 'Location Required',
        description: 'Allow location access or search your location to continue.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.completePatientPasswordlessProfile({
        profileToken: patientProfileToken,
        name: formData.name.trim(),
        mobile: formData.phone.trim(),
        gender: formData.gender || undefined,
        referralCode: formData.referralCode.trim() || undefined,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        address: userLocation?.address || '',
      });

      if (response.user) {
        setUser(response.user);
      }

      toast({
        title: 'Profile completed',
        description: 'Redirecting to your dashboard...',
      });
      redirectPatient();
    } catch (error: any) {
      toast({
        title: 'Profile completion failed',
        description: error?.error || error?.message || 'Please review your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...formData.otp];
      newOtp[index] = value;
      setFormData({ ...formData, otp: newOtp });

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleSendOtp = () => {
    setShowOtp(true);
    toast({
      title: 'OTP Sent!',
      description: `A verification code has been sent to your ${loginMethod}.`,
    });
  };

  const handleRoleSelect = (role: UserRole | 'provider') => {
    setSelectedRole(role);
    // For provider, always show provider type selection
    // For patient/admin, go directly to form
    if (role === 'provider') {
      setStep(1.5);
    } else {
      setStep(2);
    }
  };

  const handleProviderTypeSelect = (type: ProviderType) => {
    setSelectedProviderType(type);
    setAcceptedProviderAgreement(false);

    // Update hero background image based on provider type
    switch (type) {
      case 'ambulance':
        setHeroImage('https://images.unsplash.com/photo-1587559070757-f72a388edbba?w=800&h=600&fit=crop');
        break;
      case 'doctor':
        setHeroImage('/doctor counsaltancy.jpg');
        break;
      case 'nurse':
        setHeroImage('/nursing-care.jpg');
        break;
      case 'Lab':
        setHeroImage('https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop');
        break;
      case 'physiotherapy':
        setHeroImage('/physiotherapy at home.png');
        break;
      case 'caretaker':
        setHeroImage('/careTakcer.jpg');
        break;
      default:
        setHeroImage('/nursing-care.jpg');
    }

    setStep(2);
  };

  const resetToAudienceStart = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep(getInitialStep(audience));
    setSelectedRole(getInitialRole(audience));
    setSelectedProviderType(null);
    setAcceptedProviderAgreement(false);
  };

  const showModeToggle = audience !== 'admin';

  useEffect(() => {
    if (mode === 'register' && selectedRole === 'provider') {
      getPublicLegalDocuments().then(setLegalDocs).catch(() => setLegalDocs([]));
    }
  }, [mode, selectedRole]);
  const showStepBack = audience !== 'patient' && audience !== 'admin';

  return (
    <div className="flex min-h-[100svh] w-full overflow-x-hidden bg-background lg:h-[100dvh] lg:overflow-hidden">
      {/* Left Panel - Form */}
      <div className="flex min-h-[100svh] flex-1 flex-col overflow-y-auto p-4 sm:p-6 md:p-8 lg:h-full lg:min-h-0">
        <div className="my-auto flex flex-[1_0_auto] items-center justify-center py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md"
          >
            {/* Logo */}
            <Link to="/" className="flex items-center justify-center mb-6">
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-foreground leading-tight">
                Healthy Touch
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">
                A care that never quit...
              </span>
            </div> */}

              <img src="/healthy-touch-logo.png" className="h-16 sm:h-20" alt="Healthy Touch" />
            </Link>

            {resetToken ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="font-display text-2xl font-bold mb-2">Reset your password</h1>
                  <p className="text-muted-foreground">Enter a new password for your account.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="pl-10 h-12"
                        placeholder="Minimum 8 characters"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="pl-10 h-12"
                        placeholder="Re-enter new password"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        Update Password
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            ) : audience === 'patient' ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {patientStep === 'identifier' && (
                  <>
                    <div>
                      <h1 className="font-display text-2xl font-bold mb-2">Login or Signup</h1>
                      <p className="text-muted-foreground">Enter your email address.</p>
                    </div>

                    <form onSubmit={handlePatientStart} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="patientIdentifier">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="patientIdentifier"
                            type="email"
                            inputMode="email"
                            placeholder="you@example.com"
                            value={patientIdentifier}
                            onChange={(event) => setPatientIdentifier(event.target.value)}
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}

                {patientStep === 'otp' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPatientStep('identifier')}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Back
                    </button>

                    <div>
                      <h1 className="font-display text-2xl font-bold mb-2">Enter OTP</h1>
                      <p className="text-muted-foreground">We sent a 6 digit code to {patientEmail}.</p>
                    </div>

                    <form onSubmit={handlePatientVerify} className="space-y-5">
                      <div className="flex gap-2 justify-between">
                        {patientOtp.map((digit, index) => (
                          <Input
                            key={index}
                            id={`patient-otp-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(event) => handlePatientOtpChange(index, event.target.value)}
                            onKeyDown={(event) => handlePatientOtpKeyDown(index, event)}
                            className="h-12 w-12 text-center text-lg font-semibold"
                          />
                        ))}
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify & Continue
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}

                {patientStep === 'profile' && (
                  <>
                    <div>
                      <h1 className="font-display text-2xl font-bold mb-2">Complete Profile</h1>
                      <p className="text-muted-foreground">Add your details to finish creating your patient account.</p>
                    </div>

                    <form onSubmit={handlePatientCompleteProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="patientName">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="patientName"
                            name="name"
                            type="text"
                            placeholder="Full name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={patientEmail} className="h-12 bg-muted" disabled />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patientPhone">Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="patientPhone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="10 digit mobile number"
                            value={formData.phone}
                            onChange={(event) => {
                              const value = event.target.value.replace(/\D/g, '').slice(0, 10);
                              setFormData({ ...formData, phone: value });
                            }}
                            className="pl-10 h-12"
                            maxLength={10}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patientGender">Gender (Optional)</Label>
                        <select
                          id="patientGender"
                          value={formData.gender}
                          onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
                          className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="patientReferralCode">Referral Code (Optional)</Label>
                        <div className="relative">
                          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="patientReferralCode"
                            name="referralCode"
                            type="text"
                            placeholder="Enter referral code"
                            value={formData.referralCode}
                            onChange={(event) => setFormData({ ...formData, referralCode: event.target.value.replace(/\s/g, '').toUpperCase() })}
                            className="pl-10 h-12 uppercase"
                          />
                        </div>
                      </div>

                      <div className={`rounded-xl border p-3 ${hasLocation ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <MapPin className={`w-5 h-5 mt-0.5 ${hasLocation ? 'text-green-700' : 'text-amber-700'}`} />
                            <div>
                              <p className="text-sm font-medium">{hasLocation ? 'Location saved' : 'Location required'}</p>
                              <p className="text-xs text-muted-foreground">
                                {hasLocation
                                  ? (userLocation?.address || `${userLocation?.latitude?.toFixed?.(6)}, ${userLocation?.longitude?.toFixed?.(6)}`)
                                  : 'Allow location access or search manually.'}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={captureAndSaveLocation}
                            disabled={isCapturingLocation}
                            className="shrink-0"
                          >
                            {isCapturingLocation ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Saving
                              </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4 mr-1" />
                                {hasLocation ? 'Update' : 'Allow'}
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/50">
                          <Label className="text-xs font-semibold mb-2 block">Or search location manually:</Label>
                          <LocationSearchInput
                            placeholder="Type your area, city..."
                            onLocationSelect={(lat, lng, address) => {
                              const payload = { latitude: lat, longitude: lng, address };
                              setLocation(payload);
                              sessionStorage.setItem('user_location_session', JSON.stringify({ ...payload, timestamp: Date.now() }));
                            }}
                          />
                        </div>
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            Complete & Continue
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </motion.div>
            ) : (
              <>
                {/* Mode Toggle */}
                {showModeToggle && (
                  <div className="mb-6 flex rounded-xl bg-muted p-1 sm:mb-8">
                    <button
                      onClick={() => resetToAudienceStart('login')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => resetToAudienceStart('register')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                      Register
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {/* Step 1: Role Selection */}
                  {step === 1 && (
                    <motion.div
                      key="role-selection"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h1 className="font-display text-2xl font-bold mb-2">
                        {mode === 'login' ? 'Welcome back!' : 'Join Healthy Touch'}
                      </h1>
                      <p className="text-muted-foreground mb-6">
                        Continue as a patient to access Healthy Touch services.
                      </p>

                      <div className="space-y-3">
                        {getRoleCards(mode).map((card) => (
                          <button
                            key={card.role}
                            onClick={() => handleRoleSelect(card.role)}
                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${selectedRole === card.role
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                              }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === card.role ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                <card.icon className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-display font-semibold">{card.title}</h3>
                                <p className="text-sm text-muted-foreground">{card.description}</p>
                              </div>
                              <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* {mode === 'login' && (
                    <button
                      onClick={() => { login('admin@demo.com', 'admin'); navigate('/admin/dashboard'); }}
                      className="w-full mt-4 p-3 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-primary/50 transition-colors"
                    >
                      <Shield className="w-4 h-4 inline mr-2" />
                      Admin Login (Demo)
                    </button>
                  )} */}
                    </motion.div>
                  )}

                  {/* Step 1.5: Provider Type Selection */}
                  {step === 1.5 && (
                    <motion.div
                      key="provider-type"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <button
                        onClick={() => setStep(getInitialStep(audience))}
                        className="hidden"
                      >
                        Back to role selection
                      </button>

                      <h1 className="font-display text-2xl font-bold mb-2">Select Provider Type</h1>
                      <p className="text-muted-foreground mb-6">What type of healthcare service do you provide?</p>

                      <div className="space-y-3">
                        {providerTypes.map((provider) => (
                          <button
                            key={provider.type}
                            onClick={() => handleProviderTypeSelect(provider.type)}
                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${selectedProviderType === provider.type
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                              }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedProviderType === provider.type ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                <provider.icon className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-display font-semibold">{provider.title}</h3>
                                <p className="text-sm text-muted-foreground">{provider.description}</p>
                              </div>
                              <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Login/Register Form */}
                  {step === 2 && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <button
                        onClick={() => setStep(selectedRole === 'provider' ? 1.5 : 1)}
                        className={`text-sm text-muted-foreground hover:text-foreground mb-4 items-center gap-1 ${showStepBack ? 'flex' : 'hidden'}`}
                      >
                        ← Back
                      </button>

                      <h1 className="font-display text-2xl font-bold mb-2">
                        {audience === 'admin'
                          ? 'Admin login'
                          : mode === 'login'
                            ? 'Sign in to your account'
                            : 'Create your account'}
                      </h1>
                      <p className="text-muted-foreground mb-6">
                        {audience === 'admin'
                          ? 'Enter admin credentials to continue'
                          : mode === 'login'
                            ? 'Enter your credentials to continue'
                            : 'Fill in your details to get started'}
                      </p>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Location Gate (mandatory for patient/provider) */}
                        {selectedRole !== 'admin' && (mode === 'register' || selectedRole === 'patient') && (
                          <div
                            className={`rounded-xl border p-3 ${hasLocation ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                <MapPin className={`w-5 h-5 mt-0.5 ${hasLocation ? 'text-green-700' : 'text-amber-700'}`} />
                                <div>
                                  <p className="text-sm font-medium">
                                    {hasLocation ? 'Location saved' : 'Location required'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {hasLocation
                                      ? (userLocation?.address || `${userLocation?.latitude?.toFixed?.(6)}, ${userLocation?.longitude?.toFixed?.(6)}`)
                                      : 'Please allow access to your location to proceed.'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={captureAndSaveLocation}
                                disabled={isCapturingLocation}
                                className="shrink-0"
                              >
                                {isCapturingLocation ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Saving
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {hasLocation ? 'Update' : 'Allow'}
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border/50">
                              <Label className="text-xs font-semibold mb-2 block">Or search location manually:</Label>
                              <LocationSearchInput
                                placeholder="Type your area, city..."
                                onLocationSelect={(lat, lng, address) => {
                                  const payload = { latitude: lat, longitude: lng, address };
                                  setLocation(payload);
                                  sessionStorage.setItem('user_location_session', JSON.stringify({ ...payload, timestamp: Date.now() }));
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Name Field (for registration only) */}
                        {mode === 'register' && (
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                              <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={`pl-10 h-12 ${errors.name ? 'border-destructive' : ''}`}
                                required
                              />
                            </div>
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                          </div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-2">
                          <Label htmlFor="email">
                            {mode === 'login' ? 'Email or Phone Number' : 'Email Address'}
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              id="email"
                              name="email"
                              type={mode === 'login' ? 'text' : 'email'}
                              placeholder={mode === 'login' ? 'Email or 10-digit mobile number' : 'you@example.com'}
                              value={formData.email}
                              onChange={handleInputChange}
                              className={`pl-10 h-12 ${errors.email ? 'border-destructive' : ''}`}
                              required
                            />
                          </div>
                          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                          {mode === 'login' && (
                            <p className="text-xs text-muted-foreground">Enter your email address or mobile number</p>
                          )}
                        </div>

                        {/* Mobile Number Field - Only for Registration */}
                        {mode === 'register' && (
                          <div className="space-y-2">
                            <Label htmlFor="phone">Mobile Number</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                              <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder={(import.meta.env.VITE_SUPPORT_PHONE || '9887894498').trim()}
                                value={formData.phone}
                                onChange={(e) => {
                                  // Only allow numbers and limit to 10 digits
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  setFormData({ ...formData, phone: value });
                                  if (errors.phone) {
                                    setErrors({ ...errors, phone: '' });
                                  }
                                }}
                                className={`pl-10 h-12 ${errors.phone ? 'border-destructive' : ''}`}
                                maxLength={10}
                                required
                              />
                            </div>
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                          </div>
                        )}

                        {mode === 'register' && (
                          <div className="space-y-2">
                            <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                            <div className="relative">
                              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                              <Input
                                id="referralCode"
                                name="referralCode"
                                type="text"
                                placeholder="Enter referral code"
                                value={formData.referralCode}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\s/g, '').toUpperCase();
                                  setFormData({ ...formData, referralCode: value });
                                }}
                                className="pl-10 h-12 uppercase"
                              />
                            </div>
                          </div>
                        )}

                        {/* Password Field */}
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={formData.password}
                              onChange={handleInputChange}
                              className={`pl-10 pr-10 h-12 ${errors.password ? 'border-destructive' : ''}`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                          {mode === 'register' && (
                            <p className="text-xs text-muted-foreground">Minimum 8 characters required</p>
                          )}
                          {mode === 'login' && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={forgotLoading}
                                className="text-sm text-primary hover:underline"
                              >
                                {forgotLoading ? 'Sending...' : 'Forgot Password?'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* File Uploads for Providers (Registration only) */}
                        {mode === 'register' && selectedRole === 'provider' && (
                          <>
                            {/* Specialization Field (Hidden for Ambulance & Lab Technician) */}
                            {!isAmbulanceProvider && !isCaretakerProvider && (
                              <div className="space-y-2">
                                <Label htmlFor="specialization">Specialization *</Label>
                                <Input
                                  id="specialization"
                                  name="specialization"
                                  type="text"
                                  placeholder="e.g., Cardiologist, Pediatric Nurse, Sports Physiotherapist"
                                  value={formData.specialization}
                                  onChange={handleInputChange}
                                  className={`h-12 ${errors.specialization ? 'border-destructive' : ''}`}
                                  required
                                />
                                {errors.specialization && <p className="text-sm text-destructive">{errors.specialization}</p>}
                                <p className="text-xs text-muted-foreground">Enter your area of expertise</p>
                              </div>
                            )}

                            {isCaretakerProvider && (
                              <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-bold text-primary">GDA Care Taker Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Service Type *</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.caretakerServiceType} onChange={(e) => setFormData(prev => ({ ...prev, caretakerServiceType: e.target.value }))} required>
                                      <option value="">Select service</option>
                                      <option value="Elder Care">Elder Care</option>
                                      <option value="Patient Care">Patient Care</option>
                                      <option value="Post Surgery Care">Post Surgery Care</option>
                                      <option value="Baby Care">Baby Care</option>
                                      <option value="Home Assistance">Home Assistance</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Experience (years) *</Label>
                                    <Input type="number" min="0" value={formData.experience} onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Gender *</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.gender} onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))} required>
                                      <option value="">Select gender</option>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Age *</Label>
                                    <Input type="number" min="18" value={formData.age} onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Qualification / Training *</Label>
                                    <Input value={formData.qualification} onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Languages Known *</Label>
                                    <Input placeholder="Hindi, English" value={formData.languagesKnown} onChange={(e) => setFormData(prev => ({ ...prev, languagesKnown: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Available Service Area *</Label>
                                    <Input placeholder="City, areas" value={formData.availableServiceArea} onChange={(e) => setFormData(prev => ({ ...prev, availableServiceArea: e.target.value }))} required />
                                  </div>
                                  {/* Consultation charges are temporarily hidden for provider registration. */}
                                  {false && <div className="space-y-2">
                                    <Label>Charges / Visit *</Label>
                                    <Input type="number" min="0" value={formData.fees} onChange={(e) => setFormData(prev => ({ ...prev, fees: e.target.value }))} required />
                                  </div>}
                                  <div className="space-y-2 md:col-span-2">
                                    <Label>Availability Days *</Label>
                                    <Input placeholder="Monday, Tuesday, Wednesday" value={formData.availabilityDays} onChange={(e) => setFormData(prev => ({ ...prev, availabilityDays: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Start Time *</Label>
                                    <Input type="time" value={formData.availabilityStartTime} onChange={(e) => setFormData(prev => ({ ...prev, availabilityStartTime: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>End Time *</Label>
                                    <Input type="time" value={formData.availabilityEndTime} onChange={(e) => setFormData(prev => ({ ...prev, availabilityEndTime: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Bank Account Number *</Label>
                                    <Input value={formData.bankAccountNumber} onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>IFSC Code *</Label>
                                    <Input value={formData.bankIfscCode} onChange={(e) => setFormData(prev => ({ ...prev, bankIfscCode: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label>Police Verification Status *</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.policeVerificationStatus} onChange={(e) => setFormData(prev => ({ ...prev, policeVerificationStatus: e.target.value }))} required>
                                      <option value="">Select status</option>
                                      <option value="Done">Done</option>
                                      <option value="Not Done">Not Done</option>
                                      <option value="Ready to Apply">Ready to Apply</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* --- LAB TECHNICIAN SPECIFIC DETAILS --- */}
                            {selectedProviderType === 'Lab' && (
                              <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-bold text-primary">Lab / Centre Details</h3>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Type of Service *</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input px-3" value={formData.labServiceType || ''} onChange={(e) => setFormData(prev => ({ ...prev, labServiceType: e.target.value, availableTests: e.target.value === 'Pathology Centre (Lab)' ? [] : prev.availableTests }))} required>
                                      <option value="">Select</option>
                                      <option value="Pathology Centre (Lab)">Pathology Centre (Lab)</option>
                                      <option value="Radiology Centre (Lab)">Radiology Centre (Lab)</option>
                                      <option value="Both">Both</option>
                                    </select>
                                  </div>
                                  {showLabAvailableServices && (
                                    <div className="space-y-2">
                                      <Label>Available Tests / Services *</Label>
                                      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                        {["Blood Test", "Urine Test", "Full Body Checkup", "Thyroid Test", "Sugar Test", "ECG", "X-Ray", "Other"].map(eq => (
                                          <label key={eq} className="flex items-center gap-2">
                                            <input type="checkbox" checked={formData.availableTests?.includes(eq)} onChange={(e) => {
                                              const tests = formData.availableTests || [];
                                              if (e.target.checked) setFormData(prev => ({ ...prev, availableTests: [...tests, eq] }));
                                              else setFormData(prev => ({ ...prev, availableTests: tests.filter(t => t !== eq) }));
                                            }} /> {eq}
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label>Lab / Centre Name *</Label>
                                    <Input value={formData.labName || ''} onChange={(e) => setFormData(prev => ({ ...prev, labName: e.target.value }))} required />
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Do you provide home sample collection? *</Label>
                                      <select className="flex h-10 w-full rounded-md border border-input px-3" value={formData.homeSampleCollection || ''} onChange={e => setFormData(prev => ({ ...prev, homeSampleCollection: e.target.value }))} required>
                                        <option value="">Select</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Years of Experience *</Label>
                                      <select className="flex h-10 w-full rounded-md border border-input px-3" value={formData.labExperience || ''} onChange={e => setFormData(prev => ({ ...prev, labExperience: e.target.value }))} required>
                                        <option value="">Select</option>
                                        <option value="0-1 Year">0-1 Year</option>
                                        <option value="1-3 Years">1-3 Years</option>
                                        <option value="3+ Years">3+ Years</option>
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Service Area *</Label>
                                      <Input value={formData.labServiceArea || ''} onChange={(e) => setFormData(prev => ({ ...prev, labServiceArea: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Report Delivery Time *</Label>
                                      <select className="flex h-10 w-full rounded-md border border-input px-3" value={formData.reportDeliveryTime || ''} onChange={e => setFormData(prev => ({ ...prev, reportDeliveryTime: e.target.value }))} required>
                                        <option value="">Select</option>
                                        <option value="Same Day">Same Day</option>
                                        <option value="Next Day">Next Day</option>
                                        <option value="2-3 Days">2-3 Days</option>
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Certification Status *</Label>
                                      <select className="flex h-10 w-full rounded-md border border-input px-3" value={formData.certificationStatus || ''} onChange={e => setFormData(prev => ({ ...prev, certificationStatus: e.target.value }))} required>
                                        <option value="">Select</option>
                                        <option value="NABL Certified">NABL Certified</option>
                                        <option value="Not Certified">Not Certified</option>
                                        <option value="In Process">In Process</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>Contact Person Name *</Label><Input value={formData.contactPersonName || ''} onChange={e => setFormData(prev => ({ ...prev, contactPersonName: e.target.value }))} required /></div>
                                    <div className="space-y-2"><Label>Contact Number *</Label><Input value={formData.labContactNumber || ''} onChange={e => setFormData(prev => ({ ...prev, labContactNumber: e.target.value }))} required /></div>
                                    <div className="space-y-2"><Label>Emergency Number *</Label><Input value={formData.labEmergencyContactNumber || ''} onChange={e => setFormData(prev => ({ ...prev, labEmergencyContactNumber: e.target.value }))} required /></div>
                                  </div>
                                </div>

                                <h3 className="text-lg font-bold text-primary mt-8 mb-2">Verification & Documents</h3>
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                  <div className="space-y-2"><Label>Bank Account Number *</Label><Input value={formData.bankAccountNumber || ''} onChange={e => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))} required /></div>
                                  <div className="space-y-2"><Label>IFSC Code *</Label><Input value={formData.bankIfscCode || ''} onChange={e => setFormData(prev => ({ ...prev, bankIfscCode: e.target.value }))} required /></div>
                                  <div className="space-y-2"><Label>Police Verification Status *</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input px-3" value={formData.policeVerificationStatus || ''} onChange={e => setFormData(prev => ({ ...prev, policeVerificationStatus: e.target.value }))} required>
                                      <option value="">Select option</option>
                                      <option value="Done ✅">Done ✅</option>
                                      <option value="Not Done">Not Done</option>
                                      <option value="Ready to Apply">Ready to Apply</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* --- AMBULANCE SPECIFIC DETAILS --- */}
                            {isAmbulanceProvider && (
                              <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-bold text-primary">Ambulance Service Details</h3>
                                <p className="text-xs text-muted-foreground mb-4">Please provide accurate details about your ambulance service. Only verified and active ambulance providers will be approved. Ensure vehicle and driver information is correct for faster onboarding.</p>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Ambulance Type *</Label>
                                    <select
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      value={formData.ambulanceType || ''}
                                      onChange={(e) => setFormData(prev => ({ ...prev, ambulanceType: e.target.value }))}
                                      required
                                    >
                                      <option value="">Select Option</option>
                                      <option value="Basic Life Support (BLS) Ambulance">Basic Life Support (BLS) Ambulance</option>
                                      <option value="Advanced Life Support (ALS) Ambulance">Advanced Life Support (ALS) Ambulance</option>
                                      <option value="ICU Ambulance">ICU Ambulance</option>
                                      <option value="Dead Body Transport Ambulance">Dead Body Transport Ambulance</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Medical Equipment Available *</Label>
                                    <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                      {["Oxygen Cylinder", "Ventilator", "Cardiac Monitor", "Stretcher", "First Aid Kit"].map(eq => (
                                        <label key={eq} className="flex items-center gap-2">
                                          <input type="checkbox" checked={formData.medicalEquipment?.includes(eq)} onChange={(e) => {
                                            const equipment = formData.medicalEquipment || [];
                                            if (e.target.checked) setFormData(prev => ({ ...prev, medicalEquipment: [...equipment, eq] }));
                                            else setFormData(prev => ({ ...prev, medicalEquipment: equipment.filter((item) => item !== eq) }));
                                          }} /> {eq}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Ambulance Vehicle Number *</Label>
                                      <Input placeholder="e.g. MH01AB1234" value={formData.vehicleNumber || ''} onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Vehicle Model *</Label>
                                      <Input value={formData.vehicleModel || ''} onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Year of Vehicle *</Label>
                                      <Input type="number" min="1990" max="2100" placeholder="YYYY" value={formData.vehicleYear || ''} onChange={(e) => setFormData(prev => ({ ...prev, vehicleYear: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Driver License Number *</Label>
                                      <Input value={formData.driverLicenseNumber || ''} onChange={(e) => setFormData(prev => ({ ...prev, driverLicenseNumber: e.target.value }))} required />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Driver Name *</Label>
                                      <Input value={formData.driverName || ''} onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Driver Mobile No. *</Label>
                                      <Input type="tel" value={formData.driverMobileNo || ''} onChange={(e) => setFormData(prev => ({ ...prev, driverMobileNo: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label>Available Service Area (for ambulance) *</Label>
                                      <Input placeholder="e.g. Mumbai, Suburbs" value={formData.serviceArea || ''} onChange={(e) => setFormData(prev => ({ ...prev, serviceArea: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label>Ambulance Availability *</Label>
                                      <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.availabilityType || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, availabilityType: e.target.value }))}
                                        required
                                      >
                                        <option value="">Select Option</option>
                                        <option value="24/7 Available">24/7 Available</option>
                                        <option value="Day Time Only">Day Time Only</option>
                                        <option value="Night Time Only">Night Time Only</option>
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Base Charges *</Label>
                                      <Input type="number" placeholder="₹" value={formData.baseCharges || ''} onChange={(e) => setFormData(prev => ({ ...prev, baseCharges: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Per KM Charge *</Label>
                                      <Input type="number" placeholder="₹" value={formData.perKmCharge || ''} onChange={(e) => setFormData(prev => ({ ...prev, perKmCharge: e.target.value }))} required />
                                    </div>
                                  </div>
                                </div>

                                <h3 className="text-lg font-bold text-primary mt-8 mb-2">Verification & Documents</h3>
                                <p className="text-xs text-muted-foreground mb-4">Please upload your documents for verification. Your profile will be approved only after successful verification. All details are kept secure and confidential.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="space-y-2">
                                    <Label>Bank Account Number *</Label>
                                    <Input value={formData.bankAccountNumber || ''} onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>IFSC Code *</Label>
                                    <Input value={formData.bankIfscCode || ''} onChange={(e) => setFormData(prev => ({ ...prev, bankIfscCode: e.target.value }))} required />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label>Police Verification Status *</Label>
                                    <select
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      value={formData.policeVerificationStatus || ''}
                                      onChange={(e) => setFormData(prev => ({ ...prev, policeVerificationStatus: e.target.value }))}
                                      required
                                    >
                                      <option value="">Select Option</option>
                                      <option value="Done ✅">Done ✅</option>
                                      <option value="Not Done">Not Done</option>
                                      <option value="Ready to Apply">Ready to Apply</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* --- COMMON AADHAAR CARD UPLOAD --- */}
                            <div className="space-y-2 mt-4">
                              <Label htmlFor="aadhaar">Upload Aadhaar Card (Required up to 5) *</Label>
                              <p className="text-xs text-muted-foreground -mt-1 mb-2">Max 10 MB per file. Image/PDF.</p>
                              <div className="relative">
                                <Input id="aadhaar" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" multiple onChange={handleAadhaarUpload} className="hidden" />
                                <label htmlFor="aadhaar" className={`flex items-center gap-3 px-4 h-12 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${errors.aadhaar ? 'border-destructive' : 'border-border hover:border-primary'}`}>
                                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{aadhaarFiles.length > 0 ? `${aadhaarFiles.length} file(s) selected` : 'Upload Aadhaar'}</span>
                                  <Upload className="w-4 h-4 ml-auto text-muted-foreground" />
                                </label>
                              </div>
                              {aadhaarFiles.length > 0 && (
                                <div className="space-y-1 mt-2">
                                  {aadhaarFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm text-foreground bg-muted px-3 py-2 rounded-lg">
                                      <FileText className="w-4 h-4" />
                                      <span className="flex-1 truncate">{file.name}</span>
                                      <button type="button" onClick={() => setAadhaarFiles((files) => files.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {errors.aadhaar && <p className="text-sm text-destructive">{errors.aadhaar}</p>}
                            </div>

                            {/* --- DOCTOR/NURSE DOCUMENT UPLOAD --- */}
                            {!isAmbulanceProvider && (
                              <div className="space-y-2 mt-4">
                                <Label htmlFor="document">Professional Documents * (Image/PDF)</Label>
                                <div className="relative">
                                  <Input id="document" type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={handleDocumentUpload} className="hidden" />
                                  <label htmlFor="document" className={`flex items-center gap-3 px-4 h-12 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${errors.document ? 'border-destructive' : 'border-border hover:border-primary'}`}>
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{documentFiles.length > 0 ? `${documentFiles.length} file(s) selected` : 'Upload Documents'}</span>
                                    <Upload className="w-4 h-4 ml-auto text-muted-foreground" />
                                  </label>
                                </div>
                                {documentFiles.length > 0 && (
                                  <div className="space-y-1 mt-2">
                                    {documentFiles.map((file, index) => (
                                      <div key={index} className="flex items-center gap-2 text-sm text-foreground bg-muted px-3 py-2 rounded-lg">
                                        <FileText className="w-4 h-4" />
                                        <span className="flex-1 truncate">{file.name}</span>
                                        <button type="button" onClick={() => setDocumentFiles((files) => files.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {errors.document && <p className="text-sm text-destructive">{errors.document}</p>}
                              </div>
                            )}

                            {/* --- LAB TECHNICIAN FILE UPLOADS --- */}
                            {selectedProviderType === 'Lab' && (
                              <div className="space-y-4 pt-4 border-t">
                                <div className="space-y-2">
                                  <Label>Upload Lab Registration Certificate *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setLabFiles(prev => ({ ...prev, labRegistrationCertificate: e.target.files?.[0] }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Upload NABL Certificate (if available)</Label>
                                  <Input type="file" accept="image/*,.pdf" multiple onChange={(e) => {
                                    if (e.target.files) setLabFiles(prev => ({ ...prev, nablCertificate: Array.from(e.target.files) }));
                                  }} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Upload PAN Card *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setLabFiles(prev => ({ ...prev, panCardPhoto: e.target.files?.[0] }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Upload Cancelled Cheque / Passbook *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setLabFiles(prev => ({ ...prev, cancelledChequePhoto: e.target.files?.[0] }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Police verification document *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setLabFiles(prev => ({ ...prev, policeVerificationDocument: e.target.files?.[0] }))} required />
                                </div>
                              </div>
                            )}

                            {isCaretakerProvider && (
                              <div className="space-y-4 pt-4 border-t">
                                <div className="space-y-2">
                                  <Label>Profile Photo *</Label>
                                  <Input type="file" accept="image/*" onChange={(e) => setCaretakerFiles(prev => ({ ...prev, profileImage: e.target.files?.[0] || undefined }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Police Verification Document *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setCaretakerFiles(prev => ({ ...prev, policeVerificationDocument: e.target.files?.[0] || undefined }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>PAN Card</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setCaretakerFiles(prev => ({ ...prev, panCardPhoto: e.target.files?.[0] || undefined }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Cancelled Cheque / Passbook</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setCaretakerFiles(prev => ({ ...prev, cancelledChequePhoto: e.target.files?.[0] || undefined }))} />
                                </div>
                              </div>
                            )}

                            {/* --- AMBULANCE FILE UPLOADS --- */}
                            {isAmbulanceProvider && (
                              <div className="space-y-4 pt-4 border-t">
                                <div className="space-y-2">
                                  <Label>Upload Your Photo *</Label>
                                  <Input type="file" accept="image/*" onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) setDocumentFiles([e.target.files[0]]);
                                  }} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Upload PAN Card *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setAmbulanceFiles(prev => ({ ...prev, panCardPhoto: e.target.files?.[0] || undefined }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>RC (Vehicle Registration Certificate) *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setAmbulanceFiles(prev => ({ ...prev, rcDocument: e.target.files?.[0] || undefined }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Driver License Upload *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setAmbulanceFiles(prev => ({ ...prev, driverLicenseDocument: e.target.files?.[0] || undefined }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Ambulance Photo Upload *</Label>
                                  <Input type="file" accept="image/*" onChange={(e) => setAmbulanceFiles(prev => ({ ...prev, ambulancePhoto: e.target.files?.[0] || undefined }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Upload Cancelled Cheque / Passbook *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setAmbulanceFiles(prev => ({ ...prev, cancelledChequePhoto: e.target.files?.[0] || undefined }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Police verification document *</Label>
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setAmbulanceFiles(prev => ({ ...prev, policeVerificationDocument: e.target.files?.[0] || undefined }))} required />
                                </div>

                                <div className="flex items-start gap-2 mt-6 bg-muted/30 p-4 rounded-lg">
                                  <input type="checkbox" id="disclaimer" className="mt-1" required />
                                  <Label htmlFor="disclaimer" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                                    I confirm that the information provided is correct and I agree to work according to Healthy Touch policies and guidelines.
                                  </Label>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {mode === 'register' && selectedRole === 'provider' && selectedProviderType && (
                          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                            <input
                              type="checkbox"
                              id="providerAgreement"
                              className="mt-1"
                              checked={acceptedProviderAgreement}
                              onChange={(e) => setAcceptedProviderAgreement(e.target.checked)}
                              required
                            />
                            <Label htmlFor="providerAgreement" className="text-xs leading-relaxed text-muted-foreground">
                              I have read and agree to{' '}
                              {getProviderAgreementSlugs(selectedProviderType).map((slug, index, slugs) => {
                                const doc = legalDocs.find((item) => item.slug === slug);
                                return (
                                  <span key={slug}>
                                    {doc ? (
                                      <a href={getLegalDocumentPath(doc.slug)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                        {doc.title}
                                      </a>
                                    ) : (
                                      <span>{doc?.title || slug.replace(/-/g, ' ')}</span>
                                    )}
                                    {index < slugs.length - 1 ? ' and ' : ''}
                                  </span>
                                );
                              })}
                              .
                            </Label>
                          </div>
                        )}
                        {/* Submit Button */}
                        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                            </>
                          ) : (
                            <>
                              {mode === 'login' ? 'Sign In' : 'Create Account'}
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-secondary p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url('${heroImage}')` }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-primary-foreground relative z-10 max-w-lg"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <Heart className="w-10 h-10" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">
            Quality Healthcare at Your Doorstep
          </h2>
          <p className="text-primary-foreground/80">
            Join thousands of patients and healthcare providers who trust Healthy Touch for professional home healthcare services.
          </p>

          <div className="mt-12 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="font-display text-3xl font-bold">15K+</p>
              <p className="text-sm text-primary-foreground/70">Patients</p>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20" />
            <div className="text-center">
              <p className="font-display text-3xl font-bold">800+</p>
              <p className="text-sm text-primary-foreground/70">Providers</p>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20" />
            <div className="text-center">
              <p className="font-display text-3xl font-bold">28+</p>
              <p className="text-sm text-primary-foreground/70">Cities</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

