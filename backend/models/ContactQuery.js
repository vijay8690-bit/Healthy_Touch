import mongoose from 'mongoose';

const contactQuerySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['OPEN', 'REPLIED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    adminReply: {
      type: String,
      trim: true,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who replied
    },
    repliedAt: {
      type: Date,
    },
    // Optional: IP address for tracking
    ipAddress: {
      type: String,
    },
    // Optional: Browser/device info
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
contactQuerySchema.index({ createdAt: -1 });
contactQuerySchema.index({ status: 1, createdAt: -1 });

// Virtual for response time (if replied)
contactQuerySchema.virtual('responseTime').get(function() {
  if (this.repliedAt && this.createdAt) {
    return Math.floor((this.repliedAt - this.createdAt) / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Static method to get statistics
contactQuerySchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    open: 0,
    replied: 0,
    closed: 0,
  };

  stats.forEach((item) => {
    result.total += item.count;
    if (item._id === 'OPEN') result.open = item.count;
    else if (item._id === 'REPLIED') result.replied = item.count;
    else if (item._id === 'CLOSED') result.closed = item.count;
  });

  return result;
};

const ContactQuery = mongoose.model('ContactQuery', contactQuerySchema);

export default ContactQuery;
