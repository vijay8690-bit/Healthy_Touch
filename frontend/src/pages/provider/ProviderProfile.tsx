import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  User,
  Edit2,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Clock,
  Star,
  Award,
  Upload,
  ExternalLink,
  FileCheck,
  Plus,
  Trash2,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProviderSidebarLinks } from '@/components/layout/ProviderSidebarLinks';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { getAssetViewUrl } from '@/utils/assetProxy';
import { useProviderApproval } from '@/hooks/useProviderApproval';
import providerService from '@/services/provider.service';
import {
  getActivePhysiotherapyAddons,
  getActivePhysiotherapyServices,
  type PhysiotherapyAddon,
  type PhysiotherapyService,
} from '@/services/physiotherapy.service';
import {
  getActiveNurseAddons,
  getActiveNurseServices,
  type NurseAddon,
  type NurseService,
} from '@/services/nurse.service';
import {
  getActiveCaretakerAddons,
  getActiveCaretakerServices,
  type CaretakerAddon,
  type CaretakerService,
} from '@/services/caretaker-catalog.service';

export default function ProviderProfile() {
  const { loading: approvalLoading } = useProviderApproval();
  const [isAvailable, setIsAvailable] = useState(true);
  const { count: notificationCount } = useNotificationCount();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [selectedAadharDocuments, setSelectedAadharDocuments] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [physiotherapyServices, setPhysiotherapyServices] = useState<PhysiotherapyService[]>([]);
  const [physiotherapyAddons, setPhysiotherapyAddons] = useState<PhysiotherapyAddon[]>([]);
  const [loadingPhysiotherapyCatalogue, setLoadingPhysiotherapyCatalogue] = useState(false);
  const [nurseServices, setNurseServices] = useState<NurseService[]>([]);
  const [nurseAddons, setNurseAddons] = useState<NurseAddon[]>([]);
  const [loadingNurseCatalogue, setLoadingNurseCatalogue] = useState(false);
  const [caretakerServices, setCaretakerServices] = useState<CaretakerService[]>([]);
  const [caretakerAddons, setCaretakerAddons] = useState<CaretakerAddon[]>([]);
  const [loadingCaretakerCatalogue, setLoadingCaretakerCatalogue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    category: '',
    specialization: '',
    labName: '',
    qualification: '',
    fees: 0,
    experience: 0,
    bio: '',
    availability: [] as any[],
    address: { street: '', city: '', state: '', pincode: '' },
    physiotherapyServiceIds: [] as string[],
    physiotherapyAddonIds: [] as string[],
    physiotherapyServicePricing: [] as { serviceId: string; customPrice: number | string }[],
    physiotherapyAddonPricing: [] as { addonId: string; customPrice: number | string }[],
    nurseServiceIds: [] as string[],
    nurseAddonIds: [] as string[],
    nurseServicePricing: [] as { serviceId: string; customPrice: number | string }[],
    nurseAddonPricing: [] as { addonId: string; customPrice: number | string }[],
    caretakerServiceIds: [] as string[],
    caretakerAddonIds: [] as string[],
    caretakerServicePricing: [] as { serviceId: string; customPrice: number | string }[],
    caretakerAddonPricing: [] as { addonId: string; customPrice: number | string }[],
  });
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const supportPhone = (((settings as any)?.contactPhone as string | undefined) || import.meta.env.VITE_SUPPORT_PHONE || '9887894498').trim();
  const supportEmail = (((settings as any)?.supportEmail as string | undefined) || import.meta.env.VITE_SUPPORT_EMAIL || 'care@healthytouch.in').trim();
  const formatExperience = (value: unknown) => `${Number(value) || 0} years experience`;

  useEffect(() => {
    if (!approvalLoading) {
      fetchProviderProfile();
      fetchUserProfile();
    }
  }, [approvalLoading]);

  useEffect(() => {
    if (profile?.category !== 'Physiotherapist') return;

    setLoadingPhysiotherapyCatalogue(true);
    Promise.all([getActivePhysiotherapyServices(), getActivePhysiotherapyAddons()])
      .then(([serviceResponse, addonResponse]) => {
        setPhysiotherapyServices(Array.isArray(serviceResponse.services) ? serviceResponse.services : []);
        setPhysiotherapyAddons(Array.isArray(addonResponse.addons) ? addonResponse.addons : []);
      })
      .catch(() => {
        setPhysiotherapyServices([]);
        setPhysiotherapyAddons([]);
        toast({
          title: 'Unable to load services',
          description: 'Physiotherapy catalogue could not be loaded.',
          variant: 'destructive',
        });
      })
      .finally(() => setLoadingPhysiotherapyCatalogue(false));
  }, [profile?.category]);

  useEffect(() => {
    if (!['Caretaker', 'Care Taker'].includes(profile?.category)) return;
    setLoadingCaretakerCatalogue(true);
    Promise.all([getActiveCaretakerServices(), getActiveCaretakerAddons()])
      .then(([serviceResponse, addonResponse]) => {
        setCaretakerServices(serviceResponse.services || []);
        setCaretakerAddons(addonResponse.addons || []);
      })
      .catch(() => toast({ title: 'Unable to load services', description: 'Caretaker catalogue could not be loaded.', variant: 'destructive' }))
      .finally(() => setLoadingCaretakerCatalogue(false));
  }, [profile?.category]);

  useEffect(() => {
    if (profile?.category !== 'Nurse') return;
    setLoadingNurseCatalogue(true);
    Promise.all([getActiveNurseServices(), getActiveNurseAddons()])
      .then(([serviceResponse, addonResponse]) => {
        setNurseServices(Array.isArray(serviceResponse.services) ? serviceResponse.services : []);
        setNurseAddons(Array.isArray(addonResponse.addons) ? addonResponse.addons : []);
      })
      .catch(() => {
        setNurseServices([]);
        setNurseAddons([]);
        toast({ title: 'Unable to load services', description: 'Nurse catalogue could not be loaded.', variant: 'destructive' });
      })
      .finally(() => setLoadingNurseCatalogue(false));
  }, [profile?.category]);

  // fetch user is role iss provider 
  const userIsProvider = user?.role?.includes('provider');

  // const fetchUserIsProvider = async () => {
  //   try {
  //     const response = await userIsProvider.fetch('/api/user/is-provider');
  //     return response.isProvider;
  //   } catch (error) {
  //     return false;
  //   }
  // };

  const fetchProviderProfile = async () => {
    try {
      setLoading(true);
      const response = await providerService.getMyProfile();
      if (response.success && response.provider) {
        const provider = response.provider;
        setProfile(provider);
        setIsAvailable(provider.availabilityStatus !== false);
        setFormData({
          category: provider.category || '',
          specialization: provider.specialization || '',
          labName: provider.labName || '',
          qualification: provider.qualification || '',
          fees: provider.fees || 0,
          experience: provider.experience || 0,
          bio: provider.bio || '',
          availability: provider.availability || [],
          address: provider.address || { street: '', city: '', state: '', pincode: '' },
          physiotherapyServiceIds: Array.isArray(provider.physiotherapyServiceIds)
            ? provider.physiotherapyServiceIds.map((id: any) => String(id?._id || id))
            : [],
          physiotherapyAddonIds: Array.isArray(provider.physiotherapyAddonIds)
            ? provider.physiotherapyAddonIds.map((id: any) => String(id?._id || id))
            : [],
          physiotherapyServicePricing: Array.isArray(provider.physiotherapyServicePricing)
            ? provider.physiotherapyServicePricing.map((item: any) => ({ serviceId: String(item.serviceId?._id || item.serviceId), customPrice: item.customPrice }))
            : [],
          physiotherapyAddonPricing: Array.isArray(provider.physiotherapyAddonPricing)
            ? provider.physiotherapyAddonPricing.map((item: any) => ({ addonId: String(item.addonId?._id || item.addonId), customPrice: item.customPrice }))
            : [],
          nurseServiceIds: Array.isArray(provider.nurseServiceIds)
            ? provider.nurseServiceIds.map((id: any) => String(id?._id || id))
            : [],
          nurseAddonIds: Array.isArray(provider.nurseAddonIds)
            ? provider.nurseAddonIds.map((id: any) => String(id?._id || id))
            : [],
          nurseServicePricing: Array.isArray(provider.nurseServicePricing)
            ? provider.nurseServicePricing.map((item: any) => ({ serviceId: String(item.serviceId?._id || item.serviceId), customPrice: item.customPrice }))
            : [],
          nurseAddonPricing: Array.isArray(provider.nurseAddonPricing)
            ? provider.nurseAddonPricing.map((item: any) => ({ addonId: String(item.addonId?._id || item.addonId), customPrice: item.customPrice }))
            : [],
          caretakerServiceIds: Array.isArray(provider.caretakerServiceIds) ? provider.caretakerServiceIds.map((id: any) => String(id?._id || id)) : [],
          caretakerAddonIds: Array.isArray(provider.caretakerAddonIds) ? provider.caretakerAddonIds.map((id: any) => String(id?._id || id)) : [],
          caretakerServicePricing: Array.isArray(provider.caretakerServicePricing) ? provider.caretakerServicePricing.map((item: any) => ({ serviceId: String(item.serviceId?._id || item.serviceId), customPrice: item.customPrice })) : [],
          caretakerAddonPricing: Array.isArray(provider.caretakerAddonPricing) ? provider.caretakerAddonPricing.map((item: any) => ({ addonId: String(item.addonId?._id || item.addonId), customPrice: item.customPrice })) : [],
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChange = async (checked: boolean) => {
    const previous = isAvailable;
    setIsAvailable(checked);
    try {
      const response = await providerService.updateAvailabilityStatus(checked);
      if (response?.success && response?.provider) {
        setProfile(response.provider);
        setIsAvailable(response.provider.availabilityStatus !== false);
      }
      toast({
        title: 'Availability Updated',
        description: checked
          ? 'You are now available for booking.'
          : 'You are now unavailable for booking.',
      });
    } catch (error: any) {
      setIsAvailable(previous);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update availability status',
        variant: 'destructive',
      });
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await providerService.getUserProfile();
      if (response.success && response.user) {
        setUserProfile(response.user);
      }
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) { // 3MB limit
        toast({
          title: 'Error',
          description: 'Image size should be 3MB or less',
          variant: 'destructive',
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size <= 5 * 1024 * 1024) return true;
      toast({
        title: 'Error',
        description: `${file.name} should be 5MB or less`,
        variant: 'destructive',
      });
      return false;
    });
    setSelectedDocuments(validFiles);
  };

  const handleDocumentUpload = () => {
    documentInputRef.current?.click();
  };

  const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size <= 5 * 1024 * 1024) return true;
      toast({
        title: 'Error',
        description: `${file.name} should be 5MB or less`,
        variant: 'destructive',
      });
      return false;
    });
    setSelectedAadharDocuments(validFiles);
  };

  const handleAadharUpload = () => {
    aadharInputRef.current?.click();
  };

  const handleAddAvailability = () => {
    setFormData(prev => ({
      ...prev,
      availability: [...prev.availability, { day: 'Monday', startTime: '07:00', endTime: '21:00' }]
    }));
  };

  const handleRemoveAvailability = (index: number) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.filter((_, i) => i !== index)
    }));
  };

  const handleAvailabilitySlotChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const handleOfferingToggle = (field: 'physiotherapyServiceIds' | 'physiotherapyAddonIds' | 'nurseServiceIds' | 'nurseAddonIds' | 'caretakerServiceIds' | 'caretakerAddonIds', id: string, checked: boolean) => {
    setFormData((current) => ({
      ...current,
      [field]: checked
        ? [...new Set([...current[field], id])]
        : current[field].filter((selectedId) => selectedId !== id),
    }));
  };
  const setCaretakerCustomPrice = (serviceId: string, value: string) => {
    setFormData((current) => ({
      ...current,
      caretakerServicePricing: [
        ...current.caretakerServicePricing.filter((item) => item.serviceId !== serviceId),
        ...(value === '' ? [] : [{ serviceId, customPrice: value }]),
      ],
    }));
  };

  const setServiceCustomPrice = (
    field: 'physiotherapyServicePricing' | 'nurseServicePricing' | 'caretakerServicePricing' | 'physiotherapyAddonPricing' | 'nurseAddonPricing' | 'caretakerAddonPricing',
    serviceId: string,
    value: string,
  ) => {
    const idKey = field.includes('Addon') ? 'addonId' : 'serviceId';
    setFormData((current) => ({
      ...current,
      [field]: [
        ...current[field].filter((item: any) => item[idKey] !== serviceId),
        ...(value === '' ? [] : [{ [idKey]: serviceId, customPrice: value }]),
      ],
    }));
  };

  const getServicePrice = (
    field: 'physiotherapyServicePricing' | 'nurseServicePricing' | 'caretakerServicePricing' | 'physiotherapyAddonPricing' | 'nurseAddonPricing' | 'caretakerAddonPricing',
    serviceId: string,
    defaultPrice: number,
  ) => {
    const idKey = field.includes('Addon') ? 'addonId' : 'serviceId';
    return formData[field].find((item: any) => item[idKey] === serviceId)?.customPrice ?? defaultPrice;
  };

  if (approvalLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const addressText = [
    profile.address?.street,
    profile.address?.city,
    profile.address?.state,
    profile.address?.pincode,
  ].filter(Boolean).join(', ') || profile.location?.address || 'Address not provided';

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData();
      
      // Append profile image if selected
      if (selectedImage) {
        formDataToSend.append('profileImage', selectedImage);
      }
      selectedDocuments.forEach((file) => {
        formDataToSend.append('documents', file);
      });
      selectedAadharDocuments.forEach((file) => {
        formDataToSend.append('aadharImages', file);
      });
      
      // Append other form data
      formDataToSend.append('category', formData.category);
      formDataToSend.append('specialization', formData.specialization);
      if (formData.category === 'Lab Technician') {
        formDataToSend.append('labName', formData.labName);
      }
      formDataToSend.append('qualification', formData.qualification);
      formDataToSend.append('fees', formData.fees.toString());
      formDataToSend.append('experience', formData.experience.toString());
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('availability', JSON.stringify(formData.availability));
      formDataToSend.append('address', JSON.stringify(formData.address));
      if (formData.category === 'Physiotherapist') {
        formDataToSend.append('physiotherapyServiceIds', JSON.stringify(formData.physiotherapyServiceIds));
        formDataToSend.append('physiotherapyAddonIds', JSON.stringify(formData.physiotherapyAddonIds));
        formDataToSend.append('physiotherapyServicePricing', JSON.stringify(formData.physiotherapyServicePricing));
        formDataToSend.append('physiotherapyAddonPricing', JSON.stringify(formData.physiotherapyAddonPricing));
      }
      if (formData.category === 'Nurse') {
        formDataToSend.append('nurseServiceIds', JSON.stringify(formData.nurseServiceIds));
        formDataToSend.append('nurseAddonIds', JSON.stringify(formData.nurseAddonIds));
        formDataToSend.append('nurseServicePricing', JSON.stringify(formData.nurseServicePricing));
        formDataToSend.append('nurseAddonPricing', JSON.stringify(formData.nurseAddonPricing));
      }
      if (['Caretaker', 'Care Taker'].includes(formData.category)) {
        formDataToSend.append('caretakerServiceIds', JSON.stringify(formData.caretakerServiceIds));
        formDataToSend.append('caretakerAddonIds', JSON.stringify(formData.caretakerAddonIds));
        formDataToSend.append('caretakerServicePricing', JSON.stringify(formData.caretakerServicePricing));
        formDataToSend.append('caretakerAddonPricing', JSON.stringify(formData.caretakerAddonPricing));
      }
      
      const response = await providerService.updateMyProfile(formDataToSend);
      if (response.success) {
        setIsEditing(false);
        setSelectedImage(null);
        setSelectedDocuments([]);
        setSelectedAadharDocuments([]);
        setImagePreview(null);
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.',
        });
        fetchProviderProfile();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleChange = (field: string, value: string | number) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your complete provider account? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await providerService.deleteMyProfile();
      toast({
        title: 'Account Deleted',
        description: 'Your provider account has been deleted.',
      });
      logout();
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  const providerType = profile?.category || 'Provider';
  const isAccountSuspended = Boolean(userProfile?.isSuspended || (user as any)?.isSuspended);
  const suspensionReason = userProfile?.suspension?.reason || (user as any)?.suspension?.reason;

  const statusBadge = (
    <div className={`p-4 rounded-xl ${isAvailable ? 'bg-secondary/10 border-secondary/20' : 'bg-muted border-border'} border`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-secondary animate-pulse' : 'bg-muted-foreground'}`} />
        <span className={`text-sm font-medium ${isAvailable ? 'text-secondary' : 'text-muted-foreground'}`}>
          {isAvailable ? 'Profile Active' : 'Profile Inactive'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {isAvailable ? 'Visible to patients' : 'Hidden from patients'}
      </p>
    </div>
  );

  return (
    <DashboardLayout
      sidebarLinks={getProviderSidebarLinks(user)}
      portalName="My Profile"
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
          <h2 className="font-display text-2xl font-bold">Profile Settings</h2>
          <p className="text-muted-foreground">Manage your professional profile</p>
        </div>
        {!isEditing ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setSelectedImage(null);
              setSelectedDocuments([]);
              setImagePreview(null);
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

      {isAccountSuspended && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <AlertCircle className="h-5 w-5" />
                Account Suspended - Help
              </h3>
              <p className="text-sm text-red-800">
                Your provider account is currently suspended. Contact admin support for review and reactivation.
              </p>
              {suspensionReason && (
                <p className="text-sm font-medium">Reason: {suspensionReason}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 text-sm md:min-w-64">
              <a href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-medium text-red-900 shadow-sm">
                <Phone className="h-4 w-4" />
                Admin No. {supportPhone}
              </a>
              <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-medium text-red-900 shadow-sm">
                <Mail className="h-4 w-4" />
                Admin Email {supportEmail}
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* Availability Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-healthcare p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Availability Status</h3>
            <p className="text-sm text-muted-foreground">Toggle to show/hide your profile from patients</p>
          </div>
          <Switch checked={isAvailable} onCheckedChange={handleAvailabilityChange} />
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-healthcare p-6"
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="relative">
            {profile.profileImage || imagePreview ? (
              <img
                src={imagePreview || profile.profileImage}
                alt={userProfile?.name || 'Profile'}
                className="w-28 h-28 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                {userProfile?.name?.charAt(0).toUpperCase() || 'P'}
              </div>
            )}
            {isEditing && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button 
                  onClick={handleImageUpload}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              {isEditing ? (
                <Input
                  value={userProfile?.name || ''}
                  disabled
                  className="text-xl font-bold"
                />
              ) : (
                <h3 className="text-xl font-bold">{userProfile?.name || 'Provider Name'}</h3>
              )}
              {isEditing ? (
                <Input
                  value={formData.specialization}
                  onChange={(e) => handleChange('specialization', e.target.value)}
                  className="mt-2 max-w-xl"
                  placeholder="Specialization"
                />
              ) : (
                <p className="text-muted-foreground">{profile.specialization || 'Specialization not provided'}</p>
              )}
              {profile.category === 'Lab Technician' && (
                <p className="text-sm font-medium text-primary">{profile.labName || 'Lab / Centre Name not set'}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {profile.category} • {profile.qualification || 'N/A'} • {profile.experience} years experience
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {profile.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-secondary" />
                {profile.averageRating || 0} ({profile.totalReviews || 0} reviews)
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                profile.status === 'approved' 
                  ? 'bg-green-100 text-green-700' 
                  : profile.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {profile.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* User Information Card */}
      {userProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="card-healthcare p-6"
        >
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            User Account Information
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Account Status</Label>
              <p className="font-medium mt-1">
                {userProfile.isVerified ? (
                  <span className="text-green-600 flex items-center gap-1">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="text-yellow-600">Pending Verification</span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Member Since</Label>
              <p className="font-medium mt-1">
                {new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Login</Label>
              <p className="font-medium mt-1">
                {userProfile.lastLogin 
                  ? new Date(userProfile.lastLogin).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-healthcare p-6"
        >
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Contact Information
          </h3>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm">Email</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={userProfile?.email || ''}
                  disabled
                  className="mt-1"
                />
              ) : (
                <p className="font-medium flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {userProfile?.email || 'Not provided'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Phone</Label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={userProfile?.mobile || ''}
                  disabled
                  className="mt-1"
                />
              ) : (
                <p className="font-medium flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {userProfile?.mobile || 'Not provided'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Address</Label>
              {isEditing ? (
                <div className="space-y-2 mt-1">
                  <Input
                    placeholder="Street"
                    value={formData.address.street}
                    onChange={(e) => handleChange('address.street', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="City"
                      value={formData.address.city}
                      onChange={(e) => handleChange('address.city', e.target.value)}
                    />
                    <Input
                      placeholder="State"
                      value={formData.address.state}
                      onChange={(e) => handleChange('address.state', e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="Pincode"
                    value={formData.address.pincode}
                    onChange={(e) => handleChange('address.pincode', e.target.value)}
                  />
                </div>
              ) : (
                <p className="font-medium flex items-start gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <span>
                    {addressText}
                  </span>
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Working Hours & Fee */}
        
        {profile.category === 'Lab Technician' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border shadow-sm rounded-2xl p-6"
          >
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Lab / Centre Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
              <div><p className="text-sm text-muted-foreground mb-1">Lab Service Type</p><p className="font-medium">{profile.labServiceType || 'N/A'}</p></div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lab Name</p>
                {isEditing ? (
                  <Input
                    value={formData.labName}
                    onChange={(e) => handleChange('labName', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{profile.labName || 'N/A'}</p>
                )}
              </div>
              <div><p className="text-sm text-muted-foreground mb-1">Lab Code</p><p className="font-medium">{profile.labCode || 'N/A'}</p></div>
              <div className="md:col-span-2"><p className="text-sm text-muted-foreground mb-1">Available Tests/Services</p><p className="font-medium">{profile.availableTests?.join(', ') || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Home Sample Collection</p><p className="font-medium">{profile.homeSampleCollection || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Experience</p><p className="font-medium">{profile.labExperience || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Service Area</p><p className="font-medium">{profile.labServiceArea || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Report Delivery</p><p className="font-medium">{profile.reportDeliveryTime || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Certification Status</p><p className="font-medium">{profile.certificationStatus || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Contact Person</p><p className="font-medium">{profile.contactPersonName || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Contact Number</p><p className="font-medium">{profile.labContactNumber || 'N/A'}</p></div>
              <div><p className="text-sm text-muted-foreground mb-1">Emergency Number</p><p className="font-medium">{profile.labEmergencyContactNumber || 'N/A'}</p></div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                {profile.labRegistrationCertificate && <div className="space-y-1"><p className="text-xs text-muted-foreground">Lab Registration</p><img src={profile.labRegistrationCertificate} className="h-20 w-full object-cover rounded-md border" alt="Lab Reg"/></div>}
                {profile.nablCertificate?.map((url: string, i: number) => <div key={i} className="space-y-1"><p className="text-xs text-muted-foreground">NABL {i+1}</p><img src={url} className="h-20 w-full object-cover rounded-md border" alt="NABL"/></div>)}
                {profile.policeVerificationDocument && <div className="space-y-1"><p className="text-xs text-muted-foreground">Police Verification</p><img src={profile.policeVerificationDocument} className="h-20 w-full object-cover rounded-md border" alt="Pol"/></div>}
            </div>
          </motion.div>
        )}
        {profile.category === 'Physiotherapist' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-healthcare p-6 md:col-span-2"
          >
            <h3 className="font-display font-semibold text-lg mb-1">Physiotherapy Services Offered</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Select services and equipment add-ons from the admin catalogue that you provide.
            </p>
            {loadingPhysiotherapyCatalogue ? (
              <p className="text-sm text-muted-foreground">Loading catalogue...</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="font-medium mb-3">Services</p>
                  <div className="space-y-2">
                    {physiotherapyServices.length ? physiotherapyServices.map((service) => {
                      const selected = formData.physiotherapyServiceIds.includes(service._id);
                      const price = getServicePrice('physiotherapyServicePricing', service._id, Number(service.price || 0));
                      return (
                        <div key={service._id} className="rounded-lg border border-border p-3">
                          <label className="flex items-start gap-3">
                            {isEditing && (
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => handleOfferingToggle('physiotherapyServiceIds', service._id, checked === true)}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{service.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {service.durationMinutes} min - Rs. {Number(price || 0).toLocaleString('en-IN')}
                              </p>
                              {!isEditing && !selected && <p className="text-xs text-muted-foreground">Not offered</p>}
                            </div>
                          </label>
                          {isEditing && selected && (
                            <Input
                              className="mt-2"
                              type="number"
                              min="0"
                              placeholder={`Default Rs. ${Number(service.price || 0).toLocaleString('en-IN')}`}
                              value={formData.physiotherapyServicePricing.find((item) => item.serviceId === service._id)?.customPrice ?? ''}
                              onChange={(event) => setServiceCustomPrice('physiotherapyServicePricing', service._id, event.target.value)}
                            />
                          )}
                        </div>
                      );
                    }) : <p className="text-sm text-muted-foreground">No active services available.</p>}
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-3">Equipment Add-ons</p>
                  <div className="space-y-2">
                    {physiotherapyAddons.length ? physiotherapyAddons.map((addon) => {
                      const selected = formData.physiotherapyAddonIds.includes(addon._id);
                      const price = getServicePrice('physiotherapyAddonPricing', addon._id, Number(addon.price || 0));
                      return (
                        <div key={addon._id} className="rounded-lg border border-border p-3">
                          <label className="flex items-start gap-3">
                            {isEditing && (
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => handleOfferingToggle('physiotherapyAddonIds', addon._id, checked === true)}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">+Rs. {Number(price || 0).toLocaleString('en-IN')}</p>
                              {!isEditing && !selected && <p className="text-xs text-muted-foreground">Not offered</p>}
                            </div>
                          </label>
                          {isEditing && selected && (
                            <Input
                              className="mt-2"
                              type="number"
                              min="0"
                              placeholder={`Default Rs. ${Number(addon.price || 0).toLocaleString('en-IN')}`}
                              value={formData.physiotherapyAddonPricing.find((item) => item.addonId === addon._id)?.customPrice ?? ''}
                              onChange={(event) => setServiceCustomPrice('physiotherapyAddonPricing', addon._id, event.target.value)}
                            />
                          )}
                        </div>
                      );
                    }) : <p className="text-sm text-muted-foreground">No active add-ons available.</p>}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
        {profile.category === 'Nurse' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-healthcare p-6 md:col-span-2">
            <h3 className="font-display font-semibold text-lg mb-1">Nurse Services Offered</h3>
            <p className="text-sm text-muted-foreground mb-5">Select services and optional add-ons from the admin catalogue that you provide.</p>
            {loadingNurseCatalogue ? <p className="text-sm text-muted-foreground">Loading catalogue...</p> : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="font-medium mb-3">Services</p>
                  <div className="space-y-2">
                    {nurseServices.length ? nurseServices.map((service) => {
                      const selected = formData.nurseServiceIds.includes(service._id);
                      const price = getServicePrice('nurseServicePricing', service._id, Number(service.price || 0));
                      return <div key={service._id} className="rounded-lg border border-border p-3">
                        <label className="flex items-start gap-3">
                          {isEditing && <Checkbox checked={selected} onCheckedChange={(checked) => handleOfferingToggle('nurseServiceIds', service._id, checked === true)} />}
                          <div className="min-w-0"><p className="font-medium text-sm">{service.serviceName}</p><p className="text-xs text-muted-foreground">{service.durationMinutes} min - Rs. {Number(price || 0).toLocaleString('en-IN')}</p>{!isEditing && !selected && <p className="text-xs text-muted-foreground">Not offered</p>}</div>
                        </label>
                        {isEditing && selected && (
                          <Input
                            className="mt-2"
                            type="number"
                            min="0"
                            placeholder={`Default Rs. ${Number(service.price || 0).toLocaleString('en-IN')}`}
                            value={formData.nurseServicePricing.find((item) => item.serviceId === service._id)?.customPrice ?? ''}
                            onChange={(event) => setServiceCustomPrice('nurseServicePricing', service._id, event.target.value)}
                          />
                        )}
                      </div>;
                    }) : <p className="text-sm text-muted-foreground">No active services available.</p>}
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-3">Optional Add-ons</p>
                  <div className="space-y-2">
                    {nurseAddons.length ? nurseAddons.map((addon) => {
                      const selected = formData.nurseAddonIds.includes(addon._id);
                      const price = getServicePrice('nurseAddonPricing', addon._id, Number(addon.price || 0));
                      return <div key={addon._id} className="rounded-lg border border-border p-3">
                        <label className="flex items-start gap-3">
                          {isEditing && <Checkbox checked={selected} onCheckedChange={(checked) => handleOfferingToggle('nurseAddonIds', addon._id, checked === true)} />}
                          <div className="min-w-0"><p className="font-medium text-sm">{addon.addOnName}</p><p className="text-xs text-muted-foreground">+Rs. {Number(price || 0).toLocaleString('en-IN')}</p>{!isEditing && !selected && <p className="text-xs text-muted-foreground">Not offered</p>}</div>
                        </label>
                        {isEditing && selected && (
                          <Input
                            className="mt-2"
                            type="number"
                            min="0"
                            placeholder={`Default Rs. ${Number(addon.price || 0).toLocaleString('en-IN')}`}
                            value={formData.nurseAddonPricing.find((item) => item.addonId === addon._id)?.customPrice ?? ''}
                            onChange={(event) => setServiceCustomPrice('nurseAddonPricing', addon._id, event.target.value)}
                          />
                        )}
                      </div>;
                    }) : <p className="text-sm text-muted-foreground">No active add-ons available.</p>}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
        {['Caretaker', 'Care Taker'].includes(profile.category) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-healthcare p-6 md:col-span-2">
            <h3 className="font-display font-semibold text-lg mb-1">My Caretaker Services</h3>
            <p className="text-sm text-muted-foreground mb-5">Choose offered home care shifts and optionally set your base rate. Working hours remain controlled by your schedule.</p>
            {loadingCaretakerCatalogue ? <p className="text-sm text-muted-foreground">Loading catalogue...</p> : <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2"><p className="font-medium">Services and Shifts</p>{caretakerServices.map((service) => {
                const selected = formData.caretakerServiceIds.includes(service._id);
                const price = formData.caretakerServicePricing.find((item) => item.serviceId === service._id)?.customPrice ?? '';
                return <div key={service._id} className="rounded-lg border p-3"><label className="flex gap-3">{isEditing && <Checkbox checked={selected} onCheckedChange={(checked) => handleOfferingToggle('caretakerServiceIds', service._id, checked === true)} />}<span className="text-sm"><span className="block font-medium">{service.serviceName}</span><span className="text-muted-foreground">{service.handlesText || service.category} - {service.shiftType} - {service.durationHours} hrs - Rs. {service.basePrice}/{service.basePriceUnit || 'shift'}</span>{Boolean(service.tags?.length) && <span className="mt-1 block text-xs text-muted-foreground">{service.tags.join(' • ')}</span>}</span></label>{isEditing && selected && <Input className="mt-2" type="number" min="0" placeholder="Custom base price (optional)" value={price} onChange={(event) => setCaretakerCustomPrice(service._id, event.target.value)} />}</div>;
              })}</div>
              <div className="space-y-2"><p className="font-medium">Optional Add-ons</p>{caretakerAddons.map((addon) => {
                const selected = formData.caretakerAddonIds.includes(addon._id);
                const price = getServicePrice('caretakerAddonPricing', addon._id, Number(addon.price || 0));
                return <div key={addon._id} className="rounded-lg border p-3"><label className="flex gap-3">{isEditing && <Checkbox checked={selected} onCheckedChange={(checked) => handleOfferingToggle('caretakerAddonIds', addon._id, checked === true)} />}<span className="text-sm font-medium">{addon.addOnName} (+Rs. {Number(price).toLocaleString('en-IN')})</span></label>{isEditing && selected && <Input className="mt-2" type="number" min="0" placeholder={`Default Rs. ${Number(addon.price || 0).toLocaleString('en-IN')}`} value={formData.caretakerAddonPricing.find((item) => item.addonId === addon._id)?.customPrice ?? ''} onChange={(event) => setServiceCustomPrice('caretakerAddonPricing', addon._id, event.target.value)} />}</div>;
              })}</div>
            </div>}
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-healthcare p-6"
        >
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            Schedule & Fees
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-muted-foreground text-sm">Working Days & Hours</Label>
                {isEditing && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddAvailability}
                    className="h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Slot
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  {formData.availability.length > 0 ? (
                    formData.availability.map((slot: any, index: number) => (
                      <div key={index} className="grid gap-2 rounded-lg bg-muted/50 p-3 sm:flex sm:items-center">
                        <Select
                          value={slot.day}
                          onValueChange={(value) => handleAvailabilitySlotChange(index, 'day', value)}
                        >
                          <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monday">Monday</SelectItem>
                            <SelectItem value="Tuesday">Tuesday</SelectItem>
                            <SelectItem value="Wednesday">Wednesday</SelectItem>
                            <SelectItem value="Thursday">Thursday</SelectItem>
                            <SelectItem value="Friday">Friday</SelectItem>
                            <SelectItem value="Saturday">Saturday</SelectItem>
                            <SelectItem value="Sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleAvailabilitySlotChange(index, 'startTime', e.target.value)}
                          className="w-full sm:w-[120px]"
                        />
                        <span className="hidden text-muted-foreground sm:inline">to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleAvailabilitySlotChange(index, 'endTime', e.target.value)}
                          className="w-full sm:w-[120px]"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveAvailability(index)}
                          className="h-8 w-8 justify-self-end text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No availability set. Click "Add Slot" to add working hours.</p>
                  )}
                </div>
              ) : (
                <div>
                  {formData.availability && formData.availability.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {formData.availability.map((slot: any, index: number) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                          <span className="font-medium text-sm">{slot.day}</span>
                          <span className="text-sm text-muted-foreground">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium mt-1 text-muted-foreground">No availability set</p>
                  )}
                </div>
              )}
            </div>
            {/* Consultation fee is temporarily hidden for providers. */}
            {false && <div>
              <Label className="text-muted-foreground text-sm">Consultation Fee</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.fees}
                  onChange={(e) => handleChange('fees', Number(e.target.value))}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium flex items-center gap-1 mt-1">
                  <IndianRupee className="w-4 h-4 text-muted-foreground" />
                  {profile.fees || 0} per visit
                </p>
              )}
            </div>}
            <div>
              <Label className="text-muted-foreground text-sm">Experience (Years)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  value={formData.experience}
                  onChange={(e) => handleChange('experience', Number(e.target.value))}
                  className="mt-1"
                  placeholder="Enter experience in years"
                />
              ) : (
                <p className="font-medium mt-1">{formatExperience(profile.experience)}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Bio & Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-healthcare p-6 md:col-span-2"
        >
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            About & Certifications
          </h3>
          <div className="space-y-4">
            {/* Qualification Field */}
            <div>
              <Label className="text-muted-foreground text-sm">Qualification</Label>
              {isEditing ? (
                <Input
                  value={formData.qualification}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  className="mt-1"
                  placeholder="e.g., MBBS, MD, BSc Nursing, etc."
                />
              ) : (
                <p className="font-medium flex items-center gap-2 mt-1">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  {profile.qualification || 'N/A'}
                </p>
              )}
            </div>
            
            <div>
              <Label className="text-muted-foreground text-sm">Bio</Label>
              {isEditing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Tell patients about yourself..."
                />
              ) : (
                <p className="mt-1">{profile.bio || 'No bio provided'}</p>
              )}
            </div>

            {['Caretaker', 'Care Taker'].includes(profile.category) && (
              <div>
                <Label className="text-muted-foreground text-sm">Police Verification</Label>
                <p className="font-medium mt-1">{profile.policeVerificationStatus || 'Not provided'}</p>
                {profile.policeVerificationDocument && (
                  <a
                    href={getAssetViewUrl(profile.policeVerificationDocument, 'inline')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <FileCheck className="w-4 h-4" />
                    View police verification document
                  </a>
                )}
              </div>
            )}
            
            {/* Professional Documents/Certificates */}
            {isEditing && (
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">
                  Add Professional Certificates & Documents
                </Label>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={handleDocumentChange}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={handleDocumentUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Certificates
                </Button>
                {selectedDocuments.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedDocuments.length} new file{selectedDocuments.length === 1 ? '' : 's'} selected
                  </p>
                )}
              </div>
            )}
            {profile.documentation && profile.documentation.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">
                  Professional Certificates & Documents
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.documentation.map((doc: string, index: number) => (
                    <a
                      key={index}
                      href={getAssetViewUrl(doc, 'inline')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                    >
                      <FileCheck className="w-5 h-5 text-primary" />
                      <span className="flex-1 text-sm font-medium truncate">
                        Certificate {index + 1}
                      </span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Aadhar Documents */}
            {(isEditing || (profile.aadharImages && profile.aadharImages.length > 0)) && (
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">
                  Identity Verification Documents
                </Label>
                {isEditing && (
                  <div className="mb-3">
                    <input
                      ref={aadharInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      multiple
                      onChange={handleAadharChange}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" onClick={handleAadharUpload}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Identity Documents
                    </Button>
                    {selectedAadharDocuments.length > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedAadharDocuments.length} new file{selectedAadharDocuments.length === 1 ? '' : 's'} selected
                      </p>
                    )}
                  </div>
                )}
                {profile.aadharImages && profile.aadharImages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profile.aadharImages.map((img: string, index: number) => (
                      <a
                        key={index}
                        href={getAssetViewUrl(img, 'inline')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-secondary hover:bg-secondary/5 transition-colors group"
                      >
                        <FileCheck className="w-5 h-5 text-secondary" />
                        <span className="flex-1 text-sm font-medium truncate">
                          Aadhar Document {index + 1}
                        </span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-secondary" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex justify-end"
      >
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDeleteAccount}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </motion.div>
    </DashboardLayout>
  );
}
