import express from 'express';
import {
  applyCoupon,
  getAvailableCoupons,
  validateCoupon,
} from '../controllers/CouponController.js';
import { auth, authorize } from '../middlewares/Auth.js';

const router = express.Router();

router.get('/available', auth, authorize('patient'), getAvailableCoupons);
router.post('/validate', auth, authorize('patient'), validateCoupon);
router.post('/apply', auth, authorize('patient'), applyCoupon);

export default router;
