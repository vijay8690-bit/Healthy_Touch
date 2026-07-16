import express from 'express';
import {
    // Dashboard
    getDashboardStats,
    
    // Users Management
    getAllUsers,
    updateUser,
    toggleUserStatus,
    deleteUser,
    
    // Providers Management
    getAllProviders,
    updateProviderDetails,
    approveProvider,
    rejectProvider,
    
    // Appointments Management
    getAllAppointments,
    getAppointmentById,
    cancelAppointment,
    
    // Payments Management
    getAllPayments,
    getPaymentById,
    downloadReceipt,
    exportPaymentsCSV,
    
    // Notifications Management (Auto-generated - View & Delete only)
    getAllNotifications,
    deleteNotification,
    getProviderDetails,
    getUserDetails,
    
    // Suspension Management
    suspendUser,
    unsuspendUser,
    suspendProvider,
    unsuspendProvider,
} from '../controllers/AdminController.js';
import {
    getAllLocations,
} from '../controllers/LocationController.js';
import {
    getAllProviderPayouts,
    getProviderPayoutSummary,
    getGSTReport,
    releasePayment,
    getWeeklyPendingPayouts,
    markPayoutAsPaid,
    createRazorpayPayoutOrder,
    verifyRazorpayPayout,
} from '../controllers/ProviderPayoutController.js';
import {
    getAllQueries,
    replyToQuery,
    updateQueryStatus,
    deleteQuery,
} from '../controllers/ContactQueryController.js';
import {
    processRefund,
    completeRefund,
    getAllRefunds,
} from '../controllers/RefundController.js';
import {
    approveWithdrawal,
    getAdminWithdrawals,
    markWithdrawalPaid,
    rejectWithdrawal,
} from '../controllers/WithdrawalRequestController.js';
import {
    getAllTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
} from '../controllers/TeamController.js';
import {
    createAdminLabTest,
    deleteAdminLabTest,
    getAdminLabTests,
    importAdminLabTests,
    updateAdminLabTest,
    updateAdminLabTestStatus,
} from '../controllers/LabTestMasterController.js';
import {
    assignAmbulanceProvider,
    getAdminAmbulanceRequests,
    rejectAmbulanceByAdmin,
} from '../controllers/AmbulanceBookingController.js';
import {
    createCoupon,
    deleteCoupon,
    getAdminCoupons,
    getCouponUsageHistory,
    updateCoupon,
    updateCouponStatus,
} from '../controllers/CouponController.js';
import {
    createPhysiotherapyAddon,
    createPhysiotherapyService,
    deactivatePhysiotherapyAddon,
    deactivatePhysiotherapyService,
    deletePhysiotherapyAddon,
    deletePhysiotherapyService,
    getAdminPhysiotherapyAddons,
    getAdminPhysiotherapyServices,
    updatePhysiotherapyAddon,
    updatePhysiotherapyService,
} from '../controllers/PhysiotherapyController.js';
import {
    createNurseAddon,
    createNurseService,
    deactivateNurseAddon,
    deactivateNurseService,
    deleteNurseAddon,
    deleteNurseService,
    getAdminNurseAddons,
    getAdminNurseServices,
    updateNurseAddon,
    updateNurseService,
} from '../controllers/NurseController.js';
import {
    createCaretakerAddon,
    createCaretakerService,
    deactivateCaretakerAddon,
    deactivateCaretakerService,
    deleteCaretakerAddon,
    deleteCaretakerService,
    getAdminCaretakerAddons,
    getAdminCaretakerServices,
    updateCaretakerAddon,
    updateCaretakerService,
} from '../controllers/CaretakerServiceController.js';
import { auth, adminOnly } from '../middlewares/Auth.js';

const router = express.Router();

// ============================================
// ALL ROUTES PROTECTED WITH ADMIN AUTHENTICATION
// ============================================

// Apply admin authentication to all routes
router.use(auth);
router.use(adminOnly);

// ============================================
// DASHBOARD
// ============================================
router.get('/dashboard', getDashboardStats);

// ============================================
// LAB TEST MASTER MANAGEMENT
// ============================================
router.get('/lab-tests', getAdminLabTests);
router.post('/lab-tests', createAdminLabTest);
router.post('/lab-tests/import', importAdminLabTests);
router.put('/lab-tests/:id', updateAdminLabTest);
router.patch('/lab-tests/:id/status', updateAdminLabTestStatus);
router.delete('/lab-tests/:id', deleteAdminLabTest);

// ============================================
// PHYSIOTHERAPY CATALOG MANAGEMENT
// ============================================
router.get('/physiotherapy/services', getAdminPhysiotherapyServices);
router.post('/physiotherapy/services', createPhysiotherapyService);
router.put('/physiotherapy/services/:id', updatePhysiotherapyService);
router.delete('/physiotherapy/services/:id/delete', deletePhysiotherapyService);
router.delete('/physiotherapy/services/:id', deactivatePhysiotherapyService);
router.get('/physiotherapy/addons', getAdminPhysiotherapyAddons);
router.post('/physiotherapy/addons', createPhysiotherapyAddon);
router.put('/physiotherapy/addons/:id', updatePhysiotherapyAddon);
router.delete('/physiotherapy/addons/:id/delete', deletePhysiotherapyAddon);
router.delete('/physiotherapy/addons/:id', deactivatePhysiotherapyAddon);

// ============================================
// NURSE CATALOG MANAGEMENT
// ============================================
router.get('/nurse/services', getAdminNurseServices);
router.post('/nurse/services', createNurseService);
router.put('/nurse/services/:id', updateNurseService);
router.delete('/nurse/services/:id/delete', deleteNurseService);
router.delete('/nurse/services/:id', deactivateNurseService);
router.get('/nurse/addons', getAdminNurseAddons);
router.post('/nurse/addons', createNurseAddon);
router.put('/nurse/addons/:id', updateNurseAddon);
router.delete('/nurse/addons/:id/delete', deleteNurseAddon);
router.delete('/nurse/addons/:id', deactivateNurseAddon);

// ============================================
// CARETAKER BOOKING CATALOG MANAGEMENT
// ============================================
router.get('/caretaker/services', getAdminCaretakerServices);
router.post('/caretaker/services', createCaretakerService);
router.put('/caretaker/services/:id', updateCaretakerService);
router.delete('/caretaker/services/:id/delete', deleteCaretakerService);
router.delete('/caretaker/services/:id', deactivateCaretakerService);
router.get('/caretaker/addons', getAdminCaretakerAddons);
router.post('/caretaker/addons', createCaretakerAddon);
router.put('/caretaker/addons/:id', updateCaretakerAddon);
router.delete('/caretaker/addons/:id/delete', deleteCaretakerAddon);
router.delete('/caretaker/addons/:id', deactivateCaretakerAddon);

// ============================================
// COUPON MANAGEMENT
// ============================================
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.patch('/coupons/:id/status', updateCouponStatus);
router.delete('/coupons/:id', deleteCoupon);
router.get('/coupons/:id/usage', getCouponUsageHistory);

// ============================================
// AMBULANCE REQUEST MANAGEMENT
// ============================================
router.get('/ambulance/requests', getAdminAmbulanceRequests);
router.put('/ambulance/:id/assign', assignAmbulanceProvider);
router.put('/ambulance/:id/reject', rejectAmbulanceByAdmin);

// ============================================
// LOCATIONS MANAGEMENT
// ============================================
router.get('/locations', getAllLocations);

// ============================================
// USERS MANAGEMENT
// ============================================
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUser);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/unsuspend', unsuspendUser);
router.delete('/users/:id', deleteUser);

// ============================================
// PROVIDERS MANAGEMENT
// ============================================
router.get('/providers', getAllProviders);
router.get('/providers/:id', getProviderDetails);
router.put('/providers/:id', updateProviderDetails);
router.put('/providers/:id/approve', approveProvider);
router.put('/providers/:id/reject', rejectProvider);
router.put('/providers/:id/suspend', suspendProvider);
router.put('/providers/:id/unsuspend', unsuspendProvider);

// ============================================
// APPOINTMENTS MANAGEMENT
// ============================================
router.get('/appointments', getAllAppointments);
router.get('/appointments/:id', getAppointmentById);
router.put('/appointments/:id/cancel', cancelAppointment);

// ============================================
// PAYMENTS MANAGEMENT
// ============================================
router.get('/payments', getAllPayments);
router.get('/payments/export/csv', exportPaymentsCSV);
router.get('/payments/:id', getPaymentById);
router.get('/payments/:id/receipt', downloadReceipt);

// ============================================
// NOTIFICATIONS MANAGEMENT
// Auto-generated system notifications
// Admin can only view and delete
// ============================================
router.get('/notifications', getAllNotifications);
router.delete('/notifications/:id', deleteNotification);

// ============================================
// PROVIDER PAYOUTS MANAGEMENT
// ============================================
router.get('/payouts', getAllProviderPayouts);
router.get('/payouts/weekly-pending', getWeeklyPendingPayouts);
router.get('/payouts/gst-report', getGSTReport);
router.get('/payouts/summary/:providerId', getProviderPayoutSummary);
router.post('/payouts/release', releasePayment);
router.patch('/payouts/:payoutId/mark-paid', markPayoutAsPaid);
router.post('/payouts/create-razorpay-order', createRazorpayPayoutOrder);
router.post('/payouts/verify-razorpay', verifyRazorpayPayout);

// ============================================
// PROVIDER WITHDRAWAL REQUESTS
// ============================================
router.get('/withdrawals', getAdminWithdrawals);
router.patch('/withdrawals/:id/approve', approveWithdrawal);
router.patch('/withdrawals/:id/reject', rejectWithdrawal);
router.patch('/withdrawals/:id/mark-paid', markWithdrawalPaid);

// ============================================
// REFUND MANAGEMENT
// ============================================
router.get('/refunds', getAllRefunds);
router.post('/refunds/process', processRefund);
router.post('/refunds/complete', completeRefund);

// ============================================
// CONTACT QUERIES MANAGEMENT
// ============================================
router.get('/queries', getAllQueries);
router.post('/queries/:id/reply', replyToQuery);
router.put('/queries/:id/status', updateQueryStatus);
router.delete('/queries/:id', deleteQuery);

// ============================================
// OUR TEAM MANAGEMENT
// ============================================
router.get('/team', getAllTeamMembers);
router.post('/team', createTeamMember);
router.put('/team/:id', updateTeamMember);
router.delete('/team/:id', deleteTeamMember);

export default router;
