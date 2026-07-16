import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminSidebarLinks } from '@/components/layout/AdminSidebarLinks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  createLegalDocument,
  deleteLegalDocument,
  getAdminLegalDocuments,
  getLegalDocumentPath,
  MOU_DOCUMENTS,
  MOU_DOCUMENT_SLUGS,
  updateLegalDocument,
  type LegalDocument,
} from '@/services/legalDocument.service';

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getMouDefinition = (slug: string) => MOU_DOCUMENTS.find((doc) => doc.slug === slug);

export default function AdminLegalDocuments() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [originalSlugs, setOriginalSlugs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: MOU_DOCUMENTS[0].title,
    slug: MOU_DOCUMENTS[0].slug,
    category: 'mou',
    content: '',
    version: 1,
    isActive: true,
  });

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const loaded = await getAdminLegalDocuments();
      setDocuments(loaded);
      setOriginalSlugs(Object.fromEntries(loaded.map((doc) => [doc._id, doc.slug])));
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to load legal documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const updateLocal = (id: string, patch: Partial<LegalDocument>) => {
    setDocuments((prev) => prev.map((doc) => (doc._id === id ? { ...doc, ...patch } : doc)));
  };

  const saveDocument = async (doc: LegalDocument) => {
    try {
      setSavingSlug(doc.slug);
      const updated = await updateLegalDocument(originalSlugs[doc._id] || doc.slug, {
        title: getMouDefinition(doc.slug)?.title || doc.title,
        slug: doc.slug,
        category: 'mou',
        content: doc.content || '',
        version: Number(doc.version || 1),
        isActive: doc.isActive,
      });
      setDocuments((prev) => prev.map((item) => (item._id === updated._id ? updated : item)).sort((a, b) => a.title.localeCompare(b.title)));
      setOriginalSlugs((prev) => ({ ...prev, [updated._id]: updated.slug }));
      toast({ title: 'Saved', description: `${doc.title} has been updated.` });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error?.message || 'Could not save document', variant: 'destructive' });
    } finally {
      setSavingSlug(null);
    }
  };

  const createDocument = async () => {
    const slug = slugify(newDocument.slug);
    const definition = getMouDefinition(slug);
    const title = definition?.title || '';
    const category = 'mou';

    if (!definition) {
      toast({ title: 'Invalid page', description: 'Only Terms & Conditions and Privacy Policy can be added.', variant: 'destructive' });
      return;
    }

    if (documents.some((doc) => doc.slug === slug && doc.isActive)) {
      toast({ title: 'Already active', description: `${title} is already added.`, variant: 'destructive' });
      return;
    }

    try {
      setSavingSlug(slug);
      const created = await createLegalDocument(slug, {
        title,
        slug,
        category,
        content: newDocument.content,
        version: Number(newDocument.version || 1),
        isActive: newDocument.isActive,
      });
      setDocuments((prev) => {
        const withoutCurrent = prev.filter((doc) => doc.slug !== created.slug);
        return [...withoutCurrent, created];
      });
      setOriginalSlugs((prev) => ({ ...prev, [created._id]: created.slug }));
      setNewDocument({ title: MOU_DOCUMENTS[0].title, slug: MOU_DOCUMENTS[0].slug, category: 'mou', content: '', version: 1, isActive: true });
      setShowAddDialog(false);
      toast({ title: 'Document added', description: `${created.title} has been created.` });
    } catch (error: any) {
      toast({ title: 'Create failed', description: error?.message || 'Could not create document', variant: 'destructive' });
    } finally {
      setSavingSlug(null);
    }
  };

  const removeDocument = async (doc: LegalDocument) => {
    const confirmed = window.confirm(`Delete "${doc.title}"? This will hide the page and clear its editable content.`);
    if (!confirmed) return;

    try {
      setSavingSlug(doc.slug);
      await deleteLegalDocument(originalSlugs[doc._id] || doc.slug);
      await loadDocuments();
      toast({ title: 'Deleted', description: `${doc.title} has been deleted.` });
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error?.response?.data?.message || error?.message || 'Could not delete document', variant: 'destructive' });
    } finally {
      setSavingSlug(null);
    }
  };

  const orderedDocuments = MOU_DOCUMENT_SLUGS
    .map((slug) => documents.find((doc) => doc.slug === slug))
    .filter(Boolean) as LegalDocument[];

  const inactiveDocuments = orderedDocuments.filter((doc) => !doc.isActive);

  const openAddDialog = () => {
    const next = inactiveDocuments[0] || orderedDocuments[0];
    const definition = getMouDefinition(next?.slug || MOU_DOCUMENTS[0].slug) || MOU_DOCUMENTS[0];
    setNewDocument({
      title: definition.title,
      slug: definition.slug,
      category: 'mou',
      content: next?.content || '',
      version: Number(next?.version || 1),
      isActive: true,
    });
    setShowAddDialog(true);
  };

  return (
    <DashboardLayout
      sidebarLinks={adminSidebarLinks}
      portalName="Admin Portal"
      userName="Admin"
      userInitial="A"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">MOU Documents</h1>
            <p className="mt-1 text-muted-foreground">Manage the two MOU pages used across the portal.</p>
          </div>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Page
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {orderedDocuments.map((doc) => (
              <div key={doc.slug} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={getMouDefinition(doc.slug)?.title || doc.title} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <Input value={doc.slug} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input value="mou" readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Version</Label>
                      <Input type="number" min={1} value={doc.version || 1} onChange={(e) => updateLocal(doc._id, { version: Number(e.target.value || 1) })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Content</Label>
                      <Textarea
                        value={doc.content || ''}
                        onChange={(e) => updateLocal(doc._id, { content: e.target.value })}
                        rows={14}
                        placeholder="Write or paste page content here. Links work as https://example.com or [link text](https://example.com)."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Version {doc.version || 1}{doc.updatedAt ? ` - Updated ${new Date(doc.updatedAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <Switch checked={doc.isActive} onCheckedChange={(checked) => updateLocal(doc._id, { isActive: checked })} />
                      <span className="text-sm">Active</span>
                    </div>
                    <Button variant="outline" size="icon" asChild aria-label="Preview website page">
                      <Link to={getLegalDocumentPath(doc.slug)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => removeDocument(doc)} disabled={savingSlug === doc.slug} aria-label="Delete document">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveDocument(doc)} disabled={savingSlug === doc.slug}>
                      {savingSlug === doc.slug ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add MOU Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Page</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MOU_DOCUMENTS.map((doc) => (
                    <Button
                      key={doc.slug}
                      type="button"
                      variant={newDocument.slug === doc.slug ? 'default' : 'outline'}
                      onClick={() => setNewDocument((prev) => ({ ...prev, title: doc.title, slug: doc.slug }))}
                    >
                      {doc.title}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={newDocument.slug} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value="mou" readOnly />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input type="number" min={1} value={newDocument.version} onChange={(e) => setNewDocument((prev) => ({ ...prev, version: Number(e.target.value || 1) }))} />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={newDocument.content}
                  onChange={(e) => setNewDocument((prev) => ({ ...prev, content: e.target.value }))}
                  rows={12}
                  placeholder="Write or paste page content here. Links work as https://example.com or [link text](https://example.com)."
                />
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Switch checked={newDocument.isActive} onCheckedChange={(checked) => setNewDocument((prev) => ({ ...prev, isActive: checked }))} />
                <span className="text-sm">Active</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={createDocument} disabled={savingSlug === slugify(newDocument.slug || newDocument.title)}>
                  {savingSlug === slugify(newDocument.slug || newDocument.title) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
