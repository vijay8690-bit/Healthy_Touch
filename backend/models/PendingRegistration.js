import mongoose from 'mongoose';

const PendingRegistrationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: false,
            lowercase: true,
            trim: true,
            index: true,
        },
        mobile: {
            type: String,
            required: false,
            trim: true,
            index: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['patient', 'provider'],
            required: true,
        },
        category: {
            type: String,
            enum: ['Doctor', 'Nurse', 'Physiotherapist', 'Lab Technician', 'Ambulance', 'Caretaker', 'Care Taker'],
        },
        specialization: {
            type: String,
        },
        providerDocuments: {
            aadharImages: [String],
            documentation: [String],
            rcDocument: String,
            driverLicenseDocument: String,
            ambulancePhoto: String,
            panCardPhoto: String,
            cancelledChequePhoto: String,
            policeVerificationDocument: String,
            profileImage: String,
        },
        acceptedLegalDocuments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LegalDocument',
        }],
        referralCodeUsed: {
            type: String,
            uppercase: true,
            trim: true,
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        extraData: {
            type: mongoose.Schema.Types.Mixed
        },
        location: {
            latitude: {
                type: Number,
                min: -90,
                max: 90,
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180,
            },
            address: {
                type: String,
            },
            updatedAt: {
                type: Date,
            },
        },
        otp: {
            code: String,
            expiresAt: Date,
        },
        // TTL cleanup for unverified signups
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
    },
    { timestamps: true }
);

PendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PendingRegistration', PendingRegistrationSchema);
