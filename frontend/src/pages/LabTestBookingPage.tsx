import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Home, IndianRupee, LocateFixed, Loader2, MapPin, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LocationSearchInput } from '@/components/ui/LocationSearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import LabTestPaymentModal from '@/components/LabTestPaymentModal';
import { readFamilyMembers, type FamilyMember } from '@/utils/familyMembers';
import {
  createLabBooking,
  LabTest,
  normalizeLabTestPrice,
  readLabCart,
  validateLabCart,
  writeLabCart,
} from '@/services/labTest.service';
import { MOU_DOCUMENT_SLUGS, getDocsBySlug, getLegalDocumentPath, getPublicLegalDocuments, type LegalDocument } from '@/services/legalDocument.service';

const formatPrice = (value: number) => `Rs. ${Math.round(value).toLocaleString('en-IN')}`;

export default function LabTestBookingPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const [acceptedPatientConsent, setAcceptedPatientConsent] = useState(false);
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [bookingFor, setBookingFor] = useState<'self' | 'family'>('self');
  const [selectedMemberId, setSelectedMemberId] = useState('self');
  const [form, setForm] = useState({
    city: 'Jaipur',
    collectionType: 'home' as 'home' | 'lab',
    preferredDate: new Date().toISOString().split('T')[0],
    preferredTimeSlot: '08:00 AM - 10:00 AM',
    address: '',
    patientName: '',
    patientMobile: '',
  });
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const reverseGeocode = async (latitude: number, longitude: number) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  const fillCurrentLocationAddress = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location not supported',
        description: 'Please search or type your address manually.',
        variant: 'destructive',
      });
      return;
    }

    setFetchingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const address = await reverseGeocode(latitude, longitude);
          setForm((current) => ({ ...current, address }));
          toast({ title: 'Address fetched', description: 'Current location address has been added.' });
        } catch {
          toast({
            title: 'Unable to fetch address',
            description: 'Please search or type your address manually.',
            variant: 'destructive',
          });
        } finally {
          setFetchingAddress(false);
        }
      },
      () => {
        setFetchingAddress(false);
        toast({
          title: 'Location permission denied',
          description: 'Please allow location access or search manually.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const totalOriginal = tests.reduce((sum, test) => sum + test.originalPrice, 0);
  const totalSelling = tests.reduce((sum, test) => sum + test.sellingPrice, 0);
  const coinValueInRupees = Number((settings as any)?.coinValueInRupees ?? 1);
  const availableCoins = Number(user?.coins || 0);
  const coinsUsed = useCoins && coinValueInRupees > 0
    ? Math.min(availableCoins, Math.floor(totalSelling / coinValueInRupees))
    : 0;
  const coinDiscount = coinsUsed * coinValueInRupees;
  const payableTotal = Math.max(0, totalSelling - coinDiscount);

  useEffect(() => {
    if (user) {
      const members = readFamilyMembers(user);
      setFamilyMembers(members);
      setForm((current) => ({
        ...current,
        patientName: current.patientName || user.name || '',
        patientMobile: current.patientMobile || (user as any).mobile || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (bookingFor === 'self') {
      setSelectedMemberId('self');
      setForm((current) => ({
        ...current,
        patientName: user?.name || current.patientName,
        patientMobile: (user as any)?.mobile || current.patientMobile,
      }));
      return;
    }
    const member = familyMembers.find((item) => item.id === selectedMemberId);
    if (member) {
      setForm((current) => ({ ...current, patientName: member.name, patientMobile: member.mobile }));
    }
  }, [bookingFor, selectedMemberId, familyMembers, user]);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const ids = readLabCart();
        if (!ids.length) {
          navigate('/lab-tests');
          return;
        }
        const res = await validateLabCart(ids);
        const nextTests = res.tests || [];
        setTests(nextTests);
        if (nextTests[0]?.city) {
          setForm((current) => ({ ...current, city: nextTests[0].city }));
        }
      } catch (error: any) {
        toast({
          title: 'Cart validation failed',
          description: error?.message || 'Please select tests again.',
          variant: 'destructive',
        });
        navigate('/lab-tests');
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, [navigate, toast]);

  useEffect(() => {
    getPublicLegalDocuments().then(setLegalDocs).catch(() => setLegalDocs([]));
  }, []);

  const removeTest = (id: string) => {
    const next = tests.filter((test) => test._id !== id);
    setTests(next);
    writeLabCart(next.map((test) => test._id));
    if (!next.length) navigate('/lab-tests');
  };

  const submitBooking = async () => {
    if (!form.address.trim() || !form.patientName.trim() || !form.patientMobile.trim()) {
      toast({ title: 'Please complete patient and address details', variant: 'destructive' });
      return;
    }
    if (!acceptedPatientConsent) {
      toast({ title: 'Consent required', description: 'Please accept the patient consent and policies.', variant: 'destructive' });
      return;
    }
    if (bookingFor === 'family' && !familyMembers.find((item) => item.id === selectedMemberId)) {
      toast({ title: 'Select member', description: 'Please select a family/friend member.', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await createLabBooking({
        ...form,
        testIds: tests.map((test) => test._id),
        bookingFor,
        serviceReceiver: bookingFor === 'family' ? familyMembers.find((item) => item.id === selectedMemberId) : undefined,
        patientLocation: {
          latitude: (user as any)?.location?.latitude,
          longitude: (user as any)?.location?.longitude,
          address: form.address,
        },
        acceptedLegalDocumentIds: getDocsBySlug(legalDocs, MOU_DOCUMENT_SLUGS).map((doc) => doc._id),
      });
      const bookingTests = (res.booking?.tests || []).map((test: any) => normalizeLabTestPrice(test));
      const totalOriginalPrice = bookingTests.reduce((sum: number, test: any) => sum + Number(test.originalPrice || 0), 0);
      const totalSellingPrice = bookingTests.reduce((sum: number, test: any) => sum + Number(test.sellingPrice || 0), 0);
      setPaymentBooking({
        ...res.booking,
        tests: bookingTests,
        totalOriginalPrice,
        totalSellingPrice,
        discountAmount: Math.max(0, totalOriginalPrice - totalSellingPrice),
      });
      setPaymentOpen(true);
      toast({
        title: 'Booking created',
        description: 'Please complete payment to send it for admin assignment.',
      });
    } catch (error: any) {
      toast({
        title: 'Booking failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-16 pt-36 lg:pt-44">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Review lab test booking</h1>
          <p className="mt-2 text-muted-foreground">Confirm selected tests and sample collection details. Admin will assign a suitable nearby lab.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {tests.map((test) => (
                <div key={test._id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{test.testName}</p>
                      <p className="text-sm text-muted-foreground">{test.parameters.slice(0, 5).join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-primary">{formatPrice(test.sellingPrice)}</p>
                      <Button variant="ghost" size="icon" onClick={() => removeTest(test._id)} aria-label="Remove test">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Collection details</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Who is this booking for?</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant={bookingFor === 'self' ? 'default' : 'outline'} onClick={() => setBookingFor('self')}>Myself</Button>
                      <Button type="button" variant={bookingFor === 'family' ? 'default' : 'outline'} onClick={() => setBookingFor('family')}>Family/Friend</Button>
                    </div>
                  </div>
                  {bookingFor === 'family' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Select Member</Label>
                      <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger><SelectValue placeholder="Select Member" /></SelectTrigger>
                        <SelectContent>
                          {familyMembers.filter((member) => member.id !== 'self').map((member) => (
                            <SelectItem key={member.id} value={member.id}>{member.relation} - {member.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Input
                    value={form.patientName}
                    onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                    placeholder="Patient name"
                  />
                  <Input
                    value={form.patientMobile}
                    onChange={(e) => setForm({ ...form, patientMobile: e.target.value })}
                    placeholder="Mobile number"
                  />
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                  />
                  <Select value={form.collectionType} onValueChange={(value: 'home' | 'lab') => setForm({ ...form, collectionType: value })}>
                    <SelectTrigger><SelectValue placeholder="Collection type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home collection</SelectItem>
                      <SelectItem value="lab">Visit lab</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={form.preferredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                  />
                  <Select value={form.preferredTimeSlot} onValueChange={(value) => setForm({ ...form, preferredTimeSlot: value })}>
                    <SelectTrigger><SelectValue placeholder="Time slot" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</SelectItem>
                      <SelectItem value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</SelectItem>
                      <SelectItem value="12:00 PM - 02:00 PM">12:00 PM - 02:00 PM</SelectItem>
                      <SelectItem value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <LocationSearchInput
                        placeholder="Search address, area, city..."
                        defaultValue={form.address}
                        onLocationSelect={(_, __, address) => {
                          setForm((current) => ({ ...current, address }));
                          toast({ title: 'Address selected', description: 'Sample collection address saved.' });
                        }}
                        onError={(message) => toast({ title: 'Location not found', description: message, variant: 'destructive' })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fillCurrentLocationAddress}
                        disabled={fetchingAddress}
                        className="flex-1 sm:flex-none"
                      >
                        {fetchingAddress ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <LocateFixed className="mr-2 h-4 w-4" />
                        )}
                        Auto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setForm((current) => ({ ...current, address: '' }))}
                        disabled={!form.address}
                        aria-label="Clear address"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Complete address for sample collection"
                  />
                </div>
              </div>
            </div>

            <aside className="h-fit rounded-lg border border-border bg-card p-5 shadow-card">
              <h2 className="mb-4 text-lg font-semibold">Booking summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original price</span>
                  <span>{formatPrice(totalOriginal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-secondary">- {formatPrice(totalOriginal - totalSelling)}</span>
                </div>
                {coinsUsed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coins discount ({coinsUsed} coins)</span>
                    <span className="text-secondary">- {formatPrice(coinDiscount)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(payableTotal)}</span>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="useCoins"
                    checked={useCoins}
                    disabled={availableCoins <= 0}
                    onCheckedChange={(checked) => setUseCoins(Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="useCoins" className="font-semibold">Use reward coins</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Available: {availableCoins} coins. 1 coin = Rs. {coinValueInRupees || 0}.
                    </p>
                    {coinsUsed > 0 && (
                      <p className="mt-1 text-xs text-secondary">
                        {coinsUsed} coins will reduce {formatPrice(coinDiscount)}.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="my-5 space-y-3 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> {form.collectionType === 'home' ? 'Home sample collection' : 'Lab visit selected'}</p>
                <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {form.preferredDate}, {form.preferredTimeSlot}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {form.city}</p>
              </div>

              <div className="mb-5 rounded-lg border border-border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="labPatientConsent"
                    checked={acceptedPatientConsent}
                    onCheckedChange={(checked) => setAcceptedPatientConsent(Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="labPatientConsent" className="font-semibold">Patient consent and policies</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      I agree to{' '}
                      {getDocsBySlug(legalDocs, MOU_DOCUMENT_SLUGS).map((doc, index, docs) => (
                        <span key={doc.slug}>
                          <a href={getLegalDocumentPath(doc.slug)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{doc.title}</a>
                          {index < docs.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      .
                    </p>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={submitBooking} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IndianRupee className="mr-2 h-4 w-4" />}
                Book Now
              </Button>
            </aside>
          </div>
        )}
      </main>
      <LabTestPaymentModal
        open={paymentOpen}
        booking={paymentBooking}
        initialUseCoins={useCoins}
        hideCoinOption
        onClose={() => setPaymentOpen(false)}
        onSuccess={() => {
          writeLabCart([]);
          setPaymentOpen(false);
          navigate('/patient/records');
        }}
      />
      <Footer />
    </div>
  );
}
