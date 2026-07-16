import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  HeartPulse,
  Stethoscope,
  DollarSign,
  IndianRupee,
  ShoppingCart,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProviderApproval } from '@/hooks/useProviderApproval';
import providerService from '@/services/provider.service';
import { getProviderAssignedLabBookings } from '@/services/labTest.service';

export default function ProviderAppointments() {
  const navigate = useNavigate();
  const { loading: approvalLoading } = useProviderApproval();
  const { count: notificationCount } = useNotificationCount();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visitDialog, setVisitDialog] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [visitCode, setVisitCode] = useState('');
  const [verifyingVisit, setVerifyingVisit] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const normalizeCategory = (value: string) => String(value || '').trim().toLowerCase();
  const isAttendanceProvider = (provider: any) => {
    const providerCategory = normalizeCategory(
      provider?.category || provider?.providerType || user?.providerCategory || user?.category || ''
    );
    return ['nurse', 'physiotherapist', 'caretaker', 'care taker'].includes(providerCategory);
  };
  const isLabProvider = ['lab technician', 'lab', 'laboratory'].includes(
    String(user?.providerCategory || user?.category || '').trim().toLowerCase()
  );

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
    if (/am|pm/i.test(value)) return value;
    const parsed = new Date(`1970-01-01T${value}`);
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusClass = (status?: string) => {
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

  const getVisitSummary = (items: any[]) => {
    const total = items.length;
    const verified = items.filter((visit) => visit.status === 'verified').length;
    const pending = items.filter((visit) => visit.status === 'pending').length;
    const absent = items.filter((visit) => visit.status === 'absent').length;
    const today = items.find((visit) => new Date(visit.visitDate).toDateString() === new Date().toDateString());
    return {
      total,
      verified,
      pending,
      absent,
      today,
      percentage: total ? Math.round((verified / total) * 100) : 0,
    };
  };

  const getExpectedVisitTotal = (appointment: any) => Number(
    appointment?.visitsTotal
    || appointment?.sessionsTotal
    || appointment?.packageVisitCount
    || appointment?.packageSessionCount
    || (appointment?.bookingType === 'package' ? 0 : 1)
  );

  const getVerifiedVisitCount = (appointment: any) => Number(
    appointment?.visitsCompleted
    || appointment?.sessionsCompleted
    || 0
  );

  const canMarkAttendanceAppointmentComplete = (appointment: any) => {
    if (!isAttendanceProvider(appointment) || appointment?.status !== 'confirmed') return false;
    const total = getExpectedVisitTotal(appointment);
    return total > 0 && getVerifiedVisitCount(appointment) >= total;
  };

  useEffect(() => {
    if (!approvalLoading) {
      fetchAppointments();
    }
  }, [approvalLoading, isLabProvider]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      if (isLabProvider) {
        const response = await getProviderAssignedLabBookings();
        const statusMap: Record<string, string> = {
          pending: 'pending',
          pending_admin_approval: 'pending',
          assigned_to_lab: 'pending',
          lab_accepted: 'confirmed',
          sample_collected: 'confirmed',
          report_ready: 'confirmed',
          confirmed: 'confirmed',
          completed: 'completed',
          lab_rejected: 'cancelled',
          rejected_by_admin: 'cancelled',
          cancelled: 'cancelled',
        };
        setAppointments((response.bookings || []).map((booking: any) => ({
          ...booking,
          isLabBooking: true,
          date: booking.preferredDate,
          timeSlot: booking.preferredTimeSlot,
          status: statusMap[booking.status] || 'pending',
          reason: `Lab test booking: ${(booking.selectedTests?.length ? booking.selectedTests : booking.tests || [])
            .map((test: any) => test.testName)
            .filter(Boolean)
            .join(', ')}`,
        })));
        return;
      }
      const response = await providerService.getMyAppointments();
      if (response.success && response.appointments) {
        setAppointments(response.appointments);
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

  if (approvalLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredAppointments = appointments
    .filter((apt) => {
      const matchesFilter = filter === 'all' || apt.status === filter;
      const patientName = apt.serviceReceiver?.name || apt.patientId?.name || apt.patientName || '';
      const matchesSearch = patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (apt.patientId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (apt.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      // Priority order: pending/confirmed first, then completed
      const statusPriority: { [key: string]: number } = {
        pending: 1,
        confirmed: 2,
        completed: 3,
        cancelled: 4,
      };

      const aPriority = statusPriority[a.status] || 5;
      const bPriority = statusPriority[b.status] || 5;

      // First sort by status priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Within same status, sort by date (latest first)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

  const handleAccept = async (appointment: any) => {
    try {
      await providerService.updateAppointmentStatus(appointment._id || appointment.id, 'confirmed');
      toast({
        title: 'Appointment Accepted',
        description: 'The patient has been notified.',
      });
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to accept appointment',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (appointment: any) => {
    try {
      await providerService.updateAppointmentStatus(appointment._id || appointment.id, 'cancelled');
      toast({
        title: 'Appointment Rejected',
        description: 'The patient has been notified.',
        variant: 'destructive',
      });
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject appointment',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = async (appointment: any) => {
    try {
      await providerService.updateAppointmentStatus(appointment._id || appointment.id, 'completed');
      toast({
        title: 'Appointment Completed',
        description: 'The appointment has been marked as completed.',
      });
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to complete appointment',
        variant: 'destructive',
      });
    }
  };

  const openAttendance = async (appointment: any) => {
    try {
      const response = await providerService.getAppointmentVisits(appointment._id || appointment.id);
      setVisits(response.visits || []);
      setVisitDialog(appointment);
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load visit attendance',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyVisit = async (visit: any) => {
    try {
      setVerifyingVisit(true);
      const response = await providerService.verifyAppointmentVisit(visitDialog._id || visitDialog.id, {
        visitId: visit._id,
        code: visitCode,
      });
      toast({ title: 'Verified', description: response.message || 'Visit verified successfully' });
      const updated = await providerService.getAppointmentVisits(visitDialog._id || visitDialog.id);
      setVisits(updated.visits || []);
      setVisitCode('');
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to verify visit',
        variant: 'destructive',
      });
    } finally {
      setVerifyingVisit(false);
    }
  };

  const providerType = user?.role === 'doctor' ? 'Doctor' : user?.role === 'nurse' ? 'Nurse' : 'Provider';

  const statusBadge = (
    <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
        <span className="text-sm font-medium text-secondary">Profile Active</span>
      </div>
      <p className="text-xs text-muted-foreground">Visible to patients</p>
    </div>
  );

  return (
    <DashboardLayout
      sidebarLinks={getProviderSidebarLinks(user)}
      portalName="Appointments"
      userName={providerType}
      userInitial={providerType.charAt(0)}
      notificationCount={notificationCount}
      statusBadge={statusBadge}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Manage Appointments</h2>
        <p className="text-muted-foreground">View and manage patient appointment requests</p>
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
              placeholder="Search by patient name or reason..."
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
          filteredAppointments.map((appointment, index) => (
            <motion.div
              key={appointment._id || appointment.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="card-healthcare p-5"
            >
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex items-start gap-4">
                  {appointment.patientId?.profileImage && appointment.patientId.profileImage.trim() ? (
                    <img
                      src={appointment.patientId.profileImage}
                      alt={appointment.patientId.name}
                      className="w-14 h-14 rounded-2xl object-cover shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">
                      {(appointment.patientId?.name || appointment.patientName || 'P').charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{appointment.serviceReceiver?.name || appointment.patientName || appointment.patientId?.name || 'Patient'}</h3>
                    <div className="mt-1 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                      <p><span className="font-medium">Patient Name:</span> {appointment.serviceReceiver?.name || appointment.patientName || appointment.patientId?.name || 'Patient'}</p>
                      <p><span className="font-medium">Booked By:</span> {appointment.patientId?.name || 'Account owner'}</p>
                      {appointment.serviceReceiver?.relation && <p><span className="font-medium">Relation:</span> {appointment.serviceReceiver.relation}</p>}
                      <p><span className="font-medium">Contact:</span> {appointment.serviceReceiver?.mobile || appointment.patientMobile || appointment.patientId?.mobile || 'N/A'}</p>
                      {appointment.serviceReceiver?.medicalNotes && <p><span className="font-medium">Medical Notes:</span> {appointment.serviceReceiver.medicalNotes}</p>}
                    </div>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                    {appointment.nurseServiceName && <p className="mt-1 text-sm font-medium text-primary">Service: {appointment.nurseServiceName}</p>}
                    {appointment.caretakerServiceName && <p className="mt-1 text-sm font-medium text-primary">Service: {appointment.caretakerServiceName} ({appointment.shiftType}, {appointment.durationHours} hrs)</p>}
                    {(appointment.patientId?.location?.address || appointment.address) && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Address: {appointment.patientId?.location?.address || `${appointment.address}${appointment.city ? `, ${appointment.city}` : ''}`}
                      </p>
                    )}
                    {appointment.paymentStatus && <p className="mt-1 text-sm text-muted-foreground">Payment: <span className="capitalize">{appointment.paymentStatus}</span></p>}
                    {appointment.bookingType === 'package' && appointment.sessionsTotal > 0 && (
                      <div className="mt-3 w-full max-w-xs space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{appointment.sessionsCompleted || 0} of {appointment.sessionsTotal} sessions done</span>
                          <span>{Math.round(((appointment.sessionsCompleted || 0) / appointment.sessionsTotal) * 100)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((appointment.sessionsCompleted || 0) / appointment.sessionsTotal) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {appointment.bookingType === 'package' && appointment.visitsTotal > 0 && (
                      <div className="mt-3 w-full max-w-xs space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground"><span>{appointment.visitsCompleted || 0} of {appointment.visitsTotal} visits done</span><span>{Math.round(((appointment.visitsCompleted || 0) / appointment.visitsTotal) * 100)}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((appointment.visitsCompleted || 0) / appointment.visitsTotal) * 100)}%` }} /></div>
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
                  <div className="flex flex-wrap gap-2 justify-end">
                    {/* Medical Profile Button */}
                    {!appointment.isLabBooking && appointment.patientId?._id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={() => navigate(`/provider/patients/${appointment.patientId._id}/medical-profile`)}
                      >
                        <HeartPulse className="w-4 h-4 mr-1" />
                        Medical
                      </Button>
                    )}
                    {appointment.status === 'pending' && !appointment.isLabBooking && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleReject(appointment)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAccept(appointment)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                      </>
                    )}
                    {appointment.status === 'confirmed' && !appointment.isLabBooking && !isAttendanceProvider(appointment) && (
                      <Button
                        size="sm"
                        onClick={() => handleComplete(appointment)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {appointment.bookingType === 'package' ? 'Complete Session' : 'Complete'}
                      </Button>
                    )}
                    {canMarkAttendanceAppointmentComplete(appointment) && (
                      <Button size="sm" onClick={() => handleComplete(appointment)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                    {isAttendanceProvider(appointment) && appointment.status !== 'completed' && !canMarkAttendanceAppointmentComplete(appointment) && (
                      <Button size="sm" variant="outline" onClick={() => openAttendance(appointment)}>
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Enter Visit Code
                      </Button>
                    )}
                    {isAttendanceProvider(appointment) && appointment.status === 'completed' && appointment.patientId?._id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/provider/notes?patientId=${appointment.patientId._id}`)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Add Medical Record
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="card-healthcare p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No appointments found</h3>
            <p className="text-muted-foreground">Appointments will appear here when patients book</p>
          </div>
        )}
      </motion.div>
      <Dialog open={!!visitDialog} onOpenChange={(open) => !open && setVisitDialog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Visit Attendance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {visits.length > 0 && (() => {
              const summary = getVisitSummary(visits);
              return (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Attendance Progress</p>
                      <p className="text-2xl font-bold">{summary.verified} of {summary.total} visits verified</p>
                    </div>
                    <div className="min-w-[180px]">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>{summary.percentage}% complete</span>
                        <span>{summary.pending} pending</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${summary.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                  {summary.today && (
                    <div className="mt-3 rounded-lg border bg-background p-3 text-sm">
                      <span className="font-medium">Today:</span> Visit {summary.today.visitNumber} is{' '}
                      <span className="capitalize">{summary.today.status}</span>
                    </div>
                  )}
                  {summary.total > 0 && summary.verified >= summary.total && visitDialog?.status === 'confirmed' && (
                    <Button className="mt-4 w-full" onClick={() => handleComplete(visitDialog)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Appointment Complete
                    </Button>
                  )}
                </div>
              );
            })()}
            {visits.length === 0 && (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                No attendance records found for this appointment.
              </div>
            )}
            {visits.map((visit) => (
              <div key={visit._id} className="rounded-xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">Visit {visit.visitNumber}</div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusClass(visit.status)}`}>
                      {visit.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{formatDate(visit.visitDate)}</div>
                  {visit.verifiedAt && (
                    <div className="text-xs text-muted-foreground">Verified at {new Date(visit.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                </div>
                {visit.status !== 'verified' && new Date(visit.visitDate).toDateString() === new Date().toDateString() && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={visitCode}
                      onChange={(e) => setVisitCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 digit code"
                      className="max-w-40 tracking-[0.2em]"
                      inputMode="numeric"
                    />
                    <Button disabled={verifyingVisit || visitCode.length !== 6} onClick={() => handleVerifyVisit(visit)}>
                      Verify
                    </Button>
                  </div>
                )}
                {visit.status !== 'verified' && new Date(visit.visitDate).toDateString() !== new Date().toDateString() && (
                  <div className="text-sm text-muted-foreground">
                    {new Date(visit.visitDate) > new Date() ? 'Available on visit date' : 'Verification window closed'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
