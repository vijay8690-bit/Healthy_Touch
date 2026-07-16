import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Search,
  User,
  Download,
  Eye,
  Clock,
  Stethoscope,
  Pill,
  ClipboardList,
  Loader2,
  ShoppingCart,
  CreditCard,
  IndianRupee,
  ReceiptText,
  FlaskConical,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import patientService from '@/services/patient.service';
import { getPatientLabReports, openGeneratedLabBookingReportPdf, openLabReportPdf } from '@/services/labTest.service';
import { useAuth } from '@/contexts/AuthContext';
import { readFamilyMembers, type FamilyMember } from '@/utils/familyMembers';

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/patient/dashboard' },
  { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
  { icon: FileText, label: 'Medical Records', href: '/patient/records' },
  { icon: Search, label: 'Find Providers', href: '/patient/providers' },
  { icon: ShoppingCart, label: 'Coins Cart', href: '/patient/coins' },
  { icon: Users, label: 'My Family & Friends', href: '/patient/family-friends' },
  { icon: User, label: 'Profile', href: '/patient/profile' },
];

const formatDate = (value?: string | Date) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (value?: string) => {
  if (!value) return 'N/A';
  if (/am|pm/i.test(value)) return value;
  const parsed = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const statusClass = (status?: string) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'pending':
    case 'pending_admin_approval':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'assigned_to_lab':
    case 'lab_accepted':
    case 'sample_collected':
    case 'report_ready':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'failed':
    case 'cancelled':
    case 'refunded':
    case 'rejected_by_admin':
    case 'lab_rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getLabBookingReportFiles = (booking: any) => {
  if (booking.mainReportPdfUrl) {
    return [{
      url: booking.mainReportPdfUrl,
      name: booking.mainReportPdfName || booking.reportName || 'Lab Report',
      label: 'Lab Report',
      uploadedAt: booking.reportUploadedAt || booking.reportReadyAt,
    }];
  }
  if (booking.reportUrl) {
    return [{
      url: booking.reportUrl,
      name: booking.reportName || 'Lab Report',
      label: 'Lab Report',
      uploadedAt: booking.reportUploadedAt || booking.reportReadyAt,
    }];
  }
  return booking.reportFiles?.length ? booking.reportFiles : booking.reports || [];
};

const getServiceReceiver = (item: any) => item?.serviceReceiver || item?.appointmentId?.serviceReceiver || {};

const getRecordOwnerKey = (item: any) => {
  const receiver = getServiceReceiver(item);
  if (receiver?.memberId) return receiver.memberId;
  if (item?.bookingFor === 'family' || item?.appointmentId?.bookingFor === 'family') {
    return receiver?.name || 'family';
  }
  return 'self';
};

const getReceiverLabel = (item: any, fallbackName = 'Myself') => {
  const receiver = getServiceReceiver(item);
  return receiver?.name || fallbackName;
};

export default function PatientRecords() {
  const { count: notificationCount } = useNotificationCount();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [labBookings, setLabBookings] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [recordOwner, setRecordOwner] = useState('all');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPatientHistory();
  }, []);

  useEffect(() => {
    setFamilyMembers(readFamilyMembers(user));
  }, [user]);

  const fetchPatientHistory = async () => {
    try {
      setLoading(true);
      const [recordsRes, appointmentsRes, paymentsRes, labBookingsRes] = await Promise.all([
        patientService.getMyMedicalRecords(),
        patientService.getMyAppointments(),
        patientService.getMyPayments(),
        getPatientLabReports(),
      ]);

      if (recordsRes.success) setMedicalRecords(recordsRes.medicalRecords || []);
      if (appointmentsRes.success) setAppointments(appointmentsRes.appointments || []);
      if (paymentsRes.success) setPayments(paymentsRes.payments || []);
      if (labBookingsRes.success) setLabBookings(labBookingsRes.bookings || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch patient records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const ownerMatches = (item: any) => recordOwner === 'all' || getRecordOwnerKey(item) === recordOwner;

  const filteredRecords = useMemo(() => medicalRecords.filter((record) => {
    const providerName = record.providerId?.userId?.name || '';
    const receiver = getServiceReceiver(record);
    return ownerMatches(record) && [providerName, receiver.name, receiver.relation, record.diagnosis, record.prescription, record.remarks]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
  }), [medicalRecords, normalizedQuery, recordOwner]);

  const filteredAppointments = useMemo(() => appointments.filter((appointment) => {
    const providerName = appointment.providerId?.userId?.name || '';
    const receiver = getServiceReceiver(appointment);
    return ownerMatches(appointment) && [providerName, receiver.name, receiver.relation, appointment.providerId?.category, appointment.reason, appointment.status]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
  }), [appointments, normalizedQuery, recordOwner]);

  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const providerName = payment.providerId?.userId?.name || '';
    const ownerSource = payment.appointmentId || payment;
    const receiver = getServiceReceiver(ownerSource);
    return ownerMatches(ownerSource) && [providerName, receiver.name, receiver.relation, payment.transactionId, payment.status, payment.appointmentId?.reason]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
  }), [payments, normalizedQuery, recordOwner]);

  const filteredLabBookings = useMemo(() => labBookings.filter((booking) => {
    const labName = booking.assignedLabProviderId?.labName || booking.assignedLabProviderId?.userId?.name || '';
    const tests = (booking.selectedTests || booking.tests || []).map((test: any) => test.testName).join(' ');
    const receiver = getServiceReceiver(booking);
    return ownerMatches(booking) && [labName, receiver.name, receiver.relation, tests, booking.status, booking.city, booking.address]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
  }), [labBookings, normalizedQuery, recordOwner]);

  const medicalLabReports = useMemo(() => filteredLabBookings.flatMap((booking) => {
    const reports = getLabBookingReportFiles(booking);
    const testNames = (booking.selectedTests || booking.tests || []).map((test: any) => test.testName).filter(Boolean);
    const labName = booking.assignedLabProviderId?.labName || booking.assignedLabProviderId?.userId?.name || 'Lab';

    return reports.map((report: any, index: number) => ({
      ...report,
      key: `${booking._id}-${report.url || index}`,
      booking,
      labName,
      testNames,
      name: report.name || booking.reportName || `Lab report ${index + 1}`,
      label: report.label || 'Lab Report',
      uploadedAt: report.uploadedAt || booking.reportUploadedAt || booking.reportReadyAt,
    }));
  }), [filteredLabBookings]);

  const labReportCount = useMemo(() => labBookings.reduce((count, booking) => {
    const reports = getLabBookingReportFiles(booking);
    return count + reports.length;
  }, 0), [labBookings]);

  const completedPaymentsTotal = payments.reduce((sum, payment) => (
    payment.status === 'completed' ? sum + (Number(payment.totalAmount) || 0) : sum
  ), 0);

  const handleDownload = () => {
    toast({
      title: 'Download Started',
      description: 'Your record download will begin shortly.',
    });
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      portalName="Patient Records"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="font-display text-2xl font-bold">Patient Records</h2>
              <p className="text-muted-foreground">Medical records, appointment history, lab bookings, and transactions</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid gap-4 md:grid-cols-4"
          >
            <div className="card-healthcare p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Medical Records</p>
                  <p className="font-display text-2xl font-bold">{medicalRecords.length + labReportCount}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="card-healthcare p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Appointments</p>
                  <p className="font-display text-2xl font-bold">{appointments.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-secondary" />
              </div>
            </div>
            <div className="card-healthcare p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lab Bookings</p>
                  <p className="font-display text-2xl font-bold">{labBookings.length}</p>
                </div>
                <FlaskConical className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="card-healthcare p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="font-display text-2xl font-bold">{formatCurrency(completedPaymentsTotal)}</p>
                </div>
                <IndianRupee className="w-8 h-8 text-secondary" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-healthcare space-y-4 p-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search records, appointments, lab bookings, transactions..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={recordOwner === 'all' ? 'default' : 'outline'} onClick={() => setRecordOwner('all')}>
                All Records
              </Button>
              <Button size="sm" variant={recordOwner === 'self' ? 'default' : 'outline'} onClick={() => setRecordOwner('self')}>
                My Records
              </Button>
              {familyMembers.map((member) => (
                <Button key={member.id} size="sm" variant={recordOwner === member.id ? 'default' : 'outline'} onClick={() => setRecordOwner(member.id)}>
                  {member.relation || member.name} Records
                </Button>
              ))}
            </div>
          </motion.div>

          <Tabs defaultValue="medical" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="lab">Lab Tests</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="medical" className="space-y-6">
              <div className="relative">
                <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {medicalLabReports.map((report, index) => {
                    const isGeneratedReport = report.generated || String(report.url || '').startsWith('/api/');
                    return (
                    <motion.div
                      key={report.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="relative pl-14 md:pl-20"
                    >
                      <div className="absolute left-4 md:left-6 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                      <div className="card-healthcare p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {formatDate(report.uploadedAt)}
                              <Badge variant="outline">Lab Report</Badge>
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{report.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <FlaskConical className="w-4 h-4" />
                              {report.labName}
                            </div>
                            <div className="p-3 rounded-xl bg-muted/50">
                              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <ClipboardList className="w-4 h-4 text-primary" />
                                Tests
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {report.testNames.join(', ') || 'Lab tests'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 md:flex-col">
                            {isGeneratedReport ? (
                              <>
                                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, report.name)}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View {report.label}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, report.name, true)}>
                                  <Download className="w-4 h-4 mr-1" />
                                  Download {report.label}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, report.name)}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View {report.label}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, report.name, true)}>
                                  <Download className="w-4 h-4 mr-1" />
                                  Download {report.label}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                  })}

                  {filteredRecords.map((record, index) => (
                      <motion.div
                        key={record._id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * (medicalLabReports.length + index) }}
                        className="relative pl-14 md:pl-20"
                      >
                        <div className="absolute left-4 md:left-6 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                        <div className="card-healthcare p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Clock className="w-4 h-4" />
                                {formatDate(record.appointmentId?.date || record.createdAt)}
                              </div>
                              <h3 className="font-semibold text-lg mb-1">{record.diagnosis || 'Medical Record'}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                <Stethoscope className="w-4 h-4" />
                                {record.providerId?.userId?.name || 'Provider'}
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="p-3 rounded-xl bg-muted/50">
                                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                    <Pill className="w-4 h-4 text-primary" />
                                    Prescription
                                  </div>
                                  <p className="text-sm text-muted-foreground">{record.prescription || 'No prescription'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/50">
                                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                    <ClipboardList className="w-4 h-4 text-secondary" />
                                    Remarks
                                  </div>
                                  <p className="text-sm text-muted-foreground">{record.remarks || 'No remarks'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 md:flex-col">
                              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button variant="outline" size="sm" onClick={handleDownload}>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  ))}

                  {filteredRecords.length === 0 && medicalLabReports.length === 0 && (
                    <EmptyState icon={FileText} title="No medical records found" description="Provider notes and prescriptions will appear here after completed appointments." />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appointments" className="space-y-4">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment._id || index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                    className="card-healthcare p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{appointment.providerId?.userId?.name || 'Provider'}</h3>
                          <p className="text-sm text-muted-foreground">{appointment.providerId?.category || 'Healthcare Provider'}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Patient: {getReceiverLabel(appointment, user?.name || 'Myself')}</p>
                          <p className="text-sm mt-2">{appointment.reason}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(appointment.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(appointment.timeSlot)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:flex-col md:items-end">
                        <Badge variant="outline" className={`capitalize ${statusClass(appointment.status)}`}>
                          {appointment.status || 'unknown'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={Calendar} title="No appointments found" description="Your appointment history will appear here." />
              )}
            </TabsContent>

            <TabsContent value="lab" className="space-y-4">
              {filteredLabBookings.length > 0 ? (
                filteredLabBookings.map((booking, index) => (
                  <motion.div
                    key={booking._id || index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                    className="card-healthcare p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FlaskConical className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {(booking.selectedTests || booking.tests || []).map((test: any) => test.testName).join(', ') || 'Lab tests'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.assignedLabProviderId?.labName || booking.assignedLabProviderId?.userId?.name || 'Admin assignment pending'}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">Patient: {getReceiverLabel(booking, user?.name || 'Myself')}</p>
                          <p className="text-sm mt-2">
                            {(booking.selectedTests || booking.tests || []).map((test: any) => test.testName).join(', ')}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(booking.preferredDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {booking.preferredTimeSlot}
                            </span>
                            <span>{formatCurrency(booking.totalSellingPrice)}</span>
                          </div>
                          <ReportActions booking={booking} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                        <Badge variant="outline" className={`capitalize ${statusClass(booking.status)}`}>
                          {String(booking.status || 'unknown').replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          Report {booking.reportStatus || ((booking.reportFiles?.length || booking.reports?.length) ? 'uploaded' : 'pending')}
                        </Badge>
                      </div>
                    </div>
                    <LabBookingTimeline booking={booking} />
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={FlaskConical} title="No lab bookings found" description="Your lab test booking status timeline will appear here." />
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment, index) => (
                  <motion.div
                    key={payment._id || index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                    className="card-healthcare p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                          <CreditCard className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{formatCurrency(payment.totalAmount)}</h3>
                          <p className="text-sm text-muted-foreground">{payment.providerId?.userId?.name || 'Provider'}</p>
                          <p className="text-sm mt-2">{payment.appointmentId?.reason || payment.appointmentId?.bookingDetails?.reason || 'Appointment payment'}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(payment.createdAt)}
                            </span>
                            {payment.transactionId && (
                              <span>Txn: {payment.transactionId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:flex-col md:items-end">
                        <Badge variant="outline" className={`capitalize ${statusClass(payment.status)}`}>
                          {payment.status || 'unknown'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={ReceiptText} title="No transactions found" description="Payment history will appear here after bookings." />
              )}
            </TabsContent>
          </Tabs>

          <RecordDialog record={selectedRecord} onClose={() => setSelectedRecord(null)} onDownload={handleDownload} />
          <AppointmentDialog appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} />
          <PaymentDialog payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
        </>
      )}
    </DashboardLayout>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="card-healthcare p-12 text-center">
      <Icon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function ReportActions({ booking }: { booking: any }) {
  const reports = getLabBookingReportFiles(booking);
  const hasGeneratedReport = !!(booking.reportResults?.length || booking.resultAttachmentUrl || booking.summaryAttachmentUrl);

  if (!reports.length && !hasGeneratedReport) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Report pending
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {hasGeneratedReport && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
          <span className="max-w-[140px] truncate text-sm font-medium sm:max-w-[220px]">{booking.generatedReportId || 'Generated lab report'}</span>
          <Button variant="outline" size="sm" onClick={() => window.open(`/lab-bookings/${booking._id}/generated-report`, '_blank')}>
            <Eye className="w-4 h-4 mr-1" />
            View Generated Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => openGeneratedLabBookingReportPdf(booking._id, booking.generatedReportId || 'Lab report', true)}>
            <Download className="w-4 h-4 mr-1" />
            Download PDF
          </Button>
        </div>
      )}
      {reports.map((report: any, index: number) => {
        const name = report.name || booking.reportName || `Lab report ${index + 1}`;
        const label = report.label || 'Lab Report';
        const isGeneratedReport = report.generated || String(report.url || '').startsWith('/api/');
        return (
          <div key={report.url || index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
            <span className="max-w-[140px] truncate text-sm font-medium sm:max-w-[220px]">{name}</span>
            {isGeneratedReport ? (
              <>
                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, name)}>
                  <Eye className="w-4 h-4 mr-1" />
                  View {label}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, name, true)}>
                  <Download className="w-4 h-4 mr-1" />
                  Download {label}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, name)}>
                  <Eye className="w-4 h-4 mr-1" />
                  View {label}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openLabReportPdf(report.url, name, true)}>
                  <Download className="w-4 h-4 mr-1" />
                  Download {label}
                </Button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LabBookingTimeline({ booking }: { booking: any }) {
  const steps = [
    { status: 'pending_admin_approval', label: 'Pending Admin Approval' },
    { status: 'assigned_to_lab', label: 'Assigned to Lab' },
    { status: 'sample_collected', label: 'Sample Collection' },
    { status: 'report_ready', label: 'Report Ready' },
    { status: 'completed', label: 'Completed' },
  ];
  const history = booking.statusHistory || [];
  const currentIndex = steps.findIndex((step) => step.status === booking.status);

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const historyItem = history.find((item: any) => item.status === step.status);
          const active = currentIndex >= index || !!historyItem;
          return (
            <div key={step.status} className="flex gap-2 md:block">
              <div className={`h-3 w-3 rounded-full md:mb-2 ${active ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
              {historyItem?.changedAt && (
                <p className="text-xs text-muted-foreground">{formatDate(historyItem.changedAt)}</p>
              )}
            </div>
          );
        })}
      </div>
      {(booking.adminRejectionReason || booking.labRejectionReason) && (
        <p className="mt-4 text-sm text-destructive">
          {booking.adminRejectionReason || booking.labRejectionReason}
        </p>
      )}
    </div>
  );
}

function RecordDialog({ record, onClose, onDownload }: { record: any | null; onClose: () => void; onDownload: () => void }) {
  return (
    <Dialog open={!!record} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Medical Record Details</DialogTitle>
        </DialogHeader>
        {record && (
          <div className="space-y-4">
            <DetailHeader
              icon={FileText}
              title={record.diagnosis || 'Medical Record'}
              subtitle={`Record #${record._id?.slice(-8).toUpperCase() || 'N/A'}`}
            />
            <DetailGrid
              items={[
                ['Date', formatDate(record.appointmentId?.date || record.createdAt)],
                ['Provider', record.providerId?.userId?.name || 'Provider'],
                ['Time', formatTime(record.appointmentId?.timeSlot)],
                ['Status', 'Completed'],
              ]}
            />
            <DetailSection title="Diagnosis" icon={ClipboardList}>
              <p className="text-sm">{record.diagnosis || 'Not specified'}</p>
            </DetailSection>
            <DetailSection title="Prescription" icon={Pill}>
              <p className="text-sm whitespace-pre-wrap">{record.prescription || 'No prescription provided'}</p>
            </DetailSection>
            <DetailSection title="Clinical Notes" icon={ClipboardList}>
              <p className="text-sm whitespace-pre-wrap">{record.remarks || 'No clinical notes provided'}</p>
            </DetailSection>
            <Button className="w-full" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AppointmentDialog({ appointment, onClose }: { appointment: any | null; onClose: () => void }) {
  return (
    <Dialog open={!!appointment} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Appointment Details</DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4">
            <DetailHeader
              icon={Calendar}
              title={appointment.providerId?.userId?.name || 'Provider'}
              subtitle={appointment.providerId?.category || 'Healthcare Provider'}
            />
            <DetailGrid
              items={[
                ['Date', formatDate(appointment.date)],
                ['Time', formatTime(appointment.timeSlot)],
                ['Status', appointment.status || 'N/A'],
                ['Booked On', formatDate(appointment.createdAt)],
                ['Completed On', formatDate(appointment.completedAt)],
                ['Cancelled On', formatDate(appointment.cancelledAt)],
              ]}
            />
            <DetailSection title="Reason" icon={ClipboardList}>
              <p className="text-sm">{appointment.reason || 'Not specified'}</p>
            </DetailSection>
            {appointment.notes && (
              <DetailSection title="Notes" icon={FileText}>
                <p className="text-sm whitespace-pre-wrap">{appointment.notes}</p>
              </DetailSection>
            )}
            {appointment.cancellationReason && (
              <DetailSection title="Cancellation Reason" icon={FileText}>
                <p className="text-sm whitespace-pre-wrap">{appointment.cancellationReason}</p>
              </DetailSection>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ payment, onClose }: { payment: any | null; onClose: () => void }) {
  return (
    <Dialog open={!!payment} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Transaction Details</DialogTitle>
        </DialogHeader>
        {payment && (
          <div className="space-y-4">
            <DetailHeader
              icon={ReceiptText}
              title={formatCurrency(payment.totalAmount)}
              subtitle={`Transaction #${payment._id?.slice(-8).toUpperCase() || 'N/A'}`}
            />
            <DetailGrid
              items={[
                ['Status', payment.status || 'N/A'],
                ['Paid On', formatDate(payment.createdAt)],
                ['Provider', payment.providerId?.userId?.name || 'Provider'],
                ['Transaction ID', payment.transactionId || 'N/A'],
                ['Appointment Date', formatDate(payment.appointmentId?.date || payment.bookingDetails?.date)],
                ['Appointment Time', formatTime(payment.appointmentId?.timeSlot || payment.bookingDetails?.timeSlot)],
              ]}
            />
            <DetailSection title="Payment For" icon={ClipboardList}>
              <p className="text-sm">
                {payment.appointmentId?.reason || payment.bookingDetails?.reason || 'Booking payment'}
              </p>
            </DetailSection>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-5 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="card-healthcare p-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="p-3 bg-muted/40 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="font-medium capitalize break-words">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="card-healthcare p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-primary">
        <Icon className="w-5 h-5" />
        {title}
      </h4>
      <div className="p-4 bg-muted/40 rounded-lg">{children}</div>
    </div>
  );
}
