import mongoose from 'mongoose';

const NursePackageOptionSchema = new mongoose.Schema({
  packageType: {
    type: String,
    enum: ['5_visits', '10_visits', 'monthly'],
    required: true,
  },
  visitsCount: {
    type: Number,
    required: true,
    min: 1,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  customPrice: {
    type: Number,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const NurseServiceSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    default: 'General Nursing',
  },
  requiredEquipment: {
    type: String,
    default: '',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  packages: {
    type: [NursePackageOptionSchema],
    default: [],
  },
}, { timestamps: true });

NurseServiceSchema.index({ isActive: 1, category: 1, serviceName: 1 });

export default mongoose.model('NurseService', NurseServiceSchema);
