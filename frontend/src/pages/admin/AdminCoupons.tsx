import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Power, Trash2, Ticket } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCouponUsage,
  getAdminCoupons,
  updateAdminCoupon,
  updateAdminCouponStatus,
  type CouponPayload,
} from '@/services/coupon.service';
import { FEATURES } from '@/config/features';

const emptyForm: CouponPayload = {
  code: '',
  title: '',
  description: '',
  discountType: 'fixed',
  discountValue: 0,
  maxDiscount: 0,
  minOrderAmount: 0,
  validFor: 'all',
  firstTimeOnly: false,
  usageLimit: 0,
  perUserLimit: 1,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  status: 'active',
};

const money = (value: number) => `Rs. ${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
const asDateInput = (value?: string) => value ? new Date(value).toISOString().slice(0, 10) : '';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<CouponPayload>(emptyForm);
  const { toast } = useToast();

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await getAdminCoupons();
      setCoupons(
        (response.coupons || []).filter(
          (coupon: any) => FEATURES.AMBULANCE_MODULE || coupon.validFor !== 'ambulance',
        ),
      );
    } catch (error: any) {
      toast({ title: 'Unable to load coupons', description: error?.response?.data?.message || error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (coupon: any) => {
    setEditing(coupon);
    setForm({
      code: coupon.code || '',
      title: coupon.title || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'fixed',
      discountValue: Number(coupon.discountValue || 0),
      maxDiscount: Number(coupon.maxDiscount || 0),
      minOrderAmount: Number(coupon.minOrderAmount || 0),
      validFor: coupon.validFor || 'all',
      firstTimeOnly: !!coupon.firstTimeOnly,
      usageLimit: Number(coupon.usageLimit || 0),
      perUserLimit: Number(coupon.perUserLimit || 1),
      startDate: asDateInput(coupon.startDate),
      endDate: asDateInput(coupon.endDate),
      status: coupon.status || 'active',
    });
    setFormOpen(true);
  };

  const saveCoupon = async () => {
    try {
      setSaving(true);
      if (editing?._id) {
        await updateAdminCoupon(editing._id, form);
      } else {
        await createAdminCoupon(form);
      }
      setFormOpen(false);
      await loadCoupons();
      toast({ title: editing ? 'Coupon updated' : 'Coupon created' });
    } catch (error: any) {
      toast({ title: 'Unable to save coupon', description: error?.response?.data?.message || error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (coupon: any) => {
    await updateAdminCouponStatus(coupon._id, coupon.status === 'active' ? 'inactive' : 'active');
    await loadCoupons();
  };

  const removeCoupon = async (coupon: any) => {
    if (!window.confirm(`Delete ${coupon.code}? This is allowed only when unused.`)) return;
    try {
      await deleteAdminCoupon(coupon._id);
      await loadCoupons();
      toast({ title: 'Coupon deleted' });
    } catch (error: any) {
      toast({ title: 'Unable to delete coupon', description: error?.response?.data?.message || error.message, variant: 'destructive' });
    }
  };

  const openUsage = async (coupon: any) => {
    const response = await getAdminCouponUsage(coupon._id);
    setUsage(response.usage || []);
    setUsageOpen(true);
  };

  return (
    <DashboardLayout role="admin" sidebarLinks={sidebarLinks} title="Coupons">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Coupons</h1>
            <p className="text-muted-foreground">
              Manage patient discounts for appointments and lab tests{FEATURES.AMBULANCE_MODULE ? ' and ambulance services' : ''}.
            </p>
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Coupon</Button>
        </div>

        <div className="card-healthcare overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coupon</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading coupons...</TableCell></TableRow>
              ) : coupons.length ? coupons.map((coupon) => (
                <TableRow key={coupon._id}>
                  <TableCell>
                    <div className="font-semibold">{coupon.code}</div>
                    <div className="text-sm text-muted-foreground">{coupon.title}</div>
                  </TableCell>
                  <TableCell>
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : money(coupon.discountValue)}
                    {coupon.maxDiscount > 0 ? <div className="text-xs text-muted-foreground">Max {money(coupon.maxDiscount)}</div> : null}
                  </TableCell>
                  <TableCell>{coupon.validFor}</TableCell>
                  <TableCell>{coupon.usageCount || 0} uses</TableCell>
                  <TableCell><Badge variant={coupon.status === 'active' ? 'default' : 'secondary'}>{coupon.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => openUsage(coupon)} aria-label="View usage"><Eye className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => openEdit(coupon)} aria-label="Edit coupon"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => toggleStatus(coupon)} aria-label="Toggle status"><Power className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => removeCoupon(coupon)} aria-label="Delete coupon"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No coupons found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Discount Type</Label><Select value={form.discountType} onValueChange={(value: any) => setForm({ ...form, discountType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="percentage">Percentage</SelectItem></SelectContent></Select></div>
            <div><Label>Discount Value</Label><Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} /></div>
            <div><Label>Max Discount</Label><Input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} /></div>
            <div><Label>Minimum Order Amount</Label><Input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} /></div>
            <div><Label>Valid For</Label><Select value={form.validFor} onValueChange={(value: any) => setForm({ ...form, validFor: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="appointment">Appointment</SelectItem><SelectItem value="lab_test">Lab Test</SelectItem>{FEATURES.AMBULANCE_MODULE && <SelectItem value="ambulance">Ambulance</SelectItem>}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(value: any) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
            <div><Label>Usage Limit</Label><Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} /></div>
            <div><Label>Per User Limit</Label><Input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <label className="md:col-span-2 flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={form.firstTimeOnly} onCheckedChange={(checked) => setForm({ ...form, firstTimeOnly: Boolean(checked) })} />
              First-time patients only
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={saveCoupon} disabled={saving}>{saving ? 'Saving...' : 'Save Coupon'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" />Usage History</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Service</TableHead><TableHead>Discount</TableHead><TableHead>Used At</TableHead></TableRow></TableHeader>
              <TableBody>
                {usage.length ? usage.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>{item.userId?.name || 'Patient'}<div className="text-xs text-muted-foreground">{item.userId?.mobile || item.userId?.email}</div></TableCell>
                    <TableCell>{item.bookingType}</TableCell>
                    <TableCell>{money(item.discountAmount)}</TableCell>
                    <TableCell>{new Date(item.usedAt).toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No usage yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
