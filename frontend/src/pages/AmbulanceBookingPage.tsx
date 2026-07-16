import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Ambulance, ArrowRightLeft, CalendarClock, CheckCircle2, CreditCard, IndianRupee, Loader2, LocateFixed, MapPin, Navigation, Phone, Shield } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LocationSearchInput } from '@/components/ui/LocationSearchInput';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { createAmbulanceBooking, createAmbulancePaymentOrder, getMyAmbulanceBookings, markAmbulancePaymentPaid } from '@/services/ambulance.service';
import { calculateDistance } from '@/utils/distanceCalculator';

const ambulanceTypes = [
  'Basic Life Support (BLS) Ambulance',
  'Advanced Life Support (ALS) Ambulance',
  'ICU Ambulance',
  'Dead Body Transport Ambulance',
];

const ambulancePricing: Record<string, { baseCharge: number; fixedCharge: number; perKmRate: number }> = {
  'Basic Life Support (BLS) Ambulance': { baseCharge: 200, fixedCharge: 1500, perKmRate: 13 },
  'Advanced Life Support (ALS) Ambulance': { baseCharge: 300, fixedCharge: 2000, perKmRate: 15 },
  'ICU Ambulance': { baseCharge: 500, fixedCharge: 3500, perKmRate: 25 },
  'Dead Body Transport Ambulance': { baseCharge: 500, fixedCharge: 2000, perKmRate: 15 },
};

const AMBULANCE_DRAFT_KEY = 'healthytouch_ambulance_booking_draft';

const timelineSteps = [
  ['pending_admin', 'Pending Admin'],
  ['assigned_to_provider', 'Assigned'],
  ['accepted_by_provider', 'Accepted'],
  ['driver_on_way', 'Driver On Way'],
  ['reached_pickup', 'Reached Pickup'],
  ['patient_picked', 'Patient Picked'],
  ['patient_dropped', 'Patient Dropped'],
  ['completed', 'Completed'],
];

const formatDate = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'N/A';
const formatCurrency = (value?: number) => `Rs. ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

type SelectedLocation = {
  address: string;
  latitude?: number;
  longitude?: number;
};

const reverseGeocode = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
};

const getMapsRouteUrl = (pickup?: SelectedLocation, drop?: SelectedLocation) => {
  if (!pickup?.address || !drop?.address) return '';

  const origin = pickup.latitude && pickup.longitude
    ? `${pickup.latitude},${pickup.longitude}`
    : pickup.address;
  const destination = drop.latitude && drop.longitude
    ? `${drop.latitude},${drop.longitude}`
    : drop.address;

  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
};

export default function AmbulanceBookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { settings } = useSettings();
  const razorpayKey = (settings as any)?.razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID;
  const [loading, setLoading] = useState(false);
  const [locatingField, setLocatingField] = useState<'pickup' | 'drop' | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payingId, setPayingId] = useState('');
  const [advancePaymentBooking, setAdvancePaymentBooking] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState<{ booking: any; stage: 'advance' | 'final' } | null>(null);
  const [form, setForm] = useState({
    ambulanceType: ambulanceTypes[0],
    requestType: 'emergency' as 'emergency' | 'scheduled',
    pickupLocation: { address: '' } as SelectedLocation,
    dropLocation: { address: '' } as SelectedLocation,
    patientCondition: '',
    contactNumber: (user as any)?.mobile || '',
    preferredDateTime: new Date().toISOString().slice(0, 16),
    notes: '',
    couponCode: '',
  });

  const estimate = (() => {
    const pricing = ambulancePricing[form.ambulanceType];
    const pickup = form.pickupLocation;
    const drop = form.dropLocation;
    if (!pricing || pickup.latitude == null || pickup.longitude == null || drop.latitude == null || drop.longitude == null) return null;
    const distance = Math.round(calculateDistance(pickup.latitude, pickup.longitude, drop.latitude, drop.longitude) * 100) / 100;
    const pricingMode = distance <= 50 ? 'fixed' : 'per_km';
    const estimatedTotal = pricingMode === 'fixed'
      ? pricing.baseCharge + pricing.fixedCharge
      : pricing.baseCharge + (distance * pricing.perKmRate);
    const total = Math.round(estimatedTotal * 100) / 100;
    const advance = Math.round((total / 2) * 100) / 100;
    return {
      distance,
      pricingMode,
      baseCharge: pricing.baseCharge,
      fixedCharge: pricing.fixedCharge,
      perKmRate: pricing.perKmRate,
      total,
      advance,
      remaining: Math.round((total - advance) * 100) / 100,
    };
  })();

  useEffect(() => {
    if (user) {
      loadBookings();
    } else {
      setBookings([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'patient') return;

    const draft = sessionStorage.getItem(AMBULANCE_DRAFT_KEY);
    if (!draft) return;

    sessionStorage.removeItem(AMBULANCE_DRAFT_KEY);

    const createDraftBooking = async () => {
      try {
        const savedForm = JSON.parse(draft);
        setLoading(true);
        setForm((current) => ({ ...current, ...savedForm }));
        const response = await createAmbulanceBooking({
          ambulanceType: savedForm.ambulanceType,
          requestType: savedForm.requestType,
          pickupLocation: savedForm.pickupLocation,
          dropLocation: savedForm.dropLocation,
          patientCondition: savedForm.patientCondition,
          contactNumber: savedForm.contactNumber,
          preferredDateTime: savedForm.preferredDateTime,
          notes: savedForm.notes,
          couponCode: savedForm.couponCode,
        });
        setAdvancePaymentBooking(response.booking);
        toast({ title: 'Ambulance request created', description: 'Advance payment option is ready below.' });
        loadBookings();
      } catch (error: any) {
        toast({
          title: 'Request failed',
          description: error?.response?.data?.message || error?.message || 'Please review the ambulance request and try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    createDraftBooking();
  }, [user]);

  const loadBookings = async () => {
    try {
      const response = await getMyAmbulanceBookings();
      setBookings(response.bookings || []);
    } catch {
      setBookings([]);
    }
  };

  const submitBooking = async () => {
    if (!form.pickupLocation.address || !form.dropLocation.address || !form.patientCondition || !form.contactNumber) {
      toast({ title: 'Please fill pickup, drop, condition and contact number', variant: 'destructive' });
      return;
    }
    if (form.pickupLocation.latitude == null || form.pickupLocation.longitude == null || form.dropLocation.latitude == null || form.dropLocation.longitude == null) {
      toast({ title: 'Please select pickup and drop from location search/current location', variant: 'destructive' });
      return;
    }

    if (!user) {
      sessionStorage.setItem(AMBULANCE_DRAFT_KEY, JSON.stringify(form));
      toast({
        title: 'Login Required',
        description: 'Please login first to complete advance payment.',
      });
      navigate('/auth', {
        state: {
          redirectTo: `${location.pathname}${location.search}${location.hash}`,
        },
      });
      return;
    }

    if (user.role !== 'patient') {
      toast({
        title: 'Patient login required',
        description: 'Please login with a patient account to book an ambulance.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await createAmbulanceBooking({
        ambulanceType: form.ambulanceType,
        requestType: form.requestType,
        pickupLocation: form.pickupLocation,
        dropLocation: form.dropLocation,
        patientCondition: form.patientCondition,
        contactNumber: form.contactNumber,
        preferredDateTime: form.preferredDateTime,
        notes: form.notes,
        couponCode: form.couponCode,
      });
      setAdvancePaymentBooking(response.booking);
      toast({ title: 'Ambulance request created', description: 'Advance payment option is ready below.' });
      setForm((current) => ({ ...current, pickupLocation: { address: '' }, dropLocation: { address: '' }, patientCondition: '', notes: '', couponCode: '' }));
      loadBookings();
    } catch (error: any) {
      toast({
        title: 'Request failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = async () => {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });
  };

  const openPaymentModal = (booking: any, stage: 'advance' | 'final') => {
    setPaymentModal({ booking, stage });
  };

  const confirmPaymentSuccess = (booking: any, stage: 'advance' | 'final') => {
    toast({ title: stage === 'advance' ? 'Advance payment completed' : 'Remaining payment completed' });
    if (stage === 'advance') setAdvancePaymentBooking(null);
    setPaymentModal(null);
    loadBookings();
  };

  const payStage = async (booking: any, stage: 'advance' | 'final') => {
    try {
      if (!razorpayKey) {
        toast({
          title: 'Payment gateway not configured',
          description: 'Razorpay key is missing. Please configure it in settings.',
          variant: 'destructive',
        });
        return;
      }

      setPayingId(booking._id);
      const orderResponse = await createAmbulancePaymentOrder(booking._id, stage);
      if (!orderResponse.order) {
        toast({
          title: 'Test mode active',
          description: 'Use Complete Test Booking because no real payment order was created.',
        });
        setPayingId('');
        return;
      }
      await loadRazorpay();
      const order = orderResponse.order;
      const options: any = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Healthy Touch',
        description: `${stage === 'advance' ? 'Advance' : 'Remaining'} ambulance payment`,
        order_id: order.id,
        prefill: {
          name: user?.name || '',
          contact: (user as any)?.mobile || booking.contactNumber || '',
        },
        theme: { color: '#2f80b7' },
        handler: async (response: any) => {
          try {
            await markAmbulancePaymentPaid(booking._id, stage, {
              paymentId: orderResponse.paymentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            confirmPaymentSuccess(booking, stage);
          } catch (error: any) {
            toast({
              title: 'Payment verification failed',
              description: error?.response?.data?.message || error?.message || 'Please try again.',
              variant: 'destructive',
            });
          } finally {
            setPayingId('');
          }
        },
        modal: {
          ondismiss: () => setPayingId(''),
        },
      };
      const razorpay: any = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setPayingId('');
      toast({
        title: 'Payment failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const completeTestPayment = async (booking: any, stage: 'advance' | 'final') => {
    try {
      setPayingId(booking._id);
      const orderResponse = await createAmbulancePaymentOrder(booking._id, stage);
      await markAmbulancePaymentPaid(booking._id, stage, {
        paymentId: orderResponse.paymentId,
        transactionId: `AMB_${stage.toUpperCase()}_${Date.now()}`,
      });
      confirmPaymentSuccess(booking, stage);
    } catch (error: any) {
      toast({
        title: 'Payment failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPayingId('');
    }
  };

  const setSelectedLocation = (field: 'pickupLocation' | 'dropLocation', latitude: number, longitude: number, address: string) => {
    setForm((current) => ({
      ...current,
      [field]: { address, latitude, longitude },
    }));
  };

  const fillCurrentLocation = async (field: 'pickup' | 'drop') => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location not supported',
        description: 'Your browser does not support current location access.',
        variant: 'destructive',
      });
      return;
    }

    setLocatingField(field);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setSelectedLocation(field === 'pickup' ? 'pickupLocation' : 'dropLocation', latitude, longitude, address);
        setLocatingField(null);
      },
      () => {
        toast({
          title: 'Unable to get location',
          description: 'Please allow location permission or search manually.',
          variant: 'destructive',
        });
        setLocatingField(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const swapLocations = () => {
    setForm((current) => ({
      ...current,
      pickupLocation: current.dropLocation,
      dropLocation: current.pickupLocation,
    }));
  };

  const formRouteUrl = getMapsRouteUrl(form.pickupLocation, form.dropLocation);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-16 pt-36 lg:pt-44">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Book Ambulance</h1>
          <p className="mt-2 text-muted-foreground">Request emergency or scheduled ambulance support. Admin will assign a nearby verified provider.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Ambulance className="h-5 w-5 text-primary" />
              Ambulance Request
            </h2>
            <div className="space-y-4">
              <Select value={form.ambulanceType} onValueChange={(value) => setForm({ ...form, ambulanceType: value })}>
                <SelectTrigger><SelectValue placeholder="Ambulance type" /></SelectTrigger>
                <SelectContent>
                  {ambulanceTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.requestType} onValueChange={(value: 'emergency' | 'scheduled') => setForm({ ...form, requestType: value })}>
                <SelectTrigger><SelectValue placeholder="Request type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Pickup location</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillCurrentLocation('pickup')}
                      disabled={locatingField !== null}
                    >
                      {locatingField === 'pickup' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                      Current
                    </Button>
                  </div>
                  <LocationSearchInput
                    placeholder="Search pickup area, hospital, landmark..."
                    defaultValue={form.pickupLocation.address}
                    onLocationSelect={(lat, lng, address) => setSelectedLocation('pickupLocation', lat, lng, address)}
                    onError={(message) => toast({ title: 'Pickup location not found', description: message, variant: 'destructive' })}
                  />
                </div>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={swapLocations}
                    disabled={!form.pickupLocation.address && !form.dropLocation.address}
                    className="h-9 px-3"
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Swap
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Drop location</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillCurrentLocation('drop')}
                      disabled={locatingField !== null}
                    >
                      {locatingField === 'drop' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                      Current
                    </Button>
                  </div>
                  <LocationSearchInput
                    placeholder="Search drop hospital, home, landmark..."
                    defaultValue={form.dropLocation.address}
                    onLocationSelect={(lat, lng, address) => setSelectedLocation('dropLocation', lat, lng, address)}
                    onError={(message) => toast({ title: 'Drop location not found', description: message, variant: 'destructive' })}
                  />
                </div>

                {formRouteUrl && (
                  <a
                    href={formRouteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Navigation className="h-4 w-4" />
                    Preview route in Google Maps
                  </a>
                )}
              </div>
              {estimate && (
                <div className="rounded-lg border border-border bg-background p-4 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold">{form.ambulanceType}</p>
                    <Badge variant="outline">{estimate.distance.toFixed(1)} KM</Badge>
                  </div>
                  <div className="grid gap-1 text-muted-foreground">
                    <p>Distance: {estimate.distance.toFixed(1)} KM</p>
                    <p>Base Charge: {formatCurrency(estimate.baseCharge)}</p>
                    <p>{estimate.pricingMode === 'fixed' ? 'Fixed Charges' : 'Per KM'}: {estimate.pricingMode === 'fixed' ? formatCurrency(estimate.fixedCharge) : `${formatCurrency(estimate.perKmRate)} / KM`}</p>
                    <p className="font-semibold text-foreground">Estimated Total: {formatCurrency(estimate.total)}</p>
                    <p>Advance Payment: {formatCurrency(estimate.advance)}</p>
                  </div>
                </div>
              )}
              <Textarea value={form.patientCondition} onChange={(e) => setForm({ ...form, patientCondition: e.target.value })} placeholder="Patient condition" />
              <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="Contact number" />
              <Input type="datetime-local" value={form.preferredDateTime} onChange={(e) => setForm({ ...form, preferredDateTime: e.target.value })} />
              <Input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })} placeholder="Coupon code" />
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
              <Button className="w-full" onClick={submitBooking} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                Book Now
              </Button>
              {advancePaymentBooking && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="font-semibold text-foreground">Advance Payment</p>
                  <p className="mt-1 text-muted-foreground">Pay 50% advance to send this request for admin assignment.</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-semibold">{formatCurrency(advancePaymentBooking.advanceAmount)}</span>
                    <Button
                      size="sm"
                      onClick={() => openPaymentModal(advancePaymentBooking, 'advance')}
                      disabled={payingId === advancePaymentBooking._id}
                    >
                      {payingId === advancePaymentBooking._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Pay Advance
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            {bookings.length > 0 ? bookings.map((booking) => (
              <div key={booking._id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Badge className="mb-2 capitalize">{String(booking.status).replace(/_/g, ' ')}</Badge>
                    <h3 className="text-lg font-semibold">{booking.ambulanceType}</h3>
                    <p className="text-sm text-muted-foreground">{booking.patientCondition}</p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Pickup: {booking.pickupLocation?.address}</span>
                      <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Drop: {booking.dropLocation?.address}</span>
                      <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> {formatDate(booking.preferredDateTime)}</span>
                      {getMapsRouteUrl(booking.pickupLocation, booking.dropLocation) && (
                        <a
                          href={getMapsRouteUrl(booking.pickupLocation, booking.dropLocation)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                        >
                          <Navigation className="h-4 w-4" />
                          Open route
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground md:text-right">
                    <p>{booking.assignedProviderId?.vehicleNumber || 'Assignment pending'}</p>
                    {Number(booking.estimatedAmount || booking.grossAmount || 0) > 0 && (
                      <div className="rounded-md border border-border p-3 text-left md:text-right">
                        <p>Distance: {Number(booking.totalDistance || 0).toFixed(1)} KM</p>
                        <p>Base Charge: {formatCurrency(booking.pricingBreakdown?.baseCharge)}</p>
                        <p>
                          {booking.pricingBreakdown?.pricingMode === 'fixed' ? 'Fixed Charges' : 'Per KM'}:{' '}
                          {booking.pricingBreakdown?.pricingMode === 'fixed'
                            ? formatCurrency(booking.pricingBreakdown?.fixedCharge)
                            : `${formatCurrency(booking.pricingBreakdown?.perKmRate)} / KM`}
                        </p>
                        <p>Estimated Total: {formatCurrency(booking.estimatedAmount || booking.grossAmount)}</p>
                        {Number(booking.couponDiscount || 0) > 0 && (
                          <p className="text-green-600">Coupon {booking.couponCode}: -{formatCurrency(booking.couponDiscount)}</p>
                        )}
                        <p>Advance Payment: {formatCurrency(booking.advanceAmount)}</p>
                        <p>Remaining Payment: {formatCurrency(booking.remainingAmount)}</p>
                        <p className="font-semibold capitalize text-foreground">Payment: {String(booking.paymentStage || 'advance_pending').replace(/_/g, ' ')}</p>
                      </div>
                    )}
                    {booking.status === 'patient_dropped' && booking.paymentStage === 'final_payment_pending' && (
                      <Button className="w-full md:w-auto" onClick={() => openPaymentModal(booking, 'final')} disabled={payingId === booking._id}>
                        {payingId === booking._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Pay Remaining
                      </Button>
                    )}
                  </div>
                </div>
                <AmbulanceTimeline booking={booking} />
              </div>
            )) : (
              <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">No ambulance requests yet.</div>
            )}
          </section>
        </div>
      </main>
      <AmbulancePaymentDialog
        open={!!paymentModal}
        booking={paymentModal?.booking}
        stage={paymentModal?.stage || 'advance'}
        paying={!!paymentModal && payingId === paymentModal.booking?._id}
        onClose={() => setPaymentModal(null)}
        onTestPayment={completeTestPayment}
        onRazorpayPayment={payStage}
      />
      <Footer />
    </div>
  );
}

function AmbulancePaymentDialog({
  open,
  booking,
  stage,
  paying,
  onClose,
  onTestPayment,
  onRazorpayPayment,
}: {
  open: boolean;
  booking: any;
  stage: 'advance' | 'final';
  paying: boolean;
  onClose: () => void;
  onTestPayment: (booking: any, stage: 'advance' | 'final') => void;
  onRazorpayPayment: (booking: any, stage: 'advance' | 'final') => void;
}) {
  if (!booking) return null;

  const amount = stage === 'advance' ? booking.advanceAmount : booking.remainingAmount;
  const title = stage === 'advance' ? 'Advance Payment' : 'Remaining Payment';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CreditCard className="h-6 w-6 text-primary" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-5">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <IndianRupee className="h-5 w-5" />
              Fee Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{title}</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-primary">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3">
            <Shield className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-700">TEST MODE: No real payment required</span>
          </div>

          <Button
            className="w-full"
            variant="secondary"
            size="lg"
            onClick={() => onTestPayment(booking, stage)}
            disabled={paying}
          >
            {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Complete Test Booking (Free)
            <CheckCircle2 className="ml-2 h-4 w-4" />
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or use real payment (Production)</span>
            </div>
          </div>

          <Button
            className="w-full bg-primary text-white"
            size="lg"
            onClick={() => onRazorpayPayment(booking, stage)}
            disabled={paying}
          >
            {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pay with Razorpay
            <CreditCard className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmbulanceTimeline({ booking }: { booking: any }) {
  const history = booking.statusHistory || [];
  const currentIndex = timelineSteps.findIndex(([status]) => status === booking.status);
  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="grid gap-3 md:grid-cols-8">
        {timelineSteps.map(([status, label], index) => {
          const done = currentIndex >= index || history.some((item: any) => item.status === status);
          return (
            <div key={status} className="text-xs">
              <div className={`mb-2 h-3 w-3 rounded-full ${done ? 'bg-primary' : 'bg-muted'}`} />
              <p className={done ? 'font-medium text-foreground' : 'text-muted-foreground'}>{label}</p>
            </div>
          );
        })}
      </div>
      {(booking.adminRejectionReason || booking.providerRejectionReason) && (
        <p className="mt-3 text-sm text-destructive">{booking.adminRejectionReason || booking.providerRejectionReason}</p>
      )}
    </div>
  );
}
