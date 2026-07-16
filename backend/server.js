import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/DB.js';
import authRoutes from './routes/authRoutes.js';
import providerRoutes from './routes/ProviderRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import medicalRecordRoutes from './routes/medicalRecordRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import caretakerRoutes from './routes/caretakerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import publicSettingsRoutes from './routes/publicSettingsRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import homeContentRoutes from './routes/homeContentRoutes.js';
import labTestRoutes from './routes/labTestRoutes.js';
import labBookingRoutes from './routes/labBookingRoutes.js';
import ambulanceRoutes from './routes/ambulanceRoutes.js';
import legalDocumentRoutes from './routes/legalDocumentRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import physiotherapyRoutes from './routes/physiotherapyRoutes.js';
import nurseRoutes from './routes/nurseRoutes.js';
import caretakerServiceRoutes from './routes/caretakerServiceRoutes.js';
import { startReminderScheduler } from './utils/appointmentReminder.js';
import { getSettingsCache } from './middlewares/SettingsCache.js';
import { ensureLabTestMasterIndexes } from './models/LabTestMaster.js';
import { ensureAdminAccount } from './utils/ensureAdminAccount.js';

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicUploadFolders = new Set([
    'home-content',
    'legal-documents',
    'patient-profiles',
    'provider-ambulancephoto',
    'provider-profileimage',
    'provider-profiles',
    'team-members',
]);

// CORS Configuration
const allowedOrigins = [
    'https://healthytouch24.com',
    'https://www.healthytouch24.com',
    'http://localhost:8080'
].concat(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow server-to-server/curl requests
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads/:folder', (req, res, next) => {
    if (!publicUploadFolders.has(req.params.folder)) {
        return res.status(404).json({ success: false, message: 'File not found' });
    }
    return next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Maintenance mode guard (admin can still login + disable it)
app.use(async (req, res, next) => {
    try {
        // Only guard API routes
        if (!req.path.startsWith('/api')) return next();

        const settings = await getSettingsCache();
        if (!settings?.maintenanceMode) return next();

        const path = req.path;
        const allowlisted =
            path.startsWith('/api/auth') ||
            path.startsWith('/api/admin') ||
            path.startsWith('/api/settings/public') ||
            path.startsWith('/api/home-content/public') ||
            path.startsWith('/api/legal-documents/public');

        if (allowlisted) return next();

        return res.status(503).json({
            success: false,
            message: settings.maintenanceMessage || 'We are currently under maintenance. Please check back soon.',
            maintenanceMode: true,
        });
    } catch (error) {
        // Fail-open if settings cannot be loaded
        return next();
    }
});

// Routes
app.get('/', (req, res) => {
    res.send('Healthy Touch API is running');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/caretakers', caretakerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/settings', publicSettingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/home-content', homeContentRoutes);
app.use('/api/lab-tests', labTestRoutes);
app.use('/api/lab-bookings', labBookingRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/legal-documents', legalDocumentRoutes);
app.use('/api/physiotherapy', physiotherapyRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/caretaker-catalog', caretakerServiceRoutes);

// connect to the database
await connectDB();
await ensureLabTestMasterIndexes();
await ensureAdminAccount();

// Start appointment reminder scheduler
startReminderScheduler();

// Start server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log('Appointment reminder scheduler is active');
});
