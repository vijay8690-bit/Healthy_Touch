import ProviderPayout from '../models/ProviderPayout.js';
import Payment from '../models/Payment.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { createSystemNotification } from './NotificationController.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const repairZeroPayouts = async (filter = {}) => {
    const payouts = await ProviderPayout.find({
        ...filter,
        $or: [{ grossAmount: 0 }, { netAmount: 0 }],
    }).select('_id appointmentId').limit(50);

    if (!payouts.length) return;

    const appointmentIds = payouts.map((payout) => payout.appointmentId).filter(Boolean);
    const payments = await Payment.find({ appointmentId: { $in: appointmentIds } })
        .select('appointmentId baseAmount platformCommission gstAmount grossAmount totalAmount providerAmount travelFare');
    const paymentByAppointment = new Map(payments.map((payment) => [String(payment.appointmentId), payment]));

    await Promise.all(payouts.map(async (payout) => {
        const payment = paymentByAppointment.get(String(payout.appointmentId));
        if (!payment) return;

        const calculatedGross = Number(payment.baseAmount || 0)
            + Number(payment.platformCommission || 0)
            + Number(payment.gstAmount || 0)
            + Number(payment.travelFare || 0);
        const grossAmount = Number(payment.grossAmount || 0) || calculatedGross || Number(payment.totalAmount || 0);
        const netAmount = Number(payment.providerAmount ?? payment.baseAmount ?? 0) + Number(payment.travelFare || 0);

        if (grossAmount > 0 || netAmount > 0) {
            await ProviderPayout.findByIdAndUpdate(payout._id, {
                grossAmount,
                netAmount,
                gstAmount: payment.gstAmount || 0,
            });
        }
    }));
};

const repairPendingLabPayoutDeductions = async (filter = {}) => {
    const settings = await Settings.getSettings();
    const commissionRate = Number(settings?.commissionRate ?? 20);
    const gstPercentage = Number(settings?.gstPercentage ?? 18);

    const payouts = await ProviderPayout.find({
        ...filter,
        labBookingId: { $exists: true, $ne: null },
        status: 'PENDING',
        platformCommission: { $in: [null, 0] },
        gstAmount: { $in: [null, 0] },
        $expr: { $eq: ['$grossAmount', '$netAmount'] },
    }).select('_id grossAmount').limit(100);

    if (!payouts.length) return;

    await Promise.all(payouts.map(async (payout) => {
        const grossAmount = roundMoney(payout.grossAmount);
        if (grossAmount <= 0) return;

        const platformCommission = roundMoney(grossAmount * (commissionRate / 100));
        const gstAmount = roundMoney(platformCommission * (gstPercentage / 100));
        const netAmount = Math.max(0, roundMoney(grossAmount - platformCommission - gstAmount));

        await ProviderPayout.findByIdAndUpdate(payout._id, {
            platformCommission,
            gstPercentage,
            gstAmount,
            netAmount,
        });
    }));
};

// @desc    Get all provider payouts (Admin only)
// @route   GET /api/admin/payouts
// @access  Private/Admin
export const getAllProviderPayouts = async (req, res) => {
    try {
        const { status, providerId, weekNumber, year, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (providerId) filter.providerId = providerId;
        if (weekNumber) filter.weekNumber = parseInt(weekNumber);
        if (year) filter.year = parseInt(year);

        await repairZeroPayouts(filter);
        await repairPendingLabPayoutDeductions(filter);

        const payouts = await ProviderPayout.find(filter)
            .populate('providerId', 'name email mobile')
            .populate('patientId', 'name email')
            .populate('appointmentId', 'date timeSlot reason')
            .populate('releasedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await ProviderPayout.countDocuments(filter);

        res.status(200).json({
            success: true,
            payouts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get all payouts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching payouts',
            error: error.message,
        });
    }
};

// @desc    Get provider payout summary (Admin only)
// @route   GET /api/admin/payouts/summary/:providerId
// @access  Private/Admin
export const getProviderPayoutSummary = async (req, res) => {
    try {
        const { providerId } = req.params;

        const summary = await ProviderPayout.getProviderSummary(providerId);

        // Get provider details
        const provider = await User.findById(providerId).select('name email mobile');

        res.status(200).json({
            success: true,
            provider,
            summary,
        });
    } catch (error) {
        console.error('Get provider summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching provider summary',
            error: error.message,
        });
    }
};

// @desc    Get GST reports (Admin only)
// @route   GET /api/admin/payouts/gst-report
// @access  Private/Admin
export const getGSTReport = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'month' } = req.query;

        const matchStage = {};
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        let groupByFormat;
        if (groupBy === 'week') {
            groupByFormat = { week: '$weekNumber', year: '$year' };
        } else if (groupBy === 'month') {
            groupByFormat = { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
        } else {
            groupByFormat = { year: { $year: '$createdAt' } };
        }

        const gstReport = await ProviderPayout.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: groupByFormat,
                    totalGrossAmount: { $sum: '$grossAmount' },
                    totalGSTAmount: { $sum: '$gstAmount' },
                    totalNetAmount: { $sum: '$netAmount' },
                    pendingGST: {
                        $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$gstAmount', 0] }
                    },
                    paidGST: {
                        $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$gstAmount', 0] }
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
        ]);

        // Calculate totals
        const totals = {
            totalGross: 0,
            totalGST: 0,
            totalNet: 0,
            pendingGST: 0,
            paidGST: 0,
        };

        gstReport.forEach((item) => {
            totals.totalGross += item.totalGrossAmount;
            totals.totalGST += item.totalGSTAmount;
            totals.totalNet += item.totalNetAmount;
            totals.pendingGST += item.pendingGST;
            totals.paidGST += item.paidGST;
        });

        res.status(200).json({
            success: true,
            report: gstReport,
            totals,
            groupBy,
        });
    } catch (error) {
        console.error('Get GST report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching GST report',
            error: error.message,
        });
    }
};

// @desc    Release payment to provider (Admin only)
// @route   POST /api/admin/payouts/release
// @access  Private/Admin
export const releasePayment = async (req, res) => {
    try {
        const { payoutIds, paymentMode, transactionId, remarks } = req.body;

        if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide payoutIds array',
            });
        }

        if (!paymentMode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide payment mode',
            });
        }

        const settings = await Settings.getSettings();
        const minimumPayout = settings.minimumPayoutAmount || 1000;

        // Get payouts
        const payouts = await ProviderPayout.find({
            _id: { $in: payoutIds },
            status: 'PENDING',
        }).populate('providerId', 'name email mobile');

        if (payouts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No pending payouts found',
            });
        }

        // Group by provider for minimum check
        const providerPayouts = {};
        payouts.forEach((payout) => {
            const providerId = payout.providerId._id.toString();
            if (!providerPayouts[providerId]) {
                providerPayouts[providerId] = {
                    provider: payout.providerId,
                    payouts: [],
                    totalAmount: 0,
                };
            }
            providerPayouts[providerId].payouts.push(payout);
            providerPayouts[providerId].totalAmount += payout.netAmount;
        });

        // Check minimum payout amount per provider
        const belowMinimum = Object.values(providerPayouts).filter(
            (p) => p.totalAmount < minimumPayout
        );

        if (belowMinimum.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Minimum payout amount is ₹${minimumPayout}. Some providers have insufficient amount.`,
                providers: belowMinimum.map(p => ({
                    name: p.provider.name,
                    amount: p.totalAmount,
                })),
            });
        }

        // TODO: INTEGRATE PAYMENT GATEWAY FOR ACTUAL TRANSFER
        // Options:
        // 1. Razorpay Payouts API - razorpay.payouts.create({...})
        // 2. PayPal Payouts API - paypal.payout.create({...})
        // 3. Bank Transfer API (IMPS/NEFT/RTGS)
        // 
        // Example Razorpay Payout:
        // const Razorpay = require('razorpay');
        // const razorpay = new Razorpay({
        //     key_id: process.env.RAZORPAY_KEY_ID,
        //     key_secret: process.env.RAZORPAY_KEY_SECRET
        // });
        //
        // for (const [providerId, data] of Object.entries(providerPayouts)) {
        //     const provider = data.provider;
        //     const amount = data.totalAmount;
        //     
        //     // Get provider bank details from Provider model
        //     const providerDetails = await Provider.findOne({ userId: providerId });
        //     
        //     if (!providerDetails.bankAccount || !providerDetails.ifscCode) {
        //         throw new Error(`Bank details missing for ${provider.name}`);
        //     }
        //
        //     // Create payout via Razorpay
        //     const payout = await razorpay.payouts.create({
        //         account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        //         amount: amount * 100, // Convert to paise
        //         currency: 'INR',
        //         mode: 'IMPS', // or 'NEFT', 'RTGS'
        //         purpose: 'payout',
        //         fund_account: {
        //             account_type: 'bank_account',
        //             bank_account: {
        //                 name: provider.name,
        //                 ifsc: providerDetails.ifscCode,
        //                 account_number: providerDetails.bankAccount,
        //             },
        //             contact: {
        //                 name: provider.name,
        //                 email: provider.email,
        //                 contact: provider.mobile,
        //             }
        //         },
        //         queue_if_low_balance: true,
        //         reference_id: `payout_${Date.now()}`,
        //         narration: `Payout for appointments`,
        //     });
        //
        //     transactionId = payout.id; // Store Razorpay payout ID
        // }

        // Update all payouts to PAID status
        const updatePromises = payouts.map((payout) =>
            ProviderPayout.findByIdAndUpdate(
                payout._id,
                {
                    status: 'PAID',
                    paymentMode,
                    transactionId,
                    releasedBy: req.user.id,
                    releasedAt: new Date(),
                    remarks,
                },
                { new: true }
            )
        );

        const updatedPayouts = await Promise.all(updatePromises);

        // Send notifications and emails to each provider
        for (const [providerId, data] of Object.entries(providerPayouts)) {
            const provider = data.provider;
            const totalAmount = data.totalAmount;

            // Create notification
            try {
                await createSystemNotification({
                    title: '💰 Payment Released',
                    message: `Your payment of ₹${totalAmount.toFixed(2)} has been released via ${paymentMode}`,
                    type: 'payment_released',
                    recipient: 'provider',
                    recipientIds: [providerId],
                    relatedUser: req.user.id,
                    priority: 'high',
                });

                // Send email
                await sendTemplateEmail({
                    to: provider.email,
                    subject: 'Payment Released - Healthy Touch',
                    template: 'paymentReleased',
                    data: {
                        providerName: provider.name,
                        amount: totalAmount.toFixed(2),
                        paymentMode,
                        transactionId: transactionId || 'N/A',
                        date: new Date().toLocaleDateString('en-IN'),
                        payoutCount: data.payouts.length,
                    },
                });
            } catch (notificationError) {
                console.error('Notification/Email error:', notificationError);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment released successfully',
            updatedPayouts,
            summary: Object.values(providerPayouts).map(p => ({
                providerId: p.provider._id,
                providerName: p.provider.name,
                totalAmount: p.totalAmount,
                payoutCount: p.payouts.length,
            })),
        });
    } catch (error) {
        console.error('Release payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while releasing payment',
            error: error.message,
        });
    }
};

// @desc    Get weekly pending payouts (Admin only)
// @route   GET /api/admin/payouts/weekly-pending
// @access  Private/Admin
export const getWeeklyPendingPayouts = async (req, res) => {
    try {
        const { weekNumber, year } = ProviderPayout.getCurrentWeek();

        const payouts = await ProviderPayout.find({
            status: 'PENDING',
            weekNumber: weekNumber - 1, // Previous week
            year,
        })
            .populate('providerId', 'name email mobile')
            .populate('appointmentId', 'date timeSlot');

        // Group by provider
        const providerSummary = {};
        payouts.forEach((payout) => {
            const providerId = payout.providerId._id.toString();
            if (!providerSummary[providerId]) {
                providerSummary[providerId] = {
                    provider: payout.providerId,
                    payouts: [],
                    totalGross: 0,
                    totalGST: 0,
                    totalNet: 0,
                };
            }
            providerSummary[providerId].payouts.push(payout);
            providerSummary[providerId].totalGross += payout.grossAmount;
            providerSummary[providerId].totalGST += payout.gstAmount;
            providerSummary[providerId].totalNet += payout.netAmount;
        });

        res.status(200).json({
            success: true,
            week: weekNumber - 1,
            year,
            providers: Object.values(providerSummary),
        });
    } catch (error) {
        console.error('Get weekly pending payouts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching weekly payouts',
            error: error.message,
        });
    }
};

// ========== PROVIDER APIS ==========

// @desc    Get my earnings (Provider only)
// @route   GET /api/provider/earnings
// @access  Private/Provider
export const getMyEarnings = async (req, res) => {
    try {
        await repairZeroPayouts({ providerId: req.user.id });
        const summary = await ProviderPayout.getProviderSummary(req.user.id);

        // Get recent payouts
        const recentPayouts = await ProviderPayout.find({ providerId: req.user.id })
            .populate('patientId', 'name')
            .populate('appointmentId', 'date timeSlot')
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            summary,
            recentPayouts,
        });
    } catch (error) {
        console.error('Get my earnings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching earnings',
            error: error.message,
        });
    }
};

// @desc    Get my payment history (Provider only)
// @route   GET /api/provider/payment-history
// @access  Private/Provider
export const getMyPaymentHistory = async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

        const filter = { providerId: req.user.id };
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        await repairZeroPayouts(filter);

        const payouts = await ProviderPayout.find(filter)
            .populate('patientId', 'name email')
            .populate('appointmentId', 'date timeSlot reason')
            .populate('releasedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await ProviderPayout.countDocuments(filter);

        res.status(200).json({
            success: true,
            payouts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching payment history',
            error: error.message,
        });
    }
};

// @desc    Get provider payments (alias for payment history, Provider only)
// @route   GET /api/provider/payments
// @access  Private/Provider
export const getProviderPayments = async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

        const filter = { providerId: req.user.id };
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        await repairZeroPayouts(filter);

        const payments = await ProviderPayout.find(filter)
            .populate('patientId', 'name email')
            .populate('appointmentId', 'date timeSlot reason completedAt')
            .populate('releasedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await ProviderPayout.countDocuments(filter);

        res.status(200).json({
            success: true,
            payments,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get provider payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching payments',
            error: error.message,
        });
    }
};

// @desc    Mark single payout as paid (Admin only)
// @route   PATCH /api/admin/payouts/:payoutId/mark-paid
// @access  Private/Admin
export const markPayoutAsPaid = async (req, res) => {
    try {
        const { payoutId } = req.params;

        const payout = await ProviderPayout.findById(payoutId).populate('providerId', 'name email');

        if (!payout) {
            return res.status(404).json({
                success: false,
                message: 'Payout not found',
            });
        }

        if (payout.status === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Payout is already marked as paid',
            });
        }

        payout.status = 'PAID';
        payout.paidAt = new Date();
        payout.releasedBy = req.user.id;
        await payout.save();

        // Send notification to provider
        await createSystemNotification({
            title: 'Payment Released',
            message: `Your payout of ₹${payout.netAmount.toFixed(2)} has been released.`,
            type: 'payment_released',
            recipient: 'provider',
            recipientIds: [payout.providerId._id],
            relatedUser: req.user.id,
        });

        // Send email to provider
        if (payout.providerId.email) {
            await sendTemplateEmail({
                to: payout.providerId.email,
                subject: 'Payment Released - Healthy Touch',
                template: 'payoutReleased',
                context: {
                    providerName: payout.providerId.name,
                    amount: payout.netAmount.toFixed(2),
                    weekNumber: payout.weekNumber,
                    year: payout.year,
                },
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payout marked as paid successfully',
            payout,
        });
    } catch (error) {
        console.error('Mark payout as paid error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while marking payout as paid',
            error: error.message,
        });
    }
};

// @desc    Create Razorpay order for payout
// @route   POST /api/admin/payouts/create-razorpay-order
// @access  Private/Admin
export const createRazorpayPayoutOrder = async (req, res) => {
    try {
        const { payoutId, amount } = req.body;

        // Validate payout exists
        const payout = await ProviderPayout.findById(payoutId);
        if (!payout) {
            return res.status(404).json({
                success: false,
                message: 'Payout not found',
            });
        }

        if (payout.status === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Payout is already marked as paid',
            });
        }

        // Initialize Razorpay
        const razorpay = new Razorpay({
            key_id: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: `payout_${payoutId}`,
            notes: {
                payoutId: payoutId,
                providerId: payout.providerId.toString(),
                type: 'provider_payout',
            },
        });

        console.log('✅ Razorpay order created for payout:', order.id);

        res.status(200).json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            payoutId,
        });
    } catch (error) {
        console.error('Create Razorpay order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create Razorpay order',
            error: error.message,
        });
    }
};

// @desc    Verify Razorpay payment and mark payout as paid
// @route   POST /api/admin/payouts/verify-razorpay
// @access  Private/Admin
export const verifyRazorpayPayout = async (req, res) => {
    try {
        const { payoutId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature',
            });
        }

        // Find payout
        const payout = await ProviderPayout.findById(payoutId).populate('providerId', 'name email');

        if (!payout) {
            return res.status(404).json({
                success: false,
                message: 'Payout not found',
            });
        }

        // Get provider bank details
        const provider = await Provider.findOne({ userId: payout.providerId._id });

        // Update payout status
        payout.status = 'PAID';
        payout.paidAt = new Date();
        payout.releasedBy = req.user.id;
        payout.paymentMode = 'RAZORPAY_TEST';
        payout.transactionId = razorpay_payment_id;

        if (provider && provider.bankDetails) {
            payout.bankDetails = {
                accountHolderName: provider.bankDetails.accountHolderName,
                bankAccount: provider.bankDetails.bankAccount,
                ifscCode: provider.bankDetails.ifscCode,
            };
        }

        payout.remarks = `[RAZORPAY TEST] Payment processed via Razorpay gateway`;

        await payout.save();

        console.log(`✅ Payout marked as PAID via Razorpay: ${payoutId}`);

        // Send notification to provider
        try {
            await createSystemNotification({
                title: '💰 Payment Released',
                message: `Your payment of ₹${payout.netAmount.toFixed(2)} has been released via Razorpay test payment.`,
                type: 'payment_released',
                recipientIds: [payout.providerId._id],
                relatedPayment: payout._id,
                priority: 'high',
            });
            console.log(`✅ Notification sent to provider: ${payout.providerId._id}`);
        } catch (notifError) {
            console.error('❌ Notification error:', notifError);
        }

        // Send email to provider
        if (payout.providerId.email) {
            await sendTemplateEmail({
                to: payout.providerId.email,
                subject: 'Payment Released - Healthy Touch',
                template: 'paymentReleased',
                context: {
                    providerName: payout.providerId.name,
                    amount: payout.netAmount.toFixed(2),
                    paymentMode: 'Razorpay Test',
                    transactionId: razorpay_payment_id,
                    date: new Date().toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    payoutCount: 1,
                },
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified and payout marked as paid',
            payout: {
                _id: payout._id,
                status: payout.status,
                paidAt: payout.paidAt,
                transactionId: payout.transactionId,
            },
        });
    } catch (error) {
        console.error('Verify Razorpay payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message,
        });
    }
};


