import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import Payment from '../models/Payment.js';
import LabBooking from '../models/LabBooking.js';

const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const calculateDiscount = (coupon, amount) => {
  const baseAmount = Math.max(0, Number(amount) || 0);
  let discount = coupon.discountType === 'percentage'
    ? baseAmount * (Number(coupon.discountValue || 0) / 100)
    : Number(coupon.discountValue || 0);

  if (coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  return roundMoney(Math.min(baseAmount, Math.max(0, discount)));
};

export const validateCouponForUser = async ({
  code,
  userId,
  bookingType,
  orderAmount,
  excludePaymentId,
  excludeBookingId,
}) => {
  const couponCode = normalizeCode(code);
  if (!couponCode) {
    const error = new Error('Please enter a coupon code');
    error.statusCode = 400;
    throw error;
  }

  const coupon = await Coupon.findOne({ code: couponCode });
  if (!coupon) {
    const error = new Error('Coupon not found');
    error.statusCode = 404;
    throw error;
  }

  if (coupon.status !== 'active') {
    const error = new Error('Coupon is inactive');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    const error = new Error('Coupon is not active yet');
    error.statusCode = 400;
    throw error;
  }
  if (coupon.endDate && now > coupon.endDate) {
    const error = new Error('Coupon has expired');
    error.statusCode = 400;
    throw error;
  }

  if (!['all', bookingType].includes(coupon.validFor)) {
    const error = new Error('Coupon is not valid for this service');
    error.statusCode = 400;
    throw error;
  }

  const grossAmount = roundMoney(orderAmount);
  if (grossAmount < Number(coupon.minOrderAmount || 0)) {
    const error = new Error(`Minimum order amount is Rs. ${coupon.minOrderAmount}`);
    error.statusCode = 400;
    throw error;
  }

  const usageQuery = { couponId: coupon._id };
  if (excludePaymentId && mongoose.Types.ObjectId.isValid(excludePaymentId)) {
    usageQuery.paymentId = { $ne: excludePaymentId };
  }
  const totalUsage = await CouponUsage.countDocuments(usageQuery);
  if (coupon.usageLimit > 0 && totalUsage >= coupon.usageLimit) {
    const error = new Error('Coupon usage limit reached');
    error.statusCode = 400;
    throw error;
  }

  const userUsageQuery = { couponId: coupon._id, userId };
  if (excludePaymentId && mongoose.Types.ObjectId.isValid(excludePaymentId)) {
    userUsageQuery.paymentId = { $ne: excludePaymentId };
  }
  if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) {
    userUsageQuery.bookingId = { $ne: excludeBookingId };
  }
  const userUsage = await CouponUsage.countDocuments(userUsageQuery);
  const perUserLimit = Number(coupon.perUserLimit || 0);
  if (perUserLimit > 0 && userUsage >= perUserLimit) {
    const error = new Error('You have already used this coupon');
    error.statusCode = 400;
    throw error;
  }

  if (coupon.firstTimeOnly) {
    const [completedPayments, paidLabBookings] = await Promise.all([
      Payment.countDocuments({
        patientId: userId,
        status: 'completed',
        ...(excludePaymentId && mongoose.Types.ObjectId.isValid(excludePaymentId) ? { _id: { $ne: excludePaymentId } } : {}),
      }),
      LabBooking.countDocuments({
        patientId: userId,
        paymentStatus: 'paid',
        ...(excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId) ? { _id: { $ne: excludeBookingId } } : {}),
      }),
    ]);

    if ((completedPayments + paidLabBookings) > 0) {
      const error = new Error('Coupon is valid only for first-time users');
      error.statusCode = 400;
      throw error;
    }
  }

  const discountAmount = calculateDiscount(coupon, grossAmount);
  if (discountAmount <= 0) {
    const error = new Error('Coupon does not apply any discount');
    error.statusCode = 400;
    throw error;
  }

  return {
    coupon,
    discountAmount,
    payableBeforeCoins: roundMoney(Math.max(0, grossAmount - discountAmount)),
  };
};

export const applyCouponUsageOnce = async ({
  couponId,
  userId,
  bookingType,
  bookingId,
  paymentId,
  discountAmount,
}) => {
  if (!couponId || !userId || discountAmount <= 0) return null;

  const query = paymentId
    ? { paymentId }
    : { couponId, bookingType, bookingId };

  return CouponUsage.findOneAndUpdate(
    query,
    {
      $setOnInsert: {
        couponId,
        userId,
        bookingType,
        bookingId,
        paymentId,
        discountAmount,
        usedAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );
};
