import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import SupportCallWidget from "@/components/ui/SupportCallWidget";
import HealthExpertCallPopup from "@/components/ui/HealthExpertCallPopup";

import { FEATURES } from '@/config/features';

// PagesConsole.log("");
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import OTPVerification from "./pages/OTPVerification";
import ServicesPage from "./pages/ServicesPage";
import AboutPage from "./pages/AboutPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import ContactPage from "./pages/ContactPage";
import LegalDocumentPage from "./pages/LegalDocumentPage";
import LabTestsPage from "./pages/LabTestsPage";
import LabTestBookingPage from "./pages/LabTestBookingPage";
import LabTestPaymentPage from "./pages/LabTestPaymentPage";
import LabReportPreview from "./pages/LabReportPreview";
import LabGeneratedReportPage from "./pages/LabGeneratedReportPage";
import AmbulanceBookingPage from "./pages/AmbulanceBookingPage";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import VerifyProviderPage from "./pages/VerifyProviderPage";

// Patient Pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientRecords from "./pages/patient/PatientRecords";
import PatientProviders from "./pages/patient/PatientProviders";
import PatientProfile from "./pages/patient/PatientProfile";
import PatientCoins from "./pages/patient/PatientCoins";
import PatientFamilyFriends from "./pages/patient/PatientFamilyFriends";

// Provider Pages
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderAppointments from "./pages/provider/ProviderAppointments";
import ProviderPatients from "./pages/provider/ProviderPatients";
import PatientMedicalProfile from "./pages/provider/PatientMedicalProfile";
import ProviderNotes from "./pages/provider/ProviderNotes";
import ProviderProfile from "./pages/provider/ProviderProfile";
import ProviderApprovalPending from "./pages/provider/ProviderApprovalPending";
import ProviderEarnings from "./pages/provider/ProviderEarnings";
import ProviderCoins from "./pages/provider/ProviderCoins";
import ProviderLabTests from "./pages/provider/ProviderLabTests";
import ProviderLabMasterTests from "./pages/provider/ProviderLabMasterTests";
import ProviderAmbulanceRequests from "./pages/provider/ProviderAmbulanceRequests";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProviders from "./pages/admin/AdminProviders";
import AdminCaretakers from "./pages/admin/AdminCaretakers";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminProviderPayouts from "./pages/admin/AdminProviderPayouts";
import AdminWithdrawalRequests from "./pages/admin/AdminWithdrawalRequests";
import AdminQueries from "./pages/admin/AdminQueries";
import AdminOurTeam from "./pages/admin/AdminOurTeam";
import AdminHomeContent from "./pages/admin/AdminHomeContent";
import AdminLabBookings from "./pages/admin/AdminLabBookings";
import AdminLabTests from "./pages/admin/AdminLabTests";
import AdminAmbulanceRequests from "./pages/admin/AdminAmbulanceRequests";
import AdminCoins from "./pages/admin/AdminCoins";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminLegalDocuments from "./pages/admin/AdminLegalDocuments";
import AdminLocations from "./pages/admin/AdminLocations";

const queryClient = new QueryClient();

const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useSettings();
  const { user, isLoading: authLoading } = useAuth();

  const maintenanceMode = !!(settings as any)?.maintenanceMode;
  const maintenanceMessage = (settings as any)?.maintenanceMessage as string | undefined;
  const isAdmin = user?.role === 'admin';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-xl w-full mx-auto px-6">
          <div className="card-healthcare p-8 text-center">
            <h1 className="font-display text-2xl font-semibold mb-2">We’ll be back soon</h1>
            <p className="text-muted-foreground">{maintenanceMessage || 'We are currently under maintenance. Please check back soon.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ScrollToTop component to scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const LegalRedirect = () => {
  const { slug = '' } = useParams();
  return <Navigate to={`/${slug}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <AuthProvider>
        <LocationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <MaintenanceGate>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms-and-conditions" element={<LegalDocumentPage />} />
                  <Route path="/privacy-policy" element={<LegalDocumentPage />} />
                  <Route path="/legal/:slug" element={<LegalRedirect />} />
                  <Route path="/verify-provider/:providerId" element={<VerifyProviderPage />} />
                  {
                    FEATURES.LAB_MODULE ? (
                      <Route path="/lab-tests" element={<LabTestsPage />} />
                    ) : (
                      <Route path="/lab-tests" element={<NotFound />} />
                    )
                  }
                  <Route path="/lab-report-preview" element={<LabReportPreview />} />
                  <Route
                    path="/lab-bookings/:bookingId/generated-report"
                    element={
                      <ProtectedRoute allowedRoles={['patient', 'provider', 'admin']}>
                        <LabGeneratedReportPage />
                      </ProtectedRoute>
                    }
                  />
                  {
                    FEATURES.AMBULANCE_MODULE ? (
                      <Route
                        path="/ambulance/book"
                        element={<AmbulanceBookingPage />}
                      />
                    ) : (
                      <Route
                        path="/ambulance/book"
                        element={<NotFound />}
                      />
                    )
                  }

                  <Route
                    path="/auth"
                    element={<AuthPage audience="patient" />}
                  />
                  <Route
                    path="/login"
                    element={<AuthPage audience="patient" defaultMode="login" />}
                  />
                  <Route
                    path="/register"
                    element={<AuthPage audience="patient" defaultMode="register" />}
                  />
                  <Route
                    path="/admin/login"
                    element={<AuthPage audience="admin" defaultMode="login" />}
                  />
                  <Route
                    path="/admin/auth"
                    element={<AuthPage audience="admin" defaultMode="login" />}
                  />
                  <Route
                    path="/provider/login"
                    element={<AuthPage audience="provider" defaultMode="login" />}
                  />
                  <Route
                    path="/provider/signup"
                    element={<AuthPage audience="provider" defaultMode="register" />}
                  />
                  <Route
                    path="/provider/auth"
                    element={<AuthPage audience="provider" />}
                  />
                  <Route
                    path="/reset-password"
                    element={<AuthPage audience="patient" />}
                  />

                  <Route
                    path="/otp-verification"
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <OTPVerification />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/lab-tests/booking"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <LabTestBookingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/lab-tests/payment"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <LabTestPaymentPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Unauthorized Route */}
                  <Route path="/unauthorized" element={<ProviderApprovalPending />} />

                  <Route
                    path="/patient/dashboard"
                    element={<PatientDashboard />}
                  />
                  {/* Patient Routes - Protected */}
                  <Route
                    path="/patient/appointments"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <PatientAppointments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/records"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <PatientRecords />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/providers"
                    element={<PatientProviders />}
                  />
                  <Route
                    path="/patient/coins"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <PatientCoins />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/family-friends"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <PatientFamilyFriends />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/profile"
                    element={
                      <ProtectedRoute allowedRoles={['patient']}>
                        <PatientProfile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Provider Routes - Protected */}
                  <Route
                    path="/provider/approval-pending"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderApprovalPending />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/appointments"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderAppointments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/patients"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderPatients />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/lab-tests"
                    element={
                      <ProtectedRoute allowedRoles={['provider']}>
                        <ProviderLabTests />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/lab-tests/master"
                    element={
                      <ProtectedRoute allowedRoles={['provider']}>
                        <ProviderLabMasterTests />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/ambulance"
                    element={
                      <ProtectedRoute allowedRoles={['provider']}>
                        <ProviderAmbulanceRequests />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/patients/:patientId/medical-profile"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <PatientMedicalProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/notes"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderNotes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/earnings"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderEarnings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/coins"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderCoins />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/profile"
                    element={
                      <ProtectedRoute allowedRoles={['provider', 'doctor', 'nurse', 'caretaker', 'physiotherapy']}>
                        <ProviderProfile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes - Protected */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/providers"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminProviders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/caretakers"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminCaretakers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/appointments"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminAppointments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/lab-bookings"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLabBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/lab-tests"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLabTests />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/ambulance"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        {FEATURES.AMBULANCE_MODULE ? <AdminAmbulanceRequests /> : <NotFound />}
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/payouts"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminProviderPayouts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/withdrawals"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminWithdrawalRequests />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/queries"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminQueries />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/team"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminOurTeam />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/home-content"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminHomeContent />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/notifications"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminNotifications />
                      </ProtectedRoute>
                    }
                  />
                  {/* <Route 
              path="/admin/location" 
              element={
                <ProtectedRoute allowedRoles={['admin']}> */}
                  <Route
                    path="/admin/locations"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLocations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/coins"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminCoins />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/coupons"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminCoupons />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/legal-documents"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLegalDocuments />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MaintenanceGate>
              <HealthExpertCallPopup />
              <SupportCallWidget />
            </BrowserRouter>
          </TooltipProvider>
        </LocationProvider>
      </AuthProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;
