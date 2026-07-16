import mongoose from 'mongoose';

const NurseAddonSchema = new mongoose.Schema({
  addOnName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

NurseAddonSchema.index({ isActive: 1, addOnName: 1 });

export default mongoose.model('NurseAddon', NurseAddonSchema);
