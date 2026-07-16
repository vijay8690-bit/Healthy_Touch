import Payment from '../models/Payment.js';

// Middleware to verify payment before booking appointment
export const verifyPaymentBeforeBooking = async (req, res, next) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment required to book appointment. Please complete payment first.',
            });
        }

        // Find payment
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found. Please complete payment first.',
            });
        }

        // Check if payment is completed
        if (payment.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: `Payment is ${payment.status}. Booking requires completed payment.`,
            });
        }

        // Check if payment belongs to the requesting user
        if (payment.patientId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Payment verification failed. Unauthorized access.',
            });
        }

        // Check if payment is already used for another appointment
        if (payment.appointmentId) {
            return res.status(400).json({
                success: false,
                message: 'This payment has already been used for another appointment.',
            });
        }

        // Verify transaction ID exists
        if (!payment.transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment. Transaction ID missing.',
            });
        }

        // Attach payment to request for use in booking controller
        req.payment = payment;
        next();
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message,
        });
    }
};
