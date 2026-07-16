import { useEffect, useState } from 'react';
import { Ambulance, CheckCircle2, Loader2, MapPin, Navigation, XCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { acceptAmbulanceRequest, getAssignedAmbulanceRequests, rejectAmbulanceRequest, updateAmbulanceStatus } from '@/services/ambulance.service';

const nextStatuses = ['driver_on_way', 'reached_pickup', 'patient_picked', 'patient_dropped', 'completed'];
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'N/A';
const formatCurrency = (value?: number) => `Rs. ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const getMapsRouteUrl = (pickup?: any, drop?: any) => {
  if (!pickup?.address || !drop?.address) return '';
  const origin = pickup.latitude && pickup.longitude ? `${pickup.latitude},${pickup.longitude}` : pickup.address;
  const destination = drop.latitude && drop.longitude ? `${drop.latitude},${drop.longitude}` : drop.address;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
};

export default function ProviderAmbulanceRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusInputs, setStatusInputs] = useState<Record<string, string>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await getAssignedAmbulanceRequests();
      setRequests(response.requests || []);
    } catch (error: any) {
      toast({ title: 'Unable to load ambulance requests', description: error?.response?.data?.message || error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (id: string) => {
    await acceptAmbulanceRequest(id);
    toast({ title: 'Ambulance request accepted' });
    loadRequests();
  };

  const rejectRequest = async (id: string) => {
    const reason = rejectReasons[id]?.trim();
    if (!reason) {
      toast({ title: 'Enter rejection reason', variant: 'destructive' });
      return;
    }
    await rejectAmbulanceRequest(id, reason);
    toast({ title: 'Ambulance request rejected' });
    loadRequests();
  };

  const updateStatus = async (id: string) => {
    const status = statusInputs[id];
    if (!status) {
      toast({ title: 'Select status', variant: 'destructive' });
      return;
    }
    await updateAmbulanceStatus(id, status);
    toast({ title: 'Trip status updated' });
    loadRequests();
  };

  return (
    <DashboardLayout sidebarLinks={getProviderSidebarLinks(user)} portalName="Ambulance Requests" userName={user?.name || 'Provider'} userInitial={user?.name?.charAt(0) || 'P'}>
      <div>
        <h2 className="font-display text-2xl font-bold">Assigned Ambulance Requests</h2>
        <p className="text-muted-foreground">Accept requests and update driver trip status.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : requests.length === 0 ? (
        <div className="card-healthcare p-10 text-center text-muted-foreground">No assigned ambulance requests.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const routeUrl = getMapsRouteUrl(request.pickupLocation, request.dropLocation);
            return (
              <div key={request._id} className="card-healthcare p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge className="capitalize">{request.status.replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline" className="capitalize">{String(request.paymentStage || 'advance_pending').replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline">{request.requestType}</Badge>
                      <Badge variant="outline">{request.ambulanceType}</Badge>
                    </div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <Ambulance className="h-5 w-5 text-primary" />
                      {request.patientId?.name || 'Patient'}
                    </h3>
                    <p className="text-sm text-muted-foreground">{request.contactNumber}</p>
                    <p className="mt-3 text-sm">{request.patientCondition}</p>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Pickup: {request.pickupLocation?.address}</span>
                      <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Drop: {request.dropLocation?.address}</span>
                      <span>{formatDate(request.preferredDateTime)}</span>
                      <span>Distance: {Number(request.totalDistance || 0).toFixed(1)} KM</span>
                      <span>Total: {formatCurrency(request.estimatedAmount || request.grossAmount)} | Advance: {formatCurrency(request.advanceAmount)} | Remaining: {formatCurrency(request.remainingAmount)}</span>
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

                  <div className="space-y-2">
                    {request.status === 'assigned_to_provider' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={() => acceptRequest(request._id)}><CheckCircle2 className="mr-1 h-4 w-4" /> Accept</Button>
                          <Button variant="outline" className="text-destructive" onClick={() => rejectRequest(request._id)}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                        </div>
                        <Input placeholder="Reject reason" value={rejectReasons[request._id] || ''} onChange={(e) => setRejectReasons((current) => ({ ...current, [request._id]: e.target.value }))} />
                      </>
                    )}
                    {request.status !== 'assigned_to_provider' && request.status !== 'completed' && !request.status.includes('rejected') && (
                      <>
                        <Select value={statusInputs[request._id] || ''} onValueChange={(value) => setStatusInputs((current) => ({ ...current, [request._id]: value }))}>
                          <SelectTrigger><SelectValue placeholder="Update trip status" /></SelectTrigger>
                          <SelectContent>
                            {nextStatuses
                              .filter((status) => status !== 'completed' || request.paymentStage === 'fully_paid')
                              .map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button className="w-full" onClick={() => updateStatus(request._id)}>Update Status</Button>
                        {request.status === 'patient_dropped' && request.paymentStage !== 'fully_paid' && (
                          <p className="text-xs text-muted-foreground">Completion unlocks after patient pays the remaining 50%.</p>
                        )}
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
