import mongoose from 'mongoose';
import { generateLabCode } from '../utils/labCode.js';

const ProviderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    profileImage: { type: String, default: null },
    category: { type: String, enum: ['Doctor', 'Nurse', 'Physiotherapist', 'Lab Technician', 'Ambulance', 'Caretaker', 'Care Taker'], required: true },
    specialization: { type: String, required: true },
    qualification: { type: String, default: 'N/A' },
    fees: { type: Number, required: true, min: 0 },
    availability: [
        {
            day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
            startTime: String,
            endTime: String,
        },
    ],
    availabilityStatus: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'inactive', 'suspended', 'terminated'], default: 'pending' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    aadharImages: { type: [String], default: [] },
    documentation: { type: [String], default: [] },
    experience: { type: Number },
    address: { street: String, city: String, state: String, pincode: String },
    location: { latitude: { type: Number, min: -90, max: 90 }, longitude: { type: Number, min: -180, max: 180 }, address: { type: String }, updatedAt: { type: Date } },
    bio: { type: String, maxlength: 500 },

    // ---- PHYSIOTHERAPY CATALOGUE OFFERINGS ----
    physiotherapyServiceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysiotherapyService',
    }],
    physiotherapyAddonIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysiotherapyAddon',
    }],
    physiotherapyServicePricing: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhysiotherapyService' },
        customPrice: { type: Number, min: 0 },
    }],
    physiotherapyAddonPricing: [{
        addonId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhysiotherapyAddon' },
        customPrice: { type: Number, min: 0 },
    }],

    // ---- NURSE CATALOGUE OFFERINGS ----
    nurseServiceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NurseService',
    }],
    nurseAddonIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NurseAddon',
    }],
    nurseServicePricing: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'NurseService' },
        customPrice: { type: Number, min: 0 },
    }],
    nurseAddonPricing: [{
        addonId: { type: mongoose.Schema.Types.ObjectId, ref: 'NurseAddon' },
        customPrice: { type: Number, min: 0 },
    }],
    caretakerServiceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaretakerService',
    }],
    caretakerAddonIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaretakerAddon',
    }],
    caretakerServicePricing: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaretakerService' },
        customPrice: { type: Number, min: 0 },
    }],
    caretakerAddonPricing: [{
        addonId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaretakerAddon' },
        customPrice: { type: Number, min: 0 },
    }],
    
    // ---- AMBULANCE SPECIFIC FIELDS ----
    ambulanceType: { type: String, enum: ['Basic Life Support (BLS) Ambulance', 'Advanced Life Support (ALS) Ambulance', 'ICU Ambulance', 'Dead Body Transport Ambulance'] },
    medicalEquipment: { type: [String], enum: ['Oxygen Cylinder', 'Ventilator', 'Cardiac Monitor', 'Stretcher', 'First Aid Kit'] },
    vehicleNumber: String,
    vehicleModel: String,
    vehicleYear: String,
    driverLicenseNumber: String,
    driverName: String,
    driverMobileNo: String,
    serviceArea: [String],
    availabilityType: { type: String, enum: ['24/7 Available', 'Day Time Only', 'Night Time Only'] },
    baseCharges: Number,
    perKmCharge: Number,
    rcDocument: String,
    driverLicenseDocument: String,
    ambulancePhoto: String,
    
    // --- VERIFICATION / BANK DOCUMENTS (FOR ALL OR AMBULANCE) ---
    panCardPhoto: String,
    bankAccountNumber: String,
    bankIfscCode: String,
    cancelledChequePhoto: String,
    policeVerificationStatus: { type: String, enum: ['Done', 'Done ✅', 'Not Done', 'Ready to Apply'] },
    policeVerificationDocument: String,
    
    // ---- GDA / CARETAKER SPECIFIC FIELDS ----
    caretakerServiceType: { type: String, enum: ['Elder Care', 'Patient Care', 'Post Surgery Care', 'Baby Care', 'Home Assistance'] },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'male', 'female', 'other'] },
    age: Number,
    languagesKnown: [String],
    availableServiceArea: [String],

    // ---- LAB TECHNICIAN SPECIFIC FIELDS ----
    labServiceType: { type: String, enum: ['Pathology Centre (Lab)', 'Radiology Centre (Lab)', 'Both'] },
    labName: String,
    labCode: { type: String, trim: true, uppercase: true },
    labRegistrationCertificate: String,
    nablCertificate: [String],
    availableTests: [String],
    homeSampleCollection: { type: String, enum: ['Yes', 'No'] },
    labExperience: { type: String, enum: ['0-1 Year', '1-3 Years', '3+ Years'] },
    labServiceArea: String,
    reportDeliveryTime: { type: String, enum: ['Same Day', 'Next Day', '2-3 Days'] },
    certificationStatus: { type: String, enum: ['NABL Certified', 'Not Certified', 'In Process'] },
    contactPersonName: String,
    labContactNumber: String,
    labEmergencyContactNumber: String,

}, { timestamps: true });

ProviderSchema.virtual('averageRating').get(function() { return this._averageRating ?? 4; });
ProviderSchema.virtual('totalReviews').get(function() { return this._totalReviews || 0; });

ProviderSchema.pre('validate', function() {
    if (this.labServiceType === 'Diagnostic Centre (Lab)') {
        this.labServiceType = 'Pathology Centre (Lab)';
    }
    if (this.labServiceType === 'Home Sample Collection Only') {
        this.labServiceType = 'Radiology Centre (Lab)';
    }
});

ProviderSchema.set('toJSON', { virtuals: true });
ProviderSchema.set('toObject', { virtuals: true });

ProviderSchema.index({ userId: 1 });
ProviderSchema.index({ category: 1, status: 1 });
ProviderSchema.index({ status: 1 });
ProviderSchema.index({ labCode: 1 });

ProviderSchema.pre('validate', function() {
    if (this.category === 'Lab Technician') {
        const expectedLabCode = generateLabCode(this);

        if (expectedLabCode && this.labCode !== expectedLabCode) {
            this.labCode = expectedLabCode;
        }
    }
});

export default mongoose.model('Provider', ProviderSchema);
