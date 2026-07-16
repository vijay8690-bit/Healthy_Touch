import mongoose from 'mongoose';

const PackageOptionSchema = new mongoose.Schema({
  sessions: {
    type: Number,
    enum: [5, 10, 20],
    required: true,
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

const PhysiotherapyServiceSchema = new mongoose.Schema({
  name: {
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
    default: 'General',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  packages: {
    type: [PackageOptionSchema],
    default: [],
  },
}, { timestamps: true });

PhysiotherapyServiceSchema.index({ isActive: 1, category: 1, name: 1 });

export default mongoose.model('PhysiotherapyService', PhysiotherapyServiceSchema);
