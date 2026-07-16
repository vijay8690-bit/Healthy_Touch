import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Appointment from '../models/Appointment.js';
import LabTest from '../models/LabTest.js';
import LabBooking from '../models/LabBooking.js';
import LabReport from '../models/LabReport.js';
import Counter from '../models/Counter.js';
import Settings from '../models/Settings.js';
import Payment from '../models/Payment.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import QRCode from 'qrcode';
import LabTestMaster from '../models/LabTestMaster.js';
import ProviderLabTest from '../models/ProviderLabTest.js';
import ProviderPayout from '../models/ProviderPayout.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import { calculateDistance } from '../utils/distanceCalculator.js';
import { createSystemNotification } from './NotificationController.js';
import { redeemCoins } from '../utils/rewards.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';
import { generateLabReportPdf } from '../utils/labReportPdf.js';
import { LEGAL_DOCUMENT_SLUGS, requireAcceptedDocuments, saveAcceptanceLogs } from '../utils/legalDocuments.js';
import { ensureProviderLabCode } from '../utils/labCode.js';
import { verifyRazorpayPaymentEntity } from '../utils/razorpayVerification.js';
import { applyCouponUsageOnce, validateCouponForUser } from '../utils/coupons.js';

const LAB_TEST_COUNTER_KEY = 'labTestId';
const LAB_TEST_ID_PREFIX = 'HT';
const LAB_TEST_ID_WIDTH = 4;
const LAB_REPORT_ID_WIDTH = 3;
const LAB_REPORT_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const LAB_REPORT_PDF_TYPES = ['application/pdf'];
const LAB_SIGNATURE_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const LAB_REPORT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LAB_REPORT_UPLOAD_DIR = path.join(__dirname, '..', 'storage', 'lab-reports');
const LAB_REPORT_PUBLIC_ASSETS_DIR = path.resolve(__dirname, '..', '..', 'frontend', 'public');
const LAB_REPORT_LOGO_PATH = path.join(LAB_REPORT_PUBLIC_ASSETS_DIR, 'healthy-touch-logo.png');
const LAB_REPORT_COVER_IMAGE_PATH = path.join(LAB_REPORT_PUBLIC_ASSETS_DIR, 'lab_testimg.png');
const LAB_REPORT_RECOMMENDATION_PATH = path.join(LAB_REPORT_PUBLIC_ASSETS_DIR, 'lab-report-recommendation.png');
const REPORT_SUPPORT_PHONE = '+91 9887894498';
const REPORT_SUPPORT_EMAIL = 'care@healthytouch.com';
const REPORT_SUPPORT_ADDRESS = 'Managed by Infinity vision overseas GROUND FLOOR, Flat No.: 01, MANDAWARA ROAD, MANDAWARA ROAD, Hindaun, Hindaun, Rajasthan 322230';
const FRONTEND_PUBLIC_BASE_URL = String(process.env.FRONTEND_URL || process.env.FRONTEND_PUBLIC_URL || 'https://healthytouch24.com')
  .replace(/\/+$/, '');
const API_PUBLIC_BASE_URL = String(process.env.BACKEND_URL || process.env.API_PUBLIC_BASE_URL || 'https://api.healthytouch24.com')
  .replace(/\/api\/?$/i, '')
  .replace(/\/+$/, '');

const loadReportPublicAsset = async (localPath, fileName) => {
  if (fs.existsSync(localPath)) {
    return fs.promises.readFile(localPath);
  }

  const publicUrl = `${FRONTEND_PUBLIC_BASE_URL}/${fileName}`;
  try {
    const response = await fetch(publicUrl);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
};

const formatLabTestId = (value) => `${LAB_TEST_ID_PREFIX}${String(value).padStart(LAB_TEST_ID_WIDTH, '0')}`;
const formatCityCode = (city = '') => {
  const clean = String(city || '').replace(/[^a-z]/gi, '').toUpperCase();
  if (clean === 'JAIPUR') return 'JP';
  if (clean === 'DELHI') return 'DL';
  if (clean === 'MUMBAI') return 'MB';
  if (clean === 'BENGALURU' || clean === 'BANGALORE') return 'BL';
  if (clean === 'HYDERABAD') return 'HY';
  if (clean === 'CHENNAI') return 'CH';
  if (clean === 'KOLKATA') return 'KL';
  return (clean.slice(0, 2) || 'GN').padEnd(2, 'X');
};

const formatProviderTypeCode = (provider) => {
  const providerType = provider?.category || provider?.labServiceType || '';
  const clean = String(providerType || '').replace(/[^a-z]/gi, '').toUpperCase();
  return clean.charAt(0) || 'P';
};

const formatReportSequence = (value) => String(value).padStart(LAB_REPORT_ID_WIDTH, '0');

const getNextLabTestId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: LAB_TEST_COUNTER_KEY },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return formatLabTestId(counter.value);
};

const getNextLabReportId = async ({ city, provider }) => {
  const cityCode = formatCityCode(city || provider?.address?.city || provider?.labServiceArea);
  const providerTypeCode = formatProviderTypeCode(provider);
  const counter = await Counter.findOneAndUpdate(
    { key: `labReport:${cityCode}:${providerTypeCode}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `HT-${cityCode}-${providerTypeCode}-${formatReportSequence(Number(counter.value || 0) + 100)}`;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const parseServiceReceiver = (body = {}) => {
  const bookingFor = body.bookingFor === 'family' ? 'family' : 'self';
  let raw = body.serviceReceiver || body.familyMember || null;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (bookingFor !== 'family' || !raw) return { bookingFor: 'self', serviceReceiver: undefined };
  return {
    bookingFor,
    serviceReceiver: {
      memberId: String(raw.id || raw.memberId || '').trim(),
      name: String(raw.name || '').trim(),
      relation: String(raw.relation || '').trim(),
      mobile: String(raw.mobile || '').trim(),
      age: String(raw.age || '').trim(),
      gender: String(raw.gender || '').trim(),
      medicalNotes: String(raw.medicalNotes || raw.notes || '').trim(),
    },
  };
};

const uniquePatientLabTests = (items) => {
  const byMaster = new Map();
  items.filter(hasActiveMasterTest).forEach((providerTest) => {
    const test = toPatientLabTest(providerTest);
    const key = [
      test.labTestId || test.testId || test.testName || test._id,
      test.city || '',
    ].map((part) => String(part || '').trim().toLowerCase()).join('|');
    const existing = byMaster.get(key);
    if (!existing || Number(test.sellingPrice || 0) < Number(existing.sellingPrice || 0)) {
      byMaster.set(key, test);
    }
  });
  return Array.from(byMaster.values());
};

const addLabBookingHistory = (booking, status, changedBy, note = '') => {
  booking.status = status;
  booking.statusHistory = [
    ...(booking.statusHistory || []),
    { status, changedBy, note, changedAt: new Date() },
  ];
};

const getProviderIdForUser = async (userId) => {
  const provider = await Provider.findOne({ userId });
  if (!provider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }
  if (provider.category !== 'Lab Technician') {
    const error = new Error('Only lab providers can access lab orders');
    error.statusCode = 403;
    throw error;
  }
  return ensureProviderLabCode(provider);
};

const getBookingMasterTestIds = (booking) => (
  (booking.selectedTests?.length ? booking.selectedTests : booking.tests)
    .map((test) => String(test.labTestId?._id || test.labTestId || ''))
    .filter(Boolean)
);

const providerCanPerformTests = async (providerId, masterTestIds, collectionType) => {
  const filter = {
    providerId,
    labTestId: { $in: masterTestIds },
    status: 'active',
  };
  if (collectionType === 'home') filter.homeCollection = true;

  const availableTestIds = await ProviderLabTest.find(filter).distinct('labTestId');
  const available = new Set(availableTestIds.map(String));
  return masterTestIds.every((id) => available.has(String(id)));
};

const getEligibleLabProvidersForBooking = async (booking) => {
  const masterTestIds = getBookingMasterTestIds(booking);
  if (!masterTestIds.length) return [];

  const providerTests = await ProviderLabTest.find({
    labTestId: { $in: masterTestIds },
    status: 'active',
    ...(booking.collectionType === 'home' ? { homeCollection: true } : {}),
  }).select('providerId labTestId price city reportTime');

  const grouped = providerTests.reduce((map, item) => {
    const providerId = String(item.providerId);
    if (!map.has(providerId)) {
      map.set(providerId, { providerId, tests: [], testIds: new Set(), totalAmount: 0 });
    }
    const entry = map.get(providerId);
    entry.tests.push(item);
    entry.testIds.add(String(item.labTestId));
    entry.totalAmount += Number(item.price || 0);
    return map;
  }, new Map());

  const eligibleIds = Array.from(grouped.values())
    .filter((entry) => masterTestIds.every((id) => entry.testIds.has(String(id))))
    .map((entry) => entry.providerId);

  const providers = await Provider.find({
    _id: { $in: eligibleIds },
    category: 'Lab Technician',
    status: 'approved',
  }).populate('userId', 'name email mobile location');

  const toCoordinate = (value) => {
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
  };

  const providerItems = await Promise.all(providers.map(async (provider) => {
    await ensureProviderLabCode(provider);
    const groupedData = grouped.get(String(provider._id));
    const patientLat = toCoordinate(booking.patientLocation?.latitude ?? booking.patientId?.location?.latitude);
    const patientLng = toCoordinate(booking.patientLocation?.longitude ?? booking.patientId?.location?.longitude);
    const providerLat = toCoordinate(provider.location?.latitude ?? provider.userId?.location?.latitude);
    const providerLng = toCoordinate(provider.location?.longitude ?? provider.userId?.location?.longitude);
    const distanceKm = patientLat != null && patientLng != null && providerLat != null && providerLng != null
      ? calculateDistance(patientLat, patientLng, providerLat, providerLng)
      : null;

    return {
      _id: provider._id,
      userId: provider.userId,
      labName: provider.labName,
      labCode: provider.labCode,
      contactPersonName: provider.contactPersonName,
      labContactNumber: provider.labContactNumber,
      category: provider.category,
      address: provider.address,
      location: provider.location,
      distanceKm,
      totalAmount: groupedData?.totalAmount || 0,
      canPerformAllSelectedTests: true,
      matchedTestsCount: masterTestIds.length,
    };
  }));

  return providerItems.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return a.totalAmount - b.totalAmount;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
};

const populateLabBooking = (query) => query
  .populate('patientId', 'name email mobile location')
  .populate('paymentId')
  .populate('assignedLabProviderId')
  .populate({ path: 'assignedLabProviderId', populate: { path: 'userId', select: 'name email mobile' } })
  .populate('tests.labTestId')
  .populate('selectedTests.labTestId')
  .populate('tests.providerLabTestId');

const fileToDataUri = (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

const normalizeReportParameters = (parameters = []) => (
  Array.isArray(parameters) ? parameters : []
).map((item) => ({
  testName: String(item.testName || '').trim(),
  name: String(item.name || '').trim(),
  methodology: String(item.methodology || '').trim(),
  resultValue: String(item.resultValue || '').trim(),
  unit: String(item.unit || '').trim(),
  normalRange: String(item.normalRange || '').trim(),
  flag: ['low', 'normal', 'high', 'critical'].includes(item.flag) ? item.flag : '',
})).filter((item) => item.name && item.resultValue);

const normalizeBookingReportResults = (results = []) => (
  Array.isArray(results) ? results : []
).map((item) => ({
  section: String(item.section || item.category || 'General').trim() || 'General',
  testName: String(item.testName || item.name || '').trim(),
  result: String(item.result || item.resultValue || '').trim(),
  unit: String(item.unit || '').trim(),
  referenceRange: String(item.referenceRange || item.normalRange || '').trim(),
  method: String(item.method || item.methodology || '').trim(),
})).filter((item) => item.testName && item.result);

const hasGeneratedReportData = (booking) => Boolean(
  booking?.reportResults?.length ||
  booking?.resultAttachmentUrl ||
  booking?.summaryAttachmentUrl
);

const getReportUrl = (reportId) => `/api/lab-tests/reports/${reportId}/pdf`;

const toGeneratedReportFile = (report, uploadedBy) => ({
  url: report.generatedPdfUrl,
  name: `${report.reportId} - ${report.testName}`,
  reportId: report.reportId,
  generated: true,
  mimeType: 'application/pdf',
  size: 0,
  uploadedAt: new Date(),
  uploadedBy,
});

const getBookingTestNames = (booking) => (
  (booking.selectedTests?.length ? booking.selectedTests : booking.tests || [])
    .map((test) => String(test.testName || test.labTestId?.testName || '').trim())
    .filter(Boolean)
);

const getExistingUploadedReportId = (booking) => {
  const mainFile = (booking.reportFiles || []).find((file) => file.reportType === 'main' && file.reportId);
  if (mainFile?.reportId) return mainFile.reportId;

  const reportWithId = (booking.reports || []).find((file) => file.reportId);
  if (reportWithId?.reportId) return reportWithId.reportId;

  const existingName = booking.mainReportPdfName || booking.reportName || '';
  const match = String(existingName).match(/^(HT-[A-Z]{2}-[A-Z]-\d{3})\b/);
  return match?.[1] || '';
};

const buildUploadedLabReportName = async ({ booking, provider }) => {
  const reportId = getExistingUploadedReportId(booking) || await getNextLabReportId({ city: booking.city, provider });
  const testNames = getBookingTestNames(booking);
  return {
    reportId,
    reportName: `${reportId} - ${testNames.join(', ') || 'Lab Report'}`,
  };
};

const firstUploadedFile = (req, fieldName) => {
  const files = req.files?.[fieldName];
  if (Array.isArray(files) && files[0]) return files[0];
  if (fieldName === 'file' && req.file) return req.file;
  return null;
};

const hasAnyReportFile = (booking) => Boolean(
  booking.mainReportPdfUrl ||
  booking.reportUrl ||
  booking.reportFiles?.length ||
  booking.reports?.length
);

const hasMainReportFile = (booking) => Boolean(
  booking.mainReportPdfUrl ||
  booking.reportUrl ||
  (booking.reportFiles || []).some((file) => !file.reportType || ['main', 'other'].includes(file.reportType)) ||
  booking.reports?.length
);

const upsertReportFileEntry = (booking, reportType, reportFile) => {
  const existing = (booking.reportFiles || []).filter((file) => file.reportType !== reportType);
  booking.reportFiles = [...existing, { ...reportFile, reportType }];

  if (reportType === 'main') {
    booking.reports = [
      ...(booking.reports || []).filter((file) => file.reportType !== 'main'),
      {
        url: reportFile.url,
        name: reportFile.name,
        reportId: reportFile.reportId,
        reportType: 'main',
        uploadedAt: reportFile.uploadedAt,
        uploadedBy: reportFile.uploadedBy,
      },
    ];
  }
};

const uploadNamedLabReportFile = async ({ file, allowedTypes, fieldLabel, resourceType = 'auto' }) => {
  if (!file) return null;
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error(`${fieldLabel} file type is not allowed`);
    error.statusCode = 400;
    throw error;
  }
  if (file.size > LAB_REPORT_MAX_SIZE_BYTES) {
    const error = new Error(`${fieldLabel} size must be 5MB or less`);
    error.statusCode = 413;
    throw error;
  }

  const uploadResult = await uploadToCloudinary(fileToDataUri(file), 'lab-reports', resourceType);
  if (!uploadResult.success) {
    const error = new Error(uploadResult.message || `Failed to upload ${fieldLabel}`);
    error.statusCode = 500;
    throw error;
  }

  return uploadResult;
};

const getGeneratedReportFileName = (booking) => `${booking.generatedReportId || 'Lab-Report'} - ${getBookingTestNames(booking).join(', ') || 'Lab Report'}`;

const getReportVerificationToken = (booking) => {
  const generatedAt = booking.reportGeneratedAt ? new Date(booking.reportGeneratedAt).getTime() : '';
  const value = `${booking._id}.${booking.generatedReportId || ''}.${generatedAt}`;
  return crypto.createHmac('sha256', process.env.SECRET_KEY || 'healthy-touch-report').update(value).digest('hex');
};

const isValidReportVerificationToken = (booking, providedToken) => {
  const expected = Buffer.from(getReportVerificationToken(booking));
  const provided = Buffer.from(String(providedToken || ''));
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
};

const getVerifiedReportDownloadUrl = (booking) => {
  const token = encodeURIComponent(getReportVerificationToken(booking));
  return `${API_PUBLIC_BASE_URL}/api/lab-bookings/${booking._id}/generated-report/verified-pdf?token=${token}`;
};

const getVerifiedReportQrUrl = (booking) => {
  const token = encodeURIComponent(getReportVerificationToken(booking));
  return `${API_PUBLIC_BASE_URL}/api/lab-bookings/${booking._id}/generated-report/qr?token=${token}`;
};

const authorizeGeneratedReportAccess = async (req, booking) => {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'patient') return String(booking.patientId?._id || booking.patientId) === String(req.user.id);
  if (req.user.role === 'provider') {
    const provider = await Provider.findOne({ userId: req.user.id }).select('_id');
    return provider && String(booking.assignedLabProviderId?._id || booking.assignedLabProviderId) === String(provider._id);
  }
  return false;
};

const buildGeneratedReportPayload = (booking) => {
  const provider = booking.assignedLabProviderId || {};
  const providerUser = provider.userId || {};
  return {
    booking,
    report: {
      reportId: booking.generatedReportId,
      reportName: getGeneratedReportFileName(booking),
      generatedAt: booking.reportGeneratedAt,
      results: booking.reportResults || [],
      resultAttachmentUrl: booking.resultAttachmentUrl || '',
      resultAttachmentName: booking.resultAttachmentName || '',
      resultAttachmentMimeType: booking.resultAttachmentMimeType || '',
      resultAttachmentPreviewUrl: booking.resultAttachmentPreviewUrl || '',
      summaryAttachmentUrl: booking.summaryAttachmentUrl || '',
      summaryAttachmentName: booking.summaryAttachmentName || '',
      summaryAttachmentMimeType: booking.summaryAttachmentMimeType || '',
      comments: booking.comments || '',
      summary: booking.summary || '',
      authorizedBy: booking.authorizedBy || provider.contactPersonName || providerUser.name || '',
      authorizedQualification: booking.authorizedQualification || '',
      registrationNumber: booking.registrationNumber || '',
      signatureUrl: booking.signatureUrl || '',
      verifiedDownloadUrl: getVerifiedReportDownloadUrl(booking),
      verificationQrUrl: getVerifiedReportQrUrl(booking),
    },
  };
};

const loadResultAttachmentPreview = async (booking) => {
  if (!booking.resultAttachmentUrl || booking.reportResults?.length) return null;

  const url = String(booking.resultAttachmentPreviewUrl || booking.resultAttachmentUrl);
  const mimeType = booking.resultAttachmentPreviewUrl ? 'image/png' : String(booking.resultAttachmentMimeType || '');
  const localUploadMatch = url.match(/\/uploads\/(.+)$/i);
  if (localUploadMatch && mimeType.startsWith('image/')) {
    const localPath = path.resolve(__dirname, '..', 'uploads', localUploadMatch[1]);
    const uploadRoot = path.resolve(__dirname, '..', 'uploads');
    if (localPath.startsWith(`${uploadRoot}${path.sep}`) && fs.existsSync(localPath)) {
      return fs.promises.readFile(localPath);
    }
  }

  let previewUrl = url;
  if (mimeType.includes('pdf') && /res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(url)) {
    previewUrl = url.replace('/upload/', '/upload/pg_1/').replace(/\.pdf($|\?)/i, '.png$1');
  } else if (!mimeType.startsWith('image/')) {
    return null;
  }

  try {
    const response = await fetch(previewUrl);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
};

const drawGeneratedBookingPdf = async ({ filePath, booking, verificationDownloadUrl = getVerifiedReportDownloadUrl(booking) }) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const { default: PDFDocument } = await import('pdfkit');
  const platformSettings = await Settings.getSettings().catch(() => null);
  const reportSupportPhone = platformSettings?.contactPhone || REPORT_SUPPORT_PHONE;
  const provider = booking.assignedLabProviderId || {};
  const providerUser = provider.userId || {};
  const reportId = booking.generatedReportId || 'LAB-REPORT';
  const reportName = getGeneratedReportFileName(booking);
  const generatedAt = booking.reportGeneratedAt || new Date();
  const resultAttachmentPreview = await loadResultAttachmentPreview(booking);
  const logoImage = await loadReportPublicAsset(LAB_REPORT_LOGO_PATH, 'healthy-touch-logo.png');
  const coverImage = await loadReportPublicAsset(LAB_REPORT_COVER_IMAGE_PATH, 'lab_testimg.png');
  const recommendationImage = await loadReportPublicAsset(LAB_REPORT_RECOMMENDATION_PATH, 'lab-report-recommendation.png');
  const verificationQr = await QRCode.toBuffer(verificationDownloadUrl, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
  });
  const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
  const grouped = (booking.reportResults || []).reduce((map, row) => {
    const section = row.section || 'General';
    if (!map.has(section)) map.set(section, []);
    map.get(section).push(row);
    return map;
  }, new Map());

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);

    const pageWidth = 595;
    const blue = '#0b2d63';
    const green = '#0f9d58';
    const border = '#b7c7dd';
    const coverBlue = '#075eae';
    const testNames = getBookingTestNames(booking).join(', ') || 'Lab Test';
    const shortPatientId = String(booking.patientId?._id || booking.patientId || 'N/A').slice(-10).toUpperCase();
    const sampleId = String(booking._id || 'N/A').slice(-10).toUpperCase();
    let resultPreviewHeight = 0;
    if (resultAttachmentPreview) {
      try {
        const previewImage = doc.openImage(resultAttachmentPreview);
        resultPreviewHeight = Math.ceil(563 * (previewImage.height / previewImage.width));
      } catch {
        resultPreviewHeight = 760;
      }
    }
    const reportPageHeight = resultPreviewHeight
      ? Math.max(842, 250 + resultPreviewHeight + 144)
      : 842;

    const box = (x, y, w, h, title) => {
      doc.roundedRect(x, y, w, h, 4).stroke(border);
      doc.rect(x, y, w, 18).fill(blue);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7).text(title, x + 6, y + 5, { width: w - 12 });
      doc.fillColor('#111827');
    };

    const drawHeader = () => {
      if (logoImage) doc.image(logoImage, 22, 18, { fit: [100, 48] });
      else doc.fillColor(green).font('Helvetica-Bold').fontSize(15).text('HealthyTouch24', 24, 28);
      doc.fillColor(blue).font('Helvetica-Bold').fontSize(18).text('LABORATORY TEST REPORT', 160, 24, { width: 260, align: 'center' });
      doc.roundedRect(178, 54, 228, 16, 2).fill(green);
      doc.fillColor('#ffffff').fontSize(7).text('ACCURATE | RELIABLE | CONFIDENTIAL', 178, 58, { width: 228, align: 'center' });
      doc.roundedRect(500, 16, 54, 54, 4).stroke('#111827');
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(6).text('Scan to Verify', 495, 6, { width: 66, align: 'center' });
      doc.image(verificationQr, 505, 20, { fit: [44, 44] });
    };

    const drawCover = () => {
      doc.rect(0, 0, 595, 842).fill('#ffffff');
      if (logoImage) doc.image(logoImage, 34, 27, { fit: [194, 74] });
      else doc.fillColor(coverBlue).font('Helvetica-Bold').fontSize(19).text('HEALTHY TOUCH', 36, 45);
      doc.fillColor(blue).font('Helvetica-Bold').fontSize(14).text('INFINITY VISION', 402, 36, { width: 152, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(6).text('O V E R S E A S', 402, 54, { width: 152, align: 'right' });

      doc.fillColor(blue).font('Helvetica-Bold').fontSize(28).text('YOUR HEALTH,', 42, 162);
      doc.fillColor('#68ad20').text('OUR PRIORITY', 42, 195);
      doc.fillColor('#475569').font('Helvetica').fontSize(12).text('Accurate Reports. Better Insights.', 42, 239);
      doc.text('Healthier You.', 42, 255);
      doc.rect(42, 282, 74, 2).fill('#246ad0');
      ['Advanced Technology', 'Accurate Results', 'Trusted Care', 'Better Health Outcomes'].forEach((item, index) => {
        const yy = 319 + index * 43;
        doc.circle(57, yy, 13).fill(index % 2 ? '#68ad20' : coverBlue);
        doc.fillColor('#ffffff').lineWidth(1.2);
        if (index === 0) {
          doc.circle(57, yy - 2, 4).stroke('#ffffff').moveTo(57, yy + 2).lineTo(57, yy + 7).stroke('#ffffff');
        } else if (index === 1) {
          doc.moveTo(52, yy).lineTo(56, yy + 4).lineTo(63, yy - 5).stroke('#ffffff');
        } else if (index === 2) {
          doc.circle(57, yy - 4, 3).stroke('#ffffff').roundedRect(52, yy + 1, 10, 8, 3).stroke('#ffffff');
        } else {
          doc.moveTo(49, yy - 2).bezierCurveTo(49, yy - 8, 57, yy - 8, 57, yy - 2).bezierCurveTo(57, yy - 8, 65, yy - 8, 65, yy - 2).bezierCurveTo(65, yy + 3, 57, yy + 8, 57, yy + 8).bezierCurveTo(57, yy + 8, 49, yy + 3, 49, yy - 2).stroke('#ffffff');
        }
        doc.fillColor('#334155').font('Helvetica').fontSize(10).text(item, 83, yy - 4);
      });

      if (coverImage) {
        doc.save();
        doc.circle(426, 290, 121).clip();
        doc.image(coverImage, 305, 169, { fit: [242, 242], align: 'center', valign: 'center' });
        doc.restore();
        doc.circle(426, 290, 123).lineWidth(2).stroke('#2563eb');
      }

      doc.path('M 0 560 L 0 790 L 595 790 L 595 530 C 410 560 246 613 0 560 Z').fill(coverBlue);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text('LABORATORY REPORT', 42, 599);
      const coverDetail = (label, value, yy) => {
        doc.font('Helvetica').fontSize(9).text(label, 43, yy, { width: 88 });
        doc.text(':', 135, yy);
        doc.font('Helvetica-Bold').text(String(value || 'N/A'), 150, yy, { width: 243 });
      };
      coverDetail('Patient Name', booking.patientName, 633);
      coverDetail('Patient ID', shortPatientId, 651);
      coverDetail('Age / Gender', 'N/A / N/A', 669);
      coverDetail('Sample ID', sampleId, 687);
      coverDetail('Tests', testNames, 705);
      coverDetail('Report Date', new Date(generatedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }), 741);
      doc.roundedRect(453, 623, 88, 106, 9).fill('#ffffff');
      doc.image(verificationQr, 466, 632, { fit: [62, 62] });
      doc.fillColor(blue).font('Helvetica').fontSize(6).text('Scan to Download', 453, 700, { width: 88, align: 'center' });
      doc.text('Complete Report', 453, 711, { width: 88, align: 'center' });

      doc.rect(0, 790, 595, 52).fill('#ffffff');
      doc.fillColor('#475569').font('Helvetica').fontSize(7)
        .text(reportSupportPhone, 28, 812)
        .text(REPORT_SUPPORT_EMAIL, 153, 812)
        .text(REPORT_SUPPORT_ADDRESS, 278, 807, { width: 287, height: 27, ellipsis: true });
    };

    const drawRecommendations = () => {
      if (recommendationImage) {
        doc.image(recommendationImage, 0, 0, { fit: [595, 842] });
        return;
      }
      doc.rect(0, 0, 595, 842).fill('#ffffff');
      doc.rect(0, 0, 595, 44).fill('#0a5c9e');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text('Healthy', 24, 15);
      doc.fillColor('#7ee8c8').text('Touch', 82, 15);
      doc.roundedRect(474, 13, 91, 20, 3).fill('#5bc4a0');
      doc.fillColor('#0a3d28').fontSize(7).text('SMART REPORT', 474, 20, { width: 91, align: 'center' });
      doc.rect(0, 44, 595, 3).fill('#5bc4a0');
      doc.rect(0, 47, 595, 55).fill('#f0f9f4');
      doc.fillColor('#5bc4a0').font('Helvetica-Bold').fontSize(7).text('RECOMMENDATION', 22, 61);
      doc.fillColor('#0a3d6e').fontSize(15).text('General Recommendation on Preventive Screening', 22, 77);

      const x = [16, 118, 204, 298, 392, 486];
      const w = [102, 86, 94, 94, 94, 93];
      const headers = ['Risk Factors', 'Recommended Tests', 'Age Group\n(18-29 Yrs.)', 'Age Group\n(30-39 Yrs.)', 'Age Group\n(40-55 Yrs.)', 'Age Group\n(Above 55 Yrs.)'];
      let yy = 118;
      headers.forEach((header, index) => {
        doc.rect(x[index], yy, w[index], 31).fill('#0a5c9e').stroke('#0a4a82');
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6).text(header, x[index] + 3, yy + 9, { width: w[index] - 6, align: 'center' });
      });
      yy += 31;
      const recs = [
        ['Diabetes', 'HbA1c\nBlood Glucose Fasting'],
        ['Thyroid Disorder', 'Thyroid Profile-Total\n(T3, T4 & TSH)'],
        ['Vitamin-D Deficiency', 'Vitamin D Total\n25-Hydroxy'],
        ['Vitamin B12 Deficiency', 'Vitamin B12\nCyanocobalamin'],
        ['High Cholesterol / Dyslipidemia', 'Lipid Profile\nCholesterol-Total'],
        ['Kidney Disorder', 'Kidney Function Test\nUrine Routine'],
        ['Liver Disorder', 'Liver Function Test\nSGOT / AST, SGPT / ALT'],
      ];
      recs.forEach(([risk, tests], rowIndex) => {
        const rowH = 61;
        const bg = rowIndex % 2 ? '#f8fbff' : '#ffffff';
        w.forEach((width, index) => doc.rect(x[index], yy, width, rowH).fill(bg).stroke('#e0edf8'));
        doc.fillColor('#0a3d6e').font('Helvetica-Bold').fontSize(7).text(risk, x[0] + 5, yy + 9, { width: w[0] - 10 });
        doc.fillColor('#5a7a9a').font('Helvetica').fontSize(6).text(tests, x[1] + 5, yy + 9, { width: w[1] - 10 });
        ['Optional', 'Recommended', 'Strongly Rec.', 'Strongly Rec.'].forEach((label, col) => {
          doc.fillColor(col > 1 ? '#b52222' : (col === 1 ? '#0a5c9e' : '#1a7a4a')).font('Helvetica-Bold').fontSize(5)
            .text(label, x[col + 2] + 3, yy + 10, { width: w[col + 2] - 6, align: 'center' });
          doc.fillColor('#666666').font('Helvetica').fontSize(5)
            .text('Screen annually\nRepeat if symptoms\nTreatment: 3-6 months', x[col + 2] + 4, yy + 25, { width: w[col + 2] - 8, align: 'center' });
        });
        yy += rowH;
      });
      doc.roundedRect(16, 596, 563, 82, 7).fill('#0a5c9e');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text('Full Body Health Check-Up', 32, 617);
      doc.fillColor('#7ee8c8').text('Starts at Rs. 999', 32, 638);
      doc.fillColor('#d9e7f3').font('Helvetica').fontSize(7).text('Home sample collection included - Report in 24 hours', 32, 655);
      ['Basic Rs. 999', 'Advanced Rs. 1,999', 'Premium Rs. 2,999'].forEach((pkg, index) => {
        doc.roundedRect(310 + index * 84, 612, 76, 48, 5).fill('#ffffff');
        doc.fillColor('#0a5c9e').font('Helvetica-Bold').fontSize(6).text(pkg, 313 + index * 84, 631, { width: 70, align: 'center' });
      });
      doc.roundedRect(16, 695, 563, 38, 5).fill('#f8fbff').stroke('#d0eafa');
      doc.fillColor('#0a5c9e').font('Helvetica-Bold').fontSize(7)
        .text(reportSupportPhone, 29, 711)
        .text(REPORT_SUPPORT_EMAIL, 148, 711)
        .text(REPORT_SUPPORT_ADDRESS, 278, 711, { width: 275 });
      doc.rect(0, 798, 595, 44).fill('#0a3d6e');
      doc.fillColor('#d9e7f3').font('Helvetica').fontSize(7).text(`For any concern regarding this report, call our helpline: ${reportSupportPhone}`, 24, 815);
    };

    drawCover();
    doc.addPage({ size: [pageWidth, reportPageHeight], margin: 0 });
    drawHeader();
    let y = 88;
    box(16, y, 165, 102, 'PATIENT DETAILS');
    box(194, y, 165, 102, 'REPORT DETAILS');
    box(372, y, 207, 102, 'LABORATORY DETAILS');

    const detail = (x, yy, label, value, width = 145) => {
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(6).text(label, x, yy, { width: 55 });
      doc.font('Helvetica').text(`: ${value || 'N/A'}`, x + 57, yy, { width });
    };
    detail(26, 114, 'Patient ID', booking.patientId?._id || booking.patientId, 92);
    detail(26, 130, 'Patient Name', booking.patientName, 92);
    detail(26, 146, 'Mobile No.', booking.patientMobile, 92);
    detail(26, 162, 'Address', booking.address, 92);

    detail(204, 114, 'Booking ID', booking._id, 92);
    detail(204, 130, 'Report ID', reportId, 92);
    detail(204, 146, 'Sample Collected', formatDateTime(booking.sampleCollectedAt), 92);
    detail(204, 162, 'Report Generated', formatDateTime(generatedAt), 92);

    detail(382, 114, 'Lab Name', provider.labName || providerUser.name || 'Healthy Touch Lab', 132);
    detail(382, 130, 'Lab ID', provider.labCode || 'N/A', 132);
    detail(382, 146, 'Contact No.', provider.labContactNumber || providerUser.mobile || 'N/A', 132);
    detail(382, 162, 'NABL Accredited', provider.nablCertificate?.length ? 'Yes' : 'N/A', 132);
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(14).text('NABL', 526, 139, { width: 44, align: 'center' });

    y = 208;
    doc.rect(16, y, 563, 18).fill(blue);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8).text('TEST RESULTS', 24, y + 5);
    y += 18;
    const cols = [16, 132, 236, 316, 444];
    const widths = [116, 104, 80, 128, 135];

    if (resultAttachmentPreview) {
      doc.image(resultAttachmentPreview, 16, y, { width: 563 });
      y += resultPreviewHeight;
    } else if (booking.resultAttachmentUrl && !booking.reportResults?.length) {
      doc.rect(16, y, 563, 70).fill('#ffffff').stroke(border);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text('Uploaded Test Result Attachment', 28, y + 16);
      doc.font('Helvetica').fontSize(8).text(booking.resultAttachmentName || 'Test result file', 28, y + 34, { width: 500 });
      doc.fillColor('#2563eb').text(booking.resultAttachmentUrl, 28, y + 48, { width: 500 });
      y += 70;
    } else {
      doc.rect(16, y, 563, 24).fill('#eef3fb').stroke(border);
      ['TEST NAME', 'RESULT', 'UNIT', 'REFERENCE RANGE', 'METHOD'].forEach((label, i) => {
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(7).text(label, cols[i] + 4, y + 8, { width: widths[i] - 8, align: 'center' });
        if (i > 0) doc.moveTo(cols[i], y).lineTo(cols[i], y + 24).stroke(border);
      });
      y += 24;
    }

    for (const [section, rows] of grouped.entries()) {
      if (y > 700) {
        doc.addPage();
        drawHeader();
        y = 90;
      }
      doc.rect(16, y, 563, 17).fill('#f0fdf4').stroke(border);
      doc.fillColor(green).font('Helvetica-Bold').fontSize(8).text(String(section).toUpperCase(), 22, y + 5);
      y += 17;
      rows.forEach((row) => {
        if (y > 708) {
          doc.addPage();
          drawHeader();
          y = 90;
        }
        const rowH = 21;
        doc.rect(16, y, 563, rowH).fill('#ffffff').stroke(border);
        [row.testName, row.result, row.unit, row.referenceRange, row.method].forEach((value, i) => {
          if (i > 0) doc.moveTo(cols[i], y).lineTo(cols[i], y + rowH).stroke(border);
          doc.fillColor('#111827').font(i === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7)
            .text(value || '-', cols[i] + 4, y + 7, { width: widths[i] - 8, align: i === 0 ? 'left' : 'center' });
        });
        y += rowH;
      });
    }

    y += 8;
    doc.fillColor('#111827').font('Helvetica').fontSize(6).text('Note: Reference ranges are as per adults. Please correlate clinically.', 18, y);
    y += 18;
    const bottomH = 102;
    box(16, y, 180, bottomH, 'COMMENTS / INTERPRETATION');
    box(208, y, 180, bottomH, 'CONCLUSION / SUMMARY');
    box(400, y, 179, bottomH, 'AUTHORIZED BY');
    doc.fillColor('#111827').font('Helvetica').fontSize(7).text(booking.comments || 'All parameters are within normal range. Kindly consult your physician for clinical correlation.', 24, y + 28, { width: 164 });
    doc.text(booking.summaryAttachmentUrl ? `Summary attachment: ${booking.summaryAttachmentName || booking.summaryAttachmentUrl}` : (booking.summary || 'Overall, the test results are within normal limits. Maintain healthy lifestyle and routine check-ups.'), 216, y + 28, { width: 164 });
    doc.font('Helvetica-Bold').text(booking.authorizedBy || provider.contactPersonName || providerUser.name || 'Authorized Signatory', 408, y + 58, { width: 160, align: 'center' });
    doc.font('Helvetica').text(booking.authorizedQualification || '', 408, y + 72, { width: 160, align: 'center' });
    doc.text(booking.registrationNumber ? `Reg. No. ${booking.registrationNumber}` : '', 408, y + 84, { width: 160, align: 'center' });
    doc.moveTo(428, y + 52).lineTo(552, y + 52).stroke('#ef4444');

    doc.addPage({ size: 'A4', margin: 0 });
    drawRecommendations();

    doc.end();
  });
  return { filePath, reportName };
};

const publishGeneratedReportsForBooking = async ({ booking, providerId, userId }) => {
  const reports = await LabReport.find({
    bookingId: booking._id,
    providerId,
    status: { $in: ['draft', 'published'] },
  }).sort({ createdAt: 1 });

  if (!reports.length) return [];

  const existingReportIds = new Set((booking.reportFiles || []).map((item) => String(item.reportId || '')));
  const publishedFiles = [];

  for (const report of reports) {
    report.status = 'published';
    await report.save();

    if (!existingReportIds.has(String(report.reportId))) {
      const reportFile = toGeneratedReportFile(report, userId);
      publishedFiles.push(reportFile);
      existingReportIds.add(String(report.reportId));
    }
  }

  if (publishedFiles.length) {
    booking.reportFiles = [...(booking.reportFiles || []), ...publishedFiles];
    booking.reports = [
      ...(booking.reports || []),
      ...publishedFiles.map((reportFile) => ({
        url: reportFile.url,
        name: reportFile.name,
        reportId: reportFile.reportId,
        generated: true,
        uploadedAt: reportFile.uploadedAt,
        uploadedBy: userId,
      })),
    ];
    const latest = publishedFiles[publishedFiles.length - 1];
    booking.reportName = latest.name;
    booking.reportUploadedAt = latest.uploadedAt;
  }

  if ((booking.reportFiles || []).length || (booking.reports || []).length) {
    booking.reportStatus = 'uploaded';
    booking.reportReadyAt = booking.reportReadyAt || new Date();
  }

  return reports;
};

const findProviderLabReport = async ({ userId, reportId }) => {
  const provider = await getProviderIdForUser(userId);
  const reportFilter = mongoose.Types.ObjectId.isValid(reportId)
    ? { $or: [{ _id: reportId }, { reportId: String(reportId).trim().toUpperCase() }] }
    : { reportId: String(reportId).trim().toUpperCase() };

  const report = await LabReport.findOne({ ...reportFilter, providerId: provider._id });
  if (!report) {
    const error = new Error('Generated lab report not found');
    error.statusCode = 404;
    throw error;
  }

  const booking = await populateLabBooking(LabBooking.findOne({
    _id: report.bookingId,
    assignedLabProviderId: provider._id,
  }));
  if (!booking) {
    const error = new Error('Assigned lab order not found for this report');
    error.statusCode = 404;
    throw error;
  }

  if (['lab_rejected', 'cancelled', 'rejected_by_admin'].includes(booking.status)) {
    const error = new Error('Report cannot be edited for this lab order status');
    error.statusCode = 400;
    throw error;
  }

  return { provider, report, booking };
};

const buildLabTestQuery = (query) => {
  const {
    q,
    search,
    category,
    city,
    minPrice,
    maxPrice,
    homeCollection,
    fastingRequired,
    status = 'active',
    packageType,
  } = query;

  const filter = {};
  if (status !== 'all') filter.status = status;
  if (category && category !== 'all') filter.category = new RegExp(`^${category}$`, 'i');
  if (city) filter.city = new RegExp(`^${escapeRegExp(city)}$`, 'i');
  if (minPrice || maxPrice) {
    filter.sellingPrice = {};
    if (minPrice) filter.sellingPrice.$gte = Number(minPrice);
    if (maxPrice) filter.sellingPrice.$lte = Number(maxPrice);
  }
  if (homeCollection !== undefined && homeCollection !== 'all') {
    filter.homeCollection = homeCollection === 'true';
  }
  if (fastingRequired !== undefined && fastingRequired !== 'all') {
    filter.fastingRequired = fastingRequired === 'true';
  }
  if (packageType === 'recommended') filter.isRecommendedPackage = true;
  if (packageType === 'popular') filter.isPopular = true;
  if (packageType === 'full-body') filter.isFullBodyPackage = true;

  const term = String(q || search || '').trim();
  if (term) {
    filter.$or = [
      { testName: new RegExp(term, 'i') },
      { testId: new RegExp(term, 'i') },
      { testCode: new RegExp(term, 'i') },
      { category: new RegExp(term, 'i') },
      { description: new RegExp(term, 'i') },
      { parameters: new RegExp(term, 'i') },
      { recommendedFor: new RegExp(term, 'i') },
    ];
  }

  return filter;
};

const toPatientLabTest = (providerTest) => {
  const master = providerTest.labTestId || {};
  const provider = providerTest.providerId || {};
  const originalPrice = Number(providerTest.originalPrice || 0);
  const discount = Number(providerTest.discount || 0);
  const sellingPrice = Number(providerTest.price || 0);
  return {
    _id: providerTest._id,
    labTestId: master._id,
    providerLabTestId: providerTest._id,
    providerId: provider._id,
    providerName: provider.labName || provider.userId?.name || provider.contactPersonName || 'Lab Provider',
    labName: provider.labName,
    labCode: provider.labCode,
    testId: master.testId,
    testCode: master.testId,
    testName: master.testName,
    category: master.category,
    description: master.description,
    parameters: master.includes?.length ? master.includes : (master.parameters || []),
    includes: master.includes?.length ? master.includes : (master.parameters || []),
    city: master.city || providerTest.city,
    sellingPrice,
    mrp: originalPrice,
    originalPrice,
    discount,
    reportTime: providerTest.reportTime,
    sample: master.sample,
    fastingRequired: providerTest.fastingRequired,
    fasting: providerTest.fastingRequired,
    homeCollection: providerTest.homeCollection,
    recommendedFor: master.recommendedFor || [],
    status: providerTest.status,
  };
};

const toPatientMasterLabTest = (master) => {
  const originalPrice = Number(master.mrp || 0);
  const discount = Number(master.discount || 0);
  const sellingPrice = Number(master.sellingPrice || 0);
  return {
    _id: master._id,
    labTestId: master._id,
    testId: master.testId,
    testCode: master.testId,
    testName: master.testName,
    category: master.category,
    description: master.description,
    parameters: master.includes?.length ? master.includes : (master.parameters || []),
    includes: master.includes?.length ? master.includes : (master.parameters || []),
    city: master.city,
    sellingPrice,
    mrp: originalPrice,
    originalPrice,
    discount,
    reportTime: master.reportTime,
    sample: master.sample,
    fastingRequired: master.fasting,
    fasting: master.fasting,
    homeCollection: master.homeCollection,
    recommendedFor: master.recommendedFor || [],
    status: master.status,
  };
};

const normalizeBookedLabTestPrice = (test) => {
  const originalPrice = Number(test.originalPrice || test.mrp || test.sellingPrice || 0);
  const discount = Number(test.discount || 0);
  const sellingPrice = Number(test.sellingPrice || 0);
  return { ...test, originalPrice, sellingPrice, discount };
};

const hasActiveMasterTest = (providerTest) => providerTest?.labTestId?.status === 'active';

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLabSearchFilter = (term) => {
  const normalized = String(term || '').trim();
  if (!normalized) return null;

  const tokens = normalized.split(/\s+/).map(escapeRegExp).filter(Boolean);
  const phraseRegex = new RegExp(escapeRegExp(normalized), 'i');
  const tokenRegexes = tokens.map((token) => new RegExp(token, 'i'));
  const fields = ['testId', 'testName', 'category', 'description', 'parameters', 'includes', 'sample', 'recommendedFor'];
  const phraseMatches = fields.map((field) => ({ [field]: phraseRegex }));
  const tokenMatches = tokenRegexes.map((regex) => ({
    $or: fields.map((field) => ({ [field]: regex })),
  }));

  return {
    $or: [
      ...phraseMatches,
      ...(tokenMatches.length > 1 ? [{ $and: tokenMatches }] : tokenMatches),
    ],
  };
};

const buildProviderLabTestQuery = async (query) => {
  const masterFilter = {};
  if (query.category && query.category !== 'all') masterFilter.category = new RegExp(`^${query.category}$`, 'i');
  if (query.city && query.city !== 'all') masterFilter.city = new RegExp(`^${escapeRegExp(query.city)}$`, 'i');

  const term = String(query.q || query.search || '').trim();
  if (term) {
    Object.assign(masterFilter, buildLabSearchFilter(term));
  }

  const masterIds = Object.keys(masterFilter).length
    ? await LabTestMaster.find({ ...masterFilter, status: 'active' }).distinct('_id')
    : await LabTestMaster.find({ status: 'active' }).distinct('_id');

  const filter = { labTestId: { $in: masterIds } };
  if ((query.status || 'active') !== 'all') filter.status = query.status || 'active';
  if (query.homeCollection !== undefined && query.homeCollection !== 'all') {
    filter.homeCollection = query.homeCollection === 'true';
  }
  if (query.fastingRequired !== undefined && query.fastingRequired !== 'all') {
    filter.fastingRequired = query.fastingRequired === 'true';
  }
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  return filter;
};

const createLabProviderPayouts = async (bookingId) => {
  const booking = await LabBooking.findById(bookingId)
    .populate({ path: 'assignedLabProviderId', select: 'userId labName contactPersonName' });

  if (!booking || booking.status !== 'completed' || booking.paymentStatus !== 'paid' || !booking.assignedLabProviderId?.userId) return;

  const existingPayout = await ProviderPayout.findOne({ labBookingId: booking._id });
  if (existingPayout) return;

  const selectedTests = booking.selectedTests?.length ? booking.selectedTests : booking.tests || [];
  const grossAmount = roundMoney(selectedTests.reduce((sum, test) => sum + Number(test.sellingPrice || 0), 0));
  if (grossAmount <= 0) return;

  const settings = await Settings.getSettings();
  const commissionRate = Number(settings?.commissionRate ?? 20);
  const gstPercentage = Number(settings?.gstPercentage ?? 18);
  const platformCommission = roundMoney(grossAmount * (commissionRate / 100));
  const gstAmount = roundMoney(platformCommission * (gstPercentage / 100));
  const netAmount = Math.max(0, roundMoney(grossAmount - platformCommission - gstAmount));

  const { weekNumber, year } = ProviderPayout.getCurrentWeek();

  await ProviderPayout.create({
    providerId: booking.assignedLabProviderId.userId,
    labBookingId: booking._id,
    patientId: booking.patientId,
    grossAmount,
    platformCommission,
    gstPercentage,
    gstAmount,
    netAmount,
    status: 'PENDING',
    completedAt: booking.completedAt || new Date(),
    weekNumber,
    year,
    remarks: `Lab booking payout: ${booking._id}`,
  });
};

const findOrCreateLabPayment = async (booking, paymentData = {}) => {
  let payment = booking.paymentId ? await Payment.findById(booking.paymentId) : null;
  if (!payment) {
    payment = await Payment.findOne({ bookingType: 'lab_test', labBookingId: booking._id });
  }

  const grossAmount = Number(paymentData.grossAmount ?? booking.grossAmount ?? booking.totalSellingPrice ?? 0);
  const payableAmount = Number(paymentData.payableAmount ?? booking.payableAmount ?? grossAmount);
  const coinsUsed = Number(paymentData.coinsUsed ?? booking.coinsUsed ?? 0);
  const coinValueInRupees = Number(paymentData.coinValueInRupees ?? booking.coinValueInRupees ?? 1);
  const coinDiscount = Number(paymentData.coinDiscount ?? booking.coinDiscount ?? 0);
  const couponDiscount = Number(paymentData.couponDiscount ?? booking.couponDiscount ?? 0);
  const settings = await Settings.getSettings();
  const commissionRate = Number(settings?.commissionRate ?? 20);
  const gstPercentage = Number(settings?.gstPercentage ?? 18);
  const platformCommission = roundMoney(grossAmount * (commissionRate / 100));
  const gstAmount = roundMoney(platformCommission * (gstPercentage / 100));
  const providerAmount = Math.max(0, roundMoney(grossAmount - platformCommission - gstAmount));
  const platformRevenue = roundMoney(platformCommission + gstAmount);

  if (!payment) {
    payment = await Payment.create({
      bookingType: 'lab_test',
      labBookingId: booking._id,
      patientId: booking.patientId,
      providerId: booking.assignedLabProviderId,
      baseAmount: providerAmount,
      platformCommission,
      gstPercentage,
      gstAmount,
      travelFare: 0,
      grossAmount,
      totalAmount: payableAmount,
      payableAmount,
      coinsUsed,
      coinValueInRupees,
      coinDiscount,
      couponId: paymentData.couponId ?? booking.couponId,
      couponCode: paymentData.couponCode ?? booking.couponCode,
      couponDiscount,
      couponApplied: couponDiscount > 0,
      platformRevenue,
      providerAmount,
      paymentMethod: payableAmount === 0 ? 'coins' : 'razorpay',
      status: 'pending',
    });
  } else if (payment.status !== 'completed') {
    payment.providerId = booking.assignedLabProviderId || payment.providerId;
    payment.baseAmount = providerAmount;
    payment.platformCommission = platformCommission;
    payment.gstPercentage = gstPercentage;
    payment.gstAmount = gstAmount;
    payment.grossAmount = grossAmount;
    payment.totalAmount = payableAmount;
    payment.payableAmount = payableAmount;
    payment.amount = payableAmount;
    payment.providerAmount = providerAmount;
    payment.platformRevenue = platformRevenue;
    payment.coinsUsed = coinsUsed;
    payment.coinValueInRupees = coinValueInRupees;
    payment.coinDiscount = coinDiscount;
    payment.couponId = paymentData.couponId ?? booking.couponId ?? payment.couponId;
    payment.couponCode = paymentData.couponCode ?? booking.couponCode ?? payment.couponCode;
    payment.couponDiscount = couponDiscount;
    payment.couponApplied = couponDiscount > 0;
    payment.paymentMethod = payableAmount === 0 ? 'coins' : (payment.paymentMethod || 'razorpay');
    await payment.save();
  }

  if (!booking.paymentId || String(booking.paymentId) !== String(payment._id)) {
    booking.paymentId = payment._id;
    await booking.save();
  }

  return payment;
};

export const getLabTests = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort === 'price-desc' ? { sellingPrice: -1 } : { sellingPrice: 1, updatedAt: -1 };
    const filter = buildLabTestQuery(req.query);
    const cityQuery = { ...req.query };
    delete cityQuery.city;
    const cityFilter = buildLabTestQuery(cityQuery);

    const [masterTests, total, categories, cities] = await Promise.all([
      LabTestMaster.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      LabTestMaster.countDocuments(filter),
      LabTestMaster.distinct('category', { status: 'active' }),
      LabTestMaster.distinct('city', cityFilter),
    ]);

    const tests = masterTests.map(toPatientMasterLabTest);

    res.status(200).json({
      success: true,
      tests,
      total,
      page,
      pages: Math.ceil(total / limit),
      filters: {
        categories: categories.sort(),
        cities: cities.filter(Boolean).sort(),
      },
      sections: {
        popularTests: [],
        recommendedPackages: [],
        fullBodyPackages: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lab tests',
      error: error.message,
    });
  }
};

export const getLabTestSuggestions = async (req, res) => {
  try {
    const term = String(req.query.q || '').trim();
    if (!term) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const tests = await LabTestMaster.find({
      status: 'active',
      ...buildLabSearchFilter(term),
    })
      .select('testId testName category')
      .sort({ testName: 1 })
      .limit(10);

    res.status(200).json({ success: true, suggestions: tests });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching suggestions',
      error: error.message,
    });
  }
};

export const getLabTestById = async (req, res) => {
  try {
    const master = mongoose.Types.ObjectId.isValid(req.params.id)
      ? await LabTestMaster.findOne({ _id: req.params.id, status: 'active' })
      : null;
    if (master) {
      return res.status(200).json({ success: true, test: toPatientMasterLabTest(master) });
    }

    const test = await ProviderLabTest.findById(req.params.id)
      .populate('labTestId')
      .populate({ path: 'providerId', populate: { path: 'userId', select: 'name mobile' } });
    if (!test || test.status !== 'active' || !hasActiveMasterTest(test)) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }
    res.status(200).json({ success: true, test: toPatientLabTest(test) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lab test',
      error: error.message,
    });
  }
};

export const searchLabTests = async (req, res) => getLabTests(req, res);

export const getLabTestProviders = async (req, res) => {
  try {
    const master = await LabTestMaster.findOne({
      $or: [
        mongoose.Types.ObjectId.isValid(req.params.id) ? { _id: req.params.id } : null,
        { testId: String(req.params.id).trim().toUpperCase() },
      ].filter(Boolean),
      status: 'active',
    });

    if (!master) {
      return res.status(404).json({ success: false, message: 'Master lab test not found' });
    }

    const providerTests = await ProviderLabTest.find({ labTestId: master._id, status: 'active' })
      .populate('labTestId')
      .populate({ path: 'providerId', populate: { path: 'userId', select: 'name mobile' } })
      .sort({ price: 1 });

    res.status(200).json({
      success: true,
      test: master,
      providers: providerTests.map(toPatientLabTest),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lab providers',
      error: error.message,
    });
  }
};

export const validateLabCart = async (req, res) => {
  try {
    const testIds = toArray(req.body.testIds);
    if (!testIds.length) {
      return res.status(400).json({ success: false, message: 'Please select at least one test' });
    }

    const validIds = testIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const masterTests = await LabTestMaster.find({ _id: { $in: validIds }, status: 'active' });
    const tests = masterTests.map(toPatientMasterLabTest);
    const totalOriginalPrice = tests.reduce((sum, test) => sum + test.originalPrice, 0);
    const totalSellingPrice = tests.reduce((sum, test) => sum + test.sellingPrice, 0);

    res.status(200).json({
      success: true,
      tests,
      totals: {
        totalOriginalPrice,
        totalSellingPrice,
        totalDiscount: Math.max(totalOriginalPrice - totalSellingPrice, 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while validating cart',
      error: error.message,
    });
  }
};

export const createLabBooking = async (req, res) => {
  try {
    const {
      testIds,
      city,
      collectionType = 'home',
      preferredDate,
      preferredTimeSlot,
      address,
      patientLocation,
      patientName,
      patientMobile,
      acceptedLegalDocumentIds,
    } = req.body;

    const selectedIds = toArray(testIds);
    if (!selectedIds.length || !city || !preferredDate || !preferredTimeSlot || !address || !patientName || !patientMobile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide tests, city, date, time slot, address, patient name, and mobile',
      });
    }

    const validSelectedIds = selectedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const masterTests = await LabTestMaster.find({ _id: { $in: validSelectedIds }, status: 'active' });
    const tests = masterTests.map(toPatientMasterLabTest);
    if (!tests.length) {
      return res.status(400).json({ success: false, message: 'No active lab tests found for booking' });
    }

    if (collectionType === 'home' && tests.some((test) => !test.homeCollection)) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected tests are not available for home collection',
      });
    }

    const totalOriginalPrice = tests.reduce((sum, test) => sum + test.originalPrice, 0);
    const totalSellingPrice = tests.reduce((sum, test) => sum + test.sellingPrice, 0);
    const legalCheck = await requireAcceptedDocuments({
      acceptedDocumentIds: acceptedLegalDocumentIds,
      requiredSlugs: LEGAL_DOCUMENT_SLUGS,
    });
    if (!legalCheck.ok) {
      return res.status(400).json({ success: false, message: legalCheck.message });
    }

    const receiverDetails = parseServiceReceiver(req.body);
    const accountOwner = await User.findById(req.user.id).select('name mobile');

    const booking = await LabBooking.create({
      patientId: req.user.id,
      tests: tests.map((test) => ({
        labTestId: test.labTestId || test.providerLabTestId,
        providerLabTestId: test.providerLabTestId,
        providerId: test.providerId,
        providerName: test.providerName,
        testId: test.testId,
        testCode: test.testCode,
        testName: test.testName,
        sellingPrice: test.sellingPrice,
        originalPrice: test.originalPrice,
        discount: test.discount,
      })),
      selectedTests: tests.map((test) => ({
        labTestId: test.labTestId || test.providerLabTestId,
        providerLabTestId: test.providerLabTestId,
        providerId: test.providerId,
        providerName: test.providerName,
        testId: test.testId,
        testCode: test.testCode,
        testName: test.testName,
        sellingPrice: test.sellingPrice,
        originalPrice: test.originalPrice,
        discount: test.discount,
      })),
      city,
      collectionType,
      preferredDate,
      preferredTimeSlot,
      address,
      patientLocation: {
        latitude: patientLocation?.latitude,
        longitude: patientLocation?.longitude,
        address: patientLocation?.address || address,
      },
      patientName,
      patientMobile,
      bookedByName: accountOwner?.name,
      bookedByMobile: accountOwner?.mobile,
      ...receiverDetails,
      acceptedLegalDocuments: legalCheck.documents.map((doc) => doc._id),
      totalOriginalPrice,
      totalSellingPrice,
      totalDiscount: Math.max(totalOriginalPrice - totalSellingPrice, 0),
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        changedBy: req.user.id,
        note: 'Lab booking created; waiting for payment',
        changedAt: new Date(),
      }],
    });

    await saveAcceptanceLogs({
      userId: req.user.id,
      documents: legalCheck.documents,
      req,
      context: 'lab-booking',
    });

    res.status(201).json({
      success: true,
      message: 'Lab booking created. Please complete payment.',
      booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while creating lab booking',
      error: error.message,
    });
  }
};

export const createLabTest = async (req, res) => {
  try {
    const payload = req.body || {};
    const testId = payload.testId
      ? String(payload.testId).trim().toUpperCase()
      : await getNextLabTestId();

    const testCode = payload.testCode
      ? String(payload.testCode).trim().toUpperCase()
      : testId;

    const test = await LabTest.create({
      testId,
      testCode,
      testName: payload.testName,
      category: payload.category,
      description: payload.description || '',
      parameters: toArray(payload.parameters),
      city: payload.city,
      sellingPrice: Number(payload.sellingPrice || 0),
      originalPrice: Number(payload.originalPrice || payload.sellingPrice || 0),
      discount: Number(payload.discount || 0),
      reportTime: payload.reportTime || '24 hrs',
      fastingRequired: payload.fastingRequired === true || payload.fastingRequired === 'true',
      homeCollection: payload.homeCollection !== false && payload.homeCollection !== 'false',
      recommendedFor: toArray(payload.recommendedFor),
      status: payload.status || 'active',
      isPopular: payload.isPopular === true || payload.isPopular === 'true',
      isRecommendedPackage: payload.isRecommendedPackage === true || payload.isRecommendedPackage === 'true',
      isFullBodyPackage: payload.isFullBodyPackage === true || payload.isFullBodyPackage === 'true',
    });

    res.status(201).json({
      success: true,
      message: 'Lab test created successfully',
      test,
    });
  } catch (error) {
    const duplicate = error?.code === 11000;
    res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate ? 'Lab test ID or old code already exists' : 'Server error while creating lab test',
      error: error.message,
    });
  }
};

export const markLabBookingPaid = async (req, res) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Lab booking not found' });
    }

    if (booking.patientId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
    }

    if (booking.paymentStatus === 'paid') {
      const payment = booking.paymentId
        ? await Payment.findById(booking.paymentId)
        : await Payment.findOne({ bookingType: 'lab_test', labBookingId: booking._id });

      return res.status(200).json({
        success: true,
        message: 'Lab test payment already confirmed',
        booking,
        payment,
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const settings = req.settings || await Settings.getSettings();
    const key_secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;

    const isTestMode = process.env.NODE_ENV === 'development' || process.env.PAYMENT_TEST_MODE === 'true';
    const payment = await findOrCreateLabPayment(booking);
    const payableAmount = Number(booking.payableAmount ?? payment.payableAmount ?? booking.totalSellingPrice ?? 0);

    if (payment.status === 'completed') {
      booking.paymentStatus = 'paid';
      if (booking.status === 'pending' || booking.status === 'confirmed') {
        addLabBookingHistory(booking, 'pending_admin_approval', req.user.id, 'Payment already verified; waiting for admin assignment');
      }
      booking.paymentMethod = payment.paymentMethod || booking.paymentMethod;
      booking.transactionId = payment.transactionId || booking.transactionId || `LAB_PAYMENT_${Date.now()}`;
      booking.paymentId = payment._id;
      await booking.save();

      return res.status(200).json({
        success: true,
        message: 'Lab test payment already confirmed',
        booking,
        payment,
      });
    }

    if (!isTestMode && payableAmount > 0) {
      if (!key_secret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        payment.status = 'failed';
        await payment.save();
        return res.status(400).json({
          success: false,
          message: 'Missing Razorpay verification details',
        });
      }

      if (payment.razorpayOrderId && payment.razorpayOrderId !== razorpay_order_id) {
        payment.status = 'failed';
        payment.paymentDetails = {
          ...(payment.paymentDetails || {}),
          failureReason: 'Razorpay order ID does not match lab payment order',
          expectedOrderId: payment.razorpayOrderId,
          receivedOrderId: razorpay_order_id,
          timestamp: new Date(),
        };
        await payment.save();
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
        });
      }

      const duplicatePayment = await Payment.findOne({
        _id: { $ne: payment._id },
        status: 'completed',
        $or: [
          { razorpayPaymentId: razorpay_payment_id },
          { transactionId: razorpay_payment_id },
        ],
      });
      if (duplicatePayment) {
        payment.status = 'failed';
        payment.razorpayOrderId = razorpay_order_id;
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.transactionId = razorpay_payment_id;
        payment.paymentDetails = {
          ...(payment.paymentDetails || {}),
          failureReason: 'Duplicate Razorpay payment ID',
          duplicatePaymentId: duplicatePayment._id,
          timestamp: new Date(),
        };
        await payment.save();
        return res.status(409).json({
          success: false,
          message: 'This Razorpay payment has already been verified.',
        });
      }

      const expectedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(razorpay_signature, 'hex');
      const isValidSignature = expectedBuffer.length === receivedBuffer.length
        && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

      payment.razorpayOrderId = razorpay_order_id;
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.transactionId = razorpay_payment_id;
      payment.paymentDetails = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      };

      if (!isValidSignature) {
        payment.status = 'failed';
        await payment.save();
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
        });
      }

      try {
        const { gatewayPayment, gatewayOrder } = await verifyRazorpayPaymentEntity({
          settings,
          payment,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
        });
        payment.paymentDetails = {
          ...(payment.paymentDetails || {}),
          razorpayPaymentStatus: gatewayPayment.status,
          razorpayOrderStatus: gatewayOrder?.status,
          serverVerifiedAt: new Date(),
        };
      } catch (verificationError) {
        payment.status = 'failed';
        payment.paymentDetails = {
          ...(payment.paymentDetails || {}),
          failureReason: verificationError.message,
          expectedAmount: verificationError.expectedAmount,
          gatewayAmount: verificationError.gatewayAmount,
          timestamp: new Date(),
        };
        await payment.save();
        return res.status(400).json({
          success: false,
          message: verificationError.message || 'Payment verification failed',
        });
      }
    }

    if (booking.coinsUsed > 0 && !booking.coinsRedeemed) {
      const updatedUser = await redeemCoins({
        userId: booking.patientId,
        amount: booking.coinsUsed,
        description: `Coins redeemed for lab booking ${booking._id}`,
        idempotencyKey: `lab-booking-redemption:${booking._id}`,
        metadata: {
          bookingId: booking._id,
          coinValueInRupees: booking.coinValueInRupees,
          coinDiscount: booking.coinDiscount,
        },
      });

      if (!updatedUser) {
        return res.status(400).json({
          success: false,
          message: 'Not enough coins available to complete this payment',
        });
      }

      booking.coinsRedeemed = true;
    }

    if (booking.couponId && booking.couponDiscount > 0) {
      await validateCouponForUser({
        code: booking.couponCode,
        userId: booking.patientId,
        bookingType: 'lab_test',
        orderAmount: booking.grossAmount || booking.totalSellingPrice,
        excludeBookingId: booking._id,
        excludePaymentId: payment._id,
      });
      await applyCouponUsageOnce({
        couponId: booking.couponId,
        userId: booking.patientId,
        bookingType: 'lab_test',
        bookingId: booking._id,
        paymentId: payment._id,
        discountAmount: booking.couponDiscount,
      });
    }

    booking.paymentStatus = 'paid';
    if (booking.status === 'pending' || booking.status === 'confirmed') {
      addLabBookingHistory(booking, 'pending_admin_approval', req.user.id, 'Payment received; waiting for admin assignment');
    }
    booking.paymentMethod = req.body.paymentMethod || booking.paymentMethod;
    booking.transactionId = razorpay_payment_id || req.body.transactionId || (payableAmount <= 0 ? `LAB_COINS_${Date.now()}` : `LAB_TEST_${Date.now()}`);
    booking.paymentId = payment._id;

    payment.status = 'completed';
    payment.paymentMethod = req.body.paymentMethod || (payableAmount <= 0 ? 'coins' : (isTestMode ? 'test' : 'razorpay'));
    payment.transactionId = booking.transactionId;
    payment.providerId = booking.assignedLabProviderId || payment.providerId;
    await payment.save();
    await booking.save();

    try {
      await createSystemNotification({
        title: 'New paid lab booking',
        message: `${booking.patientName} paid for ${booking.tests?.length || 0} lab test(s) in ${booking.city}.`,
        type: 'lab_booking_pending',
        recipient: 'admin',
        relatedUser: booking.patientId,
        priority: 'medium',
      });
    } catch (notificationError) {
      console.error('Lab booking admin notification error:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Lab test payment confirmed',
      booking,
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while confirming lab payment',
      error: error.message,
    });
  }
};

export const createLabBookingPaymentOrder = async (req, res) => {
  try {
    const { useCoins, couponCode } = req.body;
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Lab booking not found' });
    }

    if (booking.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
    }

    if (booking.paymentStatus === 'paid') {
      const payment = booking.paymentId
        ? await Payment.findById(booking.paymentId)
        : await Payment.findOne({ bookingType: 'lab_test', labBookingId: booking._id });
      return res.status(200).json({
        success: true,
        message: 'This lab booking is already paid',
        bookingId: booking._id,
        order: null,
        paymentId: payment?._id,
        paid: true,
      });
    }

    const settings = req.settings || await Settings.getSettings();
    const patient = await mongoose.model('User').findById(req.user.id);
    const bookedTests = (booking.selectedTests?.length ? booking.selectedTests : booking.tests || [])
      .map((test) => normalizeBookedLabTestPrice(test.toObject ? test.toObject() : test));
    const grossAmount = bookedTests.length
      ? roundMoney(bookedTests.reduce((sum, test) => sum + Number(test.sellingPrice || 0), 0))
      : Number(booking.totalSellingPrice || 0);
    let couponId;
    let appliedCouponCode = '';
    let couponDiscount = 0;

    if (couponCode) {
      const couponResult = await validateCouponForUser({
        code: couponCode,
        userId: req.user.id,
        bookingType: 'lab_test',
        orderAmount: grossAmount,
        excludeBookingId: booking._id,
      });
      couponId = couponResult.coupon._id;
      appliedCouponCode = couponResult.coupon.code;
      couponDiscount = couponResult.discountAmount;
    }

    const amountAfterCoupon = Math.max(0, grossAmount - couponDiscount);
    const coinValueInRupees = Math.max(Number(settings?.coinValueInRupees ?? 1), 0);
    const availableCoins = Number(patient?.coins || 0);
    const coinsUsed = useCoins && coinValueInRupees > 0
      ? Math.min(availableCoins, Math.floor(amountAfterCoupon / coinValueInRupees))
      : 0;
    const coinDiscount = coinsUsed * coinValueInRupees;
    const payableAmount = Math.max(0, amountAfterCoupon - coinDiscount);

    booking.grossAmount = grossAmount;
    booking.payableAmount = payableAmount;
    booking.coinsUsed = coinsUsed;
    booking.coinValueInRupees = coinValueInRupees;
    booking.coinDiscount = coinDiscount;
    booking.couponId = couponId;
    booking.couponCode = appliedCouponCode;
    booking.couponDiscount = couponDiscount;
    booking.couponApplied = couponDiscount > 0;
    booking.coinsRedeemed = false;
    await booking.save();

    const payment = await findOrCreateLabPayment(booking, {
      grossAmount,
      payableAmount,
      coinsUsed,
      coinValueInRupees,
      coinDiscount,
      couponId,
      couponCode: appliedCouponCode,
      couponDiscount,
    });

    const isTestMode = process.env.NODE_ENV === 'development' || process.env.PAYMENT_TEST_MODE === 'true';

    if (payableAmount === 0) {
      return res.status(201).json({
        success: true,
        message: 'Lab payment can be completed using coins',
        bookingId: booking._id,
        paymentId: payment._id,
        order: null,
        amount: payableAmount,
        currency: settings?.currency || 'INR',
        breakdown: {
          grossAmount,
          couponCode: appliedCouponCode,
          couponDiscount,
          coinsAvailable: availableCoins,
          coinsUsed,
          coinValueInRupees,
          coinDiscount,
          payableAmount,
          totalAmount: payableAmount,
        },
      });
    }

    if (isTestMode) {
      return res.status(201).json({
        success: true,
        message: 'TEST MODE: Lab payment order created (no real payment required)',
        bookingId: booking._id,
        paymentId: payment._id,
        order: null,
        amount: payableAmount,
        currency: settings?.currency || 'INR',
        testMode: true,
        breakdown: {
          grossAmount,
          couponCode: appliedCouponCode,
          couponDiscount,
          coinsAvailable: availableCoins,
          coinsUsed,
          coinValueInRupees,
          coinDiscount,
          payableAmount,
          totalAmount: payableAmount,
        },
      });
    }

    const key_id = settings?.razorpayKey || process.env.RAZORPAY_KEY_ID;
    const key_secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay is not configured. Please set Razorpay API Key/Secret in Admin Settings.',
      });
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const order = await razorpay.orders.create({
      amount: Math.round(payableAmount * 100),
      currency: settings?.currency || 'INR',
      receipt: `LAB_${booking._id.toString()}`,
      payment_capture: 1,
      notes: {
        bookingId: booking._id.toString(),
        patientId: booking.patientId.toString(),
      },
    });
    payment.razorpayOrderId = order.id;
    payment.paymentMethod = 'razorpay';
    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Lab payment order created successfully',
      bookingId: booking._id,
      paymentId: payment._id,
      order,
      amount: payableAmount,
        breakdown: {
          grossAmount,
          couponCode: appliedCouponCode,
          couponDiscount,
          coinsAvailable: availableCoins,
        coinsUsed,
        coinValueInRupees,
        coinDiscount,
        payableAmount,
        totalAmount: payableAmount,
      },
      currency: settings?.currency || 'INR',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while creating lab payment order',
      error: error.message,
    });
  }
};

export const getMyLabBookings = async (req, res) => {
  try {
    const bookings = await populateLabBooking(
      LabBooking.find({ patientId: req.user.id }).sort({ createdAt: -1 })
    );

    res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lab bookings',
      error: error.message,
    });
  }
};

export const getPatientLabReports = async (req, res) => {
  try {
    const bookings = await populateLabBooking(
      LabBooking.find({ patientId: req.user.id }).sort({ createdAt: -1 })
    );

    res.status(200).json({
      success: true,
      bookings,
      reports: bookings.flatMap((booking) => {
        const files = booking.reportFiles?.length ? booking.reportFiles : booking.reports || [];
        return files.map((report) => ({
          bookingId: booking._id,
          testNames: (booking.selectedTests?.length ? booking.selectedTests : booking.tests || [])
            .map((test) => test.testName)
            .filter(Boolean),
          assignedLabName: booking.assignedLabProviderId?.labName || booking.assignedLabProviderId?.userId?.name || '',
          status: booking.status,
          reportStatus: booking.reportStatus || (files.length ? 'uploaded' : 'pending'),
          url: report.url,
          name: report.name || booking.reportName || 'Lab report',
          uploadedAt: report.uploadedAt || booking.reportUploadedAt,
        }));
      }),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lab reports',
      error: error.message,
    });
  }
};

export const getAdminLabBookings = async (req, res) => {
  try {
    const status = req.query.status || 'pending_admin_approval';
    const filter = status === 'all' ? {} : { status };
    const bookings = await populateLabBooking(
      LabBooking.find(filter).sort({ createdAt: -1 })
    );

    const bookingsWithProviders = await Promise.all(bookings.map(async (booking) => ({
      ...booking.toObject(),
      nearbyLabProviders: await getEligibleLabProvidersForBooking(booking),
    })));

    res.status(200).json({
      success: true,
      bookings: bookingsWithProviders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin lab bookings',
      error: error.message,
    });
  }
};

export const getAdminLabBookingById = async (req, res) => {
  try {
    const booking = await populateLabBooking(LabBooking.findById(req.params.id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Lab booking not found' });
    }

    res.status(200).json({
      success: true,
      booking,
      nearbyLabProviders: await getEligibleLabProvidersForBooking(booking),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lab booking',
      error: error.message,
    });
  }
};

export const assignLabBookingProvider = async (req, res) => {
  try {
    const { providerId } = req.body;
    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid lab provider' });
    }

    const booking = await LabBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Lab booking not found' });
    }

    const provider = await Provider.findOne({ _id: providerId, category: 'Lab Technician', status: 'approved' })
      .populate('userId', 'name email mobile');
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Selected provider is not an approved lab provider' });
    }

    const canPerformAllTests = await providerCanPerformTests(provider._id, getBookingMasterTestIds(booking), booking.collectionType);
    if (!canPerformAllTests) {
      return res.status(400).json({ success: false, message: 'Selected lab cannot perform all requested tests' });
    }

    booking.assignedLabProviderId = provider._id;
    booking.adminRejectionReason = undefined;
    booking.labRejectionReason = undefined;
    addLabBookingHistory(booking, 'assigned_to_lab', req.user.id, `Assigned to ${provider.labName || provider.userId?.name || 'lab provider'}`);
    await booking.save();

    if (booking.paymentId) {
      await Payment.findByIdAndUpdate(booking.paymentId, { providerId: provider._id });
    }

    try {
      await createSystemNotification({
        title: 'Lab order assigned',
        message: `A lab booking has been assigned to ${provider.labName || provider.userId?.name || 'a lab provider'}.`,
        type: 'lab_booking_assigned',
        recipient: 'provider',
        relatedUser: booking.patientId,
        relatedProvider: provider._id,
        priority: 'high',
      });
      await createSystemNotification({
        title: 'Lab assigned',
        message: `Your lab booking has been assigned to ${provider.labName || provider.userId?.name || 'a lab provider'}.`,
        type: 'lab_booking_assigned',
        recipient: 'patient',
        relatedUser: booking.patientId,
        relatedProvider: provider._id,
        priority: 'medium',
      });
    } catch (notificationError) {
      console.error('Lab assignment notification error:', notificationError);
    }

    const populatedBooking = await populateLabBooking(LabBooking.findById(booking._id));
    res.status(200).json({
      success: true,
      message: 'Lab provider assigned successfully',
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while assigning lab provider',
      error: error.message,
    });
  }
};

export const rejectLabBookingByAdmin = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide rejection reason' });
    }

    const booking = await LabBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Lab booking not found' });
    }

    booking.adminRejectionReason = reason.trim();
    addLabBookingHistory(booking, 'rejected_by_admin', req.user.id, reason.trim());
    await booking.save();

    try {
      await createSystemNotification({
        title: 'Lab booking rejected',
        message: `Your lab booking was rejected: ${reason.trim()}`,
        type: 'lab_booking_rejected',
        recipient: 'patient',
        relatedUser: booking.patientId,
        priority: 'medium',
      });
    } catch (notificationError) {
      console.error('Lab rejection notification error:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Lab booking rejected',
      booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting lab booking',
      error: error.message,
    });
  }
};

export const getProviderAssignedLabBookings = async (req, res) => {
  try {
    const provider = await getProviderIdForUser(req.user.id);
    const status = req.query.status || 'all';
    const filter = { assignedLabProviderId: provider._id };
    if (status !== 'all') filter.status = status;

    const bookings = await populateLabBooking(
      LabBooking.find(filter).sort({ createdAt: -1 })
    );

    const bookingIds = bookings.map((booking) => booking._id);
    const generatedReports = await LabReport.find({
      bookingId: { $in: bookingIds },
      providerId: provider._id,
      status: { $in: ['draft', 'published'] },
    }).sort({ createdAt: -1 });
    const reportsByBooking = generatedReports.reduce((map, report) => {
      const key = String(report.bookingId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(report);
      return map;
    }, new Map());

    res.status(200).json({
      success: true,
      bookings: bookings.map((booking) => ({
        ...booking.toObject(),
        generatedReports: reportsByBooking.get(String(booking._id)) || [],
      })),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while fetching assigned lab orders',
    });
  }
};

export const uploadProviderLabBookingReport = async (req, res) => {
  try {
    const provider = await getProviderIdForUser(req.user.id);
    const legacyReportFile = firstUploadedFile(req, 'file');
    const explicitMainReportPdf = firstUploadedFile(req, 'mainReportPdf');
    const mainReportPdf = explicitMainReportPdf || legacyReportFile;
    const summaryPdf = firstUploadedFile(req, 'summaryPdf');
    const signatureFile = firstUploadedFile(req, 'signatureFile');

    if (!mainReportPdf) {
      return res.status(400).json({ success: false, message: 'Please upload one combined Lab Report PDF' });
    }
    if (summaryPdf || signatureFile) {
      return res.status(400).json({
        success: false,
        message: 'Please include conclusion, summary, signature, and authorization inside the same Lab Report PDF',
      });
    }

    if (explicitMainReportPdf && !LAB_REPORT_PDF_TYPES.includes(explicitMainReportPdf.mimetype)) {
      return res.status(400).json({ success: false, message: 'Main Lab Report must be a PDF' });
    }
    if (legacyReportFile && !LAB_REPORT_ALLOWED_TYPES.includes(legacyReportFile.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only PDF, JPG, and PNG lab reports are allowed' });
    }
    if (summaryPdf && !LAB_REPORT_PDF_TYPES.includes(summaryPdf.mimetype)) {
      return res.status(400).json({ success: false, message: 'Conclusion / Summary must be a PDF' });
    }
    if (signatureFile && !LAB_SIGNATURE_ALLOWED_TYPES.includes(signatureFile.mimetype)) {
      return res.status(400).json({ success: false, message: 'Signature / Authorization must be a PDF, JPG, or PNG file' });
    }

    const booking = await LabBooking.findOne({
      _id: req.params.id,
      assignedLabProviderId: provider._id,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Assigned lab order not found' });
    }

    if (['lab_rejected', 'cancelled', 'rejected_by_admin', 'completed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Report cannot be uploaded for this lab order status' });
    }

    const uploadedAt = new Date();
    const uploadedFiles = {};

    if (mainReportPdf) {
      const uploadResult = await uploadNamedLabReportFile({
        file: mainReportPdf,
        allowedTypes: explicitMainReportPdf ? LAB_REPORT_PDF_TYPES : LAB_REPORT_ALLOWED_TYPES,
        fieldLabel: 'Main Lab Report',
      });
      const { reportId, reportName } = await buildUploadedLabReportName({ booking, provider });
      const reportFile = {
        url: uploadResult.url,
        name: reportName,
        reportId,
        mimeType: mainReportPdf.mimetype,
        size: mainReportPdf.size,
        uploadedAt,
        uploadedBy: req.user.id,
      };
      booking.mainReportPdfUrl = uploadResult.url;
      booking.mainReportPdfName = reportName;
      booking.reportUrl = uploadResult.url;
      booking.reportName = reportName;
      upsertReportFileEntry(booking, 'main', reportFile);
      uploadedFiles.mainReportPdf = reportFile;
    }

    if (summaryPdf) {
      const uploadResult = await uploadNamedLabReportFile({
        file: summaryPdf,
        allowedTypes: LAB_REPORT_PDF_TYPES,
        fieldLabel: 'Conclusion / Summary',
      });
      const reportName = req.body.summaryPdfName?.trim() || summaryPdf.originalname || 'Conclusion Summary.pdf';
      const reportFile = {
        url: uploadResult.url,
        name: reportName,
        mimeType: summaryPdf.mimetype,
        size: summaryPdf.size,
        uploadedAt,
        uploadedBy: req.user.id,
      };
      booking.summaryPdfUrl = uploadResult.url;
      booking.summaryPdfName = reportName;
      upsertReportFileEntry(booking, 'summary', reportFile);
      uploadedFiles.summaryPdf = reportFile;
    }

    if (signatureFile) {
      const uploadResult = await uploadNamedLabReportFile({
        file: signatureFile,
        allowedTypes: LAB_SIGNATURE_ALLOWED_TYPES,
        fieldLabel: 'Signature / Authorization',
      });
      const reportName = req.body.signatureFileName?.trim() || signatureFile.originalname || 'Signature Authorization';
      const reportFile = {
        url: uploadResult.url,
        name: reportName,
        mimeType: signatureFile.mimetype,
        size: signatureFile.size,
        uploadedAt,
        uploadedBy: req.user.id,
      };
      booking.signatureFileUrl = uploadResult.url;
      booking.signatureFileName = reportName;
      upsertReportFileEntry(booking, 'signature', reportFile);
      uploadedFiles.signatureFile = reportFile;
    }

    booking.reportUploadedAt = uploadedAt;
    booking.reportUploadedBy = req.user.id;
    booking.reportStatus = 'uploaded';
    await booking.save();

    try {
      await createSystemNotification({
        title: 'Lab report uploaded',
        message: 'Your lab report files were uploaded and will be available when the report is marked ready.',
        type: 'lab_report_uploaded',
        recipient: 'patient',
        relatedUser: booking.patientId,
        relatedProvider: provider._id,
        priority: 'high',
      });
    } catch (notificationError) {
      console.error('Lab report notification error:', notificationError);
    }

    const populatedBooking = await populateLabBooking(LabBooking.findById(booking._id));
    res.status(200).json({
      success: true,
      message: 'Lab report files uploaded successfully',
      booking: populatedBooking,
      files: uploadedFiles,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while uploading lab report',
    });
  }
};

export const saveProviderLabBookingReportData = async (req, res) => {
  try {
    const provider = await getProviderIdForUser(req.user.id);
    const booking = await populateLabBooking(LabBooking.findOne({
      _id: req.params.id,
      assignedLabProviderId: provider._id,
    }));

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Assigned lab order not found' });
    }
    if (['lab_rejected', 'cancelled', 'rejected_by_admin'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Report data cannot be saved for this lab order status' });
    }

    const resultAttachment = firstUploadedFile(req, 'resultAttachment');
    const resultAttachmentPreview = firstUploadedFile(req, 'resultAttachmentPreview');
    const summaryAttachment = firstUploadedFile(req, 'summaryAttachment');
    const signatureImage = firstUploadedFile(req, 'signatureImage');
    const reportResults = normalizeBookingReportResults(
      typeof req.body.reportResults === 'string'
        ? JSON.parse(req.body.reportResults || '[]')
        : req.body.reportResults
    );
    if (!reportResults.length && !resultAttachment && !booking.resultAttachmentUrl) {
      return res.status(400).json({ success: false, message: 'Please upload test result PDF/image' });
    }

    if (!booking.generatedReportId) {
      booking.generatedReportId = await getNextLabReportId({ city: booking.city, provider });
    }
    booking.reportResults = reportResults;

    if (resultAttachment) {
      const uploadResult = await uploadNamedLabReportFile({
        file: resultAttachment,
        allowedTypes: LAB_SIGNATURE_ALLOWED_TYPES,
        fieldLabel: 'Test Result',
        resourceType: resultAttachment.mimetype === 'application/pdf' ? 'image' : 'auto',
      });
      booking.resultAttachmentUrl = uploadResult.url;
      booking.resultAttachmentName = resultAttachment.originalname || 'Test Result';
      booking.resultAttachmentMimeType = resultAttachment.mimetype;
    }
    if (resultAttachmentPreview) {
      const uploadResult = await uploadNamedLabReportFile({
        file: resultAttachmentPreview,
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
        fieldLabel: 'Test Result Preview',
      });
      booking.resultAttachmentPreviewUrl = uploadResult.url;
    } else if (resultAttachment && resultAttachment.mimetype.startsWith('image/')) {
      booking.resultAttachmentPreviewUrl = booking.resultAttachmentUrl;
    }

    if (summaryAttachment) {
      const uploadResult = await uploadNamedLabReportFile({
        file: summaryAttachment,
        allowedTypes: LAB_SIGNATURE_ALLOWED_TYPES,
        fieldLabel: 'Conclusion / Summary',
      });
      booking.summaryAttachmentUrl = uploadResult.url;
      booking.summaryAttachmentName = summaryAttachment.originalname || 'Conclusion Summary';
      booking.summaryAttachmentMimeType = summaryAttachment.mimetype;
    }

    if (signatureImage) {
      const uploadResult = await uploadNamedLabReportFile({
        file: signatureImage,
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
        fieldLabel: 'Signature',
      });
      booking.signatureUrl = uploadResult.url;
    }

    booking.comments = String(req.body.comments || '').trim();
    booking.summary = String(req.body.summary || '').trim();
    booking.authorizedBy = String(req.body.authorizedBy || '').trim();
    booking.authorizedQualification = String(req.body.authorizedQualification || '').trim();
    booking.registrationNumber = String(req.body.registrationNumber || '').trim();
    if (req.body.signatureUrl && !signatureImage) booking.signatureUrl = String(req.body.signatureUrl || '').trim();
    booking.reportGeneratedAt = new Date();
    booking.reportStatus = 'uploaded';

    booking.statusHistory = [
      ...(booking.statusHistory || []),
      { status: booking.status, changedBy: req.user.id, note: `Saved generated report ${booking.generatedReportId}`, changedAt: new Date() },
    ];
    await booking.save();

    const populatedBooking = await populateLabBooking(LabBooking.findById(booking._id));
    res.status(200).json({
      success: true,
      message: 'Generated report data saved successfully',
      ...buildGeneratedReportPayload(populatedBooking),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while saving report data',
    });
  }
};

export const deleteProviderLabBookingReportData = async (req, res) => {
  try {
    const provider = await getProviderIdForUser(req.user.id);
    const booking = await LabBooking.findOne({
      _id: req.params.id,
      assignedLabProviderId: provider._id,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Assigned lab order not found' });
    }
    if (['lab_rejected', 'cancelled', 'rejected_by_admin'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Report data cannot be deleted for this lab order status' });
    }

    booking.reportResults = [];
    booking.resultAttachmentUrl = undefined;
    booking.resultAttachmentName = undefined;
    booking.resultAttachmentMimeType = undefined;
    booking.resultAttachmentPreviewUrl = undefined;
    booking.summaryAttachmentUrl = undefined;
    booking.summaryAttachmentName = undefined;
    booking.summaryAttachmentMimeType = undefined;
    booking.comments = undefined;
    booking.summary = undefined;
    booking.authorizedBy = undefined;
    booking.authorizedQualification = undefined;
    booking.registrationNumber = undefined;
    booking.signatureUrl = undefined;
    booking.reportGeneratedAt = undefined;

    if (!hasMainReportFile(booking)) {
      booking.reportStatus = 'pending';
      booking.reportReadyAt = undefined;
      if (booking.status === 'report_ready') booking.status = 'sample_collected';
    }

    booking.statusHistory = [
      ...(booking.statusHistory || []),
      { status: booking.status, changedBy: req.user.id, note: 'Deleted generated report data', changedAt: new Date() },
    ];
    await booking.save();

    const populatedBooking = await populateLabBooking(LabBooking.findById(booking._id));
    res.status(200).json({
      success: true,
      message: 'Generated report deleted successfully',
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while deleting report data',
    });
  }
};

export const getGeneratedLabBookingReport = async (req, res) => {
  try {
    const booking = await populateLabBooking(LabBooking.findById(req.params.id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Lab booking not found' });
    }
    if (!await authorizeGeneratedReportAccess(req, booking)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this report' });
    }
    if (!hasGeneratedReportData(booking)) {
      return res.status(404).json({ success: false, message: 'Generated report data not found' });
    }

    res.status(200).json({
      success: true,
      ...buildGeneratedReportPayload(booking),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while fetching generated report',
    });
  }
};

export const getGeneratedLabBookingReportPdf = async (req, res) => {
  try {
    const booking = await populateLabBooking(LabBooking.findById(req.params.id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Lab booking not found' });
    }
    if (!await authorizeGeneratedReportAccess(req, booking)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this report' });
    }
    if (!hasGeneratedReportData(booking)) {
      return res.status(404).json({ success: false, message: 'Generated report data not found' });
    }

    const filePath = path.join(LAB_REPORT_UPLOAD_DIR, `${booking.generatedReportId || booking._id}.pdf`);
    const { reportName } = await drawGeneratedBookingPdf({ filePath, booking });
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${reportName.replace(/[\\/:*?"<>|]/g, '-')}.pdf"`);
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while downloading generated report',
    });
  }
};

export const getVerifiedGeneratedLabBookingReportQr = async (req, res) => {
  try {
    const booking = await populateLabBooking(LabBooking.findById(req.params.id));
    if (!booking || !hasGeneratedReportData(booking) || !isValidReportVerificationToken(booking, req.query.token)) {
      return res.status(404).json({ success: false, message: 'Verified report not found' });
    }

    const png = await QRCode.toBuffer(getVerifiedReportDownloadUrl(booking), {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(png);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to generate report QR code' });
  }
};

export const getVerifiedGeneratedLabBookingReportPdf = async (req, res) => {
  try {
    const booking = await populateLabBooking(LabBooking.findById(req.params.id));
    if (!booking || !hasGeneratedReportData(booking) || !isValidReportVerificationToken(booking, req.query.token)) {
      return res.status(404).json({ success: false, message: 'Verified report not found' });
    }

    const filePath = path.join(LAB_REPORT_UPLOAD_DIR, `${booking.generatedReportId || booking._id}-verified.pdf`);
    const { reportName } = await drawGeneratedBookingPdf({ filePath, booking });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportName.replace(/[\\/:*?"<>|]/g, '-')}.pdf"`);
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while downloading verified generated report',
    });
  }
};

export const generateProviderLabBookingReport = async (req, res) => {
  try {
    const provider = await getProviderIdForUser(req.user.id);
    const { testName, parameters } = req.body;
    const normalizedParameters = normalizeReportParameters(parameters);

    if (!normalizedParameters.length) {
      return res.status(400).json({ success: false, message: 'Please enter at least one report result value' });
    }

    const booking = await populateLabBooking(LabBooking.findOne({
      _id: req.params.id,
      assignedLabProviderId: provider._id,
    }));

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Assigned lab order not found' });
    }

    if (['lab_rejected', 'cancelled', 'rejected_by_admin', 'completed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Report cannot be generated for this lab order status' });
    }

    const tests = booking.selectedTests?.length ? booking.selectedTests : booking.tests || [];
    const bookingTestNames = tests.map((test) => test.testName).filter(Boolean);
    const reportTitle = testName?.trim() || bookingTestNames.join(', ') || 'Lab Report';

    const reportId = await getNextLabReportId({ city: booking.city, provider });
    const report = new LabReport({
      reportId,
      patientId: booking.patientId?._id || booking.patientId,
      providerId: provider._id,
      bookingId: booking._id,
      testName: reportTitle,
      parameters: normalizedParameters,
      generatedPdfUrl: getReportUrl(reportId),
      pdfStoragePath: path.join(LAB_REPORT_UPLOAD_DIR, `${reportId}.pdf`),
      status: 'draft',
      generatedBy: req.user.id,
    });

    report.generatedPdfUrl = getReportUrl(report._id);
    await generateLabReportPdf({
      filePath: report.pdfStoragePath,
      report,
      booking,
      provider,
      patient: booking.patientId,
    });
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Lab report generated as draft. Mark completed and upload to send it to the patient.',
      booking,
      report,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while generating lab report',
    });
  }
};

export const getProviderGeneratedLabReport = async (req, res) => {
  try {
    const { report } = await findProviderLabReport({
      userId: req.user.id,
      reportId: req.params.reportId,
    });

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while fetching generated lab report',
    });
  }
};

export const updateProviderGeneratedLabReport = async (req, res) => {
  try {
    const { testName, parameters } = req.body;
    const normalizedParameters = normalizeReportParameters(parameters);
    if (!normalizedParameters.length) {
      return res.status(400).json({ success: false, message: 'Please enter at least one report result value' });
    }

    const { provider, report, booking } = await findProviderLabReport({
      userId: req.user.id,
      reportId: req.params.reportId,
    });

    const tests = booking.selectedTests?.length ? booking.selectedTests : booking.tests || [];
    const reportTitle = testName?.trim() || tests.map((test) => test.testName).filter(Boolean).join(', ') || report.testName;

    report.testName = reportTitle;
    report.parameters = normalizedParameters;
    await generateLabReportPdf({
      filePath: report.pdfStoragePath,
      report,
      booking,
      provider,
      patient: booking.patientId,
    });
    await report.save();

    const updatedAt = new Date();
    const reportName = `${report.reportId} - ${report.testName}`;
    const updateReportEntry = (entry) => {
      const plainEntry = typeof entry.toObject === 'function' ? entry.toObject() : entry;
      return (String(plainEntry.reportId || '') === String(report.reportId) || String(plainEntry.url || '') === String(report.generatedPdfUrl))
        ? { ...plainEntry, name: reportName, uploadedAt: updatedAt, uploadedBy: req.user.id }
        : plainEntry;
    };

    if (['published', 'generated'].includes(report.status)) {
      booking.reportFiles = (booking.reportFiles || []).map(updateReportEntry);
      booking.reports = (booking.reports || []).map(updateReportEntry);
      booking.reportName = reportName;
      booking.reportUploadedAt = updatedAt;
      booking.reportStatus = 'uploaded';
      booking.reportReadyAt = updatedAt;
      booking.statusHistory = [
        ...(booking.statusHistory || []),
        { status: booking.status, changedBy: req.user.id, note: `Updated ${reportName}`, changedAt: updatedAt },
      ];
      await booking.save();
    }

    const populatedBooking = await populateLabBooking(LabBooking.findById(booking._id));
    res.status(200).json({
      success: true,
      message: 'Lab report updated successfully',
      report,
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while updating generated lab report',
    });
  }
};

export const deleteProviderGeneratedLabReport = async (req, res) => {
  try {
    const { report, booking } = await findProviderLabReport({
      userId: req.user.id,
      reportId: req.params.reportId,
    });

    report.status = 'void';
    await report.save();

    const removeReportEntry = (entry) => {
      const plainEntry = typeof entry.toObject === 'function' ? entry.toObject() : entry;
      return String(plainEntry.reportId || '') !== String(report.reportId)
        && String(plainEntry.url || '') !== String(report.generatedPdfUrl);
    };

    booking.reportFiles = (booking.reportFiles || []).filter(removeReportEntry);
    booking.reports = (booking.reports || []).filter(removeReportEntry);
    const latestReport = booking.reportFiles?.[booking.reportFiles.length - 1] || booking.reports?.[booking.reports.length - 1];
    booking.reportName = latestReport?.name || undefined;
    booking.reportUploadedAt = latestReport?.uploadedAt || undefined;
    if (!booking.reportFiles?.length && !booking.reports?.length) {
      booking.reportStatus = 'pending';
      booking.reportReadyAt = undefined;
      if (booking.status === 'report_ready') booking.status = 'sample_collected';
    }
    booking.statusHistory = [
      ...(booking.statusHistory || []),
      { status: booking.status, changedBy: req.user.id, note: `Deleted ${report.reportId}`, changedAt: new Date() },
    ];
    await booking.save();

    const populatedBooking = await populateLabBooking(LabBooking.findById(booking._id));
    res.status(200).json({
      success: true,
      message: 'Lab report deleted successfully',
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while deleting generated lab report',
    });
  }
};

export const getLabReportPdf = async (req, res) => {
  try {
    const report = await LabReport.findById(req.params.reportId);
    if (!report || report.status === 'void') {
      return res.status(404).json({ success: false, message: 'Lab report not found' });
    }

    let authorized = false;
    if (req.user.role === 'patient') {
      authorized = ['published', 'generated'].includes(report.status) && String(report.patientId) === String(req.user.id);
    } else if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ userId: req.user.id }).select('_id');
      authorized = provider && String(report.providerId) === String(provider._id);
    } else if (req.user.role === 'admin') {
      authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this lab report' });
    }

    if (!fs.existsSync(report.pdfStoragePath)) {
      return res.status(404).json({ success: false, message: 'Lab report PDF is missing' });
    }

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${report.reportId}.pdf"`);
    return res.sendFile(path.resolve(report.pdfStoragePath));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lab report PDF',
      error: error.message,
    });
  }
};

export const updateProviderLabBookingStatus = async (req, res) => {
  try {
    const provider = await getProviderIdForUser(req.user.id);
    const { status, reason, reportUrl, reportName } = req.body;
    const allowedStatuses = ['lab_accepted', 'lab_rejected', 'sample_collected', 'report_ready', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid lab order status' });
    }

    const booking = await LabBooking.findOne({
      _id: req.params.id,
      assignedLabProviderId: provider._id,
    });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Assigned lab order not found' });
    }

    if (status === 'lab_rejected' && !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide rejection reason' });
    }

    if (status === 'lab_rejected') booking.labRejectionReason = reason.trim();
    if (status === 'sample_collected') booking.sampleCollectedAt = new Date();
    if (status === 'report_ready') {
      if (!reportUrl?.trim() && !hasGeneratedReportData(booking) && !hasMainReportFile(booking)) {
        return res.status(400).json({ success: false, message: 'Please save generated report data or upload the backup PDF before marking it ready' });
      }
      booking.reportReadyAt = new Date();
      if (reportUrl?.trim()) {
        booking.reports.push({
          url: reportUrl.trim(),
          name: reportName?.trim() || 'Lab report',
          uploadedBy: req.user.id,
        });
        booking.reportUrl = reportUrl.trim();
        booking.reportName = reportName?.trim() || 'Lab report';
        booking.reportUploadedAt = booking.reportReadyAt;
        booking.reportUploadedBy = req.user.id;
        booking.reportStatus = 'uploaded';
      }
      if (hasGeneratedReportData(booking) || hasMainReportFile(booking)) {
        booking.reportStatus = 'uploaded';
      }
    }
    if (status === 'completed') {
      const publishedGeneratedReports = await publishGeneratedReportsForBooking({
        booking,
        providerId: provider._id,
        userId: req.user.id,
      });
      if (!publishedGeneratedReports.length && !hasGeneratedReportData(booking) && !hasAnyReportFile(booking)) {
        return res.status(400).json({ success: false, message: 'Please upload a report before marking completed' });
      }
      if (!hasGeneratedReportData(booking) && !hasMainReportFile(booking)) {
        return res.status(400).json({ success: false, message: 'Please upload the Main Lab Report PDF before marking completed' });
      }
      booking.reportReadyAt = booking.reportReadyAt || new Date();
      booking.reportStatus = 'uploaded';
      booking.completedAt = new Date();
    }

    addLabBookingHistory(booking, status, req.user.id, reason || reportName || '');
    await booking.save();

    if (status === 'completed') {
      try {
        await createLabProviderPayouts(booking._id);
      } catch (payoutError) {
        console.error('Lab provider payout creation error:', payoutError);
      }
    }

    try {
      await createSystemNotification({
        title: status === 'completed' ? 'Lab report uploaded' : 'Lab booking updated',
        message: status === 'completed'
          ? 'Your lab report is ready to view and download.'
          : `Lab booking status updated to ${status.replace(/_/g, ' ')}.`,
        type: status === 'completed' ? 'lab_report_uploaded' : 'lab_booking_status',
        recipient: 'patient',
        relatedUser: booking.patientId,
        relatedProvider: provider._id,
        priority: ['report_ready', 'completed'].includes(status) ? 'high' : 'medium',
      });
    } catch (notificationError) {
      console.error('Lab status notification error:', notificationError);
    }

    const populatedBooking = await populateLabBooking(LabBooking.findById(booking._id));
    res.status(200).json({
      success: true,
      message: 'Lab order updated successfully',
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error while updating lab order',
    });
  }
};
