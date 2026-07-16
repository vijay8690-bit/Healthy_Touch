import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  User,
  Search,
  Phone,
  Mail,
  Eye,
  History,
  Droplets,
  HeartPulse,
  DollarSign,
  IndianRupee,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { useAuth } from '@/contexts/AuthContext';
import { useProviderApproval } from '@/hooks/useProviderApproval';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useToast } from '@/hooks/use-toast';
import providerService from '@/services/provider.service';
import { getProviderAssignedLabBookings } from '@/services/labTest.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProviderPatients() {
  const navigate = useNavigate();
  const { loading: approvalLoading } = useProviderApproval();
  const { count: notificationCount } = useNotificationCount();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const formatDate = (value?: string | Date) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (!approvalLoading) {
      fetchPatients();
    }
  }, [approvalLoading]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const [appointmentResponse, labResponse] = await Promise.all([
        providerService.getMyAppointments().catch(() => ({ success: false, appointments: [] })),
        getProviderAssignedLabBookings('all').catch(() => ({ success: false, bookings: [] })),
      ]);

      const uniquePatientsMap = new Map<string, any>();

      const addPatientVisit = (patient: any, visitDate: any, fallback: any = {}) => {
        const patientId = patient?._id || patient?.id || fallback.patientId || fallback._id;
        const fallbackKey = fallback.mobile || fallback.email || fallback.name || fallback.bookingId;
        const key = String(patientId || fallbackKey || '').trim();
        if (!key) return;

        const normalized = {
          ...(patient && typeof patient === 'object' ? patient : {}),
          _id: patientId || `lab-${key}`,
          name: patient?.name || fallback.name || 'Patient',
          email: patient?.email || fallback.email || '',
          mobile: patient?.mobile || patient?.phone || fallback.mobile || '',
          profileImage: patient?.profileImage || '',
          hasMedicalProfile: Boolean(patientId),
        };

        if (!uniquePatientsMap.has(key)) {
          uniquePatientsMap.set(key, {
            ...normalized,
            lastVisit: visitDate,
            totalVisits: 1,
          });
          return;
        }

        const existing = uniquePatientsMap.get(key);
        existing.totalVisits += 1;
        if (new Date(visitDate) > new Date(existing.lastVisit)) {
          existing.lastVisit = visitDate;
        }
        existing.name = existing.name || normalized.name;
        existing.email = existing.email || normalized.email;
        existing.mobile = existing.mobile || normalized.mobile;
      };

      if (appointmentResponse.success && appointmentResponse.appointments) {
        appointmentResponse.appointments.forEach((apt: any) => {
          addPatientVisit(apt.patientId, apt.date || apt.createdAt, {
            name: apt.patientName,
            mobile: apt.patientMobile,
            bookingId: apt._id,
          });
        });
      }

      if (labResponse.success && labResponse.bookings) {
        labResponse.bookings.forEach((order: any) => {
          addPatientVisit(order.patientId, order.preferredDate || order.createdAt, {
            name: order.patientName || order.patientId?.name,
            email: order.patientEmail || order.patientId?.email,
            mobile: order.patientMobile || order.patientId?.mobile,
            bookingId: order._id,
          });
        });
      }

      setPatients(Array.from(uniquePatientsMap.values()));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch patients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setLoadingRecords(true);
    try {
      const response = await providerService.getPatientRecords(patient._id);
      if (response.success && response.medicalRecords) {
        setPatientRecords(response.medicalRecords.slice(0, 3)); // Get last 3 records
      }
    } catch (error: any) {
      console.error('Failed to fetch records:', error);
      setPatientRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  if (approvalLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredPatients = patients.filter((patient) =>
    (patient.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.mobile || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const providerType = user?.role === 'doctor' ? 'Doctor' : user?.role === 'nurse' ? 'Nurse' : 'Provider';

  const statusBadge = (
    <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
        <span className="text-sm font-medium text-secondary">Profile Active</span>
      </div>
      <p className="text-xs text-muted-foreground">Visible to patients</p>
    </div>
  );

  return (
    <DashboardLayout
      sidebarLinks={getProviderSidebarLinks(user)}
      portalName="My Patients"
      userName={providerType}
      userInitial={providerType.charAt(0)}
      notificationCount={notificationCount}
      statusBadge={statusBadge}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold">Patient Directory</h2>
        <p className="text-muted-foreground">View and manage your patients</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-healthcare p-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="card-healthcare p-4 text-center">
          <p className="text-2xl font-bold text-primary">{patients.length}</p>
          <p className="text-sm text-muted-foreground">Total Patients</p>
        </div>
        <div className="card-healthcare p-4 text-center">
          <p className="text-2xl font-bold text-secondary">
            {patients.filter(p => {
              const lastVisit = new Date(p.lastVisit);
              const now = new Date();
              const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
              return lastVisit >= monthAgo;
            }).length}
          </p>
          <p className="text-sm text-muted-foreground">This Month</p>
        </div>
        <div className="card-healthcare p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {patients.filter(p => p.totalVisits === 1).length}
          </p>
          <p className="text-sm text-muted-foreground">New Patients</p>
        </div>
        <div className="card-healthcare p-4 text-center">
          <p className="text-2xl font-bold text-secondary">
            {patients.length > 0 
              ? Math.round(patients.reduce((sum, p) => sum + p.totalVisits, 0) / patients.length)
              : 0
            }
          </p>
          <p className="text-sm text-muted-foreground">Avg. Visits</p>
        </div>
      </motion.div>

      {/* Patients Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-2 gap-4"
      >
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient, index) => (
            <motion.div
              key={patient._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * index }}
              className="card-healthcare p-5"
            >
              <div className="flex items-start gap-4">
                {patient.profileImage && patient.profileImage.trim() ? (
                  <img
                    src={patient.profileImage}
                    alt={patient.name}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-bold text-primary-foreground shrink-0">
                    {patient.name?.charAt(0) || 'P'}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{patient.name}</h3>
                  <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      {patient.email || 'Not provided'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      {patient.mobile || 'Not provided'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Visits:</span>
                      <span className="ml-1 font-medium">{patient.totalVisits}</span>
                    </div>
                    <Button size="sm" onClick={() => handleViewPatient(patient)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="card-healthcare p-12 text-center md:col-span-2">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No patients found</h3>
            <p className="text-muted-foreground">Patients will appear here after consultations</p>
          </div>
        )}
      </motion.div>

      {/* Patient Detail Modal */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                {selectedPatient.profileImage && selectedPatient.profileImage.trim() ? (
                  <img
                    src={selectedPatient.profileImage}
                    alt={selectedPatient.name}
                    className="w-14 h-14 rounded-xl object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-bold text-primary-foreground">
                    {selectedPatient.name?.charAt(0) || 'P'}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{selectedPatient.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                  <p className="font-semibold text-lg">{selectedPatient.totalVisits}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Last Visit</p>
                  <p className="font-semibold text-sm">{formatDate(selectedPatient.lastVisit)}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Medical Records
                </p>
                {loadingRecords ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : patientRecords.length > 0 ? (
                  <div className="space-y-2">
                    {patientRecords.map((record) => (
                      <div key={record._id} className="p-3 rounded-lg bg-background">
                        <p className="font-medium text-sm">{record.diagnosis}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(record.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        {record.prescription && (
                          <p className="text-xs mt-1 text-muted-foreground">Rx: {record.prescription}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No medical records found
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {selectedPatient.hasMedicalProfile && (
                  <Button 
                    className="flex-1" 
                    variant="outline" 
                    onClick={() => {
                      setSelectedPatient(null); // Close modal first
                      setTimeout(() => {
                        navigate(`/provider/patients/${selectedPatient._id}/medical-profile`);
                      }, 100);
                    }}
                  >
                    <HeartPulse className="w-4 h-4 mr-1" />
                    Medical Profile
                  </Button>
                )}
                {selectedPatient.hasMedicalProfile && (
                  <Button 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => {
                      setSelectedPatient(null);
                      setTimeout(() => {
                        navigate(`/provider/notes?patientId=${selectedPatient._id}&patientName=${encodeURIComponent(selectedPatient.name)}`);
                      }, 100);
                    }}
                  >
                    Add Notes
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
