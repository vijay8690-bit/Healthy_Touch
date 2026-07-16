import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  Settings,
  Home,
  LogOut,
  Menu,
  Save,
  Stethoscope,
  MessageSquare,
  Globe,
  Mail,
  CreditCard,
  Shield,
  FileText,
  Clock,
  Loader2,
  DollarSign,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import NotificationDropdown from '@/components/NotificationDropdown';
import settingsService, { type PlatformSettings } from '@/services/settings.service';
import { useSettings } from '@/contexts/SettingsContext';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';


export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { refreshSettings } = useSettings();

  const [settings, setSettings] = useState<PlatformSettings>({
    siteName: '',
    siteUrl: '',
    supportEmail: '',
    contactPhone: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    razorpayKey: '',
    razorpaySecret: '',
    commissionRate: 10,
    paymentGateway: 'razorpay',
    minBookingTime: 30,
    maxBookingDays: 60,
    cancellationHours: 24,
    slotDuration: 30,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load settings',
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

  const handleSaveSettings = async (section: string) => {
    try {
      setSaving(true);
      const updatedSettings = await settingsService.updateSettingsSection(section, settings);
      setSettings(updatedSettings);
      // Refresh public settings across the app so changes apply immediately
      await refreshSettings();
      toast({
        title: 'Settings Saved',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'appointment', label: 'Appointments', icon: Clock },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'legal', label: 'Legal', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
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
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="font-display font-semibold text-lg">Platform Settings</h1>
                <p className="text-sm text-muted-foreground">Configure system settings and preferences</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                A
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading settings...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'general' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-healthcare p-6"
                >
                  <h3 className="text-lg font-semibold mb-6">General Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input
                        id="siteName"
                        value={settings.siteName}
                        onChange={(e) => updateSetting('siteName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteUrl">Site URL</Label>
                      <Input
                        id="siteUrl"
                        value={settings.siteUrl}
                        onChange={(e) => updateSetting('siteUrl', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) => updateSetting('supportEmail', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        value={settings.contactPhone}
                        onChange={(e) => updateSetting('contactPhone', e.target.value)}
                      />
                    </div>
                    <Button onClick={() => handleSaveSettings('general')} className="gap-2" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'email' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-healthcare p-6"
                >
                  <h3 className="text-lg font-semibold mb-6">Email Configuration</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        value={settings.smtpHost}
                        onChange={(e) => updateSetting('smtpHost', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input
                        id="smtpPort"
                        value={settings.smtpPort}
                        onChange={(e) => updateSetting('smtpPort', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP Username</Label>
                      <Input
                        id="smtpUser"
                        value={settings.smtpUser}
                        onChange={(e) => updateSetting('smtpUser', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP Password</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        value={settings.smtpPassword}
                        onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                        placeholder="Leave blank to keep current password"
                      />
                    </div>
                    <Button onClick={() => handleSaveSettings('email')} className="gap-2" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'payment' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-healthcare p-6"
                >
                  <h3 className="text-lg font-semibold mb-6">Payment Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentGateway">Payment Gateway</Label>
                      <Select 
                        value={settings.paymentGateway} 
                        onValueChange={(value) => updateSetting('paymentGateway', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="razorpay">Razorpay</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="paytm">Paytm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razorpayKey">Razorpay API Key</Label>
                      <Input
                        id="razorpayKey"
                        value={settings.razorpayKey}
                        onChange={(e) => updateSetting('razorpayKey', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razorpaySecret">Razorpay Secret</Label>
                      <Input
                        id="razorpaySecret"
                        type="password"
                        value={settings.razorpaySecret}
                        onChange={(e) => updateSetting('razorpaySecret', e.target.value)}
                        placeholder="Leave blank to keep current secret"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="commissionRate">Platform Commission (%)</Label>
                      <Input
                        id="commissionRate"
                        type="number"
                        value={settings.commissionRate}
                        onChange={(e) => updateSetting('commissionRate', parseFloat(e.target.value))}
                      />
                    </div>
                    <Button onClick={() => handleSaveSettings('payment')} className="gap-2" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'appointment' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-healthcare p-6"
                >
                  <h3 className="text-lg font-semibold mb-6">Appointment Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="minBookingTime">Minimum Booking Time (minutes)</Label>
                      <Input
                        id="minBookingTime"
                        type="number"
                        value={settings.minBookingTime}
                        onChange={(e) => updateSetting('minBookingTime', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">Minimum time before appointment can be booked</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxBookingDays">Maximum Booking Days Ahead</Label>
                      <Input
                        id="maxBookingDays"
                        type="number"
                        value={settings.maxBookingDays}
                        onChange={(e) => updateSetting('maxBookingDays', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">Maximum days in advance for booking</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cancellationHours">Cancellation Notice (hours)</Label>
                      <Input
                        id="cancellationHours"
                        type="number"
                        value={settings.cancellationHours}
                        onChange={(e) => updateSetting('cancellationHours', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">Hours before appointment when cancellation is allowed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slotDuration">Default Slot Duration (minutes)</Label>
                      <Input
                        id="slotDuration"
                        type="number"
                        value={settings.slotDuration}
                        onChange={(e) => updateSetting('slotDuration', parseInt(e.target.value))}
                      />
                    </div>
                    <Button onClick={() => handleSaveSettings('appointment')} className="gap-2" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-healthcare p-6"
                >
                  <h3 className="text-lg font-semibold mb-6">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                      <Input
                        id="passwordMinLength"
                        type="number"
                        value={settings.passwordMinLength || 8}
                        onChange={(e) => updateSetting('passwordMinLength', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
                        <p className="text-sm text-muted-foreground">Users must verify email before login</p>
                      </div>
                      <Switch
                        id="requireEmailVerification"
                        checked={settings.requireEmailVerification || false}
                        onCheckedChange={(checked) => updateSetting('requireEmailVerification', checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={settings.sessionTimeout || 30}
                        onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableTwoFactor">Enable Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                      </div>
                      <Switch
                        id="enableTwoFactor"
                        checked={settings.enableTwoFactor || false}
                        onCheckedChange={(checked) => updateSetting('enableTwoFactor', checked)}
                      />
                    </div>
                    <Button onClick={() => handleSaveSettings('security')} className="gap-2" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'legal' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-healthcare p-6"
                >
                  <h3 className="text-lg font-semibold mb-6">Legal & Compliance</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
                      <Textarea
                        id="termsAndConditions"
                        value={settings.termsAndConditions || ''}
                        onChange={(e) => updateSetting('termsAndConditions', e.target.value)}
                        rows={6}
                        placeholder="Enter your terms and conditions..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="privacyPolicy">Privacy Policy</Label>
                      <Textarea
                        id="privacyPolicy"
                        value={settings.privacyPolicy || ''}
                        onChange={(e) => updateSetting('privacyPolicy', e.target.value)}
                        rows={6}
                        placeholder="Enter your privacy policy..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refundPolicy">Refund Policy</Label>
                      <Textarea
                        id="refundPolicy"
                        value={settings.refundPolicy || ''}
                        onChange={(e) => updateSetting('refundPolicy', e.target.value)}
                        rows={6}
                        placeholder="Enter your refund policy..."
                      />
                    </div>
                    <Button onClick={() => handleSaveSettings('legal')} className="gap-2" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </main>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the home page and will need to login again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
