import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import {
  Beaker,
  Briefcase,
  Calendar,
  CreditCard,
  Home,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import adminService from '@/services/admin.service';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';

type LabTestStatus = 'active' | 'inactive';

type AdminLabTest = {
  _id: string;
  testId: string;
  oldCode?: string;
  testName: string;
  category: 'Basic' | 'Advanced' | 'Package' | string;
  description?: string;
  includes?: string[];
  parameters?: string[];
  city?: string;
  sellingPrice?: number;
  mrp?: number;
  discount?: number;
  reportTime?: string;
  sample?: string;
  fasting?: boolean;
  homeCollection?: boolean;
  recommendedFor?: string[];
  status: LabTestStatus;
};

type LabTestForm = {
  testId: string;
  oldCode: string;
  testName: string;
  category: string;
  description: string;
  includes: string[];
  city: string;
  sellingPrice: string;
  mrp: string;
  discount: string;
  reportTime: string;
  sample: string;
  fasting: string;
  homeCollection: string;
  recommendedFor: string[];
  status: LabTestStatus;
};


const categories = ['Basic', 'Advance', 'Package'];
const pageSizeOptions = [10, 25, 50, 100];
const emptyForm: LabTestForm = {
  testId: '',
  oldCode: '',
  testName: '',
  category: 'Basic',
  description: '',
  includes: [],
  city: '',
  sellingPrice: '',
  mrp: '',
  discount: '',
  reportTime: '',
  sample: '',
  fasting: 'No',
  homeCollection: 'Yes',
  recommendedFor: [],
  status: 'active',
};

const money = (value?: number) => `Rs. ${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
const tagText = (items?: string[]) => (items || []).filter(Boolean).join(', ');
const parseNumber = (value: unknown) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const calculateSellingPrice = (mrp: string | number, discount: string | number) => {
  const baseMrp = Math.max(0, parseNumber(mrp));
  const discountPercent = Math.min(100, Math.max(0, parseNumber(discount)));
  return String(Math.max(0, Math.round(baseMrp - ((baseMrp * discountPercent) / 100))));
};
const calculateDiscount = (mrp: string | number, sellingPrice: string | number) => {
  const baseMrp = Math.max(0, parseNumber(mrp));
  const offer = Math.max(0, parseNumber(sellingPrice));
  if (!baseMrp || offer >= baseMrp) return '0';
  return String(Math.round(((baseMrp - offer) / baseMrp) * 100));
};
const normalizeCategory = (value: string) => {
  const text = String(value || '').trim();
  if (/^advanced$/i.test(text)) return 'Advance';
  if (/^advance$/i.test(text)) return 'Advance';
  if (/^package$/i.test(text)) return 'Package';
  return text || 'Basic';
};
const formatTat = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) return '24';
  return text.replace(/\s*hours?\s*$/i, '').replace(/\s*hrs?\s*$/i, '').trim() || text;
};
const parseExcelBoolean = (value: unknown, defaultValue = false) => {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return defaultValue;
  return ['true', 'yes', 'y', '1', 'active'].includes(text);
};

const knownParameterNames = [
  'Hemoglobin (Hb)',
  'Hemoglobin',
  'RBC Count',
  'WBC Count',
  'Platelet Count',
  'Hematocrit (PCV)',
  'Hematocrit',
  'MCV',
  'MCHC',
  'MCH',
  'RDW-CV',
  'Neutrophils',
  'Lymphocytes',
  'Monocytes',
  'Eosinophils',
  'Basophils',
  'ANC',
  'ALC',
  'MPV',
  'PDW',
  'PCT',
  'P-LCR',
  'Glucose Fasting',
  'Glucose',
  'Creatinine',
  'Urea',
  'Uric Acid',
  'SGOT',
  'SGPT',
  'Bilirubin',
  'Cholesterol',
  'Triglycerides',
  'HDL',
  'LDL',
  'VLDL',
  'TSH',
  'T3',
  'T4',
  'HbA1c',
].sort((a, b) => b.length - a.length);

const splitTags = (text: string) => {
  const normalized = String(text || '').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const directParts = normalized
    .split(/[\n,;|]+|\t+|\s{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (directParts.length > 1) return directParts;

  const found: string[] = [];
  let remaining = ` ${normalized} `;
  knownParameterNames.forEach((name) => {
    const pattern = new RegExp(`(^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'i');
    if (pattern.test(remaining)) {
      found.push(name);
      remaining = remaining.replace(pattern, ' ');
    }
  });

  const leftovers = remaining.trim().split(/\s{2,}/).map((item) => item.trim()).filter(Boolean);
  return found.length ? [...found, ...leftovers] : directParts;
};

const TagInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) => {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const next = splitTags(draft);
    if (!next.length) return;
    onChange(Array.from(new Set([...value, ...next])));
    setDraft('');
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            const next = splitTags(text);
            if (next.length > 1) {
              event.preventDefault();
              onChange(Array.from(new Set([...value, ...next])));
              setDraft('');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={addTag}>Add</Button>
      </div>
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default function AdminLabTests() {
  const { toast } = useToast();
  const [tests, setTests] = useState<AdminLabTest[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [city, setCity] = useState('all');
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTests, setTotalTests] = useState(0);
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editingTest, setEditingTest] = useState<AdminLabTest | null>(null);
  const [form, setForm] = useState<LabTestForm>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAdminLabTests({
        search,
        category,
        status,
        city,
        page,
        limit: pageSize,
      });
      setTests(response.tests || []);
      setTotalTests(Number(response.total || 0));
      setCounts(response.counts || { total: Number(response.total || 0), active: 0, inactive: 0 });
      setCityOptions(response.cities || []);
    } catch (error: any) {
      toast({
        title: 'Unable to load lab tests',
        description: error.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadTests, 250);
    return () => window.clearTimeout(timer);
  }, [search, category, status, city, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, category, status, city, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalTests / pageSize));
  const pageStart = totalTests ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(totalTests, page * pageSize);

  const openCreate = () => {
    setEditingTest(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (test: AdminLabTest) => {
    setEditingTest(test);
    setForm({
      testId: test.testId || '',
      oldCode: test.oldCode || '',
      testName: test.testName || '',
      category: normalizeCategory(test.category || 'Basic'),
      description: test.description || '',
      includes: Array.from(new Set((test.includes?.length ? test.includes : (test.parameters || [])).flatMap((item) => splitTags(item)))),
      city: test.city || '',
      sellingPrice: String(test.sellingPrice ?? calculateSellingPrice(test.mrp ?? 0, test.discount ?? 0)),
      mrp: String(test.mrp ?? ''),
      discount: String(test.discount ?? calculateDiscount(test.mrp ?? 0, test.sellingPrice ?? 0)),
      reportTime: test.reportTime || '',
      sample: test.sample || '',
      fasting: test.fasting ? 'Yes' : 'No',
      homeCollection: test.homeCollection === false ? 'No' : 'Yes',
      recommendedFor: test.recommendedFor || [],
      status: test.status || 'active',
    });
    setOpenForm(true);
  };

  const buildPayload = () => ({
    ...(form.testId.trim() && { testId: form.testId.trim().toUpperCase() }),
    oldCode: form.oldCode.trim(),
    testName: form.testName.trim(),
    category: normalizeCategory(form.category),
    description: form.description.trim(),
    includes: Array.from(new Set(form.includes.flatMap((item) => splitTags(item)))),
    city: form.city.trim(),
    mrp: parseNumber(form.mrp),
    discount: parseNumber(calculateDiscount(form.mrp, form.sellingPrice)),
    sellingPrice: parseNumber(form.sellingPrice),
    reportTime: form.reportTime.trim(),
    sample: form.sample.trim(),
    fasting: form.fasting === 'Yes',
    homeCollection: form.homeCollection === 'Yes',
    recommendedFor: form.recommendedFor,
    status: form.status,
  });

  const getCell = (row: Record<string, any>, names: string[]) => {
    const keys = Object.keys(row);
    const normalized = keys.reduce<Record<string, string>>((map, key) => {
      map[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = key;
      return map;
    }, {});
    for (const name of names) {
      const key = normalized[name.toLowerCase().replace(/[^a-z0-9]/g, '')];
      if (key && row[key] !== undefined && row[key] !== null) return row[key];
    }
    return '';
  };

  const sheetToObjects = (workbook: XLSX.WorkBook) => {
    const sheetName = workbook.SheetNames.find((name) => /^tests?[_\s-]*master$/i.test(name.trim())) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '', raw: false });
    const headerIndex = matrix.findIndex((row) => {
      const normalized = row.map((cell) => String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
      return normalized.includes('testcode') && normalized.some((item) => item.includes('testname')) && normalized.includes('city');
    });

    if (headerIndex < 0) {
      throw new Error('tests_master sheet me Test Code, Test Name aur City header row nahi mili.');
    }

    const headers = matrix[headerIndex].map((cell) => String(cell || '').trim());
    return matrix.slice(headerIndex + 1).map((row, index) => {
      const objectRow = headers.reduce<Record<string, any>>((record, header, cellIndex) => {
        if (header) record[header] = row[cellIndex] ?? '';
        return record;
      }, {});
      objectRow.__rowNum__ = headerIndex + index + 1;
      return objectRow;
    }).filter((row) => {
      const testCode = String(getCell(row, ['Test Code', 'Test_ID', 'Test ID', 'TestId', 'Code']) || '').trim();
      const testName = String(getCell(row, ['Test Name (English)', 'Test_Name', 'Test Name', 'Name', 'testName']) || '').trim();
      const cityValue = String(getCell(row, ['City']) || '').trim();
      return Boolean(testCode && testName && cityValue);
    });
  };

  const rowToPayload = (row: Record<string, any>) => {
    const mrp = parseNumber(getCell(row, ['MRP (₹)', 'MRP', 'Original Price']));
    const offerPrice = parseNumber(getCell(row, ['Offer Price (₹)', 'Offer Price', 'Selling Price', 'Selling_Price']));
    const testName = String(getCell(row, ['Test Name (English)', 'Test_Name', 'Test Name', 'Name', 'testName']) || '').trim();
    const includesRaw = String(getCell(row, ['Includes — Full Parameters', 'Includes - Full Parameters', 'Includes', 'Parameters', 'Tests Included', 'Parameter Included']) || '').trim();
    const payload = {
      rowNumber: Number((row as any).__rowNum__ || 0) + 1,
      testId: String(getCell(row, ['Test Code', 'Test_ID', 'Test ID', 'TestId', 'Code']) || '').trim().toUpperCase(),
      oldCode: String(getCell(row, ['Old Code', 'Previous Code', 'Old Test ID']) || '').trim(),
      testName,
      category: normalizeCategory(String(getCell(row, ['Category']) || 'Basic').trim()),
      description: String(getCell(row, ['Description', 'Desc']) || '').trim(),
      includes: splitTags(includesRaw),
      city: String(getCell(row, ['City']) || '').trim(),
      mrp,
      discount: parseNumber(getCell(row, ['Discount %\n(Auto)', 'Discount % (Auto)', 'Discount', 'Discount %']) || calculateDiscount(mrp, offerPrice)),
      sellingPrice: offerPrice,
      reportTime: formatTat(getCell(row, ['TAT Hrs', 'Report_Time', 'Report Time', 'ReportTime', 'TAT'])),
      sample: String(getCell(row, ['Sample']) || '').trim(),
      fasting: parseExcelBoolean(getCell(row, ['Fasting?', 'Fasting']), false),
      homeCollection: !String(getCell(row, ['Home_Collection', 'Home Collection', 'HomeCollection']) || 'Yes').toLowerCase().startsWith('n'),
      recommendedFor: splitTags(String(getCell(row, ['Recommended_For', 'Recommended For', 'RecommendedFor']) || '')),
    };

    return {
      ...payload,
      discount: parseNumber(calculateDiscount(payload.mrp, payload.sellingPrice)),
      status: (parseExcelBoolean(getCell(row, ['Active?', 'Active', 'Status']), true) ? 'active' : 'inactive') as LabTestStatus,
    };
  };

  const importLabTests = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setSaving(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const rows = sheetToObjects(workbook);
      const payloads = rows.map(rowToPayload);

      if (!payloads.length) {
        toast({ title: 'No valid tests found', description: 'Sheet me rows available nahi hain.', variant: 'destructive' });
        return;
      }

      const response = await adminService.importAdminLabTests(payloads);
      toast({ title: 'Import complete', description: `${response.created || 0} created, ${response.updated || 0} updated.` });
      await loadTests();
    } catch (error: any) {
      const errors = error.response?.data?.errors || [];
      const description = errors.length
        ? errors.slice(0, 4).map((item: any) => `Row ${item.rowNumber}: ${item.errors.join(', ')}`).join(' | ')
        : error.message || 'Please check the Excel file format.';
      toast({ title: 'Import failed', description, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    if (!form.testId.trim()) return 'Test ID is required';
    if (!form.testName.trim()) return 'Test name is required';
    if (!form.category) return 'Category is required';
    if (!form.city.trim()) return 'City is required';
    if (!form.reportTime.trim()) return 'Report time is required';
    if (!form.mrp.trim()) return 'MRP is required';
    if (!form.sellingPrice.trim()) return 'Offer price is required';
    if (parseNumber(form.sellingPrice) < 0 || parseNumber(form.mrp) < 0) return 'Prices cannot be negative';
    const discount = parseNumber(calculateDiscount(form.mrp, form.sellingPrice));
    if (discount < 0 || discount > 100) return 'Discount must be between 0 and 100';
    return '';
  };

  const saveTest = async () => {
    const error = validateForm();
    if (error) {
      toast({ title: 'Fix lab test details', description: error, variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      if (editingTest) {
        await adminService.updateAdminLabTest(editingTest._id, buildPayload());
        toast({ title: 'Lab test updated' });
      } else {
        await adminService.createAdminLabTest(buildPayload());
        toast({ title: 'Lab test created' });
      }
      setOpenForm(false);
      await loadTests();
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (test: AdminLabTest) => {
    const nextStatus = test.status === 'active' ? 'inactive' : 'active';
    try {
      await adminService.updateAdminLabTestStatus(test._id, nextStatus);
      toast({ title: nextStatus === 'active' ? 'Lab test activated' : 'Lab test deactivated' });
      await loadTests();
    } catch (error: any) {
      toast({
        title: 'Status update failed',
        description: error.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const deleteTest = async (test: AdminLabTest) => {
    if (!window.confirm(`Delete ${test.testName}? This is allowed only when no booking exists.`)) return;
    try {
      await adminService.deleteAdminLabTest(test._id);
      toast({ title: 'Lab test deleted' });
      await loadTests();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.message || 'Please deactivate this test if it has bookings.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout sidebarLinks={sidebarLinks} portalName="Admin Portal" userName="Admin" userInitial="A">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Lab Test Management</h1>
            <p className="text-muted-foreground">Manage lab test catalogue, pricing, visibility and booking availability.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importLabTests} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
              Import Excel
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Add Lab Test
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-healthcare p-4">
            <p className="text-sm text-muted-foreground">Total Tests</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </div>
          <div className="card-healthcare p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-primary">{counts.active}</p>
          </div>
          <div className="card-healthcare p-4">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-muted-foreground">{counts.inactive}</p>
          </div>
        </div>

        <div className="card-healthcare grid gap-3 p-4 md:grid-cols-[1fr_200px_200px_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by test name or test ID"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger>
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cityOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : tests.length === 0 ? (
          <div className="card-healthcare p-10 text-center text-muted-foreground">No lab tests found.</div>
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test._id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold">{test.testName}</div>
                        <div className="text-xs text-muted-foreground">{test.testId}{test.oldCode ? ` / ${test.oldCode}` : ''}</div>
                        <div className="max-w-sm truncate text-xs text-muted-foreground">{tagText(test.includes?.length ? test.includes : test.parameters)}</div>
                      </div>
                    </TableCell>
                    <TableCell>{test.category}</TableCell>
                    <TableCell>{test.city || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="font-medium">{money(test.sellingPrice)}</div>
                      <div className="text-xs text-muted-foreground">MRP {money(test.mrp)} / {test.discount || 0}%</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{test.homeCollection === false ? 'Lab only' : 'Home collection'}</div>
                      <div className="text-xs text-muted-foreground">{test.fasting ? 'Fasting' : 'No fasting'} / {test.reportTime || 'N/A'}</div>
                      {test.sample ? <div className="text-xs text-muted-foreground">Sample: {test.sample}</div> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={test.status === 'active' ? 'default' : 'secondary'}>
                        {test.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(test)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(test)}>
                          {test.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteTest(test)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {pageStart}-{pageEnd} of {totalTests} tests</span>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</Button>
                <span className="px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTest ? 'Edit Lab Test' : 'Add Lab Test'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Test Code *</Label>
              <Input
                value={form.testId}
                onChange={(event) => setForm((current) => ({ ...current, testId: event.target.value }))}
                placeholder="BAS001"
              />
            </div>
            <div className="space-y-2">
              <Label>Old Code</Label>
              <Input
                value={form.oldCode}
                onChange={(event) => setForm((current) => ({ ...current, oldCode: event.target.value }))}
                placeholder="Previous Test_ID if any"
              />
            </div>
            <div className="space-y-2">
              <Label>Test Name (English) *</Label>
              <Input
                value={form.testName}
                onChange={(event) => setForm((current) => ({ ...current, testName: event.target.value }))}
                placeholder="CBC (Complete Blood Count)"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Short test description"
              />
            </div>
            <TagInput
              label="Includes — Full Parameters"
              value={form.includes}
              onChange={(value) => setForm((current) => ({ ...current, includes: value }))}
              placeholder="Red Blood Cell Count (RBC), Hemoglobin (Hb)"
            />
            <div className="space-y-2">
              <Label>City *</Label>
              <Input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Hindaun City"
              />
            </div>
            <div className="space-y-2">
              <Label>TAT Hrs *</Label>
              <Input
                value={form.reportTime}
                onChange={(event) => setForm((current) => ({ ...current, reportTime: event.target.value }))}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label>Sample</Label>
              <Input
                value={form.sample}
                onChange={(event) => setForm((current) => ({ ...current, sample: event.target.value }))}
                placeholder="Blood"
              />
            </div>
            <div className="space-y-2">
              <Label>Offer Price (₹) *</Label>
              <Input
                type="number"
                min="0"
                value={form.sellingPrice}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  sellingPrice: event.target.value,
                  discount: calculateDiscount(current.mrp, event.target.value),
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Discount auto: {calculateDiscount(form.mrp, form.sellingPrice)}%
              </p>
            </div>
            <div className="space-y-2">
              <Label>MRP (₹) *</Label>
              <Input
                type="number"
                min="0"
                value={form.mrp}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  mrp: event.target.value,
                  discount: calculateDiscount(event.target.value, current.sellingPrice),
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount % (Auto)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={calculateDiscount(form.mrp, form.sellingPrice)}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Recommended For</Label>
              <Input
                value={form.recommendedFor.join(', ')}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  recommendedFor: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                }))}
                placeholder="Adults, Seniors"
              />
            </div>
            <div className="space-y-2">
              <Label>Fasting?</Label>
              <Select value={form.fasting} onValueChange={(value) => setForm((current) => ({ ...current, fasting: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Home Collection</Label>
              <Select value={form.homeCollection} onValueChange={(value) => setForm((current) => ({ ...current, homeCollection: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value: LabTestStatus) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveTest} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
