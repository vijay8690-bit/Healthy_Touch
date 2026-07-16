import mongoose from 'mongoose';

const MedicalRecordSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider',
        required: true,
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
    },
    remarks: {
        type: String,
        required: true,
    },
    diagnosis: {
        type: String,
    },
    prescription: {
        type: String,
    },
    documents: [
        {
            type: String, // URLs for uploaded documents/reports
        }
    ],
}, { timestamps: true });

// Index for better query performance
MedicalRecordSchema.index({ patientId: 1 });
MedicalRecordSchema.index({ providerId: 1 });
MedicalRecordSchema.index({ appointmentId: 1 });

export default mongoose.model('MedicalRecord', MedicalRecordSchema);
