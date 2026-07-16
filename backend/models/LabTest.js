import mongoose from 'mongoose';

const LabTestSchema = new mongoose.Schema({
  testId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
  },
  testCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  testName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  parameters: {
    type: [String],
    default: [],
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  reportTime: {
    type: String,
    required: true,
    trim: true,
  },
  fastingRequired: {
    type: Boolean,
    default: false,
  },
  homeCollection: {
    type: Boolean,
    default: true,
  },
  recommendedFor: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  isRecommendedPackage: {
    type: Boolean,
    default: false,
  },
  isFullBodyPackage: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

LabTestSchema.index({
  testId: 'text',
  testName: 'text',
  testCode: 'text',
  category: 'text',
  description: 'text',
  parameters: 'text',
  recommendedFor: 'text',
});
LabTestSchema.index({ category: 1, city: 1, status: 1 });
LabTestSchema.index({ sellingPrice: 1 });

export default mongoose.model('LabTest', LabTestSchema);
