import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { uploadMultipleToCloudinary } from '../utils/uploadToCloudinary.js';
import { sortProvidersByDistance } from '../utils/distanceCalculator.js';
import { ensureProviderLabCode } from '../utils/labCode.js';
import PhysiotherapyService from '../models/PhysiotherapyService.js';
import PhysiotherapyAddon from '../models/PhysiotherapyAddon.js';
import NurseService from '../models/NurseService.js';
import NurseAddon from '../models/NurseAddon.js';
import CaretakerService from '../models/CaretakerService.js';
import CaretakerAddon from '../models/CaretakerAddon.js';
import crypto from 'crypto';

// Valid provider categories
const VALID_CATEGORIES = ['Doctor', 'Nurse', 'Physiotherapist', 'Lab Technician', 'Ambulance', 'Caretaker'];

const parseStringArray = (value) => {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value.flatMap(parseStringArray).filter(Boolean);
    const text = String(value).trim();
    if (!text) return [];
    if (text.startsWith('[')) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
        } catch {
            // Fall through to comma parsing.
        }
    }
    return text.split(',').map((item) => item.trim()).filter(Boolean);
};

const parseObjectIdArray = (value) => parseStringArray(value)
    .filter((item) => /^[a-f\d]{24}$/i.test(item));

const parseAddressValue = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return { street: value, city: '', state: '', pincode: '' };
    }
};

const buildAddressFromLocation = (location) => {
    const addressText = typeof location?.address === 'string' ? location.address.trim() : '';
    return addressText ? { street: addressText, city: '', state: '', pincode: '' } : null;
};

const normalizeProviderCreateData = (providerData = {}) => {
    const normalized = { ...providerData };
    Object.keys(normalized).forEach((key) => {
        if (normalized[key] === '') delete normalized[key];
    });

    const keepAllowed = (key, allowed) => {
        if (normalized[key] === undefined) return;
        const value = String(normalized[key]).trim();
        const match = allowed.find((item) => item.toLowerCase() === value.toLowerCase());
        if (match) normalized[key] = match;
        else delete normalized[key];
    };

    if (normalized.medicalEquipment !== undefined) {
        const allowedEquipment = ['Oxygen Cylinder', 'Ventilator', 'Cardiac Monitor', 'Stretcher', 'First Aid Kit'];
        const values = parseStringArray(normalized.medicalEquipment)
            .map((value) => allowedEquipment.find((item) => item.toLowerCase() === String(value).toLowerCase()))
            .filter(Boolean);
        if (values.length) normalized.medicalEquipment = values;
        else delete normalized.medicalEquipment;
    }

    ['serviceArea', 'availableTests', 'languagesKnown', 'availableServiceArea'].forEach((key) => {
        if (normalized[key] === undefined) return;
        const values = parseStringArray(normalized[key]);
        if (values.length) normalized[key] = values;
        else delete normalized[key];
    });

    if (normalized.category === 'Ambulance' && (!Array.isArray(normalized.documentation) || normalized.documentation.length === 0)) {
        const ambulanceDocuments = [
            normalized.rcDocument,
            normalized.driverLicenseDocument,
            normalized.ambulancePhoto,
            normalized.panCardPhoto,
            normalized.cancelledChequePhoto,
            normalized.policeVerificationDocument,
        ].filter(Boolean);

        if (ambulanceDocuments.length) {
            normalized.documentation = ambulanceDocuments;
        }
    }

    if (normalized.availabilityDays !== undefined) {
        const days = parseStringArray(normalized.availabilityDays);
        if (days.length) {
            normalized.availability = days.map((day) => ({
                day,
                startTime: normalized.availabilityStartTime || '09:00',
                endTime: normalized.availabilityEndTime || '18:00',
            }));
        }
        delete normalized.availabilityDays;
        delete normalized.availabilityStartTime;
        delete normalized.availabilityEndTime;
    }

    keepAllowed('ambulanceType', [
        'Basic Life Support (BLS) Ambulance',
        'Advanced Life Support (ALS) Ambulance',
        'ICU Ambulance',
        'Dead Body Transport Ambulance',
    ]);
    keepAllowed('availabilityType', ['24/7 Available', 'Day Time Only', 'Night Time Only']);
    if (normalized.policeVerificationStatus !== undefined) {
        const value = String(normalized.policeVerificationStatus).trim();
        normalized.policeVerificationStatus = value.toLowerCase().includes('done')
            ? 'Done'
            : (['Not Done', 'Ready to Apply'].includes(value) ? value : undefined);
        if (!normalized.policeVerificationStatus) delete normalized.policeVerificationStatus;
    }
    keepAllowed('labServiceType', ['Pathology Centre (Lab)', 'Radiology Centre (Lab)', 'Both']);
    keepAllowed('homeSampleCollection', ['Yes', 'No']);
    keepAllowed('labExperience', ['0-1 Year', '1-3 Years', '3+ Years']);
    keepAllowed('reportDeliveryTime', ['Same Day', 'Next Day', '2-3 Days']);
    keepAllowed('certificationStatus', ['NABL Certified', 'Not Certified', 'In Process']);
    keepAllowed('caretakerServiceType', ['Elder Care', 'Patient Care', 'Post Surgery Care', 'Baby Care', 'Home Assistance']);
    keepAllowed('gender', ['Male', 'Female', 'Other', 'male', 'female', 'other']);

    ['fees', 'experience', 'age'].forEach((key) => {
        if (normalized[key] === undefined) return;
        const value = Number(normalized[key]);
        if (Number.isFinite(value)) normalized[key] = value;
        else delete normalized[key];
    });

    normalized.address = parseAddressValue(normalized.address) || buildAddressFromLocation(normalized.location) || normalized.address;

    return normalized;
};

const findPendingRegistrationForUser = async (user) => {
    const filters = [];
    if (user.email) filters.push({ email: user.email });
    if (user.mobile) filters.push({ mobile: user.mobile });
    if (!filters.length) return null;
    return PendingRegistration.findOne({ role: 'provider', $or: filters }).sort({ createdAt: -1 });
};

const recoverProviderProfile = async (user) => {
    const pending = await findPendingRegistrationForUser(user);
    const providerDocuments = pending?.providerDocuments || user.providerDocuments || {};
    const aadharImages = providerDocuments.aadharImages || [];
    const documentation = providerDocuments.documentation || [];
    const category = user.category || pending?.category;

    if (!category || !aadharImages.length || !documentation.length) return null;

    const providerCreateData = {
        userId: user._id,
        aadharImages,
        documentation,
        status: 'pending',
        category,
        specialization: pending?.specialization || category,
        fees: pending?.extraData?.fees || pending?.extraData?.baseCharges || 0,
        experience: pending?.extraData?.experience || 0,
        location: pending?.location || user.location,
    };

    const singleFiles = [
        'rcDocument', 'driverLicenseDocument', 'ambulancePhoto',
        'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument',
        'labRegistrationCertificate', 'profileImage',
    ];
    singleFiles.forEach((field) => {
        if (providerDocuments[field]) providerCreateData[field] = providerDocuments[field];
    });
    if (providerDocuments.nablCertificate) providerCreateData.nablCertificate = providerDocuments.nablCertificate;

    if (pending?.extraData) Object.assign(providerCreateData, pending.extraData);

    const provider = await Provider.create(normalizeProviderCreateData(providerCreateData));
    if (pending?._id) await PendingRegistration.findByIdAndDelete(pending._id);
    return provider;
};

// Helper function to add rating data to provider
const addRatingData = async (provider) => {
    const reviews = await Review.find({ providerId: provider._id });
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 4;
    
    // Convert to plain object and add rating data
    const providerObj = provider.toObject ? provider.toObject() : provider;
    providerObj.averageRating = parseFloat(averageRating.toFixed(1));
    providerObj.totalReviews = totalReviews;
    providerObj._averageRating = parseFloat(averageRating.toFixed(1));
    providerObj._totalReviews = totalReviews;
    providerObj.rating = parseFloat(averageRating.toFixed(1));
    
    return providerObj;
};

const sanitizePublicProvider = (provider) => {
    const publicProvider = { ...provider };
    [
        'aadharImages',
        'documentation',
        'rcDocument',
        'driverLicenseDocument',
        'panCardPhoto',
        'bankAccountNumber',
        'bankIfscCode',
        'cancelledChequePhoto',
        'policeVerificationDocument',
        'driverLicenseNumber',
        'driverMobileNo',
        'labContactNumber',
        'labEmergencyContactNumber',
    ].forEach((field) => delete publicProvider[field]);

    if (publicProvider.userId) {
        publicProvider.userId = { ...publicProvider.userId };
        delete publicProvider.userId.email;
        delete publicProvider.userId.mobile;
        delete publicProvider.userId.providerDocuments;
    }

    return publicProvider;
};

const parsePricingArray = (value) => {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    }
    return Array.isArray(value) ? value : [];
};

const sanitizeServicePricing = (pricing, offeredIds, idKey = 'serviceId') => {
    const offered = new Set((offeredIds || []).map((id) => String(id)));
    return parsePricingArray(pricing)
        .filter((item) => offered.has(String(item[idKey])) && Number(item.customPrice) >= 0)
        .map((item) => ({ [idKey]: item[idKey], customPrice: Number(item.customPrice) }));
};

const generateReferralCodeForUser = async (name = 'HT') => {
    let code;
    let exists = true;

    while (exists) {
        const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        code = `${String(name).replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'HT'}${suffix}`;
        exists = await User.exists({ referralCode: code });
    }

    return code;
};

// @desc    Create provider profile
// @route   POST /api/provider/profile
// @access  Private (Provider only)
export const createProviderProfile = async (req, res) => {
    const {
        category,
        specialization,
        qualification,
        fees,
        availability,
        experience,
        bio
    } = req.body;
    const address = parseAddressValue(req.body.address) || buildAddressFromLocation(req.body.location);

    try {
        // Check if user is provider
        const user = await User.findById(req.user.id);
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only provider role can create provider profile',
            });
        }

        // Check if provider profile already exists
        const existingProvider = await Provider.findOne({ userId: req.user.id });
        if (existingProvider) {
            return res.status(400).json({
                success: false,
                message: 'Provider profile already exists',
            });
        }

        // Check if provider has uploaded required documents during registration
        if (!user.providerDocuments ||
            !user.providerDocuments.aadharImages ||
            user.providerDocuments.aadharImages.length === 0 ||
            !user.providerDocuments.documentation ||
            user.providerDocuments.documentation.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Provider documents not found. Please contact support.',
            });
        }

        // Validation - All required fields
        if (!category || !specialization || !fees || !experience || !bio) {
            return res.status(400).json({
                success: false,
                message: 'Please provide category, specialization, fees, experience, and bio',
            });
        }

        // Validate address fields
        if (!address || !address.street || !address.city || !address.state || !address.pincode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide complete address (street, city, state, pincode)',
            });
        }

        // Validate category
        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
            });
        }

        // Start with documentation from registration
        let allDocumentation = [...user.providerDocuments.documentation];
        let profileImageUrl = null;

        // Handle file uploads (profile image and additional documents)
        // req.files is an object when using upload.fields()
        if (req.files) {
            try {
                // Handle profile image upload
                if (req.files.profileImage && req.files.profileImage.length > 0) {
                    const profileImageFile = req.files.profileImage[0];
                    const imageBase64 = `data:${profileImageFile.mimetype};base64,${profileImageFile.buffer.toString('base64')}`;
                    const imageUpload = await uploadMultipleToCloudinary([imageBase64], 'provider-profiles');
                    if (imageUpload.success && imageUpload.urls.length > 0) {
                        profileImageUrl = imageUpload.urls[0];
                    }
                }

                // Handle additional documents upload
                if (req.files.documents && req.files.documents.length > 0) {
                    const additionalDocsBase64 = req.files.documents.map(file =>
                        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                    );

                    const additionalDocsUpload = await uploadMultipleToCloudinary(
                        additionalDocsBase64,
                        'provider-documentation'
                    );

                    if (additionalDocsUpload.success) {
                        allDocumentation = [...allDocumentation, ...additionalDocsUpload.urls];
                    }
                }
            } catch (uploadError) {
                console.error('File upload error:', uploadError);
                // Continue with profile creation even if upload fails
            }
        }

        // Create provider profile with pending status (needs admin approval)
        const provider = await Provider.create({
            userId: req.user.id,
            profileImage: profileImageUrl,
            category,
            specialization,
            qualification: qualification || 'N/A',
            fees,
            availability: availability || [],
            aadharImages: user.providerDocuments.aadharImages,
            documentation: allDocumentation,
            experience,
            address: {
                street: address.street,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
            },
            location: {
                ...(user.location?.toObject ? user.location.toObject() : user.location || {}),
                address: [address.street, address.city, address.state, address.pincode].filter(Boolean).join(', '),
                updatedAt: new Date(),
            },
            bio,
            status: 'pending', // Needs admin approval
        });

        const populatedProvider = await Provider.findById(provider._id)
            .populate('userId', 'name email mobile profileImage');

        res.status(201).json({
            success: true,
            message: 'Provider profile created successfully. Waiting for admin approval.',
            provider: populatedProvider,
        });
    } catch (error) {
        console.error('Create provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating provider profile',
            error: error.message,
        });
    }
};

// @desc    Get provider profile
// @route   GET /api/provider/profile
// @access  Private (Provider only)
export const getProviderProfile = async (req, res) => {
    try {
        let provider = await Provider.findOne({ userId: req.user.id }).populate('userId', 'name email mobile profileImage');

        if (!provider) {
            const user = await User.findById(req.user.id);
            if (user?.role === 'provider') {
                try {
                    provider = await recoverProviderProfile(user);
                    if (provider) {
                        provider = await Provider.findById(provider._id).populate('userId', 'name email mobile profileImage');
                    }
                } catch (recoveryError) {
                    console.error('Provider profile recovery error:', recoveryError);
                    return res.status(404).json({
                        success: false,
                        message: 'Provider profile not found. Please complete your provider profile.',
                        needsRegistration: true,
                        error: recoveryError.message,
                    });
                }
            }
        }

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found. Please complete your provider profile.',
                needsRegistration: true,
            });
        }

        await ensureProviderLabCode(provider);
        // Add rating data
        provider = await addRatingData(provider);
        res.status(200).json({
            success: true,
            provider,
            message: 'Provider profile fetched successfully',
        });
    } catch (error) {
        console.error('Get provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching provider profile',
            error: error.message,
        });
    }
};

// @desc    Update provider availability status
// @route   PATCH /api/provider/availability
// @access  Private (Provider only)
export const updateProviderAvailabilityStatus = async (req, res) => {
    try {
        const { availabilityStatus } = req.body;

        if (typeof availabilityStatus !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'availabilityStatus must be a boolean',
            });
        }

        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        provider.availabilityStatus = availabilityStatus;
        await provider.save();

        await ensureProviderLabCode(provider);

        let updatedProvider = await Provider.findById(provider._id)
            .populate('userId', 'name email mobile profileImage');
        updatedProvider = await addRatingData(updatedProvider);

        res.status(200).json({
            success: true,
            message: 'Availability status updated successfully',
            provider: updatedProvider,
        });
    } catch (error) {
        console.error('Update provider availability status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating availability status',
            error: error.message,
        });
    }
};

// @desc    Get user profile for provider
// @route   GET /api/provider/user-profile
// @access  Private (Provider only)
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -otp');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. User is not a provider',
            });
        }

        // Backfill referral code for older accounts where code was not present
        if (!user.referralCode) {
            user.referralCode = await generateReferralCodeForUser(user.name);
            await user.save();
        }

        res.status(200).json({
            success: true,
            user,
            message: 'User profile fetched successfully',
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user profile',
            error: error.message,
        });
    }
};

// @desc    Update provider profile
// @route   PUT /api/provider/profile
// @access  Private (Provider only)
export const updateProviderProfile = async (req, res) => {
    let {
        category,
        specialization,
        qualification,
        fees,
        availability,
        experience,
        address,
        bio,
        labName,
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
    } = req.body;

    try {
        let provider = await Provider.findOne({ userId: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        // Parse JSON strings from FormData
        if (typeof availability === 'string') {
            try {
                availability = JSON.parse(availability);
            } catch (e) {
                console.error('Failed to parse availability:', e);
                availability = null;
            }
        }

        address = parseAddressValue(address);

        // Handle optional additional documents upload during update
        // req.files is an object when using upload.fields()
        if (req.files) {
            try {
                // Handle profile image upload
                if (req.files.profileImage && req.files.profileImage.length > 0) {
                    const profileImageFile = req.files.profileImage[0];
                    const imageBase64 = `data:${profileImageFile.mimetype};base64,${profileImageFile.buffer.toString('base64')}`;
                    const imageUpload = await uploadMultipleToCloudinary([imageBase64], 'provider-profiles');
                    if (imageUpload.success && imageUpload.urls.length > 0) {
                        provider.profileImage = imageUpload.urls[0];
                    }
                }

                // Handle additional documents upload
                if (req.files.documents && req.files.documents.length > 0) {
                    const additionalDocsBase64 = req.files.documents.map(file =>
                        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                    );

                    const additionalDocsUpload = await uploadMultipleToCloudinary(
                        additionalDocsBase64,
                        'provider-documentation'
                    );

                    if (additionalDocsUpload.success) {
                        // Add new document URLs to existing documentation array
                        provider.documentation = [...provider.documentation, ...additionalDocsUpload.urls];
                    }
                }

                if (req.files.aadharImages && req.files.aadharImages.length > 0) {
                    const additionalAadharBase64 = req.files.aadharImages.map(file =>
                        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                    );

                    const additionalAadharUpload = await uploadMultipleToCloudinary(
                        additionalAadharBase64,
                        'provider-aadhar'
                    );

                    if (additionalAadharUpload.success) {
                        provider.aadharImages = [...provider.aadharImages, ...additionalAadharUpload.urls];
                    }
                }
            } catch (uploadError) {
                console.error('File upload error:', uploadError);
                // Continue with profile update even if upload fails
            }
        }

        // Update fields if provided
        if (category) provider.category = category;
        if (specialization) provider.specialization = specialization;
        if (qualification !== undefined) provider.qualification = qualification;
        if (fees) provider.fees = fees;
        if (availability) provider.availability = availability;
        if (experience !== undefined && experience !== null) {
            // Parse experience as number to prevent string concatenation (e.g., "5" + "2" = "52" instead of 7)
            provider.experience = parseInt(experience, 10) || 0;
        }
        if (address) {
            const currentAddress = provider.address || {};
            provider.address = {
                street: address.street || currentAddress.street || '',
                city: address.city || currentAddress.city || '',
                state: address.state || currentAddress.state || '',
                pincode: address.pincode || currentAddress.pincode || '',
            };
            provider.location = {
                ...(provider.location?.toObject ? provider.location.toObject() : provider.location || {}),
                address: [provider.address.street, provider.address.city, provider.address.state, provider.address.pincode]
                    .filter(Boolean)
                    .join(', '),
                updatedAt: new Date(),
            };
        }
        if (bio) provider.bio = bio;
        if (labName !== undefined) provider.labName = String(labName || '').trim();
        if (provider.category === 'Physiotherapist') {
            if (physiotherapyServiceIds !== undefined) {
                const serviceIds = parseObjectIdArray(physiotherapyServiceIds);
                const activeServices = await PhysiotherapyService.find({ _id: { $in: serviceIds }, isActive: true }).select('_id');
                provider.physiotherapyServiceIds = activeServices.map((service) => service._id);
            }
            if (physiotherapyAddonIds !== undefined) {
                const addonIds = parseObjectIdArray(physiotherapyAddonIds);
                const activeAddons = await PhysiotherapyAddon.find({ _id: { $in: addonIds }, isActive: true }).select('_id');
                provider.physiotherapyAddonIds = activeAddons.map((addon) => addon._id);
            }
            if (physiotherapyServicePricing !== undefined) {
                provider.physiotherapyServicePricing = sanitizeServicePricing(physiotherapyServicePricing, provider.physiotherapyServiceIds);
            }
            if (physiotherapyAddonPricing !== undefined) {
                provider.physiotherapyAddonPricing = sanitizeServicePricing(physiotherapyAddonPricing, provider.physiotherapyAddonIds, 'addonId');
            }
        }
        if (provider.category === 'Nurse') {
            if (nurseServiceIds !== undefined) {
                const serviceIds = parseObjectIdArray(nurseServiceIds);
                const activeServices = await NurseService.find({ _id: { $in: serviceIds }, isActive: true }).select('_id');
                provider.nurseServiceIds = activeServices.map((service) => service._id);
            }
            if (nurseAddonIds !== undefined) {
                const addonIds = parseObjectIdArray(nurseAddonIds);
                const activeAddons = await NurseAddon.find({ _id: { $in: addonIds }, isActive: true }).select('_id');
                provider.nurseAddonIds = activeAddons.map((addon) => addon._id);
            }
            if (nurseServicePricing !== undefined) {
                provider.nurseServicePricing = sanitizeServicePricing(nurseServicePricing, provider.nurseServiceIds);
            }
            if (nurseAddonPricing !== undefined) {
                provider.nurseAddonPricing = sanitizeServicePricing(nurseAddonPricing, provider.nurseAddonIds, 'addonId');
            }
        }
        if (['Caretaker', 'Care Taker'].includes(provider.category)) {
            if (caretakerServiceIds !== undefined) {
                const serviceIds = parseObjectIdArray(caretakerServiceIds);
                const activeServices = await CaretakerService.find({ _id: { $in: serviceIds }, isActive: true }).select('_id');
                provider.caretakerServiceIds = activeServices.map((service) => service._id);
            }
            if (caretakerAddonIds !== undefined) {
                const addonIds = parseObjectIdArray(caretakerAddonIds);
                const activeAddons = await CaretakerAddon.find({ _id: { $in: addonIds }, isActive: true }).select('_id');
                provider.caretakerAddonIds = activeAddons.map((addon) => addon._id);
            }
            if (caretakerServicePricing !== undefined) {
                provider.caretakerServicePricing = sanitizeServicePricing(caretakerServicePricing, provider.caretakerServiceIds);
            }
            if (caretakerAddonPricing !== undefined) {
                provider.caretakerAddonPricing = sanitizeServicePricing(caretakerAddonPricing, provider.caretakerAddonIds, 'addonId');
            }
        }

        await provider.save();

        res.status(200).json({
            success: true,
            message: 'Provider profile updated successfully',
            provider,
        });
    } catch (error) {
        console.error('Update provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating provider profile',
            error: error.message,
        });
    }
};

// @desc    Get all providers
// @route   GET /api/provider/all
// @access  Public
// @desc    Get all approved providers (with location-based sorting)
// @route   GET /api/provider/all
// @access  Public
// @query   ?latitude=<lat>&longitude=<lon> (optional for distance-based sorting)
export const getAllProviders = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        
        let providers = await Provider.find({ status: 'approved' })
            .populate('userId', 'name profileImage')
            .sort({ createdAt: -1 });

        // Add rating data to all providers
        providers = await Promise.all(providers.map(provider => addRatingData(provider)));
        providers = providers.map(sanitizePublicProvider);

        // If user provides location, sort by distance
        if (latitude && longitude) {
            const userLat = parseFloat(latitude);
            const userLon = parseFloat(longitude);
            
            if (isNaN(userLat) || isNaN(userLon)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid latitude or longitude values',
                });
            }
            
            const sortedProviders = sortProvidersByDistance(providers, userLat, userLon);
            
            return res.status(200).json({
                success: true,
                count: sortedProviders.length,
                providers: sortedProviders,
                message: 'Providers sorted by distance - within 20km first, then beyond 20km',
            });
        }

        // If no location provided, return unsorted
        res.status(200).json({
            success: true,
            count: providers.length,
            providers,
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

// @desc    Get providers by category (with location-based sorting)
// @route   GET /api/provider/category/:category
// @access  Public
// @query   ?latitude=<lat>&longitude=<lon> (optional for distance-based sorting)
export const getProvidersByCategory = async (req, res) => {
    const { category } = req.params;
    const { latitude, longitude } = req.query;

    try {
        let providers = await Provider.find({
            category: category,
            status: 'approved'
        })
            .populate('userId', 'name profileImage')
            .sort({ createdAt: -1 });

        // Add rating data to all providers
        providers = await Promise.all(providers.map(provider => addRatingData(provider)));
        providers = providers.map(sanitizePublicProvider);

        // If user provides location, sort by distance
        if (latitude && longitude) {
            const userLat = parseFloat(latitude);
            const userLon = parseFloat(longitude);
            
            if (isNaN(userLat) || isNaN(userLon)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid latitude or longitude values',
                });
            }
            
            const sortedProviders = sortProvidersByDistance(providers, userLat, userLon);
            
            return res.status(200).json({
                success: true,
                count: sortedProviders.length,
                providers: sortedProviders,
                message: 'Providers sorted by distance - within 20km first, then beyond 20km',
            });
        }

        res.status(200).json({
            success: true,
            count: providers.length,
            providers,
        });
    } catch (error) {
        console.error('Get providers by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching providers',
            error: error.message,
        });
    }
};

// @desc    Get single provider by ID
// @route   GET /api/provider/:id
// @access  Public
export const getProviderById = async (req, res) => {
    try {
        let provider = await Provider.findById(req.params.id)
            .populate('userId', 'name email mobile profileImage');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        // Add rating data
        provider = await addRatingData(provider);
        if (req.user?.role !== 'admin') {
            provider = sanitizePublicProvider(provider);
        }

        res.status(200).json({
            success: true,
            message: 'Provider fetched successfully',
            provider,
        });
    } catch (error) {
        console.error('Get provider by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching provider',
            error: error.message,
        });
    }
};

// @desc    Public provider verification
// @route   GET /api/provider/verify/:id
// @access  Public
export const verifyProvider = async (req, res) => {
    try {
        const provider = await Provider.findById(req.params.id)
            .populate('userId', 'name')
            .select('category specialization status approvedAt updatedAt labCode labName');

        if (!provider || provider.status !== 'approved') {
            return res.status(404).json({
                success: false,
                message: 'Verified provider not found',
            });
        }

        res.status(200).json({
            success: true,
            provider: {
                _id: provider._id,
                name: provider.userId?.name || 'Healthy Touch Provider',
                category: provider.category,
                specialization: provider.specialization,
                labName: provider.labName,
                status: provider.status,
                approvedAt: provider.approvedAt || provider.updatedAt,
                labCode: provider.labCode,
            },
        });
    } catch (error) {
        console.error('Verify provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while verifying provider',
            error: error.message,
        });
    }
};

// @desc    Delete provider profile
// @route   DELETE /api/provider/profile
// @access  Private (Provider only)
export const deleteProviderProfile = async (req, res) => {
    try {
        const provider = await Provider.findOne({ userId: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        await Provider.findByIdAndDelete(provider._id);
        await User.findByIdAndDelete(req.user.id);

        res.status(200).json({
            success: true,
            message: 'Provider account deleted successfully',
        });
    } catch (error) {
        console.error('Delete provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting provider profile',
            error: error.message,
        });
    }
};

// ==================== ADMIN FUNCTIONS ====================

// @desc    Get all pending providers (for admin approval)
// @route   GET /api/provider/admin/pending
// @access  Private (Admin only)
export const getPendingProviders = async (req, res) => {
    try {
        const providers = await Provider.find({ status: 'pending' })
            .populate('userId', 'name email mobile profileImage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: providers.length,
            providers,
        });
    } catch (error) {
        console.error('Get pending providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching pending providers',
            error: error.message,
        });
    }
};

// @desc    Approve or reject provider
// @route   PUT /api/provider/admin/:id/status
// @access  Private (Admin only)
export const updateProviderStatus = async (req, res) => {
    const { status, rejectionReason } = req.body;

    try {
        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either approved or rejected',
            });
        }

        const provider = await Provider.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        provider.status = status;
        if (status === 'approved') {
            provider.approvedAt = provider.approvedAt || new Date();
            provider.rejectionReason = undefined;
        }
        if (status === 'rejected' && rejectionReason) {
            provider.rejectionReason = rejectionReason;
        }

        await provider.save();

        const updatedProvider = await Provider.findById(provider._id)
            .populate('userId', 'name email mobile profileImage');

        // TODO: Send notification to provider about approval/rejection

        res.status(200).json({
            success: true,
            message: `Provider ${status} successfully`,
            provider: updatedProvider,
        });
    } catch (error) {
        console.error('Update provider status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating provider status',
            error: error.message,
        });
    }
};

// @desc    Get all providers (Admin view - includes all statuses)
// @route   GET /api/provider/admin/all
// @access  Private (Admin only)
export const getAllProvidersAdmin = async (req, res) => {
    try {
        const { status, category } = req.query;

        let filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        const providers = await Provider.find(filter)
            .populate('userId', 'name email mobile role profileImage')
            .sort({ createdAt: -1 });

        // Statistics
        const stats = {
            total: providers.length,
            approved: providers.filter(p => p.status === 'approved').length,
            pending: providers.filter(p => p.status === 'pending').length,
            rejected: providers.filter(p => p.status === 'rejected').length,
        };

        res.status(200).json({
            success: true,
            stats,
            providers,
        });
    } catch (error) {
        console.error('Get all providers admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching providers',
            error: error.message,
        });
    }
};

// @desc    Delete provider by admin
// @route   DELETE /api/provider/admin/:id
// @access  Private (Admin only)
export const deleteProviderByAdmin = async (req, res) => {
    try {
        const provider = await Provider.findById(req.params.id);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found',
            });
        }

        await Provider.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Provider deleted successfully by admin',
        });
    } catch (error) {
        console.error('Delete provider by admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting provider',
            error: error.message,
        });
    }
};

// @desc    Get provider statistics (Admin dashboard)
// @route   GET /api/provider/admin/stats
// @access  Private (Admin only)
export const getProviderStatistics = async (req, res) => {
    try {
        const totalProviders = await Provider.countDocuments();
        const approvedProviders = await Provider.countDocuments({ status: 'approved' });
        const pendingProviders = await Provider.countDocuments({ status: 'pending' });
        const rejectedProviders = await Provider.countDocuments({ status: 'rejected' });

        // Category-wise count
        const categoryStats = await Provider.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Recent registrations (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentRegistrations = await Provider.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        res.status(200).json({
            success: true,
            statistics: {
                total: totalProviders,
                approved: approvedProviders,
                pending: pendingProviders,
                rejected: rejectedProviders,
                recentRegistrations,
                categoryBreakdown: categoryStats,
            }
        });
    } catch (error) {
        console.error('Get provider statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching statistics',
            error: error.message,
        });
    }
};

// @desc    Get provider earnings/revenue
// @route   GET /api/provider/earnings
// @access  Private (Provider only)
export const getProviderEarnings = async (req, res) => {
    try {
        // Get provider profile
        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        // Get all completed payments for this provider
        const earnings = await Payment.aggregate([
            { 
                $match: { 
                    providerId: provider._id,
                    status: 'completed'
                } 
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: '$providerAmount' }, // What provider gets
                    totalAppointments: { $sum: 1 },
                    pendingPayout: { 
                        $sum: { 
                            $cond: [{ $eq: ['$payoutStatus', 'pending'] }, '$providerAmount', 0] 
                        } 
                    },
                    completedPayout: { 
                        $sum: { 
                            $cond: [{ $eq: ['$payoutStatus', 'completed'] }, '$providerAmount', 0] 
                        } 
                    },
                }
            }
        ]);

        const earningsData = earnings.length > 0 ? earnings[0] : {
            totalEarnings: 0,
            totalAppointments: 0,
            pendingPayout: 0,
            completedPayout: 0,
        };

        // Get recent payments
        const recentPayments = await Payment.find({
            providerId: provider._id,
            status: 'completed'
        })
        .populate('patientId', 'name email')
        .populate('appointmentId', 'date timeSlot')
        .sort({ createdAt: -1 })
        .limit(10);

        res.status(200).json({
            success: true,
            earnings: {
                total: earningsData.totalEarnings,
                pending: earningsData.pendingPayout,
                completed: earningsData.completedPayout,
                appointmentsCount: earningsData.totalAppointments,
            },
            recentPayments: recentPayments.map(p => ({
                _id: p._id,
                amount: p.providerAmount,
                totalCharged: p.totalAmount,
                patientName: p.patientId?.name,
                appointmentDate: p.appointmentId?.date,
                payoutStatus: p.payoutStatus,
                createdAt: p.createdAt,
            })),
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
