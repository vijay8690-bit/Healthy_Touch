import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
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
  Download,
  Eye,
  X,
  CreditCard,
  User,
  FileText,
  DollarSign,
  Loader2,
  TrendingUp,
  Wallet,
  Shield,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api.config';
import NotificationDropdown from '@/components/NotificationDropdown';
import { useSettings } from '@/contexts/SettingsContext';
import { payoutService } from '@/services/payout.service';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';

const toAmount = (value: any) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const getPayoutPlatformFee = (payout: any) => {
  const explicitCommission = toAmount(payout.platformCommission);
  if (explicitCommission > 0) return explicitCommission;

  const derivedCommission = toAmount(payout.grossAmount) - toAmount(payout.netAmount) - toAmount(payout.gstAmount);
  return derivedCommission > 0 ? derivedCommission : 0;
};

export default function AdminProviderPayouts() {
    const { settings: publicSettings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [viewingPayout, setViewingPayout] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModeDialog, setShowPaymentModeDialog] = useState(false);
  const [selectedPayoutForPayment, setSelectedPayoutForPayment] = useState<any | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGrossAmount: 0,
    totalCommission: 0,
    totalGST: 0,
    totalNetAmount: 0,
  });
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const viewingPlatformFee = viewingPayout ? getPayoutPlatformFee(viewingPayout) : 0;

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await payoutService.getAllPayouts({});
      
      if (response.success) {
        setPayouts(response.payouts || []);
        
        // Calculate stats
        const stats = response.payouts.reduce((acc: any, payout: any) => {
          const platformFee = getPayoutPlatformFee(payout);
          return {
            totalGrossAmount: acc.totalGrossAmount + (payout.grossAmount || 0),
            totalCommission: acc.totalCommission + platformFee,
            totalGST: acc.totalGST + (payout.gstAmount || 0),
            totalNetAmount: acc.totalNetAmount + (payout.netAmount || 0),
          };
        }, { totalGrossAmount: 0, totalCommission: 0, totalGST: 0, totalNetAmount: 0 });
        
        setStats(stats);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to fetch payouts',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Fetch payouts error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch payouts',
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

  const handleViewPayout = (payout: any) => {
    setViewingPayout(payout);
    setShowViewModal(true);
  };

  const handleMarkAsPaid = (payout: any) => {
    setSelectedPayoutForPayment(payout);
    setShowPaymentModeDialog(true);
  };

  const processManualPayment = async () => {
    try {
      setProcessingPayment(true);
      const response = await payoutService.markAsPaid(selectedPayoutForPayment._id);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message || 'Payout marked as paid successfully',
        });
        setShowPaymentModeDialog(false);
        setSelectedPayoutForPayment(null);
        fetchPayouts();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to mark payout as paid',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Mark as paid error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to mark payout as paid',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const processRazorpayTestPayment = async () => {
    try {
      setProcessingPayment(true);

      // Create Razorpay order via backend
      const token = localStorage.getItem('healthytouch_token');
      const createOrderResponse = await fetch(
        `${API_BASE_URL}/admin/payouts/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payoutId: selectedPayoutForPayment._id,
            amount: selectedPayoutForPayment.netAmount,
          }),
        }
      );

      if (!createOrderResponse.ok) {
        throw new Error('Failed to create Razorpay order');
      }

      const orderData = await createOrderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Load Razorpay script
      if (!(window as any).Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const options = {
        key: (publicSettings as any)?.razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Healthy Touch',
        description: `Payout to ${selectedPayoutForPayment.providerId?.name}`,
        image: '/healthy-touch-logo.png',
        order_id: orderData.order.id,
        handler: async function (response: any) {
          // Verify payment and mark payout as paid
          try {
            const verifyResponse = await fetch(
              `${API_BASE_URL}/admin/payouts/verify-razorpay`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  payoutId: selectedPayoutForPayment._id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast({
                title: 'Payment Successful',
                description: `Payout released successfully. Payment ID: ${response.razorpay_payment_id}`,
              });
              setShowPaymentModeDialog(false);
              setSelectedPayoutForPayment(null);
              fetchPayouts();
            } else {
              toast({
                title: 'Verification Failed',
                description: verifyData.message || 'Payment verification failed',
                variant: 'destructive',
              });
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast({
              title: 'Error',
              description: 'Payment received but verification failed',
              variant: 'destructive',
            });
          } finally {
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: selectedPayoutForPayment.providerId?.name || 'Provider',
          email: selectedPayoutForPayment.providerId?.email || 'provider@healthytouch.com',
          contact: selectedPayoutForPayment.providerId?.mobile || (import.meta.env.VITE_SUPPORT_PHONE || '9887894498').trim(),
        },
        readonly: {
          email: true,
          contact: true,
        },
        theme: {
          color: '#667eea',
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            toast({
              title: 'Payment Cancelled',
              description: 'Payment was cancelled',
              variant: 'destructive',
            });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error('Razorpay payment error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
      setProcessingPayment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPayouts = payouts.filter(payout => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      payout.providerId?.name?.toLowerCase().includes(searchLower) ||
      payout.providerId?.email?.toLowerCase().includes(searchLower) ||
      payout._id.toLowerCase().includes(searchLower);
    const matchesStatus = filters.status === 'all' || payout.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const completedPayouts = filteredPayouts.filter(p => p.status === 'PAID').length;
  const pendingPayouts = filteredPayouts.filter(p => p.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* <div className="p-6 border-b flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
              H
            </div>
            <div>
              <h2 className="font-bold text-lg">Healthy Touch</h2>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div> */}

          {/* Logo */}
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b bg-card/80 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Provider Payouts</h1>
                <p className="text-sm text-muted-foreground">View and manage provider earnings</p>
              </div>
            </div>
            <NotificationDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-healthcare p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">₹{stats.totalGrossAmount.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-healthcare p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Platform Fee</p>
                  <p className="text-2xl font-bold">₹{stats.totalCommission.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Deducted fees</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-healthcare p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total GST</p>
                  <p className="text-2xl font-bold">₹{stats.totalGST.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">18% on commission</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card-healthcare p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Provider Net</p>
                  <p className="text-2xl font-bold">₹{stats.totalNetAmount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">After deductions</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card-healthcare p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold">{completedPayouts}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card-healthcare p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-3xl font-bold">{pendingPayouts}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filter
              </Button>

              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 card-healthcare p-4 space-y-2 shadow-lg"
                  >
                    <div className="font-medium mb-2">Filter by Status</div>
                    {['all', 'PENDING', 'PAID'].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setFilters({ ...filters, status });
                          setShowFilterMenu(false);
                        }}
                        className={`w-full px-3 py-2 rounded-lg text-left transition-colors
                          ${filters.status === status
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                          }`}
                      >
                        {status === 'all' ? 'All Status' : status}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Payouts Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card-healthcare overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">No payouts found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-semibold">Provider</th>
                      <th className="text-center p-4 font-semibold">Date & Time</th>
                      <th className="text-right p-4 font-semibold">Patient Payment</th>
                      <th className="text-right p-4 font-semibold">Platform Fee</th>
                      <th className="text-right p-4 font-semibold">GST</th>
                      <th className="text-right p-4 font-semibold">Provider Gets</th>
                      <th className="text-center p-4 font-semibold">Status</th>
                      <th className="text-center p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map((payout, index) => {
                      const platformFee = getPayoutPlatformFee(payout);
                      
                      return (
                        <motion.tr
                          key={payout._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                                {payout.providerId?.name?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="font-medium">{payout.providerId?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{payout.providerId?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div>
                              <p className="font-medium">{formatDate(payout.createdAt)}</p>
                              <p className="text-xs text-muted-foreground">{formatTime(payout.createdAt)}</p>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950">
                              <IndianRupee className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              <span className="font-medium text-green-700 dark:text-green-300">{payout.grossAmount?.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950">
                              <IndianRupee className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span className="font-medium text-purple-700 dark:text-purple-300">{platformFee.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">(deducted fee)</p>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950">
                              <IndianRupee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="font-medium text-amber-700 dark:text-amber-300">{payout.gstAmount?.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">(18% on comm.)</p>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950">
                              <IndianRupee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="font-bold text-blue-700 dark:text-blue-300">{payout.netAmount?.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                                ${payout.status === 'PAID'
                                  ? 'status-approved'
                                  : 'status-pending'
                                }`}
                            >
                              {payout.status === 'PAID' ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              {payout.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewPayout(payout)}
                                className="gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </Button>
                              {payout.status === 'PENDING' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleMarkAsPaid(payout)}
                                  className="gap-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Mark Paid
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && viewingPayout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-healthcare p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Payout Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Provider Info */}
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl">
                      {viewingPayout.providerId?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{viewingPayout.providerId?.name}</p>
                      <p className="text-sm text-muted-foreground">{viewingPayout.providerId?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Payment Breakdown</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div>
                        <span className="font-medium">Patient Payment (Total)</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Amount paid by patient</p>
                      </div>
                      <span className="font-bold">₹{viewingPayout.grossAmount?.toFixed(2)}</span>
                    </div>

                    <div className="h-px bg-border my-2"></div>

                    <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                      <div>
                        <span className="font-medium">Platform Fee</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Deducted from patient payment</p>
                      </div>
                      <span className="font-bold text-purple-700 dark:text-purple-300">
                        - ₹{viewingPlatformFee.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                      <div>
                        <span className="font-medium">GST on Platform Fee (18%)</span>
                        <p className="text-xs text-muted-foreground mt-0.5">18% of ₹{viewingPlatformFee.toFixed(2)} platform fee</p>
                      </div>
                      <span className="font-bold text-amber-700 dark:text-amber-300">- ₹{viewingPayout.gstAmount?.toFixed(2)}</span>
                    </div>

                    <div className="h-px bg-border my-2"></div>

                    <div className="flex justify-between items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800">
                      <div>
                        <span className="font-bold text-lg">Provider Receives</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Net amount to provider</p>
                      </div>
                      <span className="font-bold text-2xl text-blue-700 dark:text-blue-300">₹{viewingPayout.netAmount?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Additional Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          viewingPayout.status === 'PAID' ? 'status-approved' : 'status-pending'
                        }`}>
                          {viewingPayout.status}
                        </span>
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Mode</p>
                      <p className="font-medium">{viewingPayout.paymentMode || 'Not specified'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p className="font-medium">{new Date(viewingPayout.createdAt).toLocaleString()}</p>
                    </div>

                    {viewingPayout.paidAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Paid At</p>
                        <p className="font-medium">{new Date(viewingPayout.paidAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </Button>
                  {viewingPayout.status === 'PENDING' && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleMarkAsPaid(viewingPayout);
                        setShowViewModal(false);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Dialog */}
      <AnimatePresence>
        {showLogoutDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="card-healthcare p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-2">Confirm Logout</h3>
              <p className="text-muted-foreground mb-6">Are you sure you want to logout?</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowLogoutDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmLogout}
                >
                  Logout
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Mode Dialog */}
      <AnimatePresence>
        {showPaymentModeDialog && selectedPayoutForPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !processingPayment && setShowPaymentModeDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Release Payment</h2>
                  <button
                    onClick={() => !processingPayment && setShowPaymentModeDialog(false)}
                    disabled={processingPayment}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Provider Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {selectedPayoutForPayment.providerId?.name?.[0] || 'P'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedPayoutForPayment.providerId?.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPayoutForPayment.providerId?.email}
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount to Release</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ₹{selectedPayoutForPayment.netAmount?.toFixed(2)}
                  </p>
                </div>

                {/* Bank Details */}
                {selectedPayoutForPayment.providerBankDetails && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Bank Details
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Account Holder</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedPayoutForPayment.providerBankDetails.accountHolderName || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Account Number</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedPayoutForPayment.providerBankDetails.bankAccount || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">IFSC Code</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedPayoutForPayment.providerBankDetails.ifscCode || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Mode Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                      🧪 TEST MODE: No real payment required
                    </p>
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Click the button below to instantly mark this payout as paid. This simulates a successful payment transfer for testing purposes.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-base"
                    onClick={processManualPayment}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        ✓ Complete Test Payout (Free)
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
                        Or use real payment (production)
                      </span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-semibold py-6 text-base"
                    onClick={processRazorpayTestPayment}
                    disabled={processingPayment}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay with Razorpay
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowPaymentModeDialog(false)}
                    disabled={processingPayment}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

