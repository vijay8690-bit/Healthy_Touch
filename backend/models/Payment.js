import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider',
    },
    // Provider's base fee (what provider set)
    baseAmount: {
        type: Number,
        default: 0,
    },
    // Platform commission (20% of base amount)
    platformCommission: {
        type: Number,
        default: 0,
    },
    // GST percentage (default 18%)
    gstPercentage: {
        type: Number,
        default: 18,
    },
    // GST amount calculated on (baseAmount + platformCommission)
    gstAmount: {
        type: Number,
        default: 0,
    },
    // Travel fare for providers beyond 20km (5rs per km after 20km)
    travelFare: {
        type: Number,
        default: 0,
    },
    // Distance between patient and provider in km
    distance: {
        type: Number,
    },
    // Total amount user pays (baseAmount + platformCommission + gstAmount + travelFare)
    totalAmount: {
        type: Number,
        required: true,
    },
    grossAmount: {
        type: Number,
        default: 0,
    },
    payableAmount: {
        type: Number,
        default: 0,
    },
    coinsUsed: {
        type: Number,
        default: 0,
        min: 0,
    },
    coinValueInRupees: {
        type: Number,
        default: 1,
        min: 0,
    },
    coinDiscount: {
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
    couponApplied: {
        type: Boolean,
        default: false,
    },
    coinsRedeemed: {
        type: Boolean,
        default: false,
    },
    // Platform revenue (platformCommission + GST on commission portion)
    platformRevenue: {
        type: Number,
        default: 0,
    },
    // Amount provider receives (baseAmount)
    providerAmount: {
        type: Number,
        default: 0,
    },
    // Legacy field for backward compatibility
    amount: {
        type: Number,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded', 'refund_pending'],
        default: 'pending',
    },
    // Refund information
    refund: {
        status: {
            type: String,
            enum: ['none', 'pending', 'processing', 'completed', 'failed'],
            default: 'none',
        },
        amount: {
            type: Number,
            default: 0,
        },
        refundedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        refundedAt: Date,
        refundTransactionId: String,
        reason: String,
        processingTime: String, // "24 hours", "48 hours"
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'coins', 'test'],
    },
    transactionId: {
        type: String,
    },
    razorpayOrderId: {
        type: String,
    },
    razorpayPaymentId: {
        type: String,
    },
    razorpaySignature: {
        type: String,
    },
    // Store booking details before appointment is created
    bookingDetails: {
        date: Date,
        timeSlot: String,
        reason: String,
    },
    physiotherapyBookingType: {
        type: String,
        enum: ['single', 'package'],
    },
    physiotherapyServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysiotherapyService',
    },
    physiotherapyServiceName: String,
    nurseBookingType: {
        type: String,
        enum: ['single', 'package'],
    },
    nurseServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NurseService',
    },
    nurseServiceName: String,
    caretakerBookingType: { type: String, enum: ['single', 'package'] },
    caretakerServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaretakerService' },
    caretakerServiceName: String,
    caretakerShiftType: String,
    caretakerDurationHours: Number,
    selectedAddOns: [{
        addonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PhysiotherapyAddon',
        },
        name: String,
        price: Number,
    }],
    packageSessionCount: Number,
    packageVisitCount: Number,
    packageDiscount: Number,
    serviceAmount: Number,
    addonAmount: Number,
    finalAmount: Number,
    bookingType: {
        type: String,
        enum: ['appointment', 'lab_test', 'ambulance'],
        default: 'appointment',
    },
    labBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LabBooking',
    },
    ambulanceBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AmbulanceBooking',
    },
    // Store payment gateway response
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed,
    },
    payoutStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
    },
    payoutDate: {
        type: Date,
    },
    // Legacy field
    platformFee: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// Calculate amounts before saving
PaymentSchema.pre('save', function () {
    // Calculate platform commission (20% of base amount)
    if (this.isModified('baseAmount') && (this.platformCommission === undefined || this.platformCommission === null)) {
        this.platformCommission = this.baseAmount * 0.20; // 20%
        this.providerAmount = this.baseAmount;
    }
    
    // Calculate GST (18% ONLY on platformCommission, NOT on full amount)
    if (this.isModified('baseAmount') || this.isModified('platformCommission')) {
        // IMPORTANT: GST is calculated ONLY on commission, not on baseAmount
        this.gstAmount = this.platformCommission * (this.gstPercentage / 100);
    }
    
    // Calculate total amount user pays
    if (this.isModified('baseAmount') || this.isModified('platformCommission') || this.isModified('gstAmount') || this.isModified('travelFare') || this.isModified('couponDiscount') || this.isModified('coinDiscount')) {
        this.grossAmount = this.baseAmount + this.platformCommission + this.gstAmount + (this.travelFare || 0);
        this.totalAmount = Math.max(0, this.grossAmount - (this.couponDiscount || 0) - (this.coinDiscount || 0));
        this.payableAmount = this.totalAmount;
        // Set legacy amount field
        this.amount = this.totalAmount;
    }
    
    // Calculate platform revenue (commission + GST on commission)
    if (this.isModified('platformCommission') || this.isModified('gstAmount')) {
        // Platform revenue = commission + GST (since GST is already on commission only)
        this.platformRevenue = this.platformCommission + this.gstAmount;
    }
});

// Index for better query performance
// DO NOT add unique index on appointmentId. It causes duplicate key errors when appointmentId is null.
PaymentSchema.index({ patientId: 1 });
PaymentSchema.index({ providerId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ payoutStatus: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ transactionId: 1 }, { sparse: true });
PaymentSchema.index({ bookingType: 1, labBookingId: 1 });
PaymentSchema.index({ couponId: 1 });

export default mongoose.model('Payment', PaymentSchema);
