import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Create a notification for specific user(s)
 * @param {Object} options - Notification options
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.type - Notification type
 * @param {String} options.recipient - Recipient role (admin/provider/patient/all)
 * @param {Array} options.recipientIds - Specific user IDs
 * @param {String} options.relatedUser - Related user ID
 * @param {String} options.relatedProvider - Related provider ID
 * @param {String} options.relatedAppointment - Related appointment ID
 * @param {String} options.relatedPayment - Related payment ID
 * @param {String} options.priority - Priority level (low/medium/high)
 */
export const createNotificationService = async (options) => {
    try {
        const {
            title,
            message,
            type,
            recipient = 'patient',
            recipientIds = [],
            relatedUser,
            relatedProvider,
            relatedAppointment,
            relatedPayment,
            priority = 'medium'
        } = options;

        // Build recipient IDs based on recipient type
        let finalRecipientIds = [...recipientIds];

        // Only auto-populate if recipientIds is empty
        if (finalRecipientIds.length === 0) {
            if (recipient === 'all') {
                const allUsers = await User.find({}, '_id');
                finalRecipientIds = allUsers.map(user => user._id);
            } else if (recipient === 'admin') {
                const admins = await User.find({ role: 'admin' }, '_id');
                finalRecipientIds = admins.map(user => user._id);
            } else if (recipient === 'provider') {
                const providers = await User.find({ role: 'provider' }, '_id');
                finalRecipientIds = providers.map(user => user._id);
            } else if (recipient === 'patient') {
                const patients = await User.find({ role: 'patient' }, '_id');
                finalRecipientIds = patients.map(user => user._id);
            }
        }

        console.log('Creating notification for recipients:', finalRecipientIds);

        const notification = await Notification.create({
            title,
            message,
            type,
            recipient,
            recipientIds: finalRecipientIds,
            relatedUser,
            relatedProvider,
            relatedAppointment,
            relatedPayment,
            priority,
            status: 'sent'
        });

        return {
            success: true,
            notification
        };
    } catch (error) {
        console.error('Notification Service Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send appointment notification to patient
 */
export const notifyPatientAppointment = async (appointment, status, patientId) => {
    const titleMap = {
        confirmed: '✅ Appointment Confirmed',
        cancelled: '❌ Appointment Cancelled',
        completed: '✔️ Appointment Completed'
    };

    const messageMap = {
        confirmed: `Your appointment has been confirmed for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.timeSlot}`,
        cancelled: `Your appointment scheduled for ${new Date(appointment.date).toLocaleDateString()} has been cancelled`,
        completed: `Your appointment on ${new Date(appointment.date).toLocaleDateString()} has been completed`
    };

    return await createNotificationService({
        title: titleMap[status] || '📅 Appointment Update',
        message: messageMap[status] || 'Your appointment status has been updated',
        type: `appointment_${status}`,
        recipient: 'patient',
        recipientIds: [patientId],
        relatedAppointment: appointment._id,
        priority: status === 'cancelled' ? 'high' : 'medium'
    });
};

/**
 * Send appointment notification to provider
 */
export const notifyProviderAppointment = async (appointment, patientName, providerId) => {
    try {
        console.log('Creating provider notification for userId:', providerId);
        
        // Ensure providerId is a valid ObjectId
        const userIdToNotify = providerId?._id || providerId;
        
        return await createNotificationService({
            title: '🆕 New Appointment Booked',
            message: `${patientName} has booked an appointment for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.timeSlot}`,
            type: 'appointment_created',
            recipient: 'provider',
            recipientIds: [userIdToNotify],
            relatedAppointment: appointment._id,
            priority: 'high'
        });
    } catch (error) {
        console.error('Provider notification error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send payment notification to patient
 */
export const notifyPatientPayment = async (payment, patientId) => {
    return await createNotificationService({
        title: '💳 Payment Successful',
        message: `Your payment of ₹${payment.totalAmount} has been processed successfully`,
        type: 'payment_successful',
        recipient: 'patient',
        recipientIds: [patientId],
        relatedPayment: payment._id,
        priority: 'medium'
    });
};

/**
 * Send medical record notification to patient
 */
export const notifyPatientMedicalRecord = async (record, patientId, isUpdate = false) => {
    return await createNotificationService({
        title: isUpdate ? '📋 Medical Record Updated' : '📋 Medical Report Created',
        message: isUpdate 
            ? 'Your medical record has been updated by your healthcare provider'
            : 'A new medical report has been added to your records',
        type: isUpdate ? 'medical_record_updated' : 'medical_report_created',
        recipient: 'patient',
        recipientIds: [patientId],
        priority: 'medium'
    });
};

/**
 * Send provider notes notification to patient
 */
export const notifyPatientProviderNotes = async (patientId, providerName, isUpdate = false) => {
    return await createNotificationService({
        title: isUpdate ? '📝 Provider Notes Updated' : '📝 Provider Notes Added',
        message: isUpdate
            ? `${providerName} has updated your clinical notes`
            : `${providerName} has added new clinical notes to your record`,
        type: isUpdate ? 'provider_notes_updated' : 'provider_notes_added',
        recipient: 'patient',
        recipientIds: [patientId],
        priority: 'medium'
    });
};

/**
 * Send review notification to patient
 */
export const notifyPatientReview = async (patientId, status) => {
    const approved = status === 'approved';
    return await createNotificationService({
        title: approved ? '⭐ Review Approved' : '❌ Review Rejected',
        message: approved 
            ? 'Your review has been approved and is now visible to others'
            : 'Your review did not meet our community guidelines',
        type: approved ? 'review_approved' : 'review_rejected',
        recipient: 'patient',
        recipientIds: [patientId],
        priority: 'low'
    });
};

/**
 * Send admin notification for user registration
 */
export const notifyAdminUserRegistration = async (user) => {
    return await createNotificationService({
        title: '👤 New User Registered',
        message: `${user.name} (${user.role}) has registered on the platform`,
        type: 'user_registered',
        recipient: 'admin',
        relatedUser: user._id,
        priority: 'medium'
    });
};

/**
 * Send admin notification for new appointment
 */
export const notifyAdminNewAppointment = async (appointment, patientName, providerName) => {
    return await createNotificationService({
        title: '🆕 New Appointment Booked',
        message: `${patientName} booked appointment with ${providerName} for ${new Date(appointment.date).toLocaleDateString()}`,
        type: 'appointment_created',
        recipient: 'admin',
        relatedAppointment: appointment._id,
        priority: 'medium'
    });
};

export default {
    createNotificationService,
    notifyPatientAppointment,
    notifyProviderAppointment,
    notifyPatientPayment,
    notifyPatientMedicalRecord,
    notifyPatientProviderNotes,
    notifyPatientReview,
    notifyAdminUserRegistration,
    notifyAdminNewAppointment
};
