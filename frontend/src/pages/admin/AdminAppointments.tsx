import { useState, useEffect } from 'react';
import adminService from '@/services/admin.service';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  Bell,
  Settings,
  Home,
  LogOut,
  Menu,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Stethoscope,
  MessageSquare,
  X,
  Eye,
  User,
  Phone,
  Mail,
  Heart,
  MapPin,
  CalendarClock,
  FileText,
  Activity,
  Award,
  DollarSign,
  Coins,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';
// import { mockAppointments } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import NotificationDropdown from '@/components/NotificationDropdown';
import { isProviderCategoryEnabled } from '@/config/features';


export default function AdminAppointments() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingAppointment, setViewingAppointment] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', type: 'all' });
  const [attendance, setAttendance] = useState<any>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const handleCancel = async (id: string) => {
    try {
      await adminService.cancelAppointment(id, 'Cancelled by admin');
      setAppointments(appointments => appointments.map(apt => apt._id === id ? { ...apt, status: 'cancelled' } : apt));
      toast({
        title: 'Appointment Cancelled',
        description: 'Both parties have been notified.',
        variant: 'destructive',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to cancel appointment', variant: 'destructive' });
    }
  };
  // Fetch appointments from backend
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params: any = {
        search: searchQuery || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        limit: 100,
      };
      const res = await adminService.getAllAppointments(params);
      console.log('Appointments from backend:', res);
      setAppointments(
        (res.appointments || res.data || [])
          .filter((appointment: any) => isProviderCategoryEnabled(appointment.providerId?.category))
      );
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to fetch appointments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line
  }, [searchQuery, filters.status, filters.type]);

  const handleView = async (appointment: any) => {
    setViewingAppointment(appointment);
    setShowViewModal(true);
    setAttendance(null);
    setAttendanceError('');
    setAttendanceLoading(true);
    try {
      const res = await adminService.getAppointmentAttendance(appointment._id);
      setAttendance(res.attendance);
    } catch (error: any) {
      setAttendance(null);
      setAttendanceError(error.response?.data?.message || 'Failed to load attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getServiceReceiver = (appointment: any) => appointment?.serviceReceiver || {};
  const getBookedByName = (appointment: any) => appointment?.patientId?.name || appointment?.patientName || 'Patient';
  const getBookedByMobile = (appointment: any) => appointment?.patientId?.mobile || appointment?.patientMobile || '';
  const getServiceForName = (appointment: any) => getServiceReceiver(appointment)?.name || getBookedByName(appointment);
  const getAttendanceStatusClass = (status?: string) => {
    switch (String(status || '').toLowerCase()) {
      case 'verified':
        return 'border-green-200 bg-green-50 text-green-700';
      case 'absent':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'skipped':
        return 'border-slate-200 bg-slate-50 text-slate-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
  };

  // Filter with real backend data structure
  const filteredAppointments = appointments.filter(apt => {
    const patientName = apt.patientId?.name || apt.patientName || '';
    const serviceReceiverName = apt.serviceReceiver?.name || '';
    const providerName = apt.providerId?.userId?.name || '';
    const matchesSearch = patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      serviceReceiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      providerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filters.status === 'all' || apt.status === filters.status;
    const matchesType = filters.type === 'all' || apt.providerId?.category === filters.type;
    return matchesSearch && matchesStatus && matchesType;
  });

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-base font-semibold sm:text-lg">Appointments Management</h1>
                <p className="text-sm text-muted-foreground">View and manage all appointments</p>
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

        <main className="min-w-0 flex-1 space-y-6 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Button variant="outline" className="gap-2" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                <Filter className="w-4 h-4" />
                Filter
                {(filters.status !== 'all' || filters.type !== 'all') && (
                  <span className="ml-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
              {showFilterMenu && (
                <div className="absolute left-0 top-12 w-64 max-w-[calc(100vw-1.5rem)] bg-card border border-border rounded-xl shadow-lg p-4 space-y-3 z-10 sm:left-auto sm:right-0">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Statuses</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Types</option>
                      <option value="In-Home">In-Home</option>
                      <option value="Video">Video</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFilters({ status: 'all', type: 'all' });
                        setShowFilterMenu(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowFilterMenu(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-healthcare overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Appointment ID</th>
                    <th className="text-left p-4 font-medium">Patient</th>
                    <th className="text-left p-4 font-medium">Provider</th>
                    <th className="text-left p-4 font-medium">Date & Time</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono text-sm">#{appointment._id.toString().slice(-8).toUpperCase()}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {appointment.patientId?.profileImage ? (
                            <img 
                              src={appointment.patientId.profileImage} 
                              alt={appointment.patientId.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {appointment.patientId?.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{getServiceForName(appointment)}</p>
                            {appointment.bookingFor === 'family' && (
                              <p className="text-xs text-muted-foreground">Booked by {getBookedByName(appointment)}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {appointment?.providerId?.userId?.profileImage ? (
                            <img 
                              src={appointment?.providerId?.userId?.profileImage} 
                              alt={appointment.providerId?.userId?.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                              {appointment.providerId?.userId?.name?.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{appointment.providerId?.userId?.name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{appointment.providerId?.category || 'Provider'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">
                          {new Date(appointment.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">{appointment.timeSlot}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {appointment.providerId?.category || 'General'}
                        </span>
                        {(appointment.nurseServiceName || appointment.caretakerServiceName) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {appointment.nurseServiceName || appointment.caretakerServiceName}
                          </p>
                        )}
                        {appointment.caretakerServiceName && (
                          <p className="text-xs text-muted-foreground">{appointment.shiftType} - {appointment.durationHours} hrs</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                            appointment.status === 'confirmed'
                              ? 'status-approved'
                              : appointment.status === 'pending'
                              ? 'status-pending'
                              : appointment.status === 'completed'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'status-rejected'
                          }`}
                        >
                          {appointment.status === 'confirmed' && <CheckCircle className="w-3 h-3" />}
                          {appointment.status === 'pending' && <Clock className="w-3 h-3" />}
                          {appointment.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {appointment.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                          {appointment.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleView(appointment)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(appointment._id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* View Appointment Modal - Comprehensive Details */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Appointment Details</h2>
                <p className="text-sm text-muted-foreground font-normal">ID: #{viewingAppointment?._id?.toString().slice(-8).toUpperCase()}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewingAppointment && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="patient">Patient Details</TabsTrigger>
                <TabsTrigger value="provider">Provider Details</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Appointment Info */}
                  <div className="card-healthcare p-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-primary" />
                      Appointment Information
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Booked By</p>
                        <p className="font-medium">{getBookedByName(viewingAppointment)}</p>
                        {getBookedByMobile(viewingAppointment) && (
                          <p className="text-sm text-muted-foreground">{getBookedByMobile(viewingAppointment)}</p>
                        )}
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Service For</p>
                        <p className="font-medium">{getServiceForName(viewingAppointment)}</p>
                        {getServiceReceiver(viewingAppointment)?.relation && (
                          <p className="text-sm text-muted-foreground">Relation: {getServiceReceiver(viewingAppointment).relation}</p>
                        )}
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-semibold text-lg">
                          {new Date(viewingAppointment.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Time Slot</p>
                        <p className="font-medium">{viewingAppointment.timeSlot}</p>
                      </div>
                      {(viewingAppointment.nurseServiceName || viewingAppointment.caretakerServiceName) && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Selected Service</p>
                          <p className="font-medium">{viewingAppointment.nurseServiceName || viewingAppointment.caretakerServiceName}</p>
                          {viewingAppointment.caretakerServiceName && <p className="text-sm text-muted-foreground">{viewingAppointment.shiftType} - {viewingAppointment.durationHours} hours</p>}
                        </div>
                      )}
                      {/* {viewingAppointment.distance && ( */}
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Distance</p>
                          <p className="font-medium">{viewingAppointment.distance} km</p>
                        </div>
                      {/* )} */}
                      {/* {viewingAppointment.travelFare && ( */}
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Travel Fare</p>
                          <p className="font-medium text-primary">₹{viewingAppointment.travelFare}</p>
                        </div>
                      {/* )} */}
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">Booking Date</p>
                        <p className="font-medium">
                          {new Date(viewingAppointment.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status & Type */}
                  <div className="card-healthcare p-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Status & Type
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Status</p>
                        <Badge
                          className={`text-sm ${
                            viewingAppointment.status === 'confirmed'
                              ? 'bg-green-500'
                              : viewingAppointment.status === 'pending'
                              ? 'bg-yellow-500'
                              : viewingAppointment.status === 'completed'
                              ? 'bg-blue-500'
                              : 'bg-red-500'
                          }`}
                        >
                          {viewingAppointment.status.toUpperCase()}
                        </Badge>
                      </div>
                      {viewingAppointment.providerId?.category && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Provider Type</p>
                          <Badge variant="secondary" className="text-sm">
                            {viewingAppointment.providerId.category}
                          </Badge>
                        </div>
                      )}
                      {viewingAppointment.providerId?.fees && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Consultation Fee</p>
                          <p className="font-semibold text-lg text-primary">₹{viewingAppointment.providerId.fees}</p>
                        </div>
                      )}
                      {viewingAppointment.cancelledBy && (
                        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200">
                          <p className="text-sm text-muted-foreground">Cancelled By</p>
                          <p className="font-medium text-red-600">{viewingAppointment.cancelledBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason & Notes */}
                <div className="card-healthcare p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Reason & Notes
                  </h3>
                  <div className="space-y-3">
                    {viewingAppointment.reason && (
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Reason for Visit</p>
                        <p className="font-medium">{viewingAppointment.reason}</p>
                      </div>
                    )}
                    {viewingAppointment.notes && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium mb-1 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Additional Notes
                        </p>
                        <p className="text-sm">{viewingAppointment.notes}</p>
                      </div>
                    )}
                    {viewingAppointment.cancellationReason && (
                      <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm font-medium mb-1 flex items-center gap-2 text-red-600">
                          <XCircle className="w-4 h-4" />
                          Cancellation Reason
                        </p>
                        <p className="text-sm">{viewingAppointment.cancellationReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Patient Details Tab */}
              <TabsContent value="patient" className="space-y-6">
                <div className="card-healthcare p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Patient Information
                  </h3>
                  {viewingAppointment.bookingFor === 'family' && (
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm text-muted-foreground">Actual Service Receiver</p>
                      <p className="text-lg font-semibold">{getServiceForName(viewingAppointment)}</p>
                      <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        {getServiceReceiver(viewingAppointment)?.relation && <p>Relation: {getServiceReceiver(viewingAppointment).relation}</p>}
                        {getServiceReceiver(viewingAppointment)?.mobile && <p>Contact: {getServiceReceiver(viewingAppointment).mobile}</p>}
                        {(getServiceReceiver(viewingAppointment)?.age || getServiceReceiver(viewingAppointment)?.gender) && (
                          <p>Age/Gender: {[getServiceReceiver(viewingAppointment).age, getServiceReceiver(viewingAppointment).gender].filter(Boolean).join('/')}</p>
                        )}
                        {getServiceReceiver(viewingAppointment)?.medicalNotes && <p className="md:col-span-2">Medical Notes: {getServiceReceiver(viewingAppointment).medicalNotes}</p>}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-4 mb-4">
                    {viewingAppointment.patientId?.profileImage ? (
                      <img 
                        src={viewingAppointment.patientId.profileImage} 
                        alt={viewingAppointment.patientId.name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                        {viewingAppointment.patientId?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{viewingAppointment.patientId?.name}</h4>
                      <p className="text-muted-foreground">Patient</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingAppointment.patientId?.mobile && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{viewingAppointment.patientId.mobile}</p>
                        </div>
                      </div>
                    )}
                    {viewingAppointment.patientId?.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{viewingAppointment.patientId.email}</p>
                        </div>
                      </div>
                    )}
                    {viewingAppointment.patientId?.location?.address && (
                      <div className="flex items-start gap-3 md:col-span-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{viewingAppointment.patientId.location.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Provider Details Tab */}
              <TabsContent value="provider" className="space-y-6">
                <div className="card-healthcare p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Provider Information
                  </h3>
                  <div className="flex items-start gap-4 mb-4">
                    {viewingAppointment.providerId?.profileImage ? (
                      <img 
                        src={viewingAppointment.providerId.profileImage} 
                        alt={viewingAppointment.providerId.userId.name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl">
                        {viewingAppointment.providerId?.userId?.name?.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{viewingAppointment.providerId?.userId?.name}</h4>
                      {viewingAppointment.providerId?.specialization && (
                        <p className="text-primary font-medium">{viewingAppointment.providerId.specialization}</p>
                      )}
                      {viewingAppointment.providerId?.category && (
                        <Badge variant="secondary" className="mt-1">{viewingAppointment.providerId.category}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {viewingAppointment.providerId?.qualification && (
                        <div className="flex items-start gap-3">
                          <Award className="w-4 h-4 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm text-muted-foreground">Qualification</p>
                            <p className="font-medium">{viewingAppointment.providerId.qualification}</p>
                          </div>
                        </div>
                      )}
                      {viewingAppointment.providerId?.userId?.mobile && (
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{viewingAppointment.providerId.userId.mobile}</p>
                          </div>
                        </div>
                      )}
                      {viewingAppointment.providerId?.userId?.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{viewingAppointment.providerId.userId.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {viewingAppointment.providerId?.fees && (
                      <div className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Consultation Fee</p>
                          <p className="font-bold text-2xl text-primary">₹{viewingAppointment.providerId.fees}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-6">
                <div className="card-healthcare p-5 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Visit Attendance
                      </h3>
                      <p className="text-sm text-muted-foreground">Provider presence verification for this appointment.</p>
                    </div>
                    {attendance && (
                      <Badge variant="secondary" className="w-fit text-sm">
                        {attendance.attendancePercentage}% verified
                      </Badge>
                    )}
                  </div>
                  {attendanceLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading attendance...
                    </div>
                  ) : attendanceError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {attendanceError}
                    </div>
                  ) : attendance ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Total Visits</p>
                          <p className="text-xl font-bold">{attendance.totalVisits}</p>
                        </div>
                        <div className="rounded-lg bg-green-50 p-3 text-green-700">
                          <p className="text-xs">Verified</p>
                          <p className="text-xl font-bold">{attendance.verifiedVisits}</p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-3 text-red-700">
                          <p className="text-xs">Absent</p>
                          <p className="text-xl font-bold">{attendance.absentVisits}</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                          <p className="text-xs">Pending</p>
                          <p className="text-xl font-bold">{attendance.pendingVisits}</p>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Attendance progress</span>
                          <span>{attendance.attendancePercentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, attendance.attendancePercentage || 0)}%` }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(attendance.visits || []).length === 0 && (
                          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No visit attendance records found.
                          </div>
                        )}
                        {(attendance.visits || []).map((visit: any) => (
                          <div key={visit._id} className="rounded-lg border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="font-semibold">Visit {visit.visitNumber}</div>
                              <div className="text-sm text-muted-foreground">{new Date(visit.visitDate).toLocaleDateString()}</div>
                              {visit.verifiedAt && (
                                <div className="text-xs text-muted-foreground">Verified at {new Date(visit.verifiedAt).toLocaleString()}</div>
                              )}
                            </div>
                            <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getAttendanceStatusClass(visit.status)}`}>
                              {visit.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Attendance details are not available for this appointment.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={() => setShowViewModal(false)} className="flex-1">
              Close
            </Button>
            {viewingAppointment?.status !== 'completed' && viewingAppointment?.status !== 'cancelled' && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  handleCancel(viewingAppointment.id);
                  setShowViewModal(false);
                }}
              >
                Cancel Appointment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
