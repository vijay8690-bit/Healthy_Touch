import mongoose from 'mongoose';

const CouponUsageSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookingType: {
    type: String,
    enum: ['appointment', 'lab_test', 'ambulance'],
    required: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  usedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ paymentId: 1 }, { unique: true, sparse: true });
CouponUsageSchema.index({ bookingType: 1, bookingId: 1, couponId: 1 }, { unique: true, sparse: true });

export default mongoose.model('CouponUsage', CouponUsageSchema);
