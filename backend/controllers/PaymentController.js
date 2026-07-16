import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { calculateDistance, calculateTravelFare } from '../utils/distanceCalculator.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createSystemNotification } from './NotificationController.js';
import { notifyPatientPayment } from '../utils/notificationService.js';
import { redeemCoins } from '../utils/rewards.js';
import { applyCouponUsageOnce, validateCouponForUser } from '../utils/coupons.js';
import PhysiotherapyService from '../models/PhysiotherapyService.js';
import PhysiotherapyAddon from '../models/PhysiotherapyAddon.js';
import NurseService from '../models/NurseService.js';
import NurseAddon from '../models/NurseAddon.js';
import CaretakerService from '../models/CaretakerService.js';
import CaretakerAddon from '../models/CaretakerAddon.js';

const populatePatientPaymentQuery = (query) => query
    .populate({
        path: 'providerId',
        populate: { path: 'userId', select: 'name email mobile' }
    })
    .populate('patientId', 'name email mobile')
    .populate('appointmentId');

const resolveProviderFee = (provider) => {
    const fee = Number(provider?.fees ?? provider?.consultationFee ?? provider?.fee);
    return Number.isFinite(fee) && fee > 0 ? fee : 500;
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const resolveCustomServicePrice = (pricing, serviceId) => {
    const item = (pricing || []).find((entry) => String(entry.serviceId) === String(serviceId));
    const customPrice = Number(item?.customPrice);
    return Number.isFinite(customPrice) && customPrice >= 0 ? customPrice : null;
};

const resolveCustomAddonPrice = (pricing, addonId) => {
    const item = (pricing || []).find((entry) => String(entry.addonId) === String(addonId));
    const customPrice = Number(item?.customPrice);
    return Number.isFinite(customPrice) && customPrice >= 0 ? customPrice : null;
};

const resolvePackageAmount = (basePrice, count, option, hasProviderPrice) => {
    const regularPrice = Number(basePrice) * Number(count || 1);
    if (!hasProviderPrice && Number.isFinite(Number(option?.customPrice))) {
        return {
            serviceAmount: Number(option.customPrice),
            packageDiscount: roundMoney(regularPrice - Number(option.customPrice)),
        };
    }
    const packageDiscount = roundMoney(regularPrice * (Number(option?.discountPercentage) || 0) / 100);
    return {
        serviceAmount: roundMoney(regularPrice - packageDiscount),
        packageDiscount,
    };
};

const calculatePhysiotherapySelection = async (provider, body) => {
    const selection = body.physiotherapySelection || body;
    if (provider.category !== 'Physiotherapist' || !selection.physiotherapyServiceId) return null;

    const offeredServiceIds = new Set((provider.physiotherapyServiceIds || []).map((id) => String(id)));
    if (!offeredServiceIds.has(String(selection.physiotherapyServiceId))) {
        const error = new Error('Selected physiotherapy service is not offered by this provider');
        error.statusCode = 400;
        throw error;
    }

    const service = await PhysiotherapyService.findOne({ _id: selection.physiotherapyServiceId, isActive: true });
    if (!service) {
        const error = new Error('Selected physiotherapy service is no longer available');
        error.statusCode = 400;
        throw error;
    }

    const bookingType = selection.bookingType === 'package' ? 'package' : 'single';
    const customPrice = resolveCustomServicePrice(provider.physiotherapyServicePricing, service._id);
    const basePrice = customPrice ?? Number(service.price);
    const hasProviderPrice = customPrice !== null;
    let sessionCount = 1;
    let packageDiscount = 0;
    let serviceAmount = basePrice;

    if (bookingType === 'package') {
        sessionCount = Number(selection.packageSessionCount);
        const option = service.packages.find((item) => item.isActive !== false && item.sessions === sessionCount);
        if (!option) {
            const error = new Error('Selected physiotherapy package is no longer available');
            error.statusCode = 400;
            throw error;
        }
        ({ serviceAmount, packageDiscount } = resolvePackageAmount(basePrice, sessionCount, option, hasProviderPrice));
    }

    const addonIds = Array.isArray(selection.selectedAddonIds) ? selection.selectedAddonIds : [];
    const offeredAddonIds = new Set((provider.physiotherapyAddonIds || []).map((id) => String(id)));
    if (addonIds.some((id) => !offeredAddonIds.has(String(id)))) {
        const error = new Error('Selected physiotherapy add-on is not offered by this provider');
        error.statusCode = 400;
        throw error;
    }
    const addons = addonIds.length
        ? await PhysiotherapyAddon.find({ _id: { $in: addonIds }, isActive: true })
        : [];
    const multiplier = bookingType === 'package' ? sessionCount : 1;
    const selectedAddOns = addons.map((addon) => {
        const price = resolveCustomAddonPrice(provider.physiotherapyAddonPricing, addon._id) ?? Number(addon.price || 0);
        return { addonId: addon._id, name: addon.name, price };
    });
    const addonAmount = roundMoney(selectedAddOns.reduce((sum, addon) => sum + Number(addon.price || 0), 0) * multiplier);

    return {
        physiotherapyBookingType: bookingType,
        physiotherapyServiceId: service._id,
        physiotherapyServiceName: service.name,
        selectedAddOns,
        packageSessionCount: sessionCount,
        packageDiscount,
        serviceAmount,
        addonAmount,
        finalAmount: roundMoney(serviceAmount + addonAmount),
    };
};

const calculateNurseSelection = async (provider, body) => {
    const selection = body.nurseSelection || body;
    if (provider.category !== 'Nurse' || !selection.nurseServiceId) return null;

    const offeredServiceIds = new Set((provider.nurseServiceIds || []).map((id) => String(id)));
    if (!offeredServiceIds.has(String(selection.nurseServiceId))) {
        const error = new Error('Selected nurse service is not offered by this provider');
        error.statusCode = 400;
        throw error;
    }

    const service = await NurseService.findOne({ _id: selection.nurseServiceId, isActive: true });
    if (!service) {
        const error = new Error('Selected nurse service is no longer available');
        error.statusCode = 400;
        throw error;
    }

    const bookingType = selection.bookingType === 'package' ? 'package' : 'single';
    const customPrice = resolveCustomServicePrice(provider.nurseServicePricing, service._id);
    const basePrice = customPrice ?? Number(service.price);
    const hasProviderPrice = customPrice !== null;
    let visitCount = 1;
    let packageDiscount = 0;
    let serviceAmount = basePrice;

    if (bookingType === 'package') {
        visitCount = Number(selection.packageVisitCount);
        const option = service.packages.find((item) => item.isActive !== false && item.visitsCount === visitCount);
        if (!option) {
            const error = new Error('Selected nurse package is no longer available');
            error.statusCode = 400;
            throw error;
        }
        ({ serviceAmount, packageDiscount } = resolvePackageAmount(basePrice, visitCount, option, hasProviderPrice));
    }

    const addonIds = Array.isArray(selection.selectedAddonIds) ? selection.selectedAddonIds : [];
    const offeredAddonIds = new Set((provider.nurseAddonIds || []).map((id) => String(id)));
    if (addonIds.some((id) => !offeredAddonIds.has(String(id)))) {
        const error = new Error('Selected nurse add-on is not offered by this provider');
        error.statusCode = 400;
        throw error;
    }
    const addons = addonIds.length
        ? await NurseAddon.find({ _id: { $in: addonIds }, isActive: true })
        : [];
    const multiplier = bookingType === 'package' ? visitCount : 1;
    const selectedAddOns = addons.map((addon) => {
        const price = resolveCustomAddonPrice(provider.nurseAddonPricing, addon._id) ?? Number(addon.price || 0);
        return { addonId: addon._id, name: addon.addOnName, price };
    });
    const addonAmount = roundMoney(selectedAddOns.reduce((sum, addon) => sum + Number(addon.price || 0), 0) * multiplier);

    return {
        nurseBookingType: bookingType,
        nurseServiceId: service._id,
        nurseServiceName: service.serviceName,
        selectedAddOns,
        packageVisitCount: visitCount,
        packageDiscount,
        serviceAmount,
        addonAmount,
        finalAmount: roundMoney(serviceAmount + addonAmount),
    };
};

const calculateCaretakerSelection = async (provider, body) => {
    const selection = body.caretakerSelection || body;
    if (!['Caretaker', 'Care Taker'].includes(provider.category) || !selection.caretakerServiceId) return null;
    const offeredServiceIds = new Set((provider.caretakerServiceIds || []).map((id) => String(id)));
    if (!offeredServiceIds.has(String(selection.caretakerServiceId))) {
        const error = new Error('Selected caretaker service is not offered by this provider');
        error.statusCode = 400; throw error;
    }
    const service = await CaretakerService.findOne({ _id: selection.caretakerServiceId, isActive: true });
    if (!service) {
        const error = new Error('Selected caretaker service is no longer available');
        error.statusCode = 400; throw error;
    }
    const bookingType = selection.bookingType === 'package' ? 'package' : 'single';
    const customPricing = (provider.caretakerServicePricing || []).find((item) => String(item.serviceId) === String(service._id));
    const customServiceAmount = Number(customPricing?.customPrice);
    const hasCustomServicePrice = Number.isFinite(customServiceAmount) && customServiceAmount >= 0;
    let serviceAmount = hasCustomServicePrice ? customServiceAmount : Number(service.basePrice);
    let shiftType = service.shiftType;
    let durationHours = service.durationHours;
    if (bookingType === 'package') {
        const option = service.packages.find((item) => item.isActive !== false && item.packageType === selection.packageType);
        if (!option) {
            const error = new Error('Selected caretaker package is no longer available');
            error.statusCode = 400; throw error;
        }
        serviceAmount = hasCustomServicePrice ? customServiceAmount : Number(option.price);
        shiftType = option.packageType;
        durationHours = option.durationHours;
    }
    const addonIds = Array.isArray(selection.selectedAddonIds) ? selection.selectedAddonIds : [];
    const offeredAddonIds = new Set((provider.caretakerAddonIds || []).map((id) => String(id)));
    if (addonIds.some((id) => !offeredAddonIds.has(String(id)))) {
        const error = new Error('Selected caretaker add-on is not offered by this provider');
        error.statusCode = 400; throw error;
    }
    const addons = addonIds.length ? await CaretakerAddon.find({ _id: { $in: addonIds }, isActive: true }) : [];
    const selectedAddOns = addons.map((addon) => {
        const price = resolveCustomAddonPrice(provider.caretakerAddonPricing, addon._id) ?? Number(addon.price || 0);
        return { addonId: addon._id, name: addon.addOnName, price };
    });
    const addonAmount = roundMoney(selectedAddOns.reduce((sum, addon) => sum + Number(addon.price || 0), 0));
    return {
        caretakerBookingType: bookingType,
        caretakerServiceId: service._id,
        caretakerServiceName: service.serviceName,
        caretakerShiftType: shiftType,
        caretakerDurationHours: durationHours,
        selectedAddOns,
        serviceAmount: roundMoney(serviceAmount),
        addonAmount,
        finalAmount: roundMoney(serviceAmount + addonAmount),
    };
};

const parseAppointmentDateTime = (date, timeSlot) => {
    const appointmentDate = new Date(date);
    if (Number.isNaN(appointmentDate.getTime()) || !timeSlot || typeof timeSlot !== 'string') {
        return null;
    }

    const [time, period] = timeSlot.trim().split(/\s+/);
    const [rawHours, rawMinutes = '0'] = (time || '').split(':');
    let hours = Number(rawHours);
    const minutes = Number(rawMinutes);
    const normalizedPeriod = period?.toUpperCase();

    if (
        Number.isNaN(hours)
        || Number.isNaN(minutes)
        || !['AM', 'PM'].includes(normalizedPeriod)
    ) {
        return null;
    }

    if (normalizedPeriod === 'PM' && hours !== 12) hours += 12;
    if (normalizedPeriod === 'AM' && hours === 12) hours = 0;

    appointmentDate.setHours(hours, minutes, 0, 0);
    return appointmentDate;
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature, secret }) => {
    if (!orderId || !paymentId || !signature || !secret) return false;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    try {
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        const receivedBuffer = Buffer.from(signature, 'hex');
        return expectedBuffer.length === receivedBuffer.length
            && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
        return false;
    }
};

// @desc    Create payment order (BEFORE appointment booking)
// @route   POST /api/payments/create-order
// @access  Private (Patient only)
export const createPaymentOrder = async (req, res) => {
    const { providerId, date, timeSlot, reason, paymentMethod, useCoins, couponCode } = req.body;

    try {
        // Get settings (from middleware or fetch fresh)
        const settings = req.settings || await Settings.getSettings();
        
        // Validation
        if (!providerId || !date || !timeSlot || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Please provide providerId, date, timeSlot, and reason',
            });
        }

        const appointmentDate = parseAppointmentDateTime(date, timeSlot);
        if (!appointmentDate) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid date and time slot',
            });
        }

        const now = new Date();
        const minutesUntilAppointment = (appointmentDate - now) / (1000 * 60);
        if (minutesUntilAppointment < settings.minBookingTime) {
            return res.status(400).json({
                success: false,
                message: `Appointments must be booked at least ${settings.minBookingTime} minutes in advance`,
            });
        }

        const daysUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60 * 24);
        if (daysUntilAppointment > settings.maxBookingDays) {
            return res.status(400).json({
                success: false,
                message: `Appointments can only be booked up to ${settings.maxBookingDays} days in advance`,
            });
        }

        // Check if user is patient
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can create payment orders',
            });
        }

        // Get provider details
        const provider = await Provider.findById(providerId).populate('userId');
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        if (provider.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Provider is not approved for appointments',
            });
        }

        const physiotherapyDetails = await calculatePhysiotherapySelection(provider, req.body);
        if (provider.category === 'Physiotherapist' && !physiotherapyDetails) {
            return res.status(400).json({
                success: false,
                message: 'Please select a physiotherapy service before payment',
            });
        }
        const nurseDetails = await calculateNurseSelection(provider, req.body);
        if (provider.category === 'Nurse' && !nurseDetails) {
            return res.status(400).json({
                success: false,
                message: 'Please select a nurse service before payment',
            });
        }
        const caretakerDetails = await calculateCaretakerSelection(provider, req.body);
        if (['Caretaker', 'Care Taker'].includes(provider.category) && !caretakerDetails) {
            return res.status(400).json({
                success: false,
                message: 'Please select a caretaker service before payment',
            });
        }
        // Service-based categories are priced from the admin catalogue; other categories retain provider fees.
        const serviceBookingDetails = physiotherapyDetails || nurseDetails || caretakerDetails;
        const baseAmount = serviceBookingDetails?.finalAmount ?? resolveProviderFee(provider);

        // Calculate distance and travel fare if locations are available
        let distance = 0;
        let travelFare = 0;

        if (user.location && user.location.latitude && provider.location && provider.location.latitude) {
            distance = calculateDistance(
                user.location.latitude,
                user.location.longitude,
                provider.location.latitude,
                provider.location.longitude
            );
            travelFare = calculateTravelFare(distance);
        }

        // Payment calculation using dynamic commission rate from settings
        // baseAmount = provider's fee (e.g., 500)
        // platformCommission = settings.commissionRate% of baseAmount (from admin settings)
        // GST = settings.gstPercentage% on platformCommission
        // totalAmount = baseAmount + platformCommission + GST + travelFare
        
        const commissionRate = (settings.commissionRate ?? 10) / 100; // Convert percentage to decimal
        const platformCommission = baseAmount * commissionRate;
        const gstPercentage = settings.gstPercentage ?? 18;
        const gstAmount = platformCommission * (gstPercentage / 100); // GST only on platform commission
        const grossAmount = baseAmount + platformCommission + gstAmount + travelFare;
        let couponId;
        let appliedCouponCode = '';
        let couponDiscount = 0;

        if (couponCode) {
            const couponResult = await validateCouponForUser({
                code: couponCode,
                userId: req.user.id,
                bookingType: 'appointment',
                orderAmount: grossAmount,
            });
            couponId = couponResult.coupon._id;
            appliedCouponCode = couponResult.coupon.code;
            couponDiscount = couponResult.discountAmount;
        }

        const amountAfterCoupon = Math.max(0, grossAmount - couponDiscount);
        const coinValueInRupees = Math.max(Number(settings.coinValueInRupees ?? 1), 0);
        const availableCoins = Number(user.coins || 0);
        const coinsUsed = useCoins && coinValueInRupees > 0
            ? Math.min(availableCoins, Math.floor(amountAfterCoupon / coinValueInRupees))
            : 0;
        const coinDiscount = coinsUsed * coinValueInRupees;
        const totalAmount = Math.max(0, amountAfterCoupon - coinDiscount);
        
        // Platform revenue = commission + GST
        const platformRevenue = platformCommission + gstAmount;

        // Create payment order (status: pending)
        const payment = await Payment.create({
            patientId: req.user.id,
            providerId: provider._id,
            baseAmount,
            platformCommission,
            gstPercentage,
            gstAmount,
            travelFare,
            distance,
            grossAmount,
            totalAmount,
            payableAmount: totalAmount,
            coinsUsed,
            coinValueInRupees,
            coinDiscount,
            couponId,
            couponCode: appliedCouponCode,
            couponDiscount,
            couponApplied: couponDiscount > 0,
            platformRevenue,
            providerAmount: baseAmount,
            paymentMethod: totalAmount === 0 ? 'coins' : (paymentMethod || settings.paymentGateway || 'razorpay'),
            status: 'pending',
            bookingType: 'appointment',
            ...(serviceBookingDetails || {}),
            // Store booking details for later use
            bookingDetails: {
                date,
                timeSlot,
                reason,
            },
        });

        // Check if TEST mode (for development/testing)
        const isTestMode = process.env.NODE_ENV === 'development' || process.env.PAYMENT_TEST_MODE === 'true';

        // Only for Razorpay in PRODUCTION mode
                if (totalAmount > 0 && (paymentMethod || settings.paymentGateway) === 'razorpay' && !isTestMode) {
                    const key_id = settings.razorpayKey || process.env.RAZORPAY_KEY_ID;
                    const key_secret = settings.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;

                    if (!key_id || !key_secret) {
                        return res.status(400).json({
                            success: false,
                            message: 'Razorpay is not configured. Please set Razorpay API Key/Secret in Admin Settings.',
                        });
                    }

          // Razorpay SDK se order banao
                    const razorpay = new Razorpay({ key_id, key_secret });
          const order = await razorpay.orders.create({
            amount: Math.round(totalAmount * 100), // paise me
                        currency: settings.currency || 'INR',
            receipt: payment._id.toString(),
            payment_capture: 1,
          });

          payment.razorpayOrderId = order.id;
          await payment.save();

          // Include order details in the response
          return res.status(201).json({
              success: true,
              message: 'Payment order created successfully',
              paymentId: payment._id,
              orderId: payment._id.toString(),
              order: order, // yahan order object bhejo
              breakdown: {
                  providerFee: baseAmount,
                  platformCommission: platformCommission,
                  gst: gstAmount,
                  travelFare: travelFare,
                  grossAmount,
                  couponCode: appliedCouponCode,
                  couponDiscount,
                  coinsAvailable: availableCoins,
                  coinsUsed,
                  coinValueInRupees,
                  coinDiscount,
                  payableAmount: totalAmount,
                  totalAmount: totalAmount,
                  ...(serviceBookingDetails || {}),
                  distance: distance ? `${distance} km` : 'Not available',
                  travelFareNote: distance > 20 ? `Extra travel fare: ₹5 per km beyond 20km` : 'No extra travel fare',
              },
              provider: {
                  name: provider.userId?.name,
                  category: provider.category,
                  specialization: provider.specialization,
              },
          });
        }

        // TEST MODE or other payment methods
        res.status(201).json({
            success: true,
            message: isTestMode ? 'TEST MODE: Payment order created (no real payment required)' : 'Payment order created successfully',
            paymentId: payment._id,
            orderId: payment._id.toString(),
            testMode: isTestMode,
            breakdown: {
                providerFee: baseAmount,
                platformCommission: platformCommission,
                gst: gstAmount,
                travelFare: travelFare,
                grossAmount,
                couponCode: appliedCouponCode,
                couponDiscount,
                coinsAvailable: availableCoins,
                coinsUsed,
                coinValueInRupees,
                coinDiscount,
                payableAmount: totalAmount,
                totalAmount: totalAmount,
                ...(serviceBookingDetails || {}),
                distance: distance ? `${distance} km` : 'Not available',
                travelFareNote: distance > 20 ? `Extra travel fare: ₹5 per km beyond 20km` : 'No extra travel fare',
            },
            provider: {
                name: provider.userId?.name,
                category: provider.category,
                specialization: provider.specialization,
            },
        });
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: 'Server error while creating payment order',
            error: error.message,
        });
    }
};

// @desc    Verify payment (After PayPal/payment gateway confirmation)
// @route   POST /api/payments/verify
// @access  Private (Patient only)
export const verifyPayment = async (req, res) => {
    const { paymentId, transactionId, paymentDetails } = req.body;

    try {
        // Validation
        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide paymentId',
            });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
        }

        // Check if payment belongs to this patient
        if (payment.patientId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to verify this payment',
            });
        }

        // Check if TEST mode
        const isTestMode = process.env.NODE_ENV === 'development' || process.env.PAYMENT_TEST_MODE === 'true';
        const isRealRazorpayPayment = payment.bookingType === 'appointment'
            && payment.paymentMethod === 'razorpay'
            && Number(payment.payableAmount || payment.totalAmount || 0) > 0
            && !isTestMode;

        if (payment.status === 'completed') {
            const populatedPayment = await Payment.findById(payment._id)
                .populate('patientId', 'name email mobile coins')
                .populate({
                    path: 'providerId',
                    populate: { path: 'userId', select: 'name email mobile' }
                });

            return res.status(200).json({
                success: true,
                message: 'Payment already verified. You can now book the appointment.',
                payment: populatedPayment,
                canBookAppointment: true,
                testMode: isTestMode,
            });
        }

        if (isRealRazorpayPayment) {
            const storedRazorpayOrderId = payment.razorpayOrderId;
            const razorpayOrderId = req.body.razorpay_order_id || req.body.orderId || storedRazorpayOrderId;
            const razorpayPaymentId = req.body.razorpay_payment_id || transactionId;
            const razorpaySignature = req.body.razorpay_signature || req.body.signature;
            const settings = req.settings || await Settings.getSettings();
            const keySecret = process.env.RAZORPAY_KEY_SECRET || settings.razorpaySecret;

            payment.razorpayOrderId = razorpayOrderId;
            payment.razorpayPaymentId = razorpayPaymentId;
            payment.razorpaySignature = razorpaySignature;

            if (
                !razorpayOrderId
                || !razorpayPaymentId
                || !razorpaySignature
                || !keySecret
                || (storedRazorpayOrderId && storedRazorpayOrderId !== razorpayOrderId)
            ) {
                payment.status = 'failed';
                payment.paymentDetails = paymentDetails || {};
                await payment.save();

                return res.status(400).json({
                    success: false,
                    message: 'Invalid Razorpay payment verification details',
                });
            }

            const duplicatePayment = await Payment.findOne({
                _id: { $ne: payment._id },
                bookingType: 'appointment',
                status: 'completed',
                $or: [
                    { razorpayPaymentId },
                    { transactionId: razorpayPaymentId },
                ],
            });

            if (duplicatePayment) {
                payment.status = 'failed';
                payment.razorpayPaymentId = undefined;
                payment.paymentDetails = {
                    ...(paymentDetails || {}),
                    duplicateRazorpayPaymentId: razorpayPaymentId,
                };
                await payment.save();

                return res.status(409).json({
                    success: false,
                    message: 'This Razorpay transaction has already been verified for another payment',
                });
            }

            const signatureValid = verifyRazorpaySignature({
                orderId: razorpayOrderId,
                paymentId: razorpayPaymentId,
                signature: razorpaySignature,
                secret: keySecret,
            });

            if (!signatureValid) {
                payment.status = 'failed';
                payment.paymentDetails = paymentDetails || {};
                await payment.save();

                return res.status(400).json({
                    success: false,
                    message: 'Invalid Razorpay payment signature',
                });
            }

            payment.transactionId = razorpayPaymentId;
        } else {
            payment.transactionId = transactionId || req.body.razorpay_payment_id || (payment.totalAmount <= 0
                ? `COINS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                : `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        }

        if (paymentDetails) {
            payment.paymentDetails = paymentDetails;
        } else if (isTestMode) {
            payment.paymentDetails = {
                testMode: true,
                message: 'Test payment - no real transaction',
                timestamp: new Date(),
            };
        }

        payment.status = 'completed';

        if (payment.status === 'completed' && payment.coinsUsed > 0 && !payment.coinsRedeemed) {
            const updatedUser = await redeemCoins({
                userId: payment.patientId,
                amount: payment.coinsUsed,
                description: `Coins redeemed for payment ${payment._id}`,
                idempotencyKey: `payment-redemption:${payment._id}`,
                metadata: {
                    paymentId: payment._id,
                    providerId: payment.providerId,
                    coinValueInRupees: payment.coinValueInRupees,
                    coinDiscount: payment.coinDiscount,
                },
            });

            if (!updatedUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Not enough coins available to complete this payment',
                });
            }

            payment.coinsRedeemed = true;
        }

        if (payment.status === 'completed') {
            if (payment.couponId && payment.couponDiscount > 0) {
                await validateCouponForUser({
                    code: payment.couponCode,
                    userId: payment.patientId,
                    bookingType: payment.bookingType || 'appointment',
                    orderAmount: payment.grossAmount,
                    excludePaymentId: payment._id,
                });
                await applyCouponUsageOnce({
                    couponId: payment.couponId,
                    userId: payment.patientId,
                    bookingType: payment.bookingType || 'appointment',
                    paymentId: payment._id,
                    bookingId: payment.appointmentId,
                    discountAmount: payment.couponDiscount,
                });
            }
            payment.payoutStatus = 'pending';
            
            // Create admin notification for payment completion
            try {
                const patient = await User.findById(payment.patientId);
                const provider = await Provider.findById(payment.providerId).populate('userId');
                
                await createSystemNotification({
                    title: '💰 Payment Completed',
                    message: `${patient?.name} paid ₹${payment.totalAmount} for booking with ${provider?.userId?.name}`,
                    type: 'payment_completed',
                    recipient: 'admin',
                    relatedUser: payment.patientId,
                    relatedProvider: payment.providerId,
                    relatedPayment: payment._id,
                    priority: 'medium'
                });

                // Notify patient about successful payment
                await notifyPatientPayment(payment, payment.patientId);
            } catch (error) {
                console.error('Payment notification error:', error);
            }
        }

        await payment.save();

        const populatedPayment = await Payment.findById(payment._id)
            .populate('patientId', 'name email mobile coins')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name email mobile' }
            });

        res.status(200).json({
            success: true,
            message: isTestMode 
                ? 'TEST MODE: Payment auto-verified. You can now book the appointment.' 
                : payment.status === 'completed' 
                    ? 'Payment verified successfully. You can now book the appointment.' 
                    : 'Payment verification failed',
            payment: populatedPayment,
            canBookAppointment: payment.status === 'completed',
            testMode: isTestMode,
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while verifying payment',
            error: error.message,
        });
    }
};

// @desc    Create payment for appointment (LEGACY - keeping for backward compatibility)
// @route   POST /api/payments
// @access  Private (Patient only)
export const createPayment = async (req, res) => {
    const { appointmentId, paymentMethod, transactionId } = req.body;

    try {
        // Validation
        if (!appointmentId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Please provide appointmentId and paymentMethod',
            });
        }

        // Check if user is patient
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can make payments',
            });
        }

        // Check if appointment exists
        const appointment = await Appointment.findById(appointmentId).populate('providerId');
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Check if appointment belongs to this patient
        if (appointment.patientId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to make payment for this appointment',
            });
        }

        // Check if appointment is in valid status for payment
        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot make payment for cancelled appointment',
            });
        }

        // Check if payment already exists
        const existingPayment = await Payment.findOne({ appointmentId });
        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: 'Payment already exists for this appointment',
            });
        }

        // Get provider details
        const provider = appointment.providerId;
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found for this appointment',
            });
        }

        // Base amount from provider's fees. Keep this aligned with the frontend fallback.
        const baseAmount = resolveProviderFee(provider);

        // Calculate distance and travel fare if locations are available
        let distance = appointment.distance || 0;
        let travelFare = appointment.travelFare || 0;

        // If distance not set in appointment, calculate now
        if (!distance && user.location && user.location.latitude && provider.location && provider.location.latitude) {
            distance = calculateDistance(
                user.location.latitude,
                user.location.longitude,
                provider.location.latitude,
                provider.location.longitude
            );
            travelFare = calculateTravelFare(distance);
            
            // Update appointment with distance and travel fare
            appointment.distance = distance;
            appointment.travelFare = travelFare;
            await appointment.save();
        }

        // Get settings (from middleware or fetch fresh)
        const settings = req.settings || await Settings.getSettings();

        // Payment calculation:
        // baseAmount = provider's fee (e.g., 400)
        // platformCommission = settings.commissionRate% of baseAmount
        // GST = settings.gstPercentage% on platformCommission ONLY
        // totalAmount = baseAmount + platformCommission + GST + travelFare (e.g., 400 + 80 + 14.4 + travelFare = 494.4 + travelFare)
        // platformRevenue = commission + GST
        
        const commissionRate = (settings.commissionRate ?? 10) / 100;
        const platformCommission = baseAmount * commissionRate;
        const gstPercentage = settings.gstPercentage ?? 18;
        const gstAmount = platformCommission * (gstPercentage / 100); // GST only on commission
        const totalAmount = baseAmount + platformCommission + gstAmount + travelFare;
        
        // Platform revenue = commission + GST on commission
        const platformRevenue = platformCommission + gstAmount;

        // Create payment with new structure
        const payment = await Payment.create({
            appointmentId,
            patientId: req.user.id,
            providerId: provider._id,
            baseAmount,
            platformCommission,
            gstPercentage,
            gstAmount,
            travelFare,
            distance,
            grossAmount: totalAmount,
            totalAmount,
            payableAmount: totalAmount,
            platformRevenue,
            providerAmount: baseAmount,
            paymentMethod,
            transactionId,
        });

        const populatedPayment = await Payment.findById(payment._id)
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId');

        res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            payment: populatedPayment,
            breakdown: {
                providerFee: baseAmount,
                platformCommission: platformCommission,
                gst: gstAmount,
                travelFare: travelFare,
                totalAmount: totalAmount,
                distance: distance ? `${distance} km` : 'Not available',
                note: distance > 20 ? `Extra travel fare applied (₹5 per km beyond 20km)` : 'No extra travel fare'
            }
        });
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating payment',
            error: error.message,
        });
    }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id/status
// @access  Private (Admin/System)
export const updatePaymentStatus = async (req, res) => {
    const { status, transactionId } = req.body;

    try {
        // Validation
        if (!status || !['pending', 'completed', 'failed', 'refunded'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid status: pending, completed, failed, or refunded',
            });
        }

        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
        }

        payment.status = status;
        if (transactionId) payment.transactionId = transactionId;
        
        // If payment is completed, update payout status
        if (status === 'completed') {
            payment.payoutStatus = 'pending';
        }

        await payment.save();

        const updatedPayment = await Payment.findById(payment._id)
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId');

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            payment: updatedPayment,
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating payment status',
            error: error.message,
        });
    }
};

// @desc    Update payout status
// @route   PUT /api/payments/:id/payout
// @access  Private (Admin only)
export const updatePayoutStatus = async (req, res) => {
    const { payoutStatus } = req.body;

    try {
        // Validation
        if (!payoutStatus || !['pending', 'processing', 'completed', 'failed'].includes(payoutStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid payoutStatus: pending, processing, completed, or failed',
            });
        }

        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Payment must be completed before payout',
            });
        }

        payment.payoutStatus = payoutStatus;
        if (payoutStatus === 'completed') {
            payment.payoutDate = new Date();
        }

        await payment.save();

        const updatedPayment = await Payment.findById(payment._id)
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId');

        res.status(200).json({
            success: true,
            message: 'Payout status updated successfully',
            payment: updatedPayment,
        });
    } catch (error) {
        console.error('Update payout status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating payout status',
            error: error.message,
        });
    }
};

// @desc    Get payment by appointment ID
// @route   GET /api/payments/appointment/:appointmentId
// @access  Private
export const getPaymentByAppointment = async (req, res) => {
    try {
        const payment = await Payment.findOne({ appointmentId: req.params.appointmentId })
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this appointment',
            });
        }

        // Authorization check
        const user = await User.findById(req.user.id);
        const provider = user.role === 'provider' ? await Provider.findOne({ userId: req.user.id }) : null;

        const isAuthorized = 
            payment.patientId._id.toString() === req.user.id ||
            (provider && payment.providerId._id.toString() === provider._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this payment',
            });
        }

        res.status(200).json({
            success: true,
            payment,
        });
    } catch (error) {
        console.error('Get payment by appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching payment',
            error: error.message,
        });
    }
};

// @desc    Get my payments (as patient)
// @route   GET /api/payments/my-payments
// @access  Private (Patient only)
export const getMyPayments = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can view their payments',
            });
        }

        const payments = await populatePatientPaymentQuery(
            Payment.find({ patientId: req.user.id }).sort({ createdAt: -1 })
        );

        // Calculate total amount
        const totalAmount = payments.reduce((sum, payment) => {
            return payment.status === 'completed' ? sum + (payment.totalAmount || payment.amount || 0) : sum;
        }, 0);

        // Hide provider's real fee for patient
        const safePayments = payments.map(payment => ({
            _id: payment._id,
            totalAmount: payment.totalAmount,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            createdAt: payment.createdAt,
            bookingDetails: payment.bookingDetails,
            appointmentId: payment.appointmentId,
            providerId: payment.providerId,
            payableAmount: payment.payableAmount,
            coinDiscount: payment.coinDiscount,
            // add other non-sensitive fields if needed
        }));
        res.status(200).json({
            success: true,
            count: payments.length,
            totalAmount,
            payments: safePayments,
        });
    } catch (error) {
        console.error('Get my payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching payments',
            error: error.message,
        });
    }
};

export const getPatientPayments = getMyPayments;

// @desc    Get provider earnings
// @route   GET /api/payments/earnings
// @access  Private (Provider only)
export const getProviderEarnings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can view their earnings',
            });
        }

        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        const payments = await Payment.find({ providerId: provider._id })
            .populate('patientId', 'name email')
            .populate('appointmentId')
            .sort({ createdAt: -1 });

        // Calculate earnings
        const totalEarnings = payments.reduce((sum, payment) => {
            return payment.status === 'completed' ? sum + payment.providerAmount : sum;
        }, 0);

        const pendingPayouts = payments.reduce((sum, payment) => {
            return payment.status === 'completed' && payment.payoutStatus !== 'completed' 
                ? sum + payment.providerAmount 
                : sum;
        }, 0);

        const completedPayouts = payments.reduce((sum, payment) => {
            return payment.payoutStatus === 'completed' ? sum + payment.providerAmount : sum;
        }, 0);

        res.status(200).json({
            success: true,
            count: payments.length,
            totalEarnings,
            pendingPayouts,
            completedPayouts,
            payments,
        });
    } catch (error) {
        console.error('Get provider earnings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching earnings',
            error: error.message,
        });
    }
};

// @desc    Get all payments (Admin)
// @route   GET /api/payments/all
// @access  Private (Admin only)
export const getAllPayments = async (req, res) => {
    try {
        // Only fetch completed payments (successful transactions)
        const payments = await Payment.find({ status: 'completed' })
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId')
            .sort({ createdAt: -1 });

        // Calculate platform revenue from completed payments
        const platformRevenue = payments.reduce((sum, payment) => {
            return sum + (payment.platformRevenue || 0);
        }, 0);

        res.status(200).json({
            success: true,
            count: payments.length,
            platformRevenue,
            payments,
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching payments',
            error: error.message,
        });
    }
};

// @desc    Refund payment
// @route   PUT /api/payments/:id/refund
// @access  Private (Admin only)
export const refundPayment = async (req, res) => {
    const { reason } = req.body;

    try {
        const payment = await Payment.findById(req.params.id)
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name email' }
            })
            .populate('appointmentId');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
        }

        // Can only refund completed payments
        if (payment.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only refund completed payments',
            });
        }

        // Check if already refunded
        if (payment.status === 'refunded') {
            return res.status(400).json({
                success: false,
                message: 'Payment is already refunded',
            });
        }

        // Update payment status to refunded
        payment.status = 'refunded';
        payment.payoutStatus = 'failed'; // Cancel payout
        await payment.save();

        // Update appointment status to cancelled
        const appointment = await Appointment.findById(payment.appointmentId);
        if (appointment && appointment.status !== 'cancelled') {
            appointment.status = 'cancelled';
            appointment.cancelledBy = 'admin';
            appointment.cancellationReason = reason || 'Payment refunded';
            await appointment.save();
        }

        res.status(200).json({
            success: true,
            message: 'Payment refunded successfully',
            payment,
        });
    } catch (error) {
        console.error('Refund payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while refunding payment',
            error: error.message,
        });
    }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
export const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('patientId', 'name email phone')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name email' }
            })
            .populate('appointmentId');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
        }

        // Authorization check
        const user = await User.findById(req.user.id);
        const provider = user.role === 'provider' ? await Provider.findOne({ userId: req.user.id }) : null;

        const isAuthorized = 
            user.role === 'admin' ||
            payment.patientId._id.toString() === req.user.id ||
            (provider && payment.providerId._id.toString() === provider._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this payment',
            });
        }

        // Only show full payment details to provider or admin
        if (user.role === 'admin' || (provider && payment.providerId._id.toString() === provider._id.toString())) {
            return res.status(200).json({
                success: true,
                payment,
            });
        }
        // For patient, hide provider's real fee and sensitive fields
        return res.status(200).json({
            success: true,
            payment: {
                _id: payment._id,
                totalAmount: payment.totalAmount,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                transactionId: payment.transactionId,
                createdAt: payment.createdAt,
                bookingDetails: payment.bookingDetails,
                appointmentId: payment.appointmentId,
                providerId: payment.providerId,
                // add other non-sensitive fields if needed
            },
        });
    } catch (error) {
        console.error('Get payment by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching payment',
            error: error.message,
        });
    }
};
