import express from 'express';
import {
  createAmbulancePaymentOrder,
  createAmbulanceBooking,
  getMyAmbulanceBookings,
  markAmbulancePaymentPaid,
} from '../controllers/AmbulanceBookingController.js';
import { auth, authorize } from '../middlewares/Auth.js';
import { attachSettings } from '../middlewares/SettingsCache.js';

const router = express.Router();
router.use(attachSettings);

router.post('/book', auth, authorize('patient'), createAmbulanceBooking);
router.get('/my-bookings', auth, authorize('patient'), getMyAmbulanceBookings);
router.post('/:id/payment-order', auth, authorize('patient'), createAmbulancePaymentOrder);
router.put('/:id/pay', auth, authorize('patient'), markAmbulancePaymentPaid);

export default router;
