import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import ProviderPayout from '../models/ProviderPayout.js';
import { createSystemNotification } from './NotificationController.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';

// @desc    Process refund for cancelled appointment
// @route   POST /api/admin/refunds/process
// @access  Private/Admin
export const processRefund = async (req, res) => {
    try {
        const { appointmentId, processingTime = '24-48 hours' } = req.body;

        // Find appointment
        const appointment = await Appointment.findById(appointmentId)
            .populate('patientId', 'name email mobile')
            .populate('providerId');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        if (appointment.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Only cancelled appointments can be refunded',
            });
        }

        if (appointment.refundProcessed) {
            return res.status(400).json({
                success: false,
                message: 'Refund already processed for this appointment',
            });
        }

        // Find payment
        const payment = await Payment.findOne({ appointmentId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this appointment',
            });
        }

        if (payment.status === 'refunded' || payment.refund.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Payment already refunded',
            });
        }

        // Calculate refund amount (full amount)
        const refundAmount = payment.totalAmount;

        // Update payment with refund info
        payment.refund = {
            status: 'processing',
            amount: refundAmount,
            refundedBy: req.user.id,
            refundedAt: new Date(),
            refundTransactionId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            reason: appointment.cancellationReason || 'Appointment cancelled',
            processingTime,
        };
        payment.status = 'refund_pending';

        await payment.save();

        // Mark appointment as refund processed
        appointment.refundProcessed = true;
        await appointment.save();

        // Remove or adjust provider payout if exists
        const payout = await ProviderPayout.findOne({
            appointmentId: appointment._id,
            status: 'PENDING',
        });

        if (payout) {
            // Delete pending payout
            await ProviderPayout.findByIdAndDelete(payout._id);
            console.log(`✅ Deleted pending payout for refunded appointment: ${payout._id}`);
        }

        // Send notification to patient
        await createSystemNotification({
            title: '💰 Refund Initiated',
            message: `Your refund of ₹${refundAmount.toFixed(2)} has been initiated. It will be processed within ${processingTime}.`,
            type: 'refund_initiated',
            recipient: 'patient',
            recipientIds: [appointment.patientId._id],
            relatedAppointment: appointment._id,
            priority: 'high',
        });

        // Send email to patient
        await sendTemplateEmail({
            to: appointment.patientId.email,
            subject: 'Refund Initiated - Healthy Touch',
            template: 'refundInitiated',
            context: {
                patientName: appointment.patientId.name,
                appointmentDate: new Date(appointment.date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
                appointmentTime: appointment.timeSlot,
                providerName: appointment.providerId.userId?.name || 'Provider',
                refundAmount: refundAmount.toFixed(2),
                processingTime,
                transactionId: payment.refund.refundTransactionId,
                appointmentId: appointment._id.toString(),
            },
        });

        console.log(`✅ Refund initiated for appointment ${appointmentId}: ₹${refundAmount}`);

        res.status(200).json({
            success: true,
            message: `Refund of ₹${refundAmount.toFixed(2)} initiated successfully`,
            refund: {
                amount: refundAmount,
                transactionId: payment.refund.refundTransactionId,
                processingTime,
                status: 'processing',
            },
        });
    } catch (error) {
        console.error('Process refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message,
        });
    }
};

// @desc    Complete refund (mark as completed after bank transfer)
// @route   POST /api/admin/refunds/complete
// @access  Private/Admin
export const completeRefund = async (req, res) => {
    try {
        const { paymentId } = req.body;

        const payment = await Payment.findById(paymentId)
            .populate('patientId', 'name email')
            .populate('appointmentId');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
        }

        if (payment.refund.status !== 'processing') {
            return res.status(400).json({
                success: false,
                message: 'Refund is not in processing state',
            });
        }

        // Mark refund as completed
        payment.refund.status = 'completed';
        payment.status = 'refunded';
        await payment.save();

        // Send notification to patient
        await createSystemNotification({
            title: '✅ Refund Completed',
            message: `Your refund of ₹${payment.refund.amount.toFixed(2)} has been completed and credited to your account.`,
            type: 'refund_completed',
            recipient: 'patient',
            recipientIds: [payment.patientId._id],
            relatedAppointment: payment.appointmentId?._id,
            priority: 'high',
        });

        // Send email
        await sendTemplateEmail({
            to: payment.patientId.email,
            subject: 'Refund Completed - Healthy Touch',
            template: 'refundCompleted',
            context: {
                patientName: payment.patientId.name,
                refundAmount: payment.refund.amount.toFixed(2),
                transactionId: payment.refund.refundTransactionId,
                appointmentId: payment.appointmentId?._id?.toString(),
            },
        });

        console.log(`✅ Refund completed for payment ${paymentId}`);

        res.status(200).json({
            success: true,
            message: 'Refund completed successfully',
        });
    } catch (error) {
        console.error('Complete refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete refund',
            error: error.message,
        });
    }
};

// @desc    Get all refunds (Admin)
// @route   GET /api/admin/refunds
// @access  Private/Admin
export const getAllRefunds = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const filter = { 'refund.status': { $ne: 'none' } };
        if (status) filter['refund.status'] = status;

        const refunds = await Payment.find(filter)
            .populate('patientId', 'name email mobile')
            .populate('appointmentId')
            .populate('refund.refundedBy', 'name email')
            .sort({ 'refund.refundedAt': -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Payment.countDocuments(filter);

        res.status(200).json({
            success: true,
            refunds,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get refunds error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch refunds',
            error: error.message,
        });
    }
};
