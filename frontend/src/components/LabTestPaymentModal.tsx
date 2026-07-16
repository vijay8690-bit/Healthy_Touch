import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CreditCard, IndianRupee, Loader2, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { createLabBookingPaymentOrder, markLabBookingPaid, normalizeLabTestPrice, writeLabCart } from '@/services/labTest.service';
import CouponField from '@/components/CouponField';

// declare global {
//   interface Window {
//     Razorpay: any;
//   }
// }

interface LabTestPaymentModalProps {
  open: boolean;
  booking: any;
  onClose: () => void;
  onSuccess?: () => void;
  initialUseCoins?: boolean;
  hideCoinOption?: boolean;
}

const formatPrice = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`;

export default function LabTestPaymentModal({
  open,
  booking,
  onClose,
  onSuccess,
  initialUseCoins = false,
  hideCoinOption = false,
}: LabTestPaymentModalProps) {
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const { toast } = useToast();
  const { settings } = useSettings();
  const { user, setUser } = useAuth();
  const razorpayKey = (settings as any)?.razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID;
  const coinValueInRupees = Number((settings as any)?.coinValueInRupees ?? 1);
  const availableCoins = Number(user?.coins || 0);
  const bookingTests = (booking?.tests || []).map((test: any) => normalizeLabTestPrice(test));
  const grossAmount = bookingTests.length
    ? bookingTests.reduce((sum: number, test: any) => sum + Number(test.sellingPrice || 0), 0)
    : Number(booking?.totalSellingPrice || 0);
  const couponDiscount = Number(appliedCoupon?.discountAmount || 0);
  const amountAfterCoupon = Math.max(0, grossAmount - couponDiscount);
  const previewCoinsUsed = useCoins && coinValueInRupees > 0
    ? Math.min(availableCoins, Math.floor(amountAfterCoupon / coinValueInRupees))
    : 0;
  const previewCoinDiscount = previewCoinsUsed * coinValueInRupees;
  const previewPayableAmount = Math.max(0, amountAfterCoupon - previewCoinDiscount);

  useEffect(() => {
    if (open) {
      setUseCoins(initialUseCoins);
      setAppliedCoupon(null);
    }
  }, [open, initialUseCoins]);

  const loadRazorpay = async () => {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });
  };

  const resetAndClose = () => {
    if (paying) return;
    onClose();
  };

  const completeTestPayment = async () => {
    if (!booking?._id) return;

    try {
      setPaying(true);
      await createLabBookingPaymentOrder(booking._id, useCoins, appliedCoupon?.code || '');
      await markLabBookingPaid(booking._id, 'test', {
        transactionId: `LAB_TEST_${Date.now()}`,
      });
      if (user && previewCoinsUsed > 0) {
        setUser({ ...user, coins: Math.max(0, availableCoins - previewCoinsUsed) });
      }
      writeLabCart([]);
      setPaid(true);
      setPaying(false);
      toast({ title: 'Test booking confirmed', description: 'No real payment was charged.' });
      onSuccess?.();
    } catch (error: any) {
      setPaying(false);
      toast({
        title: 'Booking failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const confirmPayment = async () => {
    if (!booking?._id) return;

    try {
      setPaying(true);
      const orderResponse = await createLabBookingPaymentOrder(booking._id, useCoins, appliedCoupon?.code || '');
      if (!orderResponse.order && (orderResponse.breakdown?.payableAmount ?? orderResponse.amount) === 0) {
        await markLabBookingPaid(booking._id, 'coins', {
          transactionId: `LAB_COINS_${Date.now()}`,
        });
        if (user && orderResponse.breakdown?.coinsUsed > 0) {
          setUser({ ...user, coins: Math.max(0, availableCoins - orderResponse.breakdown.coinsUsed) });
        }
        writeLabCart([]);
        setPaid(true);
        setPaying(false);
        toast({ title: 'Booking confirmed', description: 'Payment completed using coins.' });
        onSuccess?.();
        return;
      }

      if (!razorpayKey) {
        toast({
          title: 'Payment gateway not configured',
          description: 'Razorpay key is missing. Please configure it in settings.',
          variant: 'destructive',
        });
        setPaying(false);
        return;
      }

      await loadRazorpay();

      const order = orderResponse.order;
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Healthy Touch',
        description: `Lab test booking - ${booking.tests?.length || 0} test(s)`,
        order_id: order.id,
        prefill: {
          name: booking.patientName || '',
          contact: booking.patientMobile || '',
        },
        theme: {
          color: '#2f80b7',
        },
        handler: async (response: any) => {
          await markLabBookingPaid(booking._id, 'razorpay', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (user && orderResponse.breakdown?.coinsUsed > 0) {
            setUser({ ...user, coins: Math.max(0, availableCoins - orderResponse.breakdown.coinsUsed) });
          }
          writeLabCart([]);
          setPaid(true);
          setPaying(false);
          toast({
            title: 'Payment confirmed',
            description: `Payment ID: ${response.razorpay_payment_id}`,
          });
          onSuccess?.();
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      // const razorpay = new window.Razorpay(options);
      const razorpay: any = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        setPaying(false);
        toast({
          title: 'Payment failed',
          description: response?.error?.description || 'Please try again.',
          variant: 'destructive',
        });
      });
      razorpay.on("payment.failed", function (response: any) {
        console.log(response);
      });
      razorpay.open();
    } catch (error: any) {
      setPaying(false);
      toast({
        title: 'Payment failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {paid ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                Booking Confirmed!
              </>
            ) : (
              <>
                <CreditCard className="w-6 h-6 text-primary" />
                Complete Payment
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {paid ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-600">Payment Successful!</h3>
            <p className="text-muted-foreground">Your lab test booking has been confirmed.</p>
            <Button asChild onClick={onClose}>
              <Link to="/lab-tests">Book more tests</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-primary/10 via-card to-secondary/10 rounded-xl border border-border/80">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Fee Breakdown
              </h3>
              {booking?.tests?.length > 0 && (
                <div className="mb-4 space-y-2">
                  {bookingTests.map((test: any) => (
                    <div key={`${test.testId || test.testCode}-${test.testName}`} className="flex justify-between gap-3 text-sm">
                      <span>{test.testName}</span>
                      <span className="font-medium">{formatPrice(test.sellingPrice)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="h-px bg-border my-2" />
              <CouponField
                bookingType="lab_test"
                orderAmount={grossAmount}
                appliedCoupon={appliedCoupon}
                onApplied={setAppliedCoupon}
                disabled={paying || !grossAmount}
              />
              <div className="h-px bg-border my-2" />
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span className="font-medium">-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              {previewCoinsUsed > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Coins Discount ({previewCoinsUsed} coins)</span>
                  <span className="font-medium">-Rs. {previewCoinDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-primary">{formatPrice(previewPayableAmount)}</span>
              </div>
            </div>

            {!hideCoinOption && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="useLabCoins"
                    checked={useCoins}
                    disabled={availableCoins <= 0}
                    onCheckedChange={(checked) => setUseCoins(Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="useLabCoins" className="font-semibold">
                      Use reward coins
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {availableCoins} coins. 1 coin = Rs. {coinValueInRupees || 0}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">TEST MODE: No real payment required</span>
            </div>

            <Button className="w-full" variant="secondary" size="lg" onClick={completeTestPayment} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Test Payment...
                </>
              ) : (
                <>
                  Complete Test Booking (Free)
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or use real payment (Production)</span>
              </div>
            </div>

            <Button className="w-full bg-primary text-white" size="lg" onClick={confirmPayment} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  Pay with Razorpay
                  <CreditCard className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By proceeding, you agree to our terms and conditions
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
