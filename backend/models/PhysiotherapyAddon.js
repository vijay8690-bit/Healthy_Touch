import mongoose from 'mongoose';

const PhysiotherapyAddonSchema = new mongoose.Schema({
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

PhysiotherapyAddonSchema.index({ isActive: 1, name: 1 });

export default mongoose.model('PhysiotherapyAddon', PhysiotherapyAddonSchema);
