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
import type { PhysiotherapyAddon, PhysiotherapyService } from '@/services/physiotherapy.service';

const blankPackages = [5, 10, 20].map((sessions) => ({
  sessions: sessions as 5 | 10 | 20,
  discountPercentage: '',
  customPrice: '',
  isActive: false,
}));

const blankService = {
  name: '',
  description: '',
  durationMinutes: '60',
  price: '',
  category: 'General',
  isActive: true,
  packages: blankPackages,
};

const blankAddon = {
  name: '',
  description: '',
  price: '',
  isActive: true,
};

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

export default function PhysiotherapyCatalogManager() {
  const { toast } = useToast();
  const [services, setServices] = useState<PhysiotherapyService[]>([]);
  const [addons, setAddons] = useState<PhysiotherapyAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceForm, setServiceForm] = useState<any>(blankService);
  const [addonForm, setAddonForm] = useState<any>(blankAddon);
  const [editingService, setEditingService] = useState<PhysiotherapyService | null>(null);
  const [editingAddon, setEditingAddon] = useState<PhysiotherapyAddon | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const [serviceResponse, addonResponse] = await Promise.all([
        adminService.getPhysiotherapyServices(),
        adminService.getPhysiotherapyAddons(),
      ]);
      setServices(serviceResponse.services || []);
      setAddons(addonResponse.addons || []);
    } catch (error: any) {
      toast({ title: 'Unable to load physiotherapy catalogue', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const openService = (service?: PhysiotherapyService) => {
    setEditingService(service || null);
    if (!service) {
      setServiceForm({ ...blankService, packages: blankPackages.map((item) => ({ ...item })) });
    } else {
      setServiceForm({
        name: service.name,
        description: service.description || '',
        durationMinutes: String(service.durationMinutes),
        price: String(service.price),
        category: service.category || 'General',
        isActive: service.isActive,
        packages: blankPackages.map((fallback) => {
          const saved = service.packages?.find((item) => item.sessions === fallback.sessions);
          return saved ? {
            sessions: saved.sessions,
            discountPercentage: String(saved.discountPercentage || ''),
            customPrice: saved.customPrice === undefined ? '' : String(saved.customPrice),
            isActive: saved.isActive !== false,
          } : { ...fallback };
        }),
      });
    }
    setServiceDialogOpen(true);
  };

  const openAddon = (addon?: PhysiotherapyAddon) => {
    setEditingAddon(addon || null);
    setAddonForm(addon ? {
      name: addon.name,
      description: addon.description || '',
      price: String(addon.price),
      isActive: addon.isActive,
    } : { ...blankAddon });
    setAddonDialogOpen(true);
  };

  const saveService = async () => {
    if (!serviceForm.name.trim() || Number(serviceForm.durationMinutes) <= 0 || Number(serviceForm.price) < 0 || serviceForm.price === '') {
      toast({ title: 'Enter valid service name, duration and price', variant: 'destructive' });
      return;
    }
    const payload = {
      ...serviceForm,
      durationMinutes: Number(serviceForm.durationMinutes),
      price: Number(serviceForm.price),
      packages: serviceForm.packages.filter((item: any) => item.isActive).map((item: any) => ({
        ...item,
        discountPercentage: Number(item.discountPercentage || 0),
        customPrice: item.customPrice === '' ? undefined : Number(item.customPrice),
      })),
    };
    try {
      setSaving(true);
      if (editingService) await adminService.updatePhysiotherapyService(editingService._id, payload);
      else await adminService.createPhysiotherapyService(payload);
      toast({ title: editingService ? 'Physiotherapy service updated' : 'Physiotherapy service created' });
      setServiceDialogOpen(false);
      await loadCatalog();
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveAddon = async () => {
    if (!addonForm.name.trim() || addonForm.price === '' || Number(addonForm.price) < 0) {
      toast({ title: 'Enter valid add-on name and price', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const payload = { ...addonForm, price: Number(addonForm.price) };
      if (editingAddon) await adminService.updatePhysiotherapyAddon(editingAddon._id, payload);
      else await adminService.createPhysiotherapyAddon(payload);
      toast({ title: editingAddon ? 'Equipment add-on updated' : 'Equipment add-on created' });
      setAddonDialogOpen(false);
      await loadCatalog();
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deactivateService = async (service: PhysiotherapyService) => {
    if (service.isActive) {
      await adminService.deactivatePhysiotherapyService(service._id);
      toast({ title: 'Service deactivated' });
    } else {
      await adminService.updatePhysiotherapyService(service._id, { ...service, isActive: true });
      toast({ title: 'Service activated' });
    }
    await loadCatalog();
  };

  const deactivateAddon = async (addon: PhysiotherapyAddon) => {
    if (addon.isActive) {
      await adminService.deactivatePhysiotherapyAddon(addon._id);
      toast({ title: 'Add-on deactivated' });
    } else {
      await adminService.updatePhysiotherapyAddon(addon._id, { ...addon, isActive: true });
      toast({ title: 'Add-on activated' });
    }
    await loadCatalog();
  };

  const deleteService = async (service: PhysiotherapyService) => {
    if (!window.confirm(`Delete "${service.name}" permanently?`)) return;
    await adminService.deletePhysiotherapyService(service._id);
    toast({ title: 'Service deleted' });
    await loadCatalog();
  };

  const deleteAddon = async (addon: PhysiotherapyAddon) => {
    if (!window.confirm(`Delete "${addon.name}" permanently?`)) return;
    await adminService.deletePhysiotherapyAddon(addon._id);
    toast({ title: 'Add-on deleted' });
    await loadCatalog();
  };

  return (
    <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Physiotherapy Catalogue Management</h2>
          <p className="text-sm text-muted-foreground">Patient booking card services, equipment add-ons and package rates.</p>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="services">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
            <TabsTrigger value="addons">Equipment Add-ons ({addons.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="services" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button onClick={() => openService()}><Plus className="mr-2 h-4 w-4" />Add Service</Button>
            </div>
            {services.length === 0 ? <p className="rounded-xl bg-card p-6 text-center text-muted-foreground">No services configured.</p> : services.map((service) => (
              <div key={service._id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{service.name}</p>
                    <Badge variant={service.isActive ? 'default' : 'secondary'}>{service.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{service.category} - {formatDuration(service.durationMinutes)} - Rs. {service.price.toLocaleString('en-IN')} per session</p>
                  <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>
                  {!!service.packages?.length && <p className="mt-2 text-xs text-primary">Packages: {service.packages.map((item) => `${item.sessions} sessions (${item.customPrice !== undefined ? `Rs. ${item.customPrice}` : `${item.discountPercentage}% off`})`).join(', ')}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openService(service)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => deactivateService(service)}>
                    {service.isActive ? <><Trash2 className="mr-1 h-4 w-4" />Deactivate</> : <><Power className="mr-1 h-4 w-4" />Activate</>}
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteService(service)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="addons" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button onClick={() => openAddon()}><Plus className="mr-2 h-4 w-4" />Add Add-on</Button>
            </div>
            {addons.length === 0 ? <p className="rounded-xl bg-card p-6 text-center text-muted-foreground">No equipment add-ons configured.</p> : addons.map((addon) => (
              <div key={addon._id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{addon.name}</p>
                    <Badge variant={addon.isActive ? 'default' : 'secondary'}>{addon.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{addon.description} · +Rs. {addon.price.toLocaleString('en-IN')} per session</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openAddon(addon)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => deactivateAddon(addon)}>{addon.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteAddon(addon)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingService ? 'Edit' : 'Add'} Physiotherapy Service</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Service name</Label><Input value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Session category</Label><Input value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })} placeholder="Assessment / Rehab" /></div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" value={getDurationHours(serviceForm.durationMinutes)} onChange={(event) => setServiceForm(updateDuration(serviceForm, 'hours', event.target.value))} aria-label="Duration hours" />
                <Input type="number" min="0" max="59" value={getDurationMinutesPart(serviceForm.durationMinutes)} onChange={(event) => setServiceForm(updateDuration(serviceForm, 'minutes', event.target.value))} aria-label="Duration minutes" />
              </div>
              <p className="text-xs text-muted-foreground">{formatDuration(serviceForm.durationMinutes)}</p>
            </div>
            <div className="space-y-2"><Label>Price per session</Label><Input type="number" min="0" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceForm.isActive} onChange={(event) => setServiceForm({ ...serviceForm, isActive: event.target.checked })} />Active for patient bookings</label>
          </div>
          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="font-semibold">Optional Package Settings</p>
            {serviceForm.packages.map((option: any, index: number) => (
              <div key={option.sessions} className="grid items-center gap-2 sm:grid-cols-[120px_1fr_1fr]">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={option.isActive} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, i: number) => i === index ? { ...item, isActive: event.target.checked } : item) })} />{option.sessions} sessions</label>
                <Input placeholder="Discount %" type="number" min="0" max="100" value={option.discountPercentage} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, i: number) => i === index ? { ...item, discountPercentage: event.target.value } : item) })} />
                <Input placeholder="Custom price (optional)" type="number" min="0" value={option.customPrice} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, i: number) => i === index ? { ...item, customPrice: event.target.value } : item) })} />
              </div>
            ))}
          </div>
          <Button disabled={saving} onClick={saveService}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Service</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAddon ? 'Edit' : 'Add'} Equipment Add-on</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Add-on name</Label><Input value={addonForm.name} onChange={(event) => setAddonForm({ ...addonForm, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={addonForm.description} onChange={(event) => setAddonForm({ ...addonForm, description: event.target.value })} /></div>
            <div className="space-y-2"><Label>Price per session</Label><Input type="number" min="0" value={addonForm.price} onChange={(event) => setAddonForm({ ...addonForm, price: event.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addonForm.isActive} onChange={(event) => setAddonForm({ ...addonForm, isActive: event.target.checked })} />Active for patient bookings</label>
          </div>
          <Button disabled={saving} onClick={saveAddon}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Add-on</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}

