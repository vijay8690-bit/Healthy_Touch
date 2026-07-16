import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      maxlength: [120, 'Role cannot exceed 120 characters'],
    },
    bio: {
      type: String,
      required: [true, 'Bio is required'],
      trim: true,
      maxlength: [1200, 'Bio cannot exceed 1200 characters'],
    },
    avatar: {
      type: String,
      required: [true, 'Avatar URL is required'],
      trim: true,
    },
    experience: {
      type: String,
      trim: true,
      maxlength: [60, 'Experience cannot exceed 60 characters'],
      default: '',
    },
    profileLink: {
      type: String,
      trim: true,
      default: '',
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Display order cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

export default TeamMember;