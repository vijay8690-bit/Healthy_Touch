import express from 'express';
import {
    // CRUD Operations
    createCaretaker,
    getAllCaretakers,
    getCaretakerById,
    updateCaretaker,
    deleteCaretaker,
    
    // Patient Assignment Operations
    assignCaretakerToPatient,
    unassignCaretakerFromPatient,
    getCaretakerPatients,
    getPatientCaretaker,
    getAvailableCaretakers,
} from '../controllers/CaretakerController.js';
import { auth, adminOnly } from '../middlewares/Auth.js';

const router = express.Router();

// ============================================
// ALL ROUTES PROTECTED WITH ADMIN AUTHENTICATION
// ============================================

// Apply admin authentication to all routes
router.use(auth);
router.use(adminOnly);

// ============================================
// CARETAKER CRUD OPERATIONS
// ============================================
router.post('/', createCaretaker);
router.get('/', getAllCaretakers);
router.get('/available', getAvailableCaretakers);
router.get('/:id', getCaretakerById);
router.put('/:id', updateCaretaker);
router.delete('/:id', deleteCaretaker);

// ============================================
// PATIENT ASSIGNMENT OPERATIONS
// ============================================
router.post('/:id/assign', assignCaretakerToPatient);
router.put('/:id/unassign/:patientId', unassignCaretakerFromPatient);
router.get('/:id/patients', getCaretakerPatients);
router.get('/patient/:patientId', getPatientCaretaker);

export default router;
