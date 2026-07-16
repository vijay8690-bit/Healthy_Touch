import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import { validateCouponForUser } from '../utils/coupons.js';

const normalizeCouponPayload = (body, createdBy) => ({
  code: String(body.code || '').trim().toUpperCase(),
  title: String(body.title || '').trim(),
  description: String(body.description || '').trim(),
  discountType: body.discountType,
  discountValue: Number(body.discountValue || 0),
  maxDiscount: Number(body.maxDiscount || 0),
  minOrderAmount: Number(body.minOrderAmount || 0),
  validFor: body.validFor || 'all',
  firstTimeOnly: !!body.firstTimeOnly,
  usageLimit: Number(body.usageLimit || 0),
  perUserLimit: Number(body.perUserLimit ?? 1),
  startDate: body.startDate,
  endDate: body.endDate,
  status: body.status || 'active',
  ...(createdBy ? { createdBy } : {}),
});

const validateAdminPayload = (payload) => {
  if (!payload.code || !payload.title || !payload.discountType || !payload.startDate || !payload.endDate) {
    return 'Code, title, discount type, start date, and end date are required';
  }
  if (!['fixed', 'percentage'].includes(payload.discountType)) return 'Invalid discount type';
  if (!['appointment', 'lab_test', 'ambulance', 'all'].includes(payload.validFor)) return 'Invalid service type';
  if (!['active', 'inactive'].includes(payload.status)) return 'Invalid coupon status';
  if (payload.discountValue <= 0) return 'Discount value must be greater than zero';
  if (new Date(payload.endDate) < new Date(payload.startDate)) return 'End date must be after start date';
  return '';
};

export const getAdminCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).populate('createdBy', 'name email');
    const usageCounts = await CouponUsage.aggregate([
      { $group: { _id: '$couponId', count: { $sum: 1 }, discount: { $sum: '$discountAmount' } } },
    ]);
    const usageMap = new Map(usageCounts.map((item) => [String(item._id), item]));

    res.json({
      success: true,
      coupons: coupons.map((coupon) => ({
        ...coupon.toObject(),
        usageCount: usageMap.get(String(coupon._id))?.count || 0,
        totalDiscountGiven: usageMap.get(String(coupon._id))?.discount || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load coupons', error: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const payload = normalizeCouponPayload(req.body, req.user.id);
    const validationError = validateAdminPayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const coupon = await Coupon.create(payload);
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000 ? 'Coupon code already exists' : 'Unable to create coupon',
      error: error.message,
    });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const payload = normalizeCouponPayload(req.body);
    const validationError = validateAdminPayload({ ...payload, createdBy: req.user.id });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000 ? 'Coupon code already exists' : 'Unable to update coupon',
      error: error.message,
    });
  }
};

export const updateCouponStatus = async (req, res) => {
  try {
    const status = req.body.status;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon status' });
    }
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to update coupon status', error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const usageCount = await CouponUsage.countDocuments({ couponId: req.params.id });
    if (usageCount > 0) {
      return res.status(400).json({ success: false, message: 'Coupon has usage history and cannot be deleted. Deactivate it instead.' });
    }
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to delete coupon', error: error.message });
  }
};

export const getCouponUsageHistory = async (req, res) => {
  try {
    const usage = await CouponUsage.find({ couponId: req.params.id })
      .populate('userId', 'name email mobile')
      .populate('couponId', 'code title')
      .sort({ usedAt: -1 });
    res.json({ success: true, usage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load usage history', error: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, bookingType, orderAmount } = req.body;
    const result = await validateCouponForUser({
      code,
      userId: req.user.id,
      bookingType,
      orderAmount,
    });

    res.json({
      success: true,
      coupon: {
        id: result.coupon._id,
        code: result.coupon.code,
        title: result.coupon.title,
        description: result.coupon.description,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
      },
      discountAmount: result.discountAmount,
      payableAmount: result.payableBeforeCoins,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Coupon validation failed' });
  }
};

export const getAvailableCoupons = async (req, res) => {
  try {
    const bookingType = req.query.bookingType || req.body?.bookingType;
    const orderAmount = Number(req.query.orderAmount ?? req.body?.orderAmount ?? 0);

    if (!['appointment', 'lab_test', 'ambulance'].includes(bookingType)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid booking type' });
    }

    const now = new Date();
    const coupons = await Coupon.find({
      status: 'active',
      validFor: { $in: [bookingType, 'all'] },
      startDate: { $lte: now },
      endDate: { $gte: now },
      minOrderAmount: { $lte: orderAmount },
    }).sort({ discountValue: -1, createdAt: -1 });

    const checkedCoupons = await Promise.all(coupons.map(async (coupon) => {
      try {
        const result = await validateCouponForUser({
          code: coupon.code,
          userId: req.user.id,
          bookingType,
          orderAmount,
        });

        return {
          id: coupon._id,
          code: coupon.code,
          title: coupon.title,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
          minOrderAmount: coupon.minOrderAmount,
          validFor: coupon.validFor,
          firstTimeOnly: coupon.firstTimeOnly,
          discountAmount: result.discountAmount,
          payableAmount: result.payableBeforeCoins,
        };
      } catch {
        return null;
      }
    }));

    res.json({
      success: true,
      coupons: checkedCoupons.filter(Boolean),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load available coupons', error: error.message });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const { code, bookingType, orderAmount, bookingId, paymentId } = req.body;
    const result = await validateCouponForUser({
      code,
      userId: req.user.id,
      bookingType,
      orderAmount,
      excludePaymentId: paymentId,
      excludeBookingId: bookingId,
    });

    res.json({
      success: true,
      coupon: { id: result.coupon._id, code: result.coupon.code, title: result.coupon.title },
      discountAmount: result.discountAmount,
      payableAmount: result.payableBeforeCoins,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Coupon apply failed' });
  }
};
