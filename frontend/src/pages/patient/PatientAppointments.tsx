import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Search,
  User,
  Clock,
  CheckCircle,
  Stethoscope,
  Filter,
  Plus,
  Heart,
  Users,
  Eye,
  Phone,
  Mail,
  MapPin,
  Award,
  CreditCard,
  Download,
  Star,
  IndianRupee,
  Loader2,
  Edit2,
  X,
  ShoppingCart,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useToast } from '@/hooks/use-toast';
import { getAssetViewUrl } from '@/utils/assetProxy';
import { useAuth } from '@/contexts/AuthContext';
import patientService from '@/services/patient.service';
import NotificationDropdown from '@/components/NotificationDropdown';

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/patient/dashboard' },
  { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
  { icon: FileText, label: 'Medical Records', href: '/patient/records' },
  { icon: Search, label: 'Find Providers', href: '/patient/providers' },
  { icon: ShoppingCart, label: 'Coins Cart', href: '/patient/coins' },
  { icon: Users, label: 'My Family & Friends', href: '/patient/family-friends' },
  { icon: User, label: 'Profile', href: '/patient/profile' },
];

export default function PatientAppointments() {
  const { count: notificationCount } = useNotificationCount();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [ratingDialog, setRatingDialog] = useState<any>(null);
  const [appointmentVisits, setAppointmentVisits] = useState<any[]>([]);
  const [visitMap, setVisitMap] = useState<Record<string, any[]>>({});
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const formatDate = (value?: string | Date) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (value?: string) => {
    if (!value) return 'N/A';
    // If already contains AM/PM, return as-is
    if (/am|pm/i.test(value)) return value;
    const parsed = new Date(`1970-01-01T${value}`);
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const loadVisits = async () => {
      if (!selectedProvider?._id) return;
      try {
        const response = await patientService.getAppointmentVisits(selectedProvider._id);
        setAppointmentVisits(response.visits || []);
      } catch {
        setAppointmentVisits([]);
      }
    };
    loadVisits();
  }, [selectedProvider]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await patientService.getMyAppointments();
      if (response.success) {
        setAppointments(response.appointments);
        const visitsEntries = await Promise.all(
          (response.appointments || []).map(async (appointment: any) => {
            try {
              const visitResponse = await patientService.getAppointmentVisits(appointment._id);
              return [appointment._id, visitResponse.visits || []] as const;
            } catch {
              return [appointment._id, []] as const;
            }
          })
        );
        setVisitMap(Object.fromEntries(visitsEntries));
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch appointments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesFilter = filter === 'all' || apt.status === filter;
    const providerName = apt.providerId?.userId?.name || '';
    const matchesSearch = providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTodaysVisit = (appointment: any) => {
    const visits = visitMap[appointment?._id] || appointment?.visitAttendance || appointment?.visits || [];
    const today = new Date().toDateString();
    return visits.find((visit: any) => new Date(visit.visitDate).toDateString() === today);
  };

  const getVisitStatusClass = (status?: string) => {
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

  const getAttendanceSummary = (appointment: any) => {
    const visits = visitMap[appointment?._id] || appointment?.visitAttendance || appointment?.visits || [];
    const totalFromPackage = Number(appointment?.sessionsTotal || appointment?.visitsTotal || 0);
    const total = totalFromPackage || visits.length || 0;
    const verified = visits.length
      ? visits.filter((visit: any) => visit.status === 'verified').length
      : Number(appointment?.sessionsCompleted || appointment?.visitsCompleted || 0);
    const pending = visits.filter((visit: any) => visit.status === 'pending').length;
    const absent = visits.filter((visit: any) => visit.status === 'absent').length;
    const today = getTodaysVisit(appointment);
    return {
      visits,
      total,
      verified,
      pending,
      absent,
      today,
      percentage: total ? Math.round((verified / total) * 100) : 0,
    };
  };

  const handleCancel = async (id: string) => {
    try {
      const response = await patientService.cancelAppointment(id, 'Cancelled by patient');
      if (response.success) {
        toast({
          title: 'Appointment Cancelled',
          description: 'Your appointment has been cancelled successfully.',
        });
        fetchAppointments(); // Refresh list
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel appointment',
        variant: 'destructive',
      });
    }
  };

  const handleAddReview = async () => {
    if (!ratingDialog) return;
    if (!comment.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please write your review comment.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmittingReview(true);
      const response = await patientService.addReview({
        providerId: ratingDialog.providerId._id,
        appointmentId: ratingDialog._id,
        rating,
        comment,
      });

      if (response.success) {
        toast({
          title: 'Review Submitted',
          description: 'Thank you for your feedback!',
        });
        setRatingDialog(null);
        setRating(5);
        setComment('');
        fetchAppointments();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'Doctor': return Stethoscope;
      case 'Nurse': return Heart;
      case 'Care Taker': return Users;
      default: return Stethoscope;
    }
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      portalName="My Appointments"
      userName={user?.name || 'Patient'}
      userInitial={user?.name?.charAt(0) || 'P'}
      notificationCount={notificationCount}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
      {/* Header Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Appointments</h2>
          <p className="text-muted-foreground">Manage your healthcare appointments</p>
        </div>
        <Button asChild>
          <a href="/patient/providers">
            <Plus className="w-4 h-4 mr-2" />
            Book New Appointment
          </a>
        </Button>
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
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'confirmed', 'completed'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Appointments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment, index) => {
            const ProviderIcon = getProviderIcon(appointment.providerType);
            const attendanceSummary = getAttendanceSummary(appointment);
            return (
              <motion.div
                key={appointment._id || appointment.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="card-healthcare p-5"
              >
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex items-start gap-4">
                    {appointment.providerId?.profileImage && appointment.providerId.profileImage.trim() ? (
                      <img
                        src={appointment.providerId.profileImage}
                        alt={appointment.providerId.userId.name}
                        className="w-14 h-14 rounded-2xl object-cover shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">
                        {(appointment.providerId?.userId?.name || 'P').charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{appointment.providerId?.userId?.name || 'Provider'}</h3>
                      <p className="text-muted-foreground text-sm">{appointment.providerId?.category || 'Healthcare Provider'}</p>
                      <p className="text-sm mt-1">{appointment.reason}</p>
                      {appointment.nurseServiceName && <p className="text-sm font-medium text-primary">Service: {appointment.nurseServiceName}</p>}
                      {appointment.caretakerServiceName && <p className="text-sm font-medium text-primary">Service: {appointment.caretakerServiceName} ({appointment.shiftType}, {appointment.durationHours} hrs)</p>}
                      {attendanceSummary.total > 0 && (
                        <div className="mt-3 w-full max-w-xs space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{attendanceSummary.verified} of {attendanceSummary.total} visits verified</span>
                            <span>{attendanceSummary.percentage}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, attendanceSummary.percentage)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {attendanceSummary.today?.visitCode && attendanceSummary.today.status !== 'verified' && (
                        <div className={`mt-3 inline-flex max-w-sm flex-col rounded-xl border px-4 py-3 ${attendanceSummary.today.status === 'verified' ? 'border-green-200 bg-green-50' : 'border-primary/20 bg-primary/5'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium uppercase text-primary">Today&apos;s Visit Code</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${getVisitStatusClass(attendanceSummary.today.status)}`}>
                              {attendanceSummary.today.status}
                            </span>
                          </div>
                          <span className="mt-1 text-xl font-semibold tracking-[0.25em]">{attendanceSummary.today.visitCode}</span>
                          <span className="text-xs text-muted-foreground">Visible only for today&apos;s visit.</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(appointment.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(appointment.timeSlot || appointment.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span
                      className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                        appointment.status === 'confirmed'
                          ? 'status-approved'
                          : appointment.status === 'pending'
                          ? 'status-pending'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProvider(appointment)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      {appointment.status === 'completed' && !appointment.hasReview && (
                        <Button
                          size="sm"
                          className="bg-secondary hover:bg-secondary/90"
                          onClick={() => setRatingDialog(appointment)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Add Review
                        </Button>
                      )}
                      {appointment.status !== 'completed' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleCancel(appointment.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="card-healthcare p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No appointments found</h3>
            <p className="text-muted-foreground mb-4">Book your first appointment to get started</p>
            <Button asChild>
              <a href="/patient/providers">Find Providers</a>
            </Button>
          </div>
        )}
      </motion.div>

      {/* Provider Details Dialog */}
      <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Provider Details</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="appointment">Appointment Info</TabsTrigger>
                <TabsTrigger value="visits">Visit Code</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
                  {selectedProvider.providerId?.profileImage ? (
                    <img
                      src={selectedProvider.providerId.profileImage}
                      alt={selectedProvider.providerId.userId.name}
                      className="w-20 h-20 rounded-2xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 text-white font-bold text-2xl">
                      {selectedProvider.providerId?.userId?.name?.charAt(0) || 'P'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-xl">{selectedProvider.providerId?.userId?.name || 'Provider'}</h3>
                    <p className="text-muted-foreground">{selectedProvider.providerId?.specialization || selectedProvider.providerId?.category}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 fill-secondary text-secondary" />
                      <span className="font-medium">{selectedProvider.providerId?._averageRating || 0}</span>
                      <span className="text-sm text-muted-foreground">({selectedProvider.providerId?._totalReviews || 0} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="card-healthcare p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Award className="w-5 h-5" />
                      <h4 className="font-semibold">Specialization</h4>
                    </div>
                    <p className="text-sm">{selectedProvider.providerId?.specialization || 'General'}</p>
                  </div>

                  <div className="card-healthcare p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Clock className="w-5 h-5" />
                      <h4 className="font-semibold">Experience</h4>
                    </div>
                    <p className="text-sm">{selectedProvider.providerId?.experience ? `${selectedProvider.providerId.experience}+ years` : 'N/A'}</p>
                  </div>

                  <div className="card-healthcare p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Phone className="w-5 h-5" />
                      <h4 className="font-semibold">Contact</h4>
                    </div>
                    <p className="text-sm">{selectedProvider.providerId?.userId?.mobile || 'N/A'}</p>
                  </div>

                  <div className="hidden">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <IndianRupee className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-lg">
                      ₹{(() => {
                        const fee = selectedProvider?.providerId?.fees || 500;
                        const commission = Math.round(fee * 0.20);
                        const gst = Math.round(commission * 0.18);
                        const total = fee + commission + gst + (selectedProvider?.travelFare || 0);
                        return total;
                      })() || 0}
                      </p>
                  </div>
                </div>

                <div className="card-healthcare p-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <MapPin className="w-5 h-5" />
                    <h4 className="font-semibold">Address</h4>
                  </div>
                    <p className="text-sm">{selectedProvider.providerId?.address?.street}, {selectedProvider.providerId?.address?.city}, {selectedProvider.providerId?.address?.state} - {selectedProvider.providerId?.address?.pincode}</p>
                </div>
              </TabsContent>

              <TabsContent value="appointment" className="space-y-4 mt-4">
                <div className="card-healthcare p-5">
                  <h4 className="font-semibold mb-4 text-lg">Appointment Information</h4>
                  <div className="grid gap-4">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Appointment Type</span>
                      <span className="font-medium">{selectedProvider.appointmentType || 'In-Person Consultation'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{formatDate(selectedProvider.date)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{formatTime(selectedProvider.timeSlot || selectedProvider.time)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{selectedProvider.duration || '30 minutes'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedProvider.status === 'confirmed' ? 'status-approved' :
                        selectedProvider.status === 'pending' ? 'status-pending' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {selectedProvider.status.charAt(0).toUpperCase() + selectedProvider.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Booking Date</span>
                      <span className="font-medium">{formatDate(selectedProvider.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="card-healthcare p-5">
                  <h4 className="font-semibold mb-3">Reason for Visit</h4>
                  <p className="text-sm text-muted-foreground mb-3">{selectedProvider.reason}</p>
                  
                  <h4 className="font-semibold mb-3 mt-4">Previous Prescriptions</h4>
                  {selectedProvider.prescriptionImages && selectedProvider.prescriptionImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {selectedProvider.prescriptionImages.map((img: string, idx: number) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img}
                            alt={`Prescription ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(img, '_blank')}
                          />
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            Click to view
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">No prescription images uploaded</p>
                  )}
                  
                  {selectedProvider.notes && (
                    <>
                      <h4 className="font-semibold mb-3 mt-4">Additional Notes</h4>
                      <p className="text-sm text-muted-foreground">{selectedProvider.notes}</p>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  {selectedProvider.providerId?.documentation && selectedProvider.providerId.documentation.length > 0 ? (
                    selectedProvider.providerId.documentation.map((doc: string, index: number) => (
                      <div key={index} className="card-healthcare p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h4 className="font-semibold">
                              {index === 0 ? 'Medical License' : `Document ${index + 1}`}
                            </h4>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <a href={getAssetViewUrl(doc, 'inline')} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={getAssetViewUrl(doc, 'attachment')} download={`document-${index + 1}.pdf`}>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          {doc.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                            <img
                              src={getAssetViewUrl(doc, 'inline')}
                              alt={`Document ${index + 1}`}
                              className="w-full rounded-lg border border-border object-contain max-h-96"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="flex items-center justify-center p-8 text-muted-foreground"><p>Unable to load image</p></div>';
                                }
                              }}
                            />
                          ) : (
                            <iframe
                              src={getAssetViewUrl(doc, 'inline')}
                              title={`Document ${index + 1}`}
                              className="w-full h-[500px] rounded-lg border border-border"
                            />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="card-healthcare p-8 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No documents available</p>
                    </div>
                  )}

                  {selectedProvider.providerId?.aadharImages && selectedProvider.providerId.aadharImages.length > 0 && (
                    <div className="card-healthcare p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">Aadhar Card</h4>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        {selectedProvider.providerId.aadharImages.map((aadhar: string, index: number) => (
                          <div key={index} className="bg-muted/30 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">
                              {index === 0 ? 'Front Side' : 'Back Side'}
                            </p>
                            {aadhar.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                              <img
                                src={getAssetViewUrl(aadhar, 'inline')}
                                alt={`Aadhar ${index === 0 ? 'Front' : 'Back'}`}
                                className="w-full rounded-lg border border-border"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="flex items-center justify-center p-4 text-muted-foreground text-xs"><p>Unable to load image</p></div>';
                                  }
                                }}
                              />
                            ) : (
                              <iframe
                                src={getAssetViewUrl(aadhar, 'inline')}
                                title={`Aadhar ${index + 1}`}
                                className="w-full h-64 rounded-lg border border-border"
                              />
                            )}
                            <Button size="sm" variant="outline" className="w-full mt-2" asChild>
                              <a href={getAssetViewUrl(aadhar, 'attachment')} target="_blank" rel="noopener noreferrer">
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      🔒 All documents are verified by Healthy Touch Healthcare and securely stored.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visits" className="space-y-4 mt-4">
                <div className="card-healthcare p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">Visit Attendance</h4>
                      <p className="text-sm text-muted-foreground">Today&apos;s code is visible only on the scheduled visit date.</p>
                    </div>
                    {appointmentVisits.length > 0 && (
                      <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                        <span className="font-semibold">{appointmentVisits.filter((visit) => visit.status === 'verified').length}</span>
                        <span className="text-muted-foreground"> / {appointmentVisits.length} verified</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {appointmentVisits.length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No visit attendance records found.
                      </div>
                    )}
                    {appointmentVisits.map((visit) => (
                      <div key={visit._id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              <div className="font-semibold">Visit {visit.visitNumber}</div>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{formatDate(visit.visitDate)}</div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getVisitStatusClass(visit.status)}`}>
                            {visit.status}
                          </span>
                        </div>
                        {visit.visitCode && new Date(visit.visitDate).toDateString() === new Date().toDateString() && (
                          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                            <div className="text-xs font-medium uppercase text-primary">Today&apos;s code</div>
                            <div className="text-lg font-semibold tracking-[0.25em]">{visit.visitCode}</div>
                          </div>
                        )}
                        {visit.verifiedAt && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Verified at {new Date(visit.verifiedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={!!ratingDialog} onOpenChange={() => setRatingDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
          </DialogHeader>
          {ratingDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                {ratingDialog.providerId?.userId?.profileImage ? (
                  <img
                    src={ratingDialog.providerId.userId.profileImage}
                    alt={ratingDialog.providerId.userId.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
                    {ratingDialog.providerId?.userId?.name?.charAt(0) || 'P'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold">{ratingDialog.providerId?.userId?.name}</h3>
                  <p className="text-sm text-muted-foreground">{ratingDialog.providerId?.specialization}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Rating</label>
                <div className="flex gap-2 justify-center py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= rating
                            ? 'fill-secondary text-secondary'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Review*</label>
                <textarea
                  placeholder="Share your experience with this provider..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {comment.length}/500 characters
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRatingDialog(null);
                    setRating(5);
                    setComment('');
                  }}
                  disabled={submittingReview}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddReview}
                  disabled={submittingReview || !comment.trim()}
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </>
      )}
    </DashboardLayout>
  );
}
