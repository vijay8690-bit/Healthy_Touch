import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  LayoutDashboard,
  Calendar,
  FileText,
  User,
  Search,
  LogOut,
  Menu,
  Clock,
  Activity,
  Stethoscope,
  Loader2,
  Coins,
  Copy,
  ShoppingCart,
  Users,
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
import patientService from '@/services/patient.service';
import { getPatientLabReports } from '@/services/labTest.service';
import NotificationDropdown from '@/components/NotificationDropdown';
import { FEATURES } from '@/config/features';
import { Navbar } from '@/components/layout/Navbar';

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/patient/dashboard' },
  { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
  { icon: FileText, label: 'Medical Records', href: '/patient/records' },
  { icon: Search, label: 'Find Providers', href: '/patient/providers' },
  { icon: ShoppingCart, label: 'Coins Cart', href: '/patient/coins' },
  { icon: Users, label: 'My Family & Friends', href: '/patient/family-friends' },
  { icon: User, label: 'Profile', href: '/patient/profile' },
];

export default function PatientDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    totalRecords: 0,
  });
  const { user, logout, setUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    } else {
      setAppointments([]);
      setMedicalRecords([]);
      setStats({
        totalAppointments: 0,
        upcomingAppointments: 0,
        completedAppointments: 0,
        totalRecords: 0,
      });
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch appointments and medical records in parallel
      const [appointmentsRes, recordsRes, profileRes, labReportsRes] = await Promise.all([
        patientService.getMyAppointments(),
        patientService.getMyMedicalRecords(),
        patientService.getPatientProfile().catch(() => null),
        getPatientLabReports().catch(() => ({ success: false, bookings: [] })),
      ]);

      if (profileRes?.success && profileRes.user) {
        setUser(profileRes.user);
      }

      if (appointmentsRes.success) {
        setAppointments(appointmentsRes.appointments);
        
        // Calculate stats
        const total = appointmentsRes.appointments.length;
        const upcoming = appointmentsRes.appointments.filter(
          (a: any) => a.status === 'pending' || a.status === 'confirmed'
        ).length;
        const completed = appointmentsRes.appointments.filter(
          (a: any) => a.status === 'completed'
        ).length;
        
        setStats(prev => ({
          ...prev,
          totalAppointments: total,
          upcomingAppointments: upcoming,
          completedAppointments: completed,
        }));
      }

      if (recordsRes.success) {
        const labReportCount = (labReportsRes.bookings || []).reduce((count: number, booking: any) => {
          const reports = booking.reportFiles?.length ? booking.reportFiles : booking.reports || [];
          return count + reports.length;
        }, 0);

        setMedicalRecords(recordsRes.medicalRecords);
        setStats(prev => ({
          ...prev,
          totalRecords: recordsRes.medicalRecords.length + labReportCount,
        }));
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

  const handleCancelAppointment = async (id: string) => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { redirectTo: '/patient/dashboard' } });
      return;
    }

    try {
      const response = await patientService.cancelAppointment(id, 'Cancelled by patient');
      
      if (response.success) {
        toast({
          title: 'Appointment Cancelled',
          description: 'Your appointment has been cancelled successfully.',
        });
        fetchDashboardData(); // Refresh data
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel appointment',
        variant: 'destructive',
      });
    }
  };

  const handleReschedule = (id: string) => {
    navigate('/patient/appointments', { state: { rescheduleId: id } });
  };

  const handleCopyReferralCode = async () => {
    if (!user?.referralCode) return;

    try {
      await navigator.clipboard.writeText(user.referralCode);
      toast({
        title: 'Referral code copied',
        description: 'Share it with a new patient to earn referral coins.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the referral code manually.',
        variant: 'destructive',
      });
    }
  };

  const upcomingAppointments = appointments.filter(
    a => a.status === 'pending' || a.status === 'confirmed'
  ).slice(0, 2);
  const displayName = user?.name?.trim() || 'User';

  return (
    <>
    <Navbar />
    <div className="dashboard-shell flex min-h-screen pt-20 md:pt-28 lg:pt-36">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:top-36 lg:h-[calc(100vh-9rem)] lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
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

          {/* Logout */}
          <div className="p-4 border-t border-border">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Login</span>
              </Link>
            )}
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
                <h1 className="break-anywhere font-display text-base font-semibold sm:text-lg">{displayName}</h1>
                <p className="break-anywhere text-sm text-muted-foreground">Welcome back, {displayName}!</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && <NotificationDropdown />}
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                {user?.name?.charAt(0) || 'P'}
              </div> */}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="min-w-0 flex-1 space-y-6 p-3 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-healthcare p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="font-display text-2xl font-bold mt-1">{stats.upcomingAppointments}</p>
                  <p className="text-xs text-muted-foreground">appointments</p>
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
                  <p className="text-sm text-muted-foreground">Medical Records</p>
                  <p className="font-display text-2xl font-bold mt-1">{stats.totalRecords}</p>
                  <p className="text-xs text-muted-foreground">records</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-secondary" />
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
                  <p className="text-sm text-muted-foreground">Total Appointments</p>
                  <p className="font-display text-2xl font-bold mt-1">{stats.totalAppointments}</p>
                  <p className="text-xs text-muted-foreground">completed: {stats.completedAppointments}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-healthcare p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Reward Coins</p>
                  <p className="font-display text-2xl font-bold mt-1">{user?.coins || 0}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      Code: <span className="font-medium text-foreground">{user?.referralCode || 'N/A'}</span>
                    </p>
                    {user?.referralCode && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={handleCopyReferralCode}
                        title="Copy referral code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {FEATURES.DOCTOR_MODULE && (
              <Link
                to="/patient/providers?category=doctor"
                className="card-healthcare p-4 text-center hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-sm">Book Doctor</p>
              </Link>
            )}
            <Link
              to="/patient/providers"
              className="card-healthcare p-4 text-center hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-secondary" />
              </div>
              <p className="font-medium text-sm">Book Nurse</p>
            </Link>
            <Link
              to="/patient/records"
              className="card-healthcare p-4 text-center hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-sm">View Records</p>
            </Link>
            <Link
              to="/patient/coins"
              className="card-healthcare p-4 text-center hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-6 h-6 text-secondary" />
              </div>
              <p className="font-medium text-sm">Coins Cart</p>
            </Link>
          </motion.div>

          {/* Upcoming Appointments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-healthcare p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg">Upcoming Appointments</h2>
              <Link to="/patient/appointments" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{appointment.providerId?.userId?.name || 'Provider'}</p>
                      <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {new Date(appointment.date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" />
                        {appointment.timeSlot}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        appointment.status === 'confirmed'
                          ? 'status-approved'
                          : appointment.status === 'pending'
                          ? 'status-pending'
                          : 'status-rejected'
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No upcoming appointments</p>
                <Button className="mt-4" asChild>
                  <Link to="/patient/providers">Book an Appointment</Link>
                </Button>
              </div>
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
    </div>
    </>
  );
}
