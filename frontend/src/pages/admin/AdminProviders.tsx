import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  Settings,
  Home,
  LogOut,
  Menu,
  Search,
  Filter,
  UserCheck,
  UserX,
  Stethoscope,
  Star,
  MessageSquare,
  Eye,
  FileText,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Award,
  Clock,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { getAssetViewUrl } from "@/utils/assetProxy";
import adminService from "@/services/admin.service";
import uploadService from "@/services/upload.service";
import NotificationDropdown from "@/components/NotificationDropdown";
import { adminSidebarLinks as sidebarLinks } from '@/components/layout/AdminSidebarLinks';
import ProviderIdCard from "@/components/provider/ProviderIdCard";
import PhysiotherapyCatalogManager from "@/components/admin/PhysiotherapyCatalogManager";
import NurseCatalogManager from "@/components/admin/NurseCatalogManager";
import CaretakerCatalogManager from "@/components/admin/CaretakerCatalogManager";
import { FEATURES, isProviderCategoryEnabled } from "@/config/features";


// Provider categories in specific order
const providerCategories = [
  ...(FEATURES.DOCTOR_MODULE ? ["Doctor"] : []),
  "Nurse",
  "Physiotherapist",
  "Caretaker",
  "Lab Technician",
  ...(FEATURES.AMBULANCE_MODULE ? ["Ambulance"] : [])
];

export default function AdminProviders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [draftDocuments, setDraftDocuments] = useState<string[]>([]);
  const [draftAadharImages, setDraftAadharImages] = useState<string[]>([]);
  const [mediaDirty, setMediaDirty] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);
  const [filters, setFilters] = useState({ status: "all", category: "all" });
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showDeleteProviderDialog, setShowDeleteProviderDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [providerToWarn, setProviderToWarn] = useState<any>(null);
  const [providerToTerminate, setProviderToTerminate] = useState<any>(null);
  const [providerToDelete, setProviderToDelete] = useState<any>(null);
  const [savingProvider, setSavingProvider] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [assignmentServices, setAssignmentServices] = useState<any[]>([]);
  const [assignmentAddons, setAssignmentAddons] = useState<any[]>([]);
  const [assignmentNurseServices, setAssignmentNurseServices] = useState<any[]>([]);
  const [assignmentNurseAddons, setAssignmentNurseAddons] = useState<any[]>([]);
  const [assignmentCaretakerServices, setAssignmentCaretakerServices] = useState<any[]>([]);
  const [assignmentCaretakerAddons, setAssignmentCaretakerAddons] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<null | {
    type: "document" | "aadhar";
    index: number;
    url?: string;
  }>(null);
  const { logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const adminSupportEmail = ((settings as any)?.supportEmail || "care@healthytouch.in").trim();
  const adminContactPhone = ((settings as any)?.contactPhone || "9887894498").trim();
  const getProviderId = (provider: any) => provider?._id || provider?.id || provider?.providerProfile?._id;
  const isProviderSuspended = (provider: any) => Boolean(provider?.userId?.isSuspended || provider?.isSuspended);
  const normalizeCategory = (value: string) => {
    const lower = String(value || '').trim().toLowerCase();
    if (lower === 'care taker' || lower === 'caretaker') return 'Caretaker';
    if (lower === 'physiotherapist' || lower === 'physiotherapy') return 'Physiotherapist';
    if (lower === 'lab technician' || lower === 'lab') return 'Lab Technician';
    if (lower === 'nurse') return 'Nurse';
    if (lower === 'doctor') return 'Doctor';
    if (lower === 'ambulance') return 'Ambulance';
    return String(value || '').trim();
  };
  const isCaretakerProvider = (provider: any) => normalizeCategory(provider?.category) === "Caretaker";
  const formatProviderAvailability = (provider: any) => {
    if (!Array.isArray(provider?.availability) || provider.availability.length === 0) return "Not provided";
    return provider.availability
      .map((slot: any) => [slot.day, [slot.startTime, slot.endTime].filter(Boolean).join(" - ")].filter(Boolean).join(": "))
      .join(", ");
  };

  // Fetch providers from backend
  useEffect(() => {
    fetchProviders();
  }, [filters.status, filters.category]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const params: any = { role: "provider", limit: 1000 };

      if (filters.status !== "all") {
        params.status = filters.status.toLowerCase();
      }

      if (filters.category !== "all") {
        params.category = filters.category;
      }

      const response = await adminService.getAllUsers(params);

      if (response.success && response.users) {
        // Map users with providerProfile to provider format
        const mappedProviders = response.users
          .filter((user: any) => user.providerProfile && isProviderCategoryEnabled(normalizeCategory(user.providerProfile.category)))
          .map((user: any) => ({
            ...user.providerProfile,
            category: normalizeCategory(user.providerProfile.category),
            userId: user,
          }));

        console.log("Mapped providers:", mappedProviders);
        console.log("Sample provider image paths:", {
          profileImage: mappedProviders[0]?.profileImage,
          userIdProfileImage: mappedProviders[0]?.userId?.profileImage,
          documentation: mappedProviders[0]?.documentation,
        });

        setProviders(mappedProviders);
      }
    } catch (error: any) {
      console.error("Fetch providers error:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to fetch providers",
        variant: "destructive",
      });
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // Confirm deletion (used by centered dialog)
  const confirmDeleteTarget = async () => {
    if (!deleteTarget || !selectedProvider) {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      return;
    }

    const { type, index } = deleteTarget;
    let removedUrl: string | undefined;

    if (type === "document") {
      setDraftDocuments((prev) => {
        const next = [...prev];
        removedUrl = next.splice(index, 1)[0];
        if (removedUrl) setMediaToDelete((d) => [...d, removedUrl as string]);
        return next;
      });
    } else {
      setDraftAadharImages((prev) => {
        const next = [...prev];
        removedUrl = next.splice(index, 1)[0];
        if (removedUrl) setMediaToDelete((d) => [...d, removedUrl as string]);
        return next;
      });
    }

    setMediaDirty(true);

    // Persist change to backend, pass removedUrl explicitly for deletion
    const ok = await saveMediaToServer(
      undefined,
      undefined,
      false,
      removedUrl ? [removedUrl] : undefined,
    );
    if (ok) {
      // refresh provider list so UI reflects backend
      fetchProviders();
      toast({ title: "Deleted", description: "Item removed successfully." });
    }

    // close dialog
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/");
  };

  const handleApprove = async (id: string, user_id?: string) => {
    try {
      let response;
      try {
        response = await adminService.approveProvider(id);
      } catch (err: any) {
        if (
          (err?.response?.status === 404 || err?.response?.status === 500) &&
          user_id
        ) {
          response = await adminService.approveProvider(user_id);
        } else {
          throw err;
        }
      }

      if (response && response.success) {
        toast({
          title: "Provider Approved",
          description:
            "The provider has been activated and can now accept appointments.",
        });
        fetchProviders(); // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to approve provider",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string, user_id?: string) => {
    try {
      const reason = "Application rejected by admin";
      let response;
      try {
        response = await adminService.rejectProvider(id, reason);
      } catch (err: any) {
        if (
          (err?.response?.status === 404 || err?.response?.status === 500) &&
          user_id
        ) {
          response = await adminService.rejectProvider(user_id, reason);
        } else {
          throw err;
        }
      }

      if (response && response.success) {
        toast({
          title: "Provider Rejected",
          description: "The provider application has been rejected.",
          variant: "destructive",
        });
        fetchProviders(); // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to reject provider",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (provider: any) => {
    setSelectedProvider(provider);
    setDraftDocuments(
      Array.isArray(provider?.documentation) ? [...provider.documentation] : [],
    );
    setDraftAadharImages(
      Array.isArray(provider?.aadharImages) ? [...provider.aadharImages] : [],
    );
    setMediaDirty(false);
    setMediaToDelete([]);
    setShowDetailsDialog(true);
  };

  const loadPhysiotherapyAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const [servicesResponse, addonsResponse] = await Promise.all([
        adminService.getPhysiotherapyServices(),
        adminService.getPhysiotherapyAddons(),
      ]);
      setAssignmentServices(
        Array.isArray(servicesResponse.services)
          ? servicesResponse.services.filter((service: any) => service.isActive !== false)
          : [],
      );
      setAssignmentAddons(
        Array.isArray(addonsResponse.addons)
          ? addonsResponse.addons.filter((addon: any) => addon.isActive !== false)
          : [],
      );
    } catch (error: any) {
      setAssignmentServices([]);
      setAssignmentAddons([]);
      toast({
        title: "Unable to load catalogue",
        description: error.response?.data?.message || "Could not load physiotherapy services.",
        variant: "destructive",
      });
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadNurseAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const [servicesResponse, addonsResponse] = await Promise.all([
        adminService.getNurseServices(),
        adminService.getNurseAddons(),
      ]);
      setAssignmentNurseServices(Array.isArray(servicesResponse.services) ? servicesResponse.services.filter((service: any) => service.isActive !== false) : []);
      setAssignmentNurseAddons(Array.isArray(addonsResponse.addons) ? addonsResponse.addons.filter((addon: any) => addon.isActive !== false) : []);
    } catch (error: any) {
      setAssignmentNurseServices([]);
      setAssignmentNurseAddons([]);
      toast({ title: "Unable to load catalogue", description: error.response?.data?.message || "Could not load nurse services.", variant: "destructive" });
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadCaretakerAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const [servicesResponse, addonsResponse] = await Promise.all([adminService.getCaretakerServices(), adminService.getCaretakerAddons()]);
      setAssignmentCaretakerServices((servicesResponse.services || []).filter((item: any) => item.isActive !== false));
      setAssignmentCaretakerAddons((addonsResponse.addons || []).filter((item: any) => item.isActive !== false));
    } catch (error: any) {
      toast({ title: "Unable to load catalogue", description: error.response?.data?.message || "Could not load caretaker services.", variant: "destructive" });
    } finally { setLoadingAssignments(false); }
  };

  const handleEditProvider = (provider: any) => {
    setEditingProvider({
      id: provider._id,
      userId: provider.userId?._id,
      name: provider.userId?.name || "",
      email: provider.userId?.email || "",
      mobile: provider.userId?.mobile || "",
      profileImage:
        provider.userId?.profileImage || provider.profileImage || "",
      category: provider.category || "",
      specialization: provider.specialization || "",
      labServiceType:
        provider.labServiceType === "Diagnostic Centre (Lab)"
          ? "Pathology Centre (Lab)"
          : provider.labServiceType === "Home Sample Collection Only"
            ? "Radiology Centre (Lab)"
            : provider.labServiceType || "",
      labName: provider.labName || "",
      qualification: provider.qualification || "",
      experience: String(provider.experience ?? ""),
      fees: String(provider.fees ?? ""),
      street: provider.address?.street || "",
      city: provider.address?.city || "",
      state: provider.address?.state || "",
      pincode: provider.address?.pincode || "",
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
      caretakerServicePricing: Array.isArray(provider.caretakerServicePricing)
        ? provider.caretakerServicePricing.map((item: any) => ({ serviceId: String(item.serviceId?._id || item.serviceId), customPrice: item.customPrice }))
        : [],
      caretakerAddonPricing: Array.isArray(provider.caretakerAddonPricing)
        ? provider.caretakerAddonPricing.map((item: any) => ({ addonId: String(item.addonId?._id || item.addonId), customPrice: item.customPrice }))
        : [],
    });
    if (provider.category === "Physiotherapist") {
      loadPhysiotherapyAssignments();
    }
    if (provider.category === "Nurse") {
      loadNurseAssignments();
    }
    if (provider.category === "Caretaker" || provider.category === "Care Taker") loadCaretakerAssignments();
    setShowEditDialog(true);
  };

  const toggleAssignedCatalogueItem = (
    field: "physiotherapyServiceIds" | "physiotherapyAddonIds" | "nurseServiceIds" | "nurseAddonIds" | "caretakerServiceIds" | "caretakerAddonIds",
    id: string,
    checked: boolean,
  ) => {
    setEditingProvider((current: any) => ({
      ...current,
      [field]: checked
        ? [...new Set([...(current[field] || []), id])]
        : (current[field] || []).filter((selectedId: string) => selectedId !== id),
    }));
  };

  const setAssignedServicePrice = (
    field: "physiotherapyServicePricing" | "nurseServicePricing" | "caretakerServicePricing" | "physiotherapyAddonPricing" | "nurseAddonPricing" | "caretakerAddonPricing",
    itemId: string,
    value: string,
  ) => {
    const idKey = field.includes("Addon") ? "addonId" : "serviceId";
    setEditingProvider((current: any) => ({
      ...current,
      [field]: [
        ...(current[field] || []).filter((item: any) => item[idKey] !== itemId),
        ...(value === "" ? [] : [{ [idKey]: itemId, customPrice: value }]),
      ],
    }));
  };

  const handleProviderImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const response = await uploadService.uploadSingleFile(
        file,
        "provider-profiles",
      );
      const imageUrl =
        response?.url || response?.fileUrl || response?.data?.url;

      if (!imageUrl) {
        throw new Error("Image upload response invalid");
      }

      setEditingProvider((prev: any) => ({
        ...prev,
        profileImage: imageUrl,
      }));

      toast({
        title: "Image Uploaded",
        description: "Provider image uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!editingProvider?.userId) return;

    try {
      setSavingProvider(true);
      const accountPayload = {
        name: editingProvider.name,
        email: editingProvider.email,
        phone: editingProvider.mobile,
        profileImage: editingProvider.profileImage,
      };
      const providerPayload = {
        category: editingProvider.category,
        specialization: editingProvider.specialization,
        labServiceType: editingProvider.labServiceType,
        labName: editingProvider.labName,
        qualification: editingProvider.qualification,
        experience: Number(editingProvider.experience) || 0,
        fees: Number(editingProvider.fees) || 0,
        profileImage: editingProvider.profileImage,
        address: {
          street: editingProvider.street,
          city: editingProvider.city,
          state: editingProvider.state,
          pincode: editingProvider.pincode,
        },
        ...(editingProvider.category === "Physiotherapist" && {
          physiotherapyServiceIds: editingProvider.physiotherapyServiceIds || [],
          physiotherapyAddonIds: editingProvider.physiotherapyAddonIds || [],
          physiotherapyServicePricing: editingProvider.physiotherapyServicePricing || [],
          physiotherapyAddonPricing: editingProvider.physiotherapyAddonPricing || [],
        }),
        ...(editingProvider.category === "Nurse" && {
          nurseServiceIds: editingProvider.nurseServiceIds || [],
          nurseAddonIds: editingProvider.nurseAddonIds || [],
          nurseServicePricing: editingProvider.nurseServicePricing || [],
          nurseAddonPricing: editingProvider.nurseAddonPricing || [],
        }),
        ...(["Caretaker", "Care Taker"].includes(editingProvider.category) && {
          caretakerServiceIds: editingProvider.caretakerServiceIds || [],
          caretakerAddonIds: editingProvider.caretakerAddonIds || [],
          caretakerServicePricing: editingProvider.caretakerServicePricing || [],
          caretakerAddonPricing: editingProvider.caretakerAddonPricing || [],
        }),
      };

      const providerResponse = await adminService.updateProviderDetails(editingProvider.id, providerPayload);
      const accountResponse = await adminService.updateUser(editingProvider.userId, accountPayload);
      if (accountResponse.success && providerResponse.success) {
        toast({
          title: "Provider Updated",
          description: "Provider details updated successfully.",
        });
        setShowEditDialog(false);
        setEditingProvider(null);
        fetchProviders();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update provider",
        variant: "destructive",
      });
    } finally {
      setSavingProvider(false);
    }
  };

  const getProviderUpdatePayload = (
    provider: any,
    overrides?: { documentation?: string[]; aadharImages?: string[] },
  ) => ({
    name: provider.userId?.name || "",
    email: provider.userId?.email || "",
    mobile: provider.userId?.mobile || "",
    profileImage: provider.userId?.profileImage || provider.profileImage || "",
    providerProfile: {
      category: provider.category || "",
      specialization: provider.specialization || "",
      qualification: provider.qualification || "",
      experience: Number(provider.experience) || 0,
      fees: Number(provider.fees) || 0,
      profileImage:
        provider.userId?.profileImage || provider.profileImage || "",
      documentation: overrides?.documentation ?? (provider.documentation || []),
      aadharImages: overrides?.aadharImages ?? (provider.aadharImages || []),
      address: {
        street: provider.address?.street || "",
        city: provider.address?.city || "",
        state: provider.address?.state || "",
        pincode: provider.address?.pincode || "",
      },
    },
  });

  const handleReplaceDocument = async (index: number, file: File) => {
    try {
      setUploadingImage(true);
      const response = await uploadService.uploadSingleFile(
        file,
        "provider-documents",
      );
      const url = response?.url || response?.fileUrl || response?.data?.url;
      if (!url) throw new Error("Upload failed");

      // capture previous url (if any) so we can delete it reliably
      const oldUrl = draftDocuments[index];
      setDraftDocuments((prev) => {
        const next = [...prev];
        next[index] = url;
        if (oldUrl) setMediaToDelete((d) => [...d, oldUrl]);
        return next;
      });
      setMediaDirty(true);
      toast({
        title: "Uploaded",
        description: "Document uploaded. Saving to server...",
      });

      // Try to persist immediately and pass oldUrl explicitly for deletion
      await saveMediaToServer(
        undefined,
        undefined,
        true,
        oldUrl ? [oldUrl] : undefined,
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteDocument = async (index: number) => {
    // Open centered confirmation dialog instead of window.confirm
    setDeleteTarget({ type: "document", index });
    setShowDeleteConfirm(true);
  };

  const handleAddDocument = async (file: File) => {
    try {
      setUploadingImage(true);
      const response = await uploadService.uploadSingleFile(
        file,
        "provider-documents",
      );
      const url = response?.url || response?.fileUrl || response?.data?.url;
      if (!url) throw new Error("Upload failed");

      setDraftDocuments((prev) => [...prev, url]);
      setMediaDirty(true);
      toast({
        title: "Uploaded",
        description: "Document uploaded. Saving to server...",
      });

      // Persist immediately
      await saveMediaToServer(undefined, undefined, true);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleReplaceAadhar = async (index: number, file: File) => {
    try {
      setUploadingImage(true);
      const response = await uploadService.uploadSingleFile(
        file,
        "provider-aadhar",
      );
      const url = response?.url || response?.fileUrl || response?.data?.url;
      if (!url) throw new Error("Upload failed");

      const oldUrl = draftAadharImages[index];
      setDraftAadharImages((prev) => {
        const next = [...prev];
        next[index] = url;
        if (oldUrl) setMediaToDelete((d) => [...d, oldUrl]);
        return next;
      });
      setMediaDirty(true);
      toast({
        title: "Uploaded",
        description: "Aadhar image uploaded. Saving to server...",
      });

      // Persist immediately, pass oldUrl for deletion
      await saveMediaToServer(
        undefined,
        undefined,
        true,
        oldUrl ? [oldUrl] : undefined,
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteAadhar = async (index: number) => {
    // Open centered confirmation dialog instead of window.confirm
    setDeleteTarget({ type: "aadhar", index });
    setShowDeleteConfirm(true);
  };

  const handleAddAadhar = async (file: File) => {
    try {
      setUploadingImage(true);
      const response = await uploadService.uploadSingleFile(
        file,
        "provider-aadhar",
      );
      const url = response?.url || response?.fileUrl || response?.data?.url;
      if (!url) throw new Error("Upload failed");

      setDraftAadharImages((prev) => [...prev, url]);
      setMediaDirty(true);
      toast({
        title: "Uploaded",
        description: "Aadhar image uploaded. Saving to server...",
      });

      // Persist immediately
      await saveMediaToServer(undefined, undefined, true);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveMediaChanges = async () => {
    // Keep function for manual save, but delegate to save helper
    await saveMediaToServer(draftDocuments, draftAadharImages, false);
  };

  // Helper: save media arrays to server immediately. If `auto` is true, swallow errors and show toasts.
  const saveMediaToServer = async (
    docs?: string[] | undefined,
    aadhars?: string[] | undefined,
    auto = false,
    deleteUrls?: string[],
  ) => {
    if (!selectedProvider) return;

    const payload = {
      documentation: docs ?? draftDocuments,
      aadharImages: aadhars ?? draftAadharImages,
    };

    setSavingProvider(true);
    try {
      // Try direct update with provider ID
      let response;
      try {
        response = await adminService.updateProviderDetails(
          selectedProvider._id,
          payload,
        );
      } catch (err: any) {
        // If the server returns 404 CastError or Provider not found, try User ID
        if (err?.response?.status === 404 || err?.response?.status === 500) {
          if (selectedProvider.userId?._id) {
            response = await adminService.updateProviderDetails(
              selectedProvider.userId._id,
              payload,
            );
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      if (response && response.success) {
        const updatedProvider = {
          ...selectedProvider,
          documentation: [...(payload.documentation || [])],
          aadharImages: [...(payload.aadharImages || [])],
        };
        setSelectedProvider(updatedProvider);
        setProviders((prev) =>
          prev.map((p) =>
            p._id === updatedProvider._id ? updatedProvider : p,
          ),
        );
        // Refresh list from server to ensure canonical state
        try {
          await fetchProviders();
        } catch (e) {
          /* ignore */
        }

        const uniqueToDelete = Array.from(
          new Set([...(mediaToDelete || []), ...(deleteUrls || [])]),
        ).filter(Boolean);
        await Promise.allSettled(
          uniqueToDelete.map((url) => uploadService.deleteFile(url)),
        );

        setMediaDirty(false);
        setMediaToDelete([]);
        if (!auto)
          toast({ title: "Saved", description: "Changes saved successfully." });
        return true;
      }
    } catch (err: any) {
      // If 404, try to resolve provider id by looking up users -> providerProfile
      if (err?.response?.status === 404) {
        toast({
          title: "Error",
          description: "Provider not found on server. Try refreshing the page.",
          variant: "destructive",
        });
      } else {
        console.error("Save media error", err);
        if (!auto) {
          toast({
            title: "Error",
            description:
              err?.response?.data?.message || "Failed to save changes",
            variant: "destructive",
          });
        }
      }
      return false;
    } finally {
      setSavingProvider(false);
    }
  };

  const handleSendWarning = async (provider: any) => {
    setProviderToWarn(provider);
    setShowWarningDialog(true);
  };

  const confirmSendWarning = async () => {
    if (providerToWarn) {
      try {
        const reason = `Warning sent by admin - violation of terms`;
        await adminService.suspendProvider(getProviderId(providerToWarn), reason);

        toast({
          title: "Warning Sent",
          description: `Provider has been suspended due to violation`,
          variant: "destructive",
        });

        fetchProviders(); // Refresh the list
        setShowWarningDialog(false);
        setProviderToWarn(null);
      } catch (error: any) {
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to send warning",
          variant: "destructive",
        });
      }
    }
  };

  const handleTerminateProvider = (provider: any) => {
    setProviderToTerminate(provider);
    setShowTerminateDialog(true);
  };

  const handleDeleteProvider = (provider: any) => {
    setProviderToDelete(provider);
    setShowDeleteProviderDialog(true);
  };

  const confirmDeleteProvider = async () => {
    if (!providerToDelete?.userId?._id) return;

    try {
      setSavingProvider(true);
      await adminService.deleteUser(providerToDelete.userId._id);
      toast({
        title: "Provider Deleted",
        description: `${providerToDelete.userId?.name || "Provider"} has been deleted.`,
      });
      setShowDeleteProviderDialog(false);
      setProviderToDelete(null);
      fetchProviders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete provider",
        variant: "destructive",
      });
    } finally {
      setSavingProvider(false);
    }
  };

  const confirmTerminate = async () => {
    if (providerToTerminate) {
      try {
        const reason = "Account terminated by admin";
        await adminService.suspendProvider(getProviderId(providerToTerminate), reason);

        toast({
          title: "Provider Terminated",
          description: `${providerToTerminate.name}'s account has been terminated.`,
          variant: "destructive",
        });

        fetchProviders(); // Refresh the list
        setShowTerminateDialog(false);
        setProviderToTerminate(null);
      } catch (error: any) {
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to terminate provider",
          variant: "destructive",
        });
      }
    }
  };

  const handleUnsuspendProvider = async (provider: any) => {
    try {
      await adminService.unsuspendProvider(getProviderId(provider));
      toast({
        title: "Provider Unsuspended",
        description: `${provider.userId?.name || "Provider"} account has been reactivated.`,
      });
      fetchProviders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to unsuspend provider",
        variant: "destructive",
      });
    }
  };

  const filteredProviders = providers.filter((provider) => {
    // Search across multiple fields: name, category, specialization, location
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch =
      provider.userId?.name?.toLowerCase().includes(searchLower) ||
      normalizeCategory(provider.category).toLowerCase().includes(searchLower) ||
      provider.specialization?.toLowerCase().includes(searchLower) ||
      provider.userId?.email?.toLowerCase().includes(searchLower) ||
      provider.userId?.mobile?.includes(searchQuery) ||
      provider.address?.city?.toLowerCase().includes(searchLower) ||
      provider.address?.state?.toLowerCase().includes(searchLower) ||
      provider.address?.street?.toLowerCase().includes(searchLower) ||
      provider.address?.pincode?.includes(searchQuery);

    // Status filter
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "suspended" && isProviderSuspended(provider)) ||
      provider.status?.toLowerCase() === filters.status;

    // Category filter
      const matchesCategory =
      filters.category === "all" || normalizeCategory(provider.category) === filters.category;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border hidden lg:block">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/healthy-touch-logo.png"
                className="h-12"
                alt="Healthy Touch"
              />
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-base font-semibold sm:text-lg">
                  Providers Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage healthcare providers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                <Link to="/admin/profile">{userInitial}</Link>
              </div> */}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 space-y-6 p-3 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search providers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    <Filter className="w-4 h-4" />
                    Filter
                    {(filters.status !== "all" ||
                      filters.category !== "all") && (
                      <span className="ml-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Button>
                  {showFilterMenu && (
                    <div className="absolute left-0 top-12 w-64 max-w-[calc(100vw-1.5rem)] bg-card border border-border rounded-xl shadow-lg p-4 space-y-3 z-10 sm:left-auto sm:right-0">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Status
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) =>
                            setFilters({ ...filters, status: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Category
                        </label>
                        <select
                          value={filters.category}
                          onChange={(e) =>
                            setFilters({ ...filters, category: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="all">All Categories</option>
                          {providerCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setFilters({ status: "all", category: "all" });
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

              {/* Category Pills for Quick Filtering */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Provider Categories</h3>
                  <Badge variant="secondary">
                    {filteredProviders.length} Total Providers
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={filters.category === "all" ? "default" : "outline"}
                    onClick={() => setFilters({ ...filters, category: "all" })}
                  >
                    All Categories
                  </Button>
                  {providerCategories.map((category) => (
                    <Button
                      key={category}
                      size="sm"
                      variant={
                        filters.category === category ? "default" : "outline"
                      }
                      onClick={() => setFilters({ ...filters, category })}
                    >
                      {category}
                      <Badge variant="secondary" className="ml-2">
                        {
                          providers.filter((p) => p.category === category)
                            .length
                        }
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {filters.category === "Physiotherapist" && (
                <PhysiotherapyCatalogManager />
              )}
              {filters.category === "Nurse" && (
                <NurseCatalogManager />
              )}
              {filters.category === "Caretaker" && (
                <CaretakerCatalogManager />
              )}

              {/* Category-wise Sections */}
              {filters.category === "all" ? (
                // Show all categories in separate sections
                <div className="space-y-8">
                  {providerCategories.map((category) => {
                    const categoryProviders = filteredProviders.filter(
                      (p) => p.category === category,
                    );
                    if (categoryProviders.length === 0) return null;

                    return (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-3">
                            <Stethoscope className="w-6 h-6 text-primary" />
                            <h2 className="text-2xl font-bold">{category}</h2>
                            <Badge variant="outline">
                              {categoryProviders.length}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryProviders.map((provider) => (
                            <motion.div
                              key={provider._id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="card-healthcare p-5"
                            >
                              <div className="flex items-start gap-4 mb-4">
                                {/* Show profile image or fallback icon */}
                                {provider.userId?.profileImage ||
                                provider.profileImage ? (
                                  <img
                                    src={
                                      provider.userId?.profileImage ||
                                      provider.profileImage
                                    }
                                    alt={provider.userId?.name || "Provider"}
                                    className="w-12 h-12 rounded-xl object-cover border-2 border-primary/20 shrink-0"
                                    onError={(e) => {
                                      const img = e.target as HTMLImageElement;
                                      img.src =
                                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23667eea" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                                      img.className =
                                        "w-12 h-12 rounded-xl bg-primary/10 p-2 shrink-0";
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                                    <Stethoscope className="w-6 h-6 text-primary" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h3 className="font-semibold">
                                    {provider.userId?.name || "N/A"}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {provider.specialization}
                                  </p>
                                  <Badge variant="outline" className="mt-1">
                                    {provider.category}
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-2 mb-4">
                                <p className="text-sm">
                                  <span className="font-medium">Email:</span>{" "}
                                  {provider.userId?.email || "N/A"}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">
                                    Experience:
                                  </span>{" "}
                                  {provider.experience || 0} years
                                </p>
                                {isCaretakerProvider(provider) && (
                                  <p className="text-sm">
                                    <span className="font-medium">Police Verification:</span>{" "}
                                    {provider.policeVerificationStatus || "Not provided"}
                                  </p>
                                )}
                                {provider.category === "Lab Technician" && (
                                  <>
                                    <p className="text-sm">
                                      <span className="font-medium">Lab Name:</span>{" "}
                                      {provider.labName || "N/A"}
                                    </p>
                                    <p className="text-sm">
                                      <span className="font-medium">Lab Code:</span>{" "}
                                      {provider.labCode || "N/A"}
                                    </p>
                                  </>
                                )}
                              </div>

                              <div className="space-y-3 pt-4 border-t border-border">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      isProviderSuspended(provider)
                                        ? "bg-red-100 text-red-700"
                                        : provider.status === "approved"
                                        ? "status-approved"
                                        : provider.status === "rejected"
                                          ? "status-rejected"
                                          : "status-pending"
                                    }`}
                                  >
                                    {isProviderSuspended(provider) ? "SUSPENDED" : provider.status?.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleViewDetails(provider)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditProvider(provider)}
                                    title="Edit Provider"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteProvider(provider)}
                                    className="text-destructive"
                                    title="Delete Provider"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  {provider.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleReject(
                                            provider._id,
                                            provider.userId?._id,
                                          )
                                        }
                                        className="text-destructive"
                                      >
                                        <UserX className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() =>
                                          handleApprove(
                                            provider._id,
                                            provider.userId?._id,
                                          )
                                        }
                                      >
                                        <UserCheck className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                  {isProviderSuspended(provider) ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUnsuspendProvider(provider)}
                                      className="text-green-700"
                                      title="Unsuspend Provider"
                                    >
                                      <UserCheck className="w-4 h-4" />
                                    </Button>
                                  ) : provider.status === "approved" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleSendWarning(provider)
                                        }
                                        className="text-orange-600"
                                      >
                                        <AlertCircle className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleTerminateProvider(provider)
                                        }
                                        className="text-destructive"
                                      >
                                        <Ban className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Show selected category only
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProviders.map((provider) => (
                    <motion.div
                      key={provider._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card-healthcare p-5"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        {/* Show profile image or fallback icon */}
                        {provider.userId?.profileImage ||
                        provider.profileImage ? (
                          <img
                            src={
                              provider.userId?.profileImage ||
                              provider.profileImage
                            }
                            alt={provider.userId?.name}
                            className="w-16 h-16 rounded-xl object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                              (
                                e.target as HTMLImageElement
                              ).nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center ${provider.userId?.profileImage || provider.profileImage ? "hidden" : ""}`}
                        >
                          <Stethoscope className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {provider.userId?.name || "N/A"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {provider.specialization}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {provider.category}
                          </Badge>
                          {provider.approvalStatus === "Active" && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 fill-secondary text-secondary" />
                              <span className="text-sm font-medium">
                                {provider.rating || 0}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({provider.totalReviews || 0} reviews)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-sm">
                          <span className="font-medium">Qualification:</span>{" "}
                          {provider.qualification}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Experience:</span>{" "}
                          {provider.experience} years
                        </p>
                        {isCaretakerProvider(provider) && (
                          <p className="text-sm">
                            <span className="font-medium">Police Verification:</span>{" "}
                            {provider.policeVerificationStatus || "Not provided"}
                          </p>
                        )}
                        {provider.category === "Lab Technician" && (
                          <>
                            <p className="text-sm">
                              <span className="font-medium">Lab Name:</span>{" "}
                              {provider.labName || "N/A"}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Lab Code:</span>{" "}
                              {provider.labCode || "N/A"}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="space-y-3 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isProviderSuspended(provider)
                                ? "bg-red-100 text-red-700"
                                : provider.status === "approved"
                                ? "status-approved"
                                : provider.status === "rejected"
                                  ? "status-rejected"
                                  : "status-pending"
                            }`}
                          >
                            {isProviderSuspended(provider) ? "suspended" : provider.status}
                          </span>
                          {provider.warningCount > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {provider.warningCount}/3
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleViewDetails(provider)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditProvider(provider)}
                            title="Edit Provider"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProvider(provider)}
                            className="text-destructive"
                            title="Delete Provider"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {provider.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReject(
                                    provider._id,
                                    provider.userId?._id,
                                  )
                                }
                                className="text-destructive"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() =>
                                  handleApprove(
                                    provider._id,
                                    provider.userId?._id,
                                  )
                                }
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {isProviderSuspended(provider) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnsuspendProvider(provider)}
                              className="text-green-700"
                              title="Unsuspend Provider"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          ) : provider.status === "approved" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendWarning(provider)}
                                className="text-orange-600"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleTerminateProvider(provider)
                                }
                                className="text-destructive"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {filteredProviders.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Stethoscope className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Providers Found
                  </h3>
                  <p className="text-muted-foreground">
                    {filters.category !== "all"
                      ? `No providers found in ${filters.category} category.`
                      : "Try adjusting your filters or search query."}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setFilters({ status: "all", category: "all" });
                      setSearchQuery("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to logout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the home page and will need to login
              again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Provider Full Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {/* Show provider profile image */}
              {selectedProvider?.userId?.profileImage ||
              selectedProvider?.profileImage ? (
                <img
                  src={
                    selectedProvider?.userId?.profileImage ||
                    selectedProvider?.profileImage
                  }
                  alt={selectedProvider?.userId?.name}
                  className="w-16 h-16 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (
                      e.target as HTMLImageElement
                    ).nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div
                className={`w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center ${selectedProvider?.userId?.profileImage || selectedProvider?.profileImage ? "hidden" : ""}`}
              >
                <Stethoscope className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedProvider?.userId?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedProvider?.specialization}
                </p>
                <Badge
                  className={`mt-1 ${
                    selectedProvider?.status === "approved"
                      ? "bg-green-500"
                      : selectedProvider?.status === "rejected"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                >
                  {selectedProvider?.status}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedProvider && (
            <div className="mt-4 space-y-4">
              <ProviderIdCard provider={selectedProvider} compact />
              <Tabs defaultValue="personal">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="aadhar">Aadhar Card</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-6">
                <div className="card-healthcare p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">
                            {selectedProvider.userId?.email || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">
                            {selectedProvider.userId?.mobile || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Address
                          </p>
                          <p className="font-medium">
                            {selectedProvider.address?.street ||
                            selectedProvider.address?.city ||
                            selectedProvider.address?.state
                              ? `${selectedProvider.address.street || ""} ${selectedProvider.address.city || ""} ${selectedProvider.address.state || ""} ${selectedProvider.address.pincode || ""}`.trim()
                              : selectedProvider.userId?.location?.address ||
                                "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Registration Number
                          </p>
                          <p className="font-medium">
                            {selectedProvider._id || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Registered Date
                          </p>
                          <p className="font-medium">
                            {selectedProvider.createdAt
                              ? new Date(
                                  selectedProvider.createdAt,
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Working Time
                          </p>
                          <p className="font-medium">
                            {formatProviderAvailability(selectedProvider)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Award className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Category
                          </p>
                          <Badge variant="secondary">
                            {selectedProvider.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Professional Information Tab */}
              <TabsContent value="professional" className="space-y-6">
                <div className="card-healthcare p-6 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Professional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedProvider.category === 'Lab Technician' ? (
                      <>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Lab Service Type</p>
                          <p className="font-semibold text-lg">{selectedProvider.labServiceType || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Lab Name</p>
                          <p className="font-semibold text-lg">{selectedProvider.labName || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Lab Code</p>
                          <p className="font-semibold text-lg">{selectedProvider.labCode || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Tests / Services</p>
                          <p className="font-semibold text-lg">{selectedProvider.availableTests?.join(', ') || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Home Sample Collection</p>
                          <p className="font-semibold text-lg">{selectedProvider.homeSampleCollection || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Experience</p>
                          <p className="font-semibold text-lg">{selectedProvider.labExperience || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Service Area</p>
                          <p className="font-semibold text-lg">{selectedProvider.labServiceArea || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Delivery Time</p>
                          <p className="font-semibold text-lg">{selectedProvider.reportDeliveryTime || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Cert Status</p>
                          <p className="font-semibold text-lg">{selectedProvider.certificationStatus || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Contact Person</p>
                          <p className="font-semibold text-lg">{selectedProvider.contactPersonName || "N/A"} ({selectedProvider.labContactNumber})</p>
                        </div>
                      </>
                    ) : selectedProvider.category === 'Ambulance' ? (
                      <>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Ambulance Type</p>
                          <p className="font-semibold text-lg">{selectedProvider.ambulanceType || "N/A"}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Vehicle Details</p>
                          <p className="font-semibold text-lg">{selectedProvider.vehicleModel} ({selectedProvider.vehicleYear}) - {selectedProvider.vehicleNumber}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Driver Details</p>
                          <p className="font-semibold text-lg">{selectedProvider.driverName} ({selectedProvider.driverMobileNo})</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Pricing & Availability</p>
                          <p className="font-semibold text-lg">Base ₹{selectedProvider.baseCharges} | Per km ₹{selectedProvider.perKmCharge} ({selectedProvider.availabilityType})</p>
                        </div>
                      </>
                    ) : (
                      <>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Specialization
                      </p>
                      <p className="font-semibold text-lg">
                        {selectedProvider.specialization}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Qualification
                      </p>
                      <p className="font-semibold text-lg">
                        {selectedProvider.qualification || "N/A"}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Experience
                      </p>
                      <p className="font-semibold text-lg">
                        {selectedProvider.experience || 0} Years
                      </p>
                    </div>
                    {isCaretakerProvider(selectedProvider) && (
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Police Verification
                        </p>
                        <p className="font-semibold text-lg">
                          {selectedProvider.policeVerificationStatus || "Not provided"}
                        </p>
                      </div>
                    )}
                    {/* Consultation fee is temporarily hidden in admin provider view. */}
                      </>
                    )}
                  </div>

                  {selectedProvider.status === "approved" && (
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="font-semibold text-green-600">
                          Approved Provider
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Current Rating
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-5 h-5 fill-secondary text-secondary" />
                            <span className="font-bold text-lg">
                              {selectedProvider.rating || 0}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({selectedProvider.totalReviews || 0} reviews)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedProvider.status === "pending" && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <p className="font-semibold text-yellow-600">
                          Pending Approval
                        </p>
                      </div>
                      <p className="text-sm">
                        Rating will be visible after admin approval. Initial
                        rating will be 0.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Registration Documents
                    </h3>
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAddDocument(file);
                        }}
                      />
                    </div>
                  </div>

                  {draftDocuments.length > 0 ? (
                    draftDocuments.map((doc: string, index: number) => (
                      <div key={index} className="card-healthcare p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Document {index + 1}
                          </h4>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <a
                                href={getAssetViewUrl(doc, "inline")}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a
                                href={getAssetViewUrl(doc, "attachment")}
                                download={`provider-document-${index + 1}.pdf`}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </a>
                            </Button>
                            <label>
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleReplaceDocument(index, file);
                                }}
                              />
                              <Button size="sm" variant="outline" asChild>
                                <span>
                                  <Edit className="w-4 h-4 mr-1" />
                                  Replace
                                </span>
                              </Button>
                            </label>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => handleDeleteDocument(index)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        {doc.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                          <img
                            src={getAssetViewUrl(doc, "inline")}
                            alt={`Document ${index + 1}`}
                            className="w-full rounded-lg border border-border object-contain max-h-96"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML =
                                  '<div class="flex items-center justify-center p-8 text-muted-foreground"><p>Unable to load image. Click View button above.</p></div>';
                              }
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700">
                            <FileText className="w-20 h-20 text-blue-500 mb-4" />
                            <p className="font-semibold text-lg mb-2">
                              PDF Document
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                              Click button above to view or download
                            </p>
                            <div className="flex gap-2">
                              <a
                                href={getAssetViewUrl(doc, "inline")}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="default">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Open in Browser
                                </Button>
                              </a>
                              <a
                                href={getAssetViewUrl(doc, "attachment")}
                                download
                              >
                                <Button size="sm" variant="outline">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="card-healthcare p-6 text-center text-muted-foreground">
                      No documents uploaded yet
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Aadhar Card Tab */}
              <TabsContent value="aadhar" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Aadhar Card
                    </h3>
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAddAadhar(file);
                        }}
                      />
                    </div>
                  </div>

                  {draftAadharImages.length > 0 ? (
                    draftAadharImages.map((image: string, index: number) => (
                      <div key={index} className="card-healthcare p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">
                            Aadhar {index === 0 ? "Front" : "Back"}
                          </h4>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <a
                                href={getAssetViewUrl(image, "inline")}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a
                                href={getAssetViewUrl(image, "attachment")}
                                download={`aadhar-${index === 0 ? "front" : "back"}.jpg`}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </a>
                            </Button>
                            <label>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleReplaceAadhar(index, file);
                                }}
                              />
                              <Button size="sm" variant="outline" asChild>
                                <span>
                                  <Edit className="w-4 h-4 mr-1" />
                                  Replace
                                </span>
                              </Button>
                            </label>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => handleDeleteAadhar(index)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <img
                          src={getAssetViewUrl(image, "inline")}
                          alt={`Aadhar ${index === 0 ? "Front" : "Back"}`}
                          className="w-full rounded-lg border border-border object-contain max-h-96"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="card-healthcare p-6 text-center text-muted-foreground">
                      No Aadhar card images uploaded yet
                    </div>
                  )}
                </div>
              </TabsContent>
              </Tabs>
            </div>
          )}

          {(uploadingImage || savingProvider) && (
            <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating provider files...
            </div>
          )}

          {/* Save / Update button (Documents + Aadhar) */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {mediaDirty ? "Changes not saved yet." : "No pending changes."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!selectedProvider) return;
                  setDraftDocuments(
                    Array.isArray(selectedProvider?.documentation)
                      ? [...selectedProvider.documentation]
                      : [],
                  );
                  setDraftAadharImages(
                    Array.isArray(selectedProvider?.aadharImages)
                      ? [...selectedProvider.aadharImages]
                      : [],
                  );
                  setMediaDirty(false);
                  setMediaToDelete([]);
                }}
                disabled={!mediaDirty || savingProvider || uploadingImage}
              >
                Reset
              </Button>
              <Button
                onClick={handleSaveMediaChanges}
                disabled={!mediaDirty || savingProvider || uploadingImage}
              >
                {savingProvider && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>

          {selectedProvider?.approvalStatus === "Pending" && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  handleReject(
                    selectedProvider._id,
                    selectedProvider.userId?._id,
                  );
                  setShowDetailsDialog(false);
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Provider
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  handleApprove(
                    selectedProvider._id,
                    selectedProvider.userId?._id,
                  );
                  setShowDetailsDialog(false);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Provider
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingProvider(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
          </DialogHeader>

          {editingProvider && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="provider-image">Profile Image</Label>
                <div className="flex items-center gap-4">
                  {editingProvider.profileImage ? (
                    <img
                      src={editingProvider.profileImage}
                      alt="Provider preview"
                      className="w-16 h-16 rounded-xl object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <Input
                    id="provider-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProviderImageUpload(file);
                    }}
                  />
                </div>
                {uploadingImage && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading image...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingProvider.name}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingProvider.email}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    value={editingProvider.mobile}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        mobile: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editingProvider.category}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input
                    value={editingProvider.specialization}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        specialization: e.target.value,
                      }))
                    }
                  />
                </div>
                {editingProvider.category === "Lab Technician" && (
                  <>
                    <div className="space-y-2">
                      <Label>Type of Service</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3"
                        value={editingProvider.labServiceType || ""}
                        onChange={(e) =>
                          setEditingProvider((prev: any) => ({
                            ...prev,
                            labServiceType: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select</option>
                        <option value="Pathology Centre (Lab)">Pathology Centre (Lab)</option>
                        <option value="Radiology Centre (Lab)">Radiology Centre (Lab)</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lab / Centre Name</Label>
                      <Input
                        value={editingProvider.labName}
                        onChange={(e) =>
                          setEditingProvider((prev: any) => ({
                            ...prev,
                            labName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Qualification</Label>
                  <Input
                    value={editingProvider.qualification}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        qualification: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Experience (Years)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingProvider.experience}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        experience: e.target.value,
                      }))
                    }
                  />
                </div>
                {/* Consultation fee is temporarily hidden in admin provider edit. */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Street</Label>
                  <Input
                    value={editingProvider.street}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={editingProvider.city}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={editingProvider.state}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input
                    value={editingProvider.pincode}
                    onChange={(e) =>
                      setEditingProvider((prev: any) => ({
                        ...prev,
                        pincode: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {editingProvider.category === "Physiotherapist" && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <div>
                    <h3 className="font-semibold">Assign Physiotherapy Offerings</h3>
                    <p className="text-sm text-muted-foreground">
                      Select master catalogue items available on this provider's patient booking card.
                    </p>
                  </div>
                  {loadingAssignments ? (
                    <p className="text-sm text-muted-foreground">Loading catalogue...</p>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Services</Label>
                        {assignmentServices.length ? assignmentServices.map((service: any) => (
                          <div key={service._id} className="rounded-lg border p-3">
                            <label className="flex items-start gap-3">
                              <Checkbox
                                checked={(editingProvider.physiotherapyServiceIds || []).includes(service._id)}
                                onCheckedChange={(checked) => toggleAssignedCatalogueItem("physiotherapyServiceIds", service._id, checked === true)}
                              />
                              <span className="min-w-0 text-sm">
                                <span className="block font-medium">{service.name}</span>
                                <span className="text-muted-foreground">{service.durationMinutes} min - Default Rs. {Number(service.price || 0).toLocaleString("en-IN")}</span>
                              </span>
                            </label>
                            {(editingProvider.physiotherapyServiceIds || []).includes(service._id) && (
                              <Input
                                className="mt-2"
                                type="number"
                                min="0"
                                placeholder={`Provider price (default Rs. ${Number(service.price || 0).toLocaleString("en-IN")})`}
                                value={(editingProvider.physiotherapyServicePricing || []).find((item: any) => item.serviceId === service._id)?.customPrice ?? ""}
                                onChange={(event) => setAssignedServicePrice("physiotherapyServicePricing", service._id, event.target.value)}
                              />
                            )}
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No active services in catalogue.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Equipment Add-ons</Label>
                        {assignmentAddons.length ? assignmentAddons.map((addon: any) => (
                          <div key={addon._id} className="rounded-lg border p-3">
                            <label className="flex items-start gap-3">
                              <Checkbox
                                checked={(editingProvider.physiotherapyAddonIds || []).includes(addon._id)}
                                onCheckedChange={(checked) => toggleAssignedCatalogueItem("physiotherapyAddonIds", addon._id, checked === true)}
                              />
                              <span className="min-w-0 text-sm">
                                <span className="block font-medium">{addon.name}</span>
                                <span className="text-muted-foreground">Default +Rs. {Number(addon.price || 0).toLocaleString("en-IN")}</span>
                              </span>
                            </label>
                            {(editingProvider.physiotherapyAddonIds || []).includes(addon._id) && (
                              <Input
                                className="mt-2"
                                type="number"
                                min="0"
                                placeholder={`Provider add-on price (default Rs. ${Number(addon.price || 0).toLocaleString("en-IN")})`}
                                value={(editingProvider.physiotherapyAddonPricing || []).find((item: any) => item.addonId === addon._id)?.customPrice ?? ""}
                                onChange={(event) => setAssignedServicePrice("physiotherapyAddonPricing", addon._id, event.target.value)}
                              />
                            )}
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No active add-ons in catalogue.</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingProvider.category === "Nurse" && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <div>
                    <h3 className="font-semibold">Assign Nurse Offerings</h3>
                    <p className="text-sm text-muted-foreground">Select master catalogue items shown on this nurse's patient booking card.</p>
                  </div>
                  {loadingAssignments ? <p className="text-sm text-muted-foreground">Loading catalogue...</p> : (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Services</Label>
                        {assignmentNurseServices.length ? assignmentNurseServices.map((service: any) => (
                          <div key={service._id} className="rounded-lg border p-3">
                            <label className="flex items-start gap-3">
                              <Checkbox checked={(editingProvider.nurseServiceIds || []).includes(service._id)} onCheckedChange={(checked) => toggleAssignedCatalogueItem("nurseServiceIds", service._id, checked === true)} />
                              <span className="min-w-0 text-sm"><span className="block font-medium">{service.serviceName}</span><span className="text-muted-foreground">{service.durationMinutes} min - Default Rs. {Number(service.price || 0).toLocaleString("en-IN")}</span></span>
                            </label>
                            {(editingProvider.nurseServiceIds || []).includes(service._id) && (
                              <Input
                                className="mt-2"
                                type="number"
                                min="0"
                                placeholder={`Provider price (default Rs. ${Number(service.price || 0).toLocaleString("en-IN")})`}
                                value={(editingProvider.nurseServicePricing || []).find((item: any) => item.serviceId === service._id)?.customPrice ?? ""}
                                onChange={(event) => setAssignedServicePrice("nurseServicePricing", service._id, event.target.value)}
                              />
                            )}
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No active services in catalogue.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Add-ons</Label>
                        {assignmentNurseAddons.length ? assignmentNurseAddons.map((addon: any) => (
                          <div key={addon._id} className="rounded-lg border p-3">
                            <label className="flex items-start gap-3">
                              <Checkbox checked={(editingProvider.nurseAddonIds || []).includes(addon._id)} onCheckedChange={(checked) => toggleAssignedCatalogueItem("nurseAddonIds", addon._id, checked === true)} />
                              <span className="min-w-0 text-sm"><span className="block font-medium">{addon.addOnName}</span><span className="text-muted-foreground">Default +Rs. {Number(addon.price || 0).toLocaleString("en-IN")}</span></span>
                            </label>
                            {(editingProvider.nurseAddonIds || []).includes(addon._id) && (
                              <Input
                                className="mt-2"
                                type="number"
                                min="0"
                                placeholder={`Provider add-on price (default Rs. ${Number(addon.price || 0).toLocaleString("en-IN")})`}
                                value={(editingProvider.nurseAddonPricing || []).find((item: any) => item.addonId === addon._id)?.customPrice ?? ""}
                                onChange={(event) => setAssignedServicePrice("nurseAddonPricing", addon._id, event.target.value)}
                              />
                            )}
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No active add-ons in catalogue.</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {["Caretaker", "Care Taker"].includes(editingProvider.category) && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <div><h3 className="font-semibold">Assign Caretaker Offerings</h3><p className="text-sm text-muted-foreground">Services selected here appear on this caretaker's booking card.</p></div>
                  {loadingAssignments ? <p className="text-sm text-muted-foreground">Loading catalogue...</p> : <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2"><Label>Services</Label>{assignmentCaretakerServices.map((service: any) => <div key={service._id} className="rounded-lg border p-3"><label className="flex items-start gap-3"><Checkbox checked={(editingProvider.caretakerServiceIds || []).includes(service._id)} onCheckedChange={(checked) => toggleAssignedCatalogueItem("caretakerServiceIds", service._id, checked === true)} /><span className="text-sm"><span className="block font-medium">{service.serviceName}</span><span className="text-muted-foreground">{service.handlesText || service.category} - Default Rs. {Number(service.basePrice).toLocaleString("en-IN")}/{service.basePriceUnit || "shift"}</span>{Boolean(service.tags?.length) && <span className="mt-1 block text-xs text-muted-foreground">{service.tags.join(" • ")}</span>}</span></label>{(editingProvider.caretakerServiceIds || []).includes(service._id) && <Input className="mt-2" type="number" min="0" placeholder={`Provider price (default Rs. ${Number(service.basePrice || 0).toLocaleString("en-IN")})`} value={(editingProvider.caretakerServicePricing || []).find((item: any) => item.serviceId === service._id)?.customPrice ?? ""} onChange={(event) => setAssignedServicePrice("caretakerServicePricing", service._id, event.target.value)} />}</div>)}</div>
                    <div className="space-y-2"><Label>Add-ons</Label>{assignmentCaretakerAddons.map((addon: any) => <div key={addon._id} className="rounded-lg border p-3"><label className="flex items-start gap-3"><Checkbox checked={(editingProvider.caretakerAddonIds || []).includes(addon._id)} onCheckedChange={(checked) => toggleAssignedCatalogueItem("caretakerAddonIds", addon._id, checked === true)} /><span className="text-sm font-medium">{addon.addOnName} (Default +Rs. {Number(addon.price).toLocaleString("en-IN")})</span></label>{(editingProvider.caretakerAddonIds || []).includes(addon._id) && <Input className="mt-2" type="number" min="0" placeholder={`Provider add-on price (default Rs. ${Number(addon.price || 0).toLocaleString("en-IN")})`} value={(editingProvider.caretakerAddonPricing || []).find((item: any) => item.addonId === addon._id)?.customPrice ?? ""} onChange={(event) => setAssignedServicePrice("caretakerAddonPricing", addon._id, event.target.value)} />}</div>)}</div>
                  </div>}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProvider}
                  disabled={savingProvider || uploadingImage}
                >
                  {savingProvider && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-5 h-5" />
              Send Warning to Provider
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send a warning to{" "}
              <strong>{providerToWarn?.name}</strong>?
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Warning Count: {providerToWarn?.warnings || 0}/3
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                  {providerToWarn?.warnings === 2
                    ? "⚠️ This is the final warning. Next action will be termination."
                    : "Provider will be notified about policy violations."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProviderToWarn(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSendWarning}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Send Warning
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Dialog */}
      <AlertDialog
        open={showTerminateDialog}
        onOpenChange={setShowTerminateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Terminate Provider Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate{" "}
              <strong>{providerToTerminate?.name}</strong>'s account?
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-medium text-red-900 dark:text-red-100 mb-2">
                  ⛔ This action will:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>Immediately log out the provider from all devices</li>
                  <li>Prevent future login attempts</li>
                  <li>Display admin contact information for appeal</li>
                  <li>Cannot be reversed without admin intervention</li>
                </ul>
              </div>
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Provider can contact admin at:{" "}
                  <strong>{adminSupportEmail}</strong> or{" "}
                  <strong>{adminContactPhone}</strong>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProviderToTerminate(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTerminate}
              className="bg-destructive hover:bg-destructive/90"
            >
              Terminate Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Provider Dialog */}
      <AlertDialog
        open={showDeleteProviderDialog}
        onOpenChange={setShowDeleteProviderDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Provider
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{providerToDelete?.userId?.name || "this provider"}</strong>?
              This will remove the provider account and profile data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProviderToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProvider}
              className="bg-destructive hover:bg-destructive/90"
              disabled={savingProvider}
            >
              Delete Provider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog (centered) */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this{" "}
              {deleteTarget?.type === "aadhar" ? "Aadhar image" : "document"}?
              This action will remove it from the provider profile and the
              storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTarget}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

