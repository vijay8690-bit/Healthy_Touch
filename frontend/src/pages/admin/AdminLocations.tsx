import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  MessageSquare,
  Settings,
  Home,
  LogOut,
  Menu,
  Stethoscope,
  Heart,
  MapPin,
  RefreshCcw,
  Loader2,
  Navigation,
  ExternalLink,
  User,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api.config';
import NotificationDropdown from '@/components/NotificationDropdown';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';
import { isProviderCategoryEnabled } from '@/config/features';


interface UserLocation {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  updatedAt: string;
}

export default function AdminLocations() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [filter, setFilter] = useState<'all' | 'patient' | 'provider'>('all');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useRouterLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/admin/locations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch locations');
      }

      setLocations(
        (data.locations || []).filter((item: UserLocation) => (
          item.role !== 'provider' || isProviderCategoryEnabled(item.category)
        ))
      );
      
      if (showRefreshLoader) {
        toast({
          title: 'Refreshed',
          description: 'Location data updated successfully',
        });
      }
    } catch (error: any) {
      console.error('Fetch locations error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLocations = locations.filter((loc) => {
    if (filter === 'all') return true;
    return loc.role === filter;
  });

  const stats = {
    total: locations.length,
    patients: locations.filter((l) => l.role === 'patient').length,
    providers: locations.filter((l) => l.role === 'provider').length,
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border hidden lg:block">
            <Link to="/" className="flex items-center gap-2">
              <img src="/healthy-touch-logo.png" className="h-12" alt="Healthy Touch" />
            </Link>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="font-display font-semibold text-lg">User Locations</h1>
                <p className="text-sm text-muted-foreground">Track user locations on map</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchLocations(true)}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <NotificationDropdown />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                A
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading locations...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-healthcare p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Locations</p>
                      <h3 className="text-3xl font-bold">{stats.total}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="card-healthcare p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Patient Locations</p>
                      <h3 className="text-3xl font-bold">{stats.patients}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="card-healthcare p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Provider Locations</p>
                      <h3 className="text-3xl font-bold">{stats.providers}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter */}
              <div className="card-healthcare p-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      filter === 'all'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    onClick={() => setFilter('patient')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      filter === 'patient'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Patients ({stats.patients})
                  </button>
                  <button
                    onClick={() => setFilter('provider')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      filter === 'provider'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Providers ({stats.providers})
                  </button>
                </div>
              </div>

              {/* Locations List */}
              <div className="card-healthcare">
                <div className="p-6 border-b border-border">
                  <h2 className="text-xl font-semibold">Location Details</h2>
                </div>
                <div className="divide-y divide-border">
                  {filteredLocations.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No locations found</p>
                    </div>
                  ) : (
                    filteredLocations.map((loc) => (
                      <div key={loc._id} className="p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                                {loc.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold">{loc.name}</h3>
                                <p className="text-sm text-muted-foreground">{loc.email}</p>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  loc.role === 'provider'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                }`}
                              >
                                {loc.role}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Navigation className="w-4 h-4" />
                                <span>
                                  {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                                </span>
                              </div>
                              {loc.address && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  <span className="line-clamp-1">{loc.address}</span>
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Updated: {formatDate(loc.updatedAt)}
                            </p>
                          </div>

                          <button
                            onClick={() => openInMaps(loc.latitude, loc.longitude)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">View on Maps</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the home page and will need to login again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
