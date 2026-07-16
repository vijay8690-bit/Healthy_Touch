import mongoose from 'mongoose';

const providerPayoutSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    labBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabBooking',
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Payment breakdown
    grossAmount: {
      type: Number,
      required: true, // Total amount patient paid
    },
    platformCommission: {
      type: Number,
      default: 0,
    },
    gstPercentage: {
      type: Number,
      required: true,
      default: 18,
    },
    gstAmount: {
      type: Number,
      required: true, // Calculated GST
    },
    netAmount: {
      type: Number,
      required: true, // Amount after GST deduction (grossAmount - gstAmount)
    },
    // Payout status
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'ON_HOLD'],
      default: 'PENDING',
      index: true,
    },
    // Payment release details
    paymentMode: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Other'],
    },
    // Appointment completion tracking
    completedAt: {
      type: Date,
    },
    // Planned release date (7 days after completion)
    releasedOn: {
      type: Date,
      index: true,
    },
    transactionId: {
      type: String, // UTR number or transaction reference
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who released payment
    },
    releasedAt: {
      type: Date,
    },
    remarks: {
      type: String, // Admin can add notes
    },
    // Week tracking for weekly payout
    weekNumber: {
      type: Number, // Week number of the year
    },
    year: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

providerPayoutSchema.pre('save', function () {
  if (this.completedAt && !this.releasedOn) {
    const releasedOn = new Date(this.completedAt);
    releasedOn.setDate(releasedOn.getDate() + 7);
    this.releasedOn = releasedOn;
  }
});

// Index for efficient queries
providerPayoutSchema.index({ providerId: 1, status: 1 });
providerPayoutSchema.index({ labBookingId: 1 });
providerPayoutSchema.index({ weekNumber: 1, year: 1 });
providerPayoutSchema.index({ createdAt: -1 });

// Virtual for payment date
providerPayoutSchema.virtual('paymentDate').get(function() {
  return this.releasedAt || this.createdAt;
});

// Static method to calculate weekly summary
providerPayoutSchema.statics.getWeeklySummary = async function(providerId, weekNumber, year) {
  return this.aggregate([
    {
      $match: {
        providerId: new mongoose.Types.ObjectId(providerId),
        weekNumber,
        year,
      },
    },
    {
      $group: {
        _id: '$status',
        totalGross: { $sum: '$grossAmount' },
        totalGst: { $sum: '$gstAmount' },
        totalNet: { $sum: '$netAmount' },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to get provider earnings summary
providerPayoutSchema.statics.getProviderSummary = async function(providerId) {
  const summary = await this.aggregate([
    {
      $match: {
        providerId: new mongoose.Types.ObjectId(providerId),
      },
    },
    {
      $group: {
        _id: '$status',
        totalGross: { $sum: '$grossAmount' },
        totalGst: { $sum: '$gstAmount' },
        totalNet: { $sum: '$netAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    pending: { gross: 0, gst: 0, net: 0, count: 0 },
    paid: { gross: 0, gst: 0, net: 0, count: 0 },
    total: { gross: 0, gst: 0, net: 0, count: 0 },
  };

  summary.forEach((item) => {
    if (item._id === 'PENDING') {
      result.pending = {
        gross: item.totalGross,
        gst: item.totalGst,
        net: item.totalNet,
        count: item.count,
      };
    } else if (item._id === 'PAID') {
      result.paid = {
        gross: item.totalGross,
        gst: item.totalGst,
        net: item.totalNet,
        count: item.count,
      };
    }
  });

  result.total = {
    gross: result.pending.gross + result.paid.gross,
    gst: result.pending.gst + result.paid.gst,
    net: result.pending.net + result.paid.net,
    count: result.pending.count + result.paid.count,
  };

  return result;
};

// Method to get current week number
providerPayoutSchema.statics.getCurrentWeek = function() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const weekNumber = Math.floor(diff / oneWeek) + 1;
  return { weekNumber, year: now.getFullYear() };
};

const ProviderPayout = mongoose.model('ProviderPayout', providerPayoutSchema);

export default ProviderPayout;
