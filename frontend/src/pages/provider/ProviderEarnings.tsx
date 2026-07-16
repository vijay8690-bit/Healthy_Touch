import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Wallet,
  Send,
  Calendar,
  RefreshCcw,
  LayoutDashboard,
  Users,
  FileText,
  User,
  IndianRupee,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { useToast } from '@/hooks/use-toast';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useAuth } from '@/contexts/AuthContext';
import { providerEarningsService, providerPaymentsService, providerWithdrawalService } from '@/services/payout.service';
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
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProviderEarnings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { count: notificationCount } = useNotificationCount();
  const [loading, setLoading] = useState(true);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    accountHolderName: '',
    bankAccountNumber: '',
    ifscCode: '',
    upiId: '',
  });

  useEffect(() => {
    fetchEarnings();
  }, []);

  useEffect(() => {
    if (!summary) return;
    fetchPaymentHistory();
  }, [summary, statusFilter]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await providerEarningsService.getMyEarnings();
      if (response.success) {
        setSummary(response.summary);
      }
      await fetchWithdrawals();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch earnings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    const response = await providerWithdrawalService.getWithdrawals();
    if (response.success) {
      setWallet(response.wallet);
      setWithdrawals(response.withdrawals || []);
    }
  };

  const handleWithdrawalSubmit = async () => {
    try {
      setWithdrawalSubmitting(true);
      const response = await providerWithdrawalService.createWithdrawal({
        amount: Number(withdrawalForm.amount),
        accountHolderName: withdrawalForm.accountHolderName,
        bankAccountNumber: withdrawalForm.bankAccountNumber,
        ifscCode: withdrawalForm.ifscCode,
        upiId: withdrawalForm.upiId || undefined,
      });

      if (response.success) {
        setWallet(response.wallet);
        await fetchWithdrawals();
        setWithdrawalOpen(false);
        setWithdrawalForm({
          amount: '',
          accountHolderName: '',
          bankAccountNumber: '',
          ifscCode: '',
          upiId: '',
        });
        toast({
          title: 'Withdrawal requested',
          description: response.message || 'Your request has been sent to admin.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Request failed',
        description: error.response?.data?.message || 'Failed to submit withdrawal request',
        variant: 'destructive',
      });
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setPaymentHistoryLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter.toUpperCase() } : {};
      const response = await providerPaymentsService.getPayments(params);
      if (response.success) {
        setPaymentHistory(response.payments || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch payment history',
        variant: 'destructive',
      });
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole="provider"
      sidebarLinks={getProviderSidebarLinks(user)}
      userName="Provider"
      notificationCount={notificationCount}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold">My Earnings</h1>
          <p className="text-muted-foreground">Track your payments and earnings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-xs text-muted-foreground">Ready to withdraw</p>
              </div>
            </div>
            <p className="text-3xl font-bold">Rs. {wallet?.availableBalance?.toFixed(2) || '0.00'}</p>
          </div>

          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Withdrawal</p>
                <p className="text-xs text-muted-foreground">Blocked until admin action</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-600">Rs. {wallet?.pendingWithdrawal?.toFixed(2) || '0.00'}</p>
          </div>

          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                <p className="text-xs text-muted-foreground">Marked paid by admin</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">Rs. {wallet?.totalWithdrawn?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setWithdrawalOpen(true)} disabled={(wallet?.availableBalance || 0) < 1000}>
            <Send className="w-4 h-4 mr-2" />
            Request Withdrawal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Earnings</p>
                <p className="text-xs text-muted-foreground">Awaiting admin release</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-600">
              ₹{summary?.pending?.net?.toFixed(2) || '0.00'}
            </p>
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Payments</span>
                <span>{summary?.pending?.count || 0}</span>
              </div>
            </div>
          </div>

          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Earnings</p>
                <p className="text-xs text-muted-foreground">Released by admin</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">
              ₹{summary?.paid?.net?.toFixed(2) || '0.00'}
            </p>
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Payments</span>
                <span>{summary?.paid?.count || 0}</span>
              </div>
            </div>
          </div>

          <div className="card-healthcare p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </div>
            <p className="text-3xl font-bold">
              ₹{summary?.total?.net?.toFixed(2) || '0.00'}
            </p>
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total Payments</span>
                <span>{summary?.total?.count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-healthcare">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Withdrawal History</h3>
            <Button variant="outline" size="sm" onClick={fetchWithdrawals}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Admin Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No withdrawal requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal._id}>
                      <TableCell>{new Date(withdrawal.requestedAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-semibold">Rs. {Number(withdrawal.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.accountHolderName}</p>
                          <p className="text-xs text-muted-foreground">
                            ****{String(withdrawal.bankAccountNumber || '').slice(-4)} | {withdrawal.ifscCode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted capitalize">
                          {withdrawal.status}
                        </span>
                      </TableCell>
                      <TableCell>{withdrawal.transactionId || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{withdrawal.adminNote || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="card-healthcare p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900">Weekly Payout Schedule</h4>
              <p className="text-sm text-blue-700 mt-1">
                Earnings are released by admin every week. Minimum payout amount is ₹1,000.
                GST is automatically deducted from your earnings as per current tax rates.
              </p>
            </div>
          </div>
        </div>

        <div className="card-healthcare">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Payment History</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPaymentHistory}
                disabled={paymentHistoryLoading}
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${paymentHistoryLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Released On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {paymentHistoryLoading ? 'Loading...' : 'No payment history found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentHistory.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>
                        {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.patientId?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.patientId?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {payment.appointmentId?.date
                              ? new Date(payment.appointmentId.date).toLocaleDateString('en-IN')
                              : '-'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.appointmentId?.timeSlot}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{payment.netAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'PAID'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {payment.releasedOn
                          ? new Date(payment.releasedOn).toLocaleDateString('en-IN')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
              <DialogDescription>
                Minimum withdrawal is Rs. 1000. This creates a manual admin approval request.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawalAmount">Amount</Label>
                <Input
                  id="withdrawalAmount"
                  type="number"
                  min="1000"
                  max={wallet?.availableBalance || undefined}
                  value={withdrawalForm.amount}
                  onChange={(event) => setWithdrawalForm({ ...withdrawalForm, amount: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Available: Rs. {wallet?.availableBalance?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  value={withdrawalForm.accountHolderName}
                  onChange={(event) => setWithdrawalForm({ ...withdrawalForm, accountHolderName: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  inputMode="numeric"
                  value={withdrawalForm.bankAccountNumber}
                  onChange={(event) => setWithdrawalForm({ ...withdrawalForm, bankAccountNumber: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  value={withdrawalForm.ifscCode}
                  onChange={(event) => setWithdrawalForm({ ...withdrawalForm, ifscCode: event.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID Optional</Label>
                <Input
                  id="upiId"
                  value={withdrawalForm.upiId}
                  onChange={(event) => setWithdrawalForm({ ...withdrawalForm, upiId: event.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleWithdrawalSubmit} disabled={withdrawalSubmitting}>
                {withdrawalSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
