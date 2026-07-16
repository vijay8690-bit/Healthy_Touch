import express from 'express';
import {
    getPatientProfile,
    updatePatientProfile,
    getPatientMedicalProfile,
    updatePatientMedicalProfile,
    addVitalSigns,
    getMyMedicalProfile,
    updateMyMedicalProfile,
} from '../controllers/PatientController.js';
import {
    updatePatientLocation,
    getPatientLocation,
} from '../controllers/LocationController.js';
import {
    getPatientLabReports,
} from '../controllers/LabTestController.js';
import {
    getPatientPayments,
} from '../controllers/PaymentController.js';
import { auth, authorize } from '../middlewares/Auth.js';
import { uploadFields, enforceUploadSizeLimits } from '../middlewares/upload.js';

const router = express.Router();

// Protected routes (Patient only)
// Basic patient profile routes
router.get('/profile', auth, authorize('patient'), getPatientProfile);
router.put('/profile', auth, authorize('patient'), uploadFields, enforceUploadSizeLimits, updatePatientProfile);
router.get('/lab-reports', auth, authorize('patient'), getPatientLabReports);
router.get('/payments', auth, authorize('patient'), getPatientPayments);

// Location routes
router.post('/location', auth, authorize('patient'), updatePatientLocation);
router.get('/location', auth, authorize('patient'), getPatientLocation);

// Medical profile routes
router.get('/medical-profile/me', auth, authorize('patient'), getMyMedicalProfile);
router.put('/medical-profile/me', auth, authorize('patient'), updateMyMedicalProfile);
router.get('/:userId/medical-profile', auth, getPatientMedicalProfile); // Admin/Provider can view
router.put('/:userId/medical-profile', auth, updatePatientMedicalProfile); // Admin/Provider can update
router.post('/:userId/vitals', auth, addVitalSigns); // Admin/Provider can add vitals

export default router;
