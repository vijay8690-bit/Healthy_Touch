import { useEffect, useMemo, useState } from 'react';
import { Beaker, CheckCircle2, Loader2, Plus, Search } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import providerService from '@/services/provider.service';

const emptyForm = {
  labTestId: '',
  price: '',
  originalPrice: '',
  city: '',
  reportTime: '24 hrs',
  fastingRequired: false,
  homeCollection: true,
  status: 'active',
};

export default function ProviderLabMasterTests() {
  const [masterTests, setMasterTests] = useState<any[]>([]);
  const [myTests, setMyTests] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const filteredMasterTests = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return masterTests;
    return masterTests.filter((test) =>
      test.testName?.toLowerCase().includes(term) ||
      test.testId?.toLowerCase().includes(term) ||
      test.category?.toLowerCase().includes(term)
    );
  }, [masterTests, query]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [masterRes, myRes] = await Promise.all([
        providerService.getMasterLabTests(),
        providerService.getMyLabTests(),
      ]);
      setMasterTests(masterRes.tests || []);
      setMyTests(myRes.tests || []);
    } catch (error: any) {
      toast({
        title: 'Unable to load lab tests',
        description: error?.response?.data?.message || error?.message || 'Only approved lab providers can access this page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTest = async () => {
    if (!form.labTestId || !form.price || !form.originalPrice || !form.city || !form.reportTime) {
      toast({ title: 'Please fill test, price, city and report time', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      await providerService.addProviderLabTest({
        ...form,
        price: Number(form.price),
        originalPrice: Number(form.originalPrice),
      });
      toast({ title: 'Lab test saved', description: 'Patients can now see this test when active.' });
      setForm(emptyForm);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTest = async (id: string, patch: any) => {
    try {
      await providerService.updateProviderLabTest(id, patch);
      setMyTests((current) => current.map((item) => item._id === id ? { ...item, ...patch } : item));
      toast({ title: 'Updated' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateLocalTest = (id: string, patch: any) => {
    setMyTests((current) => current.map((item) => item._id === id ? { ...item, ...patch } : item));
  };

  return (
    <DashboardLayout
      sidebarLinks={getProviderSidebarLinks(user)}
      portalName="Add Test From Master"
      userName={user?.name || 'Provider'}
      userInitial={user?.name?.charAt(0) || 'P'}
    >
      <div>
        <h2 className="font-display text-2xl font-bold">Add Test From Master</h2>
        <p className="text-muted-foreground">Select master tests and publish your lab pricing, timing and availability.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="card-healthcare h-fit p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Plus className="h-5 w-5 text-primary" />
              Add Test From Master
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search master tests" className="pl-9" />
              </div>

              <Select value={form.labTestId} onValueChange={(value) => setForm({ ...form, labTestId: value })}>
                <SelectTrigger><SelectValue placeholder="Select master test" /></SelectTrigger>
                <SelectContent>
                  {filteredMasterTests.map((test) => (
                    <SelectItem key={test._id} value={test._id}>
                      {test.testName} ({test.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Selling price" type="number" />
                <Input value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} placeholder="MRP" type="number" />
              </div>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
              <Input value={form.reportTime} onChange={(e) => setForm({ ...form, reportTime: e.target.value })} placeholder="Report time" />

              <div className="grid gap-3 rounded-xl bg-muted/50 p-4">
                <label className="flex items-center justify-between text-sm">
                  Home collection
                  <Switch checked={form.homeCollection} onCheckedChange={(value) => setForm({ ...form, homeCollection: value })} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  Fasting required
                  <Switch checked={form.fastingRequired} onCheckedChange={(value) => setForm({ ...form, fastingRequired: value })} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  Active
                  <Switch checked={form.status === 'active'} onCheckedChange={(value) => setForm({ ...form, status: value ? 'active' : 'inactive' })} />
                </label>
              </div>

              <Button className="w-full" onClick={saveTest} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save Lab Test
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            {myTests.length > 0 ? myTests.map((item) => {
              const master = item.labTestId || {};
              return (
                <div key={item._id} className="card-healthcare p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 flex gap-2">
                        <Badge variant="outline">{master.category}</Badge>
                        <Badge className={item.status === 'active' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}>
                          {item.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{master.testName}</h3>
                      <p className="text-sm text-muted-foreground">{master.parameters?.join(', ')}</p>
                    </div>

                    <div className="grid gap-3 md:w-[420px]">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={item.price}
                          type="number"
                          onChange={(e) => updateLocalTest(item._id, { price: e.target.value })}
                          onBlur={(e) => updateTest(item._id, { price: Number(e.target.value) })}
                        />
                        <Input
                          value={item.originalPrice}
                          type="number"
                          onChange={(e) => updateLocalTest(item._id, { originalPrice: e.target.value })}
                          onBlur={(e) => updateTest(item._id, { originalPrice: Number(e.target.value) })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={item.reportTime}
                          onChange={(e) => updateLocalTest(item._id, { reportTime: e.target.value })}
                          onBlur={(e) => updateTest(item._id, { reportTime: e.target.value })}
                        />
                        <Input
                          value={item.city}
                          onChange={(e) => updateLocalTest(item._id, { city: e.target.value })}
                          onBlur={(e) => updateTest(item._id, { city: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2 rounded-xl bg-muted/50 p-3 text-sm">
                        <label className="flex items-center justify-between">
                          Home collection
                          <Switch checked={item.homeCollection} onCheckedChange={(value) => updateTest(item._id, { homeCollection: value })} />
                        </label>
                        <label className="flex items-center justify-between">
                          Fasting required
                          <Switch checked={item.fastingRequired} onCheckedChange={(value) => updateTest(item._id, { fastingRequired: value })} />
                        </label>
                        <label className="flex items-center justify-between">
                          Active
                          <Switch checked={item.status === 'active'} onCheckedChange={(value) => updateTest(item._id, { status: value ? 'active' : 'inactive' })} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="card-healthcare p-10 text-center">
                <Beaker className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No lab tests added yet</p>
                <p className="text-sm text-muted-foreground">Select tests from the master list to publish your pricing.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
