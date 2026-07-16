import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  address: { type: String, required: true, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
}, { _id: false });

const AmbulanceBookingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
  },
  ambulanceType: {
    type: String,
    required: true,
    trim: true,
  },
  requestType: {
    type: String,
    enum: ['emergency', 'scheduled'],
    required: true,
  },
  pickupLocation: {
    type: LocationSchema,
    required: true,
  },
  dropLocation: {
    type: LocationSchema,
    required: true,
  },
  patientCondition: {
    type: String,
    required: true,
    trim: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  preferredDateTime: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  totalDistance: {
    type: Number,
    default: 0,
    min: 0,
  },
  estimatedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  advanceAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  remainingAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentStage: {
    type: String,
    enum: ['advance_pending', 'advance_paid', 'final_payment_pending', 'fully_paid'],
    default: 'advance_pending',
  },
  finalAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  pricingBreakdown: {
    baseCharge: { type: Number, default: 0, min: 0 },
    fixedCharge: { type: Number, default: 0, min: 0 },
    perKmRate: { type: Number, default: 0, min: 0 },
    pricingMode: {
      type: String,
      enum: ['fixed', 'per_km'],
      default: 'fixed',
    },
  },
  grossAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  payableAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: [
      'pending_admin',
      'assigned_to_provider',
      'rejected_by_admin',
      'accepted_by_provider',
      'rejected_by_provider',
      'driver_on_way',
      'reached_pickup',
      'patient_picked',
      'patient_dropped',
      'completed',
      'cancelled',
    ],
    default: 'pending_admin',
  },
  adminRejectionReason: {
    type: String,
    trim: true,
  },
  providerRejectionReason: {
    type: String,
    trim: true,
  },
  statusHistory: [{
    status: { type: String, required: true },
    note: { type: String, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  }],
  acceptedAt: Date,
  driverOnWayAt: Date,
  reachedPickupAt: Date,
  patientPickedAt: Date,
  patientDroppedAt: Date,
  completedAt: Date,
}, { timestamps: true });

AmbulanceBookingSchema.index({ patientId: 1, createdAt: -1 });
AmbulanceBookingSchema.index({ assignedProviderId: 1, status: 1 });
AmbulanceBookingSchema.index({ status: 1, preferredDateTime: 1 });

export default mongoose.model('AmbulanceBooking', AmbulanceBookingSchema);
