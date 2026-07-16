import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  User,
  Heart,
  Activity,
  AlertCircle,
  Shield,
  UserCheck,
  ArrowLeft,
  Save,
  Edit2,
  X,
  Plus,
  Trash2,
  Pill,
  Droplets,
  IndianRupee,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api.config';

export default function PatientMedicalProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { count: notificationCount } = useNotificationCount();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [medicalProfile, setMedicalProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('medical');
  const [appointmentStatus, setAppointmentStatus] = useState<string | null>(null);
  // const [canEdit, setCanEdit] = useState(false);
  // const [appointmentStatus, setAppointmentStatus] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    height: { value: 0, unit: 'cm' },
    weight: { value: 0, unit: 'kg' },
    vitals: {
      bloodPressure: { systolic: 0, diastolic: 0 },
      bloodSugar: { value: 0, type: 'Random' },
      heartRate: { value: 0 },
      temperature: { value: 0 },
      oxygenLevel: { value: 0 },
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
    },
    insurance: {
      provider: '',
      policyNumber: '',
      validUntil: '',
    },
    lifestyle: {
      smoking: 'Never',
      alcohol: 'Never',
      exercise: 'Moderate',
      diet: 'Vegetarian',
    },
    diseases: [] as any[],
    allergies: [] as any[],
    medications: [] as any[],
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (patientId) {
      fetchPatientProfile();
    }
  }, [patientId]);

  const fetchPatientProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('healthytouch_token');
      
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'Please login again',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      console.log('Fetching patient profile for ID:', patientId);
      
      // Fetch patient basic info and medical profile
      const medicalRes = await axios.get(`${API_BASE_URL}/patient/${patientId}/medical-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Medical profile response:', medicalRes.data);
      
      const profileData = medicalRes.data.profile;
      
      if (!profileData) {
        throw new Error('Patient profile data is invalid');
      }
      
      // Backend returns combined profile with user data and medicalProfile nested
      const medProfile = profileData.medicalProfile || {};
      
      setPatient({
        _id: profileData._id,
        name: profileData.name,
        email: profileData.email,
        mobile: profileData.mobile,
        profileImage: profileData.profileImage,
        location: profileData.location
      });
      setMedicalProfile(medProfile);
      
      setFormData({
        dateOfBirth: medProfile?.dateOfBirth ? new Date(medProfile.dateOfBirth).toISOString().split('T')[0] : '',
        gender: medProfile?.gender || '',
        bloodGroup: medProfile?.bloodGroup || '',
        height: medProfile?.height || { value: 0, unit: 'cm' },
        weight: medProfile?.weight || { value: 0, unit: 'kg' },
        vitals: medProfile?.vitals || {
          bloodPressure: { systolic: 0, diastolic: 0 },
          bloodSugar: { value: 0, type: 'Random' },
          heartRate: { value: 0 },
          temperature: { value: 0 },
          oxygenLevel: { value: 0 },
        },
        emergencyContact: medProfile?.emergencyContact || { name: '', relationship: '', phone: '', email: '' },
        insurance: medProfile?.insurance || { provider: '', policyNumber: '', validUntil: '' },
        lifestyle: medProfile?.lifestyle || { smoking: 'Never', alcohol: 'Never', exercise: 'Moderate', diet: 'Vegetarian' },
        diseases: medProfile?.diseases || [],
        allergies: medProfile?.allergies || [],
        medications: medProfile?.medications || [],
      });

      // Check appointment status to determine edit permissions
      try {
        const appointmentRes = await axios.get(
          `${API_BASE_URL}/appointments/my-appointments`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Find any appointment with this patient
        const patientAppointment = appointmentRes.data.appointments.find(
          (apt: any) => apt.patient?._id === patientId || apt.patient === patientId
        );

        if (patientAppointment) {
          setAppointmentStatus(patientAppointment.status);
          
          // Check if current time is within appointment time slot
          const now = new Date();
          const appointmentDate = new Date(patientAppointment.date);
          
          // Parse time slot (e.g., "09:00 AM - 10:00 AM")
          const timeSlot = patientAppointment.timeSlot;
          const [startTime, endTime] = timeSlot.split(' - ');
          
          // Convert time to 24-hour format and create Date objects
          const parseTime = (timeStr: string) => {
            const [time, period] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return { hours, minutes };
          };
          
          const start = parseTime(startTime);
          const end = parseTime(endTime);
          
          // Set appointment start and end times
          const appointmentStart = new Date(appointmentDate);
          appointmentStart.setHours(start.hours, start.minutes, 0, 0);
          
          const appointmentEnd = new Date(appointmentDate);
          appointmentEnd.setHours(end.hours, end.minutes, 0, 0);
          
          // Can edit only if:
          // 1. Appointment is confirmed
          // 2. Current time is within appointment slot
          const isWithinTimeSlot = now >= appointmentStart && now <= appointmentEnd;
          const isConfirmed = patientAppointment.status === 'confirmed';
          
          setCanEdit(isConfirmed && isWithinTimeSlot);
        } else {
          // No appointment found - read-only
          setAppointmentStatus(null);
          setCanEdit(false);
        }
      } catch (error) {
        console.error('Error fetching appointment status:', error);
        // Default to read-only on error
        setCanEdit(false);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch patient profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('healthytouch_token');
      await axios.put(
        `${API_BASE_URL}/patient/${patientId}/medical-profile`,
        {
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup,
          height: formData.height,
          weight: formData.weight,
          vitals: formData.vitals,
          emergencyContact: formData.emergencyContact,
          insurance: formData.insurance,
          lifestyle: formData.lifestyle,
          diseases: formData.diseases,
          allergies: formData.allergies,
          medications: formData.medications,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Patient medical profile updated successfully',
      });
      fetchPatientProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('height.') || field.startsWith('weight.')) {
      const [mainField, subField] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [mainField]: { ...prev[mainField as keyof typeof prev] as any, [subField]: value }
      }));
    } else if (field.startsWith('vitals.')) {
      const vitalField = field.replace('vitals.', '');
      if (vitalField.includes('.')) {
        const [vital, subField] = vitalField.split('.');
        setFormData(prev => ({
          ...prev,
          vitals: {
            ...prev.vitals,
            [vital]: { ...(prev.vitals as any)[vital], [subField]: value }
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          vitals: { ...prev.vitals, [vitalField]: value }
        }));
      }
    } else if (field.startsWith('emergencyContact.') || field.startsWith('insurance.') || field.startsWith('lifestyle.')) {
      const [mainField, subField] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [mainField]: { ...(prev[mainField as keyof typeof prev] as any), [subField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const addDisease = () => {
    setFormData(prev => ({
      ...prev,
      diseases: [...prev.diseases, { name: '', diagnosedDate: '', isActive: true, notes: '' }]
    }));
  };

  const removeDisease = (index: number) => {
    setFormData(prev => ({
      ...prev,
      diseases: prev.diseases.filter((_, i) => i !== index)
    }));
  };

  const updateDisease = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      diseases: prev.diseases.map((d, i) => i === index ? { ...d, [field]: value } : d)
    }));
  };

  const addAllergy = () => {
    setFormData(prev => ({
      ...prev,
      allergies: [...prev.allergies, { allergen: '', reaction: '', severity: 'Mild', diagnosedDate: '' }]
    }));
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const updateAllergy = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.map((a, i) => i === index ? { ...a, [field]: value } : a)
    }));
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', startDate: '', endDate: '' }]
    }));
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Patient not found</p>
          <Button onClick={() => navigate('/provider/patients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const providerType = user?.role === 'doctor' ? 'Doctor' : user?.role === 'nurse' ? 'Nurse' : 'Provider';

  return (
    <DashboardLayout
      sidebarLinks={getProviderSidebarLinks(user)}
      portalName="Patient Medical Profile"
      userName={providerType}
      userInitial={providerType.charAt(0)}
      notificationCount={notificationCount}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/provider/patients')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-display text-2xl font-bold">Medical Profile Management</h2>
            <p className="text-muted-foreground">
              {appointmentStatus === 'pending' && '⏳ Read-only: Appointment pending'}
              {appointmentStatus === 'confirmed' && canEdit && '✅ Editable: Active appointment session'}
              {appointmentStatus === 'confirmed' && !canEdit && '🕐 Read-only: Outside appointment time slot'}
              {appointmentStatus === 'completed' && '🔒 Read-only: Appointment completed'}
              {!appointmentStatus && '🔒 Read-only: No active appointment'}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)}
            disabled={!canEdit}
            title={!canEdit ? 'Can only edit during appointment time slot' : 'Edit profile'}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              fetchPatientProfile();
            }}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </motion.div>

      {/* Patient Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-healthcare p-6"
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="relative">
            {patient.profileImage ? (
              <img
                src={patient.profileImage}
                alt={patient.name}
                className="w-24 h-24 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-primary-foreground">
                {patient.name?.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-bold">{patient.name}</h3>
              <p className="text-muted-foreground">Patient ID: #{patient._id?.slice(-8).toUpperCase()}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Patient
              </span>
              {medicalProfile?.age && (
                <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                  Age: {medicalProfile.age} years
                </span>
              )}
              {medicalProfile?.bloodGroup && (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-sm font-medium flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {medicalProfile.bloodGroup}
                </span>
              )}
              {medicalProfile?.bmi && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                  BMI: {medicalProfile.bmi}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-healthcare p-6"
      >
        <div className="flex gap-2 border-b pb-4 mb-6 overflow-x-auto">
          {[
            { id: 'medical', label: 'Medical Info', icon: Heart },
            { id: 'vitals', label: 'Vitals', icon: Activity },
            { id: 'history', label: 'Medical History', icon: FileText },
            { id: 'emergency', label: 'Emergency', icon: AlertCircle },
            { id: 'insurance', label: 'Insurance', icon: Shield },
            { id: 'lifestyle', label: 'Lifestyle', icon: UserCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Medical Information
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Date of Birth</Label>
                {isEditing ? (
                  <Input type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Gender</Label>
                {isEditing ? (
                  <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-1">{formData.gender || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Blood Group</Label>
                {isEditing ? (
                  <Select value={formData.bloodGroup} onValueChange={(value) => handleChange('bloodGroup', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-1 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-red-500" />
                    {formData.bloodGroup || 'Not provided'}
                  </p>
                )}
              </div>
              <div>
                <Label>Height (cm)</Label>
                {isEditing ? (
                  <Input type="number" value={formData.height.value || ''} onChange={(e) => handleChange('height.value', parseFloat(e.target.value))} />
                ) : (
                  <p className="font-medium mt-1">{formData.height.value ? `${formData.height.value} cm` : 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Weight (kg)</Label>
                {isEditing ? (
                  <Input type="number" value={formData.weight.value || ''} onChange={(e) => handleChange('weight.value', parseFloat(e.target.value))} />
                ) : (
                  <p className="font-medium mt-1">{formData.weight.value ? `${formData.weight.value} kg` : 'Not provided'}</p>
                )}
              </div>
              {medicalProfile?.bmi && (
                <div>
                  <Label>BMI (Calculated)</Label>
                  <p className="font-medium mt-1">{medicalProfile.bmi}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Vital Signs
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Blood Pressure (Systolic/Diastolic)</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Systolic"
                      value={formData.vitals.bloodPressure.systolic || ''}
                      onChange={(e) => handleChange('vitals.bloodPressure.systolic', parseFloat(e.target.value))}
                    />
                    <Input
                      type="number"
                      placeholder="Diastolic"
                      value={formData.vitals.bloodPressure.diastolic || ''}
                      onChange={(e) => handleChange('vitals.bloodPressure.diastolic', parseFloat(e.target.value))}
                    />
                  </div>
                ) : (
                  <p className="font-medium mt-1">
                    {formData.vitals.bloodPressure.systolic && formData.vitals.bloodPressure.diastolic
                      ? `${formData.vitals.bloodPressure.systolic}/${formData.vitals.bloodPressure.diastolic} mmHg`
                      : 'Not recorded'}
                  </p>
                )}
              </div>
              <div>
                <Label>Blood Sugar (mg/dL)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.vitals.bloodSugar.value || ''}
                    onChange={(e) => handleChange('vitals.bloodSugar.value', parseFloat(e.target.value))}
                  />
                ) : (
                  <p className="font-medium mt-1">
                    {formData.vitals.bloodSugar.value ? `${formData.vitals.bloodSugar.value} mg/dL` : 'Not recorded'}
                  </p>
                )}
              </div>
              <div>
                <Label>Heart Rate (bpm)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.vitals.heartRate.value || ''}
                    onChange={(e) => handleChange('vitals.heartRate.value', parseFloat(e.target.value))}
                  />
                ) : (
                  <p className="font-medium mt-1">
                    {formData.vitals.heartRate.value ? `${formData.vitals.heartRate.value} bpm` : 'Not recorded'}
                  </p>
                )}
              </div>
              <div>
                <Label>Temperature (°C)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.vitals.temperature.value || ''}
                    onChange={(e) => handleChange('vitals.temperature.value', parseFloat(e.target.value))}
                  />
                ) : (
                  <p className="font-medium mt-1">
                    {formData.vitals.temperature.value ? `${formData.vitals.temperature.value}°C` : 'Not recorded'}
                  </p>
                )}
              </div>
              <div>
                <Label>Oxygen Level (SpO2 %)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.vitals.oxygenLevel.value || ''}
                    onChange={(e) => handleChange('vitals.oxygenLevel.value', parseFloat(e.target.value))}
                  />
                ) : (
                  <p className="font-medium mt-1">
                    {formData.vitals.oxygenLevel.value ? `${formData.vitals.oxygenLevel.value}%` : 'Not recorded'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Medical History
            </h3>

            {/* Diseases */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base">Diseases</Label>
                {isEditing && (
                  <Button size="sm" onClick={addDisease}>
                    <Plus className="w-4 h-4 mr-1" /> Add Disease
                  </Button>
                )}
              </div>
              {formData.diseases.length === 0 ? (
                <p className="text-muted-foreground">No diseases recorded</p>
              ) : (
                <div className="space-y-3">
                  {formData.diseases.map((disease, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      {isEditing ? (
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Disease name"
                            value={disease.name}
                            onChange={(e) => updateDisease(index, 'name', e.target.value)}
                          />
                          <Input
                            type="date"
                            placeholder="Diagnosed date"
                            value={disease.diagnosedDate ? new Date(disease.diagnosedDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => updateDisease(index, 'diagnosedDate', e.target.value)}
                          />
                          <Textarea
                            placeholder="Notes"
                            value={disease.notes}
                            onChange={(e) => updateDisease(index, 'notes', e.target.value)}
                            className="md:col-span-2"
                          />
                          <div className="flex items-center justify-between md:col-span-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={disease.isActive}
                                onChange={(e) => updateDisease(index, 'isActive', e.target.checked)}
                                className="w-4 h-4"
                              />
                              Active
                            </label>
                            <Button size="sm" variant="destructive" onClick={() => removeDisease(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">{disease.name}</p>
                          {disease.diagnosedDate && (
                            <p className="text-sm text-muted-foreground">
                              Diagnosed: {new Date(disease.diagnosedDate).toLocaleDateString()}
                            </p>
                          )}
                          {disease.notes && <p className="text-sm mt-1">{disease.notes}</p>}
                          <span className={`text-xs px-2 py-1 rounded-full ${disease.isActive ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                            {disease.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Allergies */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base">Allergies</Label>
                {isEditing && (
                  <Button size="sm" onClick={addAllergy}>
                    <Plus className="w-4 h-4 mr-1" /> Add Allergy
                  </Button>
                )}
              </div>
              {formData.allergies.length === 0 ? (
                <p className="text-muted-foreground">No allergies recorded</p>
              ) : (
                <div className="space-y-3">
                  {formData.allergies.map((allergy, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      {isEditing ? (
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Allergen"
                            value={allergy.allergen}
                            onChange={(e) => updateAllergy(index, 'allergen', e.target.value)}
                          />
                          <Input
                            placeholder="Reaction"
                            value={allergy.reaction}
                            onChange={(e) => updateAllergy(index, 'reaction', e.target.value)}
                          />
                          <Select
                            value={allergy.severity}
                            onValueChange={(value) => updateAllergy(index, 'severity', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mild">Mild</SelectItem>
                              <SelectItem value="Moderate">Moderate</SelectItem>
                              <SelectItem value="Severe">Severe</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            value={allergy.diagnosedDate ? new Date(allergy.diagnosedDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => updateAllergy(index, 'diagnosedDate', e.target.value)}
                          />
                          <Button size="sm" variant="destructive" onClick={() => removeAllergy(index)} className="md:col-span-2">
                            <Trash2 className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">{allergy.allergen}</p>
                          <p className="text-sm text-muted-foreground">Reaction: {allergy.reaction}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            allergy.severity === 'Severe' ? 'bg-red-100 text-red-600' :
                            allergy.severity === 'Moderate' ? 'bg-orange-100 text-orange-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {allergy.severity}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medications */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base">Current Medications</Label>
                {isEditing && (
                  <Button size="sm" onClick={addMedication}>
                    <Plus className="w-4 h-4 mr-1" /> Add Medication
                  </Button>
                )}
              </div>
              {formData.medications.length === 0 ? (
                <p className="text-muted-foreground">No medications recorded</p>
              ) : (
                <div className="space-y-3">
                  {formData.medications.map((medication, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      {isEditing ? (
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Medication name"
                            value={medication.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="Dosage"
                            value={medication.dosage}
                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          />
                          <Input
                            placeholder="Frequency (e.g., Twice daily)"
                            value={medication.frequency}
                            onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                            className="md:col-span-2"
                          />
                          <Input
                            type="date"
                            placeholder="Start date"
                            value={medication.startDate ? new Date(medication.startDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => updateMedication(index, 'startDate', e.target.value)}
                          />
                          <Input
                            type="date"
                            placeholder="End date"
                            value={medication.endDate ? new Date(medication.endDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => updateMedication(index, 'endDate', e.target.value)}
                          />
                          <Button size="sm" variant="destructive" onClick={() => removeMedication(index)} className="md:col-span-2">
                            <Trash2 className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <Pill className="w-4 h-4 text-primary" />
                            {medication.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {medication.dosage} - {medication.frequency}
                          </p>
                          {medication.startDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Started: {new Date(medication.startDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Emergency Contact
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Contact Name</Label>
                {isEditing ? (
                  <Input value={formData.emergencyContact.name} onChange={(e) => handleChange('emergencyContact.name', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">{formData.emergencyContact.name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Relationship</Label>
                {isEditing ? (
                  <Input value={formData.emergencyContact.relationship} onChange={(e) => handleChange('emergencyContact.relationship', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">{formData.emergencyContact.relationship || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Phone Number</Label>
                {isEditing ? (
                  <Input value={formData.emergencyContact.phone} onChange={(e) => handleChange('emergencyContact.phone', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">{formData.emergencyContact.phone || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Email</Label>
                {isEditing ? (
                  <Input value={formData.emergencyContact.email} onChange={(e) => handleChange('emergencyContact.email', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">{formData.emergencyContact.email || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insurance' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Insurance Information
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Insurance Provider</Label>
                {isEditing ? (
                  <Input value={formData.insurance.provider} onChange={(e) => handleChange('insurance.provider', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">{formData.insurance.provider || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Policy Number</Label>
                {isEditing ? (
                  <Input value={formData.insurance.policyNumber} onChange={(e) => handleChange('insurance.policyNumber', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">{formData.insurance.policyNumber || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label>Valid Until</Label>
                {isEditing ? (
                  <Input type="date" value={formData.insurance.validUntil} onChange={(e) => handleChange('insurance.validUntil', e.target.value)} />
                ) : (
                  <p className="font-medium mt-1">
                    {formData.insurance.validUntil ? new Date(formData.insurance.validUntil).toLocaleDateString() : 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lifestyle' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Lifestyle Information
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Smoking</Label>
                {isEditing ? (
                  <Select value={formData.lifestyle.smoking} onValueChange={(value) => handleChange('lifestyle.smoking', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Never">Never</SelectItem>
                      <SelectItem value="Former">Former</SelectItem>
                      <SelectItem value="Current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-1">{formData.lifestyle.smoking}</p>
                )}
              </div>
              <div>
                <Label>Alcohol</Label>
                {isEditing ? (
                  <Select value={formData.lifestyle.alcohol} onValueChange={(value) => handleChange('lifestyle.alcohol', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Never">Never</SelectItem>
                      <SelectItem value="Occasional">Occasional</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-1">{formData.lifestyle.alcohol}</p>
                )}
              </div>
              <div>
                <Label>Exercise</Label>
                {isEditing ? (
                  <Select value={formData.lifestyle.exercise} onValueChange={(value) => handleChange('lifestyle.exercise', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sedentary">Sedentary</SelectItem>
                      <SelectItem value="Light">Light</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Very Active">Very Active</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-1">{formData.lifestyle.exercise}</p>
                )}
              </div>
              <div>
                <Label>Diet</Label>
                {isEditing ? (
                  <Select value={formData.lifestyle.diet} onValueChange={(value) => handleChange('lifestyle.diet', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                      <SelectItem value="Non-Vegetarian">Non-Vegetarian</SelectItem>
                      <SelectItem value="Vegan">Vegan</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-1">{formData.lifestyle.diet}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
