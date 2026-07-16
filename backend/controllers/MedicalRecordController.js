import MedicalRecord from '../models/MedicalRecord.js';
import Appointment from '../models/Appointment.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import { notifyPatientMedicalRecord, notifyPatientProviderNotes } from '../utils/notificationService.js';

// @desc    Create medical record
// @route   POST /api/medical-records
// @access  Private (Provider only)
export const createMedicalRecord = async (req, res) => {
    const { patientId, appointmentId, remarks, diagnosis, prescription, documents } = req.body;

    try {
        // Validation
        if (!patientId || !appointmentId || !remarks) {
            return res.status(400).json({
                success: false,
                message: 'Please provide patientId, appointmentId, and remarks',
            });
        }

        // Check if user is provider
        const user = await User.findById(req.user.id);
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can create medical records',
            });
        }

        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        // Check if appointment exists and belongs to this provider
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        if (appointment.providerId.toString() !== provider._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create record for this appointment',
            });
        }

        if (appointment.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Medical records can only be added for completed appointments',
            });
        }

        // Check if medical record already exists for this appointment
        const existingRecord = await MedicalRecord.findOne({ appointmentId });
        if (existingRecord) {
            return res.status(400).json({
                success: false,
                message: 'Medical record already exists for this appointment',
            });
        }

        // Create medical record
        const medicalRecord = await MedicalRecord.create({
            patientId,
            providerId: provider._id,
            appointmentId,
            remarks,
            diagnosis,
            prescription,
            documents: documents || [],
        });

        const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
            .populate('patientId', 'name email mobile profileImage')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId');

        // Notify patient about new medical record
        try {
            await notifyPatientMedicalRecord(medicalRecord, patientId, false);
        } catch (error) {
            console.error('Medical record notification error:', error);
        }

        res.status(201).json({
            success: true,
            message: 'Medical record created successfully',
            medicalRecord: populatedRecord,
        });
    } catch (error) {
        console.error('Create medical record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating medical record',
            error: error.message,
        });
    }
};

// @desc    Get patient's medical records
// @route   GET /api/medical-records/patient/:patientId
// @access  Private (Patient can view own, Provider can view their patient's)
export const getPatientMedicalRecords = async (req, res) => {
    try {
        const { patientId } = req.params;
        const user = await User.findById(req.user.id);

        // Authorization check
        if (user.role === 'patient' && req.user.id !== patientId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view these medical records',
            });
        }

        const medicalRecords = await MedicalRecord.find({ patientId })
            .populate('patientId', 'name email mobile profileImage')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: medicalRecords.length,
            medicalRecords,
        });
    } catch (error) {
        console.error('Get patient medical records error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching medical records',
            error: error.message,
        });
    }
};

// @desc    Get my medical records (as patient)
// @route   GET /api/medical-records/my-records
// @access  Private (Patient only)
export const getMyMedicalRecords = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can view their medical records',
            });
        }

        const medicalRecords = await MedicalRecord.find({ patientId: req.user.id })
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: medicalRecords.length,
            medicalRecords,
        });
    } catch (error) {
        console.error('Get my medical records error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching medical records',
            error: error.message,
        });
    }
};

// @desc    Get single medical record
// @route   GET /api/medical-records/:id
// @access  Private 
export const getMedicalRecordById = async (req, res) => {
    try {
        const medicalRecord = await MedicalRecord.findById(req.params.id)
            .populate('patientId', 'name email mobile profileImage')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId');

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found',
            });
        }

        // Authorization check
        const user = await User.findById(req.user.id);
        const provider = user.role === 'provider' ? await Provider.findOne({ userId: req.user.id }) : null;

        const isAuthorized = 
            medicalRecord.patientId._id.toString() === req.user.id ||
            (provider && medicalRecord.providerId._id.toString() === provider._id.toString());

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this medical record',
            });
        }

        res.status(200).json({
            success: true,
            medicalRecord,
        });
    } catch (error) {
        console.error('Get medical record by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching medical record',
            error: error.message,
        });
    }
};

// @desc    Update medical record
// @route   PUT /api/medical-records/:id
// @access  Private (Provider only)
export const updateMedicalRecord = async (req, res) => {
    const { remarks, diagnosis, prescription, documents } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can update medical records',
            });
        }

        const provider = await Provider.findOne({ userId: req.user.id });
        const medicalRecord = await MedicalRecord.findById(req.params.id);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found',
            });
        }

        // Check if record belongs to this provider
        if (medicalRecord.providerId.toString() !== provider._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this medical record',
            });
        }

        // Update fields
        if (remarks) medicalRecord.remarks = remarks;
        if (diagnosis) medicalRecord.diagnosis = diagnosis;
        if (prescription) medicalRecord.prescription = prescription;
        if (documents) medicalRecord.documents = documents;

        await medicalRecord.save();

        const updatedRecord = await MedicalRecord.findById(medicalRecord._id)
            .populate('patientId', 'name email mobile profileImage')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId');

        // Notify patient about updated medical record
        try {
            await notifyPatientMedicalRecord(medicalRecord, medicalRecord.patientId._id || medicalRecord.patientId, true);
            await notifyPatientProviderNotes(
                medicalRecord.patientId._id || medicalRecord.patientId,
                updatedRecord.providerId.userId.name,
                true
            );
        } catch (error) {
            console.error('Medical record update notification error:', error);
        }

        res.status(200).json({
            success: true,
            message: 'Medical record updated successfully',
            medicalRecord: updatedRecord,
        });
    } catch (error) {
        console.error('Update medical record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating medical record',
            error: error.message,
        });
    }
};

// @desc    Delete medical record
// @route   DELETE /api/medical-records/:id
// @access  Private (Provider only)
export const deleteMedicalRecord = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can delete medical records',
            });
        }

        const provider = await Provider.findOne({ userId: req.user.id });
        const medicalRecord = await MedicalRecord.findById(req.params.id);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Medical record not found',
            });
        }

        // Check if record belongs to this provider
        if (medicalRecord.providerId.toString() !== provider._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this medical record',
            });
        }

        await MedicalRecord.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Medical record deleted successfully',
        });
    } catch (error) {
        console.error('Delete medical record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting medical record',
            error: error.message,
        });
    }
};
