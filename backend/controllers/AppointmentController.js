import Appointment from '../models/Appointment.js';
import VisitAttendance from '../models/VisitAttendance.js';
import LabBooking from '../models/LabBooking.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import Settings from '../models/Settings.js';
import ProviderPayout from '../models/ProviderPayout.js';
import sendEmail, { sendTemplateEmail } from '../utils/sendEmail.js';
import { calculateDistance, calculateTravelFare } from '../utils/distanceCalculator.js';
import { createSystemNotification } from './NotificationController.js';
import { uploadMultipleToCloudinary } from '../utils/uploadToCloudinary.js';
import { awardAppointmentRewards } from '../utils/rewards.js';
import { LEGAL_DOCUMENT_SLUGS, requireAcceptedDocuments, saveAcceptanceLogs } from '../utils/legalDocuments.js';

const PATIENT_PROVIDER_SELECT = [
    '-documentation',
    '-aadharImages',
    '-rcDocument',
    '-driverLicenseDocument',
    '-panCardPhoto',
    '-bankAccountNumber',
    '-bankIfscCode',
    '-cancelledChequePhoto',
    '-policeVerificationDocument',
].join(' ');
import { 
    notifyPatientAppointment, 
    notifyProviderAppointment,
    notifyAdminNewAppointment 
} from '../utils/notificationService.js';

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STANDARD_BOOKING_START_TIME = '07:00';
const STANDARD_BOOKING_END_TIME = '21:00';
const DEFAULT_AVAILABILITY = WEEK_DAYS.map(day => ({
    day,
    startTime: STANDARD_BOOKING_START_TIME,
    endTime: STANDARD_BOOKING_END_TIME,
}));

const getProviderAvailability = (provider) => (
    provider.availability && provider.availability.length > 0
        ? provider.availability
        : DEFAULT_AVAILABILITY
);

const getAvailabilityForDate = (provider, date) => {
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const availability = getProviderAvailability(provider);

    return {
        appointmentDate,
        dayOfWeek,
        dayAvailability: availability.find(avail => avail.day === dayOfWeek) || {
            day: dayOfWeek,
            startTime: STANDARD_BOOKING_START_TIME,
            endTime: STANDARD_BOOKING_END_TIME,
        },
        usedDefaultAvailability: !provider.availability || provider.availability.length === 0 || !availability.find(avail => avail.day === dayOfWeek),
    };
};

const formatProviderAddress = (address) => {
    if (!address) return null;
    const parts = [address.street, address.city, address.state, address.pincode]
        .map((part) => String(part || '').trim())
        .filter(Boolean);
    return parts.length ? parts.join(', ') : null;
};

const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return NaN;

    const [time, rawPeriod] = timeStr.trim().split(/\s+/);
    const [rawHours, rawMinutes = '0'] = time.split(':');
    let hours = Number(rawHours);
    const minutes = Number(rawMinutes);
    const period = rawPeriod?.toUpperCase();

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
    let hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';

    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
};

const failPaidBooking = async (req, res, statusCode, message) => {
    return res.status(statusCode).json({
        success: false,
        message,
    });
};

const ATTENDANCE_PROVIDER_CATEGORIES = new Set(['Nurse', 'Physiotherapist', 'Caretaker', 'Care Taker']);

const isAttendanceTrackedAppointment = (appointmentOrProviderCategory = {}) => {
    if (
        appointmentOrProviderCategory?.nurseServiceId
        || appointmentOrProviderCategory?.physiotherapyServiceId
        || appointmentOrProviderCategory?.caretakerServiceId
    ) {
        return true;
    }
    const category = String(appointmentOrProviderCategory?.providerId?.category || appointmentOrProviderCategory?.category || '').trim();
    return ATTENDANCE_PROVIDER_CATEGORIES.has(category);
};

const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

const generateVisitCode = async () => {
    for (let i = 0; i < 20; i += 1) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const exists = await VisitAttendance.findOne({ visitCode: code }).select('_id');
        if (!exists) return code;
    }
    throw new Error('Unable to generate unique visit code');
};

const getVisitCountForAppointment = (appointment) => {
    if (!appointment) return 1;
    if (appointment.bookingType === 'package') {
        return Number(appointment.sessionsTotal || appointment.visitsTotal || appointment.packageSessionCount || appointment.packageVisitCount || 1);
    }
    return 1;
};

const createVisitAttendances = async (appointment) => {
    if (!isAttendanceTrackedAppointment(appointment)) return [];
    const visitCount = getVisitCountForAppointment(appointment);
    const baseDate = new Date(appointment.date);
    const records = [];

    for (let index = 0; index < visitCount; index += 1) {
        const visitDate = new Date(baseDate);
        visitDate.setDate(visitDate.getDate() + index);
        const visitCode = await generateVisitCode();
        records.push({
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            providerId: appointment.providerId._id || appointment.providerId,
            visitNumber: index + 1,
            visitDate,
            visitCode,
            status: 'pending',
            codeExpiresAt: endOfDay(visitDate),
        });
    }

    if (records.length) {
        await VisitAttendance.insertMany(records);
    }
    return records;
};

const ensureVisitAttendancesForAppointment = async (appointment) => {
    if (!appointment || !isAttendanceTrackedAppointment(appointment)) return [];

    const existingVisits = await VisitAttendance.find({ appointmentId: appointment._id })
        .sort({ visitNumber: 1 });

    const expectedVisitCount = getVisitCountForAppointment(appointment);
    const missingVisits = expectedVisitCount - existingVisits.length;

    if (missingVisits <= 0) {
        return existingVisits;
    }

    const existingNumbers = new Set(existingVisits.map((visit) => Number(visit.visitNumber)));
    const baseDate = new Date(appointment.date);
    const newRecords = [];

    for (let index = 0; index < expectedVisitCount; index += 1) {
        const visitNumber = index + 1;
        if (existingNumbers.has(visitNumber)) continue;

        const visitDate = new Date(baseDate);
        visitDate.setDate(visitDate.getDate() + index);
        const visitCode = await generateVisitCode();

        newRecords.push({
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            providerId: appointment.providerId._id || appointment.providerId,
            visitNumber,
            visitDate,
            visitCode,
            status: 'pending',
            codeExpiresAt: endOfDay(visitDate),
        });
    }

    if (newRecords.length) {
        await VisitAttendance.insertMany(newRecords, { ordered: true });
    }

    return VisitAttendance.find({ appointmentId: appointment._id }).sort({ visitNumber: 1 });
};

const syncAutoAbsentVisits = async (appointmentId) => {
    const now = new Date();
    await VisitAttendance.updateMany(
        {
            appointmentId,
            status: 'pending',
            visitDate: { $lt: startOfDay(now) },
        },
        {
            $set: {
                status: 'absent',
                notes: 'Auto-marked absent after visit date passed',
            },
        }
    );
};

const syncAppointmentAttendanceProgress = async (appointment) => {
    if (!appointment || !isAttendanceTrackedAppointment(appointment)) return 0;

    const verifiedVisits = await VisitAttendance.countDocuments({
        appointmentId: appointment._id,
        status: 'verified',
    });

    const shouldUpdateVisits = Number(appointment.visitsCompleted || 0) !== verifiedVisits;
    const shouldUpdateSessions = Number(appointment.sessionsCompleted || 0) !== verifiedVisits;

    if (shouldUpdateVisits || shouldUpdateSessions) {
        appointment.visitsCompleted = verifiedVisits;
        appointment.sessionsCompleted = verifiedVisits;
        await appointment.save();
    }

    return verifiedVisits;
};

const safeAttendancePayload = (visit, { includeCode = false } = {}) => {
    if (!visit) return null;
    const plain = visit.toObject ? visit.toObject() : visit;
    const payload = { ...plain };
    if (!includeCode) delete payload.visitCode;
    return payload;
};

const parseServiceReceiver = (body = {}) => {
    const bookingFor = body.bookingFor === 'family' ? 'family' : 'self';
    let raw = body.serviceReceiver || body.familyMember || null;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            raw = null;
        }
    }
    if (bookingFor !== 'family' || !raw) return { bookingFor: 'self', serviceReceiver: undefined };
    return {
        bookingFor,
        serviceReceiver: {
            memberId: String(raw.id || raw.memberId || '').trim(),
            name: String(raw.name || '').trim(),
            relation: String(raw.relation || '').trim(),
            mobile: String(raw.mobile || '').trim(),
            age: String(raw.age || '').trim(),
            gender: String(raw.gender || '').trim(),
            medicalNotes: String(raw.medicalNotes || raw.notes || '').trim(),
        },
    };
};

// @desc    Book a new appointment (REQUIRES PAYMENT VERIFICATION)
// @route   POST /api/appointments
// @access  Private (Patient only) + Payment Verification Middleware
export const bookAppointment = async (req, res) => {
    const { providerId, date, timeSlot, reason, notes, paymentId } = req.body;

    try {
        // Get settings (from middleware or fetch fresh)
        const settings = req.settings || await Settings.getSettings();
        
        // Payment verification is handled by middleware
        // req.payment contains the verified payment
        
        // Validation
        if (!providerId || !date || !timeSlot || !reason) {
            return failPaidBooking(req, res, 400, 'Please provide providerId, date, timeSlot, and reason');
        }

        // Validate booking time is within allowed range (from settings)
        // Combine date with timeSlot to get exact appointment time
        const appointmentDate = new Date(date);
        
        // Parse timeSlot (e.g., "09:00 AM" or "02:30 PM")
        const [time, period] = timeSlot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        // Convert to 24-hour format
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        // Set the exact appointment time
        appointmentDate.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const minutesUntilAppointment = (appointmentDate - now) / (1000 * 60);
        
        if (minutesUntilAppointment < settings.minBookingTime) {
            return failPaidBooking(req, res, 400, `Appointments must be booked at least ${settings.minBookingTime} minutes in advance`);
        }

        // Validate booking is within max days ahead (from settings)
        const daysUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60 * 24);
        
        if (daysUntilAppointment > settings.maxBookingDays) {
            return failPaidBooking(req, res, 400, `Appointments can only be booked up to ${settings.maxBookingDays} days in advance`);
        }

        // Check if user is patient
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return failPaidBooking(req, res, 403, 'Only patients can book appointments');
        }

        // Verify payment matches the provider
        if (req.payment.providerId.toString() !== providerId) {
            return failPaidBooking(req, res, 400, 'Payment was made for a different provider');
        }

        // Check if provider exists and is approved
        const provider = await Provider.findById(providerId).populate('userId', 'name email mobile');
        if (!provider) {
            return failPaidBooking(req, res, 404, 'Provider not found');
        }

        if (provider.status !== 'approved') {
            return failPaidBooking(req, res, 400, 'This provider is not available for bookings');
        }

        if (provider.availabilityStatus === false) {
            return failPaidBooking(req, res, 403, 'This provider is currently unavailable. Please try later.');
        }

        const legalCheck = await requireAcceptedDocuments({
            acceptedDocumentIds: req.body.acceptedLegalDocumentIds,
            requiredSlugs: LEGAL_DOCUMENT_SLUGS,
        });
        if (!legalCheck.ok) {
            return failPaidBooking(req, res, 400, legalCheck.message);
        }

        const { dayOfWeek, dayAvailability, usedDefaultAvailability } = getAvailabilityForDate(provider, date);

        if (!dayAvailability) {
            return failPaidBooking(req, res, 400, `Provider is not available on ${dayOfWeek}`);
        }

        // Convert times to minutes for comparison
        const requestedTime = timeToMinutes(timeSlot);
        const startTime = timeToMinutes(STANDARD_BOOKING_START_TIME);
        const endTime = timeToMinutes(STANDARD_BOOKING_END_TIME);

        if ([requestedTime, startTime, endTime].some(Number.isNaN) || endTime <= startTime) {
            return failPaidBooking(
                req,
                res,
                400,
                usedDefaultAvailability
                    ? 'Default provider availability is invalid'
                    : 'Provider availability time format is invalid. Please ask the provider to update their schedule.'
            );
        }

        // Check if requested time is within provider's available hours
        if (requestedTime < startTime || requestedTime >= endTime) {
            return failPaidBooking(req, res, 400, `Provider is not available at ${timeSlot}. Available hours on ${dayOfWeek}: 07:00 AM - 09:00 PM`);
        }

        // Check if slot is already booked
        const existingAppointment = await Appointment.findOne({
            providerId,
            date: new Date(date),
            timeSlot,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (existingAppointment) {
            return failPaidBooking(req, res, 400, 'This time slot is already booked');
        }

        // Get distance and travel fare from payment
        const distance = req.payment.distance || 0;
        const travelFare = req.payment.travelFare || 0;
        const previousAppointmentCount = await Appointment.countDocuments({ patientId: req.user.id });

        // Handle prescription images upload if provided
        let prescriptionImageUrls = [];
        if (req.files && req.files.prescriptionImages && req.files.prescriptionImages.length > 0) {
            try {
                const prescriptionBase64 = req.files.prescriptionImages.map(file =>
                    `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                );
                const uploadResult = await uploadMultipleToCloudinary(prescriptionBase64, 'patient-prescriptions');
                if (uploadResult.success) {
                    prescriptionImageUrls = uploadResult.urls;
                }
            } catch (uploadError) {
                console.error('Prescription upload error:', uploadError);
                // Continue with appointment booking even if upload fails
            }
        }

        const receiverDetails = parseServiceReceiver(req.body);

        // Create appointment with distance and travel fare
        const appointment = await Appointment.create({
            patientId: req.user.id,
            providerId,
            date: new Date(date),
            timeSlot,
            reason,
            notes,
            ...receiverDetails,
            distance,
            travelFare,
            prescriptionImages: prescriptionImageUrls,
            acceptedLegalDocuments: legalCheck.documents.map((doc) => doc._id),
            ...(req.payment.physiotherapyServiceId && {
                bookingType: req.payment.physiotherapyBookingType || 'single',
                physiotherapyServiceId: req.payment.physiotherapyServiceId,
                physiotherapyServiceName: req.payment.physiotherapyServiceName,
                selectedAddOns: req.payment.selectedAddOns || [],
                sessionsTotal: req.payment.packageSessionCount || 1,
                sessionsCompleted: 0,
                packageSessionCount: req.payment.packageSessionCount || 1,
                packageDiscount: req.payment.packageDiscount || 0,
                serviceAmount: req.payment.serviceAmount || 0,
                addonAmount: req.payment.addonAmount || 0,
                finalAmount: req.payment.finalAmount || 0,
            }),
            ...(req.payment.nurseServiceId && {
                bookingType: req.payment.nurseBookingType || 'single',
                nurseServiceId: req.payment.nurseServiceId,
                nurseServiceName: req.payment.nurseServiceName,
                selectedAddOns: req.payment.selectedAddOns || [],
                visitsTotal: req.payment.packageVisitCount || 1,
                visitsCompleted: 0,
                packageVisitCount: req.payment.packageVisitCount || 1,
                packageDiscount: req.payment.packageDiscount || 0,
                serviceAmount: req.payment.serviceAmount || 0,
                addonAmount: req.payment.addonAmount || 0,
                finalAmount: req.payment.finalAmount || 0,
            }),
            ...(req.payment.caretakerServiceId && {
                bookingType: req.payment.caretakerBookingType || 'single',
                caretakerServiceId: req.payment.caretakerServiceId,
                caretakerServiceName: req.payment.caretakerServiceName,
                shiftType: req.payment.caretakerShiftType,
                durationHours: req.payment.caretakerDurationHours,
                selectedAddOns: req.payment.selectedAddOns || [],
                serviceAmount: req.payment.serviceAmount || 0,
                addonAmount: req.payment.addonAmount || 0,
                finalAmount: req.payment.finalAmount || 0,
            }),
        });

        try {
            await createVisitAttendances(appointment);
        } catch (attendanceError) {
            console.error('Visit attendance creation error:', attendanceError);
        }

        // Link payment as soon as the appointment exists so later failures cannot reuse it.
        req.payment.appointmentId = appointment._id;
        await req.payment.save();

        await saveAcceptanceLogs({
            userId: req.user.id,
            documents: legalCheck.documents,
            req,
            context: 'appointment-booking',
        });

        let rewardUser = null;
        try {
            rewardUser = await awardAppointmentRewards({
                userId: req.user.id,
                appointmentId: appointment._id,
                isFirstAppointment: previousAppointmentCount === 0,
            });
        } catch (rewardError) {
            console.error('Appointment reward error:', rewardError);
        }

        // Create provider payout record (PENDING status)
        try {
            const grossAmount = req.payment.grossAmount
                ?? (req.payment.baseAmount + req.payment.platformCommission + req.payment.gstAmount + (req.payment.travelFare || 0));

            // Provider payout should reflect what admin will actually pay to provider.
            // We treat provider earnings as: provider fee + travel fare.
            const providerFee = req.payment.providerAmount ?? req.payment.baseAmount ?? 0;
            const providerTravel = req.payment.travelFare ?? 0;
            const netAmount = providerFee + providerTravel;

            // GST tracked for reporting (GST on platform commission)
            const gstPercentage = req.payment.gstPercentage ?? settings.gstPercentage ?? 18;
            const gstAmount = req.payment.gstAmount ?? 0;

            const { weekNumber, year } = ProviderPayout.getCurrentWeek();

            await ProviderPayout.create({
                providerId: provider.userId,
                appointmentId: appointment._id,
                patientId: req.user.id,
                grossAmount,
                gstPercentage,
                gstAmount,
                netAmount,
                status: 'PENDING',
                weekNumber,
                year,
            });
        } catch (payoutError) {
            console.error('Provider payout creation error:', payoutError);
            // Don't fail appointment if payout record fails
        }

        const populatedAppointment = await Appointment.findById(appointment._id)
            .populate('patientId', 'name email mobile profileImage location')
            .populate({
                path: 'providerId',
                select: PATIENT_PROVIDER_SELECT,
                populate: { path: 'userId', select: 'name email mobile profileImage' }
            });

        // Create admin notification for new appointment
        try {
            await createSystemNotification({
                title: '🆕 New Appointment Booked',
                message: `${user.name} booked appointment with ${provider.category} for ${new Date(date).toLocaleDateString()} at ${timeSlot}`,
                type: 'appointment_created',
                recipient: 'admin',
                relatedUser: req.user.id,
                relatedProvider: providerId,
                relatedAppointment: appointment._id,
                relatedPayment: req.payment._id,
                priority: 'high'
            });

            // Notify provider about new appointment
            console.log('Sending notification to provider:', provider.userId);
            const providerNotification = await notifyProviderAppointment(appointment, user.name, provider.userId);
            console.log('Provider notification result:', providerNotification);
            
            // Also notify patient about successful booking
            await notifyPatientAppointment(appointment, 'confirmed', req.user.id);
        } catch (error) {
            console.error('Notification error:', error);
            // Don't fail the appointment booking if notification fails
        }

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully with confirmed payment',
            appointment: populatedAppointment,
            payment: {
                _id: req.payment._id,
                totalAmount: req.payment.totalAmount,
                status: req.payment.status,
                transactionId: req.payment.transactionId,
                createdAt: req.payment.createdAt,
                appointmentId: req.payment.appointmentId,
                providerId: req.payment.providerId,
                // add other non-sensitive fields if needed
            },
            rewards: rewardUser ? {
                coins: rewardUser.coins,
                referralCode: rewardUser.referralCode,
            } : undefined,
        });
    } catch (error) {
        console.error('Book appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while booking appointment',
            error: error.message,
        });
    }
};

// @desc    Get all appointments for logged-in user
// @route   GET /api/appointments/my-appointments
// @access  Private
export const getMyAppointments = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        let appointments;

        if (user.role === 'patient') {
            appointments = await Appointment.find({ patientId: req.user.id })
                .populate({
                    path: 'providerId',
                    select: PATIENT_PROVIDER_SELECT,
                    populate: { path: 'userId', select: 'name email mobile profileImage' }
                })
                .sort({ date: -1 });
            
            // Check if each appointment has a review
            appointments = await Promise.all(appointments.map(async (apt) => {
                const review = await Review.findOne({ appointmentId: apt._id });
                const aptObj = apt.toObject();
                aptObj.hasReview = !!review;
                return aptObj;
            }));
        } else if (user.role === 'provider') {
            const provider = await Provider.findOne({ userId: req.user.id });
            if (!provider) {
                return res.status(404).json({
                    success: false,
                    message: 'Provider profile not found',
                });
            }
            appointments = await Appointment.find({ providerId: provider._id })
                .populate('patientId', 'name email mobile profileImage location')
                .sort({ date: -1 });
            appointments = await Promise.all(appointments.map(async (apt) => {
                const payment = await Payment.findOne({ appointmentId: apt._id }).select('status paymentMethod totalAmount payableAmount');
                const aptObj = apt.toObject();
                aptObj.paymentStatus = payment?.status || 'pending';
                aptObj.payment = payment || null;
                return aptObj;
            }));
        }

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments,
        });
    } catch (error) {
        console.error('Get my appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching appointments',
            error: error.message,
        });
    }
};

// @desc    Get single appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'name email mobile profileImage location')
            .populate({
                path: 'providerId',
                select: PATIENT_PROVIDER_SELECT,
                populate: { path: 'userId', select: 'name email mobile profileImage' }
            });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Check if user is authorized to view this appointment
        const user = await User.findById(req.user.id);
        const provider = user.role === 'provider' ? await Provider.findOne({ userId: req.user.id }) : null;

        const isAuthorized = 
            appointment.patientId._id.toString() === req.user.id ||
            (provider && appointment.providerId._id.toString() === provider._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this appointment',
            });
        }

        res.status(200).json({
            success: true,
            appointment,
        });
    } catch (error) {
        console.error('Get appointment by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching appointment',
            error: error.message,
        });
    }
};

export const getProviderAppointmentVisits = async (req, res) => {
    try {
        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }
        const appointment = await Appointment.findById(req.params.id).populate('providerId', 'category');
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        if (String(appointment.providerId?._id || appointment.providerId) !== String(provider._id)) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this appointment' });
        }

        await ensureVisitAttendancesForAppointment(appointment);
        await syncAutoAbsentVisits(appointment._id);
        await syncAppointmentAttendanceProgress(appointment);
        const visits = await VisitAttendance.find({ appointmentId: appointment._id }).sort({ visitNumber: 1 });
        return res.status(200).json({
            success: true,
            visits: visits.map((visit) => safeAttendancePayload(visit, { includeCode: false })),
        });
    } catch (error) {
        console.error('Get provider appointment visits error:', error);
        return res.status(500).json({ success: false, message: 'Server error while fetching attendance', error: error.message });
    }
};

export const verifyProviderAppointmentVisit = async (req, res) => {
    try {
        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }

        const { visitId, code } = req.body;
        if (!visitId || !code) {
            return res.status(400).json({ success: false, message: 'visitId and code are required' });
        }

        const visit = await VisitAttendance.findById(visitId);
        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }
        if (String(visit.providerId) !== String(provider._id)) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this appointment' });
        }
        if (visit.status === 'verified') {
            return res.status(400).json({ success: false, message: 'Visit already verified' });
        }
        const visitDate = new Date(visit.visitDate);
        if (startOfDay(new Date()) < startOfDay(visitDate)) {
            return res.status(400).json({ success: false, message: 'Cannot verify future visits' });
        }
        if (visit.codeExpiresAt && new Date() > visit.codeExpiresAt) {
            return res.status(400).json({ success: false, message: 'Visit code has expired' });
        }
        if (String(visit.visitCode) !== String(code).trim()) {
            return res.status(400).json({ success: false, message: 'Invalid visit code' });
        }

        visit.status = 'verified';
        visit.verifiedAt = new Date();
        visit.verifiedByProviderId = req.user.id;
        visit.notes = req.body.notes || visit.notes;
        await visit.save();

        const appointment = await Appointment.findById(visit.appointmentId).populate('providerId', 'category');
        if (appointment && isAttendanceTrackedAppointment(appointment)) {
            const verifiedVisits = await VisitAttendance.countDocuments({ appointmentId: appointment._id, status: 'verified' });
            appointment.visitsCompleted = verifiedVisits;
            appointment.sessionsCompleted = verifiedVisits;
            await appointment.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Visit verified successfully',
            visit: safeAttendancePayload(visit, { includeCode: false }),
        });
    } catch (error) {
        console.error('Verify provider visit error:', error);
        return res.status(500).json({ success: false, message: 'Server error while verifying visit', error: error.message });
    }
};

export const getPatientAppointmentVisits = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id).populate('providerId', 'category');
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        if (String(appointment.patientId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'You are not allowed to view this appointment' });
        }
        await ensureVisitAttendancesForAppointment(appointment);
        await syncAutoAbsentVisits(appointment._id);
        await syncAppointmentAttendanceProgress(appointment);
        const visits = await VisitAttendance.find({ appointmentId: appointment._id }).sort({ visitNumber: 1 });
        const today = startOfDay(new Date());
        return res.status(200).json({
            success: true,
            visits: visits.map((visit) => {
                const plain = safeAttendancePayload(visit, { includeCode: false });
                const visitDate = startOfDay(visit.visitDate);
                return {
                    ...plain,
                    visitCode: visitDate.getTime() === today.getTime() ? visit.visitCode : undefined,
                    isToday: visitDate.getTime() === today.getTime(),
                };
            }),
        });
    } catch (error) {
        console.error('Get patient appointment visits error:', error);
        return res.status(500).json({ success: false, message: 'Server error while fetching attendance', error: error.message });
    }
};

export const getAdminAppointmentAttendance = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'name email mobile')
            .populate({ path: 'providerId', select: 'category', populate: { path: 'userId', select: 'name email mobile' } });
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        await ensureVisitAttendancesForAppointment(appointment);
        await syncAutoAbsentVisits(appointment._id);
        await syncAppointmentAttendanceProgress(appointment);
        const visits = await VisitAttendance.find({ appointmentId: appointment._id }).sort({ visitNumber: 1 });
        const totalVisits = visits.length;
        const verifiedVisits = visits.filter((visit) => visit.status === 'verified').length;
        const absentVisits = visits.filter((visit) => visit.status === 'absent').length;
        const pendingVisits = visits.filter((visit) => visit.status === 'pending').length;
        const skippedVisits = visits.filter((visit) => visit.status === 'skipped').length;

        return res.status(200).json({
            success: true,
            attendance: {
                totalVisits,
                verifiedVisits,
                absentVisits,
                pendingVisits,
                skippedVisits,
                attendancePercentage: totalVisits ? Number(((verifiedVisits / totalVisits) * 100).toFixed(2)) : 0,
                visits: visits.map((visit) => safeAttendancePayload(visit, { includeCode: true })),
                appointment,
            },
        });
    } catch (error) {
        console.error('Get admin attendance error:', error);
        return res.status(500).json({ success: false, message: 'Server error while fetching attendance', error: error.message });
    }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Provider only)
export const updateAppointmentStatus = async (req, res) => {
    const { status } = req.body;

    try {
        // Validation
        if (!status || !['confirmed', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid status: confirmed, cancelled, or completed',
            });
        }

        const user = await User.findById(req.user.id);
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can update appointment status',
            });
        }

        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Check if appointment belongs to this provider
        if (appointment.providerId.toString() !== provider._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this appointment',
            });
        }

        const wasCompleted = appointment.status === 'completed';
        const isNurseBooking = Boolean(appointment.nurseServiceId);
        const isAttendanceBooking = isAttendanceTrackedAppointment(appointment);
        const progressTotal = isNurseBooking
            ? Number(appointment.visitsTotal || 0)
            : Number(appointment.sessionsTotal || 0);
        const isPackageCompletion = status === 'completed'
            && appointment.bookingType === 'package'
            && progressTotal > 0
            && !wasCompleted;
        if (status === 'completed' && isAttendanceBooking && !wasCompleted) {
            await ensureVisitAttendancesForAppointment(appointment);
            await syncAutoAbsentVisits(appointment._id);
            const expectedVisits = getVisitCountForAppointment(appointment);
            const verifiedVisits = await VisitAttendance.countDocuments({
                appointmentId: appointment._id,
                status: 'verified',
            });

            appointment.visitsCompleted = verifiedVisits;
            appointment.sessionsCompleted = verifiedVisits;

            if (verifiedVisits < expectedVisits) {
                return res.status(400).json({
                    success: false,
                    message: `All visits must be verified before marking complete (${verifiedVisits}/${expectedVisits} verified)`,
                });
            }
        }
        if (isPackageCompletion && !isAttendanceBooking) {
            if (isNurseBooking) {
                appointment.visitsCompleted = Math.min(progressTotal, Number(appointment.visitsCompleted || 0) + 1);
            } else {
                appointment.sessionsCompleted = Math.min(progressTotal, Number(appointment.sessionsCompleted || 0) + 1);
            }
        }
        const progressCompleted = isNurseBooking ? appointment.visitsCompleted : appointment.sessionsCompleted;
        const packageHasSessionsLeft = isPackageCompletion
            && progressCompleted < progressTotal;
        appointment.status = packageHasSessionsLeft ? 'confirmed' : status;
        if (status === 'cancelled') {
            appointment.cancelledBy = 'provider';
        }

        if (status === 'completed' && appointment.status === 'completed') {
            appointment.completedAt = new Date();
            if (!wasCompleted && !isPackageCompletion) {
                if (isAttendanceBooking) {
                    // Do not auto-increment attendance here; it must happen from code verification.
                } else if (isNurseBooking && appointment.visitsTotal > 0) {
                    appointment.visitsCompleted = Math.min(appointment.visitsTotal, Number(appointment.visitsCompleted || 0) + 1);
                } else if (appointment.physiotherapyServiceId && appointment.sessionsTotal > 0) {
                    appointment.sessionsCompleted = Math.min(appointment.sessionsTotal, Number(appointment.sessionsCompleted || 0) + 1);
                }
            }
            // Sync provider payout completion + planned release date
            try {
                const payout = await ProviderPayout.findOne({ appointmentId: appointment._id });
                if (payout) {
                    payout.completedAt = payout.completedAt || appointment.completedAt;
                    // releasedOn + referenceId are handled by ProviderPayout pre-save hook
                    await payout.save();
                }
            } catch (payoutUpdateError) {
                console.error('Provider payout completion update error:', payoutUpdateError);
            }
        }
        await appointment.save();

        if (appointment.labBookingId) {
            const labStatusMap = {
                confirmed: 'confirmed',
                cancelled: 'cancelled',
                completed: 'completed',
            };
            await LabBooking.findByIdAndUpdate(appointment.labBookingId, {
                status: labStatusMap[status] || status,
            });
        }

        const updatedAppointment = await Appointment.findById(appointment._id)
            .populate('patientId', 'name email mobile profileImage location')
            .populate({
                path: 'providerId',
                select: PATIENT_PROVIDER_SELECT,
                populate: { path: 'userId', select: 'name email mobile profileImage' }
            });

        // Send confirmation email to patient if status is confirmed
        if (status === 'confirmed') {
            try {
                const patient = updatedAppointment.patientId;
                const providerData = updatedAppointment.providerId;
                
                // Get payment info if available
                const Payment = (await import('../models/Payment.js')).default;
                const payment = await Payment.findOne({ appointmentId: updatedAppointment._id });
                
                await sendTemplateEmail({
                    to: patient.email,
                    subject: '✅ Appointment Confirmed!',
                    template: 'appointmentConfirmation',
                    data: {
                        patientName: patient.name,
                        providerName: providerData.userId.name,
                        specialization: providerData.specialization,
                        date: updatedAppointment.date,
                        timeSlot: updatedAppointment.timeSlot,
                        location: formatProviderAddress(providerData.address),
                        payment: payment ? {
                            totalAmount: payment.grossAmount || payment.totalAmount || 0,
                            payableAmount: payment.payableAmount ?? payment.totalAmount ?? 0,
                            coinsUsed: payment.coinsUsed || 0,
                            coinDiscount: payment.coinDiscount || 0,
                            travelFare: payment.travelFare || 0,
                        } : null
                    }
                });

                // Create admin notification for confirmed appointment
                await createSystemNotification({
                    title: '✅ Appointment Confirmed',
                    message: `Provider confirmed appointment with ${patient.name} for ${new Date(updatedAppointment.date).toLocaleDateString()} at ${updatedAppointment.timeSlot}`,
                    type: 'appointment_confirmed',
                    recipient: 'admin',
                    relatedUser: patient._id,
                    relatedProvider: provider._id,
                    relatedAppointment: appointment._id,
                    priority: 'medium'
                });

                // Notify patient about confirmation
                await notifyPatientAppointment(updatedAppointment, 'confirmed', patient._id);
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                // Don't fail the request if email fails
            }
        }

        // Create admin notification for cancelled appointment
        if (status === 'cancelled') {
            try {
                const patient = updatedAppointment.patientId;
                await createSystemNotification({
                    title: '❌ Appointment Cancelled by Provider',
                    message: `Provider cancelled appointment with ${patient.name} scheduled for ${new Date(updatedAppointment.date).toLocaleDateString()}`,
                    type: 'appointment_cancelled',
                    recipient: 'admin',
                    relatedUser: patient._id,
                    relatedProvider: provider._id,
                    relatedAppointment: appointment._id,
                    priority: 'high'
                });

                // Notify patient about cancellation
                await notifyPatientAppointment(updatedAppointment, 'cancelled', patient._id);
            } catch (error) {
                console.error('Notification error:', error);
            }
        }

        // Notify patient if appointment is completed
        if (status === 'completed') {
            try {
                const patient = updatedAppointment.patientId;
                await notifyPatientAppointment(updatedAppointment, 'completed', patient._id);
            } catch (error) {
                console.error('Notification error:', error);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Appointment status updated successfully',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating appointment',
            error: error.message,
        });
    }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private (Patient only)
export const cancelAppointment = async (req, res) => {
    const { cancellationReason } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can cancel their appointments',
            });
        }

        const appointment = await Appointment.findById(req.params.id);
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
                message: 'Not authorized to cancel this appointment',
            });
        }

        // Check if appointment can be cancelled
        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed appointment',
            });
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Appointment is already cancelled',
            });
        }

        // Get settings to check cancellation hours
        const settings = req.settings || await Settings.getSettings();
        
        // Check if cancellation is within allowed timeframe (from settings)
        const appointmentDateTime = new Date(appointment.date);
        const now = new Date();
        const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
        
        if (hoursUntilAppointment < settings.cancellationHours) {
            return res.status(400).json({
                success: false,
                message: `Appointments can only be cancelled at least ${settings.cancellationHours} hours before the scheduled time`,
            });
        }

        appointment.status = 'cancelled';
        appointment.cancelledBy = 'patient';
        appointment.cancelledByUserId = req.user.id;
        appointment.cancellationReason = cancellationReason;
        appointment.cancelledAt = new Date();
        appointment.refundEligible = true; // Eligible for refund
        await appointment.save();

        const updatedAppointment = await Appointment.findById(appointment._id)
            .populate('patientId', 'name email mobile profileImage location')
            .populate({
                path: 'providerId',
                select: PATIENT_PROVIDER_SELECT,
                populate: { path: 'userId', select: 'name email mobile profileImage' }
            });

        // Send notification to provider about cancellation
        try {
            const provider = await Provider.findById(appointment.providerId).populate('userId', 'name email');
            
            await createSystemNotification({
                title: '❌ Appointment Cancelled by Patient',
                message: `${user.name} cancelled appointment scheduled for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.timeSlot}. Reason: ${cancellationReason || 'Not specified'}`,
                type: 'appointment_cancelled',
                recipient: 'provider',
                recipientIds: [provider.userId._id],
                relatedUser: req.user.id,
                relatedAppointment: appointment._id,
                priority: 'high'
            });

            // Send email to provider
            await sendTemplateEmail({
                to: provider.userId.email,
                subject: 'Appointment Cancelled - Healthy Touch',
                template: 'appointmentCancelled',
                context: {
                    recipientName: provider.userId.name,
                    recipientRole: 'provider',
                    cancelledBy: 'Patient',
                    cancellerName: user.name,
                    appointmentDate: new Date(appointment.date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                    appointmentTime: appointment.timeSlot,
                    reason: cancellationReason || 'Not specified',
                    appointmentId: appointment._id.toString(),
                },
            });
        } catch (error) {
            console.error('Provider notification error:', error);
        }

        // Create admin notification
        try {
            const provider = await Provider.findById(appointment.providerId).populate('userId', 'name');
            await createSystemNotification({
                title: '❌ Appointment Cancelled by Patient',
                message: `${user.name} cancelled appointment with ${provider.userId.name} for ${new Date(appointment.date).toLocaleDateString()}. Refund processing required.`,
                type: 'appointment_cancelled',
                recipient: 'admin',
                relatedUser: req.user.id,
                relatedProvider: appointment.providerId,
                relatedAppointment: appointment._id,
                priority: 'high'
            });
        } catch (error) {
            console.error('Admin notification error:', error);
        }

        // Send cancellation confirmation email to patient
        try {
            const provider = await Provider.findById(appointment.providerId).populate('userId', 'name');
            await sendTemplateEmail({
                to: user.email,
                subject: 'Appointment Cancelled - Refund Processing - Healthy Touch',
                template: 'appointmentCancelled',
                context: {
                    recipientName: user.name,
                    recipientRole: 'patient',
                    cancelledBy: 'You',
                    cancellerName: user.name,
                    providerName: provider.userId.name,
                    appointmentDate: new Date(appointment.date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                    appointmentTime: appointment.timeSlot,
                    reason: cancellationReason || 'Not specified',
                    refundMessage: 'Your refund will be processed by our admin team within 24-48 hours.',
                    appointmentId: appointment._id.toString(),
                },
            });
        } catch (error) {
            console.error('Patient email error:', error);
        }

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while cancelling appointment',
            error: error.message,
        });
    }
};

// @desc    Get available time slots for a provider on a specific date
// @route   GET /api/appointments/slots/:providerId/:date
// @access  Public
export const getAvailableSlots = async (req, res) => {
    const { providerId, date } = req.params;

    try {
        const settings = req.settings || await Settings.getSettings();

        const provider = await Provider.findById(providerId);
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        const { dayOfWeek, dayAvailability, usedDefaultAvailability } = getAvailabilityForDate(provider, date);

        if (!dayAvailability) {
            return res.status(200).json({
                success: true,
                date,
                dayOfWeek,
                message: `Provider is not available on ${dayOfWeek}`,
                availableSlots: [],
            });
        }

        // Generate time slots based on provider's availability
        const startMinutes = timeToMinutes(STANDARD_BOOKING_START_TIME);
        const endMinutes = timeToMinutes(STANDARD_BOOKING_END_TIME);
        const slotDuration = Math.max(5, Number(settings?.slotDuration || 30));

        if ([startMinutes, endMinutes].some(Number.isNaN) || endMinutes <= startMinutes) {
            return res.status(200).json({
                success: true,
                date,
                dayOfWeek,
                message: 'Provider availability time format is invalid',
                availableSlots: [],
                bookedTimeSlots: [],
            });
        }

        const allSlots = [];
        for (let time = startMinutes; time < endMinutes; time += slotDuration) {
            allSlots.push(minutesToTime(time));
        }

        // Get all booked slots for this date
        const bookedAppointments = await Appointment.find({
            providerId,
            date: new Date(date),
            status: { $in: ['pending', 'confirmed'] },
        }).select('timeSlot');

        const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);

        const requestedDate = new Date(date);
        requestedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minimumBookingTime = new Date(Date.now() + Number(settings.minBookingTime || 30) * 60 * 1000);

        // Filter out booked slots and today's slots that are too soon to book.
        const availableSlots = allSlots.filter((slot) => {
            if (bookedSlots.includes(slot)) return false;
            if (requestedDate.getTime() !== today.getTime()) return true;

            const slotDateTime = new Date(date);
            const [time, period] = slot.trim().split(/\s+/);
            const [rawHours, rawMinutes = '0'] = time.split(':');
            let hours = Number(rawHours);
            const minutes = Number(rawMinutes);

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            slotDateTime.setHours(hours, minutes, 0, 0);
            return slotDateTime >= minimumBookingTime;
        });

        res.status(200).json({
            success: true,
            date,
            dayOfWeek,
            providerAvailability: {
                day: dayAvailability.day,
                startTime: STANDARD_BOOKING_START_TIME,
                endTime: STANDARD_BOOKING_END_TIME,
                isDefault: usedDefaultAvailability,
            },
            totalSlots: allSlots.length,
            bookedSlots: bookedSlots.length,
            availableSlots,
            bookedTimeSlots: bookedSlots,
        });
    } catch (error) {
        console.error('Get available slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching available slots',
            error: error.message,
        });
    }
};


