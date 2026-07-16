import { useEffect, useState } from 'react';
import { Ambulance, Calendar, CheckCircle2, LayoutDashboard, Loader2, MapPin, Navigation, Settings, Stethoscope, Users, XCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { assignAmbulanceProvider, getAdminAmbulanceRequests, rejectAmbulanceByAdmin } from '@/services/ambulance.service';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';


const statuses = ['pending_admin', 'assigned_to_provider', 'accepted_by_provider', 'driver_on_way', 'reached_pickup', 'patient_picked', 'patient_dropped', 'completed', 'rejected_by_admin', 'rejected_by_provider', 'all'];
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'N/A';
const formatCurrency = (value?: number) => `Rs. ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const getMapsRouteUrl = (pickup?: any, drop?: any) => {
  if (!pickup?.address || !drop?.address) return '';
  const origin = pickup.latitude && pickup.longitude ? `${pickup.latitude},${pickup.longitude}` : pickup.address;
  const destination = drop.latitude && drop.longitude ? `${drop.latitude},${drop.longitude}` : drop.address;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
};

export default function AdminAmbulanceRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [status, setStatus] = useState('pending_admin');
  const [selectedProviders, setSelectedProviders] = useState<Record<string, string>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    loadRequests();
  }, [status]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await getAdminAmbulanceRequests(status);
      setRequests(response.requests || []);
    } catch (error: any) {
      toast({ title: 'Unable to load ambulance requests', description: error?.response?.data?.message || error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const assignProvider = async (id: string) => {
    const providerId = selectedProviders[id];
    if (!providerId) {
      toast({ title: 'Select ambulance provider', variant: 'destructive' });
      return;
    }
    try {
      setSavingId(id);
      await assignAmbulanceProvider(id, providerId);
      toast({ title: 'Ambulance provider assigned' });
      loadRequests();
    } catch (error: any) {
      toast({ title: 'Assignment failed', description: error?.response?.data?.message || error?.message, variant: 'destructive' });
    } finally {
      setSavingId('');
    }
  };

  const rejectRequest = async (id: string) => {
    const reason = rejectReasons[id]?.trim();
    if (!reason) {
      toast({ title: 'Enter rejection reason', variant: 'destructive' });
      return;
    }
    try {
      setSavingId(id);
      await rejectAmbulanceByAdmin(id, reason);
      toast({ title: 'Ambulance request rejected' });
      loadRequests();
    } catch (error: any) {
      toast({ title: 'Reject failed', description: error?.response?.data?.message || error?.message, variant: 'destructive' });
    } finally {
      setSavingId('');
    }
  };

  return (
    <DashboardLayout sidebarLinks={sidebarLinks} portalName="Ambulance Requests" userName={user?.name || 'Admin'} userInitial={user?.name?.charAt(0) || 'A'}>
      <div>
        <h2 className="font-display text-2xl font-bold">Ambulance Requests</h2>
        <p className="text-muted-foreground">Review pickup/drop location and assign nearby ambulance providers.</p>
      </div>

      <div className="card-healthcare p-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statuses.map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : requests.length === 0 ? (
        <div className="card-healthcare p-10 text-center text-muted-foreground">No ambulance requests found.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const canAct = request.status === 'pending_admin' && ['advance_paid', 'fully_paid'].includes(request.paymentStage);
            const routeUrl = getMapsRouteUrl(request.pickupLocation, request.dropLocation);
            return (
              <div key={request._id} className="card-healthcare p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge className="capitalize">{request.status.replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline" className="capitalize">{String(request.paymentStage || 'advance_pending').replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline">{request.requestType}</Badge>
                      <Badge variant="outline">{request.ambulanceType}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{request.patientId?.name || 'Patient'}</h3>
                    <p className="text-sm text-muted-foreground">{request.contactNumber}</p>
                    <p className="mt-3 text-sm">{request.patientCondition}</p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Pickup: {request.pickupLocation?.address}</span>
                      <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Drop: {request.dropLocation?.address}</span>
                      <span>{formatDate(request.preferredDateTime)}</span>
                      <span>Distance: {Number(request.totalDistance || 0).toFixed(1)} KM</span>
                      <span>Estimated Total: {formatCurrency(request.estimatedAmount || request.grossAmount)}</span>
                      <span>Advance: {formatCurrency(request.advanceAmount)} | Remaining: {formatCurrency(request.remainingAmount)}</span>
                      {routeUrl && (
                        <a
                          href={routeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                        >
                          <Navigation className="h-4 w-4" />
                          Open pickup to drop route
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Nearby ambulance providers</p>
                    <Select value={selectedProviders[request._id] || ''} onValueChange={(value) => setSelectedProviders((current) => ({ ...current, [request._id]: value }))} disabled={!canAct}>
                      <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                      <SelectContent>
                        {(request.nearbyProviders || []).map((provider: any) => (
                          <SelectItem key={provider._id} value={provider._id}>
                            {(provider.userId?.name || provider.vehicleNumber || 'Ambulance')} {provider.distanceKm != null ? `- ${provider.distanceKm.toFixed(1)} km` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="w-full" onClick={() => assignProvider(request._id)} disabled={!canAct || savingId === request._id}>
                      {savingId === request._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Assign Provider
                    </Button>
                    {request.status === 'pending_admin' && request.paymentStage === 'advance_pending' && (
                      <p className="text-xs text-muted-foreground">Waiting for patient 50% advance payment.</p>
                    )}
                    {canAct && (
                      <>
                        <Input placeholder="Reject reason" value={rejectReasons[request._id] || ''} onChange={(e) => setRejectReasons((current) => ({ ...current, [request._id]: e.target.value }))} />
                        <Button variant="outline" className="w-full text-destructive" onClick={() => rejectRequest(request._id)}>
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </>
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
