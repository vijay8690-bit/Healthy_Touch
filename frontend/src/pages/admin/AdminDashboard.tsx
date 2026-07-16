import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  Bell,
  Settings,
  Home,
  LogOut,
  Menu,
  TrendingUp,
  UserCheck,
  UserX,
  Stethoscope,
  Activity,
  MessageSquare,
  Eye,
  FileText,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Award,
  Clock,
  Download,
  CheckCircle,
  XCircle,
  Star,
  Loader2,
  DollarSign,
  Beaker,
  FlaskConical,
  Ambulance,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import adminService from '@/services/admin.service';
import { useToast } from '@/hooks/use-toast';
import { getAssetViewUrl } from '@/utils/assetProxy';
import NotificationDropdown from '@/components/NotificationDropdown';
import { getAdminLabBookings, getLabTests } from '@/services/labTest.service';
import { getAdminAmbulanceRequests } from '@/services/ambulance.service';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';
import { FEATURES, isProviderCategoryEnabled } from '@/config/features';


export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    providerRevenue: 0,
    totalLabTests: 0,
    pendingLabBookings: 0,
    pendingAmbulanceRequests: 0,
  });
  const [providers, setProviders] = useState<any[]>([]);
  const [labBookings, setLabBookings] = useState<any[]>([]);
  const [reportLabBookings, setReportLabBookings] = useState<any[]>([]);
  const [ambulanceRequests, setAmbulanceRequests] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, usersRes, appointmentsRes, labTestsRes, pendingLabBookingsRes, reportLabBookingsRes, pendingAmbulanceRequestsRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllUsers({ role: 'provider', limit: 20 }),
        adminService.getAllAppointments({ limit: 10 }),
        getLabTests({ status: 'all', limit: '5' }),
        getAdminLabBookings('pending_admin_approval').catch(() => ({ bookings: [] })),
        getAdminLabBookings('all').catch(() => ({ bookings: [] })),
        FEATURES.AMBULANCE_MODULE
          ? getAdminAmbulanceRequests('pending_admin').catch(() => ({ requests: [] }))
          : Promise.resolve({ requests: [] }),
      ]);

      console.log('Dashboard Stats:', dashboardStats);
      console.log('Appointments Response:', appointmentsRes);

      setStats({
        totalUsers: dashboardStats.data?.quickStats?.totalPatients?.count || dashboardStats.data?.totalPatients || 0,
        totalProviders: dashboardStats.data?.quickStats?.totalProviders?.count || dashboardStats.data?.totalProviders || 0,
        totalAppointments: dashboardStats.data?.quickStats?.appointments?.count || dashboardStats.data?.totalAppointments || 0,
        totalRevenue: dashboardStats.data?.quickStats?.revenue?.total || dashboardStats.data?.totalRevenue || 0,
        platformRevenue: dashboardStats.data?.quickStats?.revenue?.platformShare || 0,
        providerRevenue: dashboardStats.data?.quickStats?.revenue?.providerShare || 0,
        totalLabTests: labTestsRes.total || 0,
        pendingLabBookings: pendingLabBookingsRes.bookings?.length || 0,
        pendingAmbulanceRequests: pendingAmbulanceRequestsRes.requests?.length || 0,
      });

      // Filter users who have provider profiles and are pending
      const pendingProviders = (usersRes.users || [])
        .filter((user: any) => user.providerProfile
          && user.providerProfile.status === 'pending'
          && isProviderCategoryEnabled(user.providerProfile.category))
        .map((user: any) => ({
          ...user.providerProfile,
          userId: {
            _id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile
          }
        }));

      setProviders(pendingProviders);
      setLabBookings(pendingLabBookingsRes.bookings || []);
      setReportLabBookings(reportLabBookingsRes.bookings || []);
      setAmbulanceRequests(pendingAmbulanceRequestsRes.requests || []);
      // Updated to match new backend response structure
      setAppointments(
        (appointmentsRes.appointments || appointmentsRes.data?.appointments || appointmentsRes.data || [])
          .filter((appointment: any) => isProviderCategoryEnabled(appointment.providerId?.category))
      );
      setLabTests(labTestsRes.tests || []);
    } catch (error: any) {
      console.error('Dashboard fetch error:', error);
      // Don't show error toast if data is partially loaded
      if (!stats.totalUsers && !stats.totalProviders) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to fetch dashboard data',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const handleApprove = async (id: string) => {
    try {
      await adminService.approveProvider(id);
      toast({
        title: 'Provider Approved',
        description: 'The provider has been notified.',
      });
      fetchDashboardData(); // Refresh data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve provider',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await adminService.rejectProvider(id, 'Does not meet requirements');
      toast({
        title: 'Provider Rejected',
        description: 'The provider has been notified.',
        variant: 'destructive',
      });
      fetchDashboardData(); // Refresh data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject provider',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (provider: any) => {
    setSelectedProvider(provider);
    setShowDetailsDialog(true);
  };

  const openGeneratedReportForTest = (test: any) => {
    const testId = String(test.testId || test.testCode || '');
    const reportBooking = reportLabBookings.find((booking) => {
      const hasGeneratedReport = Boolean(
        booking.reportResults?.length || booking.resultAttachmentUrl || booking.summaryAttachmentUrl
      );
      const bookingTests = booking.selectedTests?.length ? booking.selectedTests : (booking.tests || []);
      return hasGeneratedReport && bookingTests.some((item: any) => String(item.testId || item.testCode || '') === testId);
    });

    if (!reportBooking) {
      toast({
        title: 'Report not generated',
        description: `No generated report is available for ${testId || test.testName}.`,
      });
      return;
    }

    window.open(`/lab-bookings/${reportBooking._id}/generated-report`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="dashboard-shell min-h-screen flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`} 
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-border hidden lg:block">
            <Link to="/" className="flex items-center gap-2">
              <img src="/healthy-touch-logo.png" className="h-12" alt="Healthy Touch" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-r from-primary to-health-blue-deep text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                    }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
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

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        {/* Header */}
        <header className="dashboard-header sticky top-0 z-30 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="font-display font-semibold text-lg">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your platform</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                A
              </div> */}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-healthcare p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Patients</p>
                      <p className="font-display text-2xl font-bold mt-1">{stats.totalUsers}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card-healthcare p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Providers</p>
                      <p className="font-display text-2xl font-bold mt-1">{stats.totalProviders}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card-healthcare p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Appointments</p>
                      <p className="font-display text-2xl font-bold mt-1">{stats.totalAppointments}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="card-healthcare p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="font-display text-2xl font-bold mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="text-green-600">Platform: ₹{stats.platformRevenue.toLocaleString()}</span>
                        <span className="text-blue-600">•</span>
                        <span className="text-blue-600">Provider: ₹{stats.providerRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                      <IndianRupee className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="card-healthcare p-5"
                >
                  <Link to="/admin/lab-bookings" className="block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Lab Requests</p>
                        <p className="font-display text-2xl font-bold mt-1">{stats.pendingLabBookings}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Pending admin approval</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <FlaskConical className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </Link>
                </motion.div>

                {FEATURES.AMBULANCE_MODULE && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38 }}
                    className="card-healthcare p-5"
                  >
                    <Link to="/admin/ambulance" className="block">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Ambulance Requests</p>
                          <p className="font-display text-2xl font-bold mt-1">{stats.pendingAmbulanceRequests}</p>
                          <p className="mt-2 text-xs text-muted-foreground">Pending admin approval</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                          <Ambulance className="w-6 h-6 text-secondary" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="card-healthcare p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Lab Tests</p>
                      <p className="font-display text-2xl font-bold mt-1">{stats.totalLabTests}</p>
                      <p className="mt-2 text-xs text-muted-foreground">HT IDs active</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Beaker className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Pending Requests */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="card-healthcare p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold text-lg">Pending Requests</h2>
                    <Link to="/admin/lab-bookings" className="text-sm text-primary hover:underline">
                      View All
                    </Link>
                  </div>

                  {providers.length > 0 || labBookings.length > 0 || ambulanceRequests.length > 0 ? (
                    <div className="space-y-4">
                      {providers.map((provider) => (
                        <div
                          key={provider._id}
                          className="p-4 rounded-xl bg-muted/50 border border-border"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {/* Profile Image if not available */}
                              {!provider.userId?.profileImage && (
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                  {provider.userId?.name.charAt(0)}
                                </div>
                              )}
                              {/* Profile Image if available */}
                              {provider.userId?.profileImage && (
                                <img className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center" src={provider.userId?.profileImage} alt={provider.userId?.name.charAt(0)} />
                              )}
                              <div>
                                <p className="font-medium">{provider.userId?.name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{provider.category}</p>
                              </div>
                            </div>
                            <span className="status-pending px-3 py-1 rounded-full text-xs font-medium">
                              Pending
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">{provider.specialization}</p>
                            <p className="text-xs text-muted-foreground">
                              📍 {provider.location?.address || provider.address?.city || 'Location not provided'} |
                              💼 {provider.experience || 0} years exp |
                              💰 ₹{provider.fees}
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleViewDetails(provider)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details & Documents
                              </Button>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(provider._id)}
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground w-full"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleApprove(provider._id)}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {labBookings.map((booking) => (
                        <div
                          key={booking._id}
                          className="p-4 rounded-xl bg-muted/50 border border-border"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <FlaskConical className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-medium">{booking.patientName || booking.patientId?.name || 'Patient'}</p>
                                <p className="text-sm text-muted-foreground">Lab Request</p>
                              </div>
                            </div>
                            <span className="status-pending px-3 py-1 rounded-full text-xs font-medium">
                              Pending
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">
                              {(booking.tests || []).map((test: any) => test.testName).join(', ') || 'Lab tests'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.city || 'N/A'} | {booking.preferredTimeSlot || 'Time not selected'} | ₹{booking.payableAmount ?? booking.totalSellingPrice ?? 0}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate('/admin/lab-bookings')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View & Assign Provider
                            </Button>
                          </div>
                        </div>
                      ))}

                      {ambulanceRequests.map((request) => (
                        <div
                          key={request._id}
                          className="p-4 rounded-xl bg-muted/50 border border-border"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                                <Ambulance className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-medium">{request.patientId?.name || 'Patient'}</p>
                                <p className="text-sm text-muted-foreground">Ambulance Request</p>
                              </div>
                            </div>
                            <span className="status-pending px-3 py-1 rounded-full text-xs font-medium">
                              Pending
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">
                              {request.ambulanceType} - {request.requestType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Pickup: {request.pickupLocation?.address || 'N/A'} | Drop: {request.dropLocation?.address || 'N/A'}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate('/admin/ambulance')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View & Assign Provider
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending approvals</p>
                    </div>
                  )}
                </motion.div>

                {/* Recent Appointments */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="card-healthcare p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold text-lg">Recent Appointments</h2>
                    <Link to="/admin/appointments" className="text-sm text-primary hover:underline">
                      View All
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {appointments.length > 0 ? (
                      appointments.map((appointment) => (
                        <div
                          key={appointment._id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
                        >
                          <div className="relative">
                            {appointment.patientId?.profileImage ? (
                              <img
                                src={appointment.patientId.profileImage}
                                alt={appointment.patientId.name || 'Patient'}
                                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg border-2 border-primary/20">
                                {appointment.patientId?.name?.charAt(0).toUpperCase() || 'P'}
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <p className="font-medium text-sm">{appointment.patientId?.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">
                              with {appointment.providerId?.userId?.name || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{new Date(appointment.date).toLocaleDateString()}</p>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${appointment.status === 'confirmed'
                                ? 'status-approved'
                                : appointment.status === 'pending'
                                  ? 'status-pending'
                                  : appointment.status === 'completed'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                    : 'status-rejected'
                                }`}
                            >
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No recent appointments</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Platform Stats Chart Placeholder */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="card-healthcare p-6"
              >
                <h2 className="font-display font-semibold text-lg mb-4">Platform Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="font-display text-3xl font-bold text-primary">28</p>
                    <p className="text-sm text-muted-foreground">Cities Covered</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="font-display text-3xl font-bold text-secondary">4.8</p>
                    <p className="text-sm text-muted-foreground">Avg. Rating</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="font-display text-3xl font-bold text-primary">95%</p>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="font-display text-3xl font-bold text-secondary">24/7</p>
                    <p className="text-sm text-muted-foreground">Support</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="card-healthcare p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display font-semibold text-lg">Lab Test IDs</h2>
                  <Link to="/admin/lab-bookings" className="text-sm text-primary hover:underline">
                    View Reports
                  </Link>
                </div>
                {labTests.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    {labTests.map((test) => (
                      <button
                        type="button"
                        key={test._id}
                        onClick={() => openGeneratedReportForTest(test)}
                        className="rounded-xl border border-border bg-muted/50 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <p className="text-sm font-bold text-primary">{test.testId || test.testCode}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-medium">{test.testName}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No lab tests found</p>
                )}
              </motion.div>
            </>
          )}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
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

      {/* Provider Full Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {/* Profile Image if not available */}
              {!selectedProvider?.userId?.profileImage && (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedProvider?.userId?.name.charAt(0)}
                </div>
              )}
              {/* Profile Image if available */}
              {selectedProvider?.userId?.profileImage && (
                <img className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center" src={selectedProvider.userId?.profileImage} alt={selectedProvider.userId?.name.charAt(0)} />
              )}
              <div>
                <h2 className="text-2xl font-bold">{selectedProvider?.userId?.name || 'N/A'}</h2>
                <p className="text-sm text-muted-foreground">{selectedProvider?.specialization}</p>
                <Badge className={`mt-1 ${selectedProvider?.status === 'pending' ? 'bg-yellow-500' :
                  selectedProvider?.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                  {selectedProvider?.status?.toUpperCase()}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedProvider && (
            <Tabs defaultValue="personal" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="aadhar">Aadhar Card</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-6">
                <div className="card-healthcare p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedProvider.userId?.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedProvider.userId?.mobile || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">
                            {selectedProvider.address?.street}, {selectedProvider.address?.city},
                            {selectedProvider.address?.state} - {selectedProvider.address?.pincode}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Bio</p>
                          <p className="font-medium">{selectedProvider.bio || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Registered Date</p>
                          <p className="font-medium">{new Date(selectedProvider.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Award className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Category</p>
                          <Badge variant="secondary">{selectedProvider.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Professional Information Tab */}
              <TabsContent value="professional" className="space-y-6">
                <div className="card-healthcare p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Professional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Specialization</p>
                      <p className="font-semibold text-lg">{selectedProvider.specialization}</p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Experience</p>
                      <p className="font-semibold text-lg">{selectedProvider.experience || 0} years</p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Consultation Fee</p>
                      <p className="font-semibold text-lg">₹{selectedProvider.fees}</p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold text-lg capitalize">{selectedProvider.status}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Professional Documents ({selectedProvider.documentation?.length || 0})
                  </h3>

                  {selectedProvider.documentation && selectedProvider.documentation.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProvider.documentation.map((docUrl: string, index: number) => (
                        <div key={index} className="card-healthcare p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Document {index + 1}
                            </h4>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <a href={getAssetViewUrl(docUrl, 'inline')} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </a>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a href={getAssetViewUrl(docUrl, 'attachment')} download={`document-${index + 1}.pdf`}>
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>
                          {docUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                            <img
                              src={getAssetViewUrl(docUrl, 'inline')}
                              alt={`Document ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border border-border"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Document+' + (index + 1);
                              }}
                            />
                          ) : (
                            <iframe
                              src={getAssetViewUrl(docUrl, 'inline')}
                              title={`Document ${index + 1}`}
                              className="w-full h-64 rounded-lg border border-border"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No documents uploaded
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Aadhar Tab */}
              <TabsContent value="aadhar" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Aadhar Card Images ({selectedProvider.aadharImages?.length || 0})
                  </h3>

                  {selectedProvider.aadharImages && selectedProvider.aadharImages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProvider.aadharImages.map((aadharUrl: string, index: number) => (
                        <div key={index} className="card-healthcare p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              Aadhar {index === 0 ? 'Front' : 'Back'}
                            </h4>
                            <Button size="sm" variant="outline" asChild>
                              <a href={getAssetViewUrl(aadharUrl, 'inline')} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </a>
                            </Button>
                          </div>
                          <img
                            src={getAssetViewUrl(aadharUrl, 'inline')}
                            alt={`Aadhar ${index === 0 ? 'Front' : 'Back'}`}
                            className="w-full h-48 object-cover rounded-lg border border-border"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Aadhar+' + (index === 0 ? 'Front' : 'Back');
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No Aadhar images uploaded
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Approval Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                handleReject(selectedProvider?._id);
                setShowDetailsDialog(false);
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Provider
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                handleApprove(selectedProvider?._id);
                setShowDetailsDialog(false);
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Provider
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
