import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider',
        required: true,
    },
    labBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LabBooking',
    },
    date: {
        type: Date,
        required: true,
    },
    timeSlot: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending',
    },
    completedAt: {
        type: Date,
    },
    reason: {
        type: String,
        required: true,
    },
    notes: {
        type: String,
    },
    bookingFor: {
        type: String,
        enum: ['self', 'family'],
        default: 'self',
    },
    serviceReceiver: {
        memberId: String,
        name: String,
        relation: String,
        mobile: String,
        age: String,
        gender: String,
        medicalNotes: String,
    },
    // Previous prescription images uploaded by patient
    prescriptionImages: {
        type: [String],
        default: [],
    },
    // Distance between patient and provider in km
    distance: {
        type: Number,
    },
    // Travel fare for providers beyond 20km (5rs per km after 20km)
    travelFare: {
        type: Number,
        default: 0,
    },
    cancelledBy: {
        type: String,
        enum: ['patient', 'provider', 'admin'],
    },
    cancelledByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    cancellationReason: {
        type: String,
    },
    cancelledAt: {
        type: Date,
    },
    refundEligible: {
        type: Boolean,
        default: false,
    },
    refundProcessed: {
        type: Boolean,
        default: false,
    },
    // Track if reminder email has been sent
    reminderSent: {
        type: Boolean,
        default: false,
    },
    acceptedLegalDocuments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalDocument',
    }],
    bookingType: {
        type: String,
        enum: ['single', 'package'],
    },
    physiotherapyServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysiotherapyService',
    },
    physiotherapyServiceName: String,
    nurseServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NurseService',
    },
    nurseServiceName: String,
    caretakerServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaretakerService',
    },
    caretakerServiceName: String,
    shiftType: String,
    durationHours: Number,
    selectedAddOns: [{
        addonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PhysiotherapyAddon',
        },
        name: String,
        price: Number,
    }],
    sessionsTotal: Number,
    sessionsCompleted: {
        type: Number,
        default: 0,
    },
    visitsTotal: Number,
    visitsCompleted: {
        type: Number,
        default: 0,
    },
    packageSessionCount: Number,
    packageVisitCount: Number,
    packageDiscount: Number,
    serviceAmount: Number,
    addonAmount: Number,
    finalAmount: Number,
}, { timestamps: true });

// Index for better query performance
AppointmentSchema.index({ patientId: 1, date: 1 });
AppointmentSchema.index({ providerId: 1, date: 1 });
AppointmentSchema.index({ labBookingId: 1 });
AppointmentSchema.index({ status: 1 });

export default mongoose.model('Appointment', AppointmentSchema);
