import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  User,
  Plus,
  Search,
  Clock,
  Edit2,
  Trash2,
  Save,
  DollarSign,
  IndianRupee,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useToast } from '@/hooks/use-toast';
import { useProviderApproval } from '@/hooks/useProviderApproval';
import providerService from '@/services/provider.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProviderNotes() {
  const { loading: approvalLoading } = useProviderApproval();
  const { count: notificationCount } = useNotificationCount();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteMode, setNoteMode] = useState<'add' | 'edit'>('add');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({
    appointmentId: '',
    patientId: '',
    diagnosis: '',
    prescription: '',
    remarks: '',
  });
  const { user } = useAuth();
  const { toast } = useToast();

  // Auto-select patient from URL params
  useEffect(() => {
    const patientIdFromUrl = searchParams.get('patientId');
    const patientNameFromUrl = searchParams.get('patientName');
    if (patientIdFromUrl && appointments.length > 0) {
      // Find first completed appointment for this patient
      const patientCompletedAppt = appointments.find(
        apt => apt.patientId?._id === patientIdFromUrl && apt.status === 'completed'
      );
      if (patientCompletedAppt) {
        setNewNote({
          patientId: patientIdFromUrl,
          appointmentId: patientCompletedAppt._id,
          diagnosis: '',
          prescription: '',
          remarks: '',
        });
        setIsAddingNote(true); // Auto-open add note dialog
        if (patientNameFromUrl) {
          toast({
            title: 'Patient Selected',
            description: `Adding note for ${decodeURIComponent(patientNameFromUrl)}`,
          });
        }
      } else {
        // No completed appointments for this patient
        setNewNote(prev => ({ ...prev, patientId: patientIdFromUrl }));
        setIsAddingNote(true);
        if (patientNameFromUrl) {
          toast({
            title: 'Patient Selected',
            description: `Adding note for ${decodeURIComponent(patientNameFromUrl)}. Please select an appointment.`,
            variant: 'default',
          });
        }
      }
    }
  }, [searchParams, appointments]);

  useEffect(() => {
    if (!approvalLoading) {
      fetchData();
    }
  }, [approvalLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
  
      const [apptRes] = await Promise.all([
        providerService.getMyAppointments(),
      ]);
      
      if (apptRes.success && apptRes.appointments) {
        // Filter completed appointments
        const completedAppts = apptRes.appointments.filter(
          (a: any) => a.status === 'completed'
        );
        setAppointments(apptRes.appointments);
        
        // Fetch medical records for completed appointments
        const recordPromises = completedAppts.map((apt: any) =>
          providerService.getPatientRecords(apt.patientId._id).catch(() => ({ success: false }))
        );
        const recordResponses = await Promise.all(recordPromises);
        
        const allRecords: any[] = [];
        recordResponses.forEach((res) => {
          if (res.success && res.medicalRecords) {
            allRecords.push(...res.medicalRecords);
          }
        });
        setRecords(allRecords);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (approvalLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredNotes = records.filter((record) =>
    (record.patientId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (record.diagnosis || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetNoteForm = () => {
    setNewNote({ appointmentId: '', patientId: '', diagnosis: '', prescription: '', remarks: '' });
    setEditingRecordId(null);
    setNoteMode('add');
  };

  const openAddNote = () => {
    resetNoteForm();
    setIsAddingNote(true);
  };

  const openEditNote = (record: any) => {
    setNoteMode('edit');
    setEditingRecordId(record._id);
    setNewNote({
      appointmentId: record.appointmentId?._id || record.appointmentId || '',
      patientId: record.patientId?._id || record.patientId || '',
      diagnosis: record.diagnosis || '',
      prescription: record.prescription || '',
      remarks: record.remarks || '',
    });
    setIsAddingNote(true);
  };

  const handleAddNote = async () => {
    if (!newNote.appointmentId || !newNote.remarks) {
      toast({
        title: 'Missing Information',
        description: 'Please select an appointment and provide remarks.',
        variant: 'destructive',
      });
      return;
    }
    
    try { 
      await providerService.createMedicalRecord(newNote);
      toast({
        title: 'Note Added',
        description: 'Clinical note has been saved successfully.',
      });
      // Reset form completely and close modal
      resetNoteForm();
      setIsAddingNote(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add note',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateNote = async () => {
    if (!editingRecordId) return;

    if (!newNote.remarks) {
      toast({
        title: 'Missing Information',
        description: 'Please provide remarks.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await providerService.updateMedicalRecord(editingRecordId, {
        diagnosis: newNote.diagnosis,
        prescription: newNote.prescription,
        remarks: newNote.remarks,
      });
      toast({
        title: 'Note Updated',
        description: 'Clinical note has been updated successfully.',
      });
      resetNoteForm();
      setIsAddingNote(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update note',
        variant: 'destructive',
      });
    }
  };

  const handleCloseModal = () => {
    resetNoteForm();
    setIsAddingNote(false);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await providerService.deleteMedicalRecord(id);
      toast({
        title: 'Note Deleted',
        description: 'Clinical note has been deleted.',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete note',
        variant: 'destructive',
      });
    }
  };

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
      portalName="Clinical Notes"
      userName={providerType}
      userInitial={providerType.charAt(0)}
      notificationCount={notificationCount}
      statusBadge={statusBadge}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Clinical Notes</h2>
          <p className="text-muted-foreground">Document patient consultations and prescriptions</p>
        </div>
        <Button onClick={openAddNote}>
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
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
            placeholder="Search by patient name or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Notes List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {filteredNotes.length > 0 ? (
          filteredNotes.map((record, index) => (
            <motion.div
              key={record._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="card-healthcare p-5"
            >
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {record.patientId?.profileImage ? (
                      <img
                        src={record.patientId.profileImage}
                        alt={record.patientId?.name || 'Patient'}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{record.patientId?.name || 'Unknown Patient'}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(record.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Diagnosis</p>
                      <p className="font-medium">{record.diagnosis}</p>
                    </div>
                    {record.prescription && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Prescription</p>
                        <p className="text-sm">{record.prescription}</p>
                      </div>
                    )}
                    {record.remarks && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Remarks</p>
                        <p className="text-sm whitespace-pre-wrap">{record.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditNote(record)}
                    title="Edit note"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDeleteNote(record._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="card-healthcare p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No notes found</h3>
            <p className="text-muted-foreground mb-4">Start documenting patient consultations</p>
            <Button onClick={openAddNote}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Note
            </Button>
          </div>
        )}
      </motion.div>

      {/* Add Note Modal */}
      <Dialog
        open={isAddingNote}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseModal();
            return;
          }
          setIsAddingNote(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{noteMode === 'edit' ? 'Edit Clinical Note' : 'Add Clinical Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Appointment</Label>
              <Select
                value={newNote.appointmentId}
                disabled={noteMode === 'edit'}
                onValueChange={(value) => {
                  const apt = appointments.find(a => a._id === value);
                  setNewNote({ 
                    ...newNote, 
                    appointmentId: value,
                    patientId: apt?.patientId?._id || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select appointment" />
                </SelectTrigger>
                <SelectContent>
                  {appointments
                    .filter(apt => {
                      // Filter by completed status
                      if (apt.status !== 'completed') return false;
                      // If patient is pre-selected from URL, only show that patient's appointments
                      if (newNote.patientId) {
                        return apt.patientId?._id === newNote.patientId;
                      }
                      return true;
                    })
                    .map((apt) => (
                    <SelectItem key={apt._id} value={apt._id}>
                      {apt.patientId?.name} - {new Date(apt.date).toLocaleDateString()} ({apt.timeSlot})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Diagnosis</Label>
              <Input
                value={newNote.diagnosis}
                onChange={(e) => setNewNote({ ...newNote, diagnosis: e.target.value })}
                placeholder="Enter diagnosis"
              />
            </div>
            <div>
              <Label>Prescription</Label>
              <Textarea
                value={newNote.prescription}
                onChange={(e) => setNewNote({ ...newNote, prescription: e.target.value })}
                placeholder="Enter prescription details"
                rows={2}
              />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={newNote.remarks}
                onChange={(e) => setNewNote({ ...newNote, remarks: e.target.value })}
                placeholder="Enter remarks"
                rows={3}
              />
            </div>
            <Button className="w-full" onClick={noteMode === 'edit' ? handleUpdateNote : handleAddNote}>
              <Save className="w-4 h-4 mr-2" />
              {noteMode === 'edit' ? 'Update Note' : 'Save Note'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
