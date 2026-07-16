import mongoose from 'mongoose';

const LabReportParameterSchema = new mongoose.Schema({
  testName: { type: String, default: '', trim: true },
  name: { type: String, required: true, trim: true },
  methodology: { type: String, default: '', trim: true },
  resultValue: { type: String, required: true, trim: true },
  unit: { type: String, default: '', trim: true },
  normalRange: { type: String, default: '', trim: true },
  flag: {
    type: String,
    enum: ['', 'low', 'normal', 'high', 'critical'],
    default: '',
  },
}, { _id: false });

const LabReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
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
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabBooking',
    required: true,
    index: true,
  },
  testName: {
    type: String,
    required: true,
    trim: true,
  },
  parameters: {
    type: [LabReportParameterSchema],
    default: [],
  },
  generatedPdfUrl: {
    type: String,
    required: true,
    trim: true,
  },
  pdfStoragePath: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'generated', 'void'],
    default: 'draft',
    index: true,
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

LabReportSchema.index({ bookingId: 1, testName: 1, createdAt: -1 });

export default mongoose.model('LabReport', LabReportSchema);
