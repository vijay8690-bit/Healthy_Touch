import mongoose from 'mongoose';

const LegalAcceptanceLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LegalDocument',
      required: true,
      index: true,
    },
    documentVersion: {
      type: Number,
      required: true,
      min: 1,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    context: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

LegalAcceptanceLogSchema.index({ userId: 1, documentId: 1, documentVersion: 1, context: 1 });

export default mongoose.model('LegalAcceptanceLog', LegalAcceptanceLogSchema);
