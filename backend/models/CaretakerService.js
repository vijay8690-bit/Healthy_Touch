import mongoose from 'mongoose';

const CaretakerPackageSchema = new mongoose.Schema({
  packageType: {
    type: String,
    enum: ['hourly', '12_hours', '24_hours', 'weekly', 'monthly'],
    required: true,
  },
  label: { type: String, default: '', trim: true },
  shortLabel: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  durationHours: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  priceUnit: { type: String, default: 'shift', trim: true },
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const CaretakerServiceSchema = new mongoose.Schema({
  serviceName: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: { type: String, required: true, trim: true },
  handlesText: { type: String, default: '', trim: true },
  tags: { type: [String], default: [] },
  defaultGenderPreference: {
    type: String,
    enum: ['Female', 'Male', 'Any'],
    default: 'Any',
  },
  shiftType: { type: String, required: true, trim: true },
  durationHours: { type: Number, required: true, min: 1 },
  basePrice: { type: Number, required: true, min: 0 },
  basePriceUnit: { type: String, default: 'shift', trim: true },
  isActive: { type: Boolean, default: true },
  packages: { type: [CaretakerPackageSchema], default: [] },
}, { timestamps: true });

CaretakerServiceSchema.index({ isActive: 1, category: 1, serviceName: 1 });

export default mongoose.model('CaretakerService', CaretakerServiceSchema);
