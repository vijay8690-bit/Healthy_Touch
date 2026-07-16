import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as adminService from '@/services/admin.service';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  Bell,
  Settings,
  Home,
  LogOut,
  Menu,
  Search,
  Filter,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Edit,
  Trash2,
  Stethoscope,
  MessageSquare,
  X,
  User,
  Eye,
  MapPin,
  Activity,
  FileText,
  Clock,
  Pill,
  AlertCircle,
  UserCog,
  Clipboard,
  Download,
  DollarSign,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getAssetViewUrl } from '@/utils/assetProxy';
import NotificationDropdown from '@/components/NotificationDropdown';
import { isProviderCategoryEnabled } from '@/config/features';
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';


export default function AdminUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [filters, setFilters] = useState({ role: 'all', status: 'all' });
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Fetch users (patients) from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { role: 'patient' }; // Only fetch patients

      if (filters.status !== 'all') {
        params.status = filters.status.toLowerCase();
      }

      const response = await adminService.getAllUsers(params);

      if (response.success && response.users) {
        setUsers(response.users);
      }
    } catch (error: any) {
      console.error('Fetch users error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch users',
        variant: 'destructive',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const response = await adminService.deleteUser(id);
      if (response.success) {
        toast({
          title: 'User Deleted',
          description: 'User has been removed from the system.',
          variant: 'destructive',
        });
        fetchUsers(); // Refresh list
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await adminService.toggleUserStatus(id);
      if (response.success) {
        toast({
          title: 'Status Updated',
          description: 'User status has been changed.',
        });
        fetchUsers(); // Refresh list
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    try {
      const response = await adminService.updateUser(editingUser._id, editingUser);
      if (response.success) {
        setShowEditModal(false);
        toast({
          title: 'User Updated',
          description: 'User details have been saved successfully.',
        });
        fetchUsers(); // Refresh list
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleViewPatientDetails = async (patient: any) => {
    try {
      // Fetch full medical profile from backend
      const response = await adminService.getPatientMedicalProfile(patient._id);

      if (response.success) {
        setSelectedPatient({
          ...response.profile,
          appointments: (response.profile.appointments || []).filter(
            (appointment: any) => isProviderCategoryEnabled(appointment.providerId?.category),
          ),
          medicalRecords: (response.profile.medicalRecords || []).filter(
            (record: any) => isProviderCategoryEnabled(record.providerId?.category),
          ),
          assignedProviders: (response.profile.assignedProviders || []).filter(
            (provider: any) => isProviderCategoryEnabled(provider.category),
          ),
        });
      } else {
        // Fallback to basic user data if medical profile doesn't exist
        setSelectedPatient(patient);
      }

      setShowDetailsDialog(true);
    } catch (error: any) {
      console.error('Fetch patient details error:', error);
      // Still show basic info if API fails
      setSelectedPatient(patient);
      setShowDetailsDialog(true);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filters.role === 'all' || user.role === filters.role;
    const matchesStatus = filters.status === 'all' || user.status === filters.status;
    return matchesSearch && matchesRole && matchesStatus;
  });

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border hidden lg:block">
            <Link to="/" className="flex items-center gap-2">
              <img src="/healthy-touch-logo.png" className="h-12" alt="Healthy Touch" />
            </Link>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
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
                <h1 className="font-display font-semibold text-lg">Users Management</h1>
                <p className="text-sm text-muted-foreground">Manage all platform users</p>
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

        <main className="flex-1 p-4 md:p-6 space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Button variant="outline" className="gap-2" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                <Filter className="w-4 h-4" />
                Filter
                {(filters.role !== 'all' || filters.status !== 'all') && (
                  <span className="ml-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
              {showFilterMenu && (
                <div className="absolute left-0 top-12 w-64 max-w-[calc(100vw-1.5rem)] bg-card border border-border rounded-xl shadow-lg p-4 space-y-3 z-10 sm:left-auto sm:right-0">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Role</label>
                    <select
                      value={filters.role}
                      onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Roles</option>
                      <option value="Patient">Patient</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFilters({ role: 'all', status: 'all' });
                        setShowFilterMenu(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowFilterMenu(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="card-healthcare overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search query.' : 'No patient users registered yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">User</th>
                      <th className="text-left p-4 font-medium">Contact</th>
                      <th className="text-left p-4 font-medium">Role</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Joined</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                {user.name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{user.name || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.mobile || 'N/A'}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                            {user.role || 'patient'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${!user.isSuspended ? 'status-approved' : 'status-rejected'
                              }`}
                          >
                            {!user.isSuspended ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewPatientDetails(user)} title="View Full Details">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleToggleStatus(user._id)}>
                              {!user.isSuspended ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user._id)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative bg-background rounded-lg shadow-lg border border-border p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Edit User</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="edit-name"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="edit-phone"
                        value={editingUser.phone}
                        onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Input
                      id="edit-role"
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSaveUser} className="flex-1">
                      Save Changes
                    </Button>
                    <Button onClick={() => setShowEditModal(false)} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Patient Full Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedPatient?.profileImage ? (
                <img
                  src={selectedPatient.profileImage}
                  alt={selectedPatient.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {selectedPatient?.name?.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{selectedPatient?.name}</h2>
                <p className="text-sm text-muted-foreground">Patient ID: #{selectedPatient?._id}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="medical">Medical Info</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="provider">Provider</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="card-healthcare p-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedPatient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedPatient.mobile || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{selectedPatient.location?.address || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Age</p>
                          <p className="font-medium text-lg">{selectedPatient.medicalProfile?.age || '-'} {selectedPatient.medicalProfile?.age ? 'years' : ''}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Gender</p>
                          <p className="font-medium text-lg">{selectedPatient.medicalProfile?.gender || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Blood Group</p>
                          <p className="font-medium text-lg text-destructive">{selectedPatient.medicalProfile?.bloodGroup || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vital Signs */}
                  <div className="card-healthcare p-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Latest Vital Signs
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Last Checkup</span>
                        <Badge variant="outline">
                          {selectedPatient.medicalProfile?.vitals?.lastCheckup
                            ? new Date(selectedPatient.medicalProfile.vitals.lastCheckup).toLocaleDateString()
                            : '----'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Blood Pressure</p>
                          <p className="font-bold text-lg">
                            {selectedPatient.medicalProfile?.vitals?.bloodPressure?.systolic && selectedPatient.medicalProfile?.vitals?.bloodPressure?.diastolic
                              ? `${selectedPatient.medicalProfile.vitals.bloodPressure.systolic}/${selectedPatient.medicalProfile.vitals.bloodPressure.diastolic}`
                              : '----'}
                          </p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Blood Sugar</p>
                          <p className="font-bold text-lg">
                            {selectedPatient.medicalProfile?.vitals?.bloodSugar?.value
                              ? `${selectedPatient.medicalProfile.vitals.bloodSugar.value} mg/dL`
                              : '----'}
                          </p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Weight</p>
                          <p className="font-bold text-lg">
                            {selectedPatient.medicalProfile?.weight?.value
                              ? `${selectedPatient.medicalProfile.weight.value} ${selectedPatient.medicalProfile.weight.unit}`
                              : '----'}
                          </p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">BMI</p>
                          <p className="font-bold text-lg">
                            {selectedPatient.medicalProfile?.bmi || '----'}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">Height</p>
                        <p className="font-medium">
                          {selectedPatient.medicalProfile?.height?.value
                            ? `${selectedPatient.medicalProfile.height.value} ${selectedPatient.medicalProfile.height.unit}`
                            : '----'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Medical Information Tab */}
              <TabsContent value="medical" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Diseases */}
                  <div className="card-healthcare p-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      Current Diseases
                    </h3>
                    {selectedPatient.medicalProfile?.diseases && selectedPatient.medicalProfile.diseases.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.medicalProfile.diseases
                          .filter((d: any) => d.isActive)
                          .map((disease: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                              <Activity className="w-4 h-4 text-destructive" />
                              <div className="flex-1">
                                <span className="font-medium">{disease.name}</span>
                                {disease.diagnosedDate && (
                                  <p className="text-xs text-muted-foreground">
                                    Diagnosed: {new Date(disease.diagnosedDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No current diseases recorded</p>
                    )}
                  </div>

                  {/* Allergies */}
                  <div className="card-healthcare p-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      Allergies
                    </h3>
                    {selectedPatient.medicalProfile?.allergies && selectedPatient.medicalProfile.allergies.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.medicalProfile.allergies.map((allergy: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <div className="flex-1">
                              <span className="font-medium">{allergy.allergen}</span>
                              {allergy.severity && (
                                <p className="text-xs text-muted-foreground">
                                  Severity: {allergy.severity}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No allergies recorded</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Prescriptions Tab - Medical Records from Providers */}
              <TabsContent value="prescriptions" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Medical Records & Prescriptions
                  </h3>
                  <Badge variant="secondary">{selectedPatient.medicalRecords?.length || 0} Records</Badge>
                </div>

                {selectedPatient.medicalRecords && selectedPatient.medicalRecords.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPatient.medicalRecords.map((record: any) => (
                      <div key={record._id} className="card-healthcare p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {record.providerId?.userId?.profileImage ? (
                              <img
                                src={record.providerId.userId.profileImage}
                                alt={record.providerId.userId.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Stethoscope className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{record.providerId?.userId?.name || 'Provider'}</h4>
                                <Badge variant="outline" className="text-xs">{record.providerId?.category}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(record.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              {record.appointmentId && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Appointment: {new Date(record.appointmentId.date).toLocaleDateString()} • {record.appointmentId.timeSlot}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Diagnosis */}
                        {record.diagnosis && (
                          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-medium flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300">
                              <Activity className="w-4 h-4" />
                              Diagnosis
                            </p>
                            <p className="text-sm">{record.diagnosis}</p>
                          </div>
                        )}

                        {/* Prescription */}
                        {record.prescription && (
                          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-sm font-medium flex items-center gap-2 mb-2 text-green-700 dark:text-green-300">
                              <Pill className="w-4 h-4" />
                              Prescription
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{record.prescription}</p>
                          </div>
                        )}

                        {/* Provider Remarks/Notes */}
                        {record.remarks && (
                          <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm font-medium flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-300">
                              <Clipboard className="w-4 h-4" />
                              Provider's Notes
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{record.remarks}</p>
                          </div>
                        )}

                        {/* Documents/Reports */}
                        {record.documents && record.documents.length > 0 && (
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4" />
                              Attached Documents ({record.documents.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {record.documents.map((doc: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={getAssetViewUrl(doc, 'inline')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  Document {idx + 1}
                                  <Download className="w-3 h-3 ml-1" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No medical records found</p>
                    <p className="text-sm mt-2">Medical records will appear here after provider consultations</p>
                  </div>
                )}
              </TabsContent>

              {/* Medical History Tab */}
              <TabsContent value="history" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Medical History Timeline
                  </h3>
                </div>

                {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 ? (
                  <div className="relative space-y-4 pl-6 border-l-2 border-primary/20">
                    {selectedPatient.medicalHistory.map((record: any, index: number) => (
                      <div key={index} className="relative">
                        <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-primary border-4 border-background"></div>
                        <div className="card-healthcare p-4 ml-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline">{record.date}</Badge>
                          </div>
                          <p className="font-semibold mb-1">{record.event}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Stethoscope className="w-3 h-3" />
                            <span>{record.doctor}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No medical history recorded</p>
                  </div>
                )}
              </TabsContent>

              {/* Assigned Provider Tab */}
              <TabsContent value="provider" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-primary" />
                    Assigned Healthcare Providers
                  </h3>
                  {selectedPatient.appointments && selectedPatient.appointments.length > 0 && (
                    <Badge variant="secondary">{selectedPatient.appointments.length} Appointments</Badge>
                  )}
                </div>

                {selectedPatient.assignedProviders && selectedPatient.assignedProviders.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPatient.assignedProviders.map((provider: any, index: number) => {
                      // Count appointments with this provider
                      const appointmentsCount = selectedPatient.appointments?.filter(
                        (apt: any) => apt.providerId?._id === provider._id
                      ).length || 0;

                      // Get latest appointment
                      const latestAppointment = selectedPatient.appointments?.find(
                        (apt: any) => apt.providerId?._id === provider._id
                      );

                      return (
                        <div key={index} className="card-healthcare p-6 space-y-4">
                          <div className="flex items-start gap-4">
                            {provider?.profileImage ? (
                              <img
                                src={provider.profileImage}
                                alt={provider.userId.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl shrink-0">
                                {provider.userId?.name?.split(' ').map((n: string) => n[0]).join('') || 'P'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xl mb-1 truncate">{provider.userId?.name || 'Provider'}</h4>
                              <p className="text-primary font-medium mb-2">{provider.specialization}</p>
                              <p className="text-sm text-muted-foreground mb-2">{provider.category}</p>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {provider.userId?.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{provider.userId.email}</span>
                                  </div>
                                )}
                                {provider.userId?.mobile && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span>{provider.userId.mobile}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-border pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Total Appointments</p>
                                <p className="font-semibold text-2xl text-primary">{appointmentsCount}</p>
                              </div>
                              {latestAppointment && (
                                <>
                                  <div className="bg-muted/30 p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Latest Visit</p>
                                    <p className="font-semibold">
                                      {new Date(latestAppointment.date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="bg-muted/30 p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                                    <Badge className={
                                      latestAppointment.status === 'completed' ? 'bg-green-500' :
                                        latestAppointment.status === 'confirmed' ? 'bg-blue-500' :
                                          latestAppointment.status === 'cancelled' ? 'bg-red-500' :
                                            'bg-yellow-500'
                                    }>
                                      {latestAppointment.status}
                                    </Badge>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {provider.fees && (
                            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Activity className="w-4 h-4 text-green-600" />
                                  <p className="font-semibold text-green-600">Consultation Fee</p>
                                </div>
                                <p className="text-2xl font-bold text-green-600">₹{provider.fees}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="card-healthcare p-12 text-center">
                    <UserCog className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h4 className="font-semibold text-lg mb-2">No Provider Assigned</h4>
                    <p className="text-muted-foreground">
                      This patient hasn't booked any appointments yet.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
