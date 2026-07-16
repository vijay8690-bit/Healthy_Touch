import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false, // Optional - at least one of email or mobile required
        unique: true,
        sparse: true, // Allow multiple null values
        lowercase: true,
        trim: true,
    },
    mobile: {
        type: String,
        required: false, // Optional - at least one of email or mobile required
        unique: true,
        sparse: true, // Allow multiple null values
        trim: true,
    },
    password: {
        type: String,
        minlength: 8,
        message: 'Password must be at least 8 characters',
        required: true,
    },
    profileImage: {
        type: String, // Cloudinary URL for profile picture
        default: null,
    },
    role: {
        type: String,
        enum: ['patient', 'provider', 'admin'],
        required: true,
    },
    coins: {
        type: Number,
        default: 0,
        min: 0,
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    coinHistory: [{
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['FIRST_SIGNUP', 'FIRST_APPOINTMENT', 'APPOINTMENT_BOOKING', 'REFERRAL_BONUS', 'ADJUSTMENT', 'COIN_REDEMPTION'],
        },
        description: {
            type: String,
            required: true,
        },
        idempotencyKey: {
            type: String,
            index: true,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }],
    // Provider category - required only when role is 'provider'
    category: {
        type: String,
        enum: ['Doctor', 'Nurse', 'Physiotherapist', 'Lab Technician', 'Ambulance', 'Caretaker', 'Care Taker'],
        required: function() {
            return this.role === 'provider';
        },
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    otp: {
        code: String,
        expiresAt: Date,
    },
    // Suspension fields
    isSuspended: {
        type: Boolean,
        default: false,
    },
    suspension: {
        reason: String,
        suspendedAt: Date,
        suspendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    // Provider specific fields (stored during registration)
    providerDocuments: {
        aadharImages: [String], // Cloudinary URLs
        documentation: [String], // Cloudinary URLs
        rcDocument: String, // Cloudinary URL
        driverLicenseDocument: String, // Cloudinary URL
        ambulancePhoto: String, // Cloudinary URL
        panCardPhoto: String, // Cloudinary URL
        cancelledChequePhoto: String, // Cloudinary URL
        policeVerificationDocument: String, // Cloudinary URL
        profileImage: String, // Cloudinary URL
    },
    // Patient location for distance-based provider search
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
    // Last login tracking
    lastLogin: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true';

// Pre-validate hook: Ensure at least one of email or mobile is provided
UserSchema.pre('validate', async function() {
    // Validate: At least one of email or mobile must be provided
    if (!this.email && !this.mobile) {
        this.invalidate('email', 'At least one of email or mobile number is required');
        this.invalidate('mobile', 'At least one of email or mobile number is required');
    }
    
    // Validate: Category required for providers
    if (this.role === 'provider' && !this.category) {
        this.invalidate('category', 'Category is required for provider accounts');
    }

    if (this.isNew && !this.referralCode) {
        let code;
        let exists = true;

        while (exists) {
            const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
            code = `${String(this.name || 'HT').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'HT'}${suffix}`;
            exists = await mongoose.models.User.exists({ referralCode: code });
        }

        this.referralCode = code;
    }
});

// Pre-save hook: Hash password before saving
UserSchema.pre('save', async function () {
    if (AUTH_DEBUG) {
        console.log('[AUTH_DEBUG] User pre-save start', {
            userId: this._id,
            email: this.email || null,
            isModifiedPassword: this.isModified('password'),
            skipPasswordHash: !!this?.$locals?.skipPasswordHash,
            passwordPrefix: this.password ? this.password.slice(0, 7) : null,
            passwordLength: this.password ? this.password.length : 0,
        });
    }
    if (this?.$locals?.skipPasswordHash) {
        return;
    }
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (AUTH_DEBUG) {
        console.log('[AUTH_DEBUG] User password hashed', {
            userId: this._id,
            passwordPrefix: this.password ? this.password.slice(0, 7) : null,
            passwordLength: this.password ? this.password.length : 0,
        });
    }
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', UserSchema);
