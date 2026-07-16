import { useEffect, useMemo, useState } from 'react';
import { Users, LayoutDashboard, Briefcase, Calendar, CreditCard, IndianRupee, MessageSquare, Settings, Home, Plus, Pencil, Trash2, Beaker } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import adminService from '@/services/admin.service';
import uploadService from '@/services/upload.service';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';

type TeamMember = {
  _id: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  experience?: string;
  profileLink?: string;
  displayOrder?: number;
  isActive: boolean;
};


const emptyForm = {
  name: '',
  role: '',
  bio: '',
  avatar: '',
  experience: '',
  profileLink: '',
  displayOrder: 0,
  isActive: true,
};

export default function AdminOurTeam() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    [members]
  );

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllTeamMembers();
      setMembers(response.members || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch team members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openCreate = () => {
    setEditingMember(null);
    setFormData(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      role: member.role || '',
      bio: member.bio || '',
      avatar: member.avatar || '',
      experience: member.experience || '',
      profileLink: member.profileLink || '',
      displayOrder: member.displayOrder || 0,
      isActive: member.isActive,
    });
    setOpenForm(true);
  };

  const handleAvatarFileChange = async (file: File | null) => {
    if (!file) {
      toast({
        title: 'Select image',
        description: 'Please choose an avatar image first',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Only image files are allowed for avatar',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await uploadService.uploadSingleFile(file, 'team-members');
      if (response?.success && response?.url) {
        setFormData((prev) => ({ ...prev, avatar: response.url }));
        toast({ title: 'Uploaded', description: 'Avatar uploaded to Cloudinary' });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.response?.data?.message || error.message || 'Could not upload avatar',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role || !formData.bio || !formData.avatar) {
      toast({
        title: 'Missing details',
        description: 'Name, role, bio and avatar URL are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      if (editingMember) {
        await adminService.updateTeamMember(editingMember._id, formData);
        toast({ title: 'Updated', description: 'Team member updated successfully' });
      } else {
        await adminService.createTeamMember(formData);
        toast({ title: 'Created', description: 'Team member added successfully' });
      }

      setOpenForm(false);
      setEditingMember(null);
      setFormData(emptyForm);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save team member',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Delete this team member?');
    if (!confirmDelete) return;

    try {
      await adminService.deleteTeamMember(id);
      toast({ title: 'Deleted', description: 'Team member deleted successfully' });
      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete team member',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      portalName="Admin Portal"
      userName="Admin"
      userInitial="A"
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Our Team Management</h1>
            <p className="text-muted-foreground">Add, edit and manage team members shown on homepage.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Team Member
          </Button>
        </div>

        {loading ? (
          <div className="card-healthcare p-8 text-center text-muted-foreground">Loading team members...</div>
        ) : sortedMembers.length === 0 ? (
          <div className="card-healthcare p-8 text-center text-muted-foreground">No team members added yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedMembers.map((member) => (
              <div key={member._id} className="card-healthcare p-5 space-y-4">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-56 object-cover rounded-xl"
                  loading="lazy"
                />
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold">{member.name}</h3>
                    <Badge variant={member.isActive ? 'default' : 'secondary'}>
                      {member.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                  {member.experience ? <p className="text-xs text-primary font-medium">{member.experience}</p> : null}
                  <p className="text-sm text-muted-foreground line-clamp-3">{member.bio}</p>
                  <p className="text-xs text-muted-foreground">Order: {member.displayOrder || 0}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(member)}>
                    <Pencil className="w-4 h-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(member._id)}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. Ananya Mehta"
              />
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="Founder · Medical Director"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Avatar Upload *</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarFileChange(e.target.files?.[0] || null)}
                />
                {uploadingAvatar ? (
                  <p className="text-sm text-muted-foreground">Uploading avatar to Cloudinary...</p>
                ) : null}
                <Input
                  value={formData.avatar}
                  onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))}
                  placeholder="Avatar URL (auto after upload)"
                />
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar preview"
                    className="w-24 h-24 rounded-lg object-cover border"
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Experience</Label>
              <Input
                value={formData.experience}
                onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
                placeholder="12+ Years"
              />
            </div>

            <div className="space-y-2">
              <Label>Profile Link (optional)</Label>
              <Input
                value={formData.profileLink}
                onChange={(e) => setFormData((prev) => ({ ...prev, profileLink: e.target.value }))}
                placeholder="https://linkedin.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="space-y-2 flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Show on website
              </label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Bio / Details *</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                rows={5}
                placeholder="Detailed profile shown in popup..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
