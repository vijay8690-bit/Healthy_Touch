import { useState, useEffect } from 'react';
import caretakerService from '@/services/caretaker.service';
import adminService from '@/services/admin.service';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Eye,
  Users,
  Activity,
  Award,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  LayoutDashboard,
  IndianRupee,
  Bell,
  Settings,
  Home,
  LogOut,
  Menu,
  Stethoscope,
  MessageSquare,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import NotificationDropdown from '@/components/NotificationDropdown';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';


// Types
interface Address {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface AssignedPatient {
  patientId: {
    _id: string;
    name: string;
    email: string;
    mobile: string;
  };
  assignedDate: string;
  status: 'active' | 'completed';
  notes?: string;
}

interface Caretaker {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'Male' | 'Female' | 'Other';
  address?: Address;
  specialization: string[];
  experience: number;
  qualifications?: string[];
  availability: 'available' | 'assigned' | 'on_leave' | 'unavailable';
  assignedPatients?: AssignedPatient[];
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
}

interface CaretakerFormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  age: number | string;
  gender: 'male' | 'female' | 'other';
  street: string;
  city: string;
  state: string;
  pincode: string;
  specialization: string;
  experience: number | string;
  qualifications: string;
}

interface Patient {
  _id: string;
  name: string;
  email: string;
  mobile: string;
}

export default function AdminCaretakers() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [savingCaretaker, setSavingCaretaker] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    onLeave: 0,
    active: 0,
    inactive: 0,
  });

  // Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);

  const [selectedCaretaker, setSelectedCaretaker] = useState<Caretaker | null>(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');

  const [formData, setFormData] = useState<CaretakerFormData>({
    name: '',
    email: '',
    mobile: '',
    password: '',
    age: '',
    gender: 'male',
    street: '',
    city: '',
    state: '',
    pincode: '',
    specialization: '',
    experience: '',
    qualifications: '',
  });

  // Calculate stats from local data
  const calculateStats = (data: Caretaker[]) => {
    return {
      total: data.length,
      available: data.filter(c => c.availability === 'available').length,
      assigned: data.filter(c => c.availability === 'assigned').length,
      onLeave: data.filter(c => c.availability === 'on_leave').length,
      active: data.filter(c => c.status === 'active').length,
      inactive: data.filter(c => c.status === 'inactive').length,
    };
  };

  // Fetch Caretakers (Dynamic)
  const fetchCaretakers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        availability: availabilityFilter !== 'all' ? availabilityFilter : undefined,
        limit: 10,
      };
      const res = await caretakerService.getAllCaretakers(params);
      setCaretakers(res.caretakers || []);
      setTotalPages(res.totalPages || 1);
      setStats(res.stats || calculateStats(res.caretakers || []));
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to fetch caretakers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Patients (Dynamic)
  const fetchPatients = async () => {
    try {
      const res = await adminService.getAllUsers({ role: 'patient', limit: 100 });
      setPatients(res.users || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to fetch patients', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchCaretakers();
    fetchPatients();
    // eslint-disable-next-line
  }, [currentPage, searchTerm, statusFilter, availabilityFilter]);

  const handleCreateCaretaker = async () => {
    if (savingCaretaker) return;
    if (!formData.name || !formData.email || !formData.mobile || !formData.password || !formData.age || !formData.specialization || !formData.experience) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields (marked with *)',
        variant: 'destructive',
      });
      return;
    }
    if (formData.password.length < 8) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }
    try {
      setSavingCaretaker(true);
      const payload = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        age: Number(formData.age),
        gender: formData.gender,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        specialization: formData.specialization.split(',').map(s => s.trim()),
        experience: Number(formData.experience),
        qualifications: formData.qualifications ? formData.qualifications.split(',').map(q => q.trim()).filter(Boolean) : [],
      };
      await caretakerService.createCaretaker(payload);
      toast({ title: 'Success', description: 'Caretaker created successfully' });
      setShowCreateDialog(false);
      resetForm();
      fetchCaretakers();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || error?.message || 'Failed to create caretaker', variant: 'destructive' });
    } finally {
      setSavingCaretaker(false);
    }
  };

  const handleUpdateCaretaker = async () => {
    if (savingCaretaker) return;
    if (!selectedCaretaker) return;
    try {
      setSavingCaretaker(true);
      const payload = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        age: Number(formData.age),
        gender: formData.gender,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        specialization: formData.specialization.split(',').map(s => s.trim()),
        experience: Number(formData.experience),
        qualifications: formData.qualifications ? formData.qualifications.split(',').map(q => q.trim()).filter(Boolean) : [],
      };
      await caretakerService.updateCaretaker(selectedCaretaker._id, payload);
      toast({ title: 'Success', description: 'Caretaker updated successfully' });
      setShowEditDialog(false);
      resetForm();
      fetchCaretakers();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || error?.message || 'Failed to update caretaker', variant: 'destructive' });
    } finally {
      setSavingCaretaker(false);
    }
  };

  // Delete Caretaker (Mock - no backend needed)
  const handleDeleteCaretaker = async () => {
    if (!selectedCaretaker) return;
    // Check for active assignments
    const hasActiveAssignments = selectedCaretaker.assignedPatients?.some(p => p.status === 'active');
    if (hasActiveAssignments) {
      toast({
        title: 'Cannot Delete',
        description: 'Caretaker has active patient assignments',
        variant: 'destructive',
      });
      return;
    }
    try {
      await caretakerService.deleteCaretaker(selectedCaretaker._id);
      toast({ title: 'Success', description: 'Caretaker deleted successfully' });
      setShowDeleteDialog(false);
      setSelectedCaretaker(null);
      fetchCaretakers();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete caretaker', variant: 'destructive' });
    }
  };

  // Assign Patient (Mock - no backend needed)
  const handleAssignPatient = async () => {
    if (!selectedCaretaker || !selectedPatient) return;
    try {
      await caretakerService.assignCaretakerToPatient(selectedCaretaker._id, {
        patientId: selectedPatient,
        notes: assignmentNotes,
      });
      toast({ title: 'Success', description: 'Patient assigned successfully' });
      setShowAssignDialog(false);
      setSelectedPatient('');
      setAssignmentNotes('');
      fetchCaretakers();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to assign patient', variant: 'destructive' });
    }
  };

  // Unassign Patient (Mock - no backend needed)
  const handleUnassignPatient = async (patientId: string) => {
    if (!selectedCaretaker) return;
    try {
      await caretakerService.unassignCaretakerFromPatient(selectedCaretaker._id, patientId);
      toast({ title: 'Success', description: 'Patient unassigned successfully' });
      fetchCaretakers();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to unassign patient', variant: 'destructive' });
    }
  };

  // Form Helpers
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      mobile: '',
      password: '',
      age: '',
      gender: 'male',
      street: '',
      city: '',
      state: '',
      pincode: '',
      specialization: '',
      experience: '',
      qualifications: '',
    });
  };

  const openEditDialog = (caretaker: Caretaker) => {
    setSelectedCaretaker(caretaker);
    setFormData({
      name: caretaker.name,
      email: caretaker.email,
      mobile: caretaker.mobile,
      password: '',
      age: caretaker.age,
      gender: caretaker.gender,
      street: caretaker.address?.street || '',
      city: caretaker.address?.city || '',
      state: caretaker.address?.state || '',
      pincode: caretaker.address?.pincode || '',
      specialization: caretaker.specialization.join(', '),
      experience: caretaker.experience,
      qualifications: caretaker.qualifications?.join(', ') || '',
    });
    setShowEditDialog(true);
  };

  const getAvailabilityBadge = (availability: string) => {
    const styles = {
      available: 'bg-green-500/10 text-green-500 border-green-500/20',
      assigned: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      on_leave: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      unavailable: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return styles[availability as keyof typeof styles] || styles.unavailable;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'status-approved',
      pending: 'status-pending',
      inactive: 'status-rejected',
      suspended: 'status-rejected',
    };
    return styles[status as keyof typeof styles] || '';
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border hidden lg:block">
            <Link to="/" className="flex items-center gap-2">
              <img src="/healthy-touch-logo.png" className="h-12" alt="Healthy Touch" />
            </Link>
          </div>

          {/* Navigation */}
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

          {/* Logout */}
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

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        {/* Header */}
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
                <h1 className="font-display font-semibold text-lg">Caretaker Management</h1>
                <p className="text-sm text-muted-foreground">Manage caretakers and assignments</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                A
              </div> */}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 md:p-6">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl">Caretaker Management</h1>
          <p className="text-muted-foreground">Manage caretakers and patient assignments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Caretaker
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-healthcare p-4"
        >
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-display text-2xl font-bold mt-1">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-healthcare p-4"
        >
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="font-display text-2xl font-bold mt-1 text-green-500">{stats.available}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-healthcare p-4"
        >
          <p className="text-sm text-muted-foreground">Assigned</p>
          <p className="font-display text-2xl font-bold mt-1 text-blue-500">{stats.assigned}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-healthcare p-4"
        >
          <p className="text-sm text-muted-foreground">On Leave</p>
          <p className="font-display text-2xl font-bold mt-1 text-yellow-500">{stats.onLeave}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-healthcare p-4"
        >
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="font-display text-2xl font-bold mt-1 text-primary">{stats.active}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-healthcare p-4"
        >
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="font-display text-2xl font-bold mt-1 text-muted-foreground">
            {stats.inactive}
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card-healthcare p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Availability</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setAvailabilityFilter('all');
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Caretakers Table */}
      <div className="card-healthcare overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading caretakers...</p>
          </div>
        ) : caretakers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No caretakers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Specialization</th>
                  <th className="text-left p-4 font-medium">Experience</th>
                  <th className="text-left p-4 font-medium">Availability</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Patients</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {caretakers.map((caretaker) => (
                  <motion.tr
                    key={caretaker._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{caretaker.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {caretaker.gender} • {caretaker.age} years
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {caretaker.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {caretaker.mobile}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {caretaker.specialization.map((spec, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="font-medium">{caretaker.experience} years</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Select
                        value={caretaker.availability}
                        onValueChange={(value) => {
                          const updatedCaretaker = { ...caretaker, availability: value as any };
                          setCaretakers(prev => prev.map(c => c._id === caretaker._id ? updatedCaretaker : c));
                          toast({
                            title: "Availability Updated",
                            description: `Caretaker availability changed to ${value.replace('_', ' ')}`,
                          });
                        }}
                      >
                        <SelectTrigger className={`w-32 h-8 text-xs font-medium ${getAvailabilityBadge(caretaker.availability)}`}>
                          <SelectValue>
                            {caretaker.availability.replace('_', ' ')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Select
                        value={caretaker.status}
                        onValueChange={async (value) => {
                          const updatedCaretaker = { ...caretaker, status: value as any };
                          setCaretakers((prev: any[]) => prev.map((c: any) => c._id === caretaker._id ? updatedCaretaker : c));
                          await caretakerService.updateCaretaker(caretaker._id, { status: value });
                          toast({
                            title: "Status Updated",
                            description: `Caretaker status changed to ${value}`,
                          });
                        }}
                      >
                        <SelectTrigger className={`w-28 h-8 text-xs font-medium ${getStatusBadge(caretaker.status)}`}>
                          <SelectValue>
                            {caretaker.status}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Approved</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="inactive">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {caretaker.assignedPatients?.filter(p => p.status === 'active').length || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCaretaker(caretaker);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(caretaker)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCaretaker(caretaker);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showCreateDialog ? 'Add New Caretaker' : 'Edit Caretaker'}
            </DialogTitle>
            <DialogDescription>
              {showCreateDialog
                ? 'Fill in the details to create a new caretaker'
                : 'Update caretaker information'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Rajesh Kumar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rajesh@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder={(import.meta.env.VITE_SUPPORT_PHONE || '9887894498').trim()}
                />
              </div>
              {showCreateDialog && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="35"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: 'male' | 'female' | 'other') =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Maharashtra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="400001"
                />
              </div>
            </div>

            {/* Professional Details */}
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization * (comma-separated)</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="elderly care, post-surgery care"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience (years) *</Label>
              <Input
                id="experience"
                type="number"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications (comma-separated)</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                placeholder="Nursing Diploma, First Aid Certificate"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingCaretaker}
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={showCreateDialog ? handleCreateCaretaker : handleUpdateCaretaker}
              className="btn-primary"
              disabled={savingCaretaker}
            >
              {savingCaretaker ? 'Saving...' : showCreateDialog ? 'Create Caretaker' : 'Update Caretaker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Caretaker Details</DialogTitle>
          </DialogHeader>

          {selectedCaretaker && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedCaretaker.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCaretaker.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{selectedCaretaker.mobile}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age / Gender</p>
                  <p className="font-medium">
                    {selectedCaretaker.age} years • {selectedCaretaker.gender}
                  </p>
                </div>
              </div>

              {/* Address */}
              {selectedCaretaker.address && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Address</p>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      {[
                        selectedCaretaker.address.street,
                        selectedCaretaker.address.city,
                        selectedCaretaker.address.state,
                        selectedCaretaker.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Professional */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Specialization</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCaretaker.specialization.map((spec, idx) => (
                      <Badge key={idx} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="font-medium">{selectedCaretaker.experience} years</p>
                </div>
              </div>

              {selectedCaretaker.qualifications && selectedCaretaker.qualifications.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Qualifications</p>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedCaretaker.qualifications.map((qual, idx) => (
                      <li key={idx} className="text-sm">
                        {qual}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Availability</p>
                  <Select
                    value={selectedCaretaker.availability}
                    onValueChange={(value: 'available' | 'assigned' | 'on_leave' | 'unavailable') => {
                      const updated = { ...selectedCaretaker, availability: value };
                      setCaretakers(prev => prev.map(c => c._id === selectedCaretaker._id ? updated : c));
                      setSelectedCaretaker(updated);
                      toast({
                        title: 'Success',
                        description: 'Availability updated successfully',
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <Select
                    value={selectedCaretaker.status}
                    onValueChange={async (value: 'active' | 'inactive' | 'suspended' | 'pending') => {
                      const updated = { ...selectedCaretaker, status: value };
                      setCaretakers(prev => prev.map(c => c._id === selectedCaretaker._id ? updated : c));
                      setSelectedCaretaker(updated);
                      await caretakerService.updateCaretaker(selectedCaretaker._id, { status: value });
                      toast({
                        title: 'Success',
                        description: 'Status updated successfully',
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Patients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Assigned Patients</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAssignDialog(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Patient
                  </Button>
                </div>
                {selectedCaretaker.assignedPatients &&
                selectedCaretaker.assignedPatients.filter(p => p.status === 'active').length > 0 ? (
                  <div className="space-y-2">
                    {selectedCaretaker.assignedPatients
                      .filter(p => p.status === 'active')
                      .map((assignment) => (
                        <div
                          key={assignment.patientId._id}
                          className="p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{assignment.patientId.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {assignment.patientId.email}
                              </p>
                              {assignment.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {assignment.notes}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Assigned: {new Date(assignment.assignedDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnassignPatient(assignment.patientId._id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active patient assignments</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Patient Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Patient to Caretaker</DialogTitle>
            <DialogDescription>
              Select a patient to assign to {selectedCaretaker?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Select Patient *</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      {patient.name} ({patient.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Assignment Notes</Label>
              <Textarea
                id="notes"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Patient requires 24/7 monitoring post-surgery..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignPatient} className="btn-primary">
              Assign Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caretaker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCaretaker?.name}? This action cannot be
              undone.
              {selectedCaretaker?.assignedPatients?.some(p => p.status === 'active') && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ This caretaker has active patient assignments and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCaretaker}
              className="bg-destructive hover:bg-destructive/90"
              disabled={selectedCaretaker?.assignedPatients?.some(p => p.status === 'active')}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirmation Dialog */}
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
        </main>
      </div>
    </div>
  );
}
