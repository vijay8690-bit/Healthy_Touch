import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
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
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: true, // Only patients who had appointments can review
    },
}, { timestamps: true });

// One review per appointment
ReviewSchema.index({ appointmentId: 1 }, { unique: true });
ReviewSchema.index({ providerId: 1 });

export default mongoose.model('Review', ReviewSchema);
