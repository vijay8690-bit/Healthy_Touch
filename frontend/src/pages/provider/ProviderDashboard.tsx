import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Calendar,
  FileText,
  Users,
  Bell,
  LogOut,
  Menu,
  Clock,
  CheckCircle,
  XCircle,
  Stethoscope,
  DollarSign,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Copy,
  Beaker,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import providerService from '@/services/provider.service';
import { getProviderAssignedLabBookings, updateProviderLabBookingStatus } from '@/services/labTest.service';
import { acceptAmbulanceRequest, getAssignedAmbulanceRequests, rejectAmbulanceRequest } from '@/services/ambulance.service';
import NotificationDropdown from '@/components/NotificationDropdown';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import ProviderIdCard from '@/components/provider/ProviderIdCard';

const getAmbulanceRouteUrl = (pickup?: any, drop?: any) => {
  if (!pickup?.address || !drop?.address) return '';
  const origin = pickup.latitude && pickup.longitude ? `${pickup.latitude},${pickup.longitude}` : pickup.address;
  const destination = drop.latitude && drop.longitude ? `${drop.latitude},${drop.longitude}` : drop.address;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
};

export default function ProviderDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [assignedLabOrders, setAssignedLabOrders] = useState<any[]>([]);
  const [assignedAmbulanceRequests, setAssignedAmbulanceRequests] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({ totalEarnings: 0, pendingPayout: 0, completedPayout: 0 });
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingRequests: 0,
    totalPatients: 0,
    completedToday: 0,
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    checkProviderApprovalAndFetchData();
  }, []);

  const checkProviderApprovalAndFetchData = async () => {
    try {
      // First check provider approval status
      const profileRes = await providerService.getMyProfile();
      
      if (profileRes.success && profileRes.provider) {
        setProviderProfile(profileRes.provider);
        const providerStatus = profileRes.provider.status;
        
        // If not approved, redirect to approval pending page
        if (providerStatus === 'pending' || providerStatus === 'rejected') {
          navigate('/provider/approval-pending', { replace: true });
          return;
        }
        
        // If approved, fetch dashboard data
        fetchDashboardData();
      }
    } catch (error: any) {
      // Check if error is due to approval status
      if (error.response?.status === 403 && error.response?.data?.providerStatus) {
        navigate('/provider/approval-pending', { replace: true });
        return;
      }

      if (error.response?.status === 404 && error.response?.data?.needsRegistration) {
        toast({
          title: 'Profile setup needed',
          description: 'Please complete your provider profile to continue.',
          variant: 'destructive',
        });
        navigate('/provider/profile', { replace: true });
        return;
      }
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load dashboard',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // Format time to 12-hour format with AM/PM
  const formatTime = (value?: string) => {
    if (!value) return 'N/A';
    if (/am|pm/i.test(value)) return value;
    const parsed = new Date(`1970-01-01T${value}`);
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [appointmentsRes, earningsRes, labOrdersRes, ambulanceRes] = await Promise.all([
        providerService.getMyAppointments().catch(() => ({ success: false, appointments: [] })),
        providerService.getMyEarnings().catch(() => ({ success: false })),
        getProviderAssignedLabBookings('all').catch(() => ({ success: false, bookings: [] })),
        getAssignedAmbulanceRequests('assigned_to_provider').catch(() => ({ success: false, requests: [] })),
      ]);

      const assignedOrders = labOrdersRes.success ? (labOrdersRes.bookings || []) : [];
      const assignedAmbulance = ambulanceRes.success ? (ambulanceRes.requests || []) : [];
      setAssignedLabOrders(assignedOrders);
      setAssignedAmbulanceRequests(assignedAmbulance);

      if (appointmentsRes.success) {
        setAppointments(appointmentsRes.appointments);
        
        const today = new Date().toDateString();
        const todayAppts = appointmentsRes.appointments.filter(
          (a: any) => new Date(a.date).toDateString() === today
        );
        const todayLabOrders = assignedOrders.filter((order: any) => {
          const orderDate = new Date(order.preferredDate).toDateString();
          return orderDate === today && ['lab_accepted', 'sample_collected', 'report_ready', 'completed'].includes(order.status);
        });
        const pending = appointmentsRes.appointments.filter((a: any) => a.status === 'pending');
        const completed = todayAppts.filter((a: any) => a.status === 'completed');
        
        const uniquePatients = new Set([
          ...appointmentsRes.appointments.map((a: any) => a.patientId?._id || a.patientId),
          ...assignedOrders.map((order: any) => order.patientId?._id || order.patientId),
        ].filter(Boolean));
        
        setStats({
          todayAppointments: todayAppts.length + todayLabOrders.length,
          pendingRequests: pending.length
            + assignedOrders.filter((order: any) => order.status === 'assigned_to_lab').length
            + assignedAmbulance.length,
          totalPatients: uniquePatients.size,
          completedToday: completed.length,
        });
      }

      if (earningsRes.success) {
        setEarnings({
          totalEarnings: earningsRes.totalEarnings || 0,
          pendingPayout: earningsRes.pendingPayout || 0,
          completedPayout: earningsRes.completedPayout || 0,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch dashboard data',
        variant: 'destructive',
      });
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

  const handleAccept = async (id: string) => {
    try {
      await providerService.updateAppointmentStatus(id, 'confirmed');
      toast({
        title: 'Appointment Confirmed',
        description: 'The patient has been notified.',
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to confirm appointment',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await providerService.updateAppointmentStatus(id, 'cancelled');
      toast({
        title: 'Appointment Rejected',
        description: 'The patient has been notified.',
        variant: 'destructive',
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject appointment',
        variant: 'destructive',
      });
    }
  };

  const handleLabAccept = async (id: string) => {
    try {
      await updateProviderLabBookingStatus(id, { status: 'lab_accepted' });
      toast({
        title: 'Lab Order Accepted',
        description: 'The patient has been notified.',
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to accept lab order',
        variant: 'destructive',
      });
    }
  };

  const handleLabReject = async (id: string) => {
    try {
      await updateProviderLabBookingStatus(id, {
        status: 'lab_rejected',
        reason: 'Rejected by lab provider',
      });
      toast({
        title: 'Lab Order Rejected',
        description: 'The patient has been notified.',
        variant: 'destructive',
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject lab order',
        variant: 'destructive',
      });
    }
  };

  const handleAmbulanceAccept = async (id: string) => {
    try {
      await acceptAmbulanceRequest(id);
      toast({ title: 'Ambulance Request Accepted', description: 'The patient has been notified.' });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to accept ambulance request',
        variant: 'destructive',
      });
    }
  };

  const handleAmbulanceReject = async (id: string) => {
    try {
      await rejectAmbulanceRequest(id, 'Rejected by ambulance provider');
      toast({ title: 'Ambulance Request Rejected', description: 'The patient has been notified.', variant: 'destructive' });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject ambulance request',
        variant: 'destructive',
      });
    }
  };

  const handleCopyReferralCode = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      toast({
        title: 'Referral code copied',
        description: 'Share it with new users to earn referral coins.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the referral code manually.',
        variant: 'destructive',
      });
    }
  };

  const providerType = user?.providerCategory || 'Provider';
  const sidebarLinks = getProviderSidebarLinks(user);
  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
  const pendingLabOrders = assignedLabOrders.filter(order => order.status === 'assigned_to_lab');
  const pendingAmbulanceRequests = assignedAmbulanceRequests.filter(order => order.status === 'assigned_to_provider');
  const todayLabOrders = assignedLabOrders.filter((order) => {
    const orderDate = new Date(order.preferredDate).toDateString();
    const today = new Date().toDateString();
    return orderDate === today && ['lab_accepted', 'sample_collected', 'report_ready', 'completed'].includes(order.status);
  });
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date).toDateString();
    const today = new Date().toDateString();
    return aptDate === today && (apt.status === 'confirmed' || apt.status === 'completed');
  });

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
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
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

          {/* Status Badge */}
          <div className="p-4 mx-4 mb-4 rounded-xl bg-secondary/10 border border-secondary/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-sm font-medium text-secondary">Profile Active</span>
            </div>
            <p className="text-xs text-muted-foreground">Visible to patients</p>
          </div>

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-base font-semibold sm:text-lg">Provider Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back {user?.name}!</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                {providerType.charAt(0)}
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
          <div className="card-healthcare p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Your Referral Code</p>
              <p className="font-display text-xl font-semibold mt-1">{user?.referralCode || 'Not available'}</p>
            </div>
            {providerProfile?.category === 'Lab Technician' && (
              <div className="md:text-right">
                <p className="text-sm text-muted-foreground">Lab Code</p>
                <p className="font-display text-xl font-semibold mt-1">{providerProfile.labCode || 'Not available'}</p>
              </div>
            )}
            {user?.referralCode && (
              <Button type="button" variant="outline" onClick={handleCopyReferralCode}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            )}
          </div>

          <ProviderIdCard provider={providerProfile} />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-healthcare p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Appointments</p>
                  <p className="font-display text-2xl font-bold mt-1">{stats.todayAppointments}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
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
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="font-display text-2xl font-bold mt-1">{stats.pendingRequests}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
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
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                  <p className="font-display text-2xl font-bold mt-1">{stats.totalPatients}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-secondary" />
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
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="font-display text-2xl font-bold mt-1">₹{earnings.totalEarnings}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-secondary" />
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
              <h2 className="font-display font-semibold text-lg mb-4">Pending Requests</h2>

              {pendingAppointments.length + pendingLabOrders.length + pendingAmbulanceRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingAppointments.map((appointment) => (
                    <div
                      key={appointment._id}
                      className="p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"> */}
                            <img src= {appointment.patientId?.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
                          {/* </div> */}
                          <div>
                            <p className="font-medium">{appointment.patientId?.name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                          </div>
                        </div>
                        <span className="status-pending px-3 py-1 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(appointment.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} at {formatTime(appointment.timeSlot || appointment.time)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(appointment._id)}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAccept(appointment._id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendingLabOrders.map((order) => {
                    const tests = order.selectedTests || order.tests || [];
                    return (
                      <div
                        key={order._id}
                        className="p-4 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Beaker className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{order.patientName || order.patientId?.name || 'Patient'}</p>
                              <p className="text-sm text-muted-foreground">
                                Lab tests: {tests.map((test: any) => test.testName).join(', ')}
                              </p>
                            </div>
                          </div>
                          <span className="status-pending px-3 py-1 rounded-full text-xs font-medium">
                            Lab Request
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {new Date(order.preferredDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} at {order.preferredTimeSlot}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-4 h-4" />
                              {order.address || order.city || 'Location not provided'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLabReject(order._id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleLabAccept(order._id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {pendingAmbulanceRequests.map((request) => {
                    const routeUrl = getAmbulanceRouteUrl(request.pickupLocation, request.dropLocation);
                    return (
                      <div
                        key={request._id}
                        className="p-4 rounded-xl bg-muted/50 border border-border"
                      >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium">{request.patientId?.name || 'Patient'}</p>
                            <p className="text-sm text-muted-foreground">
                              {request.ambulanceType} - {request.patientCondition}
                            </p>
                          </div>
                        </div>
                        <span className="status-pending px-3 py-1 rounded-full text-xs font-medium">
                          Ambulance
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {new Date(request.preferredDateTime).toLocaleString('en-IN')}
                          </div>
                          <div className="flex items-start gap-2 mt-1">
                            <MapPin className="mt-0.5 w-4 h-4 shrink-0" />
                            Pickup: {request.pickupLocation?.address || 'Pickup not provided'}
                          </div>
                          <div className="flex items-start gap-2 mt-1">
                            <MapPin className="mt-0.5 w-4 h-4 shrink-0" />
                            Drop: {request.dropLocation?.address || 'Drop not provided'}
                          </div>
                          {routeUrl && (
                            <a
                              href={routeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-2 font-medium text-primary hover:underline"
                            >
                              <Navigation className="w-4 h-4" />
                              Open route
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAmbulanceReject(request._id)}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAmbulanceAccept(request._id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No pending requests</p>
                </div>
              )}
            </motion.div>

            {/* Today's Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card-healthcare p-6"
            >
              <h2 className="font-display font-semibold text-lg mb-4">Today's Schedule</h2>

              {todayAppointments.length + todayLabOrders.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment._id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <img src= {appointment.patientId?.profileImage} alt={appointment.patientId?.name} className="w-10 h-10 object-cover rounded-xl bg-secondary/10 flex items-center justify-center" />
                      <div className="flex-1">
                        <p className="font-medium">{appointment.patientId?.name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          {formatTime(appointment.timeSlot || appointment.time)}
                        </div>
                        <span className={`${appointment.status === 'completed' ? 'status-completed' : 'status-approved'} px-3 py-1 rounded-full text-xs font-medium`}>
                          {appointment.status === 'completed' ? 'Completed' : 'Confirmed'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {todayLabOrders.map((order) => {
                    const tests = order.selectedTests || order.tests || [];
                    return (
                      <div
                        key={order._id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Beaker className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{order.patientName || order.patientId?.name || 'Patient'}</p>
                          <p className="text-sm text-muted-foreground">
                            Lab tests: {tests.map((test: any) => test.testName).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            {order.preferredTimeSlot}
                          </div>
                          <span className="status-approved px-3 py-1 rounded-full text-xs font-medium">
                            {String(order.status).replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No appointments today</p>
                </div>
              )}
            </motion.div>
          </div>
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
    </div>
  );
}
