import express from 'express';
import {
    createNotification,
    getAdminNotifications,
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
} from '../controllers/NotificationController.js';
import { auth, authorize } from '../middlewares/Auth.js';

const router = express.Router();

// Public routes - None

// Protected routes (All authenticated users)
router.get('/my', auth, getMyNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.put('/:id/read', auth, markAsRead);
router.put('/read-all', auth, markAllAsRead);

// Admin only routes
router.post('/', auth, authorize('admin'), createNotification);
router.get('/admin', auth, authorize('admin'), getAdminNotifications);
router.delete('/:id', auth, authorize('admin'), deleteNotification);

export default router;
