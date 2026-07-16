import express from 'express';
import {
    createMedicalRecord,
    getPatientMedicalRecords,
    getMyMedicalRecords,
    getMedicalRecordById,
    updateMedicalRecord,
    deleteMedicalRecord,
} from '../controllers/MedicalRecordController.js';
import { auth, checkProviderApproval } from '../middlewares/Auth.js';

const router = express.Router();

// Protected routes
router.post('/', auth, checkProviderApproval, createMedicalRecord);
router.get('/my-records', auth, getMyMedicalRecords);
router.get('/patient/:patientId', auth, checkProviderApproval, getPatientMedicalRecords);
router.get('/:id', auth, getMedicalRecordById);
router.put('/:id', auth, checkProviderApproval, updateMedicalRecord);
router.delete('/:id', auth, checkProviderApproval, deleteMedicalRecord);

export default router;
