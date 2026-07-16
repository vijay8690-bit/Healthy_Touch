import express from 'express';
import {
    bookAppointment,
    getMyAppointments,
    getAppointmentById,
    getProviderAppointmentVisits,
    verifyProviderAppointmentVisit,
    getPatientAppointmentVisits,
    getAdminAppointmentAttendance,
    updateAppointmentStatus,
    cancelAppointment,
    getAvailableSlots,
} from '../controllers/AppointmentController.js';
import { auth, authorize, checkProviderApproval } from '../middlewares/Auth.js';
import { verifyPaymentBeforeBooking } from '../middlewares/PaymentVerification.js';
import { attachSettings } from '../middlewares/SettingsCache.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Attach settings to all appointment routes
router.use(attachSettings);

// Public routes
router.get('/slots/:providerId/:date', getAvailableSlots);

// Protected routes - Payment verification required for booking
router.post('/', 
    auth, 
    upload.fields([{ name: 'prescriptionImages', maxCount: 5 }]),
    verifyPaymentBeforeBooking, 
    bookAppointment
);
router.get('/my-appointments', auth, getMyAppointments);
router.get('/:id', auth, getAppointmentById);
router.get('/:id/visits', auth, getPatientAppointmentVisits);
router.get('/:id/attendance', auth, getAdminAppointmentAttendance);
router.get('/:id/provider-visits', auth, authorize('provider'), checkProviderApproval, getProviderAppointmentVisits);
router.post('/:id/provider-visits/verify', auth, authorize('provider'), checkProviderApproval, verifyProviderAppointmentVisit);
router.put('/:id/status', auth, authorize('provider'), checkProviderApproval, updateAppointmentStatus);
router.put('/:id/cancel', auth, authorize('patient'), cancelAppointment);

export default router;
