import mongoose from 'mongoose';

const LegalDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'legal',
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('LegalDocument', LegalDocumentSchema);
