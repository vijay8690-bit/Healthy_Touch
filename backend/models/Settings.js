import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    // General Settings
    siteName: {
        type: String,
        default: 'Healthy Touch',
    },
    siteUrl: {
        type: String,
        default: 'https://healthytouch.com',
    },
    supportEmail: {
        type: String,
        default: 'support@healthytouch.com',
    },
    contactPhone: {
        type: String,
        default: '+91 98765 43210',
    },
    siteDescription: {
        type: String,
        default: 'Healthcare services platform',
    },
    siteKeywords: {
        type: String,
        default: 'healthcare, medical, appointments',
    },

    // Email Settings
    smtpHost: {
        type: String,
        default: 'smtp.gmail.com',
    },
    smtpPort: {
        type: String,
        default: '587',
    },
    smtpUser: {
        type: String,
        default: '',
    },
    smtpPassword: {
        type: String,
        default: '',
    },
    emailFromName: {
        type: String,
        default: 'Healthy Touch',
    },
    emailFromAddress: {
        type: String,
        default: 'noreply@healthytouch.com',
    },

    // Payment Settings
    razorpayKey: {
        type: String,
        default: '',
    },
    razorpaySecret: {
        type: String,
        default: '',
    },
    commissionRate: {
        type: Number,
        default: 10,
    },
    paymentGateway: {
        type: String,
        default: 'razorpay',
        enum: ['razorpay', 'stripe', 'paytm'],
    },
    currency: {
        type: String,
        default: 'INR',
    },
    coinValueInRupees: {
        type: Number,
        default: 1,
        min: 0,
    },

    // Provider Payout Settings
    gstPercentage: {
        type: Number,
        default: 18, // GST percentage for provider earnings
        min: 0,
        max: 100,
    },
    minimumPayoutAmount: {
        type: Number,
        default: 1000, // Minimum amount for payout release
    },
    payoutFrequency: {
        type: String,
        default: 'weekly',
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
    },

    // Appointment Settings
    minBookingTime: {
        type: Number,
        default: 30, // minutes
    },
    maxBookingDays: {
        type: Number,
        default: 60, // days
    },
    cancellationHours: {
        type: Number,
        default: 24, // hours
    },
    slotDuration: {
        type: Number,
        default: 30, // minutes
    },
    autoApproveAppointments: {
        type: Boolean,
        default: false,
    },

    // Security Settings
    passwordMinLength: {
        type: Number,
        default: 8,
    },
    requireEmailVerification: {
        type: Boolean,
        default: true,
    },
    sessionTimeout: {
        type: Number,
        default: 30, // minutes
    },
    enableTwoFactor: {
        type: Boolean,
        default: false,
    },
    maxLoginAttempts: {
        type: Number,
        default: 5,
    },
    lockoutDuration: {
        type: Number,
        default: 30, // minutes
    },

    // Legal Settings
    termsAndConditions: {
        type: String,
        default: '',
    },
    privacyPolicy: {
        type: String,
        default: '',
    },
    refundPolicy: {
        type: String,
        default: '',
    },
    disclaimerText: {
        type: String,
        default: '',
    },

    // Notification Settings
    enableEmailNotifications: {
        type: Boolean,
        default: true,
    },
    enableSMSNotifications: {
        type: Boolean,
        default: false,
    },
    enablePushNotifications: {
        type: Boolean,
        default: true,
    },

    // Maintenance
    maintenanceMode: {
        type: Boolean,
        default: false,
    },
    maintenanceMessage: {
        type: String,
        default: 'We are currently under maintenance. Please check back soon.',
    },

    // SEO Settings
    metaTitle: {
        type: String,
        default: 'Healthy Touch - Healthcare Services Platform',
    },
    metaDescription: {
        type: String,
        default: 'Book healthcare services with qualified professionals',
    },
    metaKeywords: {
        type: String,
        default: 'healthcare, medical, appointments, doctors, nurses',
    },

    // Social Media
    facebookUrl: {
        type: String,
        default: '',
    },
    twitterUrl: {
        type: String,
        default: '',
    },
    instagramUrl: {
        type: String,
        default: '',
    },
    linkedinUrl: {
        type: String,
        default: '',
    },

    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

// Singleton pattern - only one settings document should exist
settingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
