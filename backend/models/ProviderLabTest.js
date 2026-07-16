import mongoose from 'mongoose';

const ProviderLabTestSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true,
  },
  labTestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTestMaster',
    required: true,
  },
  price: {
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
  city: {
    type: String,
    required: true,
    trim: true,
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
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, { timestamps: true });

ProviderLabTestSchema.index({ providerId: 1, labTestId: 1 }, { unique: true });
ProviderLabTestSchema.index({ city: 1, status: 1 });
ProviderLabTestSchema.index({ price: 1 });

export default mongoose.model('ProviderLabTest', ProviderLabTestSchema);
