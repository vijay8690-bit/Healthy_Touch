import mongoose from 'mongoose';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import AmbulanceBooking from '../models/AmbulanceBooking.js';
import Payment from '../models/Payment.js';
import Provider from '../models/Provider.js';
import Settings from '../models/Settings.js';
import { calculateDistance } from '../utils/distanceCalculator.js';
import { createSystemNotification } from './NotificationController.js';
import { applyCouponUsageOnce, validateCouponForUser } from '../utils/coupons.js';

const AMBULANCE_PRICING = {
  'Basic Life Support (BLS) Ambulance': { baseCharge: 200, fixedCharge: 1500, perKmRate: 13 },
  'Advanced Life Support (ALS) Ambulance': { baseCharge: 300, fixedCharge: 2000, perKmRate: 15 },
  'ICU Ambulance': { baseCharge: 500, fixedCharge: 3500, perKmRate: 25 },
  'Dead Body Transport Ambulance': { baseCharge: 500, fixedCharge: 2000, perKmRate: 15 },
};

const roundMoney = (value) => Math.max(0, Math.round(Number(value || 0) * 100) / 100);

const hasCoordinates = (location) => (
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude))
);

const calculateAmbulanceCharges = ({ ambulanceType, pickupLocation, dropLocation }) => {
  const pricing = AMBULANCE_PRICING[ambulanceType];
  if (!pricing) {
    const error = new Error('Invalid ambulance type');
    error.statusCode = 400;
    throw error;
  }

  if (!hasCoordinates(pickupLocation) || !hasCoordinates(dropLocation)) {
    const error = new Error('Please select pickup and drop locations from search/current location so distance can be calculated');
    error.statusCode = 400;
    throw error;
  }

  const totalDistance = roundMoney(calculateDistance(
    Number(pickupLocation.latitude),
    Number(pickupLocation.longitude),
    Number(dropLocation.latitude),
    Number(dropLocation.longitude)
  ));
  const pricingMode = totalDistance <= 50 ? 'fixed' : 'per_km';
  const estimatedAmount = pricingMode === 'fixed'
    ? pricing.baseCharge + pricing.fixedCharge
    : pricing.baseCharge + (totalDistance * pricing.perKmRate);
  const finalAmount = roundMoney(estimatedAmount);
  const advanceAmount = roundMoney(finalAmount / 2);
  const remainingAmount = roundMoney(finalAmount - advanceAmount);

  return {
    totalDistance,
    estimatedAmount: finalAmount,
    finalAmount,
    advanceAmount,
    remainingAmount,
    grossAmount: finalAmount,
    payableAmount: finalAmount,
    pricingBreakdown: {
      ...pricing,
      fixedCharge: pricingMode === 'fixed' ? pricing.fixedCharge : 0,
      pricingMode,
    },
  };
};

const getStageAmount = (booking, stage) => (
  stage === 'advance' ? Number(booking.advanceAmount || 0) : Number(booking.remainingAmount || 0)
);

const getStageLabel = (stage) => (stage === 'advance' ? 'Advance Payment' : 'Remaining Payment');

const addHistory = (booking, status, changedBy, note = '') => {
  booking.status = status;
  booking.statusHistory = [
    ...(booking.statusHistory || []),
    { status, changedBy, note, changedAt: new Date() },
  ];
};

const populateBooking = (query) => query
  .populate('patientId', 'name email mobile location')
  .populate({
    path: 'assignedProviderId',
    populate: { path: 'userId', select: 'name email mobile' },
  });

const getAmbulanceProviderForUser = async (userId) => {
  const provider = await Provider.findOne({ userId });
  if (!provider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }
  if (provider.category !== 'Ambulance') {
    const error = new Error('Only ambulance providers can access ambulance requests');
    error.statusCode = 403;
    throw error;
  }
  return provider;
};

const getNearbyAmbulanceProviders = async (booking) => {
  const providers = await Provider.find({
    category: 'Ambulance',
    status: 'approved',
    availabilityStatus: { $ne: false },
  }).populate('userId', 'name email mobile');

  const pickupLat = booking.pickupLocation?.latitude;
  const pickupLng = booking.pickupLocation?.longitude;

  return providers.map((provider) => {
    const providerLat = provider.location?.latitude;
    const providerLng = provider.location?.longitude;
    const distanceKm = pickupLat && pickupLng && providerLat && providerLng
      ? calculateDistance(pickupLat, pickupLng, providerLat, providerLng)
      : null;

    return {
      _id: provider._id,
      userId: provider.userId,
      ambulanceType: provider.ambulanceType,
      vehicleNumber: provider.vehicleNumber,
      vehicleModel: provider.vehicleModel,
      driverName: provider.driverName,
      driverMobileNo: provider.driverMobileNo,
      baseCharges: provider.baseCharges,
      perKmCharge: provider.perKmCharge,
      address: provider.address,
      location: provider.location,
      distanceKm,
      canServeRequest: !provider.ambulanceType || provider.ambulanceType === booking.ambulanceType,
    };
  }).sort((a, b) => {
    if (a.canServeRequest !== b.canServeRequest) return a.canServeRequest ? -1 : 1;
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
};

export const createAmbulanceBooking = async (req, res) => {
  try {
    const {
      ambulanceType,
      requestType,
      pickupLocation,
      dropLocation,
      patientCondition,
      contactNumber,
      preferredDateTime,
      notes,
      couponCode,
    } = req.body;

    if (!ambulanceType || !requestType || !pickupLocation?.address || !dropLocation?.address || !patientCondition || !contactNumber || !preferredDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide ambulance type, request type, pickup/drop location, condition, contact number, and preferred date/time',
      });
    }

    const charges = calculateAmbulanceCharges({ ambulanceType, pickupLocation, dropLocation });

    const booking = await AmbulanceBooking.create({
      patientId: req.user.id,
      ambulanceType,
      requestType,
      pickupLocation,
      dropLocation,
      patientCondition,
      contactNumber,
      preferredDateTime,
      notes,
      couponCode: String(couponCode || '').trim().toUpperCase(),
      ...charges,
      paymentStage: 'advance_pending',
      status: 'pending_admin',
      statusHistory: [{
        status: 'pending_admin',
        note: 'Ambulance request created; advance payment pending',
        changedBy: req.user.id,
        changedAt: new Date(),
      }],
    });

    try {
      await createSystemNotification({
        title: 'New ambulance request',
        message: `${requestType} ambulance request submitted from ${pickupLocation.address}.`,
        type: 'ambulance_pending',
        recipient: 'admin',
        relatedUser: req.user.id,
        priority: requestType === 'emergency' ? 'high' : 'medium',
      });
    } catch (error) {
      console.error('Ambulance admin notification error:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Ambulance request created. Please complete 50% advance payment.',
      booking,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Server error while creating ambulance request',
      error: error.message,
    });
  }
};

export const getMyAmbulanceBookings = async (req, res) => {
  try {
    const bookings = await populateBooking(
      AmbulanceBooking.find({ patientId: req.user.id }).sort({ createdAt: -1 })
    );
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ambulance bookings',
      error: error.message,
    });
  }
};

export const getAdminAmbulanceRequests = async (req, res) => {
  try {
    const status = req.query.status || 'pending_admin';
    const filter = status === 'all' ? {} : { status };
    const bookings = await populateBooking(
      AmbulanceBooking.find(filter).sort({ createdAt: -1 })
    );

    const requests = await Promise.all(bookings.map(async (booking) => ({
      ...booking.toObject(),
      nearbyProviders: await getNearbyAmbulanceProviders(booking),
    })));

    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ambulance requests',
      error: error.message,
    });
  }
};

export const assignAmbulanceProvider = async (req, res) => {
  try {
    const { providerId } = req.body;
    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid ambulance provider' });
    }

    const booking = await AmbulanceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ambulance request not found' });
    }
    if (booking.paymentStage !== 'advance_paid' && booking.paymentStage !== 'fully_paid') {
      return res.status(400).json({ success: false, message: '50% advance payment is required before assigning an ambulance provider' });
    }

    const provider = await Provider.findOne({ _id: providerId, category: 'Ambulance', status: 'approved' })
      .populate('userId', 'name email mobile');
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Selected provider is not an approved ambulance provider' });
    }

    booking.assignedProviderId = provider._id;
    booking.adminRejectionReason = undefined;
    booking.providerRejectionReason = undefined;
    const charges = calculateAmbulanceCharges({
      ambulanceType: booking.ambulanceType,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
    });
    const grossAmount = charges.finalAmount;
    Object.assign(booking, charges);

    if (booking.couponCode && grossAmount > 0) {
      try {
        const couponResult = await validateCouponForUser({
          code: booking.couponCode,
          userId: booking.patientId,
          bookingType: 'ambulance',
          orderAmount: grossAmount,
          excludeBookingId: booking._id,
        });
        booking.couponId = couponResult.coupon._id;
        booking.couponCode = couponResult.coupon.code;
        booking.couponDiscount = couponResult.discountAmount;
        booking.payableAmount = Math.max(0, grossAmount - couponResult.discountAmount);
        await applyCouponUsageOnce({
          couponId: couponResult.coupon._id,
          userId: booking.patientId,
          bookingType: 'ambulance',
          bookingId: booking._id,
          discountAmount: couponResult.discountAmount,
        });
      } catch (error) {
        booking.couponDiscount = 0;
      }
    }
    addHistory(booking, 'assigned_to_provider', req.user.id, `Assigned to ${provider.userId?.name || provider.vehicleNumber || 'ambulance provider'}`);
    await booking.save();

    try {
      await createSystemNotification({
        title: 'Ambulance request assigned',
        message: 'A new ambulance request has been assigned to you.',
        type: 'ambulance_assigned',
        recipient: 'provider',
        relatedUser: booking.patientId,
        relatedProvider: provider._id,
        priority: booking.requestType === 'emergency' ? 'high' : 'medium',
      });
      await createSystemNotification({
        title: 'Ambulance assigned',
        message: 'Admin assigned an ambulance provider to your request.',
        type: 'ambulance_assigned',
        recipient: 'patient',
        relatedUser: booking.patientId,
        relatedProvider: provider._id,
        priority: 'medium',
      });
    } catch (error) {
      console.error('Ambulance assignment notification error:', error);
    }

    const populatedBooking = await populateBooking(AmbulanceBooking.findById(booking._id));
    res.status(200).json({ success: true, message: 'Ambulance provider assigned', booking: populatedBooking });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while assigning ambulance provider',
      error: error.message,
    });
  }
};

export const rejectAmbulanceByAdmin = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide rejection reason' });
    }

    const booking = await AmbulanceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ambulance request not found' });
    }

    booking.adminRejectionReason = reason.trim();
    addHistory(booking, 'rejected_by_admin', req.user.id, reason.trim());
    await booking.save();

    res.status(200).json({ success: true, message: 'Ambulance request rejected', booking });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting ambulance request',
      error: error.message,
    });
  }
};

export const getAssignedAmbulanceRequests = async (req, res) => {
  try {
    const provider = await getAmbulanceProviderForUser(req.user.id);
    const status = req.query.status || 'all';
    const filter = { assignedProviderId: provider._id };
    if (status !== 'all') filter.status = status;
    const requests = await populateBooking(
      AmbulanceBooking.find(filter).sort({ createdAt: -1 })
    );
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while fetching assigned ambulance requests',
    });
  }
};

export const acceptAssignedAmbulanceRequest = async (req, res) => {
  req.body = {
    ...(req.body || {}),
    status: 'accepted_by_provider',
  };

  return updateAssignedAmbulanceStatus(req, res);
};
export const rejectAssignedAmbulanceRequest = async (req, res) => {
  try {
    const provider = await getAmbulanceProviderForUser(req.user.id);
    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide rejection reason' });
    }

    const booking = await AmbulanceBooking.findOne({ _id: req.params.id, assignedProviderId: provider._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Assigned ambulance request not found' });
    }

    booking.providerRejectionReason = reason.trim();
    addHistory(booking, 'rejected_by_provider', req.user.id, reason.trim());
    await booking.save();
    res.status(200).json({ success: true, message: 'Ambulance request rejected', booking });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while rejecting ambulance request',
    });
  }
};

export const updateAssignedAmbulanceStatus = async (req, res) => {
  try {
    const provider = await getAmbulanceProviderForUser(req.user.id);
    const { status, note } = req.body;
    const allowedStatuses = ['accepted_by_provider', 'driver_on_way', 'reached_pickup', 'patient_picked', 'patient_dropped', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid ambulance status' });
    }

    const booking = await AmbulanceBooking.findOne({ _id: req.params.id, assignedProviderId: provider._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Assigned ambulance request not found' });
    }
    if (status !== 'accepted_by_provider' && booking.paymentStage === 'advance_pending') {
      return res.status(400).json({ success: false, message: 'Trip cannot proceed until the 50% advance payment is done' });
    }
    if (status === 'completed' && booking.paymentStage !== 'fully_paid') {
      return res.status(400).json({ success: false, message: 'Final payment is required before completing this booking' });
    }

    if (status === 'accepted_by_provider') booking.acceptedAt = new Date();
    if (status === 'driver_on_way') booking.driverOnWayAt = new Date();
    if (status === 'reached_pickup') booking.reachedPickupAt = new Date();
    if (status === 'patient_picked') booking.patientPickedAt = new Date();
    if (status === 'patient_dropped') {
      booking.patientDroppedAt = new Date();
      if (booking.paymentStage === 'advance_paid') booking.paymentStage = 'final_payment_pending';
    }
    if (status === 'completed') booking.completedAt = new Date();

    addHistory(booking, status, req.user.id, note || '');
    await booking.save();

    const populatedBooking = await populateBooking(AmbulanceBooking.findById(booking._id));
    res.status(200).json({ success: true, message: 'Ambulance status updated', booking: populatedBooking });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while updating ambulance status',
    });
  }
};

export const payAmbulanceBookingStage = async (req, res) => {
  try {
    const { stage, paymentMethod = 'test', transactionId } = req.body;
    if (!['advance', 'final'].includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid payment stage' });
    }

    const booking = await AmbulanceBooking.findOne({ _id: req.params.id, patientId: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ambulance booking not found' });
    }

    const charges = calculateAmbulanceCharges({
      ambulanceType: booking.ambulanceType,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
    });
    Object.assign(booking, charges);

    if (stage === 'advance') {
      if (booking.paymentStage !== 'advance_pending') {
        return res.status(400).json({ success: false, message: 'Advance payment is not pending for this booking' });
      }
      booking.paymentStage = 'advance_paid';
      booking.statusHistory = [
        ...(booking.statusHistory || []),
        {
          status: booking.status,
          changedBy: req.user.id,
          note: `Advance payment received: Rs. ${booking.advanceAmount}`,
          changedAt: new Date(),
        },
      ];
    }

    if (stage === 'final') {
      if (booking.status !== 'patient_dropped' || booking.paymentStage !== 'final_payment_pending') {
        return res.status(400).json({ success: false, message: 'Remaining payment is available only after patient drop' });
      }
      booking.paymentStage = 'fully_paid';
      booking.statusHistory = [
        ...(booking.statusHistory || []),
        {
          status: booking.status,
          changedBy: req.user.id,
          note: `Final payment received: Rs. ${booking.remainingAmount}`,
          changedAt: new Date(),
        },
      ];
    }

    booking.paymentDetails = {
      ...(booking.paymentDetails || {}),
      [stage]: {
        paymentMethod,
        transactionId: transactionId || `AMB_${stage.toUpperCase()}_${Date.now()}`,
        paidAt: new Date(),
        amount: stage === 'advance' ? booking.advanceAmount : booking.remainingAmount,
      },
    };
    await booking.save();

    const populatedBooking = await populateBooking(AmbulanceBooking.findById(booking._id));
    res.status(200).json({ success: true, message: 'Ambulance payment updated', booking: populatedBooking });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while updating ambulance payment',
    });
  }
};

export const createAmbulancePaymentOrder = async (req, res) => {
  try {
    const { stage } = req.body;
    if (!['advance', 'final'].includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid payment stage' });
    }

    const booking = await AmbulanceBooking.findOne({ _id: req.params.id, patientId: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ambulance booking not found' });
    }

    if (stage === 'advance' && booking.paymentStage !== 'advance_pending') {
      return res.status(400).json({ success: false, message: 'Advance payment is not pending for this booking' });
    }
    if (stage === 'final' && (booking.status !== 'patient_dropped' || booking.paymentStage !== 'final_payment_pending')) {
      return res.status(400).json({ success: false, message: 'Remaining payment is available only after patient drop' });
    }

    const charges = calculateAmbulanceCharges({
      ambulanceType: booking.ambulanceType,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
    });
    Object.assign(booking, charges);
    await booking.save();

    const settings = req.settings || await Settings.getSettings();
    const amount = getStageAmount(booking, stage);
    const payment = await Payment.create({
      patientId: booking.patientId,
      providerId: booking.assignedProviderId,
      bookingType: 'ambulance',
      ambulanceBookingId: booking._id,
      baseAmount: amount,
      grossAmount: amount,
      totalAmount: amount,
      payableAmount: amount,
      amount,
      providerAmount: amount,
      platformCommission: 0,
      gstAmount: 0,
      platformRevenue: 0,
      paymentMethod: 'razorpay',
      status: 'pending',
      bookingDetails: {
        date: booking.preferredDateTime,
        reason: `${getStageLabel(stage)} - ${booking.ambulanceType}`,
      },
      paymentDetails: { stage },
    });

    const key_id = settings?.razorpayKey || process.env.RAZORPAY_KEY_ID;
    const key_secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;
    const isTestMode = process.env.NODE_ENV === 'development' || process.env.PAYMENT_TEST_MODE === 'true';

    if (isTestMode) {
      await payment.save();
      return res.status(201).json({
        success: true,
        message: 'TEST MODE: Ambulance payment order created (no real payment required)',
        bookingId: booking._id,
        paymentId: payment._id,
        stage,
        amount,
        currency: settings?.currency || 'INR',
        order: null,
        testMode: true,
        booking,
      });
    }

    if (!key_id || !key_secret) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay is not configured. Please set Razorpay API Key/Secret in Admin Settings.',
      });
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: settings?.currency || 'INR',
      receipt: `AMB_${stage.toUpperCase()}_${booking._id.toString().slice(-16)}`,
      payment_capture: 1,
      notes: {
        bookingId: booking._id.toString(),
        patientId: booking.patientId.toString(),
        stage,
      },
    });

    payment.razorpayOrderId = order.id;
    payment.paymentDetails = { ...(payment.paymentDetails || {}), stage, testMode: isTestMode };
    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Ambulance payment order created successfully',
      bookingId: booking._id,
      paymentId: payment._id,
      stage,
      amount,
      currency: settings?.currency || 'INR',
      order,
      booking,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while creating ambulance payment order',
    });
  }
};

export const markAmbulancePaymentPaid = async (req, res) => {
  try {
    const { stage, paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!['advance', 'final'].includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid payment stage' });
    }

    const booking = await AmbulanceBooking.findOne({ _id: req.params.id, patientId: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ambulance booking not found' });
    }

    if (stage === 'advance' && booking.paymentStage !== 'advance_pending') {
      return res.status(400).json({ success: false, message: 'Advance payment is not pending for this booking' });
    }
    if (stage === 'final' && (booking.status !== 'patient_dropped' || booking.paymentStage !== 'final_payment_pending')) {
      return res.status(400).json({ success: false, message: 'Remaining payment is available only after patient drop' });
    }

    const payment = paymentId
      ? await Payment.findOne({ _id: paymentId, ambulanceBookingId: booking._id, patientId: req.user.id })
      : await Payment.findOne({ ambulanceBookingId: booking._id, patientId: req.user.id, razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Ambulance payment order not found' });
    }

    const settings = req.settings || await Settings.getSettings();
    const key_secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;
    const isTestMode = process.env.NODE_ENV === 'development' || process.env.PAYMENT_TEST_MODE === 'true';

    if (!isTestMode) {
      if (!key_secret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        payment.status = 'failed';
        await payment.save();
        return res.status(400).json({ success: false, message: 'Missing Razorpay verification details' });
      }
      if (payment.razorpayOrderId && payment.razorpayOrderId !== razorpay_order_id) {
        payment.status = 'failed';
        payment.paymentDetails = { ...(payment.paymentDetails || {}), failureReason: 'Razorpay order ID does not match ambulance payment order' };
        await payment.save();
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(razorpay_signature, 'hex');
      const isValidSignature = expectedBuffer.length === receivedBuffer.length
        && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

      if (!isValidSignature) {
        payment.status = 'failed';
        await payment.save();
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }
    }

    const charges = calculateAmbulanceCharges({
      ambulanceType: booking.ambulanceType,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
    });
    Object.assign(booking, charges);

    payment.status = 'completed';
    payment.paymentMethod = isTestMode ? 'test' : 'razorpay';
    payment.transactionId = razorpay_payment_id || req.body.transactionId || `AMB_${stage.toUpperCase()}_${Date.now()}`;
    payment.razorpayOrderId = razorpay_order_id || payment.razorpayOrderId;
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paymentDetails = {
      ...(payment.paymentDetails || {}),
      stage,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paidAt: new Date(),
    };

    if (stage === 'advance') {
      booking.paymentStage = 'advance_paid';
    } else {
      booking.paymentStage = 'fully_paid';
    }
    booking.paymentDetails = {
      ...(booking.paymentDetails || {}),
      [stage]: {
        paymentId: payment._id,
        transactionId: payment.transactionId,
        paidAt: new Date(),
        amount: getStageAmount(booking, stage),
      },
    };
    booking.statusHistory = [
      ...(booking.statusHistory || []),
      {
        status: booking.status,
        changedBy: req.user.id,
        note: `${getStageLabel(stage)} received: Rs. ${getStageAmount(booking, stage)}`,
        changedAt: new Date(),
      },
    ];

    await payment.save();
    await booking.save();

    const populatedBooking = await populateBooking(AmbulanceBooking.findById(booking._id));
    res.status(200).json({ success: true, message: 'Ambulance payment confirmed', booking: populatedBooking, payment });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while confirming ambulance payment',
    });
  }
};
