import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, IndianRupee, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { createLabBookingPaymentOrder, markLabBookingPaid, writeLabCart } from '@/services/labTest.service';
import { useSettings } from '@/contexts/SettingsContext';

// declare global {
//   interface Window {
//     Razorpay: any;
//   }
// }


const formatPrice = (value: number) => `Rs. ${Math.round(value).toLocaleString('en-IN')}`;

export default function LabTestPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const booking = (location.state as any)?.booking;
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const { settings } = useSettings();
  const razorpayKey = (settings as any)?.razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID;

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

  const completeTestPayment = async () => {
    if (!booking?._id) {
      navigate('/lab-tests');
      return;
    }

    try {
      setPaying(true);
      await markLabBookingPaid(booking._id, 'test', {
        transactionId: `LAB_TEST_${Date.now()}`,
      });
      writeLabCart([]);
      setPaid(true);
      toast({ title: 'Test booking confirmed', description: 'No real payment was charged.' });
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
    if (!booking?._id) {
      navigate('/lab-tests');
      return;
    }

    try {
      if (!razorpayKey) {
        toast({
          title: 'Payment gateway not configured',
          description: 'Razorpay key is missing. Please configure it in settings.',
          variant: 'destructive',
        });
        return;
      }

      setPaying(true);
      const orderResponse = await createLabBookingPaymentOrder(booking._id);
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
          writeLabCart([]);
          setPaid(true);
          setPaying(false);
          toast({
            title: 'Payment confirmed',
            description: `Payment ID: ${response.razorpay_payment_id}`,
          });
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      };

      // const razorpay = new window.Razorpay(options);
      const razorpay: any = new window.Razorpay(options);
      interface RazorpayInstance {
        open: () => void;
        close: () => void;
        on: (event: string, callback: (...args: any[]) => void) => void;
      }
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

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-36 lg:pt-44">
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">No booking found</h1>
            <Button asChild className="mt-4">
              <Link to="/lab-tests">Back to lab tests</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-16 pt-36 lg:pt-44">
        <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-6 shadow-card">
          {paid ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-secondary" />
              <h1 className="mt-4 text-2xl font-bold">Booking confirmed</h1>
              <p className="mt-2 text-muted-foreground">Your sample collection has been scheduled.</p>
              <Button asChild className="mt-6">
                <Link to="/lab-tests">Book more tests</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="flex items-center gap-3 text-2xl font-bold">
                <CreditCard className="h-7 w-7 text-primary" />
                Complete Payment
              </h1>

              <div className="my-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-5">
                <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold">
                  <IndianRupee className="h-6 w-6 text-primary" />
                  Fee Breakdown
                </h2>
                {booking.tests?.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {booking.tests.map((test: any) => (
                      <div key={`${test.testId || test.testCode}-${test.testName}`} className="flex justify-between gap-3 text-sm">
                        <span>{test.testName}</span>
                        <span>{formatPrice(test.sellingPrice || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-border pt-4 flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatPrice(booking.totalSellingPrice || 0)}</span>
                </div>
              </div>

              <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-amber-700">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-medium">TEST MODE: No real payment required</span>
              </div>

              <Button
                className="w-full rounded-2xl bg-secondary py-6 text-base font-bold hover:bg-secondary/90"
                onClick={completeTestPayment}
                disabled={paying}
              >
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Test Booking (Free)
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">Or use real payment (production)</span>
                </div>
              </div>

              <Button className="w-full rounded-2xl py-6 text-base font-bold" onClick={confirmPayment} disabled={paying}>
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay with Razorpay
                <CreditCard className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
