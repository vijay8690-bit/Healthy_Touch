import mongoose from 'mongoose';

const CaretakerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
    },
    age: {
        type: Number,
        required: true,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true,
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
    },
    specialization: {
        type: [String], // e.g., ['elderly care', 'post-surgery care', 'chronic illness']
        default: [],
    },
    experience: {
        type: Number, // years of experience
        required: true,
    },
    qualifications: {
        type: [String], // Educational qualifications
        default: [],
    },
    availability: {
        type: String,
        enum: ['available', 'assigned', 'on_leave', 'unavailable'],
        default: 'available',
    },
    assignedPatients: [{
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active',
        },
        notes: String,
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
    },
}, { timestamps: true });

// Index for better query performance
// Note: email and mobile already have unique indexes from schema definition (unique: true)
CaretakerSchema.index({ status: 1 });
CaretakerSchema.index({ availability: 1 });
CaretakerSchema.index({ 'assignedPatients.patientId': 1 });

export default mongoose.model('Caretaker', CaretakerSchema);
