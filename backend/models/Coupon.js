import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  discountType: {
    type: String,
    enum: ['fixed', 'percentage'],
    required: true,
  },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, default: 0, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  validFor: {
    type: String,
    enum: ['appointment', 'lab_test', 'ambulance', 'all'],
    default: 'all',
  },
  firstTimeOnly: { type: Boolean, default: false },
  usageLimit: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

CouponSchema.index({ status: 1, validFor: 1 });

export default mongoose.model('Coupon', CouponSchema);
