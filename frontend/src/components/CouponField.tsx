import { useEffect, useState } from 'react';
import { BadgeCheck, Loader2, Ticket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAvailableCoupons, validateCoupon, type CouponServiceType } from '@/services/coupon.service';

type CouponFieldProps = {
  bookingType: CouponServiceType;
  orderAmount: number;
  appliedCoupon?: any;
  onApplied: (coupon: any | null) => void;
  disabled?: boolean;
};

const money = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`;

export default function CouponField({
  bookingType,
  orderAmount,
  appliedCoupon,
  onApplied,
  disabled,
}: CouponFieldProps) {
  const [code, setCode] = useState(appliedCoupon?.code || '');
  const [checking, setChecking] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadAvailableCoupons = async () => {
      if (!orderAmount || disabled) {
        setAvailableCoupons([]);
        return;
      }

      try {
        setLoadingCoupons(true);
        const response = await getAvailableCoupons({ bookingType, orderAmount });
        if (cancelled) return;

        const coupons = response.coupons || [];
        setAvailableCoupons(coupons);

        if (!appliedCoupon && !code.trim() && coupons.length > 0) {
          setCode(coupons[0].code);
        }
      } catch {
        if (!cancelled) setAvailableCoupons([]);
      } finally {
        if (!cancelled) setLoadingCoupons(false);
      }
    };

    loadAvailableCoupons();

    return () => {
      cancelled = true;
    };
  }, [bookingType, orderAmount, disabled]);

  const apply = async () => {
    if (!code.trim()) {
      toast({ title: 'Enter a coupon code', variant: 'destructive' });
      return;
    }

    try {
      setChecking(true);
      const response = await validateCoupon({
        code: code.trim(),
        bookingType,
        orderAmount,
      });
      onApplied({
        ...response.coupon,
        discountAmount: response.discountAmount,
        payableAmount: response.payableAmount,
      });
      setCode(response.coupon.code);
      toast({
        title: 'Coupon applied',
        description: `${response.coupon.code} saved ${money(response.discountAmount)}.`,
      });
    } catch (error: any) {
      onApplied(null);
      toast({
        title: 'Coupon not applied',
        description: error?.response?.data?.message || error?.message || 'Please try another coupon.',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const remove = () => {
    setCode('');
    onApplied(null);
  };

  const pickCoupon = (coupon: any) => {
    setCode(coupon.code);
    onApplied(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Coupon code"
            className="pl-9"
            disabled={disabled || checking}
          />
        </div>
        {appliedCoupon ? (
          <Button type="button" variant="outline" size="icon" onClick={remove} disabled={disabled || checking} aria-label="Remove coupon">
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={apply} disabled={disabled || checking}>
            {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
            Apply
          </Button>
        )}
      </div>
      {appliedCoupon ? (
        <p className="text-sm font-medium text-green-600">
          {appliedCoupon.code} discount: {money(appliedCoupon.discountAmount)}
        </p>
      ) : null}
      {loadingCoupons ? (
        <p className="text-xs text-muted-foreground">Checking available coupons...</p>
      ) : availableCoupons.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Available coupons</p>
          <div className="flex flex-wrap gap-2">
            {availableCoupons.map((coupon) => (
              <button
                key={coupon.id}
                type="button"
                onClick={() => pickCoupon(coupon)}
                className="rounded-md border border-border bg-muted px-3 py-2 text-left text-xs hover:bg-primary/10 hover:text-primary"
                disabled={disabled || checking}
              >
                <span className="block font-semibold">{coupon.code}</span>
                <span className="text-muted-foreground">Save {money(coupon.discountAmount)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No coupon available for this amount.</p>
      )}
    </div>
  );
}
