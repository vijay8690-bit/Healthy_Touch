import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1000,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    bankAccountNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{9,18}$/, 'Bank account number must be 9 to 18 digits'],
    },
    ifscCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'],
    },
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    transactionId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    approvedAt: Date,
    paidAt: Date,
    rejectedAt: Date,
  },
  {
    timestamps: true,
  }
);

withdrawalRequestSchema.index({ userId: 1, status: 1 });
withdrawalRequestSchema.index({ requestedAt: -1 });

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

export default WithdrawalRequest;
