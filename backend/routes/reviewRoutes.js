import express from 'express';
import {
    addReview,
    getProviderReviews,
    getMyReviews,
    getMyProviderReviews,
    updateReview,
    deleteReview,
} from '../controllers/ReviewController.js';
import { auth } from '../middlewares/Auth.js';

const router = express.Router();

// Protected routes (Patient)
router.post('/', auth, addReview);
router.get('/my-reviews', auth, getMyReviews);
router.put('/:id', auth, updateReview);
router.delete('/:id', auth, deleteReview);

// Protected routes (Provider) - Must come BEFORE /provider/:providerId
router.get('/provider/me', auth, getMyProviderReviews);

// Public routes - Must come AFTER specific routes
router.get('/provider/:providerId', getProviderReviews);

export default router;
