import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Calendar, Clock, IndianRupee, Shield, CheckCircle2, Upload, FileText, File, X, Star, Award, AlertCircle } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// Razorpay types (for TS)
// declare global {
//   interface Window {
//     Razorpay: any;
//   }
// }

import api from '@/services/api.client';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { MOU_DOCUMENT_SLUGS, getDocsBySlug, getLegalDocumentPath, getPublicLegalDocuments, type LegalDocument } from '@/services/legalDocument.service';
import CouponField from '@/components/CouponField';
import { readFamilyMembers, type FamilyMember } from '@/utils/familyMembers';

interface PaymentBookingModalProps {
  open: boolean;
  onClose: () => void;
  provider: any;
  selectedDate?: Date | null;
  selectedSlot?: string;
  onSuccess: () => void;
} 

const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNextBookableDate = (provider: any) => {
  const today = new Date();
  const availability = Array.isArray(provider?.availability) ? provider.availability : [];

  if (availability.length === 0) {
    return toDateInputValue(today);
  }

  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const dayName = daysOrder[candidate.getDay()];

    if (availability.some((slot: any) => slot.day === dayName)) {
      return toDateInputValue(candidate);
    }
  }

  return toDateInputValue(today);
};

export default function PaymentBookingModal({
  open,
  onClose,
  provider,
  selectedDate: initialDate,
  selectedSlot: initialSlot,
  onSuccess,
}: PaymentBookingModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<any>(null);
  const [estimatedBreakdown, setEstimatedBreakdown] = useState<any>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const [acceptedPatientConsent, setAcceptedPatientConsent] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [bookingFor, setBookingFor] = useState<'self' | 'family'>('self');
  const [selectedMemberId, setSelectedMemberId] = useState('self');
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'payment' | 'success'>('details');
  const { toast } = useToast();
  const { user, setUser } = useAuth();
  const { settings } = useSettings();
  
  // Track slot availability
  const [isSlotAvailable, setIsSlotAvailable] = useState<boolean>(true);

  // Initialize with props if available
  useEffect(() => {
    if (initialDate) {
      const dateStr = typeof initialDate === 'string'
        ? initialDate
        : toDateInputValue(initialDate);
      setSelectedDate(dateStr);
    } else if (open && provider) {
      setSelectedDate(getNextBookableDate(provider));
    }
    if (initialSlot) {
      setSelectedTime(initialSlot);
    }
  }, [open, provider, initialDate, initialSlot]);

  // Calculate estimated payment breakdown when provider loads or modal opens
  useEffect(() => {
    if (open && provider) {
      console.log('Provider Data:', provider);
      console.log('Provider Image:', provider?.userId?.profileImage || provider?.profileImage);
      console.log('Provider Fee:', provider?.fees || provider?.consultationFee);
      calculateEstimatedPayment();
    }
  }, [open, provider, settings]);

  useEffect(() => {
    if (open) {
      getPublicLegalDocuments().then(setLegalDocs).catch(() => setLegalDocs([]));
      setFamilyMembers(readFamilyMembers(user));
    }
  }, [open, user]);

  const selectedFamilyMember = bookingFor === 'family'
    ? familyMembers.find((member) => member.id === selectedMemberId)
    : undefined;

  const appendServiceReceiver = (formData: FormData) => {
    formData.append('bookingFor', selectedFamilyMember ? 'family' : 'self');
    if (selectedFamilyMember) {
      formData.append('serviceReceiver', JSON.stringify(selectedFamilyMember));
    }
  };

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && provider?._id) {
      fetchAvailableSlots();
    }
  }, [selectedDate, provider?._id]);

  // Validate slot availability when time is selected
  useEffect(() => {
    if (selectedTime && availableSlots.length > 0) {
      const slotAvailable = availableSlots.includes(selectedTime);
      setIsSlotAvailable(slotAvailable);
      if (!slotAvailable) {
        toast({
          title: 'Slot Not Available',
          description: 'Selected time slot is no longer available. Please choose another.',
          variant: 'destructive',
        });
      }
    }
  }, [selectedTime, availableSlots]);

  const calculateEstimatedPayment = () => {
    try {
      // Calculate estimated breakdown based on provider fee
      // MUST match backend calculation in PaymentController.js
      const providerFee = provider?.physiotherapySelection?.estimatedFinalAmount
        || provider?.nurseSelection?.estimatedFinalAmount
        || provider?.caretakerSelection?.estimatedFinalAmount
        || provider?.fees || provider?.consultationFee || provider?.fee || 500;
      const commissionRate = Number((settings as any)?.commissionRate ?? 10) / 100;
      const gstPercentage = Number((settings as any)?.gstPercentage ?? 18);
      const platformCommission = providerFee * commissionRate;
      const gst = platformCommission * (gstPercentage / 100);
      const travelFare = provider?.travelFare || 0;
      const totalAmount = providerFee + platformCommission + gst + travelFare;
      
      console.log('Calculated Payment Breakdown:', {
        providerFee,
        platformCommission: `${platformCommission} (${commissionRate * 100}% of ${providerFee})`,
        gst: `${gst} (${gstPercentage}% of ${platformCommission})`,
        travelFare,
        totalAmount,
        formula: `${providerFee} + ${platformCommission} + ${gst} + ${travelFare} = ${totalAmount}`,
      });
      
      setEstimatedBreakdown({
        providerFee,
        platformCommission,
        gst,
        gstPercentage,
        travelFare,
        totalAmount,
      });
    } catch (error) {
      console.error('Failed to calculate payment:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      setSlotsLoading(true);
      // api client baseURL already includes /api
      const response = await api.get(`/appointments/slots/${provider._id}/${selectedDate}`);
      console.log('Slots API Response:', response.data);
      if (response.data.success) {
        setAvailableSlots(response.data.availableSlots);
        setBookedSlots(response.data.bookedTimeSlots || []);
        console.log('Available Slots:', response.data.availableSlots);
        console.log('Booked Slots:', response.data.bookedTimeSlots);
        console.log('Provider Availability:', response.data.providerAvailability);
        // Check if currently selected time is still available
        if (selectedTime && !response.data.availableSlots.includes(selectedTime)) {
          setIsSlotAvailable(false);
          setSelectedTime(''); // Clear invalid selection
          toast({
            title: 'Slot Not Available',
            description: 'Selected time slot has been booked. Please choose another.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch slots:', error);
      console.error('Error response:', error.response?.data);
      setAvailableSlots([]);
      if (error.response?.status === 404) {
        toast({
          title: 'Provider Not Found',
          description: 'Unable to fetch availability for this provider.',
          variant: 'destructive',
        });
      }
    } finally {
      setSlotsLoading(false);
    }
  };

  // File upload handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith('image/');
      const maxBytes = isImage ? 3 * 1024 * 1024 : 5 * 1024 * 1024;

      if (file.size > maxBytes) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${isImage ? '3MB (image)' : '5MB (document)'} limit`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
    setUploadedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return '🖼️';
    return '📎';
  };

  // Return early if provider is not available
  if (!provider) {
    return null;
  }

  // Helper function to check if a time slot is in the past or too soon (less than 30 minutes from now)
  const isTimeSlotPast = (timeSlot: string, dateStr: string) => {
    const selectedDateObj = new Date(dateStr);
    const today = new Date();
    
    // Reset time to compare only dates
    selectedDateObj.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // If not today, all slots are valid
    if (selectedDateObj.getTime() !== today.getTime()) {
      return false;
    }
    
    // Parse time slot (e.g., "09:00 AM")
    const [time, period] = timeSlot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    // Create date object for the slot time
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    // Get current time plus 30 minutes buffer
    const now = new Date();
    const minimumBookingTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    // Check if slot time is in the past or within 30 minutes
    return slotTime.getTime() < minimumBookingTime.getTime();
  };

  // Helper function to safely format dates
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('en-IN');
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide reason for visit',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Error',
        description: 'Please select date and time slot',
        variant: 'destructive',
      });
      return;
    }

    // Validate slot availability before proceeding
    if (availableSlots.length > 0 && !availableSlots.includes(selectedTime)) {
      toast({
        title: 'Slot Not Available',
        description: 'This time slot is no longer available. Please select another slot.',
        variant: 'destructive',
      });
      setIsSlotAvailable(false);
      return;
    }

    if (!acceptedPatientConsent) {
      toast({
        title: 'Consent required',
        description: 'Please accept the patient consent and policies before payment.',
        variant: 'destructive',
      });
      return;
    }

    if (bookingFor === 'family' && !selectedFamilyMember) {
      toast({
        title: 'Select member',
        description: 'Please select a family/friend member for this booking.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      if (!provider?._id) {
        toast({
          title: 'Error',
          description: 'Provider information is missing',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create payment order
      const response = await api.post('/payments/create-order', {
        providerId: provider._id,
        date: selectedDate,
        timeSlot: selectedTime,
        reason: reason.trim(),
        paymentMethod: 'razorpay',
        useCoins,
        couponCode: appliedCoupon?.code || '',
        ...(provider?.physiotherapySelection && { physiotherapySelection: provider.physiotherapySelection }),
        ...(provider?.nurseSelection && { nurseSelection: provider.nurseSelection }),
        ...(provider?.caretakerSelection && { caretakerSelection: provider.caretakerSelection }),
      });

      if (response.data.success) {
        setPaymentOrderId(response.data.paymentId);
        setPaymentBreakdown(response.data.breakdown);
        setPaymentStep('payment');
        toast({
          title: 'Payment Order Created',
          description: response.data.message || 'Please complete payment to confirm booking',
        });
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to create payment order',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Payment order creation error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to create payment order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalApprove = async (data: any, actions: any) => {
    try {
      setLoading(true);

      // Capture payment
      const order = await actions.order.capture();

      // Verify payment with backend
      const verifyResponse = await api.post('/payments/verify', {
        paymentId: paymentOrderId,
        transactionId: order.id,
        paymentStatus: order.status,
        paymentDetails: order,
      });

      if (verifyResponse.data.success && verifyResponse.data.canBookAppointment) {
        // Book appointment with verified payment
        const formData = new FormData();
        formData.append('paymentId', paymentOrderId!);
        formData.append('providerId', provider._id);
        formData.append('date', selectedDate);
        formData.append('timeSlot', selectedTime);
        formData.append('reason', reason.trim());
        formData.append('notes', notes.trim());
        appendServiceReceiver(formData);
        getDocsBySlug(legalDocs, MOU_DOCUMENT_SLUGS).forEach((doc) => {
          formData.append('acceptedLegalDocumentIds', doc._id);
        });
        
        // Append prescription images
        uploadedFiles.forEach((file) => {
          formData.append('prescriptionImages', file);
        });
        
        const bookingResponse = await api.post('/appointments', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (bookingResponse.data.success) {
          setPaymentStep('success');
          toast({
            title: '✅ Booking Confirmed!',
            description: bookingResponse.data.message || 'Your appointment has been booked successfully',
          });

          // Close modal and refresh after 2 seconds
          setTimeout(() => {
            onSuccess();
            onClose();
            resetModal();
          }, 2000);
        } else {
          toast({
            title: 'Booking Failed',
            description: bookingResponse.data.message || 'Failed to complete booking',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Payment Verification Failed',
          description: verifyResponse.data.message || 'Could not verify payment',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('PayPal booking error:', error);
      toast({
        title: 'Booking Failed',
        description: error.response?.data?.message || error.message || 'Failed to complete booking',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setReason('');
    setNotes('');
    setPaymentOrderId(null);
    setPaymentBreakdown(null);
    setSelectedDate('');
    setSelectedTime('');
    setUploadedFiles([]);
    setUseCoins(false);
    setAppliedCoupon(null);
    setAcceptedPatientConsent(false);
    setBookingFor('self');
    setSelectedMemberId('self');
    setPaymentStep('details');
  };

  const handleClose = () => {
    if (paymentStep === 'payment') {
      const confirm = window.confirm('Payment in progress. Are you sure you want to cancel?');
      if (!confirm) return;
    }
    onClose();
    resetModal();
  };

  // PayPal configuration
  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
    currency: 'USD',
  };

  const razorpayKey = (settings as any)?.razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID;
  const coinValueInRupees = Number((settings as any)?.coinValueInRupees ?? 1);
  const availableCoins = Number(user?.coins || 0);
  const maxBookingDays = Number((settings as any)?.maxBookingDays || 60);
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + maxBookingDays);
    return d.toISOString().split('T')[0];
  })();
  const estimatedGrossAmount = Number(estimatedBreakdown?.totalAmount || 0);
  const estimatedCouponDiscount = Number(appliedCoupon?.discountAmount || 0);
  const estimatedAfterCoupon = Math.max(0, estimatedGrossAmount - estimatedCouponDiscount);
  const estimatedCoinsUsed = useCoins && coinValueInRupees > 0
    ? Math.min(availableCoins, Math.floor(estimatedAfterCoupon / coinValueInRupees))
    : 0;
  const estimatedCoinDiscount = estimatedCoinsUsed * coinValueInRupees;
  const estimatedPayableAmount = Math.max(0, estimatedAfterCoupon - estimatedCoinDiscount);

  // TEST Payment Handler - Bypasses real payment
  const handleTestPayment = async (paymentIdOverride?: string) => {
    try {
      setLoading(true);
      const effectivePaymentId = paymentIdOverride || paymentOrderId;

      if (!effectivePaymentId) {
        toast({
          title: 'Booking Failed',
          description: 'Payment order is missing. Please create the payment order again.',
          variant: 'destructive',
        });
        return;
      }
      
      // Verify test payment
      const verifyResponse = await api.post('/payments/verify', {
        paymentId: effectivePaymentId,
        transactionId: `TEST_${Date.now()}`,
        paymentStatus: 'completed',
        paymentDetails: {
          testMode: true,
          message: 'Test payment - no real transaction'
        },
      });

      if (verifyResponse.data.success && verifyResponse.data.canBookAppointment) {
        if (user && verifyResponse.data.payment?.patientId?.coins !== undefined) {
          setUser({ ...user, coins: verifyResponse.data.payment.patientId.coins });
        }
        // Book appointment
        const formData = new FormData();
        formData.append('paymentId', effectivePaymentId);
        formData.append('providerId', provider._id);
        formData.append('date', selectedDate);
        formData.append('timeSlot', selectedTime);
        formData.append('reason', reason.trim());
        formData.append('notes', notes.trim());
        appendServiceReceiver(formData);
        getDocsBySlug(legalDocs, MOU_DOCUMENT_SLUGS).forEach((doc) => {
          formData.append('acceptedLegalDocumentIds', doc._id);
        });
        
        // Append prescription images
        uploadedFiles.forEach((file) => {
          formData.append('prescriptionImages', file);
        });
        
        const bookingResponse = await api.post('/appointments', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (bookingResponse.data.success) {
          setPaymentStep('success');
          toast({
            title: '✅ Test Booking Confirmed!',
            description: bookingResponse.data.message || 'Your test appointment has been booked successfully',
          });
          setTimeout(() => {
            onSuccess();
            onClose();
            resetModal();
          }, 2000);
        } else {
          toast({
            title: 'Booking Failed',
            description: bookingResponse.data.message || 'Failed to complete test booking',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Payment Verification Failed',
          description: verifyResponse.data.message || 'Could not verify payment',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Test booking error:', err);
      toast({
        title: 'Booking Failed',
        description: err.response?.data?.message || err.message || 'Failed to complete test booking',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Razorpay handler
  const handleRazorpayPayment = async () => {
    if (!razorpayKey) {
      toast({
        title: 'Error',
        description: 'Razorpay key not configured',
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoading(true);
      // Create Razorpay order via backend
      const response = await api.post('/payments/create-order', {
        providerId: provider._id,
        date: selectedDate,
        timeSlot: selectedTime,
        reason: reason.trim(),
        paymentMethod: 'razorpay',
        useCoins,
        couponCode: appliedCoupon?.code || '',
        ...(provider?.physiotherapySelection && { physiotherapySelection: provider.physiotherapySelection }),
        ...(provider?.nurseSelection && { nurseSelection: provider.nurseSelection }),
        ...(provider?.caretakerSelection && { caretakerSelection: provider.caretakerSelection }),
      });
      if (!response.data.success) throw new Error('Failed to create payment order');
      setPaymentOrderId(response.data.paymentId);
      setPaymentBreakdown(response.data.breakdown);
      setPaymentStep('payment');

      if (!response.data.order && response.data.breakdown?.payableAmount === 0) {
        await handleTestPayment(response.data.paymentId);
        return;
      }

      // Load Razorpay script if not present
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const order = response.data.order; // {id, amount, currency}
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: provider?.userId?.name || provider?.name || 'Healthcare Provider',
        description: `Appointment with ${provider?.userId?.name || provider?.name}`,
        order_id: order.id,
        handler: async function (res: any) {
          // Verify payment with backend
          try {
            setLoading(true);
            const verifyResponse = await api.post('/payments/verify', {
              paymentId: response.data.paymentId,
              transactionId: res.razorpay_payment_id,
              orderId: res.razorpay_order_id,
              signature: res.razorpay_signature,
              paymentStatus: 'captured',
              paymentDetails: res,
            });
            if (verifyResponse.data.success && verifyResponse.data.canBookAppointment) {
              if (user && verifyResponse.data.payment?.patientId?.coins !== undefined) {
                setUser({ ...user, coins: verifyResponse.data.payment.patientId.coins });
              }
              // Book appointment with FormData
              const formData = new FormData();
              formData.append('paymentId', response.data.paymentId);
              formData.append('providerId', provider._id);
              formData.append('date', selectedDate);
              formData.append('timeSlot', selectedTime);
              formData.append('reason', reason.trim());
              formData.append('notes', notes.trim());
              appendServiceReceiver(formData);
              getDocsBySlug(legalDocs, MOU_DOCUMENT_SLUGS).forEach((doc) => {
                formData.append('acceptedLegalDocumentIds', doc._id);
              });
              
              // Append prescription images
              uploadedFiles.forEach((file) => {
                formData.append('prescriptionImages', file);
              });
              
              const bookingResponse = await api.post('/appointments', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });
              
              if (bookingResponse.data.success) {
                setPaymentStep('success');
                toast({ title: '✅ Booking Confirmed!', description: bookingResponse.data.message || 'Your appointment has been booked successfully' });
                setTimeout(() => {
                  onSuccess();
                  onClose();
                  resetModal();
                }, 2000);
              } else {
                toast({ title: 'Booking Failed', description: bookingResponse.data.message || 'Failed to complete booking', variant: 'destructive' });
              }
            } else {
              toast({ title: 'Payment Verification Failed', description: verifyResponse.data.message || 'Could not verify payment', variant: 'destructive' });
            }
          } catch (err: any) {
            console.error('Razorpay booking error:', err);
            toast({ title: 'Booking Failed', description: err.response?.data?.message || err.message || 'Failed to complete booking', variant: 'destructive' });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: provider?.userId?.name || provider?.name,
        },
        theme: { color: '#6366f1' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to initiate payment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {paymentStep === 'details' && (
              <>
                <Calendar className="w-6 h-6 text-primary" />
                Book Appointment
              </>
            )}
            {paymentStep === 'payment' && (
              <>
                <CreditCard className="w-6 h-6 text-primary" />
                Complete Payment
              </>
            )}
            {paymentStep === 'success' && (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                Booking Confirmed!
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Booking Details */}
        {paymentStep === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-4 sm:space-y-6">
            {/* Provider Info - Enhanced with larger image */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/5 p-4 sm:p-6">
              <div className="flex flex-col items-start gap-4 min-[420px]:flex-row sm:gap-5">
                {(provider?.userId?.profileImage || provider?.profileImage) ? (
                  <img
                    src={provider?.userId?.profileImage || provider?.profileImage}
                    alt={provider?.userId?.name || provider?.name || 'Provider'}
                    className="h-20 w-20 rounded-2xl object-cover border-2 border-primary/30 shadow-lg sm:h-24 sm:w-24"
                    onError={(e) => {
                      console.log('Image load failed:', e);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white shadow-lg sm:h-24 sm:w-24 sm:text-3xl">
                    {provider?.userId?.name?.charAt(0) || provider?.name?.charAt(0) || 'P'}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="break-words text-lg font-bold text-primary mb-1 sm:text-xl">
                    {provider?.userId?.name || provider?.name || 'Healthcare Provider'}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    {provider?.category || provider?.specialization || provider?.specialty || 'General'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:gap-4">
                    {(provider?.rating || provider?.averageRating) && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{provider?.rating || provider?.averageRating}</span>
                      </div>
                    )}
                    {provider?.experience && (
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>{provider.experience} years exp</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Select Date *</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={maxDate}
                required
              />
            </div>

            {/* Time Selection - Enhanced with availability indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Time *</Label>
                {!selectedDate && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">Select date first</span>
                )}
              </div>
              <div className="grid max-h-[200px] grid-cols-2 gap-2 overflow-y-auto rounded-xl border bg-muted/30 p-3 sm:grid-cols-3">
                {slotsLoading ? (
                  <div className="col-span-3 flex flex-col items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">Checking availability...</p>
                  </div>
                ) : !selectedDate ? (
                  <div className="col-span-3 text-center py-6">
                    <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">Please select a date first</p>
                  </div>
                ) : availableSlots.length === 0 && bookedSlots.length === 0 ? (
                  <div className="col-span-3 text-center py-6">
                    <Clock className="w-8 h-8 mx-auto text-red-400 mb-2" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">No slots available</p>
                    <p className="text-xs text-muted-foreground mt-1">Please select another date</p>
                  </div>
                ) : (
                  <>
                    {/* Available Slots */}
                    {availableSlots.map((time) => {
                      const isPast = isTimeSlotPast(time, selectedDate);
                      return (
                        <Button
                          key={time}
                          type="button"
                          variant={selectedTime === time ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                          disabled={isPast}
                          className={`text-xs ${
                            selectedTime === time 
                              ? 'bg-primary text-primary-foreground' 
                              : isPast
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-primary/10'
                          }`}
                          title={isPast ? 'Must be booked at least 30 minutes in advance' : 'Available for booking'}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {time}
                        </Button>
                      );
                    })}
                    
                    {/* Booked Slots - Shown but disabled */}
                    {bookedSlots.map((time) => (
                      <Button
                        key={`booked-${time}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        onClick={() => {
                          toast({
                            title: 'Slot Already Booked',
                            description: `${time} is already booked. Please select another time.`,
                            variant: 'destructive',
                          });
                        }}
                        className="text-xs opacity-40 cursor-not-allowed bg-muted/50 border-dashed relative"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {time}
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                      </Button>
                    ))}
                  </>
                )}
              </div>
              {selectedDate && new Date(selectedDate).toDateString() === new Date().toDateString() && availableSlots.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Slots must be booked at least 30 minutes in advance
                </p>
              )}
              {selectedTime && isSlotAvailable && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Slot available for booking
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <Label className="font-semibold">Who is this booking for?</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant={bookingFor === 'self' ? 'default' : 'outline'} onClick={() => setBookingFor('self')}>Myself</Button>
                <Button type="button" variant={bookingFor === 'family' ? 'default' : 'outline'} onClick={() => setBookingFor('family')}>Family/Friend</Button>
              </div>
              {bookingFor === 'family' && (
                <div className="space-y-2">
                  <Label>Select Member</Label>
                  <select
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="self">Select Member</option>
                    {familyMembers.filter((member) => member.id !== 'self').map((member) => (
                      <option key={member.id} value={member.id}>{member.relation} - {member.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedFamilyMember && (
                <p className="text-xs text-muted-foreground">
                  Service For: {selectedFamilyMember.name} ({selectedFamilyMember.relation}) - {selectedFamilyMember.mobile}
                </p>
              )}
            </div>

            {/* Reason for Visit */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Visit *</Label>
              <Textarea
                id="reason"
                placeholder="Describe your symptoms or reason for consultation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information for the provider..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <Label className="font-semibold">Coupon</Label>
              <CouponField
                bookingType="appointment"
                orderAmount={estimatedGrossAmount}
                appliedCoupon={appliedCoupon}
                onApplied={setAppliedCoupon}
                disabled={!estimatedGrossAmount}
              />
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="useCoins"
                  checked={useCoins}
                  disabled={availableCoins <= 0}
                  onCheckedChange={(checked) => setUseCoins(Boolean(checked))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="useCoins" className="font-semibold">
                    Use reward coins
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {availableCoins} coins. 1 coin = Rs. {coinValueInRupees || 0}.
                  </p>
                  {useCoins && estimatedCoinsUsed > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {estimatedCoinsUsed} coins will reduce Rs. {estimatedCoinDiscount.toLocaleString('en-IN')}.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="patientConsent"
                  checked={acceptedPatientConsent}
                  onCheckedChange={(checked) => setAcceptedPatientConsent(Boolean(checked))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="patientConsent" className="font-semibold">
                    Patient consent and policies
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    I agree to{' '}
                    {getDocsBySlug(legalDocs, MOU_DOCUMENT_SLUGS).map((doc, index, docs) => (
                      <span key={doc.slug}>
                        <a href={getLegalDocumentPath(doc.slug)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {doc.title}
                        </a>
                        {index < docs.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Previous Prescriptions Upload */}
            <div className="border-2 border-dashed border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="flex items-center gap-2 cursor-default">
                            <FileText className="w-4 h-4 text-primary" />
                            Previous Prescriptions (Optional)
                          </Label>
                          <label htmlFor="prescription-upload" className="cursor-pointer">
                            <div className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10">
                              <Upload className="w-3 h-3" />
                              Upload
                            </div>
                            <input
                              id="prescription-upload"
                              type="file"
                              multiple
                              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <p className="text-xs text-muted-foreground mb-3">
                          Upload previous doctor prescriptions (Images: Max 3MB, Docs: Max 5MB)
                        </p>

                        {uploadedFiles.length > 0 ? (
                          <div className="space-y-2 max-h-[150px] overflow-y-auto">
                            {uploadedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-lg">{getFileIcon(file)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(index)}
                                  className="p-1 hover:bg-destructive/10 rounded transition-colors"
                                >
                                  <X className="w-4 h-4 text-destructive" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <File className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-xs text-muted-foreground">No files uploaded</p>
                          </div>
                        )}
            </div>

            {/* Fee Info - Complete Breakdown (Show Estimated) */}
            <div className="p-5 bg-gradient-to-br from-secondary/10 via-card to-primary/10 rounded-xl border border-secondary/25">
              {/* <div className="flex items-center gap-2 mb-4">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-lg">Payment Details</span>
              </div> */}
              
              {estimatedBreakdown ? (
                <div className="space-y-2">
                  {provider?.physiotherapySelection && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>{provider.physiotherapySelection.serviceName || 'Physiotherapy service'}</span>
                        <span className="font-medium">Rs. {Number(provider.physiotherapySelection.estimatedServiceAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {Number(provider.physiotherapySelection.estimatedAddonAmount || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Equipment add-ons</span>
                          <span className="font-medium">Rs. {Number(provider.physiotherapySelection.estimatedAddonAmount).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </>
                  )}
                  {provider?.nurseSelection && (
                    <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                      <div className="flex justify-between">
                        <span>{provider.nurseSelection.serviceName || 'Nurse service'}</span>
                        <span className="font-medium">Rs. {Number(provider.nurseSelection.estimatedServiceAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {Number(provider.nurseSelection.estimatedAddonAmount || 0) > 0 && (
                        <div className="mt-1 flex justify-between text-muted-foreground">
                          <span>Selected add-ons</span>
                          <span className="font-medium">Rs. {Number(provider.nurseSelection.estimatedAddonAmount).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {provider?.caretakerSelection && (
                    <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                      <div className="flex justify-between">
                        <span>{provider.caretakerSelection.serviceName || 'Caretaker service'}</span>
                        <span className="font-medium">Rs. {Number(provider.caretakerSelection.estimatedServiceAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {Number(provider.caretakerSelection.estimatedAddonAmount || 0) > 0 && <div className="mt-1 flex justify-between text-muted-foreground"><span>Selected add-ons</span><span>Rs. {Number(provider.caretakerSelection.estimatedAddonAmount).toLocaleString('en-IN')}</span></div>}
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform fee</span>
                    <span className="font-medium">Rs. {Number(estimatedBreakdown.platformCommission || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>GST on platform fee</span>
                    <span className="font-medium">Rs. {Number(estimatedBreakdown.gst || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {estimatedBreakdown.travelFare > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Travel Fare</span>
                      <span className="font-medium">₹{estimatedBreakdown.travelFare}</span>
                    </div>
                  )}
                  <div className="h-px bg-secondary/20 my-2"></div>
                  {estimatedCouponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Coupon Discount ({appliedCoupon?.code})</span>
                      <span className="font-medium">-Rs. {estimatedCouponDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {estimatedCoinsUsed > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Coins Discount</span>
                      <span className="font-medium">-Rs. {estimatedCoinDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base">Total Amount</span>
                    <span className="text-2xl font-bold text-secondary">
                      Rs. {estimatedPayableAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-secondary" />
                  <p className="text-xs text-muted-foreground mt-2">Calculating fees...</p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-primary flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Secure payment required after confirmation
                </p>
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Payment Order...
                </>
              ) : (
                <>
                  Proceed to Payment
                  <CreditCard className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Step 2: Payment */}
        {paymentStep === 'payment' && paymentBreakdown && (
          <div className="space-y-6">
            {/* Payment Breakdown */}
            <div className="p-5 bg-gradient-to-br from-primary/10 via-card to-secondary/10 rounded-xl border border-border/80">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Fee Breakdown
              </h3>
              <div className="space-y-2">
                {paymentBreakdown.physiotherapyServiceId && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>{paymentBreakdown.physiotherapyServiceName}</span>
                      <span className="font-medium">Rs. {Number(paymentBreakdown.serviceAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {Number(paymentBreakdown.addonAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Equipment add-ons</span>
                        <span className="font-medium">Rs. {Number(paymentBreakdown.addonAmount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </>
                )}
                {paymentBreakdown.nurseServiceId && (
                  <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="flex justify-between">
                      <span>{paymentBreakdown.nurseServiceName}</span>
                      <span className="font-medium">Rs. {Number(paymentBreakdown.serviceAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {Number(paymentBreakdown.addonAmount || 0) > 0 && (
                      <div className="mt-1 flex justify-between text-muted-foreground">
                        <span>Selected add-ons</span>
                        <span>Rs. {Number(paymentBreakdown.addonAmount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                )}
                {paymentBreakdown.caretakerServiceId && (
                  <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="flex justify-between"><span>{paymentBreakdown.caretakerServiceName}</span><span className="font-medium">Rs. {Number(paymentBreakdown.serviceAmount || 0).toLocaleString('en-IN')}</span></div>
                    <p className="mt-1 text-muted-foreground">{paymentBreakdown.caretakerShiftType} - {paymentBreakdown.caretakerDurationHours} hours</p>
                    {Number(paymentBreakdown.addonAmount || 0) > 0 && <div className="mt-1 flex justify-between text-muted-foreground"><span>Selected add-ons</span><span>Rs. {Number(paymentBreakdown.addonAmount).toLocaleString('en-IN')}</span></div>}
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Platform fee</span>
                  <span className="font-medium">Rs. {Number(paymentBreakdown.platformCommission || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST on platform fee</span>
                  <span className="font-medium">Rs. {Number(paymentBreakdown.gst || 0).toLocaleString('en-IN')}</span>
                </div>
                {paymentBreakdown.travelFare > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Travel Fare</span>
                    <span className="font-medium">₹{paymentBreakdown.travelFare}</span>
                  </div>
                )}
                <div className="h-px bg-border my-2"></div>
                {Number(paymentBreakdown.couponDiscount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Coupon Discount ({paymentBreakdown.couponCode})</span>
                    <span className="font-medium">-Rs. {Number(paymentBreakdown.couponDiscount || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {paymentBreakdown.coinsUsed > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Coins Discount ({paymentBreakdown.coinsUsed} coins)</span>
                    <span className="font-medium">-Rs. {Number(paymentBreakdown.coinDiscount || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-primary">
                    {paymentBreakdown && paymentBreakdown.totalAmount !== undefined
                      ? `Rs. ${Number(paymentBreakdown.payableAmount ?? paymentBreakdown.totalAmount).toLocaleString('en-IN')}`
                      : '...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                🧪 TEST MODE: No real payment required
              </span>
            </div>

            {/* Test Payment Button */}
            <Button
              className="w-full"
              variant="secondary"
              size="lg"
              onClick={() => handleTestPayment()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Test Payment...
                </>
              ) : (
                <>
                  🧪 Complete Test Booking (Free)
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or use real payment (Production)</span>
              </div>
            </div>

            {/* Razorpay Button */}
            <Button
              className="w-full bg-primary text-white"
              size="lg"
              onClick={handleRazorpayPayment}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  Pay with Razorpay
                  <CreditCard className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {/* Optionally, show PayPal for non-INR users */}
            <div className="mt-4">
              <PayPalScriptProvider options={paypalOptions}>
                <PayPalButtons
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      intent: 'CAPTURE',
                      purchase_units: [
                        {
                          amount: {
                            value: ((paymentBreakdown.payableAmount ?? paymentBreakdown.totalAmount) / 83).toFixed(2), // Convert INR to USD (approx)
                            currency_code: 'USD',
                          },
                          description: `Appointment with ${provider?.userId?.name || provider?.name || 'Healthcare Provider'}`,
                        }
                      ]
                    });
                  }}
                  onApprove={handlePayPalApprove}
                  onError={(err) => {
                    console.error('PayPal Error:', err);
                    toast({
                      title: 'Payment Failed',
                      description: 'There was an error processing your payment',
                      variant: 'destructive',
                    });
                  }}
                  disabled={loading}
                />
              </PayPalScriptProvider>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By proceeding, you agree to our terms and conditions
            </p>
          </div>
        )}

        {/* Step 3: Success */}
        {paymentStep === 'success' && (
        <div className="py-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-600">Payment Successful!</h3>
          <p className="text-muted-foreground">
            Your appointment with {provider?.userId?.name || provider?.name || 'the provider'} has been confirmed
          </p>
          <div className="p-4 bg-primary/5 rounded-xl mx-auto max-w-sm">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Date:</span>
              <span className="font-medium">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Time:</span>
              <span className="font-medium">{selectedTime}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Redirecting to appointments...
          </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
