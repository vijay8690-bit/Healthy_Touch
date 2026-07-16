import { useEffect, useState } from 'react';
import { CheckCircle, CreditCard, Loader2, RefreshCcw, XCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminSidebarLinks } from '@/components/layout/AdminSidebarLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { payoutService } from '@/services/payout.service';

type AdminAction = 'approve' | 'reject' | 'paid';

export default function AdminWithdrawalRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [action, setAction] = useState<AdminAction | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await payoutService.getWithdrawals({
        status: statusFilter,
        limit: 100,
      });
      if (response.success) {
        setWithdrawals(response.withdrawals || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch withdrawal requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openAction = (request: any, nextAction: AdminAction) => {
    setSelectedRequest(request);
    setAction(nextAction);
    setAdminNote('');
    setTransactionId('');
  };

  const closeAction = () => {
    setSelectedRequest(null);
    setAction(null);
    setAdminNote('');
    setTransactionId('');
  };

  const submitAction = async () => {
    if (!selectedRequest || !action) return;

    try {
      setSaving(true);
      if (action === 'approve') {
        await payoutService.approveWithdrawal(selectedRequest._id, { adminNote });
      } else if (action === 'reject') {
        await payoutService.rejectWithdrawal(selectedRequest._id, { adminNote });
      } else {
        await payoutService.markWithdrawalPaid(selectedRequest._id, { adminNote, transactionId });
      }

      toast({
        title: 'Withdrawal updated',
        description: 'The request status has been updated.',
      });
      closeAction();
      await fetchWithdrawals();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.response?.data?.message || 'Failed to update withdrawal request',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const actionTitle = action === 'approve'
    ? 'Approve Withdrawal'
    : action === 'reject'
      ? 'Reject Withdrawal'
      : 'Mark Withdrawal Paid';

  return (
    <DashboardLayout
      sidebarLinks={adminSidebarLinks}
      portalName="Withdrawal Requests"
      userName={user?.name || 'Admin'}
      userInitial={user?.name?.charAt(0) || 'A'}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Withdrawal Requests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review provider withdrawal requests and manually record payout status.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchWithdrawals}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Loading withdrawal requests...
                    </TableCell>
                  </TableRow>
                ) : withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No withdrawal requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.userId?.name || 'Provider'}</p>
                          <p className="text-xs text-muted-foreground">{request.userId?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(request.requestedAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-semibold">Rs. {Number(request.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.accountHolderName}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.bankAccountNumber} | {request.ifscCode}
                          </p>
                          {request.upiId && <p className="text-xs text-muted-foreground">UPI: {request.upiId}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium capitalize">
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell>{request.transactionId || '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {request.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openAction(request, 'approve')}>
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAction(request, 'reject')}>
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          )}
                          {request.status === 'approved' && (
                            <>
                              <Button size="sm" onClick={() => openAction(request, 'paid')}>
                                <CreditCard className="mr-1 h-4 w-4" />
                                Mark Paid
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAction(request, 'reject')}>
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
            <DialogDescription>
              {selectedRequest
                ? `Request amount: Rs. ${Number(selectedRequest.amount || 0).toFixed(2)}`
                : 'Update withdrawal request'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {action === 'paid' && (
              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID</Label>
                <Input
                  id="transactionId"
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="adminNote">Admin Note</Label>
              <Textarea
                id="adminNote"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>
              Cancel
            </Button>
            <Button onClick={submitAction} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
