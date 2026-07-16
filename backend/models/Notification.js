import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            // User & Registration
            'user_registered',
            'provider_approved',
            'provider_rejected',
            // Appointments
            'appointment_created',
            'appointment_confirmed',
            'appointment_cancelled',
            'appointment_completed',
            // Payments
            'payment_completed',
            'payment_failed',
            'payment_successful',
            'payment_released',
            // Lab bookings
            'lab_booking_pending',
            'lab_booking_assigned',
            'lab_booking_status',
            // Medical Records
            'medical_report_created',
            'medical_record_updated',
            // Provider Notes
            'provider_notes_added',
            'provider_notes_updated',
            // Reviews
            'review_submitted',
            'review_approved',
            'review_rejected',
            // Status Changes
            'user_status_changed',
            'provider_status_changed',
            // System
            'general',
            'system_maintenance',
            'system'
        ],
        required: true
    },
    recipient: {
        type: String,
        enum: ['admin', 'provider', 'patient', 'all'],
        required: true
    },
    recipientIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    relatedProvider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider'
    },
    relatedAppointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    relatedPayment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['sent', 'scheduled', 'failed'],
        default: 'sent'
    },
    scheduledFor: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for faster queries
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ priority: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
