import User from '../models/User.js';
import Provider from '../models/Provider.js';
import PatientProfile from '../models/PatientProfile.js';
import Settings from '../models/Settings.js';
import PendingRegistration from '../models/PendingRegistration.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sendEmail, { sendTemplateEmail } from '../utils/sendEmail.js';
import { uploadMultipleToCloudinary, uploadToCloudinary } from '../utils/uploadToCloudinary.js';
import { awardSignupRewards } from '../utils/rewards.js';
import {
    parseAcceptedDocumentIds,
    providerAgreementSlugs,
    requireAcceptedDocuments,
    saveAcceptanceLogs,
} from '../utils/legalDocuments.js';

// OTP expiry time (10 minutes)
const OTP_EXPIRY = 10 * 60 * 1000;

const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true';

const authDebug = (label, payload = {}) => {
    if (!AUTH_DEBUG) return;
    console.log(`[AUTH_DEBUG] ${label}`, payload);
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();


const parseStringArray = (value) => {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) {
        return value.flatMap(parseStringArray).filter(Boolean);
    }
    const text = String(value).trim();
    if (!text) return [];
    if (text.startsWith('[')) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
        } catch {
            // Fall through to comma parsing for malformed client payloads.
        }
    }
    return text.split(',').map((item) => item.trim()).filter(Boolean);
};

const buildAddressFromLocation = (location) => {
    const addressText = typeof location?.address === 'string' ? location.address.trim() : '';
    return addressText ? { street: addressText, city: '', state: '', pincode: '' } : undefined;
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

    if (normalized.serviceArea !== undefined) {
        const values = parseStringArray(normalized.serviceArea);
        if (values.length) normalized.serviceArea = values;
        else delete normalized.serviceArea;
    }

    if (normalized.availableTests !== undefined) {
        const values = parseStringArray(normalized.availableTests);
        if (values.length) normalized.availableTests = values;
        else delete normalized.availableTests;
    }

    ['languagesKnown', 'availableServiceArea'].forEach((key) => {
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

    if (!normalized.address) {
        normalized.address = buildAddressFromLocation(normalized.location);
    }

    return normalized;
};

const findPendingRegistrationForUser = async (user) => {
    const filters = [];
    if (user.email) filters.push({ email: user.email });
    if (user.mobile) filters.push({ mobile: user.mobile });
    if (!filters.length) return null;
    return PendingRegistration.findOne({ role: 'provider', $or: filters }).sort({ createdAt: -1 });
};

const recoverProviderProfileForUser = async (user) => {
    if (!user || user.role !== 'provider') return null;

    const existingProvider = await Provider.findOne({ userId: user._id });
    if (existingProvider) return existingProvider;

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

const buildAuthUserResponse = (user) => {
    const userResponse = {
        id: user._id,
        _id: user._id,
        name: user.name,
        role: user.role,
        coins: user.coins || 0,
        referralCode: user.referralCode,
    };

    if (user.email) userResponse.email = user.email;
    if (user.mobile) userResponse.mobile = user.mobile;
    if (user.role === 'provider') userResponse.category = user.category;

    return userResponse;
};

const buildTokenForUser = (user) => {
    const tokenPayload = {
        id: user._id,
        role: user.role,
    };

    if (user.role === 'provider') {
        tokenPayload.category = user.category;
    }

    return jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: '30d' });
};

const normalizePasswordlessIdentifier = (identifier = '') => {
    const raw = String(identifier).trim();
    return {
        raw,
        email: raw.toLowerCase(),
    };
};

const sendPatientOtpEmail = async ({ email, otp, subject }) => {
    if (!email) {
        throw new Error('Email is required for OTP delivery');
    }

    await sendEmail({
        email,
        subject,
        otp,
    });
};

const appendDevOtp = (body, otp) => {
    if (process.env.NODE_ENV !== 'production') {
        body.otp = otp;
    }
    return body;
};

export const Register = async (req, res) => {
    const { name, email, mobile, password, role, category, specialization, latitude, longitude, address, referralCode } = req.body;

    try {
        // Get settings (from middleware or fetch fresh)
        const settings = req.settings || await Settings.getSettings();

        // Validation: Ensure required fields are provided
        if (!name || !password || !role) {
            return res.status(400).json({
                message: 'Please provide name, password, and role',
                success: false
            });
        }

        // Location is mandatory for provider registration and is used to seed the provider profile.
        if (role === 'provider' && (!latitude || !longitude)) {
            return res.status(400).json({
                message: 'Location is required (latitude and longitude)',
                success: false,
            });
        }

        const hasLocationPayload = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;
        const parsedLat = hasLocationPayload ? parseFloat(latitude) : null;
        const parsedLng = hasLocationPayload ? parseFloat(longitude) : null;
        if (hasLocationPayload && (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng))) {
            return res.status(400).json({
                message: 'Invalid latitude or longitude values',
                success: false,
            });
        }

        if (hasLocationPayload && (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180)) {
            return res.status(400).json({
                message: 'Invalid latitude or longitude range',
                success: false,
            });
        }

        const locationPayload = hasLocationPayload ? {
            latitude: parsedLat,
            longitude: parsedLng,
            address: address || null,
            updatedAt: new Date(),
        } : undefined;

        // Validate password length using dynamic settings
        if (password.length < settings.passwordMinLength) {
            return res.status(400).json({
                message: `Password must be at least ${settings.passwordMinLength} characters long`,
                success: false
            });
        }

        const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
        const normalizedMobile = mobile ? String(mobile) : null;
        const normalizedReferralCode = referralCode ? String(referralCode).trim().toUpperCase() : null;
        authDebug('Register identifiers normalized', {
            inputEmail: email || null,
            normalizedEmail,
            inputMobile: mobile || null,
            normalizedMobile,
            role,
        });

        // Validation: At least one of email or mobile must be provided
        if (!normalizedEmail && !normalizedMobile) {
            return res.status(400).json({
                message: 'Please provide either email or mobile number',
                success: false
            });
        }

        // Prevent admin registration via API
        if (role === 'admin') {
            return res.status(403).json({
                message: 'Admin accounts cannot be created through registration',
                success: false
            });
        }

        // Validate role
        if (!['patient', 'provider'].includes(role)) {
            return res.status(400).json({
                message: 'Invalid role selected. Role must be either patient or provider',
                success: false
            });
        }

        // Duplicate checks across confirmed users and pending registrations
        const orConditions = [];
        if (normalizedEmail) orConditions.push({ email: normalizedEmail });
        if (normalizedMobile) orConditions.push({ mobile: normalizedMobile });

        const existingUser = await User.findOne({ $or: orConditions });
        if (existingUser) {
            if (role === 'provider' && existingUser.role === 'provider') {
                const existingProvider = await Provider.findOne({ userId: existingUser._id }).select('_id');
                const pending = await PendingRegistration.findOne({ role: 'provider', $or: orConditions }).select('_id');
                if (!existingProvider) {
                    return res.status(409).json({
                        success: false,
                        message: pending
                            ? 'Account already exists but provider profile is pending recovery. Please login with this email to continue.'
                            : 'Account already exists but provider profile is incomplete. Please contact support.',
                        needsProfileRecovery: true,
                    });
                }
            }
            return res.status(409).json({
                success: false,
                message: 'User already exists. Please login.',
            });
        }

        let referrer = null;
        if (normalizedReferralCode) {
            referrer = await User.findOne({ referralCode: normalizedReferralCode }).select('_id name referralCode');
            if (!referrer) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid referral code',
                });
            }
        }

        const existingPending = await PendingRegistration.findOne({ $or: orConditions });
        if (existingPending) {
            // Don't allow switching roles mid-pending; keep semantics simple and safe.
            if (role && existingPending.role !== role) {
                return res.status(409).json({
                    success: false,
                    message: `Registration is already pending for role '${existingPending.role}'. Please verify OTP for that role.`,
                    userId: existingPending._id,
                });
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const passwordHash = await bcrypt.hash(password, 10);

            try {
                await sendEmail({
                    email: existingPending.email,
                    subject: `Verify Your ${settings.siteName || 'Healthy Touch'} Account - OTP Inside`,
                    otp: otp,
                });
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send verification email. Please try again.',
                    error: emailError.message,
                });
            }

            // Refresh pending record with latest info + new OTP
            existingPending.name = name;
            existingPending.passwordHash = passwordHash;
            existingPending.location = locationPayload;
            existingPending.referralCodeUsed = normalizedReferralCode || existingPending.referralCodeUsed;
            existingPending.referredBy = referrer?._id || existingPending.referredBy;

            if (existingPending.role === 'provider') {
                if (category) existingPending.category = category;
                if (specialization) existingPending.specialization = specialization;
                const legalCheck = await requireAcceptedDocuments({
                    acceptedDocumentIds: req.body.acceptedLegalDocumentIds,
                    requiredSlugs: providerAgreementSlugs(category || existingPending.category),
                });
                if (!legalCheck.ok) {
                    return res.status(400).json({
                        success: false,
                        message: legalCheck.message,
                    });
                }
                existingPending.acceptedLegalDocuments = parseAcceptedDocumentIds(req.body.acceptedLegalDocumentIds);
            }

            existingPending.otp = {
                code: otp,
                expiresAt: new Date(Date.now() + OTP_EXPIRY),
            };
            existingPending.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await existingPending.save();

            const responseBody = {
                success: true,
                message: 'Registration is pending. A new OTP has been sent. Please verify to complete registration.',
                userId: existingPending._id,
                email: existingPending.email,
                mobile: existingPending.mobile,
            };

            if (process.env.NODE_ENV !== 'production') {
                responseBody.otp = otp;
            }

            return res.status(201).json(responseBody);
        }

        // Provider specific validations
        if (role === 'provider') {
            // Validate category is provided
            if (!category) {
                return res.status(400).json({
                    message: 'Category is required for provider registration',
                    success: false
                });
            }

            // Validate category value
            const validCategories = ['Doctor', 'Nurse', 'Physiotherapist', 'Lab Technician', 'Ambulance', 'Caretaker'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    message: `Provider category mismatch. Category must be one of: ${validCategories.join(', ')}`,
                    success: false
                });
            }

            // Validate specialization
            if (!specialization) {
                return res.status(400).json({
                    message: 'Specialization is required for provider registration',
                    success: false
                });
            }
            // Check if files are uploaded
            if (!req.files || !req.files.aadharImages) {
                return res.status(400).json({
                    message: 'Aadhar card files are required for provider registration',
                    success: false
                });
            }
            if (category !== 'Ambulance' && !req.files.documentation) {
                return res.status(400).json({
                    message: 'Professional documents are required for provider registration',
                    success: false
                });
            }

            // Validate aadhar images
            if (req.files.aadharImages.length === 0) {
                return res.status(400).json({
                    message: 'At least one Aadhar card file is required',
                    success: false
                });
            }

            // Validate documentation
            if (category !== 'Ambulance' && (!req.files.documentation || req.files.documentation.length === 0)) {
                return res.status(400).json({
                    message: 'At least one professional document is required',
                    success: false
                });
            }

            // Validate file types for aadhar (images or PDF)
            const aadharFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
            const invalidAadharFiles = req.files.aadharImages.filter(
                file => !aadharFileTypes.includes(file.mimetype)
            );
            if (invalidAadharFiles.length > 0) {
                return res.status(400).json({
                    message: 'Aadhar card files must be in JPEG, JPG, PNG, WEBP, or PDF format',
                    success: false
                });
            }

            const legalCheck = await requireAcceptedDocuments({
                acceptedDocumentIds: req.body.acceptedLegalDocumentIds,
                requiredSlugs: providerAgreementSlugs(category),
            });
            if (!legalCheck.ok) {
                return res.status(400).json({
                    message: legalCheck.message,
                    success: false,
                });
            }
            req.acceptedLegalDocuments = legalCheck.documents;
        }

        // (duplicate checks done earlier)

        let providerDocuments = null;

        // Upload provider documents to Cloudinary
        if (role === 'provider') {
            try {
                // Convert aadhar images to base64
                const aadharImagesBase64 = req.files.aadharImages.map(file =>
                    `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                );

                // Upload aadhar images
                const aadharUploadResult = await uploadMultipleToCloudinary(
                    aadharImagesBase64,
                    'provider-aadhar'
                );

                if (!aadharUploadResult.success) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to upload Aadhar card images',
                        error: 'Some files could not be uploaded to cloud storage'
                    });
                }

                let documentationUploadResult = null;
                if (req.files.documentation && req.files.documentation.length > 0) {
                    const documentationBase64 = req.files.documentation.map(file =>
                        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                    );
                    documentationUploadResult = await uploadMultipleToCloudinary(
                        documentationBase64,
                        'provider-documentation'
                    );

                    if (!documentationUploadResult.success) {
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to upload documentation',
                            error: 'Some files could not be uploaded to cloud storage'
                        });
                    }
                }

                // Store uploaded URLs
                providerDocuments = {
                    aadharImages: aadharUploadResult.urls,
                    documentation: documentationUploadResult ? documentationUploadResult.urls : []
                };

                // Handle single file uploads for Ambulance
                const singleFiles = [
                    'rcDocument', 'driverLicenseDocument', 'ambulancePhoto',
                    'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument',
                    'profileImage'
                ];
                
                for (const field of singleFiles) {
                    if (req.files[field] && req.files[field][0]) {
                        const file = req.files[field][0];
                        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                        const uploadRes = await uploadToCloudinary(base64, `provider-${field.toLowerCase()}`);
                        if (uploadRes.success) {
                            providerDocuments[field] = uploadRes.url;
                        }
                    }
                }

            } catch (uploadError) {
                console.error('File upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload documents',
                    error: uploadError.message
                });
            }
        }

        // Email verification behavior is controlled by settings.
        // Requirement: User should be saved only AFTER OTP verification.
        // So when email verification is ON and email exists -> create a pending registration record.
        const requireEmailVerification = settings.requireEmailVerification !== false;
        const shouldSendOtp = requireEmailVerification && !!email;

        if (!shouldSendOtp) {
            // Fallback: if OTP isn't required/possible, create user immediately (verified)
            const userData = {
                name,
                password,
                role,
                providerDocuments: role === 'provider' ? providerDocuments : undefined,
                profileImage: role === 'provider' ? providerDocuments?.profileImage : undefined,
                location: locationPayload,
                isVerified: true,
                referredBy: referrer?._id || null,
            };
            if (normalizedEmail) userData.email = normalizedEmail;
            if (normalizedMobile) userData.mobile = normalizedMobile;
            if (role === 'provider') userData.category = category;

            const user = await User.create(userData);
            if (role === 'provider') {
                await saveAcceptanceLogs({
                    userId: user._id,
                    documents: req.acceptedLegalDocuments || [],
                    req,
                    context: 'provider-registration',
                });
            }
            let rewardedUser = user;
            try {
                rewardedUser = await awardSignupRewards(user) || user;
            } catch (rewardError) {
                console.error('Signup reward error:', rewardError);
            }
            const responseUser = rewardedUser || user;

            if (role === 'provider') {
                await Provider.create(normalizeProviderCreateData({
                    userId: user._id,
                    aadharImages: providerDocuments?.aadharImages || [],
                    documentation: providerDocuments?.documentation || [],
                    status: 'pending',
                    category: category,
                    specialization: specialization,
                    profileImage: providerDocuments?.profileImage,
                    fees: req.body.fees || req.body.baseCharges || 0,
                    experience: req.body.experience || 0,
                    location: locationPayload,
                    ...normalizeProviderCreateData(req.body),
                }));
            }

            return res.status(201).json({
                success: true,
                message: 'Registration successful! You can now login.',
                userId: responseUser._id,
                email: responseUser.email,
                mobile: responseUser.mobile,
                coins: responseUser.coins,
                referralCode: responseUser.referralCode,
            });
        }

        // Create pending registration (no User/Provider in DB yet)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const passwordHash = await bcrypt.hash(password, 10);

        // Extra data logic for specialized providers (e.g. Ambulance, Lab Technician)
        const extraData = {};
        if (role === 'provider') {
            const textKeys = [
                'ambulanceType', 'medicalEquipment', 'vehicleNumber', 'vehicleModel', 'vehicleYear',
                'driverLicenseNumber', 'driverName', 'driverMobileNo', 'serviceArea', 'availabilityType',
                'baseCharges', 'perKmCharge', 'bankAccountNumber', 'bankIfscCode', 'policeVerificationStatus',
                'labServiceType', 'labName', 'availableTests', 'homeSampleCollection', 
                'labExperience', 'labServiceArea', 'reportDeliveryTime', 'certificationStatus',
                'contactPersonName', 'labContactNumber', 'labEmergencyContactNumber',
                'fees', 'experience', 'caretakerServiceType', 'gender', 'age', 'qualification',
                'languagesKnown', 'availableServiceArea', 'availabilityDays', 'availabilityStartTime',
                'availabilityEndTime'
            ];
            textKeys.forEach(k => {
                if (req.body[k] !== undefined) extraData[k] = req.body[k];
            });
        }        const pending = await PendingRegistration.create({
            name,
            email: normalizedEmail,
            mobile: normalizedMobile ? normalizedMobile : undefined,
            passwordHash,
            role,
            category: role === 'provider' ? category : undefined,
            specialization: role === 'provider' ? specialization : undefined,
            providerDocuments: role === 'provider' ? providerDocuments : undefined,
            acceptedLegalDocuments: role === 'provider' ? parseAcceptedDocumentIds(req.body.acceptedLegalDocumentIds) : undefined,
            extraData: extraData,
            location: locationPayload,
            referralCodeUsed: normalizedReferralCode || undefined,
            referredBy: referrer?._id || null,
            otp: {
                code: otp,
                expiresAt: new Date(Date.now() + OTP_EXPIRY),
            },
        });

        try {
            await sendEmail({
                email: pending.email,
                subject: `Verify Your ${settings.siteName || 'Healthy Touch'} Account - OTP Inside`,
                otp: otp,
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            await PendingRegistration.findByIdAndDelete(pending._id);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again.',
                error: emailError.message,
            });
        }

        const responseBody = {
            success: true,
            message: 'Registration started. Please check your email for OTP verification.',
            userId: pending._id,
            email: pending.email,
            mobile: pending.mobile,
        };

        // For local testing only: return OTP in non-production
        if (process.env.NODE_ENV !== 'production') {
            responseBody.otp = otp;
        }

        return res.status(201).json(responseBody);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
};

export const Login = async (req, res) => {
    const { email, mobile, password, role, category } = req.body;

    try {
        const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
        const normalizedMobile = mobile ? String(mobile).trim() : null;

        // Validation: At least one identifier (email or mobile) must be provided
        if (!normalizedEmail && !normalizedMobile) {
            return res.status(400).json({
                message: 'Please provide either email or mobile number',
                success: false
            });
        }

        // Validation: Password is required
        if (!password) {
            return res.status(400).json({
                message: 'Please provide password',
                success: false
            });
        }

        // Build query to find user by email or mobile
        const queryConditions = [];
        if (normalizedEmail) queryConditions.push({ email: normalizedEmail });
        if (normalizedMobile) queryConditions.push({ mobile: normalizedMobile });
        authDebug('Login query built', {
            inputEmail: email || null,
            normalizedEmail,
            inputMobile: mobile || null,
            normalizedMobile,
            queryConditions,
        });

        // Check if user exists
        const user = await User.findOne({ $or: queryConditions });
        if (!user) {
            const pending = await PendingRegistration.findOne({ $or: queryConditions });
            authDebug('Login user lookup failed', {
                foundPending: !!pending,
            });
            if (pending) {
                return res.status(403).json({
                    message: 'Registration pending. Please verify your OTP first.',
                    success: false,
                    userId: pending._id,
                });
            }

            return res.status(404).json({
                message: 'User not found. Please register first.',
                success: false
            });
        }

        // Backfill referral code for older accounts where code was not present
        if (!user.referralCode) {
            user.referralCode = await generateReferralCodeForUser(user.name);
            await user.save();
        }
        authDebug('Login user found', {
            userId: user._id,
            userEmail: user.email || null,
            userMobile: user.mobile || null,
            userRole: user.role,
            isVerified: user.isVerified,
            passwordHashPrefix: user.password ? user.password.slice(0, 7) : null,
            passwordHashLength: user.password ? user.password.length : 0,
        });

        // Email verification behavior is controlled by settings
        const settings = req.settings || await Settings.getSettings();
        const requireEmailVerification = settings.requireEmailVerification !== false;

        if (requireEmailVerification && !user.isVerified) {
            return res.status(403).json({
                message: 'Please verify your account first. Check your email for OTP.',
                success: false,
                userId: user._id
            });
        }

        // Role validation: If frontend sends a role, validate it matches
        if (role && user.role !== role) {
            return res.status(403).json({
                message: `Invalid role selected. This account is registered as '${user.role}', not '${role}'`,
                success: false
            });
        }

        // Category validation for providers: If frontend sends category, validate it matches
        if (user.role === 'provider') {
            if (category && user.category !== category) {
                return res.status(403).json({
                    message: `Provider category mismatch. This account is registered as '${user.category}', not '${category}'`,
                    success: false
                });
            }
        }

        // Check if password is correct
        const isPasswordCorrect = await user.matchPassword(password);
        authDebug('Login password compare result', {
            userId: user._id,
            compareResult: isPasswordCorrect,
        });
        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: 'Login failed. Invalid credentials',
                success: false
            });
        }

        let needsProviderProfile = false;
        if (user.role === 'provider') {
            try {
                const provider = await recoverProviderProfileForUser(user);
                if (!provider) {
                    needsProviderProfile = true;
                }
            } catch (providerError) {
                console.error('Provider profile recovery during login failed:', providerError);
                needsProviderProfile = true;
            }
        }

        // Update last login time
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token with role and category (if provider)
        const tokenPayload = { 
            id: user._id, 
            role: user.role 
        };
        
        // Add category to token payload for providers
        if (user.role === 'provider') {
            tokenPayload.category = user.category;
        }
        
        const token = jwt.sign(
            tokenPayload,
            process.env.SECRET_KEY,
            { expiresIn: '30d' }
        );

        // Prepare user response
        const userResponse = buildAuthUserResponse(user);
        if (needsProviderProfile) {
            userResponse.needsProviderProfile = true;
        }

        res.status(200).json({
            success: true,
            message: needsProviderProfile
                ? 'Login successful. Please complete your provider profile.'
                : 'Login successful!',
            token,
            user: userResponse,
            needsProviderProfile,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
};

export const PatientPasswordlessStart = async (req, res) => {
    try {
        const { raw, email } = normalizePasswordlessIdentifier(req.body?.identifier);

        if (!raw) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email address',
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
            });
        }

        const existingUser = await User.findOne({ email });
        const otp = generateOtp();
        const otpPayload = {
            code: otp,
            expiresAt: new Date(Date.now() + OTP_EXPIRY),
        };

        if (existingUser) {
            if (existingUser.role !== 'patient') {
                return res.status(403).json({
                    success: false,
                    message: `This account is registered as '${existingUser.role}'. Please use the correct login page.`,
                });
            }

            if (!existingUser.email) {
                return res.status(400).json({
                    success: false,
                    message: 'This patient account does not have an email for OTP login. Please contact support.',
                });
            }

            existingUser.otp = otpPayload;
            await existingUser.save();

            try {
                await sendPatientOtpEmail({
                    email: existingUser.email,
                    otp,
                    subject: 'Your Healthy Touch Login OTP',
                });
            } catch (emailError) {
                console.error('Patient passwordless email error:', emailError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send OTP email. Please try again.',
                    error: emailError.message,
                });
            }

            return res.status(200).json(appendDevOtp({
                success: true,
                message: 'OTP has been sent to your registered email.',
                userId: existingUser._id,
                isNew: false,
                email: existingUser.email,
            }, otp));
        }

        const existingPending = await PendingRegistration.findOne({ email, role: 'patient' });
        const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
        let pending = existingPending;

        if (pending) {
            pending.name = pending.name || 'Patient';
            pending.passwordHash = passwordHash;
            pending.otp = otpPayload;
            pending.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            pending.extraData = {
                ...(pending.extraData || {}),
                passwordlessPatient: true,
                otpVerified: false,
            };
            await pending.save();
        } else {
            pending = await PendingRegistration.create({
                name: 'Patient',
                email,
                passwordHash,
                role: 'patient',
                extraData: {
                    passwordlessPatient: true,
                    otpVerified: false,
                },
                otp: otpPayload,
            });
        }

        try {
            await sendPatientOtpEmail({
                email: pending.email,
                otp,
                subject: 'Your Healthy Touch Signup OTP',
            });
        } catch (emailError) {
            console.error('Patient passwordless email error:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please try again.',
                error: emailError.message,
            });
        }

        return res.status(200).json(appendDevOtp({
            success: true,
            message: 'OTP has been sent to your email.',
            userId: pending._id,
            isNew: true,
            email: pending.email,
        }, otp));
    } catch (error) {
        console.error('Patient passwordless start error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while starting patient login',
            error: error.message,
        });
    }
};

export const PatientPasswordlessVerify = async (req, res) => {
    try {
        const { userId, otp } = req.body || {};

        if (!userId || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId and OTP',
            });
        }

        const pending = await PendingRegistration.findById(userId);
        if (pending?.role === 'patient' && pending.extraData?.passwordlessPatient) {
            if (!pending.otp?.code) {
                return res.status(400).json({
                    success: false,
                    message: 'No OTP found. Please request a new OTP.',
                });
            }

            if (pending.otp.code !== otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP. Please check and try again.',
                });
            }

            if (pending.otp.expiresAt < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP has expired. Please request a new OTP.',
                });
            }

            pending.otp = undefined;
            pending.extraData = {
                ...(pending.extraData || {}),
                otpVerified: true,
            };
            await pending.save();

            const profileToken = jwt.sign(
                { id: pending._id, purpose: 'patient-profile-completion' },
                process.env.SECRET_KEY,
                { expiresIn: '30m' }
            );

            return res.status(200).json({
                success: true,
                message: 'OTP verified. Please complete your profile.',
                isNew: true,
                needsProfileCompletion: true,
                profileToken,
                email: pending.email,
            });
        }

        const user = await User.findById(userId);
        if (!user || user.role !== 'patient') {
            return res.status(404).json({
                success: false,
                message: 'Patient account not found',
            });
        }

        if (!user.otp?.code) {
            return res.status(400).json({
                success: false,
                message: 'No OTP found. Please request a new OTP.',
            });
        }

        if (user.otp.code !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please check and try again.',
            });
        }

        if (user.otp.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new OTP.',
            });
        }

        if (!user.referralCode) {
            user.referralCode = await generateReferralCodeForUser(user.name);
        }

        user.isVerified = true;
        user.otp = undefined;
        user.lastLogin = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Login successful!',
            token: buildTokenForUser(user),
            user: buildAuthUserResponse(user),
            isNew: false,
        });
    } catch (error) {
        console.error('Patient passwordless verify error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during patient OTP verification',
            error: error.message,
        });
    }
};

export const PatientPasswordlessCompleteProfile = async (req, res) => {
    try {
        const { profileToken, name, mobile, gender, referralCode, latitude, longitude, address } = req.body || {};

        if (!profileToken) {
            return res.status(400).json({
                success: false,
                message: 'Profile verification token is required',
            });
        }

        if (!name || !String(name).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Full name is required',
            });
        }

        const normalizedMobile = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : '';
        if (!/^\d{10}$/.test(normalizedMobile)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10 digit mobile number',
            });
        }

        const normalizedGender = gender ? String(gender).trim() : '';
        if (normalizedGender && !['Male', 'Female', 'Other'].includes(normalizedGender)) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid gender',
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(profileToken, process.env.SECRET_KEY);
        } catch {
            return res.status(400).json({
                success: false,
                message: 'Profile completion session is invalid or expired',
            });
        }

        if (decoded.purpose !== 'patient-profile-completion') {
            return res.status(400).json({
                success: false,
                message: 'Invalid profile completion token',
            });
        }

        const pending = await PendingRegistration.findById(decoded.id);
        if (!pending || pending.role !== 'patient' || !pending.extraData?.passwordlessPatient || !pending.extraData?.otpVerified) {
            return res.status(404).json({
                success: false,
                message: 'Verified patient signup session not found',
            });
        }

        const parsedLat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
        const parsedLng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null;

        if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
            return res.status(400).json({
                success: false,
                message: 'Location is required',
            });
        }

        if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude or longitude range',
            });
        }

        const existingUser = await User.findOne({ email: pending.email });
        if (existingUser) {
            await PendingRegistration.findByIdAndDelete(pending._id);
            return res.status(409).json({
                success: false,
                message: 'Patient already exists. Please login again.',
            });
        }

        const existingMobileUser = await User.findOne({ mobile: normalizedMobile });
        if (existingMobileUser) {
            return res.status(409).json({
                success: false,
                message: 'Mobile number already exists. Please use another number or login.',
            });
        }

        let referrer = null;
        const normalizedReferralCode = referralCode ? String(referralCode).trim().toUpperCase() : null;
        if (normalizedReferralCode) {
            referrer = await User.findOne({ referralCode: normalizedReferralCode }).select('_id name referralCode');
            if (!referrer) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid referral code',
                });
            }
        }

        const user = await User.create({
            name: String(name).trim(),
            email: pending.email,
            mobile: normalizedMobile,
            password: crypto.randomBytes(24).toString('hex'),
            role: 'patient',
            location: {
                latitude: parsedLat,
                longitude: parsedLng,
                address: address || null,
                updatedAt: new Date(),
            },
            isVerified: true,
            referredBy: referrer?._id || null,
            lastLogin: new Date(),
        });

        if (normalizedGender) {
            await PatientProfile.findOneAndUpdate(
                { userId: user._id },
                { $set: { userId: user._id, gender: normalizedGender } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        let responseUser = user;
        try {
            responseUser = await awardSignupRewards(user) || user;
        } catch (rewardError) {
            console.error('Signup reward error:', rewardError);
        }

        await PendingRegistration.findByIdAndDelete(pending._id);

        return res.status(201).json({
            success: true,
            message: 'Profile completed successfully!',
            token: buildTokenForUser(responseUser),
            user: buildAuthUserResponse(responseUser),
        });
    } catch (error) {
        console.error('Patient complete profile error:', error);

        if (error?.name === 'ValidationError') {
            const message = Object.values(error.errors || {})
                .map((item) => item?.message)
                .filter(Boolean)
                .join(', ') || 'Please review your profile details';
            return res.status(400).json({
                success: false,
                message,
                error: error.message,
            });
        }

        if (error?.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'account';
            const isEmptyMobileConflict = duplicateField === 'mobile' && (error.keyValue?.mobile == null || error.message?.includes('mobile: null'));
            return res.status(409).json({
                success: false,
                message: isEmptyMobileConflict
                    ? 'Patient signup is blocked by an old mobile-number database index. Please contact support.'
                    : `${duplicateField.charAt(0).toUpperCase()}${duplicateField.slice(1)} already exists. Please login instead.`,
                error: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error while completing patient profile',
            error: error.message,
        });
    }
};

// logout controller (for token-based auth, logout is handled on client-side)

export const Logout = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            await User.updateOne({ _id: req.user.id }, { $set: { token: null } });
            res.status(200).json({
                success: true,
                message: 'User logged out successfully',
            })
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during logout',
                error: error.message
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided',
        });
    }
};


// otp generation and verification controllers 
export const GenerateOTP = async (req, res) => {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + OTP_EXPIRY;
        await User.updateOne({ _id: req.user.id }, { $set: { otp, otp_expiry: expiry } });
        res.status(200).json({
            success: true,
            message: 'OTP generated successfully',
            otp,
        });
    } catch (error) {
        console.error('Generate OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP generation',
            error: error.message
        });
    }
};

export const VerifyOTP = async (req, res) => {
    const { userId, otp } = req.body;

    try {
        // Validation
        if (!userId || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId and OTP',
            });
        }

        // First try to verify a pending registration
        const pending = await PendingRegistration.findById(userId);
        if (pending) {
            authDebug('VerifyOTP pending found', {
                pendingId: pending._id,
                pendingEmail: pending.email || null,
                pendingMobile: pending.mobile || null,
                passwordHashPrefix: pending.passwordHash ? pending.passwordHash.slice(0, 7) : null,
                passwordHashLength: pending.passwordHash ? pending.passwordHash.length : 0,
            });
            if (!pending.otp || !pending.otp.code) {
                return res.status(400).json({
                    success: false,
                    message: 'No OTP found. Please register again.',
                });
            }

            if (pending.otp.code !== otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP. Please check and try again.',
                });
            }

            if (pending.otp.expiresAt < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP has expired. Please request a new OTP.',
                });
            }

            // Create the actual user ONLY NOW
            const userData = {
                name: pending.name,
                email: pending.email,
                mobile: pending.mobile,
                password: pending.passwordHash,
                role: pending.role,
                providerDocuments: pending.role === 'provider' ? pending.providerDocuments : undefined,
                profileImage: pending.role === 'provider' ? pending.providerDocuments?.profileImage : undefined,
                location: pending.location,
                isVerified: true,
                referredBy: pending.referredBy || null,
            };

            if (pending.role === 'provider') {
                userData.category = pending.category;
            }

            let user = await User.findOne({
                $or: [
                    ...(pending.email ? [{ email: pending.email }] : []),
                    ...(pending.mobile ? [{ mobile: pending.mobile }] : []),
                ],
            });
            const isExistingUser = !!user;
            if (!user) {
                user = new User(userData);
                user.$locals.skipPasswordHash = true;
                await user.save();
            }

            if (pending.role === 'provider' && !isExistingUser) {
                const acceptedDocs = await requireAcceptedDocuments({
                    acceptedDocumentIds: pending.acceptedLegalDocuments || [],
                    requiredSlugs: providerAgreementSlugs(pending.category),
                });
                if (acceptedDocs.ok) {
                    await saveAcceptanceLogs({
                        userId: user._id,
                        documents: acceptedDocs.documents,
                        req,
                        context: 'provider-registration',
                    });
                }
            }
            authDebug('VerifyOTP user created from pending', {
                userId: user._id,
                userEmail: user.email || null,
                userMobile: user.mobile || null,
                passwordHashPrefix: user.password ? user.password.slice(0, 7) : null,
                passwordHashLength: user.password ? user.password.length : 0,
                skipPasswordHash: true,
            });

            if (pending.role === 'provider') {
                const existingProvider = await Provider.findOne({ userId: user._id });
                const providerCreateData = {
                    userId: user._id,
                    aadharImages: pending.providerDocuments?.aadharImages || [],
                    documentation: pending.providerDocuments?.documentation || [],
                    status: 'pending',
                    category: pending.category,
                    specialization: pending.specialization,
                    profileImage: pending.providerDocuments?.profileImage,
                    fees: pending.extraData?.fees || pending.extraData?.baseCharges || 0,
                    experience: pending.extraData?.experience || 0,
                    location: pending.location,
                };
                
                // Add ambulance fields if present
                if (pending.providerDocuments) {
                    const singleFiles = [
                        'rcDocument', 'driverLicenseDocument', 'ambulancePhoto',
                        'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument',
                        'profileImage'
                    ];
                    singleFiles.forEach(f => {
                        if (pending.providerDocuments[f]) providerCreateData[f] = pending.providerDocuments[f];
                    });
                }
                
                if (pending.extraData) {
                    Object.assign(providerCreateData, pending.extraData);
                }
                
                if (!existingProvider) {
                    await Provider.create(normalizeProviderCreateData(providerCreateData));
                }
            }

            let responseUser = user;
            try {
                responseUser = await awardSignupRewards(user) || user;
            } catch (rewardError) {
                console.error('Signup reward error:', rewardError);
            }

            await PendingRegistration.findByIdAndDelete(pending._id);

            // Generate JWT
            const tokenPayload = {
                id: user._id,
                role: user.role,
            };
            if (user.role === 'provider') {
                tokenPayload.category = user.category;
            }

            const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: '30d' });

            const userResponse = buildAuthUserResponse(responseUser);

            return res.status(200).json({
                success: true,
                message: 'Account verified successfully! You can now login.',
                token,
                user: userResponse,
            });
        }

        // Backward compatibility: verify existing stored user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User is already verified. Please login.',
            });
        }

        // Check if OTP exists
        if (!user.otp || !user.otp.code) {
            return res.status(400).json({
                success: false,
                message: 'No OTP found. Please register again.',
            });
        }

        // Check if OTP matches
        if (user.otp.code !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please check and try again.',
            });
        }

        // Check if OTP is expired
        if (user.otp.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new OTP.',
            });
        }

        // Verify user and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        await user.save();

        let responseUser = user;
        try {
            responseUser = await awardSignupRewards(user) || user;
        } catch (rewardError) {
            console.error('Signup reward error:', rewardError);
        }

        // Generate JWT token with role and category (if provider)
        const tokenPayload = { 
            id: user._id, 
            role: user.role 
        };
        
        // Add category to token payload for providers
        if (user.role === 'provider') {
            tokenPayload.category = user.category;
        }
        
        const token = jwt.sign(
            tokenPayload,
            process.env.SECRET_KEY,
            { expiresIn: '30d' }
        );

        const userResponse = buildAuthUserResponse(responseUser);

        res.status(200).json({
            success: true,
            message: 'Account verified successfully! You can now login.',
            token,
            user: userResponse,
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP verification',
            error: error.message
        });
    }
};

// Resend OTP Controller
export const ResendOTP = async (req, res) => {
    try {
        // Check if body exists
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: 'Request body is missing. Please send data in JSON format.',
            });
        }

        const { userId } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId',
            });
        }

        const pending = await PendingRegistration.findById(userId);
        if (pending) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            pending.otp = {
                code: otp,
                expiresAt: new Date(Date.now() + OTP_EXPIRY),
            };
            await pending.save();

            try {
                await sendEmail({
                    email: pending.email,
                    subject: 'Resend: Verify Your Healthy Touch Account - New OTP',
                    otp: otp,
                });

                const body = {
                    success: true,
                    message: 'New OTP has been sent to your email successfully!',
                    email: pending.email,
                };

                if (process.env.NODE_ENV !== 'production') {
                    body.otp = otp;
                }

                return res.status(200).json(body);
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send OTP email. Please try again.',
                    error: emailError.message
                });
            }
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User is already verified. Please login.',
            });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = {
            code: otp,
            expiresAt: new Date(Date.now() + OTP_EXPIRY),
        };
        await user.save();

        // Send OTP via email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Resend: Verify Your Healthy Touch Account - New OTP',
                otp: otp,
            });

            res.status(200).json({
                success: true,
                message: 'New OTP has been sent to your email successfully!',
                email: user.email,
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please try again.',
                error: emailError.message
            });
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP resend',
            error: error.message
        });
    }
};

// Forgot Password Controller
export const ForgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const normalizedEmail = email ? String(email).trim().toLowerCase() : '';

        // Validation
        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email',
            });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Generate JWT token for password reset (valid for 1 hour)
        const resetToken = jwt.sign(
            { id: user._id },
            process.env.SECRET_KEY,
            { expiresIn: '1h' }
        );

        const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://healthytouch24.com').replace(/\/+$/, '');
        const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
                <h2>Password Reset - Healthy Touch</h2>
                <p>Hello ${user.name || 'User'},</p>
                <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
                <p>
                    <a href="${resetUrl}" style="display: inline-block; background: #0f8ea0; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
                        Reset Password
                    </a>
                </p>
                <p>If the button does not work, open this link:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                <p>If you did not request this, you can ignore this email.</p>
            </div>
        `;

        // Send password reset email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset - Healthy Touch',
                html,
                resetToken,
            });

            const responseBody = {
                success: true,
                message: 'Password reset email sent successfully!',
                email: user.email,
            };

            if (process.env.NODE_ENV !== 'production') {
                responseBody.resetToken = resetToken;
                responseBody.resetUrl = resetUrl;
            }

            res.status(200).json(responseBody);
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send password reset email. Please try again.',
                error: emailError.message
            });
        }
    } catch (error) {
        console.error('Forgot Password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password reset',
            error: error.message
        });
    }
};

export const ResetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        const settings = req.settings || await Settings.getSettings();

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide reset token and new password',
            });
        }

        if (password.length < settings.passwordMinLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${settings.passwordMinLength} characters long`,
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch {
            return res.status(400).json({
                success: false,
                message: 'Password reset link is invalid or expired',
            });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        user.password = password;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.',
        });
    } catch (error) {
        console.error('Reset Password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during password reset',
            error: error.message,
        });
    }
};

// Request Unsuspension
export const RequestUnsuspend = async (req, res) => {
    const { email, reason } = req.body;

    try {
        // Validation
        if (!email || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and reason for unsuspension request',
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!user.isSuspended) {
            return res.status(400).json({
                success: false,
                message: 'Your account is not suspended',
            });
        }

        // Calculate days suspended
        const suspendedDate = user.suspension?.suspendedAt || new Date();
        const daysSuspended = Math.floor((new Date() - suspendedDate) / (1000 * 60 * 60 * 24));

        // Send unsuspension request email to admin
        await sendTemplateEmail({
            to: process.env.EMAIL_USER, // Admin email
            subject: '🔔 Unsuspension Request from User',
            template: 'unsuspensionRequest',
            data: {
                userName: user.name,
                userEmail: user.email,
                userId: user._id,
                role: user.role,
                suspensionReason: user.suspension?.reason,
                suspendedAt: user.suspension?.suspendedAt,
                daysSuspended,
                requestReason: reason
            },
            fromEmail: user.email, // From user's email
            fromName: user.name
        });

        // Create notification for admin
        const Notification = (await import('../models/Notification.js')).default;
        await Notification.create({
            title: 'Unsuspension Request',
            message: `${user.name} (${user.role}) has requested account unsuspension`,
            type: 'general',
            recipient: 'admin',
            relatedUser: user._id,
            priority: 'high',
        });

        res.status(200).json({
            success: true,
            message: 'Unsuspension request sent to admin successfully. You will be notified via email once reviewed.',
            data: {
                email: user.email,
                suspendedSince: user.suspension?.suspendedAt,
                daysSuspended
            }
        });
    } catch (error) {
        console.error('Request unsuspend error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while processing unsuspension request',
            error: error.message
        });
    }
};

// @desc    Update user location
// @route   PUT /api/auth/update-location
// @access  Private
export const updateLocation = async (req, res) => {
    const { latitude, longitude, address } = req.body;

    try {
        // Validation
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Please provide latitude and longitude',
            });
        }

        // Validate latitude and longitude ranges
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude or longitude values',
            });
        }

        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const locationPayload = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: address || null,
            updatedAt: new Date(),
        };

        user.location = locationPayload;
        await user.save();

        // If provider, also persist to Provider profile for admin dashboards/approvals
        if (user.role === 'provider') {
            const provider = await Provider.findOne({ userId: user._id });
            if (provider) {
                provider.location = locationPayload;
                if (address) {
                    provider.address = {
                        ...(provider.address?.toObject ? provider.address.toObject() : provider.address || {}),
                        street: address,
                    };
                }
                await provider.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            location: user.location,
        });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating location',
            error: error.message,
        });
    }
};

// @desc    Get logged-in user's referral code
// @route   GET /api/auth/my-referral-code
// @access  Private
export const getMyReferralCode = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email mobile referralCode role');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Backfill referral code for older accounts where code was not present
        if (!user.referralCode) {
            user.referralCode = await generateReferralCodeForUser(user.name);
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Referral code fetched successfully',
            data: {
                userId: user._id,
                name: user.name,
                role: user.role,
                email: user.email || null,
                mobile: user.mobile || null,
                referralCode: user.referralCode || null,
            },
        });
    } catch (error) {
        console.error('Get referral code error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching referral code',
            error: error.message,
        });
    }
};
