import express from 'express';
import {
    createPayment,
    createPaymentOrder,
    verifyPayment,
    updatePaymentStatus,
    updatePayoutStatus,
    getPaymentByAppointment,
    getMyPayments,
    getProviderEarnings,
    getAllPayments,
    refundPayment,
    getPaymentById,
} from '../controllers/PaymentController.js';
import { auth, adminOnly } from '../middlewares/Auth.js';
import { attachSettings } from '../middlewares/SettingsCache.js';

const router = express.Router();

// Attach settings to all payment routes
router.use(attachSettings);

// Protected routes - NEW PAYMENT FLOW
router.post('/create-order', auth, createPaymentOrder); // Step 1: Create payment order
router.post('/verify', auth, verifyPayment); // Step 2: Verify payment after gateway response

// Protected routes - Legacy
router.post('/', auth, createPayment);
router.get('/my-payments', auth, getMyPayments);
router.get('/earnings', auth, getProviderEarnings);
router.get('/appointment/:appointmentId', auth, getPaymentByAppointment);

// Admin only routes (specific routes before parameterized routes)
router.get('/all', auth, adminOnly, getAllPayments);
router.put('/:id/status', auth, adminOnly, updatePaymentStatus);
router.put('/:id/payout', auth, adminOnly, updatePayoutStatus);
router.put('/:id/refund', auth, adminOnly, refundPayment);

// Parameterized route must come last
router.get('/:id', auth, getPaymentById);

export default router;
