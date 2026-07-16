import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Beaker,
  Check,
  Clock,
  Filter,
  Home,
  Loader2,
  MapPin,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { useLocation as useSavedLocation } from '@/contexts/LocationContext';
import {
  getLabTestSuggestions,
  getLabTests,
  LabTest,
  readLabCart,
  writeLabCart,
} from '@/services/labTest.service';

const formatPrice = (value: number) => `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
const NAVBAR_LOCATION_STORAGE_KEY = 'healthytouch_saved_location';
const LOCATION_UPDATED_EVENT = 'healthytouch-location-updated';
const OPEN_LOCATION_PICKER_EVENT = 'healthytouch-open-location-picker';

const indianStateNames = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana',
  'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur',
  'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir',
  'ladakh', 'puducherry', 'chandigarh', 'andaman and nicobar islands', 'dadra and nagar haveli and daman and diu',
  'lakshadweep',
]);

const normalizeLocationText = (value?: string | null) => String(value || '').trim().toLowerCase();

const getSavedLocationAddress = () => {
  try {
    const navbarLocation = localStorage.getItem(NAVBAR_LOCATION_STORAGE_KEY);
    if (navbarLocation) {
      const parsed = JSON.parse(navbarLocation);
      if (typeof parsed?.label === 'string') return parsed.label;
    }
  } catch {
    // Ignore malformed saved location data.
  }

  try {
    const userLocation = localStorage.getItem('user_location') || sessionStorage.getItem('user_location');
    if (userLocation) {
      const parsed = JSON.parse(userLocation);
      if (typeof parsed?.address === 'string') return parsed.address;
    }
  } catch {
    // Ignore malformed saved location data.
  }

  return '';
};

const resolveCityFromAddress = (address: string, knownCities: string[] = []) => {
  const normalizedAddress = normalizeLocationText(address);
  if (!normalizedAddress) return '';

  const knownMatch = knownCities.find((item) => normalizedAddress.includes(normalizeLocationText(item)));
  if (knownMatch) return knownMatch;

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter((part) => {
      const normalized = normalizeLocationText(part);
      return normalized
        && normalized !== 'india'
        && !indianStateNames.has(normalized)
        && !/^\d{5,6}$/.test(normalized)
        && !/^-?\d+(\.\d+)?$/.test(normalized);
    });

  return parts[parts.length - 1] || '';
};

const getParameterCount = (parameters?: string[]) => {
  if (!Array.isArray(parameters)) return 0;

  return parameters.reduce((count, parameter) => {
    const parts = String(parameter)
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);

    return count + parts.length;
  }, 0);
};

const dedupeLabTests = (items: LabTest[] = []) => {
  const byTest = new Map<string, LabTest>();
  items.forEach((test) => {
    const key = [
      (test as any).labTestId || test.testId || test.testName || test._id,
      test.city || '',
    ].map((part) => String(part).trim().toLowerCase()).join('|');
    const existing = byTest.get(key);
    if (!existing || Number(test.sellingPrice || 0) < Number(existing.sellingPrice || 0)) {
      byTest.set(key, test);
    }
  });
  return Array.from(byTest.values());
};

const priceRanges = [
  { label: 'All prices', min: '', max: '' },
  { label: 'Under Rs. 500', min: '', max: '500' },
  { label: 'Rs. 500 - Rs. 1,500', min: '500', max: '1500' },
  { label: 'Above Rs. 1,500', min: '1500', max: '' },
];

export default function LabTestsPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [sections, setSections] = useState<{
    popularTests: LabTest[];
    recommendedPackages: LabTest[];
    fullBodyPackages: LabTest[];
  }>({ popularTests: [], recommendedPackages: [], fullBodyPackages: [] });
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedLocationAddress, setSelectedLocationAddress] = useState(() => getSavedLocationAddress());
  const [selectedIds, setSelectedIds] = useState<string[]>(() => readLabCart());
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [city, setCity] = useState('all');
  const [priceRange, setPriceRange] = useState('0');
  const [homeCollection, setHomeCollection] = useState('all');
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<LabTest[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<string[]>([]);
  const { toast } = useToast();
  const { location: savedLocation } = useSavedLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedLocationCity = resolveCityFromAddress(selectedLocationAddress, cities);
  const cityOptions = Array.from(new Set([selectedLocationCity, ...cities].filter(Boolean)));

  useEffect(() => {
    const incomingSearch = searchParams.get('search') || searchParams.get('q') || '';
    if (incomingSearch) setQ(incomingSearch);
  }, [searchParams]);

  useEffect(() => {
    if (!savedLocation?.address) return;
    setSelectedLocationAddress(savedLocation.address);
  }, [savedLocation]);

  useEffect(() => {
    const syncSavedLocation = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (typeof detail?.label === 'string') {
        setSelectedLocationAddress(detail.label);
        return;
      }
      setSelectedLocationAddress(getSavedLocationAddress());
    };

    window.addEventListener(LOCATION_UPDATED_EVENT, syncSavedLocation);
    window.addEventListener('storage', syncSavedLocation);
    window.addEventListener('focus', syncSavedLocation);
    return () => {
      window.removeEventListener(LOCATION_UPDATED_EVENT, syncSavedLocation);
      window.removeEventListener('storage', syncSavedLocation);
      window.removeEventListener('focus', syncSavedLocation);
    };
  }, []);

  useEffect(() => {
    setCity(selectedLocationCity || 'all');
  }, [selectedLocationCity]);

  const selectedTests = useMemo(
    () => tests.filter((test) => selectedIds.includes(test._id)),
    [tests, selectedIds]
  );

  const totalPrice = selectedTests.reduce((sum, test) => sum + test.sellingPrice, 0);
  const totalOriginal = selectedTests.reduce((sum, test) => sum + test.originalPrice, 0);

  useEffect(() => {
    writeLabCart(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTests();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, category, city, priceRange, homeCollection]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!q.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await getLabTestSuggestions(q.trim());
        setSuggestions(res.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [q]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const range = priceRanges[Number(priceRange)] || priceRanges[0];
      const res = await getLabTests({
        q,
        category,
        city,
        minPrice: range.min,
        maxPrice: range.max,
        homeCollection,
      });
      setTests(dedupeLabTests(res.tests || []));
      setCategories(res.filters?.categories || []);
      setCities(res.filters?.cities || []);
      setSections({
        popularTests: dedupeLabTests(res.sections?.popularTests || []),
        recommendedPackages: dedupeLabTests(res.sections?.recommendedPackages || []),
        fullBodyPackages: dedupeLabTests(res.sections?.fullBodyPackages || []),
      });
    } catch (error: any) {
      toast({
        title: 'Unable to load lab tests',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTest = (test: LabTest) => {
    setSelectedIds((current) => {
      if (current.includes(test._id)) return current.filter((id) => id !== test._id);
      return [...current, test._id];
    });
  };

  const toggleDescription = (testId: string) => {
    setExpandedDescriptions((current) => (
      current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId]
    ));
  };

  const clearFilters = () => {
    setQ('');
    setCategory('all');
    setCity(selectedLocationCity || 'all');
    setPriceRange('0');
    setHomeCollection('all');
  };

  const handleChangeLocation = () => {
    window.dispatchEvent(new CustomEvent(OPEN_LOCATION_PICKER_EVENT));
  };

  const addSectionTest = (test: LabTest) => {
    if (!selectedIds.includes(test._id)) {
      setSelectedIds((current) => [...current, test._id]);
      toast({ title: 'Added to cart', description: test.testName });
    }
  };

  const goToBooking = () => {
    if (!selectedIds.length) {
      toast({ title: 'Select at least one test', variant: 'destructive' });
      return;
    }
    navigate('/lab-tests/booking');
  };

  const SectionStrip = ({ title, tests: sectionTests }: { title: string; tests: LabTest[] }) => {
    if (!sectionTests?.length) return null;
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Sparkles className="h-5 w-5 text-secondary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sectionTests.slice(0, 3).map((test) => (
            <button
              key={test._id}
              onClick={() => addSectionTest(test)}
              className="rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <p className="font-medium line-clamp-1">{test.testName}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{test.parameters.slice(0, 3).join(', ')}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-semibold text-primary">{formatPrice(test.sellingPrice)}</span>
                <Badge variant="outline">{test.discount}% off</Badge>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-16 pt-36 lg:pt-44">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <Badge className="mb-4 bg-secondary text-secondary-foreground">Lab Test Marketplace</Badge>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Book lab tests and health packages</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Search tests, compare prices, choose home collection, and book multiple tests in one checkout.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{selectedIds.length} selected</p>
                <p className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</p>
              </div>
              <Button onClick={goToBooking} className="rounded-lg">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Book
              </Button>
            </div>
            {totalOriginal > totalPrice && (
              <p className="mt-2 text-sm text-secondary">You save {formatPrice(totalOriginal - totalPrice)}</p>
            )}
          </div>
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Filter className="h-4 w-4" />
                Filters
              </h2>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search CBC, thyroid..."
                  className="pl-9"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                    {suggestions.map((item) => (
                      <button
                        key={item._id}
                        onClick={() => {
                          setQ(item.testName);
                          setShowSuggestions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium">{item.testName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{item.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cityOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger><SelectValue placeholder="Price" /></SelectTrigger>
                <SelectContent>
                  {priceRanges.map((range, index) => (
                    <SelectItem key={range.label} value={String(index)}>{range.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={homeCollection} onValueChange={setHomeCollection}>
                <SelectTrigger><SelectValue placeholder="Home collection" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any collection</SelectItem>
                  <SelectItem value="true">Home collection</SelectItem>
                  <SelectItem value="false">Lab visit only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </aside>

          <div className="space-y-8">
            <SectionStrip title="Full body packages" tests={sections.fullBodyPackages} />

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : tests.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Coming soon in this location</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Lab tests are not available in {selectedLocationCity || 'your selected location'} yet. Please change your location or check again later.
                  </p>
                  <Button className="mt-6" onClick={handleChangeLocation}>
                    <MapPin className="h-4 w-4" />
                    Change Location
                  </Button>
                </div>
              ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tests.map((test) => {
                  const selected = selectedIds.includes(test._id);
                  const descriptionExpanded = expandedDescriptions.includes(test._id);
                  const hasLongDescription = String(test.description || '').length > 90;
                  return (
                    <motion.div
                      key={test._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-lg border bg-card p-3 shadow-sm transition ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-1.5 flex flex-wrap gap-1.5">
                            <Badge variant="outline">{test.category}</Badge>
                            {test.city && <Badge variant="outline">{test.city}</Badge>}
                            {test.discount > 0 && <Badge className="bg-secondary text-secondary-foreground">{test.discount}% off</Badge>}
                          </div>
                          <h3 className="text-base font-semibold">{test.testName}</h3>
                          <p className={`mt-1 text-xs text-muted-foreground ${descriptionExpanded ? '' : 'line-clamp-1'}`}>{test.description}</p>
                          {hasLongDescription && (
                            <button
                              type="button"
                              onClick={() => toggleDescription(test._id)}
                              className="mt-1 text-xs font-medium text-primary hover:underline"
                            >
                              {descriptionExpanded ? 'Read less' : 'Read more'}
                            </button>
                          )}
                        </div>
                        <div className="shrink-0 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary">
                          Tests {getParameterCount(test.parameters)}
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground line-through">{formatPrice(test.originalPrice)}</p>
                          <p className="text-xl font-bold text-primary">{formatPrice(test.sellingPrice)}</p>
                        </div>
                        <Button size="sm" variant={selected ? 'outline' : 'default'} onClick={() => toggleTest(test)} className="rounded-lg">
                          {selected ? <X className="mr-1.5 h-4 w-4" /> : <Check className="mr-1.5 h-4 w-4" />}
                          {selected ? 'Remove' : 'Select'}
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 text-primary" />
                          {test.reportTime}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Home className="h-4 w-4 text-primary" />
                          {test.homeCollection ? 'Home collection' : 'Lab visit'}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Beaker className="h-4 w-4 text-primary" />
                          {test.fastingRequired ? 'Fasting required' : 'No fasting'}
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg bg-muted/60 p-2.5">
                        <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Parameters included</p>
                        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                          {test.parameters.map((parameter) => (
                            <span key={parameter} className="rounded-full bg-background px-2 py-1 text-xs">
                              {parameter}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 rounded-lg border border-border bg-card p-3 shadow-xl md:left-auto md:w-[420px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{selectedIds.length} tests selected</p>
              <p className="font-bold text-primary">{formatPrice(totalPrice)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedIds([])} aria-label="Clear cart">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button onClick={goToBooking}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
