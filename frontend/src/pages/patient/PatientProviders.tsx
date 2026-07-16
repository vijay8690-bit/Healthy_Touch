import { useState, useEffect } from 'react';
import { useNavigate, useLocation as useRouterLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  User,
  Star,
  Clock,
  IndianRupee,
  Filter,
  Stethoscope,
  Heart,
  Users,
  MapPin,
  Upload,
  X,
  File,
  Eye,
  Award,
  Phone,
  Mail,
  Download,
  CreditCard,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL, TOKEN_KEY } from '@/config/api.config';
import { FEATURES } from '@/config/features';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation as useSavedLocation } from '@/contexts/LocationContext';
import patientService from '@/services/patient.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaymentBookingModal from '@/components/PaymentBookingModal';
import {
  getActivePhysiotherapyAddons,
  getActivePhysiotherapyServices,
  type PhysiotherapyAddon,
  type PhysiotherapySelection,
  type PhysiotherapyService,
} from '@/services/physiotherapy.service';
import {
  getActiveNurseAddons,
  getActiveNurseServices,
  type NurseAddon,
  type NurseSelection,
  type NurseService,
} from '@/services/nurse.service';
import {
  getActiveCaretakerAddons,
  getActiveCaretakerServices,
  type CaretakerAddon,
  type CaretakerSelection,
  type CaretakerService,
} from '@/services/caretaker-catalog.service';

type ProviderType = 'all' | 'doctor' | 'nurse' | 'physiotherapy' | 'lab' | 'ambulance' | 'caretaker';

const NAVBAR_LOCATION_STORAGE_KEY = 'healthytouch_saved_location';
const LOCATION_UPDATED_EVENT = 'healthytouch-location-updated';
const OPEN_LOCATION_PICKER_EVENT = 'healthytouch-open-location-picker';

type SavedProviderLocation = {
  latitude: number | null;
  longitude: number | null;
  address: string;
};

const categoryAliases: Record<string, ProviderType> = {
  doctor: 'doctor',
  doctors: 'doctor',
  nurse: 'nurse',
  nurses: 'nurse',
  physiotherapy: 'physiotherapy',
  physiotherapist: 'physiotherapy',
  physiotherapists: 'physiotherapy',
  lab: 'lab',
  labs: 'lab',
  'lab-test': 'lab',
  'lab-tests': 'lab',
  'lab technician': 'lab',
  ambulance: 'ambulance',
  caretaker: 'caretaker',
  caretakers: 'caretaker',
  'care taker': 'caretaker',
  'care-taker': 'caretaker',
  'gda care taker': 'caretaker',
  'gda caretaker': 'caretaker',
};

const normalizeCategory = (category?: string | null): ProviderType => {
  const key = String(category || '').trim().toLowerCase();
  return categoryAliases[key] || 'all';
};

const isProviderTypeVisible = (type: ProviderType) => {
  if (type === 'doctor') return FEATURES.DOCTOR_MODULE;
  if (type === 'lab') return FEATURES.LAB_MODULE;
  if (type === 'ambulance') return FEATURES.AMBULANCE_MODULE;
  return true;
};

const formatDuration = (minutes?: number | string | null) => {
  const totalMinutes = Number(minutes) || 0;
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
};

const normalizeLocationText = (value?: string | null) => String(value || '').trim().toLowerCase();

const INDIAN_STATE_NAMES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana',
  'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur',
  'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir',
  'ladakh', 'puducherry', 'chandigarh', 'andaman and nicobar islands', 'dadra and nagar haveli and daman and diu',
  'lakshadweep',
]);

const getSavedNavbarLocation = (): SavedProviderLocation | null => {
  try {
    const raw = localStorage.getItem(NAVBAR_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lng !== 'number') return null;
    return {
      latitude: parsed.lat,
      longitude: parsed.lng,
      address: typeof parsed?.label === 'string' ? parsed.label : '',
    };
  } catch {
    return null;
  }
};

const resolveSelectedCityName = (address: string, providers: any[]) => {
  const normalizedAddress = normalizeLocationText(address);
  if (!normalizedAddress) return '';

  const providerCityMatch = providers
    .map((provider) => String(provider.address?.city || '').trim())
    .filter(Boolean)
    .find((city) => normalizedAddress.includes(normalizeLocationText(city)));

  if (providerCityMatch) return providerCityMatch;

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter((part) => {
      const normalized = normalizeLocationText(part);
      return normalized
        && normalized !== 'india'
        && !INDIAN_STATE_NAMES.has(normalized)
        && !/^\d{5,6}$/.test(normalized)
        && !/^-?\d+(\.\d+)?$/.test(normalized);
    });

  return parts[parts.length - 1] || 'your selected location';
};

const getProviderCityMatchesLocation = (provider: any, selectedLocation: SavedProviderLocation | null, selectedCityName: string) => {
  if (!selectedLocation?.address && !selectedCityName) return true;

  const providerCity = normalizeLocationText(provider.address?.city);
  if (!providerCity) return false;

  const selectedAddress = normalizeLocationText(selectedLocation?.address);
  const selectedCity = normalizeLocationText(selectedCityName);

  return providerCity === selectedCity || Boolean(selectedAddress && selectedAddress.includes(providerCity));
};

const getProviderTypeLabel = (type: ProviderType) => {
  if (type === 'nurse') return 'Nurse';
  if (type === 'physiotherapy') return 'Physiotherapy';
  if (type === 'caretaker') return 'Caretaker';
  if (type === 'doctor') return 'Doctor';
  return 'Healthcare';
};

const resolvePackagePrice = (regularAmount: number, option?: { customPrice?: number; discountPercentage?: number }) => {
  const customPrice = Number(option?.customPrice);
  if (Number.isFinite(customPrice) && customPrice >= 0) return customPrice;
  return regularAmount * (1 - Number(option?.discountPercentage || 0) / 100);
};

const resolveProviderServicePrice = (provider: any, pricingField: string, serviceId?: string, defaultPrice = 0) => {
  const customPrice = (provider?.[pricingField] || []).find((item: any) => String(item.serviceId?._id || item.serviceId) === String(serviceId))?.customPrice;
  const amount = Number(customPrice);
  return {
    amount: Number.isFinite(amount) && amount >= 0 ? amount : Number(defaultPrice || 0),
    hasCustomPrice: Number.isFinite(amount) && amount >= 0,
  };
};

const resolveProviderAddonPrice = (provider: any, pricingField: string, addonId?: string, defaultPrice = 0) => {
  const customPrice = (provider?.[pricingField] || []).find((item: any) => String(item.addonId?._id || item.addonId) === String(addonId))?.customPrice;
  const amount = Number(customPrice);
  return Number.isFinite(amount) && amount >= 0 ? amount : Number(defaultPrice || 0);
};

const resolveProviderPackagePrice = (
  baseAmount: number,
  count: number,
  option: { customPrice?: number; discountPercentage?: number } | undefined,
  hasCustomPrice: boolean,
) => {
  const regularAmount = Number(baseAmount || 0) * Number(count || 1);
  if (hasCustomPrice) {
    return regularAmount * (1 - Number(option?.discountPercentage || 0) / 100);
  }
  return resolvePackagePrice(regularAmount, option);
};

function PhysiotherapyBookingCard({
  provider,
  services,
  addons,
  onProfile,
  onBook,
}: {
  provider: any;
  services: PhysiotherapyService[];
  addons: PhysiotherapyAddon[];
  onProfile: () => void;
  onBook: (selection: PhysiotherapySelection) => void;
}) {
  const [bookingType, setBookingType] = useState<'single' | 'package'>('single');
  const [serviceId, setServiceId] = useState('');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [packageSessions, setPackageSessions] = useState<5 | 10 | 20>(5);
  const safeServices = Array.isArray(services) ? services : [];
  const safeAddons = Array.isArray(addons) ? addons : [];
  const selectedService = safeServices.find((service) => service._id === serviceId) || safeServices[0];
  const packageOptions = Array.isArray(selectedService?.packages)
    ? selectedService.packages.filter((item) => item.isActive !== false)
    : [];

  useEffect(() => {
    if (!serviceId && safeServices[0]) setServiceId(safeServices[0]._id);
  }, [safeServices, serviceId]);

  useEffect(() => {
    if (bookingType === 'package' && packageOptions.length && !packageOptions.some((item) => item.sessions === packageSessions)) {
      setPackageSessions(packageOptions[0].sessions);
    }
  }, [bookingType, packageOptions, packageSessions]);

  const packageOption = packageOptions.find((item) => item.sessions === packageSessions);
  const selectedPrice = resolveProviderServicePrice(provider, 'physiotherapyServicePricing', selectedService?._id, selectedService?.price || 0);
  const serviceAmount = bookingType === 'package'
    ? resolveProviderPackagePrice(selectedPrice.amount, packageSessions, packageOption, selectedPrice.hasCustomPrice)
    : selectedPrice.amount;
  const addonMultiplier = bookingType === 'package' ? packageSessions : 1;
  const addonAmount = safeAddons
    .filter((addon) => addonIds.includes(addon._id))
    .reduce((sum, addon) => sum + resolveProviderAddonPrice(provider, 'physiotherapyAddonPricing', addon._id, addon.price || 0) * addonMultiplier, 0);
  const total = Math.round(serviceAmount + addonAmount);
  const name = provider.userId?.name || 'Physiotherapist';
  const photo = provider.userId?.profileImage || provider.profileImage;
  const initials = name.split(' ').map((part: string) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const availability = Array.isArray(provider.availability) ? provider.availability : [];
  const availableToday = availability.some((slot: any) => slot.day === todayName);

  return (
    <motion.div className="rounded-lg border border-border bg-card p-2 text-xs shadow-sm" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="flex items-start gap-2 border-b border-border pb-2">
        {photo ? (
          <img src={photo} alt={name} className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials}</div>
        )}
        <div className="min-w-0 flex-1">
          <Badge className="mb-1 bg-primary/10 px-1.5 py-0 text-[10px] text-primary hover:bg-primary/10">Physiotherapist</Badge>
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {provider._averageRating || 0} <span>·</span> {provider._totalReviews || 0} reviews
          </div>
          <p className={`mt-1 line-clamp-1 text-xs font-medium ${availableToday ? 'text-green-600' : 'text-muted-foreground'}`}>
            {availableToday ? 'Available today' : 'Next available slot shown at booking'}
          </p>
        </div>
        <div className="hidden max-w-[105px] text-right text-[11px] sm:block">
          <p className="text-muted-foreground">Specialization</p>
          <p className="line-clamp-1 font-medium">{provider.specialization || 'Physiotherapy'}</p>
          <p className="text-muted-foreground">{provider.experience || 0} yrs exp.</p>
        </div>
      </div>

      <div className="my-2 grid grid-cols-2 gap-1.5">
        <Button type="button" size="sm" variant={bookingType === 'single' ? 'default' : 'outline'} onClick={() => setBookingType('single')}>
          Single session
        </Button>
        <Button
          type="button"
          size="sm"
          variant={bookingType === 'package' ? 'default' : 'outline'}
          onClick={() => setBookingType('package')}
          disabled={!packageOptions.length}
        >
          Package (5/10/20)
        </Button>
      </div>

      {bookingType === 'package' && packageOptions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
          {packageOptions.map((option) => (
            <Button
              key={option.sessions}
              type="button"
              size="sm"
              variant={packageSessions === option.sessions ? 'secondary' : 'outline'}
              onClick={() => setPackageSessions(option.sessions)}
            >
              {option.sessions} sessions
            </Button>
          ))}
        </div>
      )}

      <div className="max-h-20 space-y-1.5 overflow-y-auto pr-1">
        {safeServices.length ? safeServices.map((service) => (
          <label key={service._id} className={`flex cursor-pointer items-start justify-between gap-2 rounded-lg border p-1.5 ${selectedService?._id === service._id ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <div className="flex gap-2">
              <input
                type="radio"
                name={`physio-service-${provider._id}`}
                checked={selectedService?._id === service._id}
                onChange={() => setServiceId(service._id)}
                className="mt-1 accent-current"
              />
              <div>
                <p className="line-clamp-1 font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.description || service.category} - {formatDuration(service.durationMinutes)}</p>
              </div>
            </div>
            <p className="shrink-0 text-right text-xs font-semibold">Rs. {resolveProviderServicePrice(provider, 'physiotherapyServicePricing', service._id, service.price || 0).amount.toLocaleString('en-IN')}<span className="block text-[11px] font-normal text-muted-foreground">/session</span></p>
          </label>
        )) : (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">This physiotherapist has not selected any active services.</div>
        )}
      </div>

      <div className="my-2 border-t border-border pt-2">
        <p className="mb-2 text-xs font-medium">Equipment add-on (optional)</p>
        <div className="max-h-16 space-y-1.5 overflow-y-auto pr-1">
          {safeAddons.map((addon) => (
            <label key={addon._id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-border p-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={addonIds.includes(addon._id)}
                  onCheckedChange={(checked) => setAddonIds((current) => checked ? [...current, addon._id] : current.filter((id) => id !== addon._id))}
                />
                <div>
                  <p className="line-clamp-1 text-xs font-medium">{addon.name}</p>
                  <p className="text-xs text-muted-foreground">{addon.description || 'Per session'}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-amber-700">+Rs. {resolveProviderAddonPrice(provider, 'physiotherapyAddonPricing', addon._id, addon.price || 0).toLocaleString('en-IN')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-2">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span>Total</span>
          <span className="font-bold">Rs. {total.toLocaleString('en-IN')}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr]">
          <Button size="sm" variant="outline" onClick={onProfile}><Eye className="mr-1 h-4 w-4" />View profile</Button>
          <Button
            size="sm"
            disabled={!selectedService || provider.availabilityStatus === false}
            onClick={() => selectedService && onBook({
              bookingType,
              physiotherapyServiceId: selectedService._id,
              selectedAddonIds: addonIds,
              ...(bookingType === 'package' && { packageSessionCount: packageSessions }),
              serviceName: selectedService.name,
              estimatedServiceAmount: serviceAmount,
              estimatedAddonAmount: addonAmount,
              estimatedFinalAmount: total,
            })}
          >
            Book now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function NurseBookingCard({
  provider, services, addons, onProfile, onBook,
}: {
  provider: any;
  services: NurseService[];
  addons: NurseAddon[];
  onProfile: () => void;
  onBook: (selection: NurseSelection) => void;
}) {
  const [bookingType, setBookingType] = useState<'single' | 'package'>('single');
  const [serviceId, setServiceId] = useState('');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [packageVisits, setPackageVisits] = useState(5);
  const selectedService = services.find((service) => service._id === serviceId) || services[0];
  const packageOptions = (selectedService?.packages || []).filter((option) => option.isActive !== false);
  useEffect(() => {
    if (!serviceId && services[0]) setServiceId(services[0]._id);
  }, [services, serviceId]);
  useEffect(() => {
    if (bookingType === 'package' && packageOptions.length && !packageOptions.some((option) => option.visitsCount === packageVisits)) {
      setPackageVisits(packageOptions[0].visitsCount);
    }
  }, [bookingType, packageOptions, packageVisits]);
  const packageOption = packageOptions.find((option) => option.visitsCount === packageVisits);
  const selectedPrice = resolveProviderServicePrice(provider, 'nurseServicePricing', selectedService?._id, selectedService?.price || 0);
  const serviceAmount = bookingType === 'package'
    ? resolveProviderPackagePrice(selectedPrice.amount, packageVisits, packageOption, selectedPrice.hasCustomPrice)
    : selectedPrice.amount;
  const addonMultiplier = bookingType === 'package' ? packageVisits : 1;
  const addonAmount = addons.filter((addon) => addonIds.includes(addon._id)).reduce((sum, addon) => sum + resolveProviderAddonPrice(provider, 'nurseAddonPricing', addon._id, addon.price || 0) * addonMultiplier, 0);
  const total = Math.round(serviceAmount + addonAmount);
  const name = provider.userId?.name || 'Nurse';
  const photo = provider.userId?.profileImage || provider.profileImage;
  const initials = name.split(' ').map((part: string) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const availableToday = (provider.availability || []).some((slot: any) => slot.day === todayName);

  return (
    <motion.div className="rounded-lg border border-border bg-card p-2 text-xs shadow-sm" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="flex items-start gap-2 border-b border-border pb-2">
        {photo ? <img src={photo} alt={name} className="h-9 w-9 rounded-lg object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials}</div>}
        <div className="min-w-0 flex-1">
          <Badge className="mb-1 bg-primary/10 px-1.5 py-0 text-[10px] text-primary hover:bg-primary/10">Nurse</Badge>
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{provider._averageRating || 0} <span>-</span> {provider._totalReviews || 0} reviews</div>
          <p className={`mt-1 line-clamp-1 text-xs font-medium ${availableToday ? 'text-green-600' : 'text-muted-foreground'}`}>{availableToday ? 'Available today' : 'Next available slot shown at booking'}</p>
        </div>
        <div className="hidden max-w-[105px] text-right text-[11px] sm:block"><p className="text-muted-foreground">Specialization</p><p className="line-clamp-1 font-medium">{provider.specialization || 'Home Nursing'}</p><p className="text-muted-foreground">{provider.experience || 0} yrs exp.</p></div>
      </div>
      <div className="my-2 grid grid-cols-2 gap-1.5">
        <Button type="button" size="sm" variant={bookingType === 'single' ? 'default' : 'outline'} onClick={() => setBookingType('single')}>Single visit</Button>
        <Button type="button" size="sm" variant={bookingType === 'package' ? 'default' : 'outline'} onClick={() => setBookingType('package')} disabled={!packageOptions.length}>Package</Button>
      </div>
      {bookingType === 'package' && packageOptions.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{packageOptions.map((option) => <Button key={option.packageType} type="button" size="sm" variant={packageVisits === option.visitsCount ? 'secondary' : 'outline'} onClick={() => setPackageVisits(option.visitsCount)}>{option.packageType === 'monthly' ? 'Monthly care' : `${option.visitsCount} visits`}</Button>)}</div>}
      <div className="max-h-20 space-y-1.5 overflow-y-auto pr-1">
        {services.length ? services.map((service) => <label key={service._id} className={`flex cursor-pointer items-start justify-between gap-2 rounded-lg border p-1.5 ${selectedService?._id === service._id ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <div className="flex gap-2"><input type="radio" name={`nurse-service-${provider._id}`} checked={selectedService?._id === service._id} onChange={() => setServiceId(service._id)} className="mt-1 accent-current" /><div><p className="line-clamp-1 font-medium">{service.serviceName}</p><p className="text-xs text-muted-foreground">{service.description || service.category} - {formatDuration(service.durationMinutes)}</p>{service.requiredEquipment && <p className="text-xs text-muted-foreground">Equipment: {service.requiredEquipment}</p>}</div></div>
          <p className="shrink-0 text-right text-xs font-semibold">Rs. {resolveProviderServicePrice(provider, 'nurseServicePricing', service._id, service.price || 0).amount.toLocaleString('en-IN')}<span className="block text-[11px] font-normal text-muted-foreground">/visit</span></p>
        </label>) : <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">This nurse has not selected any active services.</div>}
      </div>
      <div className="my-2 border-t border-border pt-2">
        <p className="mb-2 text-xs font-medium">Optional add-ons</p>
        <div className="max-h-16 space-y-1.5 overflow-y-auto pr-1">{addons.map((addon) => <label key={addon._id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed p-1.5"><div className="flex items-center gap-2"><Checkbox checked={addonIds.includes(addon._id)} onCheckedChange={(checked) => setAddonIds((current) => checked ? [...current, addon._id] : current.filter((id) => id !== addon._id))} /><div><p className="line-clamp-1 text-xs font-medium">{addon.addOnName}</p><p className="text-xs text-muted-foreground">{addon.description || 'Per visit'}</p></div></div><span className="text-xs font-medium text-amber-700">+Rs. {resolveProviderAddonPrice(provider, 'nurseAddonPricing', addon._id, addon.price || 0).toLocaleString('en-IN')}</span></label>)}</div>
      </div>
      <div className="border-t border-border pt-2"><div className="mb-2 flex items-center justify-between text-xs"><span>Total</span><span className="font-bold">Rs. {total.toLocaleString('en-IN')}</span></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr]"><Button size="sm" variant="outline" onClick={onProfile}><Eye className="mr-1 h-4 w-4" />View profile</Button><Button size="sm" disabled={!selectedService || provider.availabilityStatus === false} onClick={() => selectedService && onBook({ bookingType, nurseServiceId: selectedService._id, selectedAddonIds: addonIds, ...(bookingType === 'package' && { packageVisitCount: packageVisits }), serviceName: selectedService.serviceName, estimatedServiceAmount: serviceAmount, estimatedAddonAmount: addonAmount, estimatedFinalAmount: total })}>Book now</Button></div></div>
    </motion.div>
  );
}

function CaretakerBookingCard({ provider, services, addons, onProfile, onBook }: {
  provider: any; services: CaretakerService[]; addons: CaretakerAddon[]; onProfile: () => void; onBook: (selection: CaretakerSelection) => void;
}) {
  const [serviceId, setServiceId] = useState('');
  const [packageType, setPackageType] = useState<'hourly' | '12_hours' | '24_hours' | 'weekly' | 'monthly'>('hourly');
  const [genderPreference, setGenderPreference] = useState<'Female' | 'Male' | 'Any'>('Any');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const selectedService = services.find((item) => item._id === serviceId) || services[0];
  const packages = (selectedService?.packages || []).filter((item) => item.isActive !== false);
  useEffect(() => { if (!serviceId && services[0]) setServiceId(services[0]._id); }, [services, serviceId]);
  useEffect(() => { if (packages.length && !packages.some((item) => item.packageType === packageType)) setPackageType(packages[0].packageType); }, [packages, packageType]);
  useEffect(() => {
    if (selectedService?.defaultGenderPreference) setGenderPreference(selectedService.defaultGenderPreference);
  }, [selectedService?._id]);
  const selectedPackage = packages.find((item) => item.packageType === packageType);
  const customPrice = (provider.caretakerServicePricing || []).find((item: any) => String(item.serviceId?._id || item.serviceId) === selectedService?._id)?.customPrice;
  const customServiceAmount = Number(customPrice);
  const hasCustomServicePrice = Number.isFinite(customServiceAmount) && customServiceAmount >= 0;
  const bookingType: 'single' | 'package' = selectedPackage ? 'package' : 'single';
  const serviceAmount = hasCustomServicePrice ? customServiceAmount : selectedPackage ? Number(selectedPackage.price || 0) : Number(selectedService?.basePrice ?? 0);
  const addonAmount = addons.filter((addon) => addonIds.includes(addon._id)).reduce((sum, addon) => sum + resolveProviderAddonPrice(provider, 'caretakerAddonPricing', addon._id, addon.price || 0), 0);
  const total = Math.round(serviceAmount + addonAmount);
  const name = provider.userId?.name || 'Caretaker';
  const photo = provider.userId?.profileImage || provider.profileImage;
  const initials = name.split(' ').map((p: string) => p.charAt(0)).join('').slice(0, 2).toUpperCase();
  const availableToday = (provider.availability || []).some((slot: any) => slot.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const tags = [
    ...(provider.languagesKnown || []),
    ...(selectedService?.tags || []),
    provider.caretakerServiceType,
  ].filter(Boolean).slice(0, 4);
  const packageTabs = packages.length ? packages : [];
  return <motion.div className="rounded-lg border border-border bg-card p-2 text-xs shadow-sm" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
    <div className="flex items-start gap-2 border-b border-border pb-2">
      {photo ? <img src={photo} alt={name} className="h-9 w-9 rounded-lg object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials}</div>}
      <div className="min-w-0 flex-1">
        <Badge className="mb-1 bg-primary/10 px-1.5 py-0 text-[10px] text-primary hover:bg-primary/10">GDA • Caretaker</Badge>
        <h3 className="truncate text-sm font-semibold">{name}</h3>
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span>{provider._averageRating || 0}</span>
          <span>•</span>
          <span>{provider._totalReviews || 0} reviews</span>
          <span>•</span>
          <span>{provider.experience || 0} yrs exp.</span>
        </div>
      </div>
      <div className="hidden max-w-[105px] text-right text-[11px] sm:block">
        <p className="font-medium leading-tight">{selectedService?.handlesText || selectedService?.category || provider.specialization || 'Home care'}</p>
        <p className={`mt-1 flex items-center justify-end gap-1 text-xs ${availableToday ? 'text-green-700' : 'text-muted-foreground'}`}><span className={`h-2 w-2 rounded-full ${availableToday ? 'bg-green-600' : 'bg-muted-foreground'}`} />{availableToday ? 'Available' : 'Ask schedule'}</p>
      </div>
    </div>

    {tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{tag}</span>)}</div>}

    <div className="my-2 border-t border-border pt-2">
      <p className="mb-2 text-xs font-medium">Shift type chunein</p>
      {packageTabs.length > 0 && <div className="flex gap-1.5 overflow-x-auto pb-1">{packageTabs.map((item) => <button key={item.packageType} type="button" onClick={() => setPackageType(item.packageType)} className={`min-w-[58px] rounded-lg border px-2 py-1.5 text-center text-xs transition-colors ${packageType === item.packageType ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'}`}><span className="block font-semibold">{item.label || item.packageType.replace('_', ' ')}</span><span className="block text-[11px] text-muted-foreground">{item.shortLabel || `${item.durationHours} hr`}</span></button>)}</div>}
    </div>

    <div className="max-h-20 space-y-1.5 overflow-y-auto pr-1">
      {services.length ? services.map((service) => {
        const option = service.packages?.find((item) => item.isActive !== false && item.packageType === packageType);
        const serviceCustomPrice = (provider.caretakerServicePricing || []).find((item: any) => String(item.serviceId?._id || item.serviceId) === service._id)?.customPrice;
        const serviceCustomAmount = Number(serviceCustomPrice);
        const hasServiceCustomPrice = Number.isFinite(serviceCustomAmount) && serviceCustomAmount >= 0;
        const rowAmount = hasServiceCustomPrice ? serviceCustomAmount : option ? Number(option.price || 0) : Number(service.basePrice ?? 0);
        const rowUnit = hasServiceCustomPrice ? service.basePriceUnit || 'shift' : option?.priceUnit || service.basePriceUnit || 'shift';
        return <label key={service._id} className={`flex cursor-pointer items-start justify-between gap-2 rounded-lg border p-1.5 ${selectedService?._id === service._id ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <div className="flex min-w-0 gap-2">
            <input type="radio" checked={selectedService?._id === service._id} onChange={() => setServiceId(service._id)} name={`caretaker-${provider._id}`} className="mt-1 accent-current" />
            <div className="min-w-0">
              <p className="line-clamp-1 font-medium">{option?.label || service.serviceName}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{option?.description || service.description || `${service.durationHours} hrs - assistance`}</p>
              {option?.isPopular && <Badge className="mt-1 bg-green-100 px-1.5 py-0 text-[10px] text-green-700 hover:bg-green-100">Popular</Badge>}
            </div>
          </div>
          <p className="shrink-0 text-right text-xs font-semibold">Rs. {rowAmount.toLocaleString('en-IN')}<span className="block text-[11px] font-normal text-muted-foreground">/{rowUnit}</span></p>
        </label>;
      }) : <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">This caretaker has not selected active services.</div>}
    </div>

    <div className="my-2 border-t border-border pt-2">
      <p className="mb-2 text-xs font-medium">Caretaker gender preference</p>
      <div className="grid grid-cols-3 gap-1.5">{(['Female', 'Male', 'Any'] as const).map((item) => <button key={item} type="button" onClick={() => setGenderPreference(item)} className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${genderPreference === item ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'}`}>{item === 'Female' ? '♀ ' : item === 'Male' ? '♂ ' : ''}{item}</button>)}</div>
    </div>

    {addons.length > 0 && <div className="my-2 border-t border-border pt-2"><p className="mb-2 text-xs font-medium">Optional add-ons</p><div className="max-h-16 space-y-1.5 overflow-y-auto pr-1">{addons.map((addon) => <label key={addon._id} className="flex justify-between rounded-lg border border-dashed p-1.5 text-xs"><span className="flex gap-2"><Checkbox checked={addonIds.includes(addon._id)} onCheckedChange={(checked) => setAddonIds((current) => checked ? [...current, addon._id] : current.filter((id) => id !== addon._id))} />{addon.addOnName}</span><span>+Rs. {resolveProviderAddonPrice(provider, 'caretakerAddonPricing', addon._id, addon.price || 0).toLocaleString('en-IN')}</span></label>)}</div></div>}

    <div className="border-t border-border pt-2"><div className="mb-2 flex items-center justify-between text-xs"><span>Total</span><span className="font-bold">Rs. {total.toLocaleString('en-IN')}</span></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr]"><Button size="sm" variant="outline" onClick={onProfile}><Eye className="mr-1 h-4 w-4" />View profile</Button><Button size="sm" disabled={!selectedService || provider.availabilityStatus === false} onClick={() => selectedService && onBook({ bookingType, caretakerServiceId: selectedService._id, selectedAddonIds: addonIds, ...(bookingType === 'package' && { packageType }), serviceName: selectedService.serviceName, genderPreference, estimatedServiceAmount: serviceAmount, estimatedAddonAmount: addonAmount, estimatedFinalAmount: total })}>Book now</Button></div></div>
  </motion.div>;
}

export default function PatientProviders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('all');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [viewDetailsProvider, setViewDetailsProvider] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [booking, setBooking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [providerReviews, setProviderReviews] = useState<any[]>([]);
  const [physiotherapyServices, setPhysiotherapyServices] = useState<PhysiotherapyService[]>([]);
  const [physiotherapyAddons, setPhysiotherapyAddons] = useState<PhysiotherapyAddon[]>([]);
  const [nurseServices, setNurseServices] = useState<NurseService[]>([]);
  const [nurseAddons, setNurseAddons] = useState<NurseAddon[]>([]);
  const [caretakerServices, setCaretakerServices] = useState<CaretakerService[]>([]);
  const [caretakerAddons, setCaretakerAddons] = useState<CaretakerAddon[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { location: savedContextLocation } = useSavedLocation();
  const navigate = useNavigate(); 
  const location = useRouterLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q') || searchParams.get('search');
  const [selectedLocation, setSelectedLocation] = useState<SavedProviderLocation | null>(() => {
    const navbarLocation = getSavedNavbarLocation();
    if (navbarLocation) return navbarLocation;
    try {
      const raw = localStorage.getItem('user_location') || sessionStorage.getItem('user_location');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        latitude: typeof parsed?.latitude === 'number' ? parsed.latitude : null,
        longitude: typeof parsed?.longitude === 'number' ? parsed.longitude : null,
        address: typeof parsed?.address === 'string' ? parsed.address : '',
      };
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!savedContextLocation) return;
    setSelectedLocation({
      latitude: savedContextLocation.latitude,
      longitude: savedContextLocation.longitude,
      address: savedContextLocation.address || '',
    });
  }, [savedContextLocation]);

  useEffect(() => {
    const applySavedLocation = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (typeof detail?.lat === 'number' && typeof detail?.lng === 'number') {
        setSelectedLocation({
          latitude: detail.lat,
          longitude: detail.lng,
          address: detail.label || '',
        });
        return;
      }

      const navbarLocation = getSavedNavbarLocation();
      if (navbarLocation) {
        setSelectedLocation(navbarLocation);
      }
    };

    window.addEventListener(LOCATION_UPDATED_EVENT, applySavedLocation);
    window.addEventListener('storage', applySavedLocation);
    window.addEventListener('focus', applySavedLocation);
    return () => {
      window.removeEventListener(LOCATION_UPDATED_EVENT, applySavedLocation);
      window.removeEventListener('storage', applySavedLocation);
      window.removeEventListener('focus', applySavedLocation);
    };
  }, []);

  useEffect(() => {
    const normalizedCategory = normalizeCategory(categoryParam);
    if (normalizedCategory === 'lab') {
      navigate('/lab-tests', { replace: true });
      return;
    }
    if (normalizedCategory === 'ambulance') {
      navigate('/ambulance/book', { replace: true });
      return;
    }
    if (!isProviderTypeVisible(normalizedCategory)) {
      navigate('/patient/providers', { replace: true });
      return;
    }
    setProviderType(normalizedCategory);
  }, [categoryParam, navigate]);

  useEffect(() => {
    setSearchQuery(queryParam || '');
  }, [queryParam]);

  const handleProviderTypeChange = (value: ProviderType) => {
    if (value === 'lab') {
      navigate('/lab-tests');
      return;
    }
    if (value === 'ambulance') {
      navigate('/ambulance/book');
      return;
    }
    if (!isProviderTypeVisible(value)) return;

    setProviderType(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', value);
    }
    setSearchParams(nextParams);
  };

  const normalizeAssetUrl = (raw?: string | null) => {
    if (!raw) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('res.cloudinary.com/')) return `https://${trimmed}`;
    return trimmed;
  };

  const stripQueryAndHash = (url: string) => url.split(/[?#]/)[0];

  const getFileExtension = (url: string) => {
    const clean = stripQueryAndHash(url);
    const match = clean.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : '';
  };

  const isImageUrl = (url: string) => {
    const ext = getFileExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  };

  const isPdfUrl = (url: string) => getFileExtension(url) === 'pdf';

  const isWordUrl = (url: string) => {
    const ext = getFileExtension(url);
    return ext === 'doc' || ext === 'docx';
  };

  const getDownloadName = (base: string, url: string, fallbackExt = 'pdf') => {
    const ext = getFileExtension(url) || fallbackExt;
    return `${base}.${ext}`;
  };

  const getAssetViewUrl = (src: string, disposition: 'inline' | 'attachment' = 'inline') => {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const params = new URLSearchParams({
      src,
      token,
      disposition,
    });
    return `${API_BASE_URL}/assets/view?${params.toString()}`;
  };

  // Dynamic slots state for selected provider/date
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const getDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });

  // When opening booking, default date to today
  useEffect(() => {
    if (selectedProvider && !selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedProvider]);

  // Fetch available slots whenever provider or date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedProvider || !selectedDate) {
        setAvailableSlots([]);
        return;
      }
      try {
        setSlotsLoading(true);
        const res = await patientService.getAvailableSlots(selectedProvider._id, selectedDate);
        console.log('Slots Response:', res);
        setAvailableSlots(res.availableSlots || []);
      } catch (error) {
        console.error('Error fetching slots:', error);
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedProvider, selectedDate]);

  // Fetch provider reviews when details modal opens
  useEffect(() => {
    const fetchProviderReviews = async () => {
      if (!viewDetailsProvider) {
        setProviderReviews([]);
        return;
      }
      try {
        setLoadingReviews(true);
        const res = await patientService.getProviderReviews(viewDetailsProvider._id);
        if (res.success) {
          setProviderReviews(res.reviews || []);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setProviderReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchProviderReviews();
  }, [viewDetailsProvider]);

  useEffect(() => {
    fetchProviders();
  }, []); // Only fetch once on mount

  useEffect(() => {
    Promise.all([getActivePhysiotherapyServices(), getActivePhysiotherapyAddons()])
      .then(([serviceResponse, addonResponse]) => {
        setPhysiotherapyServices(Array.isArray(serviceResponse.services) ? serviceResponse.services : []);
        setPhysiotherapyAddons(Array.isArray(addonResponse.addons) ? addonResponse.addons : []);
      })
      .catch(() => {
        setPhysiotherapyServices([]);
        setPhysiotherapyAddons([]);
      });
  }, []);

  useEffect(() => {
    Promise.all([getActiveCaretakerServices(), getActiveCaretakerAddons()])
      .then(([servicesResponse, addonsResponse]) => { setCaretakerServices(servicesResponse.services || []); setCaretakerAddons(addonsResponse.addons || []); })
      .catch(() => { setCaretakerServices([]); setCaretakerAddons([]); });
  }, []);

  useEffect(() => {
    Promise.all([getActiveNurseServices(), getActiveNurseAddons()])
      .then(([serviceResponse, addonResponse]) => {
        setNurseServices(Array.isArray(serviceResponse.services) ? serviceResponse.services : []);
        setNurseAddons(Array.isArray(addonResponse.addons) ? addonResponse.addons : []);
      })
      .catch(() => {
        setNurseServices([]);
        setNurseAddons([]);
      });
  }, []);

  useEffect(() => {

    if (location.state?.openBooking && location.state?.providerData) {
      setSelectedProvider(location.state.providerData);
      setShowModal(true);
      // Clear state
      window.history.replaceState({}, document.title);
    }

  }, [location]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      let response;
      // Always fetch all providers, filter on frontend
      response = await patientService.getAllProviders();
      if (response.success) {
        console.log('Fetched Providers:', response.providers);
        if (response.providers.length > 0) {
          console.log('Sample Provider Data:', response.providers[0]);
          console.log('Sample Provider Image:', response.providers[0]?.userId?.profileImage || response.providers[0]?.profileImage);
        }
        setProviders(response.providers);
      }
    } catch (error: any) {
      console.error('Fetch providers error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to fetch providers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCityName = resolveSelectedCityName(selectedLocation?.address || '', providers);
  const selectedServiceLabel = getProviderTypeLabel(providerType);

  const filteredProviders = providers.filter((provider) => {
    // Temporarily hide lab technician cards only on the patient provider listing.
    if (normalizeCategory(provider.category) === 'lab') return false;

    const searchLower = searchQuery.toLowerCase();

    // Match search across all fields
    const matchesSearch = !searchQuery ||
      provider.userId?.name?.toLowerCase().includes(searchLower) ||
      provider.specialization?.toLowerCase().includes(searchLower) ||
      provider.category?.toLowerCase().includes(searchLower) ||
      provider.userId?.email?.toLowerCase().includes(searchLower) ||
      provider.userId?.mobile?.includes(searchQuery) ||
      provider.address?.city?.toLowerCase().includes(searchLower) ||
      provider.address?.state?.toLowerCase().includes(searchLower) ||
      provider.address?.street?.toLowerCase().includes(searchLower) ||
      provider.address?.pincode?.includes(searchQuery);

    // Match category filter through normalized URL/provider categories.
    const normalizedProviderCategory = normalizeCategory(provider.category);
    const matchesVisibleCategory = isProviderTypeVisible(normalizedProviderCategory);
    const matchesCategory = providerType === 'all' ||
      normalizeCategory(provider.category) === providerType;

    const matchesSelectedLocation = getProviderCityMatchesLocation(provider, selectedLocation, selectedCityName);

    return matchesVisibleCategory && matchesSearch && matchesCategory && matchesSelectedLocation;
  });

  const handleChangeLocation = () => {
    window.dispatchEvent(new CustomEvent(OPEN_LOCATION_PICKER_EVENT));
  };

  const handleBookAppointment = async () => {
    if (selectedProvider?.availabilityStatus === false) {
      toast({
        title: 'Provider unavailable',
        description: 'This provider is currently unavailable. Please try later.',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Please select date and time',
        variant: 'destructive',
      });
      return;
    }
    if (!reason) {
      toast({
        title: 'Please enter reason for visit',
        variant: 'destructive',
      });
      return;
    }

    try {
      setBooking(true);
      const response = await patientService.bookAppointment({
        providerId: selectedProvider._id,
        date: selectedDate,
        timeSlot: selectedTime,
        reason: reason,
        notes: uploadedFiles.length > 0 ? `${uploadedFiles.length} prescription(s) uploaded` : '',
      });

      if (response.success) {
        toast({
          title: 'Appointment Booked!',
          description: response.message || `Your appointment with ${selectedProvider.userId?.name} has been booked for ${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}.`,
        });
        setSelectedProvider(null);
        setSelectedDate('');
        setSelectedTime('');
        setUploadedFiles([]);
        setReason('');
      } else {
        toast({
          title: 'Booking Failed',
          description: response.message || 'Failed to book appointment',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to book appointment',
        variant: 'destructive',
      });
    } finally {
      setBooking(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      if (allowedTypes.includes(file.type)) {
        const isImage = file.type.startsWith('image/');
        const maxBytes = isImage ? 3 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size <= maxBytes) {
          validFiles.push(file);
        } else {
          invalidFiles.push(`${file.name} (exceeds ${isImage ? '3MB image' : '5MB document'})`);
        }
      } else {
        invalidFiles.push(`${file.name} (invalid format)`);
      }
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast({
        title: 'Files Uploaded',
        description: `${validFiles.length} prescription(s) uploaded successfully.`,
      });
    }

    if (invalidFiles.length > 0) {
      toast({
        title: 'Some files were not uploaded',
        description: invalidFiles.join(', '),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast({
      title: 'File Removed',
      description: 'Prescription file has been removed.',
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type === 'application/pdf') return '📄';
    return '📝';
  };

  const getProviderIcon = (type: string) => {
    switch (normalizeCategory(type)) {
      case 'doctor': return Stethoscope;
      case 'nurse': return Heart;
      case 'physiotherapy': return Users;
      case 'lab': return FileText;
      case 'ambulance': return Phone;
      case 'caretaker': return Users;
      default: return Stethoscope;
    }
  };

  const getProviderLabel = (type: string) => {
    switch (normalizeCategory(type)) {
      case 'doctor': return 'Doctor';
      case 'nurse': return 'Nurse';
      case 'physiotherapy': return 'Physiotherapist';
      case 'lab': return 'Lab Technician';
      case 'ambulance': return 'Ambulance';
      case 'caretaker': return 'Care Taker';
      default: return 'Provider';
    }
  };

  const timeSlots = Array.from({ length: 28 }, (_, index) => {
    const totalMinutes = (7 * 60) + (index * 30);
    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  });

  // Helper function to check if a time slot is in the past or too soon (less than 30 minutes from now)
  const isTimeSlotPast = (timeSlot: string, dateStr: string) => {
    const selectedDate = new Date(dateStr);
    const today = new Date();

    // Reset time to compare only dates
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // If not today, all slots are valid
    if (selectedDate.getTime() !== today.getTime()) {
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

  const handleProtectedBooking = (provider: any) => {
    // User login nahi hai
    if (!user) {
      const redirectTo = `${location.pathname}${location.search}${location.hash}`;

      toast({
        title: "Login Required",
        description: "Please login first to book appointment",
      });

      navigate('/auth', {
        state: {
          redirectTo,
          openBooking: true,
          providerData: provider,
        },
      });
      return;
    }

    // Provider unavailable
    if (provider.availabilityStatus === false) {
      toast({
        title: 'Provider unavailable',
        description: 'This provider is currently unavailable. Please try later.',
        variant: 'destructive',
      });
      return;
    }

    // User logged in
    setSelectedProvider(provider);
    setShowModal(true);
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto space-y-6 px-4 pb-16 pt-36 lg:pt-44">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-display text-2xl font-bold">Find Healthcare Providers</h2>
            <p className="text-muted-foreground">Book appointments with doctors, nurses & care takers</p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-healthcare p-4"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, location, category, email, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={providerType} onValueChange={(v) => handleProviderTypeChange(v as ProviderType)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Provider Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="nurse">Nurses</SelectItem>
                  <SelectItem value="physiotherapy">Physiotherapists</SelectItem>
                  {FEATURES.LAB_MODULE && <SelectItem value="lab">Lab Tests</SelectItem>}
                  {FEATURES.DOCTOR_MODULE && <SelectItem value="doctor">Doctors</SelectItem>}
                  {FEATURES.AMBULANCE_MODULE && <SelectItem value="ambulance">Ambulance</SelectItem>}
                  <SelectItem value="caretaker">Care Takers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Provider Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredProviders.map((provider, index) => {
              const ProviderIcon = getProviderIcon(provider.category || 'doctor');
              // Compute today's and next availability from provider schedule
              const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const todayIndex = new Date().getDay();
              const todayName = daysOrder[todayIndex];
              const todayAvailability = provider.availability?.find((a: any) => a.day === todayName);
              let nextAvailability: any = null;
               for (let offset = 1; offset <= 7; offset++) {
                const dn = daysOrder[(todayIndex + offset) % 7];
                const entry = provider.availability?.find((a: any) => a.day === dn);
                if (entry) {
                  nextAvailability = { day: dn, startTime: entry.startTime, endTime: entry.endTime };
                   break;
                 }
               }
               if (normalizeCategory(provider.category) === 'physiotherapy') {
                 const selectedServiceIds = new Set(
                   (Array.isArray(provider.physiotherapyServiceIds) ? provider.physiotherapyServiceIds : [])
                     .map((id: any) => String(id?._id || id))
                 );
                 const selectedAddonIds = new Set(
                   (Array.isArray(provider.physiotherapyAddonIds) ? provider.physiotherapyAddonIds : [])
                     .map((id: any) => String(id?._id || id))
                 );
                 return (
                   <PhysiotherapyBookingCard
                     key={provider._id}
                     provider={provider}
                     services={physiotherapyServices.filter((service) => selectedServiceIds.has(service._id))}
                     addons={physiotherapyAddons.filter((addon) => selectedAddonIds.has(addon._id))}
                     onProfile={() => setViewDetailsProvider(provider)}
                     onBook={(selection) => handleProtectedBooking({ ...provider, physiotherapySelection: selection })}
                   />
                 );
               }
               if (normalizeCategory(provider.category) === 'nurse') {
                 const selectedServiceIds = new Set((Array.isArray(provider.nurseServiceIds) ? provider.nurseServiceIds : []).map((id: any) => String(id?._id || id)));
                 const selectedAddonIds = new Set((Array.isArray(provider.nurseAddonIds) ? provider.nurseAddonIds : []).map((id: any) => String(id?._id || id)));
                 return (
                   <NurseBookingCard
                     key={provider._id}
                     provider={provider}
                     services={nurseServices.filter((service) => selectedServiceIds.has(service._id))}
                     addons={nurseAddons.filter((addon) => selectedAddonIds.has(addon._id))}
                     onProfile={() => setViewDetailsProvider(provider)}
                     onBook={(selection) => handleProtectedBooking({ ...provider, nurseSelection: selection })}
                   />
                 );
               }
               if (normalizeCategory(provider.category) === 'caretaker') {
                 const serviceIds = new Set((provider.caretakerServiceIds || []).map((id: any) => String(id?._id || id)));
                 const addonIds = new Set((provider.caretakerAddonIds || []).map((id: any) => String(id?._id || id)));
                 return <CaretakerBookingCard key={provider._id} provider={provider} services={caretakerServices.filter((service) => serviceIds.has(service._id))} addons={caretakerAddons.filter((addon) => addonIds.has(addon._id))} onProfile={() => setViewDetailsProvider(provider)} onBook={(selection) => handleProtectedBooking({ ...provider, caretakerSelection: selection })} />;
               }
               return (
                <motion.div
                  key={provider._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * index }}
                  className="card-healthcare p-5 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {normalizeAssetUrl(provider.userId?.profileImage || provider.profileImage) ? (
                      <img
                        src={normalizeAssetUrl(provider.userId?.profileImage || provider.profileImage) || undefined}
                        alt={provider.userId?.name || 'Provider'}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20"
                        onError={(e) => {
                          console.log('Image failed to load:', provider.userId?.profileImage || provider.profileImage);
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl"
                      style={{ display: normalizeAssetUrl(provider.userId?.profileImage || provider.profileImage) ? 'none' : 'flex' }}
                    >
                      {provider.userId?.name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {provider.category}
                        </span>
                      </div>
                      <h3 className="font-semibold">{provider.userId?.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.specialization}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm mb-4">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {provider._averageRating || 0}
                    </span>
                    <span className="text-muted-foreground">({provider._totalReviews || 0} reviews)</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="flex items-center gap-1 font-semibold">
                      <IndianRupee className="w-4 h-4" />
                      {(() => {
                        const fee = provider.fees || provider.consultationFee || 500;
                        const commission = Math.round(fee * 0.20);
                        const gst = Math.round(commission * 0.18);
                        const total = fee + commission + gst + (provider.travelFare || 0);
                        return total;
                      })()}
                      <span className="text-sm font-normal text-muted-foreground">/visit</span>
                    </span>
                    <span className="status-approved px-2 py-1 rounded-full text-xs">
                      {todayAvailability
                        ? `Today: ${todayAvailability.startTime}`
                        : nextAvailability
                          ? `Next: ${nextAvailability.day} ${nextAvailability.startTime}`
                          : 'No schedule'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setViewDetailsProvider(provider)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    <Button

                      onClick={() => handleProtectedBooking(provider)}

                      aria-disabled={provider.availabilityStatus === false}
                      className={`flex-1 ${provider.availabilityStatus === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Book Now
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredProviders.length === 0 && (
            <div className="card-healthcare mx-auto max-w-2xl p-8 text-center sm:p-12">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <AlertCircle className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                Coming Soon in {selectedCityName || 'your selected location'}
              </h3>
              <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                We are currently expanding {selectedServiceLabel} services in your selected location.
                Please change your location or check again later.
              </p>
              <Button className="mt-6" onClick={handleChangeLocation}>
                <MapPin className="h-4 w-4" />
                Change Location
              </Button>
            </div>
          )}

          {/* Booking Modal */}
          {/* <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                {selectedProvider.userId?.profileImage ? (
                  <img
                    src={selectedProvider.userId.profileImage}
                    alt={selectedProvider.userId.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
                    {selectedProvider.userId?.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold">{selectedProvider.userId?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProvider.specialization}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Reason for Visit*</label>
                <Input
                  placeholder="e.g., General checkup, Consultation, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Time *</label>
                <div className="max-h-[40vh] overflow-y-auto grid grid-cols-3 gap-2 pr-1">
                  {slotsLoading ? (
                    <div className="col-span-3 flex items-center justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  ) : (
                    (availableSlots.length > 0 ? availableSlots : timeSlots).map((time) => {
                      const isPast = isTimeSlotPast(time, selectedDate);
                      const isUnavailable = availableSlots.length > 0 && !availableSlots.includes(time);
                      const isDisabled = isPast || isUnavailable;
                      
                      return (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                          disabled={isDisabled}
                          className={isPast ? 'opacity-40' : ''}
                          title={isPast ? 'Must be booked at least 30 minutes in advance' : isUnavailable ? 'Slot already booked' : 'Slot available for booking'}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {time}
                        </Button>
                      );
                    })
                  )}
                </div>
                {selectedDate && new Date(selectedDate).toDateString() === new Date().toDateString() && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Slots must be booked at least 30 minutes in advance
                  </p>
                )}
              </div>

              {/* Previous Prescriptions Upload */}
          {/* <div className="border-2 border-dashed border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Previous Prescriptions (Optional)
                  </label>
                  <label htmlFor="prescription-upload" className="cursor-pointer">
                    <div className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
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
                  <div className="space-y-2">
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

              <Button className="w-full" onClick={handleBookAppointment} disabled={booking}>
                {booking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog> */}

          {/* Provider Details Dialog */}
          <Dialog open={!!viewDetailsProvider} onOpenChange={() => setViewDetailsProvider(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Provider Details</DialogTitle>
              </DialogHeader>
              {viewDetailsProvider && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="experience">Experience & Reviews</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
                      {normalizeAssetUrl(viewDetailsProvider.userId?.profileImage || viewDetailsProvider.profileImage) ? (
                        <img
                          src={normalizeAssetUrl(viewDetailsProvider.userId?.profileImage || viewDetailsProvider.profileImage) || undefined}
                          alt={viewDetailsProvider.userId.name}
                          className="w-20 h-20 rounded-2xl object-cover shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl">
                          {viewDetailsProvider.userId?.name?.charAt(0) || 'P'}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-xl mb-1">{viewDetailsProvider.userId?.name}</h3>
                        <p className="text-muted-foreground mb-2">{viewDetailsProvider.specialization}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-secondary text-secondary" />
                          <span className="font-medium">{viewDetailsProvider._averageRating || 0}</span>
                          <span className="text-sm text-muted-foreground">({viewDetailsProvider._totalReviews || 0} reviews)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="card-healthcare p-4">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <Award className="w-5 h-5" />
                          <h4 className="font-semibold">Specialization</h4>
                        </div>
                        <p className="text-sm">{viewDetailsProvider.specialization || 'General'}</p>
                      </div>

                      <div className="card-healthcare p-4">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <Clock className="w-5 h-5" />
                          <h4 className="font-semibold">Category</h4>
                        </div>
                        <p className="text-sm">{viewDetailsProvider.category}</p>
                      </div>

                      <div className="hidden">
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-lg">
                          ₹{(() => {
                            const fee = viewDetailsProvider.fees || 500;
                            const commission = Math.round(fee * 0.20);
                            const gst = Math.round(commission * 0.18);
                            const total = fee + commission + gst + (viewDetailsProvider.travelFare || 0);
                            return total;
                          })()}
                        </p>
                        {/* <p className="text-xs text-muted-foreground mt-1">Includes platform fee & GST</p> */}
                      </div>
                    </div>

                    <div className="card-healthcare p-4">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <MapPin className="w-5 h-5" />
                        <h4 className="font-semibold">Address</h4>
                      </div>
                      <p className="text-sm">
                        {viewDetailsProvider.address?.street}, {viewDetailsProvider.address?.city}, {viewDetailsProvider.address?.state} - {viewDetailsProvider.address?.pincode}
                      </p>
                    </div>

                    {/* Weekly Availability */}
                    <div className="card-healthcare p-4">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Clock className="w-5 h-5" />
                        <h4 className="font-semibold">Weekly Availability</h4>
                      </div>
                      {viewDetailsProvider.availability?.length ? (
                        <div className="grid grid-cols-2 gap-2">
                          {viewDetailsProvider.availability.map((slot: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{slot.day}</span>
                              <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No availability set</p>
                      )}
                    </div>

                    {viewDetailsProvider?.availabilityStatus === false ? (
                      <div className="p-4 bg-muted rounded-xl border border-border">
                        <p className="text-sm text-muted-foreground font-medium mb-1">Provider currently unavailable</p>
                        <p className="text-xs text-muted-foreground">Please try later</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-900 dark:text-green-100 font-medium mb-1">✅ Available for Booking</p>
                        <p className="text-xs text-green-700 dark:text-green-300">Book your appointment now</p>
                      </div>
                    )}

                    <Button
                      className={`w-full ${viewDetailsProvider?.availabilityStatus === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-disabled={viewDetailsProvider?.availabilityStatus === false}
                      onClick={() => {
                        setViewDetailsProvider(null);
                        if (!['physiotherapy', 'nurse', 'caretaker'].includes(normalizeCategory(viewDetailsProvider.category))) {
                          handleProtectedBooking(viewDetailsProvider);
                        }
                      }}
                    >
                      {['physiotherapy', 'nurse', 'caretaker'].includes(normalizeCategory(viewDetailsProvider.category))
                        ? 'Choose Service on Booking Card'
                        : 'Book Appointment Now'}
                    </Button>
                  </TabsContent>

                  <TabsContent value="experience" className="space-y-4 mt-4">
                    <div className="card-healthcare p-5">
                      <h4 className="font-semibold mb-4 text-lg">Professional Experience</h4>

                      {/* Bio */}
                      {viewDetailsProvider.bio && (
                        <div className="p-4 bg-muted/50 rounded-lg mb-4">
                          <p className="font-medium mb-2">About</p>
                          <p className="text-sm text-muted-foreground">{viewDetailsProvider.bio}</p>
                        </div>
                      )}

                      {/* Specialization & Qualification */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="font-medium mb-1 flex items-center gap-2">
                            <Award className="w-4 h-4 text-primary" />
                            Specialization
                          </p>
                          <p className="text-sm text-muted-foreground">{viewDetailsProvider.specialization}</p>
                        </div>

                        {viewDetailsProvider.qualification && viewDetailsProvider.qualification !== 'N/A' && (
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="font-medium mb-1 flex items-center gap-2">
                              <Award className="w-4 h-4 text-primary" />
                              Qualification
                            </p>
                            <p className="text-sm text-muted-foreground">{viewDetailsProvider.qualification}</p>
                          </div>
                        )}
                      </div>

                      {/* Experience */}
                      {viewDetailsProvider.experience && viewDetailsProvider.experience > 0 && (
                        <div className="p-4 bg-primary/10 rounded-lg mb-4">
                          <p className="font-medium mb-1 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Years of Experience
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {viewDetailsProvider.experience} {viewDetailsProvider.experience === 1 ? 'Year' : 'Years'}
                          </p>
                        </div>
                      )}

                      {/* Category Badge */}
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="font-medium mb-1">Category</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                          {viewDetailsProvider.category === 'Doctor' && <Stethoscope className="w-4 h-4" />}
                          {viewDetailsProvider.category === 'Nurse' && <Heart className="w-4 h-4" />}
                          {(viewDetailsProvider.category === 'Physiotherapist' || viewDetailsProvider.category === 'Lab Technician') && <Users className="w-4 h-4" />}
                          {viewDetailsProvider.category}
                        </div>
                      </div>
                    </div>

                    <div className="card-healthcare p-5">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-secondary fill-secondary" />
                        Patient Reviews
                      </h4>
                      <div className="flex items-center gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{viewDetailsProvider._averageRating || 0}</p>
                          <div className="flex gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} className={`w-3 h-3 ${i <= Math.round(viewDetailsProvider._averageRating || 0) ? 'fill-secondary text-secondary' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{viewDetailsProvider._totalReviews || 0} Total Reviews</p>
                          <p className="text-sm text-muted-foreground">Average rating from patients</p>
                        </div>
                      </div>

                      {loadingReviews ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : providerReviews.length > 0 ? (
                        <div className="space-y-3">
                          {providerReviews.map((review: any) => (
                            <div key={review._id} className="p-4 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                                  {review.patientId?.name?.charAt(0) || 'P'}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{review.patientId?.name || 'Anonymous'}</p>
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(i => (
                                      <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-secondary text-secondary' : 'text-gray-300'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground">No reviews yet</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 mt-4">
                    <div className="grid gap-4">
                      {/* Professional Documents (Medical License, Certificates) */}
                      {viewDetailsProvider.documentation && viewDetailsProvider.documentation.length > 0 ? (
                        viewDetailsProvider.documentation.map((doc: string, index: number) => {
                          const resolved = normalizeAssetUrl(doc);
                          if (!resolved) return null;

                          const downloadName = getDownloadName(`document-${index + 1}`, resolved, 'pdf');
                          const viewUrl = getAssetViewUrl(resolved, 'inline');
                          const downloadUrl = getAssetViewUrl(resolved, 'attachment');

                          return (
                            <div key={index} className="card-healthcare p-5">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-primary" />
                                  <h4 className="font-semibold">
                                    {index === 0 ? 'Medical License' : `Professional Certificate ${index}`}
                                  </h4>
                                </div>
                                <div className="flex gap-2">
                                  <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline">
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  </a>
                                  <a href={downloadUrl} download={downloadName}>
                                    <Button size="sm" variant="outline">
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </Button>
                                  </a>
                                </div>
                              </div>
                              <div className="bg-muted/30 p-4 rounded-lg">
                                {isImageUrl(resolved) ? (
                                  <img
                                    src={viewUrl}
                                    alt={`Document ${index + 1}`}
                                    className="w-full rounded-lg border border-border object-contain max-h-96"
                                  />
                                ) : (
                                  <iframe
                                    src={viewUrl}
                                    title={`Document ${index + 1}`}
                                    className="w-full h-96 rounded-lg border border-border"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="card-healthcare p-8 text-center">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground">No professional documents uploaded</p>
                        </div>
                      )}

                      {/* Aadhar Card */}
                      {viewDetailsProvider.aadharImages && viewDetailsProvider.aadharImages.length > 0 && (
                        <div className="card-healthcare p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-primary" />
                              <h4 className="font-semibold">Aadhar Card</h4>
                            </div>
                            <a
                              href={(() => {
                                const resolved = normalizeAssetUrl(viewDetailsProvider.aadharImages[0]);
                                return resolved ? getAssetViewUrl(resolved, 'attachment') : undefined;
                              })()}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </a>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            {viewDetailsProvider.aadharImages.map((img: string, index: number) => (
                              <div key={index} className="bg-muted/30 p-4 rounded-lg">
                                {(() => {
                                  const resolved = normalizeAssetUrl(img);
                                  if (!resolved) return null;
                                  const viewUrl = getAssetViewUrl(resolved, 'inline');

                                  if (isImageUrl(resolved)) {
                                    return (
                                      <img
                                        src={viewUrl}
                                        alt={`Aadhar ${index === 0 ? 'Front' : 'Back'}`}
                                        className="w-full rounded-lg border border-border object-contain max-h-64"
                                      />
                                    );
                                  }

                                  return (
                                    <iframe
                                      src={viewUrl}
                                      title={`Aadhar ${index + 1}`}
                                      className="w-full h-64 rounded-lg border border-border"
                                    />
                                  );
                                })()}
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                  {index === 0 ? 'Front Side' : 'Back Side'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        🔒 All documents are verified by Healthy Touch Healthcare and securely stored.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          <PaymentBookingModal
            open={showModal}
            onClose={() => setShowModal(false)}
            provider={selectedProvider}
            selectedDate={selectedDate ? new Date(selectedDate) : null}
            selectedSlot={selectedTime}
            onSuccess={() => {
              toast({
                title: 'Appointment Booked!',
                description: `Your appointment with ${selectedProvider.userId?.name} has been successfully booked.`,
              });
              setSelectedProvider(null);
              setSelectedDate('');
              setSelectedTime('');
              setUploadedFiles([]);
              setReason('');
              setShowModal(false);
            }}
          />
        </>
      )}
      </main>
    </>
  );
}

