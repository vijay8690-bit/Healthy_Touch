import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, Cake, FileText, LayoutDashboard, Mail, Phone, Search, ShoppingCart, User, UserPlus, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { readFamilyMembers, writeFamilyMembers, type FamilyMember } from '@/utils/familyMembers';

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/patient/dashboard' },
  { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
  { icon: FileText, label: 'Medical Records', href: '/patient/records' },
  { icon: Search, label: 'Find Providers', href: '/patient/providers' },
  { icon: ShoppingCart, label: 'Coins Cart', href: '/patient/coins' },
  { icon: Users, label: 'My Family & Friends', href: '/patient/family-friends' },
  { icon: User, label: 'Profile', href: '/patient/profile' },
];

const emptyFamilyForm = {
  name: '',
  relation: '',
  gender: '',
  dateOfBirth: '',
  age: '',
  mobile: '',
  email: '',
  medicalNotes: '',
};

const relationOptions = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Friend', 'Other'];

export default function PatientFamilyFriends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { count: notificationCount } = useNotificationCount();
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyForm, setFamilyForm] = useState(emptyFamilyForm);

  useEffect(() => {
    setFamilyMembers(readFamilyMembers(user));
  }, [user?._id, user?.email]);

  const handleFamilyInputChange = (field: keyof typeof emptyFamilyForm, value: string) => {
    setFamilyForm(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age >= 0 ? String(age) : '';
  };

  const handleDateOfBirthChange = (value: string) => {
    setFamilyForm(prev => ({
      ...prev,
      dateOfBirth: value,
      age: calculateAge(value),
    }));
  };

  const handleAddFamilyMember = (event: FormEvent) => {
    event.preventDefault();

    if (!familyForm.name.trim() || !familyForm.relation || !familyForm.gender || !familyForm.mobile.trim()) {
      toast({
        title: 'Missing details',
        description: 'Please enter name, relation, gender and mobile number.',
        variant: 'destructive',
      });
      return;
    }

    const nextMembers = [
      ...familyMembers,
      {
        id: `${Date.now()}`,
        ...familyForm,
        name: familyForm.name.trim(),
        mobile: familyForm.mobile.trim(),
        email: familyForm.email.trim(),
        medicalNotes: familyForm.medicalNotes.trim(),
      },
    ];

    setFamilyMembers(nextMembers);
    writeFamilyMembers(user, nextMembers);
    setFamilyForm(emptyFamilyForm);
    setShowFamilyDialog(false);
    toast({
      title: 'Member added',
      description: `${familyForm.name.trim()} has been added to My Family & Friends.`,
    });
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      portalName="My Family & Friends"
      userName={user?.name || 'Patient'}
      userInitial={user?.name?.charAt(0) || 'P'}
      notificationCount={notificationCount}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">My Family & Friends</h1>
            <p className="text-sm text-muted-foreground">Add family members and keep their healthcare details handy.</p>
          </div>
          <Button type="button" onClick={() => setShowFamilyDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Member
          </Button>
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
          Add parents, children or friends once, then use their details while booking care.
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {familyMembers.map(member => (
            <div key={member.id} className="card-healthcare p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{member.name}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{member.relation}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Cake className="h-4 w-4 text-primary" />
                      <span>{member.age ? `${member.age} years` : 'Age not added'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span>{member.gender || 'Gender not added'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{member.mobile || 'Mobile not added'}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{member.email || 'Email not added'}</span>
                    </div>
                    {member.medicalNotes && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>{member.medicalNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Family Member</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddFamilyMember} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="family-name">Name *</Label>
                <Input
                  id="family-name"
                  value={familyForm.name}
                  onChange={(event) => handleFamilyInputChange('name', event.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="family-relation">Relation *</Label>
                <select
                  id="family-relation"
                  value={familyForm.relation}
                  onChange={(event) => handleFamilyInputChange('relation', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Select relation</option>
                  {relationOptions.map(relation => (
                    <option key={relation} value={relation}>{relation}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Gender *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['Male', 'Female'].map(gender => (
                    <label
                      key={gender}
                      className={`flex h-10 cursor-pointer items-center justify-center rounded-md border text-sm transition-colors ${
                        familyForm.gender === gender
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="family-gender"
                        value={gender}
                        checked={familyForm.gender === gender}
                        onChange={(event) => handleFamilyInputChange('gender', event.target.value)}
                        className="sr-only"
                        required
                      />
                      {gender}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="family-dob">Date of Birth</Label>
                <Input
                  id="family-dob"
                  type="date"
                  value={familyForm.dateOfBirth}
                  onChange={(event) => handleDateOfBirthChange(event.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="family-age">Age</Label>
                <Input
                  id="family-age"
                  type="number"
                  min="0"
                  max="120"
                  value={familyForm.age}
                  onChange={(event) => handleFamilyInputChange('age', event.target.value)}
                  placeholder="Auto-filled from DOB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="family-mobile">Mobile Number *</Label>
                <Input
                  id="family-mobile"
                  type="tel"
                  value={familyForm.mobile}
                  onChange={(event) => handleFamilyInputChange('mobile', event.target.value)}
                  placeholder="10 digit mobile number"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="family-email">Email ID</Label>
                <Input
                  id="family-email"
                  type="email"
                  value={familyForm.email}
                  onChange={(event) => handleFamilyInputChange('email', event.target.value)}
                  placeholder="Optional email address"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="family-notes">Medical Notes</Label>
                <Input
                  id="family-notes"
                  value={familyForm.medicalNotes}
                  onChange={(event) => handleFamilyInputChange('medicalNotes', event.target.value)}
                  placeholder="Diabetes patient, allergies, BP, etc."
                />
              </div>
            </div>

            <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-sm text-muted-foreground">
              Family members added here will stay available on this device for faster booking and record access.
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setShowFamilyDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <UserPlus className="mr-2 h-4 w-4" />
                Save Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
