import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';
import { uploadMultipleToCloudinary } from '../utils/uploadToCloudinary.js';
import crypto from 'crypto';

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

const calculateAgeFromDateOfBirth = (dateOfBirth) => {
    if (!dateOfBirth) return undefined;

    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return undefined;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age >= 0 ? age : undefined;
};

const normalizePatientProfileUpdate = (updateData = {}) => {
    const cleanedData = {};

    Object.keys(updateData).forEach(key => {
        const value = updateData[key];
        if (value !== '' && value !== null && value !== undefined) {
            cleanedData[key] = value;
        }
    });

    if (cleanedData.dateOfBirth) {
        const calculatedAge = calculateAgeFromDateOfBirth(cleanedData.dateOfBirth);
        if (calculatedAge !== undefined) {
            cleanedData.age = calculatedAge;
        }
    } else if (cleanedData.age !== undefined) {
        const age = Number(cleanedData.age);
        if (Number.isFinite(age)) {
            cleanedData.age = age;
        } else {
            delete cleanedData.age;
        }
    }

    if (cleanedData.height?.value && cleanedData.weight?.value) {
        const height = Number(cleanedData.height.value);
        const weight = Number(cleanedData.weight.value);
        if (Number.isFinite(height) && Number.isFinite(weight) && height > 0 && weight > 0) {
            const heightInMeters = height / 100;
            cleanedData.bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
        }
    }

    return cleanedData;
};

// @desc    Get patient profile (user data)
// @route   GET /api/patient/profile
// @access  Private (Patient only)
export const getPatientProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -otp');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. User is not a patient',
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
            message: 'Patient profile fetched successfully',
        });
    } catch (error) {
        console.error('Get patient profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching patient profile',
            error: error.message,
        });
    }
};

// @desc    Update patient profile
// @route   PUT /api/patient/profile
// @access  Private (Patient only)
export const updatePatientProfile = async (req, res) => {
    let { name, location } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. User is not a patient',
            });
        }

        // Parse JSON strings from FormData
        if (typeof location === 'string') {
            try {
                location = JSON.parse(location);
            } catch (e) {
                console.error('Failed to parse location:', e);
                location = null;
            }
        }

        // Handle profile image upload
        if (req.files && req.files.profileImage && req.files.profileImage.length > 0) {
            try {
                const profileImageFile = req.files.profileImage[0];
                const imageBase64 = `data:${profileImageFile.mimetype};base64,${profileImageFile.buffer.toString('base64')}`;
                const imageUpload = await uploadMultipleToCloudinary([imageBase64], 'patient-profiles');
                
                if (imageUpload.success && imageUpload.urls.length > 0) {
                    user.profileImage = imageUpload.urls[0];
                }
            } catch (uploadError) {
                console.error('Profile image upload error:', uploadError);
                // Continue with update even if image upload fails
            }
        }

        // Update fields if provided
        if (name) user.name = name;
        if (location) {
            user.location = {
                latitude: location.latitude || user.location?.latitude,
                longitude: location.longitude || user.location?.longitude,
                address: location.address || user.location?.address,
            };
        }

        await user.save();

        // Remove sensitive data before sending
        const updatedUser = user.toObject();
        delete updatedUser.password;
        delete updatedUser.otp;

        res.status(200).json({
            success: true,
            message: 'Patient profile updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Update patient profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating patient profile',
            error: error.message,
        });
    }
};

// ============================================
// PATIENT MEDICAL PROFILE APIs
// ============================================

// @desc    Get patient medical profile (for admin view)
// @route   GET /api/patient/:userId/medical-profile
// @access  Private (Admin, Provider)
export const getPatientMedicalProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const user = await User.findById(userId).select('-password -otp');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if user is a patient
        if (user.role !== 'patient') {
            return res.status(400).json({
                success: false,
                message: 'User is not a patient',
            });
        }

        // Get patient profile
        let profile = await PatientProfile.findOne({ userId })
            .populate('userId', 'name email mobile profileImage location')
            .populate({
                path: 'medications.prescribedBy',
                populate: { path: 'userId', select: 'name' },
            });

        // If profile doesn't exist, create a basic one
        if (!profile) {
            profile = await PatientProfile.create({ userId });
            await profile.populate('userId', 'name email mobile profileImage location');
        }

        // Get patient's appointments with provider details
        const appointments = await Appointment.find({ patientId: userId })
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name email mobile' }
            })
            .sort({ createdAt: -1 })
            .limit(20);

        // Get patient's medical records (provider notes, diagnosis, prescriptions)
        const medicalRecords = await MedicalRecord.find({ patientId: userId })
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name profileImage' }
            })
            .populate('appointmentId', 'date timeSlot')
            .sort({ createdAt: -1 })
            .limit(20);

        // Combine user data with medical profile, appointments, and medical records
        const combinedProfile = {
            ...user.toObject(),
            medicalProfile: profile.toObject(),
            appointments: appointments,
            medicalRecords: medicalRecords,
            assignedProviders: [...new Set(appointments.map(apt => apt.providerId))].filter(Boolean),
        };

        res.status(200).json({
            success: true,
            profile: combinedProfile,
        });
    } catch (error) {
        console.error('Get patient medical profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching patient medical profile',
            error: error.message,
        });
    }
};

// @desc    Update patient medical profile
// @route   PUT /api/patient/:userId/medical-profile
// @access  Private (Admin, Provider)
export const updatePatientMedicalProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = normalizePatientProfileUpdate(req.body);

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Find and update profile, create if doesn't exist
        let profile = await PatientProfile.findOneAndUpdate(
            { userId },
            updateData,
            { new: true, upsert: true, runValidators: true }
        ).populate('userId', 'name email mobile profileImage location');

        res.status(200).json({
            success: true,
            message: 'Patient medical profile updated successfully',
            profile,
        });
    } catch (error) {
        console.error('Update patient medical profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating patient medical profile',
            error: error.message,
        });
    }
};

// @desc    Add vital signs to patient profile
// @route   POST /api/patient/:userId/vitals
// @access  Private (Provider, Admin)
export const addVitalSigns = async (req, res) => {
    try {
        const { userId } = req.params;
        const { bloodPressure, bloodSugar, heartRate, temperature, oxygenLevel } = req.body;

        const currentTime = new Date();

        let profile = await PatientProfile.findOne({ userId });
        if (!profile) {
            profile = await PatientProfile.create({ userId });
        }

        // Update vitals with timestamp
        if (bloodPressure) {
            profile.vitals.bloodPressure = {
                systolic: bloodPressure.systolic,
                diastolic: bloodPressure.diastolic,
                recorded: currentTime,
            };
        }
        if (bloodSugar) {
            profile.vitals.bloodSugar = {
                value: bloodSugar.value,
                type: bloodSugar.type || 'Random',
                recorded: currentTime,
            };
        }
        if (heartRate) {
            profile.vitals.heartRate = {
                value: heartRate,
                recorded: currentTime,
            };
        }
        if (temperature) {
            profile.vitals.temperature = {
                value: temperature,
                recorded: currentTime,
            };
        }
        if (oxygenLevel) {
            profile.vitals.oxygenLevel = {
                value: oxygenLevel,
                recorded: currentTime,
            };
        }

        profile.vitals.lastCheckup = currentTime;
        await profile.save();

        res.status(200).json({
            success: true,
            message: 'Vital signs recorded successfully',
            vitals: profile.vitals,
        });
    } catch (error) {
        console.error('Add vital signs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding vital signs',
            error: error.message,
        });
    }
};

// @desc    Get my medical profile (for logged-in patient)
// @route   GET /api/patient/medical-profile/me
// @access  Private (Patient)
export const getMyMedicalProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        let profile = await PatientProfile.findOne({ userId })
            .populate('userId', 'name email mobile profileImage location')
            .populate({
                path: 'medications.prescribedBy',
                populate: { path: 'userId', select: 'name' },
            });

        if (!profile) {
            profile = await PatientProfile.create({ userId });
            await profile.populate('userId', 'name email mobile profileImage location');
        }

        res.status(200).json({
            success: true,
            profile,
        });
    } catch (error) {
        console.error('Get my medical profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching medical profile',
            error: error.message,
        });
    }
};

// @desc    Update my medical profile (Patient updating own profile)
// @route   PUT /api/patient/medical-profile/me
// @access  Private (Patient)
export const updateMyMedicalProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const cleanedData = normalizePatientProfileUpdate(req.body);

        // Find and update profile, create if doesn't exist
        let profile = await PatientProfile.findOneAndUpdate(
            { userId },
            cleanedData,
            { new: true, upsert: true, runValidators: true }
        ).populate('userId', 'name email mobile profileImage location');

        res.status(200).json({
            success: true,
            message: 'Medical profile updated successfully',
            profile,
        });
    } catch (error) {
        console.error('Update my medical profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating medical profile',
            error: error.message,
        });
    }
};
