import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Download, Eye, FileText, Loader2, MapPin, XCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { assignLabBookingProvider, getAdminLabBookings, openGeneratedLabBookingReportPdf, openLabReportPdf, rejectLabBookingByAdmin } from '@/services/labTest.service';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';


const statusOptions = [
  'all',
  'pending_admin_approval',
  'assigned_to_lab',
  'lab_accepted',
  'sample_collected',
  'report_ready',
  'completed',
  'rejected_by_admin',
  'lab_rejected',
];

const formatCurrency = (value?: number) => `Rs. ${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN') : 'N/A';
const toDistance = (value?: number | string | null) => {
  const distance = Number(value);
  return Number.isFinite(distance) ? distance : null;
};
const formatDistance = (value?: number | string | null) => {
  const distance = toDistance(value);
  return distance == null ? 'Distance N/A' : `${distance.toFixed(1)} km`;
};
const sortProvidersByDistance = (providers: any[]) => [...providers].sort((a, b) => {
  const firstDistance = toDistance(a.distanceKm);
  const secondDistance = toDistance(b.distanceKm);
  if (firstDistance == null && secondDistance == null) {
    return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
  }
  if (firstDistance == null) return 1;
  if (secondDistance == null) return -1;
  return firstDistance - secondDistance;
});
const getLabBookingReportFiles = (booking: any) => {
  if (booking.mainReportPdfUrl) {
    return [{
      url: booking.mainReportPdfUrl,
      name: booking.mainReportPdfName || booking.reportName || 'Lab Report',
      label: 'Lab Report',
    }];
  }
  if (booking.reportUrl) return [{ url: booking.reportUrl, name: booking.reportName || 'Lab Report', label: 'Lab Report' }];
  return booking.reportFiles?.length ? booking.reportFiles : booking.reports || [];
};

export default function AdminLabBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [selectedProviders, setSelectedProviders] = useState<Record<string, string>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, [status]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await getAdminLabBookings(status);
      setBookings(response.bookings || []);
    } catch (error: any) {
      toast({
        title: 'Unable to load lab bookings',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending_admin_approval').length,
    [bookings]
  );

  const assignProvider = async (bookingId: string) => {
    const providerId = selectedProviders[bookingId];
    if (!providerId) {
      toast({ title: 'Select a lab provider first', variant: 'destructive' });
      return;
    }

    try {
      setSavingId(bookingId);
      await assignLabBookingProvider(bookingId, providerId);
      toast({ title: 'Lab provider assigned' });
      loadBookings();
    } catch (error: any) {
      toast({
        title: 'Assignment failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingId('');
    }
  };

  const rejectBooking = async (bookingId: string) => {
    const reason = rejectReasons[bookingId]?.trim();
    if (!reason) {
      toast({ title: 'Enter rejection reason', variant: 'destructive' });
      return;
    }

    try {
      setSavingId(bookingId);
      await rejectLabBookingByAdmin(bookingId, reason);
      toast({ title: 'Lab booking rejected' });
      loadBookings();
    } catch (error: any) {
      toast({
        title: 'Reject failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingId('');
    }
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      portalName="Lab Bookings"
      userName={user?.name || 'Admin'}
      userInitial={user?.name?.charAt(0) || 'A'}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Lab Booking Requests</h2>
          <p className="text-muted-foreground">Review patient lab bookings and assign labs that can perform all selected tests.</p>
        </div>
        <Badge variant="outline">{pendingCount} pending in current view</Badge>
      </div>

      <div className="card-healthcare p-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="card-healthcare p-10 text-center text-muted-foreground">No lab bookings found.</div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const providers = sortProvidersByDistance(booking.nearbyLabProviders || []);
            const tests = booking.selectedTests || booking.tests || [];
            const canAct = booking.status === 'pending_admin_approval';
            return (
              <div key={booking._id} className="card-healthcare p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge className="capitalize">{String(booking.status).replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline">{formatCurrency(booking.totalSellingPrice)}</Badge>
                      <Badge variant="outline">{booking.collectionType === 'home' ? 'Home collection' : 'Lab visit'}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{booking.patientName}</h3>
                    <p className="text-sm text-muted-foreground">{booking.patientMobile}</p>
                    <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm">
                      <p><span className="font-medium">Booked By:</span> {booking.patientId?.name || booking.bookedByName || 'Patient'}</p>
                      <p><span className="font-medium">Service For:</span> {booking.serviceReceiver?.name || booking.patientName}</p>
                      {booking.serviceReceiver?.relation && <p><span className="font-medium">Relation:</span> {booking.serviceReceiver.relation}</p>}
                      {booking.serviceReceiver?.mobile && <p><span className="font-medium">Mobile:</span> {booking.serviceReceiver.mobile}</p>}
                      {(booking.serviceReceiver?.age || booking.serviceReceiver?.gender) && (
                        <p><span className="font-medium">Age/Gender:</span> {booking.serviceReceiver?.age || 'N/A'} / {booking.serviceReceiver?.gender || 'N/A'}</p>
                      )}
                      {booking.serviceReceiver?.medicalNotes && <p><span className="font-medium">Medical Notes:</span> {booking.serviceReceiver.medicalNotes}</p>}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDate(booking.preferredDate)}, {booking.preferredTimeSlot}</span>
                      <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {booking.address}, {booking.city}</span>
                    </div>
                    <div className="mt-4 rounded-lg bg-muted/50 p-3">
                      <p className="mb-2 text-sm font-medium">Selected tests</p>
                      <div className="flex flex-wrap gap-2">
                        {tests.map((test: any) => (
                          <Badge key={`${booking._id}-${test.testId}`} variant="outline">{test.testName}</Badge>
                        ))}
                      </div>
                    </div>
                    <AdminReportFiles booking={booking} />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Nearby labs that can perform all tests</p>
                    {providers.length > 0 ? (
                      <>
                        <Select
                          value={selectedProviders[booking._id] || ''}
                          onValueChange={(value) => setSelectedProviders((current) => ({ ...current, [booking._id]: value }))}
                          disabled={!canAct}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select lab provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.map((provider: any) => (
                              <SelectItem key={provider._id} value={provider._id}>
                                <span className="flex w-full items-center justify-between gap-3">
                                  <span className="truncate">{provider.labName || provider.userId?.name || 'Lab'}</span>
                                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                    {formatDistance(provider.distanceKm)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button className="w-full" onClick={() => assignProvider(booking._id)} disabled={!canAct || savingId === booking._id}>
                          {savingId === booking._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Accept and Assign
                        </Button>
                      </>
                    ) : (
                      <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">No eligible lab provider found for all selected tests.</p>
                    )}
                    {canAct && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Reject reason"
                          value={rejectReasons[booking._id] || ''}
                          onChange={(event) => setRejectReasons((current) => ({ ...current, [booking._id]: event.target.value }))}
                        />
                        <Button variant="outline" className="w-full text-destructive" onClick={() => rejectBooking(booking._id)} disabled={savingId === booking._id}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Booking
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

function AdminReportFiles({ booking }: { booking: any }) {
  const reports = getLabBookingReportFiles(booking);
  const hasGeneratedReport = !!(booking.reportResults?.length || booking.resultAttachmentUrl || booking.summaryAttachmentUrl);

  if (!reports.length && !hasGeneratedReport) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" />
        Uploaded report files
      </p>
      <div className="space-y-2">
        {hasGeneratedReport && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2">
            <span className="min-w-0 truncate text-sm font-medium">Generated: {booking.generatedReportId || 'Lab Report'}</span>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => window.open(`/lab-bookings/${booking._id}/generated-report`, '_blank')}>
                <Eye className="mr-1 h-4 w-4" />
                View
              </Button>
              <Button size="sm" variant="outline" onClick={() => openGeneratedLabBookingReportPdf(booking._id, booking.generatedReportId || 'Lab report', true)}>
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}
        {reports.map((report: any, index: number) => {
          const name = report.name || booking.reportName || `Lab report ${index + 1}`;
          const label = report.label || 'Report';
          return (
            <div key={report.url || index} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/70 p-2">
              <span className="min-w-0 truncate text-sm font-medium">{label}: {name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openLabReportPdf(report.url, name)}>
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => openLabReportPdf(report.url, name, true)}>
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
