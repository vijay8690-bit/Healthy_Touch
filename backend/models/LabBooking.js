import mongoose from 'mongoose';

const LabBookingItemSchema = new mongoose.Schema({
  labTestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTestMaster',
    required: true,
  },
  providerLabTestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderLabTest',
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
  },
  providerName: {
    type: String,
    trim: true,
  },
  testCode: {
    type: String,
    required: true,
  },
  testId: {
    type: String,
    required: true,
  },
  testName: {
    type: String,
    required: true,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { _id: false });

const LabBookingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tests: {
    type: [LabBookingItemSchema],
    required: true,
    validate: {
      validator: (tests) => Array.isArray(tests) && tests.length > 0,
      message: 'At least one test is required',
    },
  },
  selectedTests: {
    type: [LabBookingItemSchema],
    default: undefined,
  },
  assignedLabProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  appointmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  }],
  city: {
    type: String,
    required: true,
    trim: true,
  },
  collectionType: {
    type: String,
    enum: ['home', 'lab'],
    default: 'home',
  },
  preferredDate: {
    type: Date,
    required: true,
  },
  preferredTimeSlot: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  patientLocation: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    address: { type: String, trim: true },
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
  },
  patientMobile: {
    type: String,
    required: true,
    trim: true,
  },
  bookedByName: {
    type: String,
    trim: true,
  },
  bookedByMobile: {
    type: String,
    trim: true,
  },
  bookingFor: {
    type: String,
    enum: ['self', 'family'],
    default: 'self',
  },
  serviceReceiver: {
    memberId: String,
    name: String,
    relation: String,
    mobile: String,
    age: String,
    gender: String,
    medicalNotes: String,
  },
  totalOriginalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalSellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  grossAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  payableAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  coinsUsed: {
    type: Number,
    default: 0,
    min: 0,
  },
  coinValueInRupees: {
    type: Number,
    default: 1,
    min: 0,
  },
  coinDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  coinsRedeemed: {
    type: Boolean,
    default: false,
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    default: 'online',
  },
  transactionId: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: [
      'pending',
      'pending_admin_approval',
      'assigned_to_lab',
      'lab_accepted',
      'lab_rejected',
      'sample_collected',
      'report_ready',
      'completed',
      'confirmed',
      'rejected_by_admin',
      'cancelled',
    ],
    default: 'pending_admin_approval',
  },
  adminRejectionReason: {
    type: String,
    trim: true,
  },
  labRejectionReason: {
    type: String,
    trim: true,
  },
  reports: [{
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    reportId: { type: String, trim: true },
    generated: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  reportFiles: [{
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    reportType: { type: String, enum: ['main', 'summary', 'signature', 'other'], default: 'other' },
    reportId: { type: String, trim: true },
    generated: { type: Boolean, default: false },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  reportName: {
    type: String,
    trim: true,
  },
  reportUrl: {
    type: String,
    trim: true,
  },
  mainReportPdfUrl: {
    type: String,
    trim: true,
  },
  mainReportPdfName: {
    type: String,
    trim: true,
  },
  summaryPdfUrl: {
    type: String,
    trim: true,
  },
  summaryPdfName: {
    type: String,
    trim: true,
  },
  signatureFileUrl: {
    type: String,
    trim: true,
  },
  signatureFileName: {
    type: String,
    trim: true,
  },
  reportResults: [{
    section: { type: String, trim: true, default: 'General' },
    testName: { type: String, trim: true, required: true },
    result: { type: String, trim: true, required: true },
    unit: { type: String, trim: true },
    referenceRange: { type: String, trim: true },
    method: { type: String, trim: true },
  }],
  resultAttachmentUrl: {
    type: String,
    trim: true,
  },
  resultAttachmentName: {
    type: String,
    trim: true,
  },
  resultAttachmentMimeType: {
    type: String,
    trim: true,
  },
  resultAttachmentPreviewUrl: {
    type: String,
    trim: true,
  },
  summaryAttachmentUrl: {
    type: String,
    trim: true,
  },
  summaryAttachmentName: {
    type: String,
    trim: true,
  },
  summaryAttachmentMimeType: {
    type: String,
    trim: true,
  },
  comments: {
    type: String,
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
  },
  authorizedBy: {
    type: String,
    trim: true,
  },
  authorizedQualification: {
    type: String,
    trim: true,
  },
  registrationNumber: {
    type: String,
    trim: true,
  },
  signatureUrl: {
    type: String,
    trim: true,
  },
  generatedReportId: {
    type: String,
    trim: true,
  },
  reportGeneratedAt: Date,
  reportUploadedAt: Date,
  reportUploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reportStatus: {
    type: String,
    enum: ['pending', 'uploaded', 'reviewed'],
    default: 'pending',
  },
  acceptedLegalDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalDocument',
  }],
  sampleCollectedAt: Date,
  reportReadyAt: Date,
  completedAt: Date,
  statusHistory: [{
    status: { type: String, required: true },
    note: { type: String, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

LabBookingSchema.index({ patientId: 1, createdAt: -1 });
LabBookingSchema.index({ status: 1, preferredDate: 1 });
LabBookingSchema.index({ assignedLabProviderId: 1, status: 1 });
LabBookingSchema.index({ paymentId: 1 });

export default mongoose.model('LabBooking', LabBookingSchema);
