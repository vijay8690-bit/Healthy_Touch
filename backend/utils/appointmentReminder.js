import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import { sendTemplateEmail } from './sendEmail.js';

// Function to send appointment reminder emails
export const sendAppointmentReminders = async () => {
    try {
        const now = new Date();
        const fifteenMinutesLater = new Date(now.getTime() + 15 * 60000); // 15 minutes from now
        const sixteenMinutesLater = new Date(now.getTime() + 16 * 60000); // 16 minutes from now

        console.log('[Reminder] Checking for appointments between:', fifteenMinutesLater, 'and', sixteenMinutesLater);

        // Find appointments that are 15 minutes away (within 1 minute window)
        const upcomingAppointments = await Appointment.find({
            status: { $in: ['pending', 'confirmed'] },
            date: {
                $gte: fifteenMinutesLater,
                $lte: sixteenMinutesLater
            },
            reminderSent: { $ne: true } // Only send if reminder not already sent
        })
        .populate('patientId', 'name email mobile')
        .populate({
            path: 'providerId',
            populate: { path: 'userId', select: 'name email mobile' }
        });

        console.log(`[Reminder] Found ${upcomingAppointments.length} appointments to remind`);

        for (const appointment of upcomingAppointments) {
            try {
                const patient = appointment.patientId;
                const provider = appointment.providerId;

                if (!patient || !patient.email) {
                    console.log(`[Reminder] Skipping appointment ${appointment._id} - no patient email`);
                    continue;
                }

                // Parse timeSlot (e.g., "10:00 AM")
                const timeSlot = appointment.timeSlot || 'scheduled time';
                
                // Send reminder email to patient
                await sendTemplateEmail({
                    to: patient.email,
                    subject: '⏰ Appointment Reminder - 15 Minutes',
                    template: 'appointmentReminder',
                    data: {
                        patientName: patient.name,
                        providerName: provider?.userId?.name || 'Healthcare Provider',
                        specialization: provider?.specialization || provider?.category || 'Healthcare',
                        date: appointment.date,
                        timeSlot: timeSlot,
                        location: provider?.address ? 
                            `${provider.address.street}, ${provider.address.city}` : 'Provider location',
                        reason: appointment.reason || 'Consultation',
                        contactNumber: provider?.userId?.mobile || 'N/A'
                    }
                });

                // Mark reminder as sent
                appointment.reminderSent = true;
                await appointment.save();

                console.log(`[Reminder] ✅ Sent reminder for appointment ${appointment._id} to ${patient.email}`);
            } catch (emailError) {
                console.error(`[Reminder] Failed to send reminder for appointment ${appointment._id}:`, emailError);
            }
        }

        return {
            success: true,
            remindersSent: upcomingAppointments.length
        };
    } catch (error) {
        console.error('[Reminder] Error in sendAppointmentReminders:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Scheduler - runs every minute
export const startReminderScheduler = () => {
    console.log('[Reminder] Starting appointment reminder scheduler...');
    
    // Run immediately on start
    sendAppointmentReminders();
    
    // Then run every minute
    setInterval(() => {
        sendAppointmentReminders();
    }, 60000); // 60 seconds = 1 minute
    
    console.log('[Reminder] Scheduler started - will check every minute');
};
