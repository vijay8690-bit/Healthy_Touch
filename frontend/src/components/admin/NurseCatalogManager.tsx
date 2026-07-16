import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import adminService from '@/services/admin.service';
import type { NurseAddon, NurseService } from '@/services/nurse.service';

const blankPackages = [
  { packageType: '5_visits', label: '5 visits', visitsCount: 5 },
  { packageType: '10_visits', label: '10 visits', visitsCount: 10 },
  { packageType: 'monthly', label: 'Monthly care', visitsCount: 30 },
].map((item) => ({ ...item, discountPercentage: '', customPrice: '', isActive: false }));
const blankService = {
  serviceName: '', description: '', durationMinutes: '60', price: '',
  category: 'General Nursing', requiredEquipment: '', isActive: true, packages: blankPackages,
};
const blankAddon = { addOnName: '', description: '', price: '', isActive: true };

const formatDuration = (minutes?: number | string | null) => {
  const totalMinutes = Number(minutes) || 0;
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
};

const getDurationHours = (minutes?: number | string | null) => Math.floor((Number(minutes) || 0) / 60);
const getDurationMinutesPart = (minutes?: number | string | null) => (Number(minutes) || 0) % 60;

const updateDuration = (form: any, part: 'hours' | 'minutes', value: string) => {
  const hours = part === 'hours' ? Math.max(0, Number(value) || 0) : getDurationHours(form.durationMinutes);
  const minutes = part === 'minutes' ? Math.max(0, Math.min(59, Number(value) || 0)) : getDurationMinutesPart(form.durationMinutes);
  return { ...form, durationMinutes: String((hours * 60) + minutes) };
};

export default function NurseCatalogManager() {
  const { toast } = useToast();
  const [services, setServices] = useState<NurseService[]>([]);
  const [addons, setAddons] = useState<NurseAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceForm, setServiceForm] = useState<any>(blankService);
  const [addonForm, setAddonForm] = useState<any>(blankAddon);
  const [editingService, setEditingService] = useState<NurseService | null>(null);
  const [editingAddon, setEditingAddon] = useState<NurseAddon | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const [serviceResponse, addonResponse] = await Promise.all([adminService.getNurseServices(), adminService.getNurseAddons()]);
      setServices(serviceResponse.services || []);
      setAddons(addonResponse.addons || []);
    } catch (error: any) {
      toast({ title: 'Unable to load nurse catalogue', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadCatalog(); }, []);

  const openService = (service?: NurseService) => {
    setEditingService(service || null);
    setServiceForm(service ? {
      serviceName: service.serviceName, description: service.description || '', durationMinutes: String(service.durationMinutes),
      price: String(service.price), category: service.category || 'General Nursing',
      requiredEquipment: service.requiredEquipment || '', isActive: service.isActive,
      packages: blankPackages.map((fallback) => {
        const saved = service.packages?.find((item) => item.packageType === fallback.packageType);
        return saved ? { ...fallback, visitsCount: saved.visitsCount, discountPercentage: String(saved.discountPercentage || ''), customPrice: saved.customPrice === undefined ? '' : String(saved.customPrice), isActive: saved.isActive !== false } : { ...fallback };
      }),
    } : { ...blankService, packages: blankPackages.map((item) => ({ ...item })) });
    setServiceDialogOpen(true);
  };
  const openAddon = (addon?: NurseAddon) => {
    setEditingAddon(addon || null);
    setAddonForm(addon ? { addOnName: addon.addOnName, description: addon.description || '', price: String(addon.price), isActive: addon.isActive } : { ...blankAddon });
    setAddonDialogOpen(true);
  };
  const saveService = async () => {
    if (!serviceForm.serviceName.trim() || !serviceForm.price || Number(serviceForm.price) < 0 || Number(serviceForm.durationMinutes) <= 0) {
      toast({ title: 'Enter valid service name, duration and price', variant: 'destructive' }); return;
    }
    const payload = {
      ...serviceForm, durationMinutes: Number(serviceForm.durationMinutes), price: Number(serviceForm.price),
      packages: serviceForm.packages.filter((item: any) => item.isActive).map((item: any) => ({
        packageType: item.packageType, visitsCount: Number(item.visitsCount), discountPercentage: Number(item.discountPercentage || 0),
        customPrice: item.customPrice === '' ? undefined : Number(item.customPrice), isActive: true,
      })),
    };
    try {
      setSaving(true);
      if (editingService) await adminService.updateNurseService(editingService._id, payload);
      else await adminService.createNurseService(payload);
      toast({ title: editingService ? 'Nurse service updated' : 'Nurse service created' });
      setServiceDialogOpen(false); await loadCatalog();
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setSaving(false); }
  };
  const saveAddon = async () => {
    if (!addonForm.addOnName.trim() || addonForm.price === '' || Number(addonForm.price) < 0) {
      toast({ title: 'Enter valid add-on name and price', variant: 'destructive' }); return;
    }
    try {
      setSaving(true);
      const payload = { ...addonForm, price: Number(addonForm.price) };
      if (editingAddon) await adminService.updateNurseAddon(editingAddon._id, payload);
      else await adminService.createNurseAddon(payload);
      toast({ title: editingAddon ? 'Nurse add-on updated' : 'Nurse add-on created' });
      setAddonDialogOpen(false); await loadCatalog();
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setSaving(false); }
  };
  const toggleService = async (service: NurseService) => {
    if (service.isActive) {
      await adminService.deactivateNurseService(service._id);
      toast({ title: 'Nurse service deactivated' });
    } else {
      await adminService.updateNurseService(service._id, { ...service, isActive: true });
      toast({ title: 'Nurse service activated' });
    }
    await loadCatalog();
  };
  const toggleAddon = async (addon: NurseAddon) => {
    if (addon.isActive) {
      await adminService.deactivateNurseAddon(addon._id);
      toast({ title: 'Nurse add-on deactivated' });
    } else {
      await adminService.updateNurseAddon(addon._id, { ...addon, isActive: true });
      toast({ title: 'Nurse add-on activated' });
    }
    await loadCatalog();
  };
  const deleteService = async (service: NurseService) => {
    if (!window.confirm(`Delete "${service.serviceName}" permanently?`)) return;
    await adminService.deleteNurseService(service._id);
    toast({ title: 'Nurse service deleted' });
    await loadCatalog();
  };
  const deleteAddon = async (addon: NurseAddon) => {
    if (!window.confirm(`Delete "${addon.addOnName}" permanently?`)) return;
    await adminService.deleteNurseAddon(addon._id);
    toast({ title: 'Nurse add-on deleted' });
    await loadCatalog();
  };

  return (
    <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4 md:p-6">
      <h2 className="text-xl font-bold">Nurse Catalogue Management</h2>
      <p className="mb-5 text-sm text-muted-foreground">Patient booking card services, optional add-ons and visit packages.</p>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <Tabs defaultValue="services">
          <TabsList className="w-full sm:w-auto"><TabsTrigger value="services">Services ({services.length})</TabsTrigger><TabsTrigger value="addons">Add-ons ({addons.length})</TabsTrigger></TabsList>
          <TabsContent value="services" className="space-y-4 pt-4">
            <div className="flex justify-end"><Button onClick={() => openService()}><Plus className="mr-2 h-4 w-4" />Add Service</Button></div>
            {services.length === 0 ? <p className="rounded-xl bg-card p-6 text-center text-muted-foreground">No services configured.</p> : services.map((service) => (
              <div key={service._id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2"><p className="font-semibold">{service.serviceName}</p><Badge variant={service.isActive ? 'default' : 'secondary'}>{service.isActive ? 'Active' : 'Inactive'}</Badge></div>
                  <p className="text-sm text-muted-foreground">{service.category} - {formatDuration(service.durationMinutes)} - Rs. {service.price.toLocaleString('en-IN')} per visit</p>
                  {service.requiredEquipment && <p className="text-xs text-muted-foreground">Equipment: {service.requiredEquipment}</p>}
                  {!!service.packages?.length && <p className="mt-1 text-xs text-primary">Packages: {service.packages.map((item) => `${item.visitsCount} visits`).join(', ')}</p>}
                </div>
                <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openService(service)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => toggleService(service)}>{service.isActive ? <><Power className="mr-1 h-4 w-4" />Deactivate</> : <><Power className="mr-1 h-4 w-4" />Activate</>}</Button><Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteService(service)}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="addons" className="space-y-4 pt-4">
            <div className="flex justify-end"><Button onClick={() => openAddon()}><Plus className="mr-2 h-4 w-4" />Add Add-on</Button></div>
            {addons.map((addon) => <div key={addon._id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold">{addon.addOnName}</p><p className="break-words text-sm text-muted-foreground">{addon.description} - +Rs. {addon.price.toLocaleString('en-IN')}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openAddon(addon)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => toggleAddon(addon)}>{addon.isActive ? 'Deactivate' : 'Activate'}</Button><Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteAddon(addon)}><Trash2 className="h-4 w-4" /></Button></div></div>)}
          </TabsContent>
        </Tabs>
      )}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editingService ? 'Edit' : 'Add'} Nurse Service</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Service name</Label><Input value={serviceForm.serviceName} onChange={(e) => setServiceForm({ ...serviceForm, serviceName: e.target.value })} /></div>
          <div className="space-y-2"><Label>Category</Label><Input value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min="0" value={getDurationHours(serviceForm.durationMinutes)} onChange={(e) => setServiceForm(updateDuration(serviceForm, 'hours', e.target.value))} aria-label="Duration hours" />
              <Input type="number" min="0" max="59" value={getDurationMinutesPart(serviceForm.durationMinutes)} onChange={(e) => setServiceForm(updateDuration(serviceForm, 'minutes', e.target.value))} aria-label="Duration minutes" />
            </div>
            <p className="text-xs text-muted-foreground">{formatDuration(serviceForm.durationMinutes)}</p>
          </div>
          <div className="space-y-2"><Label>Price per visit</Label><Input type="number" min="0" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Required equipment (optional)</Label><Input value={serviceForm.requiredEquipment} onChange={(e) => setServiceForm({ ...serviceForm, requiredEquipment: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></div>
        </div>
        <div className="space-y-3 rounded-xl border p-4"><p className="font-semibold">Optional Package Settings</p>{serviceForm.packages.map((option: any, index: number) => <div key={option.packageType} className="grid items-center gap-2 sm:grid-cols-[130px_1fr_1fr]"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={option.isActive} onChange={(e) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, i: number) => i === index ? { ...item, isActive: e.target.checked } : item) })} />{option.label}</label><Input placeholder="Discount %" type="number" min="0" max="100" value={option.discountPercentage} onChange={(e) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, i: number) => i === index ? { ...item, discountPercentage: e.target.value } : item) })} /><Input placeholder="Custom price" type="number" min="0" value={option.customPrice} onChange={(e) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, i: number) => i === index ? { ...item, customPrice: e.target.value } : item) })} /></div>)}</div>
        <Button disabled={saving} onClick={saveService}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Service</Button>
      </DialogContent></Dialog>
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingAddon ? 'Edit' : 'Add'} Nurse Add-on</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Add-on name</Label><Input value={addonForm.addOnName} onChange={(e) => setAddonForm({ ...addonForm, addOnName: e.target.value })} /></div><div><Label>Description</Label><Textarea value={addonForm.description} onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })} /></div><div><Label>Price</Label><Input type="number" value={addonForm.price} onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })} /></div></div><Button disabled={saving} onClick={saveAddon}>Save Add-on</Button></DialogContent></Dialog>
    </section>
  );
}
