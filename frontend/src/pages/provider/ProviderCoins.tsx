import { useEffect, useMemo, useState } from 'react';
import { Calendar, Coins, Copy, FileText, Gift, IndianRupee, LayoutDashboard, Share2, ShoppingCart, User, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useProviderApproval } from '@/hooks/useProviderApproval';
import providerService from '@/services/provider.service';

type CoinHistoryItem = {
  amount: number;
  type: string;
  description: string;
  createdAt: string;
};

export default function ProviderCoins() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const { count: notificationCount } = useNotificationCount();
  const { loading: approvalLoading } = useProviderApproval();
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(user?.coins || 0);
  const [referralCode, setReferralCode] = useState(user?.referralCode || '');
  const [history, setHistory] = useState<CoinHistoryItem[]>(user?.coinHistory || []);

  useEffect(() => {
    if (approvalLoading) return;

    const fetchCoins = async () => {
      try {
        setLoading(true);
        const response = await providerService.getUserProfile();
        if (response.success && response.user) {
          setUser(response.user);
          setCoins(response.user.coins || 0);
          setReferralCode(response.user.referralCode || '');
          setHistory(response.user.coinHistory || []);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load coins.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
  }, [approvalLoading, setUser, toast]);

  const earnedCoins = useMemo(
    () => history.reduce((sum, item) => sum + Math.max(Number(item.amount) || 0, 0), 0),
    [history]
  );

  const handleCopyReferralCode = async () => {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(referralCode);
      toast({
        title: 'Referral code copied',
        description: 'Share it with new users to earn referral coins.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the referral code manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout
      sidebarLinks={getProviderSidebarLinks(user)}
      portalName="Provider Portal"
      userName={user?.name || 'Provider'}
      userInitial={user?.name?.charAt(0) || 'P'}
      notificationCount={notificationCount}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Coins Cart</h1>
            <p className="text-sm text-muted-foreground">Manage your reward coins and referral code.</p>
          </div>
          <Button onClick={handleCopyReferralCode} disabled={!referralCode}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Code
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-healthcare p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Coins</p>
                <p className="font-display mt-1 text-3xl font-bold">{loading ? '...' : coins}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Coins className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="card-healthcare p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Referral Code</p>
                <p className="font-display mt-1 text-2xl font-bold">{referralCode || 'N/A'}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Share2 className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="card-healthcare p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="font-display mt-1 text-2xl font-bold">{loading ? '...' : earnedCoins}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                <Gift className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="card-healthcare p-6">
          <h2 className="font-display mb-4 text-lg font-semibold">Coin History</h2>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : history.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No coin activity yet</p>
              <p className="text-sm text-muted-foreground">Share your referral code to earn coins.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((item, index) => (
                <div key={`${item.createdAt}-${index}`} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type.replace(/_/g, ' ')} - {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    +{item.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
