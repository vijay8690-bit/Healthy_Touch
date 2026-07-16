import mongoose from 'mongoose';

const VisitAttendanceSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true,
    index: true,
  },
  visitNumber: { type: Number, required: true },
  visitDate: { type: Date, required: true, index: true },
  visitCode: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'verified', 'absent', 'skipped'],
    default: 'pending',
    index: true,
  },
  verifiedAt: { type: Date },
  verifiedByProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  codeExpiresAt: { type: Date, required: true },
  notes: { type: String },
}, { timestamps: true });

VisitAttendanceSchema.index({ appointmentId: 1, visitNumber: 1 }, { unique: true });
VisitAttendanceSchema.index({ appointmentId: 1, visitDate: 1 });
VisitAttendanceSchema.index({ providerId: 1, visitDate: 1 });

export default mongoose.model('VisitAttendance', VisitAttendanceSchema);
