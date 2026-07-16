import Caretaker from '../models/Caretaker.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Appointment from '../models/Appointment.js';
import  sendEmail  from '../utils/sendEmail.js';
import { getEmailTemplate } from '../utils/emailTemplates.js';
import { createSystemNotification } from './NotificationController.js';

const CARETAKER_CATEGORY = 'Caretaker';
const VALID_CARETAKER_SERVICE_TYPES = new Set([
    'Elder Care',
    'Patient Care',
    'Post Surgery Care',
    'Baby Care',
    'Home Assistance',
]);

const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const normalizeCaretakerServiceType = (value) => {
    const firstValue = toArray(value)[0];
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

    const mapped = aliases[normalized];
    if (mapped) return mapped;

    const exactMatch = [...VALID_CARETAKER_SERVICE_TYPES].find(
        (serviceType) => serviceType.toLowerCase() === firstValue.toLowerCase()
    );
    return exactMatch;
};

const mapProviderStatusToCaretaker = (status) => {
    if (status === 'approved') return 'active';
    if (status === 'rejected') return 'inactive';
    return 'pending';
};

const mapCaretakerStatusToProvider = (status) => {
    if (status === 'active' || status === 'approved') return 'approved';
    if (status === 'inactive' || status === 'rejected' || status === 'suspended') return 'rejected';
    return 'pending';
};

const providerToCaretaker = (provider) => {
    const plain = provider?.toObject ? provider.toObject() : provider;
    const user = plain?.userId || {};
    const serviceArea = plain.availableServiceArea?.length ? plain.availableServiceArea : plain.serviceArea;
    return {
        _id: plain._id,
        providerId: plain._id,
        userId: user?._id,
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        age: plain.age || '',
        gender: plain.gender || '',
        address: plain.address || {},
        specialization: plain.caretakerServiceType ? [plain.caretakerServiceType] : toArray(plain.specialization),
        experience: plain.experience || 0,
        qualifications: toArray(plain.qualification),
        languagesKnown: plain.languagesKnown || [],
        serviceArea: serviceArea || [],
        fees: plain.fees || 0,
        availability: plain.availabilityStatus === false ? 'unavailable' : 'available',
        status: mapProviderStatusToCaretaker(plain.status),
        providerStatus: plain.status,
        assignedPatients: [],
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};

// ============================================
// CARETAKER CRUD OPERATIONS (Admin Only)
// ============================================

// @desc    Create new caretaker
// @route   POST /api/admin/caretakers
// @access  Private (Admin only)
export const createCaretaker = async (req, res) => {
    try {
        const {
            name, email, mobile, age, gender, address,
            specialization, experience, qualifications, fees, serviceArea, languagesKnown, password
        } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedMobile = String(mobile || '').trim();
        const accountPassword = String(password || '');

        // Validation
        if (!name || !normalizedEmail || !normalizedMobile || !age || !gender || !experience) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields (name, email, mobile, age, gender, experience)',
            });
        }

        // Check if caretaker provider already exists
        let user = await User.findOne({
            $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }]
        });

        if (user) {
            const existingProvider = await Provider.findOne({
                userId: user._id,
                category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] },
            }).populate('userId', 'name email mobile profileImage');

            if (existingProvider) {
                return res.status(200).json({
                    success: true,
                    message: 'Caretaker already exists',
                    caretaker: providerToCaretaker(existingProvider),
                });
            }

            if (user.role !== 'provider' || ![CARETAKER_CATEGORY, 'Care Taker'].includes(user.category)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email or mobile number is already used by another account',
                });
            }
        }

        const createdUserIds = [];
        if (!user) {
            if (accountPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters',
                });
            }

            user = await User.create({
                name,
                email: normalizedEmail,
                mobile: normalizedMobile,
                password: accountPassword,
                role: 'provider',
                category: CARETAKER_CATEGORY,
                isVerified: true,
            });
            createdUserIds.push(user._id);
        }

        const providerExists = await Provider.findOne({
            userId: user._id,
            category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] },
        }).populate('userId', 'name email mobile profileImage');

        if (providerExists) {
            return res.status(200).json({
                success: true,
                message: 'Caretaker already exists',
                caretaker: providerToCaretaker(providerExists),
            });
        }

        const specializationValues = toArray(specialization);
        const caretakerServiceType = normalizeCaretakerServiceType(specializationValues);
        let provider;
        try {
            provider = await Provider.create({
                userId: user._id,
                category: CARETAKER_CATEGORY,
                specialization: specializationValues[0] || 'GDA Care Taker',
                caretakerServiceType,
                qualification: toArray(qualifications).join(', ') || 'N/A',
                fees: Number(fees) || 0,
                experience: Number(experience) || 0,
                age: Number(age) || undefined,
                gender,
                address,
                serviceArea: toArray(serviceArea),
                availableServiceArea: toArray(serviceArea),
                languagesKnown: toArray(languagesKnown),
                status: 'approved',
                aadharImages: ['admin-created'],
                documentation: ['admin-created'],
            });
        } catch (providerError) {
            if (createdUserIds.length) {
                await User.deleteMany({ _id: { $in: createdUserIds } });
            }
            throw providerError;
        }

        // Send email notification to caretaker without blocking record creation.
        try {
            const emailTemplate = getEmailTemplate('caretakerCreatedByAdmin', {
                caretakerName: name,
                caretakerEmail: normalizedEmail,
                caretakerMobile: normalizedMobile,
                specialization,
                experience,
                qualifications
            });
            await sendEmail(email, 'New Caretaker', emailTemplate);
        } catch (emailError) {
            console.error('Caretaker creation email error:', emailError);
        }

        // Create admin notification for new caretaker
        try {
            await createSystemNotification({
                title: '👨‍⚕️ New Caretaker Added',
                message: `Admin created new caretaker: ${name} (${specialization || 'General'})`,
                type: 'general',
                recipient: 'admin',
                priority: 'low'
            });
        } catch (error) {
            console.error('Notification error:', error);
        }

        res.status(201).json({
            success: true,
            message: 'Caretaker provider created successfully',
            caretaker: providerToCaretaker(await provider.populate('userId', 'name email mobile profileImage')),
        });
    } catch (error) {
        console.error('Create caretaker error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating caretaker',
            error: error.message,
        });
    }
};

// @desc    Get all caretakers with filters
// @route   GET /api/admin/caretakers
// @access  Private (Admin only)
export const getAllCaretakers = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            availability, 
            specialization,
            search 
        } = req.query;

        // Build provider-backed filter query
        const filter = { category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] } };

        if (status && status !== 'all') filter.status = mapCaretakerStatusToProvider(status);
        if (availability && availability !== 'all') filter.availabilityStatus = availability === 'unavailable' ? false : true;
        if (specialization) filter.$or = [{ specialization: new RegExp(specialization, 'i') }, { caretakerServiceType: new RegExp(specialization, 'i') }];
        
        if (search) {
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { mobile: { $regex: search, $options: 'i' } },
                ],
            }).select('_id');
            filter.userId = { $in: matchingUsers.map((user) => user._id) };
        }

        const providers = await Provider.find(filter)
            .populate('userId', 'name email mobile profileImage')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Provider.countDocuments(filter);

        // Calculate statistics
        const stats = {
            total: await Provider.countDocuments({ category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] } }),
            available: await Provider.countDocuments({ category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] }, availabilityStatus: { $ne: false } }),
            assigned: 0,
            onLeave: 0,
            active: await Provider.countDocuments({ category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] }, status: 'approved' }),
            inactive: await Provider.countDocuments({ category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] }, status: 'rejected' }),
            pending: await Provider.countDocuments({ category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] }, status: 'pending' }),
        };
        const caretakers = providers.map(providerToCaretaker);

        res.status(200).json({
            success: true,
            count: caretakers.length,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            stats,
            caretakers,
        });
    } catch (error) {
        console.error('Get all caretakers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching caretakers',
            error: error.message,
        });
    }
};

// @desc    Get caretaker by ID
// @route   GET /api/admin/caretakers/:id
// @access  Private (Admin only)
export const getCaretakerById = async (req, res) => {
    try {
        const provider = await Provider.findOne({ _id: req.params.id, category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] } })
            .populate('userId', 'name email mobile profileImage');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Caretaker not found',
            });
        }

        res.status(200).json({
            success: true,
            caretaker: providerToCaretaker(provider),
        });
    } catch (error) {
        console.error('Get caretaker error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching caretaker',
            error: error.message,
        });
    }
};

// @desc    Update caretaker
// @route   PUT /api/admin/caretakers/:id
// @access  Private (Admin only)
export const updateCaretaker = async (req, res) => {
    try {
        const provider = await Provider.findOne({ _id: req.params.id, category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] } });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Caretaker not found',
            });
        }

        const userUpdates = {};
        ['name', 'email', 'mobile'].forEach((key) => {
            if (req.body[key] !== undefined) userUpdates[key] = req.body[key];
        });
        if (Object.keys(userUpdates).length) await User.findByIdAndUpdate(provider.userId, userUpdates);

        if (req.body.age !== undefined) provider.age = Number(req.body.age);
        if (req.body.gender !== undefined) provider.gender = req.body.gender;
        if (req.body.address !== undefined) provider.address = req.body.address;
        if (req.body.specialization !== undefined) {
            const specs = toArray(req.body.specialization);
            provider.specialization = specs[0] || provider.specialization;
            const caretakerServiceType = normalizeCaretakerServiceType(specs);
            if (caretakerServiceType) provider.caretakerServiceType = caretakerServiceType;
        }
        if (req.body.experience !== undefined) provider.experience = Number(req.body.experience);
        if (req.body.qualifications !== undefined) provider.qualification = toArray(req.body.qualifications).join(', ') || provider.qualification;
        if (req.body.fees !== undefined) provider.fees = Number(req.body.fees) || provider.fees;
        if (req.body.serviceArea !== undefined) {
            provider.serviceArea = toArray(req.body.serviceArea);
            provider.availableServiceArea = toArray(req.body.serviceArea);
        }
        if (req.body.languagesKnown !== undefined) provider.languagesKnown = toArray(req.body.languagesKnown);
        if (req.body.status !== undefined) provider.status = mapCaretakerStatusToProvider(req.body.status);
        if (req.body.availability !== undefined) provider.availabilityStatus = req.body.availability !== 'unavailable';

        await provider.save();

        const updatedCaretaker = await Provider.findById(provider._id).populate('userId', 'name email mobile profileImage');

        res.status(200).json({
            success: true,
            message: 'Caretaker updated successfully',
            caretaker: providerToCaretaker(updatedCaretaker),
        });
    } catch (error) {
        console.error('Update caretaker error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating caretaker',
            error: error.message,
        });
    }
};

// @desc    Delete caretaker
// @route   DELETE /api/admin/caretakers/:id
// @access  Private (Admin only)
export const deleteCaretaker = async (req, res) => {
    try {
        const provider = await Provider.findOne({ _id: req.params.id, category: { $in: [CARETAKER_CATEGORY, 'Care Taker'] } });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Caretaker not found',
            });
        }

        // Check if caretaker has active patient assignments
        const activeAssignments = await Appointment.countDocuments({
            providerId: provider._id,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (activeAssignments > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete caretaker. They have ${activeAssignments} active patient assignment(s). Please reassign patients first.`,
            });
        }

        await Provider.findByIdAndDelete(req.params.id);
        await User.findByIdAndDelete(provider.userId);

        res.status(200).json({
            success: true,
            message: 'Caretaker deleted successfully',
        });
    } catch (error) {
        console.error('Delete caretaker error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting caretaker',
            error: error.message,
        });
    }
};

// ============================================
// PATIENT ASSIGNMENT OPERATIONS
// ============================================

// @desc    Assign caretaker to patient
// @route   POST /api/admin/caretakers/:id/assign
// @access  Private (Admin only)
export const assignCaretakerToPatient = async (req, res) => {
    try {
        const { patientId, notes } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide patientId',
            });
        }

        // Check if caretaker exists
        const caretaker = await Caretaker.findById(req.params.id);
        if (!caretaker) {
            return res.status(404).json({
                success: false,
                message: 'Caretaker not found',
            });
        }

        // Check if patient exists and is a patient
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        if (patient.role !== 'patient') {
            return res.status(400).json({
                success: false,
                message: 'User is not a patient',
            });
        }

        // Check if patient is already assigned to this caretaker
        const alreadyAssigned = caretaker.assignedPatients.find(
            p => p.patientId.toString() === patientId && p.status === 'active'
        );

        if (alreadyAssigned) {
            return res.status(400).json({
                success: false,
                message: 'Patient is already assigned to this caretaker',
            });
        }

        // Add patient to caretaker's assigned patients
        caretaker.assignedPatients.push({
            patientId,
            assignedDate: new Date(),
            status: 'active',
            notes: notes || '',
        });

        // Update caretaker availability
        if (caretaker.availability === 'available') {
            caretaker.availability = 'assigned';
        }

        await caretaker.save();

        const updatedCaretaker = await Caretaker.findById(caretaker._id)
            .populate('assignedPatients.patientId', 'name email mobile address');

        // Send email notification to patient
        try {
            const emailData = {
                patientName: patient.name,
                caretakerName: caretaker.name,
                caretakerEmail: caretaker.email,
                caretakerMobile: caretaker.mobile,
                specialization: caretaker.specialization,
                experience: caretaker.experience,
                qualifications: caretaker.qualifications,
                assignedDate: new Date(),
                notes: notes || '',
            };

            const emailTemplate = getEmailTemplate('caretakerAssignment', emailData);
            
            await sendEmail({
                to: patient.email,
                subject: 'Caretaker Assigned - Healthy Touch',
                html: emailTemplate,
            });

            console.log(`✅ Caretaker assignment email sent to ${patient.email}`);
        } catch (emailError) {
            console.error('Error sending caretaker assignment email:', emailError);
            // Don't fail the assignment if email fails
        }

        res.status(200).json({
            success: true,
            message: 'Patient assigned to caretaker successfully',
            caretaker: updatedCaretaker,
        });
    } catch (error) {
        console.error('Assign caretaker error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while assigning caretaker',
            error: error.message,
        });
    }
};

// @desc    Unassign caretaker from patient
// @route   PUT /api/admin/caretakers/:id/unassign/:patientId
// @access  Private (Admin only)
export const unassignCaretakerFromPatient = async (req, res) => {
    try {
        const { id: caretakerId, patientId } = req.params;

        const caretaker = await Caretaker.findById(caretakerId);
        if (!caretaker) {
            return res.status(404).json({
                success: false,
                message: 'Caretaker not found',
            });
        }

        // Find the assignment
        const assignment = caretaker.assignedPatients.find(
            p => p.patientId.toString() === patientId && p.status === 'active'
        );

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Patient assignment not found',
            });
        }

        // Mark assignment as completed
        assignment.status = 'completed';

        // Check if caretaker has any other active assignments
        const activeAssignments = caretaker.assignedPatients.filter(
            p => p.status === 'active'
        ).length;

        // Update availability if no active assignments
        if (activeAssignments === 0) {
            caretaker.availability = 'available';
        }

        await caretaker.save();

        const updatedCaretaker = await Caretaker.findById(caretaker._id)
            .populate('assignedPatients.patientId', 'name email mobile');

        res.status(200).json({
            success: true,
            message: 'Patient unassigned from caretaker successfully',
            caretaker: updatedCaretaker,
        });
    } catch (error) {
        console.error('Unassign caretaker error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while unassigning caretaker',
            error: error.message,
        });
    }
};

// @desc    Get all patients assigned to a caretaker
// @route   GET /api/admin/caretakers/:id/patients
// @access  Private (Admin only)
export const getCaretakerPatients = async (req, res) => {
    try {
        const { status = 'active' } = req.query;

        const caretaker = await Caretaker.findById(req.params.id)
            .populate('assignedPatients.patientId', 'name email mobile address');

        if (!caretaker) {
            return res.status(404).json({
                success: false,
                message: 'Caretaker not found',
            });
        }

        // Filter patients by status
        const patients = caretaker.assignedPatients.filter(
            p => status === 'all' || p.status === status
        );

        res.status(200).json({
            success: true,
            count: patients.length,
            patients,
        });
    } catch (error) {
        console.error('Get caretaker patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching patients',
            error: error.message,
        });
    }
};

// @desc    Get patient's caretaker
// @route   GET /api/admin/caretakers/patient/:patientId
// @access  Private (Admin only)
export const getPatientCaretaker = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Find caretaker with active assignment to this patient
        const caretaker = await Caretaker.findOne({
            'assignedPatients.patientId': patientId,
            'assignedPatients.status': 'active',
        })
        .populate('assignedPatients.patientId', 'name email mobile');

        if (!caretaker) {
            return res.status(404).json({
                success: false,
                message: 'No caretaker assigned to this patient',
            });
        }

        // Get the specific assignment details
        const assignment = caretaker.assignedPatients.find(
            p => p.patientId._id.toString() === patientId && p.status === 'active'
        );

        res.status(200).json({
            success: true,
            caretaker: {
                ...caretaker.toObject(),
                currentAssignment: assignment,
            },
        });
    } catch (error) {
        console.error('Get patient caretaker error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching caretaker',
            error: error.message,
        });
    }
};

// @desc    Get available caretakers
// @route   GET /api/admin/caretakers/available
// @access  Private (Admin only)
export const getAvailableCaretakers = async (req, res) => {
    try {
        const { specialization } = req.query;

        const filter = {
            availability: 'available',
            status: 'active',
        };

        if (specialization) {
            filter.specialization = { $in: [specialization] };
        }

        const caretakers = await Caretaker.find(filter)
            .sort({ experience: -1 });

        res.status(200).json({
            success: true,
            count: caretakers.length,
            caretakers,
        });
    } catch (error) {
        console.error('Get available caretakers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching available caretakers',
            error: error.message,
        });
    }
};
