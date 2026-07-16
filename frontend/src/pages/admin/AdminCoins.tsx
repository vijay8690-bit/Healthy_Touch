import { useEffect, useState } from 'react';
import { Coins, Loader2, Save } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminSidebarLinks } from '@/components/layout/AdminSidebarLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import settingsService from '@/services/settings.service';

export default function AdminCoins() {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const { toast } = useToast();
  const [coinValueInRupees, setCoinValueInRupees] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const value = Number((settings as any)?.coinValueInRupees ?? 1);
    setCoinValueInRupees(Number.isFinite(value) ? value : 1);
  }, [settings]);

  const saveCoinValue = async () => {
    if (!Number.isFinite(coinValueInRupees) || coinValueInRupees < 0) {
      toast({
        title: 'Invalid coin value',
        description: 'Coin value must be zero or greater.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await settingsService.updateSettingsSection('coins', { coinValueInRupees });
      await refreshSettings();
      toast({
        title: 'Coins settings saved',
        description: `1 coin is now worth Rs. ${coinValueInRupees}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      sidebarLinks={adminSidebarLinks}
      portalName="Coins"
      userName={user?.name || 'Admin'}
      userInitial={user?.name?.charAt(0) || 'A'}
    >
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Coins Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set how much rupee discount one reward coin gives during patient payments.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Coin Value</h2>
              <p className="text-sm text-muted-foreground">Current rule used in all payment screens.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coinValueInRupees">1 Coin Value (Rs.)</Label>
            <Input
              id="coinValueInRupees"
              type="number"
              min="0"
              step="0.01"
              value={coinValueInRupees}
              onChange={(event) => setCoinValueInRupees(Number(event.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Example: 1 means 100 coins reduce Rs. 100. 0.5 means 100 coins reduce Rs. 50.
            </p>
          </div>

          <Button className="mt-6 gap-2" onClick={saveCoinValue} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Coins Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
