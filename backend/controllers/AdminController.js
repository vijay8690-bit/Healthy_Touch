import mongoose from 'mongoose';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import PatientProfile from '../models/PatientProfile.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Notification from '../models/Notification.js';
import PhysiotherapyService from '../models/PhysiotherapyService.js';
import PhysiotherapyAddon from '../models/PhysiotherapyAddon.js';
import NurseService from '../models/NurseService.js';
import NurseAddon from '../models/NurseAddon.js';
import CaretakerService from '../models/CaretakerService.js';
import CaretakerAddon from '../models/CaretakerAddon.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';
import { ensureProviderLabCode } from '../utils/labCode.js';


// ============================================
// HELPER FUNCTIONS
// ============================================

// Helper function to add rating data to provider object
const addRatingData = async (provider) => {
    const reviews = await Review.find({ providerId: provider._id });
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 4;
    
    provider._averageRating = parseFloat(averageRating.toFixed(1));
    provider._totalReviews = totalReviews;
    provider.rating = parseFloat(averageRating.toFixed(1));
    return provider;
};

const normalizeLabServiceType = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return undefined;
    if (trimmed === 'Diagnostic Centre (Lab)') return 'Pathology Centre (Lab)';
    if (trimmed === 'Home Sample Collection Only') return 'Radiology Centre (Lab)';
    if (['Pathology Centre (Lab)', 'Radiology Centre (Lab)', 'Both'].includes(trimmed)) return trimmed;
    return undefined;
};

const normalizeCaretakerServiceType = (value) => {
    const firstValue = (Array.isArray(value) ? value[0] : String(value || '').split(',')[0] || '').trim();
    if (!firstValue) return undefined;

    const normalized = firstValue.toLowerCase().replace(/[^a-z]/g, '');
    const aliases = {
        eldercare: 'Elder Care',
        elderlycare: 'Elder Care',
        seniorcare: 'Elder Care',
        oldagecare: 'Elder Care',
        patientcare: 'Patient Care',
        postsurgerycare: 'Post Surgery Care',
        postoperationcare: 'Post Surgery Care',
        babycare: 'Baby Care',
        childcare: 'Baby Care',
        homeassistance: 'Home Assistance',
        homecare: 'Home Assistance',
        gdacaretaker: 'Home Assistance',
    };

    return aliases[normalized] || ['Elder Care', 'Patient Care', 'Post Surgery Care', 'Baby Care', 'Home Assistance']
        .find((serviceType) => serviceType.toLowerCase() === firstValue.toLowerCase());
};

const normalizeProviderCategory = (value) => {
    const raw = String(value || '').trim();
    const lower = raw.toLowerCase();
    if (!raw) return raw;
    if (lower === 'care taker' || lower === 'caretaker') return 'Caretaker';
    if (lower === 'physiotherapist' || lower === 'physiotherapy') return 'Physiotherapist';
    if (lower === 'nurse') return 'Nurse';
    if (lower === 'lab technician' || lower === 'lab') return 'Lab Technician';
    if (lower === 'ambulance') return 'Ambulance';
    if (lower === 'doctor') return 'Doctor';
    return raw;
};

const validObjectIds = (values) => (Array.isArray(values) ? values : [])
    .map((value) => String(value?._id || value || '').trim())
    .filter((value) => mongoose.Types.ObjectId.isValid(value));

// Auto-create notification
const createAutoNotification = async (type, title, message, relatedData = {}) => {
    try {
        // Get all admin users
        const admins = await User.find({ role: 'admin' }, '_id');
        const adminIds = admins.map(admin => admin._id);

        await Notification.create({
            title,
            message,
            type,
            recipient: 'admin',
            recipientIds: adminIds,
            relatedUser: relatedData.userId,
            relatedProvider: relatedData.providerId,
            relatedAppointment: relatedData.appointmentId,
            relatedPayment: relatedData.paymentId,
            priority: relatedData.priority || 'medium',
        });
    } catch (error) {
        console.error('Auto-notification creation error:', error);
    }
};

// ============================================
// DASHBOARD APIs
// ============================================

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
export const getDashboardStats = async (req, res) => {
    try {
        // Calculate growth percentages (last 30 days vs previous 30 days)
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Total counts
        const totalPatients = await User.countDocuments({ role: 'patient' });
        const totalProviders = await Provider.countDocuments({ status: 'approved' });
        const totalAppointments = await Appointment.countDocuments();

        // Revenue calculation - Platform's share (platformRevenue)
        const revenueData = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    platformRevenue: { $sum: '$platformRevenue' },
                    providerRevenue: { $sum: '$providerAmount' },
                    totalCommission: { $sum: '$platformCommission' },
                    totalGST: { $sum: '$gstAmount' },
                }
            }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
        const platformRevenue = revenueData.length > 0 ? revenueData[0].platformRevenue : 0;
        const providerRevenue = revenueData.length > 0 ? revenueData[0].providerRevenue : 0;

        // Growth calculations
        const patientsLast30 = await User.countDocuments({
            role: 'patient',
            createdAt: { $gte: last30Days }
        });
        const patientsPrevious30 = await User.countDocuments({
            role: 'patient',
            createdAt: { $gte: previous30Days, $lt: last30Days }
        });
        const patientsGrowth = patientsPrevious30 > 0
            ? ((patientsLast30 - patientsPrevious30) / patientsPrevious30 * 100).toFixed(1)
            : 0;

        const providersLast30 = await Provider.countDocuments({
            status: 'approved',
            createdAt: { $gte: last30Days }
        });
        const providersPrevious30 = await Provider.countDocuments({
            status: 'approved',
            createdAt: { $gte: previous30Days, $lt: last30Days }
        });
        const providersGrowth = providersPrevious30 > 0
            ? ((providersLast30 - providersPrevious30) / providersPrevious30 * 100).toFixed(1)
            : 0;

        const appointmentsLast30 = await Appointment.countDocuments({
            createdAt: { $gte: last30Days }
        });
        const appointmentsPrevious30 = await Appointment.countDocuments({
            createdAt: { $gte: previous30Days, $lt: last30Days }
        });
        const appointmentsGrowth = appointmentsPrevious30 > 0
            ? ((appointmentsLast30 - appointmentsPrevious30) / appointmentsPrevious30 * 100).toFixed(1)
            : 0;

        const revenueLast30Data = await Payment.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: last30Days } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const revenueLast30 = revenueLast30Data.length > 0 ? revenueLast30Data[0].total : 0;

        const revenuePrevious30Data = await Payment.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: previous30Days, $lt: last30Days } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const revenuePrevious30 = revenuePrevious30Data.length > 0 ? revenuePrevious30Data[0].total : 0;
        const revenueGrowth = revenuePrevious30 > 0
            ? ((revenueLast30 - revenuePrevious30) / revenuePrevious30 * 100).toFixed(1)
            : 0;

        // Pending provider approvals
        const pendingProviders = await Provider.find({ status: 'pending' })
            .populate('userId', 'name email')
            .limit(5)
            .sort({ createdAt: -1 });

        // Recent appointments
        const recentAppointments = await Appointment.find()
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .limit(5)
            .sort({ createdAt: -1 });

        // Platform overview
        const avgRatingData = await Review.aggregate([
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);
        const averageRating = avgRatingData.length > 0 ? avgRatingData[0].avgRating.toFixed(1) : 4.8;

        res.status(200).json({
            success: true,
            data: {
                quickStats: {
                    totalPatients: {
                        count: totalPatients,
                        growth: `+${patientsGrowth}%`
                    },
                    totalProviders: {
                        count: totalProviders,
                        growth: `+${providersGrowth}%`
                    },
                    appointments: {
                        count: totalAppointments,
                        growth: `+${appointmentsGrowth}%`
                    },
                    revenue: {
                        total: totalRevenue,
                        platformShare: platformRevenue,
                        providerShare: providerRevenue,
                        growth: `+${revenueGrowth}%`,
                        currency: '₹'
                    }
                },
                pendingProviders,
                recentAppointments,
                platformOverview: {
                    citiesCovered: 28,
                    averageRating: parseFloat(averageRating),
                    satisfaction: 95,
                    support: '24/7'
                }
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching dashboard statistics',
            error: error.message,
        });
    }
};

// ============================================
// USERS MANAGEMENT APIs
// ============================================

// @desc    Get all users with search and pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getAllUsers = async (req, res) => {
    try {
        const { search, role, page = 1, limit = 10 } = req.query;

        let filter = {};

        // Filter by role if specified
        if (role) {
            filter.role = role;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const total = await User.countDocuments(filter);

        let users = await User.find(filter)
            .select('-password -otp')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // If filtering by provider role, populate provider profile
        if (role === 'provider') {
            const usersWithProviderInfo = await Promise.all(
                users.map(async (user) => {
                    const provider = await Provider.findOne({ userId: user._id });
                    return {
                        ...user.toObject(),
                        providerProfile: provider || null
                    };
                })
            );
            users = usersWithProviderInfo;
        }

        // If filtering by patient role, populate patient profile
        if (role === 'patient') {
            const usersWithPatientInfo = await Promise.all(
                users.map(async (user) => {
                    const patientProfile = await PatientProfile.findOne({ userId: user._id });
                    return {
                        ...user.toObject(),
                        patientProfile: patientProfile || null
                    };
                })
            );
            users = usersWithPatientInfo;
        }

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            users: users.map(user => ({
                _id: user._id || user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                profileImage: user.profileImage,
                isVerified: user.isVerified,
                isSuspended: user.isSuspended,
                suspension: user.suspension,
                location: user.location,
                providerProfile: user.providerProfile || null,
                patientProfile: user.patientProfile || null,
                createdAt: user.createdAt
            }))
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users',
            error: error.message,
        });
    }
};

// @desc    Get user details by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
export const getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -otp');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // If user is a provider, fetch provider profile
        let providerProfile = null;
        if (user.role === 'provider') {
            providerProfile = await Provider.findOne({ userId: user._id });
        }

        // If user is a patient, fetch patient profile
        let patientProfile = null;
        if (user.role === 'patient') {
            patientProfile = await PatientProfile.findOne({ userId: user._id });
            // Create profile if doesn't exist
            if (!patientProfile) {
                patientProfile = await PatientProfile.create({ userId: user._id });
            }
        }

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                profileImage: user.profileImage,
                location: user.location,
                role: user.role,
                isVerified: user.isVerified,
                isSuspended: user.isSuspended,
                suspension: user.suspension,
                providerDocuments: user.providerDocuments,
                createdAt: user.createdAt,
                providerProfile: providerProfile,
                patientProfile: patientProfile
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user details',
            error: error.message,
        });
    }
};

// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
export const updateUser = async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if email is already taken
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use',
                });
            }
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.mobile = phone;
        if (role && ['patient', 'admin'].includes(role)) user.role = role;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.mobile,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user',
            error: error.message,
        });
    }
};

// @desc    Toggle user status (Active/Inactive)
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private (Admin only)
export const toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        user.isVerified = !user.isVerified;
        await user.save();

        // Auto-create notification
        await createAutoNotification(
            'user_status_changed',
            'User Status Updated',
            `${user.name}'s account status changed to ${user.isVerified ? 'Active' : 'Inactive'}`,
            { userId: user._id, priority: 'low' }
        );

        res.status(200).json({
            success: true,
            message: `User status updated to ${user.isVerified ? 'Active' : 'Inactive'}`,
            data: {
                id: user._id,
                status: user.isVerified ? 'Active' : 'Inactive'
            }
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user status',
            error: error.message,
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Prevent deleting admin users
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin users',
            });
        }

        // If patient, delete patient-related data
        if (user.role === 'patient') {
            await Appointment.deleteMany({ patientId: user._id });
            await Review.deleteMany({ patientId: user._id });
            await MedicalRecord.deleteMany({ patientId: user._id });
            await Payment.deleteMany({ patientId: user._id });
        }

        if (user.role === 'provider') {
            const provider = await Provider.findOne({ userId: user._id }).select('_id');
            if (provider) {
                await Appointment.deleteMany({ providerId: provider._id });
                await Review.deleteMany({ providerId: provider._id });
                await MedicalRecord.deleteMany({ providerId: provider._id });
                await Payment.deleteMany({ providerId: provider._id });
                await Provider.findByIdAndDelete(provider._id);
            }
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user',
            error: error.message,
        });
    }
};

// ============================================
// PROVIDERS MANAGEMENT APIs
// ============================================

// @desc    Get all providers with filters
// @route   GET /api/admin/providers
// @access  Private (Admin only)
export const getAllProviders = async (req, res) => {
    try {
        const { search, status, category, page = 1, limit = 12 } = req.query;

        let filter = {};

        if (status) filter.status = status;
        if (category) filter.category = { $in: [category, normalizeProviderCategory(category)] };

        const skip = (page - 1) * limit;

        let providers = await Provider.find(filter)
            .populate('userId', 'name email mobile')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Apply search filter if provided
        if (search) {
            providers = providers.filter(provider =>
                provider.userId.name.toLowerCase().includes(search.toLowerCase()) ||
                provider.specialization.toLowerCase().includes(search.toLowerCase()) ||
                normalizeProviderCategory(provider.category).toLowerCase().includes(search.toLowerCase())
            );
        }

        // Add rating data to all providers
        providers = await Promise.all(providers.map(async (provider) => {
            await ensureProviderLabCode(provider);
            return addRatingData(provider);
        }));

        const total = await Provider.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: providers.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            providers: providers.map(provider => ({
                _id: provider._id,
                userId: {
                    _id: provider.userId._id,
                    name: provider.userId.name,
                    email: provider.userId.email,
                    mobile: provider.userId.mobile,
                },
                specialization: provider.specialization,
                category: normalizeProviderCategory(provider.category),
                labCode: provider.labCode,
                labName: provider.labName,
                labServiceType: provider.labServiceType,
                availableTests: provider.availableTests,
                homeSampleCollection: provider.homeSampleCollection,
                labExperience: provider.labExperience,
                labServiceArea: provider.labServiceArea,
                reportDeliveryTime: provider.reportDeliveryTime,
                certificationStatus: provider.certificationStatus,
                contactPersonName: provider.contactPersonName,
                labContactNumber: provider.labContactNumber,
                experience: provider.experience || 0,
                fees: provider.fees,
                status: provider.status,
                rejectionReason: provider.rejectionReason,
                aadharImages: provider.aadharImages,
            documentation: provider.documentation,
            physiotherapyServiceIds: provider.physiotherapyServiceIds,
            physiotherapyAddonIds: provider.physiotherapyAddonIds,
            physiotherapyServicePricing: provider.physiotherapyServicePricing,
            physiotherapyAddonPricing: provider.physiotherapyAddonPricing,
            nurseServiceIds: provider.nurseServiceIds,
            nurseAddonIds: provider.nurseAddonIds,
            nurseServicePricing: provider.nurseServicePricing,
            nurseAddonPricing: provider.nurseAddonPricing,
            caretakerServiceIds: provider.caretakerServiceIds,
            caretakerAddonIds: provider.caretakerAddonIds,
            caretakerServicePricing: provider.caretakerServicePricing,
            caretakerAddonPricing: provider.caretakerAddonPricing,
                address: provider.address,
                bio: provider.bio,
                rating: provider.rating,
                averageRating: provider.averageRating,
                totalReviews: provider.totalReviews,
                createdAt: provider.createdAt
            }))
        });
    } catch (error) {
        console.error('Get all providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching providers',
            error: error.message,
        });
    }
};

// @desc    Update provider details (including documents)
// @route   PUT /api/admin/providers/:id
// @access  Private (Admin only)
export const updateProviderDetails = async (req, res) => {
    try {
        let provider = await Provider.findById(req.params.id).populate('userId', 'name email mobile');
        if (!provider) {
            // Fallback: try finding by userId
            provider = await Provider.findOne({ userId: req.params.id }).populate('userId', 'name email mobile');
            
            if (!provider) {
                return res.status(404).json({
                    success: false,
                    message: 'Provider not found',
                });
            }
        }

        // Only allow specific fields to be updated
        const {
            category,
            specialization,
            qualification,
            fees,
            experience,
            address,
            aadharImages,
            documentation,
            bio,
            profileImage,
            labServiceType,
            labName,
            location,
            availability,
            availabilityStatus,
            status,
            physiotherapyServiceIds,
            physiotherapyAddonIds,
            physiotherapyServicePricing,
            physiotherapyAddonPricing,
            nurseServiceIds,
            nurseAddonIds,
            nurseServicePricing,
            nurseAddonPricing,
            caretakerServiceIds,
            caretakerAddonIds,
            caretakerServicePricing,
            caretakerAddonPricing,
        } = req.body || {};

        if (category !== undefined) provider.category = String(category || '').trim();
        if (specialization !== undefined) provider.specialization = String(specialization || '').trim() || provider.specialization;
        if (qualification !== undefined) provider.qualification = String(qualification || '').trim() || 'N/A';
        if (fees !== undefined) provider.fees = Math.max(0, Number(fees) || 0);
        if (experience !== undefined) provider.experience = Math.max(0, Number(experience) || 0);
        if (address !== undefined) provider.address = address;
        if (Array.isArray(aadharImages)) provider.aadharImages = aadharImages;
        if (Array.isArray(documentation)) provider.documentation = documentation;
        if (bio !== undefined) provider.bio = bio;
        if (profileImage !== undefined) provider.profileImage = profileImage;
        if (labServiceType !== undefined) {
            const normalizedType = normalizeLabServiceType(labServiceType);
            if (normalizedType) provider.labServiceType = normalizedType;
        } else if (provider.labServiceType) {
            const normalizedType = normalizeLabServiceType(provider.labServiceType);
            if (normalizedType) provider.labServiceType = normalizedType;
        }
        if (labName !== undefined) provider.labName = String(labName || '').trim();
        if (location !== undefined) provider.location = location;
        if (Array.isArray(availability)) provider.availability = availability;
        if (availabilityStatus !== undefined) provider.availabilityStatus = availabilityStatus;
        if (status !== undefined) provider.status = status;
        if (['Caretaker', 'Care Taker'].includes(provider.category)) {
            const caretakerType = normalizeCaretakerServiceType(specialization ?? provider.specialization ?? provider.caretakerServiceType);
            if (caretakerType) provider.caretakerServiceType = caretakerType;
        }
        if (provider.category === 'Physiotherapist' && Array.isArray(physiotherapyServiceIds)) {
            const serviceIds = validObjectIds(physiotherapyServiceIds);
            const activeServices = await PhysiotherapyService.find({
                _id: { $in: serviceIds },
                isActive: true,
            }).select('_id');
            provider.physiotherapyServiceIds = activeServices.map((service) => service._id);
        }
        if (provider.category === 'Physiotherapist' && Array.isArray(physiotherapyAddonIds)) {
            const addonIds = validObjectIds(physiotherapyAddonIds);
            const activeAddons = await PhysiotherapyAddon.find({
                _id: { $in: addonIds },
                isActive: true,
            }).select('_id');
            provider.physiotherapyAddonIds = activeAddons.map((addon) => addon._id);
        }
        if (provider.category === 'Physiotherapist' && Array.isArray(physiotherapyServicePricing)) {
            const offered = new Set((provider.physiotherapyServiceIds || []).map((id) => String(id)));
            provider.physiotherapyServicePricing = physiotherapyServicePricing
                .filter((item) => mongoose.Types.ObjectId.isValid(String(item.serviceId || '')) && offered.has(String(item.serviceId)) && Number(item.customPrice) >= 0)
                .map((item) => ({ serviceId: item.serviceId, customPrice: Number(item.customPrice) }));
        }
        if (provider.category === 'Physiotherapist' && Array.isArray(physiotherapyAddonPricing)) {
            const offered = new Set((provider.physiotherapyAddonIds || []).map((id) => String(id)));
            provider.physiotherapyAddonPricing = physiotherapyAddonPricing
                .filter((item) => mongoose.Types.ObjectId.isValid(String(item.addonId || '')) && offered.has(String(item.addonId)) && Number(item.customPrice) >= 0)
                .map((item) => ({ addonId: item.addonId, customPrice: Number(item.customPrice) }));
        }
        if (provider.category === 'Nurse' && Array.isArray(nurseServiceIds)) {
            const serviceIds = validObjectIds(nurseServiceIds);
            const activeServices = await NurseService.find({
                _id: { $in: serviceIds },
                isActive: true,
            }).select('_id');
            provider.nurseServiceIds = activeServices.map((service) => service._id);
        }
        if (provider.category === 'Nurse' && Array.isArray(nurseAddonIds)) {
            const addonIds = validObjectIds(nurseAddonIds);
            const activeAddons = await NurseAddon.find({
                _id: { $in: addonIds },
                isActive: true,
            }).select('_id');
            provider.nurseAddonIds = activeAddons.map((addon) => addon._id);
        }
        if (provider.category === 'Nurse' && Array.isArray(nurseServicePricing)) {
            const offered = new Set((provider.nurseServiceIds || []).map((id) => String(id)));
            provider.nurseServicePricing = nurseServicePricing
                .filter((item) => mongoose.Types.ObjectId.isValid(String(item.serviceId || '')) && offered.has(String(item.serviceId)) && Number(item.customPrice) >= 0)
                .map((item) => ({ serviceId: item.serviceId, customPrice: Number(item.customPrice) }));
        }
        if (provider.category === 'Nurse' && Array.isArray(nurseAddonPricing)) {
            const offered = new Set((provider.nurseAddonIds || []).map((id) => String(id)));
            provider.nurseAddonPricing = nurseAddonPricing
                .filter((item) => mongoose.Types.ObjectId.isValid(String(item.addonId || '')) && offered.has(String(item.addonId)) && Number(item.customPrice) >= 0)
                .map((item) => ({ addonId: item.addonId, customPrice: Number(item.customPrice) }));
        }
        if (['Caretaker', 'Care Taker'].includes(provider.category) && Array.isArray(caretakerServiceIds)) {
            const activeServices = await CaretakerService.find({ _id: { $in: validObjectIds(caretakerServiceIds) }, isActive: true }).select('_id');
            provider.caretakerServiceIds = activeServices.map((service) => service._id);
        }
        if (['Caretaker', 'Care Taker'].includes(provider.category) && Array.isArray(caretakerAddonIds)) {
            const activeAddons = await CaretakerAddon.find({ _id: { $in: validObjectIds(caretakerAddonIds) }, isActive: true }).select('_id');
            provider.caretakerAddonIds = activeAddons.map((addon) => addon._id);
        }
        if (['Caretaker', 'Care Taker'].includes(provider.category) && Array.isArray(caretakerServicePricing)) {
            const offered = new Set((provider.caretakerServiceIds || []).map((id) => String(id)));
            provider.caretakerServicePricing = caretakerServicePricing.filter((item) => mongoose.Types.ObjectId.isValid(String(item.serviceId || '')) && offered.has(String(item.serviceId)) && Number(item.customPrice) >= 0)
                .map((item) => ({ serviceId: item.serviceId, customPrice: Number(item.customPrice) }));
        }
        if (['Caretaker', 'Care Taker'].includes(provider.category) && Array.isArray(caretakerAddonPricing)) {
            const offered = new Set((provider.caretakerAddonIds || []).map((id) => String(id)));
            provider.caretakerAddonPricing = caretakerAddonPricing.filter((item) => mongoose.Types.ObjectId.isValid(String(item.addonId || '')) && offered.has(String(item.addonId)) && Number(item.customPrice) >= 0)
                .map((item) => ({ addonId: item.addonId, customPrice: Number(item.customPrice) }));
        }

        await provider.save();

        res.status(200).json({
            success: true,
            message: 'Provider updated successfully',
            provider: provider,
        });
    } catch (error) {
        console.error('Update provider details error:', error);
        const validationMessage = error?.name === 'ValidationError'
            ? Object.values(error.errors || {}).map((item) => item.message).join(', ')
            : error.message;
        res.status(500).json({
            success: false,
            message: validationMessage || 'Server error while updating provider',
            error: error.message,
        });
    }
};

// @desc    Get provider details
// @route   GET /api/admin/providers/:id
// @access  Private (Admin only)
export const getProviderDetails = async (req, res) => {
    try {
        let provider = await Provider.findById(req.params.id).populate('userId', 'name email mobile');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        // Authorization check - only admin can access provider details
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }

        // Add rating data
        await ensureProviderLabCode(provider);
        provider = await addRatingData(provider);

        res.status(200).json({
            success: true,
            provider: {
                _id: provider._id,
                userId: {
                    _id: provider.userId._id,
                    name: provider.userId.name,
                    email: provider.userId.email,
                    mobile: provider.userId.mobile,
                },
                specialization: provider.specialization,
                category: normalizeProviderCategory(provider.category),
                labCode: provider.labCode,
                labName: provider.labName,
                labServiceType: provider.labServiceType,
                availableTests: provider.availableTests,
                homeSampleCollection: provider.homeSampleCollection,
                labExperience: provider.labExperience,
                labServiceArea: provider.labServiceArea,
                reportDeliveryTime: provider.reportDeliveryTime,
                certificationStatus: provider.certificationStatus,
                contactPersonName: provider.contactPersonName,
                labContactNumber: provider.labContactNumber,
                experience: provider.experience || 0,
                fees: provider.fees,
                status: provider.status,
                rejectionReason: provider.rejectionReason,
                aadharImages: provider.aadharImages,
                documentation: provider.documentation,
                address: provider.address,
                bio: provider.bio,
                physiotherapyServiceIds: provider.physiotherapyServiceIds,
                physiotherapyAddonIds: provider.physiotherapyAddonIds,
                physiotherapyServicePricing: provider.physiotherapyServicePricing,
                physiotherapyAddonPricing: provider.physiotherapyAddonPricing,
                nurseServiceIds: provider.nurseServiceIds,
                nurseAddonIds: provider.nurseAddonIds,
                nurseServicePricing: provider.nurseServicePricing,
                nurseAddonPricing: provider.nurseAddonPricing,
                caretakerServiceIds: provider.caretakerServiceIds,
                caretakerAddonIds: provider.caretakerAddonIds,
                caretakerServicePricing: provider.caretakerServicePricing,
                caretakerAddonPricing: provider.caretakerAddonPricing,
                availability: provider.availability,
                location: provider.location,
                rating: provider.rating,
                averageRating: provider.averageRating,
                totalReviews: provider.totalReviews,
                createdAt: provider.createdAt,
                updatedAt: provider.updatedAt
            }
        });
    } catch (error) {
        console.error('Get provider details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching provider details',
            error: error.message,
        });
    }
};
// @desc    Approve provider
// @route   PUT /api/admin/providers/:id/approve
// @access  Private (Admin only)
export const approveProvider = async (req, res) => {
    try {
        let provider = await Provider.findById(req.params.id).populate('userId', 'name email');
        if (!provider) {
            provider = await Provider.findOne({ userId: req.params.id }).populate('userId', 'name email');
            if (!provider) {
                return res.status(404).json({
                    success: false,
                    message: 'Provider not found',
                });
            }
        }

        if (provider.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Provider is not in pending status',
            });
        }

        provider.status = 'approved';
        provider.approvedAt = provider.approvedAt || new Date();
        provider.rejectionReason = undefined;
        await provider.save();

        // Update user verification status
        await User.findByIdAndUpdate(provider.userId, { isVerified: true });

        // Send approval email to provider
        await sendTemplateEmail({
            to: provider.userId.email,
            subject: '🎉 Your Provider Profile Has Been Approved!',
            template: 'providerApproval',
            data: {
                providerName: provider.userId.name,
            }
        });

        // Auto-create notification
        await createAutoNotification(
            'provider_approved',
            'Provider Approved',
            `${provider.userId.name} has been approved as a ${provider.category}`,
            { providerId: provider._id, userId: provider.userId._id, priority: 'high' }
        );

        res.status(200).json({
            success: true,
            message: 'Provider approved successfully. Approval email sent.',
            data: {
                id: provider._id,
                status: 'Active'
            }
        });
    } catch (error) {
        console.error('Approve provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while approving provider',
            error: error.message,
        });
    }
};

// @desc    Reject provider
// @route   PUT /api/admin/providers/:id/reject
// @access  Private (Admin only)
export const rejectProvider = async (req, res) => {
    try {
        const { reason } = req.body;
        const provider = await Provider.findById(req.params.id).populate('userId', 'name email');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        if (provider.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Provider is not in pending status',
            });
        }

        provider.status = 'rejected';
        provider.rejectionReason = reason || 'Application does not meet requirements';
        await provider.save();

        // Send rejection email to provider
        await sendTemplateEmail({
            to: provider.userId.email,
            subject: 'Provider Profile Update Required',
            template: 'providerRejection',
            data: {
                providerName: provider.userId.name,
                reason: provider.rejectionReason
            }
        });

        // Auto-create notification
        await createAutoNotification(
            'provider_rejected',
            'Provider Application Rejected',
            `${provider.userId.name}'s application as ${provider.category} has been rejected. Reason: ${provider.rejectionReason}`,
            { providerId: provider._id, userId: provider.userId._id, priority: 'medium' }
        );

        res.status(200).json({
            success: true,
            message: 'Provider rejected successfully. Rejection email sent.',
            data: {
                id: provider._id,
                status: 'Inactive'
            }
        });
    } catch (error) {
        console.error('Reject provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while rejecting provider',
            error: error.message,
        });
    }
};

// ============================================
// APPOINTMENTS MANAGEMENT APIs
// ============================================

// @desc    Get all appointments
// @route   GET /api/admin/appointments
// @access  Private (Admin only)
export const getAllAppointments = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;

        let filter = {};
        if (status) filter.status = status;

        const skip = (page - 1) * limit;

        let appointments = await Appointment.find(filter)
            .populate('patientId', 'name email mobile profileImage location')
            .populate({
                path: 'providerId',
                populate: [
                    { path: 'userId', select: 'name email mobile profileImage' }
                ]
            })
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Apply search filter
        if (search) {
            const normalizedSearch = search.toLowerCase();
            appointments = appointments.filter(apt =>
                (apt.patientId?.name || apt.patientName || '').toLowerCase().includes(normalizedSearch) ||
                (apt.serviceReceiver?.name || '').toLowerCase().includes(normalizedSearch) ||
                (apt.providerId?.userId?.name || '').toLowerCase().includes(normalizedSearch)
            );
        }

        const total = await Appointment.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: appointments.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            appointments: appointments // Return full appointment objects with populated data
        });
    } catch (error) {
        console.error('Get all appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching appointments',
            error: error.message,
        });
    }
};

// @desc    Get appointment by ID
// @route   GET /api/admin/appointments/:id
// @access  Private (Admin only)
export const getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'name email mobile')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name email' }
            });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                appointmentId: `#APT${appointment._id.toString().slice(-6).toUpperCase()}`,
                date: appointment.date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                time: appointment.timeSlot,
                patient: appointment.patientId.name,
                provider: `${appointment.providerId.userId.name} (${appointment.providerId.specialization})`,
                type: 'In-Home',
                status: appointment.status,
                reason: appointment.reason,
                notes: appointment.notes,
                cancellationReason: appointment.cancellationReason
            }
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

// @desc    Cancel appointment
// @route   PUT /api/admin/appointments/:id/cancel
// @access  Private (Admin only)
export const cancelAppointment = async (req, res) => {
    try {
        const { reason } = req.body;
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'name')
            .populate('providerId');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed appointment',
            });
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Appointment already cancelled',
            });
        }

        appointment.status = 'cancelled';
        appointment.cancelledBy = 'admin';
        appointment.cancellationReason = reason || 'Cancelled by admin';
        await appointment.save();

        // Auto-create notification
        await createAutoNotification(
            'appointment_cancelled',
            'Appointment Cancelled',
            `Appointment for ${appointment.patientId.name} has been cancelled by admin. Reason: ${appointment.cancellationReason}`,
            {
                appointmentId: appointment._id,
                userId: appointment.patientId._id,
                providerId: appointment.providerId._id,
                priority: 'high'
            }
        );

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled - Both parties will be notified',
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

// ============================================
// PAYMENTS MANAGEMENT APIs
// ============================================

const populatePaymentQuery = (query) => query
    .populate('patientId', 'name email mobile')
    .populate({
        path: 'providerId',
        populate: { path: 'userId', select: 'name email mobile' }
    })
    .populate('appointmentId');

const getProviderDisplayName = (payment) => (
    payment.providerId?.userId?.name
    || 'N/A'
);

const getBookingDisplayId = (payment) => (
    payment.appointmentId?._id
    || payment.appointmentId
    || ''
);

const getBookingServiceDetails = (payment) => {
    return payment.appointmentId?.reason || payment.bookingDetails?.reason || 'Appointment booking';
};

const normalizePayment = (payment) => {
    const plain = payment.toObject ? payment.toObject() : payment;
    return {
        ...plain,
        bookingId: getBookingDisplayId(payment),
        serviceDetails: getBookingServiceDetails(payment),
        providerName: getProviderDisplayName(payment),
        patientName: payment.patientId?.name || 'N/A',
    };
};

const buildAdminPaymentFilter = (query) => {
    const and = [];
    if (query.status && query.status !== 'all') {
        and.push({ status: query.status });
    }
    if (query.dateFrom || query.dateTo) {
        const createdAt = {};
        if (query.dateFrom) createdAt.$gte = new Date(query.dateFrom);
        if (query.dateTo) {
            const end = new Date(query.dateTo);
            end.setHours(23, 59, 59, 999);
            createdAt.$lte = end;
        }
        and.push({ createdAt });
    }
    return and.length ? { $and: and } : {};
};

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private (Admin only)
export const getAllPayments = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 25 } = req.query;
        const filter = buildAdminPaymentFilter(req.query);
        const normalizedSearch = String(search || '').toLowerCase().trim();

        let payments = await populatePaymentQuery(Payment.find(filter).sort({ createdAt: -1 }));

        if (normalizedSearch) {
            payments = payments.filter((payment) => {
                const haystack = [
                    payment.patientId?.name,
                    payment.patientId?.email,
                    getProviderDisplayName(payment),
                    payment.transactionId,
                    String(payment._id),
                    String(getBookingDisplayId(payment)),
                    getBookingServiceDetails(payment),
                ].filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(normalizedSearch);
            });
        }

        const total = payments.length;
        const parsedLimit = parseInt(limit);
        const skip = (parseInt(page) - 1) * parsedLimit;
        const paginatedPayments = payments.slice(skip, skip + parsedLimit);
        const completedPayments = payments.filter((payment) => payment.status === 'completed');
        const totalRevenue = completedPayments.reduce((sum, payment) => sum + Number(payment.payableAmount || payment.totalAmount || payment.amount || 0), 0);
        const platformRevenue = completedPayments.reduce((sum, payment) => sum + Number(payment.platformRevenue || 0), 0);

        res.status(200).json({
            success: true,
            count: paginatedPayments.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parsedLimit),
            stats: {
                totalRevenue,
                platformRevenue,
                completedPayments: completedPayments.length,
                pendingPayments: payments.filter((payment) => payment.status === 'pending').length,
                failedPayments: payments.filter((payment) => payment.status === 'failed').length,
            },
            payments: paginatedPayments.map(normalizePayment),
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching payments', error: error.message });
    }
};

// @desc    Get payment by ID
// @route   GET /api/admin/payments/:id
// @access  Private (Admin only)
export const getPaymentById = async (req, res) => {
    try {
        const payment = await populatePaymentQuery(Payment.findById(req.params.id));

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        res.status(200).json({ success: true, payment: normalizePayment(payment) });
    } catch (error) {
        console.error('Get payment by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching payment', error: error.message });
    }
};

// @desc    Download payment receipt
// @route   GET /api/admin/payments/:id/receipt
// @access  Private (Admin only)
export const downloadReceipt = async (req, res) => {
    return res.status(410).json({ success: false, message: 'Payment receipt download is not available' });
};

// @desc    Export payments to CSV
// @route   GET /api/admin/payments/export/csv
// @access  Private (Admin only)
export const exportPaymentsCSV = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('patientId', 'name email')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .sort({ createdAt: -1 });

        // Create CSV content
        let csv = 'Transaction ID,Date,Patient,Provider,Amount,Method,Status\n';

        payments.forEach(payment => {
            const transactionId = payment.transactionId || `TXN${payment._id.toString().slice(-9).toUpperCase()}`;
            const date = payment.createdAt.toLocaleDateString('en-US');
            const patient = payment.patientId.name;
            const provider = payment.providerId.userId.name;
            const amount = payment.amount;
            const method = payment.paymentMethod || 'Credit Card';
            const status = payment.status;

            csv += `${transactionId},${date},"${patient}","${provider}",₹${amount},${method},${status}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="payments-export.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Export payments CSV error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while exporting payments',
            error: error.message,
        });
    }
};

// ============================================
// NOTIFICATIONS MANAGEMENT APIs
// ============================================
// Note: Notifications are auto-generated by the system when:
// - Provider is approved/rejected
// - Appointment is created/cancelled
// - Payment is completed
// - User status is changed
// Admin can only VIEW and DELETE notifications

// @desc    Get all notifications
// @route   GET /api/admin/notifications
// @access  Private (Admin only)
export const getAllNotifications = async (req, res) => {
    try {
        const { search, type, page = 1, limit = 10 } = req.query;

        let filter = {};
        if (type) filter.type = type;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const total = await Notification.countDocuments(filter);

        const notifications = await Notification.find(filter)
            .populate('relatedUser', 'name email')
            .populate('relatedProvider', 'category specialization')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: notifications.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: notifications.map(notif => ({
                id: notif._id,
                title: notif.title,
                message: notif.message,
                type: notif.type,
                priority: notif.priority,
                isRead: notif.isRead,
                relatedUser: notif.relatedUser ? {
                    id: notif.relatedUser._id,
                    name: notif.relatedUser.name,
                    email: notif.relatedUser.email
                } : null,
                date: notif.createdAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                time: notif.createdAt.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                createdAt: notif.createdAt
            }))
        });
    } catch (error) {
        console.error('Get all notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching notifications',
            error: error.message,
        });
    }
};



// @desc    Delete notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private (Admin only)
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
        }

        await Notification.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully',
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting notification',
            error: error.message,
        });
    }
};

// ============================================
// SUSPENSION MANAGEMENT APIs
// ============================================

// @desc    Suspend user
// @route   PUT /api/admin/users/:id/suspend
// @access  Private (Admin only)
export const suspendUser = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reason for suspension',
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot suspend admin users',
            });
        }

        if (user.isSuspended) {
            return res.status(400).json({
                success: false,
                message: 'User is already suspended',
            });
        }

        // Update suspension status
        user.isSuspended = true;
        user.suspension = {
            reason,
            suspendedAt: new Date(),
            suspendedBy: req.user.id
        };
        await user.save();

        // Send suspension email
        await sendTemplateEmail({
            to: user.email,
            subject: '⚠️ Account Suspended - Action Required',
            template: 'suspensionNotice',
            data: {
                userName: user.name,
                reason,
                role: user.role
            }
        });

        // Create notification
        await createAutoNotification(
            'account_suspended',
            'Account Suspended',
            `Your account has been suspended. Reason: ${reason}`,
            { userId: user._id, priority: 'high' }
        );

        res.status(200).json({
            success: true,
            message: 'User suspended successfully. Suspension email sent.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isSuspended: true,
                suspension: user.suspension
            }
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while suspending user',
            error: error.message,
        });
    }
};

// @desc    Unsuspend user
// @route   PUT /api/admin/users/:id/unsuspend
// @access  Private (Admin only)
export const unsuspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!user.isSuspended) {
            return res.status(400).json({
                success: false,
                message: 'User is not suspended',
            });
        }

        // Clear suspension
        user.isSuspended = false;
        user.suspension = undefined;
        await user.save();

        // Send reactivation email
        await sendTemplateEmail({
            to: user.email,
            subject: '✅ Account Reactivated - Welcome Back!',
            template: 'accountReactivation',
            data: {
                userName: user.name,
                role: user.role
            }
        });

        // Create notification
        await createAutoNotification(
            'account_reactivated',
            'Account Reactivated',
            'Your account has been reactivated. You now have full access.',
            { userId: user._id, priority: 'high' }
        );

        res.status(200).json({
            success: true,
            message: 'User unsuspended successfully. Reactivation email sent.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isSuspended: false
            }
        });
    } catch (error) {
        console.error('Unsuspend user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while unsuspending user',
            error: error.message,
        });
    }
};

// @desc    Suspend provider
// @route   PUT /api/admin/providers/:id/suspend
// @access  Private (Admin only)
export const suspendProvider = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reason for suspension',
            });
        }

        const provider = await Provider.findById(req.params.id).populate('userId', 'name email');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        const user = await User.findById(provider.userId._id);

        if (user.isSuspended) {
            return res.status(400).json({
                success: false,
                message: 'Provider is already suspended',
            });
        }

        // Suspend the user account
        user.isSuspended = true;
        user.suspension = {
            reason,
            suspendedAt: new Date(),
            suspendedBy: req.user.id
        };
        await user.save();

        // Cancel all pending appointments
        await Appointment.updateMany(
            { providerId: provider._id, status: 'pending' },
            { status: 'cancelled', cancellationReason: 'Provider account suspended' }
        );

        // Send suspension email
        await sendTemplateEmail({
            to: provider.userId.email,
            subject: '⚠️ Provider Account Suspended',
            template: 'suspensionNotice',
            data: {
                userName: provider.userId.name,
                reason,
                role: 'provider'
            }
        });

        // Create notification
        await createAutoNotification(
            'provider_suspended',
            'Provider Account Suspended',
            `Provider account suspended. Reason: ${reason}`,
            { providerId: provider._id, userId: user._id, priority: 'high' }
        );

        res.status(200).json({
            success: true,
            message: 'Provider suspended successfully. All pending appointments cancelled. Suspension email sent.',
            provider: {
                _id: provider._id,
                name: provider.userId.name,
                isSuspended: true,
                suspension: user.suspension
            }
        });
    } catch (error) {
        console.error('Suspend provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while suspending provider',
            error: error.message,
        });
    }
};

// @desc    Unsuspend provider
// @route   PUT /api/admin/providers/:id/unsuspend
// @access  Private (Admin only)
export const unsuspendProvider = async (req, res) => {
    try {
        const provider = await Provider.findById(req.params.id).populate('userId', 'name email');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        const user = await User.findById(provider.userId._id);

        if (!user.isSuspended) {
            return res.status(400).json({
                success: false,
                message: 'Provider is not suspended',
            });
        }

        // Clear suspension
        user.isSuspended = false;
        user.suspension = undefined;
        await user.save();

        // Send reactivation email
        await sendTemplateEmail({
            to: provider.userId.email,
            subject: '✅ Provider Account Reactivated',
            template: 'accountReactivation',
            data: {
                userName: provider.userId.name,
                role: 'provider'
            }
        });

        // Create notification
        await createAutoNotification(
            'provider_reactivated',
            'Provider Account Reactivated',
            'Your provider account has been reactivated.',
            { providerId: provider._id, userId: user._id, priority: 'high' }
        );

        res.status(200).json({
            success: true,
            message: 'Provider unsuspended successfully. Reactivation email sent.',
            provider: {
                _id: provider._id,
                name: provider.userId.name,
                isSuspended: false
            }
        });
    } catch (error) {
        console.error('Unsuspend provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while unsuspending provider',
            error: error.message,
        });
    }
};


