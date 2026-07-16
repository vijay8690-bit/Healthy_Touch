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
import type { CaretakerAddon, CaretakerService } from '@/services/caretaker-catalog.service';

const packageTypes = [
  { packageType: 'hourly', label: 'Short', shortLabel: '2-4 hr', durationHours: 2, description: '2-4 hrs - basic assistance', priceUnit: 'shift' },
  { packageType: '12_hours', label: 'Day', shortLabel: '8-12 hr', durationHours: 12, description: '8-12 hrs - daily care', priceUnit: 'shift' },
  { packageType: '24_hours', label: 'Full', shortLabel: '24 hr', durationHours: 24, description: '24 hrs - round-the-clock care', priceUnit: 'day' },
  { packageType: 'weekly', label: 'Weekly', shortLabel: '7 days', durationHours: 168, description: '7 days - continuous care', priceUnit: 'week' },
  { packageType: 'monthly', label: 'Monthly', shortLabel: '30 days', durationHours: 720, description: '30 days - long-term care', priceUnit: 'month' },
];

const emptyService = {
  serviceName: '',
  description: '',
  category: 'Elder Care',
  handlesText: 'Elder - Post-op',
  tags: 'Hindi, Female patient pref.',
  defaultGenderPreference: 'Any',
  shiftType: 'Day Shift',
  durationHours: '8',
  basePrice: '',
  basePriceUnit: 'shift',
  isActive: true,
  packages: packageTypes.map((item) => ({ ...item, price: '', isPopular: false, isActive: false })),
};

const emptyAddon = { addOnName: '', description: '', price: '', isActive: true };

export default function CaretakerCatalogManager() {
  const { toast } = useToast();
  const [services, setServices] = useState<CaretakerService[]>([]);
  const [addons, setAddons] = useState<CaretakerAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceForm, setServiceForm] = useState<any>(emptyService);
  const [addonForm, setAddonForm] = useState<any>(emptyAddon);
  const [editingService, setEditingService] = useState<CaretakerService | null>(null);
  const [editingAddon, setEditingAddon] = useState<CaretakerAddon | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [serviceResponse, addonResponse] = await Promise.all([
        adminService.getCaretakerServices(),
        adminService.getCaretakerAddons(),
      ]);
      setServices(serviceResponse.services || []);
      setAddons(addonResponse.addons || []);
    } catch (error: any) {
      toast({ title: 'Unable to load caretaker catalogue', description: error.response?.data?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const editService = (service?: CaretakerService) => {
    setEditingService(service || null);
    setServiceForm(service ? {
      ...service,
      tags: (service.tags || []).join(', '),
      durationHours: String(service.durationHours),
      basePrice: String(service.basePrice),
      packages: packageTypes.map((fallback) => {
        const item = service.packages?.find((value) => value.packageType === fallback.packageType);
        return item ? {
          ...fallback,
          ...item,
          label: item.label || fallback.label,
          shortLabel: item.shortLabel || fallback.shortLabel,
          description: item.description || fallback.description,
          priceUnit: item.priceUnit || fallback.priceUnit,
          price: String(item.price),
        } : { ...fallback, price: '', isPopular: false, isActive: false };
      }),
    } : { ...emptyService, packages: emptyService.packages.map((item) => ({ ...item })) });
    setServiceOpen(true);
  };

  const editAddon = (addon?: CaretakerAddon) => {
    setEditingAddon(addon || null);
    setAddonForm(addon ? { ...addon, price: String(addon.price) } : { ...emptyAddon });
    setAddonOpen(true);
  };

  const buildServicePayload = (source: any) => ({
    ...source,
    durationHours: Number(source.durationHours),
    basePrice: Number(source.basePrice),
    tags: String(source.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    packages: (source.packages || []).filter((item: any) => item.isActive).map((item: any) => ({
      ...item,
      durationHours: Number(item.durationHours),
      price: Number(item.price),
    })),
  });

  const saveService = async () => {
    try {
      const payload = buildServicePayload(serviceForm);
      if (editingService) await adminService.updateCaretakerService(editingService._id, payload);
      else await adminService.createCaretakerService(payload);
      setServiceOpen(false);
      await load();
      toast({ title: 'Caretaker service saved' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.response?.data?.message, variant: 'destructive' });
    }
  };

  const saveAddon = async () => {
    try {
      const payload = { ...addonForm, price: Number(addonForm.price) };
      if (editingAddon) await adminService.updateCaretakerAddon(editingAddon._id, payload);
      else await adminService.createCaretakerAddon(payload);
      setAddonOpen(false);
      await load();
      toast({ title: 'Caretaker add-on saved' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.response?.data?.message, variant: 'destructive' });
    }
  };

  const toggleService = async (service: CaretakerService) => {
    if (service.isActive) {
      await adminService.deactivateCaretakerService(service._id);
      toast({ title: 'Caretaker service deactivated' });
    } else {
      await adminService.updateCaretakerService(service._id, buildServicePayload({ ...service, tags: service.tags || [], isActive: true }));
      toast({ title: 'Caretaker service activated' });
    }
    await load();
  };

  const toggleAddon = async (addon: CaretakerAddon) => {
    if (addon.isActive) {
      await adminService.deactivateCaretakerAddon(addon._id);
      toast({ title: 'Caretaker add-on deactivated' });
    } else {
      await adminService.updateCaretakerAddon(addon._id, { ...addon, isActive: true });
      toast({ title: 'Caretaker add-on activated' });
    }
    await load();
  };

  const deleteService = async (service: CaretakerService) => {
    if (!window.confirm(`Delete "${service.serviceName}" permanently?`)) return;
    await adminService.deleteCaretakerService(service._id);
    toast({ title: 'Caretaker service deleted' });
    await load();
  };

  const deleteAddon = async (addon: CaretakerAddon) => {
    if (!window.confirm(`Delete "${addon.addOnName}" permanently?`)) return;
    await adminService.deleteCaretakerAddon(addon._id);
    toast({ title: 'Caretaker add-on deleted' });
    await load();
  };

  return (
    <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4 md:p-6">
      <h2 className="text-xl font-bold">Caretaker Catalogue Management</h2>
      <p className="mb-5 text-sm text-muted-foreground">Shift-based home care services, packages and add-ons.</p>
      {loading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      ) : (
        <Tabs defaultValue="services">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
            <TabsTrigger value="addons">Add-ons ({addons.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="services" className="space-y-3 pt-4">
            <div className="flex justify-end">
              <Button className="w-full sm:w-auto" onClick={() => editService()}><Plus className="mr-2 h-4 w-4" />Add Service</Button>
            </div>
            {services.map((service) => (
              <div key={service._id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {service.serviceName} <Badge variant={service.isActive ? 'default' : 'secondary'}>{service.isActive ? 'Active' : 'Inactive'}</Badge>
                  </p>
                  <p className="break-words text-sm text-muted-foreground">{service.handlesText || service.category} - {service.shiftType} - {service.durationHours} hrs - Rs. {service.basePrice}/{service.basePriceUnit || 'shift'}</p>
                  {Boolean(service.tags?.length) && <p className="mt-1 text-xs text-muted-foreground">{service.tags?.join(' - ')}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => editService(service)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggleService(service)}><Power className="mr-1 h-4 w-4" />{service.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteService(service)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="addons" className="space-y-3 pt-4">
            <div className="flex justify-end">
              <Button className="w-full sm:w-auto" onClick={() => editAddon()}><Plus className="mr-2 h-4 w-4" />Add Add-on</Button>
            </div>
            {addons.map((addon) => (
              <div key={addon._id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:justify-between">
                <p className="break-words">
                  <span className="font-semibold">{addon.addOnName}</span> <Badge variant={addon.isActive ? 'default' : 'secondary'}>{addon.isActive ? 'Active' : 'Inactive'}</Badge> <span className="text-sm text-muted-foreground">+Rs. {addon.price}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => editAddon(addon)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleAddon(addon)}>{addon.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteAddon(addon)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
      <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Caretaker Service</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Service name</Label><Input value={serviceForm.serviceName} onChange={(event) => setServiceForm({ ...serviceForm, serviceName: event.target.value })} /></div>
            <div><Label>Category</Label><Input value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })} /></div>
            <div><Label>Handles text</Label><Input placeholder="Elder - Post-op" value={serviceForm.handlesText || ''} onChange={(event) => setServiceForm({ ...serviceForm, handlesText: event.target.value })} /></div>
            <div><Label>Tags</Label><Input placeholder="Hindi, Dementia trained" value={serviceForm.tags || ''} onChange={(event) => setServiceForm({ ...serviceForm, tags: event.target.value })} /></div>
            <div>
              <Label>Default gender</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={serviceForm.defaultGenderPreference || 'Any'} onChange={(event) => setServiceForm({ ...serviceForm, defaultGenderPreference: event.target.value })}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Any">Any</option>
              </select>
            </div>
            <div><Label>Shift type</Label><Input value={serviceForm.shiftType} onChange={(event) => setServiceForm({ ...serviceForm, shiftType: event.target.value })} /></div>
            <div><Label>Duration hours</Label><Input type="number" value={serviceForm.durationHours} onChange={(event) => setServiceForm({ ...serviceForm, durationHours: event.target.value })} /></div>
            <div><Label>Base price</Label><div className="grid grid-cols-[1fr_110px] gap-2"><Input type="number" value={serviceForm.basePrice} onChange={(event) => setServiceForm({ ...serviceForm, basePrice: event.target.value })} /><Input value={serviceForm.basePriceUnit || 'shift'} onChange={(event) => setServiceForm({ ...serviceForm, basePriceUnit: event.target.value })} /></div></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} /></div>
          </div>
          <div className="space-y-3 rounded-xl border p-3">
            {serviceForm.packages.map((pkg: any, index: number) => (
              <div key={pkg.packageType} className="grid gap-2 rounded-lg border p-3">
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={pkg.isActive} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, isActive: event.target.checked } : item) })} />Active package</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Label" value={pkg.label || ''} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, label: event.target.value } : item) })} />
                  <Input placeholder="Subtitle" value={pkg.shortLabel || ''} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, shortLabel: event.target.value } : item) })} />
                  <Input type="number" placeholder="Hours" value={pkg.durationHours} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, durationHours: event.target.value } : item) })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                  <Input type="number" placeholder="Package price" value={pkg.price} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, price: event.target.value } : item) })} />
                  <Input placeholder="Unit" value={pkg.priceUnit || ''} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, priceUnit: event.target.value } : item) })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pkg.isPopular} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, isPopular: event.target.checked } : item) })} />Popular</label>
                </div>
                <Textarea placeholder="Package description" value={pkg.description || ''} onChange={(event) => setServiceForm({ ...serviceForm, packages: serviceForm.packages.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, description: event.target.value } : item) })} />
              </div>
            ))}
          </div>
          <Button className="w-full sm:w-auto" onClick={saveService}>Save Service</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={addonOpen} onOpenChange={setAddonOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Caretaker Add-on</DialogTitle></DialogHeader>
          <Label>Name</Label>
          <Input value={addonForm.addOnName} onChange={(event) => setAddonForm({ ...addonForm, addOnName: event.target.value })} />
          <Label>Description</Label>
          <Textarea value={addonForm.description} onChange={(event) => setAddonForm({ ...addonForm, description: event.target.value })} />
          <Label>Price</Label>
          <Input type="number" value={addonForm.price} onChange={(event) => setAddonForm({ ...addonForm, price: event.target.value })} />
          <Button onClick={saveAddon}>Save Add-on</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
