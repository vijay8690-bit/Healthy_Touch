import mongoose from 'mongoose';

const PatientProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    // Personal Details
    dateOfBirth: {
        type: Date,
    },
    age: {
        type: Number,
        min: 0,
        max: 130,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    // Physical Measurements
    height: {
        value: Number, // in cm
        unit: {
            type: String,
            default: 'cm',
        },
    },
    weight: {
        value: Number, // in kg
        unit: {
            type: String,
            default: 'kg',
        },
    },
    bmi: {
        type: Number,
    },
    // Vital Signs (Latest)
    vitals: {
        bloodPressure: {
            systolic: Number,
            diastolic: Number,
            recorded: Date,
        },
        bloodSugar: {
            value: Number,
            type: {
                type: String,
                enum: ['Fasting', 'Random', 'Post-meal'],
            },
            recorded: Date,
        },
        heartRate: {
            value: Number,
            recorded: Date,
        },
        temperature: {
            value: Number, // in Celsius
            recorded: Date,
        },
        oxygenLevel: {
            value: Number, // SpO2 percentage
            recorded: Date,
        },
        lastCheckup: Date,
    },
    // Medical History
    diseases: [{
        name: String,
        diagnosedDate: Date,
        isActive: {
            type: Boolean,
            default: true,
        },
        notes: String,
    }],
    allergies: [{
        allergen: String,
        reaction: String,
        severity: {
            type: String,
            enum: ['Mild', 'Moderate', 'Severe'],
        },
        diagnosedDate: Date,
    }],
    medications: [{
        name: String,
        dosage: String,
        frequency: String,
        startDate: Date,
        endDate: Date,
        prescribedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Provider',
        },
    }],
    // Emergency Contact
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String,
    },
    // Medical Insurance
    insurance: {
        provider: String,
        policyNumber: String,
        validUntil: Date,
    },
    // Lifestyle
    lifestyle: {
        smoking: {
            type: String,
            enum: ['Never', 'Former', 'Current'],
        },
        alcohol: {
            type: String,
            enum: ['Never', 'Occasional', 'Regular'],
        },
        exercise: {
            type: String,
            enum: ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'],
        },
        diet: {
            type: String,
            enum: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Other'],
        },
    },
}, { timestamps: true });

// Calculate BMI automatically when height and weight are updated
PatientProfileSchema.pre('save', function () {
    if (this.height?.value && this.weight?.value) {
        const heightInMeters = this.height.value / 100;
        this.bmi = parseFloat((this.weight.value / (heightInMeters * heightInMeters)).toFixed(1));
    }
    
    // Calculate age from date of birth
    if (this.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        this.age = age;
    }
});

export default mongoose.model('PatientProfile', PatientProfileSchema);
